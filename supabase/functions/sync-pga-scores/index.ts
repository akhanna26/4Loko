import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ESPN_TOURNAMENT_MAP: Record<string, { dbId: number; par: number; flightId: number }> = {
  'PGA Championship': { dbId: 4, par: 70, flightId: 2 },
  'U.S. Open': { dbId: 6, par: 70, flightId: 3 },
  'The Open Championship': { dbId: 8, par: 71, flightId: 4 },
  'The Open': { dbId: 8, par: 71, flightId: 4 },
  'The Masters': { dbId: 2, par: 72, flightId: 1 },
  'RBC Heritage': { dbId: 1, par: 71, flightId: 1 },
  'Memorial Tournament': { dbId: 3, par: 72, flightId: 2 },
  'the Memorial Tournament pres. by Workday': { dbId: 3, par: 72, flightId: 2 },
  'Travelers Championship': { dbId: 5, par: 70, flightId: 3 },
  'FedEx St. Jude Championship': { dbId: 7, par: 70, flightId: 4 },
}

// Major payout structures (top 3 ledger entries)
// Masters: $1500 pool (12 × $125). Others: $1200 pool (12 × $100).
const MAJOR_PAYOUTS: Record<number, [number, number, number]> = {
  2: [1050, 300, 150],   // Masters: 70/20/10 of $1500
  4: [840, 240, 120],    // PGA Championship: 70/20/10 of $1200
  6: [840, 240, 120],    // US Open
  8: [840, 240, 120],    // The Open
}
const MAJOR_WINNER_POT = 120  // $10 × 12 owners

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ---- Hit ESPN ----
    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
    const espnRes = await fetch(espnUrl)
    if (!espnRes.ok) throw new Error(`ESPN fetch failed: ${espnRes.status}`)
    const espn = await espnRes.json()

    const event = espn.events?.[0]
    if (!event) {
      return jsonOK({ skipped: true, reason: 'No ESPN event in response' })
    }

    const espnEventName = event.name || event.shortName || ''
    const mapping = ESPN_TOURNAMENT_MAP[espnEventName]
    if (!mapping) {
      return jsonOK({
        skipped: true,
        reason: `Unknown ESPN event: "${espnEventName}". Add to ESPN_TOURNAMENT_MAP.`,
        espn_event_name: espnEventName,
      })
    }

    const tournamentId = mapping.dbId
    const tournamentPar = mapping.par
    const flightId = mapping.flightId
    const espnEventStatus = event.status?.type?.name || ''
    const espnIsInProgress = espnEventStatus === 'STATUS_IN_PROGRESS'
    const espnIsFinal = espnEventStatus === 'STATUS_FINAL'

    // ---- Look up tournament in DB ----
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, status, event_type')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return jsonOK({ skipped: true, reason: `Tournament ${tournamentId} not found in DB` })
    }

    const isMajor = tournament.event_type === 'MAJOR'

    // ---- Status state machine ----
    // upcoming + in-progress → live
    // upcoming + final → live then immediately finalize
    // live + final → finalize (flip to final after writing bonuses)
    // final → skip entirely
    if (tournament.status === 'final') {
      return jsonOK({
        skipped: true,
        reason: `Tournament "${tournament.name}" already final.`,
        tournament_id: tournamentId,
      })
    }

    let didFlipToLive = false
    if (tournament.status === 'upcoming' && (espnIsInProgress || espnIsFinal)) {
      await supabase.from('tournaments').update({ status: 'live' }).eq('id', tournamentId)
      tournament.status = 'live'
      didFlipToLive = true
    }

    if (tournament.status !== 'live') {
      return jsonOK({
        skipped: true,
        reason: `Tournament "${tournament.name}" status is "${tournament.status}", not live.`,
      })
    }

    // ---- SYNC SCORES (always run when live, even for elevated) ----
    const competition = event.competitions?.[0]
    if (!competition) throw new Error('No competition in event')
    const competitors = competition.competitors ?? []

    let processed = 0
    const failedResolves: string[] = []
    const rows: any[] = []

    for (const c of competitors) {
      const golferName = c.athlete?.displayName
      if (!golferName) continue

      const statusName = c.status?.type?.name
      const isWD = statusName === 'STATUS_WITHDRAWN'
      const isCut = statusName === 'STATUS_CUT'
      const dbStatus = isWD ? 'wd' : isCut ? 'mc' : 'active'

      const lineScores = c.linescores ?? []
      const roundTotals = lineScores.filter((ls: any) => ls?.period >= 1 && ls?.period <= 4)

      for (const ls of roundTotals) {
        const strokes = ls?.value
        if (typeof strokes !== 'number' || strokes < 60 || strokes > 95) continue
        const roundNumber = ls.period
        const display = ls?.displayValue

        let strokesVsPar: number
        if (display === 'E') {
          strokesVsPar = 0
        } else if (typeof display === 'string' && /^[+-]?\d+$/.test(display)) {
          strokesVsPar = parseInt(display.replace('+', ''), 10)
        } else {
          strokesVsPar = Math.round(strokes - tournamentPar)
        }

        const { data: resolved } = await supabase
          .rpc('resolve_golfer', { golfer_name: golferName })

        if (!resolved) {
          if (!failedResolves.includes(golferName)) failedResolves.push(golferName)
          continue
        }

        rows.push({
          tournament_id: tournamentId,
          golfer_id: resolved,
          round_number: roundNumber,
          strokes_vs_par: strokesVsPar,
          status: dbStatus,
        })
        processed++
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('scores')
        .upsert(rows, { onConflict: 'tournament_id,golfer_id,round_number' })
      if (error) throw error
    }

    // ---- DAILY-LOW BONUS (majors only, while live) ----
    let bonusReport: Record<number, { lowScore: number | null; golfers: string[] }> = {}
    if (isMajor) {
      bonusReport = await rebuildDailyLowBonuses(supabase, tournamentId, flightId)
    }

    // ---- FINALIZATION (when ESPN says final) ----
    let finalization: any = null
    if (espnIsFinal) {
      finalization = await finalizeTournament(supabase, tournament, flightId, isMajor)
    }

    return jsonOK({
      processed,
      rows_upserted: rows.length,
      failed_resolves: failedResolves,
      tournament_name: tournament.name,
      espn_event_name: espnEventName,
      tournament_id: tournamentId,
      espn_status: espnEventStatus,
      db_status: tournament.status,
      flipped_to_live: didFlipToLive,
      bonus_report: bonusReport,
      finalization,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function jsonOK(payload: any) {
  return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })
}

// ---- Daily-low (majors during live play) ----
async function rebuildDailyLowBonuses(supabase: any, tournamentId: number, flightId: number) {
  await supabase
    .from('bonuses')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('bonus_kind', 'DAILY_LOW')

  const rebuilt: any[] = []
  const report: Record<number, { lowScore: number | null; golfers: string[] }> = {}

  for (const roundNumber of [1, 2, 3, 4]) {
    const { data: roundScores } = await supabase
      .from('scores')
      .select('golfer_id, strokes_vs_par, status')
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber)
      .eq('status', 'active')

    if (!roundScores || roundScores.length === 0) {
      report[roundNumber] = { lowScore: null, golfers: [] }
      continue
    }

    const fieldLow = Math.min(...roundScores.map((s: any) => s.strokes_vs_par))
    const lowGolferIds = roundScores
      .filter((s: any) => s.strokes_vs_par === fieldLow)
      .map((s: any) => s.golfer_id)

    const { data: ownerRosters } = await supabase
      .from('rosters')
      .select('owner_id, golfer_id')
      .eq('flight_id', flightId)
      .in('golfer_id', lowGolferIds)

    for (const r of ownerRosters ?? []) {
      rebuilt.push({
        tournament_id: tournamentId,
        owner_id: r.owner_id,
        golfer_id: r.golfer_id,
        bonus_kind: 'DAILY_LOW',
        points: 1,
        round_number: roundNumber,
      })
    }

    const { data: golferNames } = await supabase
      .from('golfers')
      .select('id, full_name')
      .in('id', lowGolferIds)

    report[roundNumber] = {
      lowScore: fieldLow,
      golfers: (golferNames ?? []).map((g: any) => g.full_name),
    }
  }

  if (rebuilt.length > 0) {
    await supabase
      .from('bonuses')
      .upsert(rebuilt, {
        onConflict: 'tournament_id,owner_id,golfer_id,bonus_kind,round_number',
        ignoreDuplicates: true,
      })
  }
  return report
}

// ---- Finalization (one-shot per tournament) ----
async function finalizeTournament(
  supabase: any,
  tournament: { id: number; name: string; event_type: string },
  flightId: number,
  isMajor: boolean,
) {
  const tournamentId = tournament.id
  const season_year = 2026

  // Get total strokes per golfer across all rounds (only active = not WD, not MC)
  const { data: allScores } = await supabase
    .from('scores')
    .select('golfer_id, round_number, strokes_vs_par, status')
    .eq('tournament_id', tournamentId)

  if (!allScores || allScores.length === 0) {
    return { skipped: true, reason: 'No scores in DB to finalize from' }
  }

  // Determine which golfers are "active" (made all 4 rounds, status=active)
  // For each golfer, sum strokes_vs_par across the rounds they completed.
  const golferRounds = new Map<number, { rounds: number[]; total: number; status: string }>()
  for (const s of allScores as any[]) {
    const entry = golferRounds.get(s.golfer_id) ?? { rounds: [], total: 0, status: 'active' }
    if (!entry.rounds.includes(s.round_number)) {
      entry.rounds.push(s.round_number)
      entry.total += s.strokes_vs_par
    }
    if (s.status !== 'active') entry.status = s.status
    golferRounds.set(s.golfer_id, entry)
  }

  // Eligible for tier bonuses: status='active' AND completed all 4 rounds
  const eligible = [...golferRounds.entries()]
    .filter(([_id, e]) => e.status === 'active' && e.rounds.length === 4)
    .map(([id, e]) => ({ golfer_id: id, total: e.total }))
    .sort((a, b) => a.total - b.total)

  if (eligible.length === 0) {
    return { skipped: true, reason: 'No golfers completed all 4 rounds' }
  }

  // Compute positions with tie handling.
  // Position = 1 + (# golfers with strictly lower total).
  // Multiple golfers can share the same position.
  const positions = new Map<number, number>()
  for (const g of eligible) {
    const pos = eligible.filter((e) => e.total < g.total).length + 1
    positions.set(g.golfer_id, pos)
  }

  if (isMajor) {
    return await finalizeMajor(supabase, tournament, flightId, season_year, eligible, positions, golferRounds)
  } else {
    return await finalizeElevated(supabase, tournament, flightId, eligible, positions)
  }
}

async function finalizeElevated(
  supabase: any,
  tournament: { id: number; name: string },
  flightId: number,
  eligible: { golfer_id: number; total: number }[],
  positions: Map<number, number>,
) {
  const tournamentId = tournament.id

  // Wipe existing tier bonuses for this tournament (idempotent)
  await supabase
    .from('bonuses')
    .delete()
    .eq('tournament_id', tournamentId)
    .in('bonus_kind', ['ELEV_WIN', 'ELEV_TOP10', 'ELEV_TOP20'])

  // For each golfer, tier is determined by position:
  // position == 1 → ELEV_WIN (+5)
  // 1 < position ≤ 10 → ELEV_TOP10 (+3)
  // 10 < position ≤ 20 → ELEV_TOP20 (+1)
  // Ties at a cutoff share the higher tier because tied golfers have the same position number.
  const tierByGolfer = new Map<number, { kind: string; points: number }>()
  for (const g of eligible) {
    const pos = positions.get(g.golfer_id)!
    if (pos === 1) tierByGolfer.set(g.golfer_id, { kind: 'ELEV_WIN', points: 5 })
    else if (pos <= 10) tierByGolfer.set(g.golfer_id, { kind: 'ELEV_TOP10', points: 3 })
    else if (pos <= 20) tierByGolfer.set(g.golfer_id, { kind: 'ELEV_TOP20', points: 1 })
  }

  // Look up which golfers are on flight rosters
  const golferIds = [...tierByGolfer.keys()]
  if (golferIds.length === 0) {
    return { event_type: 'PGA', tier_golfers: 0, bonuses_written: 0 }
  }

  const { data: rosters } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id')
    .eq('flight_id', flightId)
    .in('golfer_id', golferIds)

  const rows = (rosters ?? []).map((r: any) => {
    const tier = tierByGolfer.get(r.golfer_id)!
    return {
      tournament_id: tournamentId,
      owner_id: r.owner_id,
      golfer_id: r.golfer_id,
      bonus_kind: tier.kind,
      points: tier.points,
      round_number: null,
    }
  })

  if (rows.length > 0) {
    const { error } = await supabase
      .from('bonuses')
      .upsert(rows, {
        onConflict: 'tournament_id,owner_id,golfer_id,bonus_kind,round_number',
        ignoreDuplicates: true,
      })
    if (error) throw error
  }

  // Flip status to final
  await supabase.from('tournaments').update({ status: 'final' }).eq('id', tournamentId)

  return {
    event_type: 'PGA',
    tier_counts: {
      win: [...tierByGolfer.values()].filter((t) => t.kind === 'ELEV_WIN').length,
      top10: [...tierByGolfer.values()].filter((t) => t.kind === 'ELEV_TOP10').length,
      top20: [...tierByGolfer.values()].filter((t) => t.kind === 'ELEV_TOP20').length,
    },
    bonuses_written: rows.length,
    flipped_to_final: true,
  }
}

async function finalizeMajor(
  supabase: any,
  tournament: { id: number; name: string },
  flightId: number,
  season_year: number,
  eligible: { golfer_id: number; total: number }[],
  positions: Map<number, number>,
  _golferRounds: Map<number, { rounds: number[]; total: number; status: string }>,
) {
  const tournamentId = tournament.id

  // Wipe existing finalization bonuses + payouts for this tournament (idempotent)
  await supabase
    .from('bonuses')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('bonus_kind', 'CHAMPION')

  await supabase
    .from('ledger')
    .delete()
    .eq('tournament_id', tournamentId)
    .in('entry_kind', ['MAJOR_PAYOUT', 'MAJOR_WINNER_PAYOUT'])

  // Champion = golfer(s) at position 1
  const championGolfers = eligible.filter((g) => positions.get(g.golfer_id) === 1)
  const championIds = championGolfers.map((g) => g.golfer_id)

  // Look up owners who rostered champion golfers
  const { data: championRosters } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, golfers(full_name)')
    .eq('flight_id', flightId)
    .in('golfer_id', championIds)

  // Write CHAMPION bonus (+3) per owner-of-champion
  const championBonusRows = (championRosters ?? []).map((r: any) => ({
    tournament_id: tournamentId,
    owner_id: r.owner_id,
    golfer_id: r.golfer_id,
    bonus_kind: 'CHAMPION',
    points: 3,
    round_number: null,
  }))
  if (championBonusRows.length > 0) {
    await supabase.from('bonuses').upsert(championBonusRows, {
      onConflict: 'tournament_id,owner_id,golfer_id,bonus_kind,round_number',
      ignoreDuplicates: true,
    })
  }

  // Write MAJOR_WINNER_PAYOUT ($120 split if multiple owners hold champions; else full $120)
  const championOwnerIds = [...new Set((championRosters ?? []).map((r: any) => r.owner_id))]
  const winnerPayoutAmount = championOwnerIds.length > 0
    ? MAJOR_WINNER_POT / championOwnerIds.length
    : 0
  const winnerPayoutRows = championOwnerIds.map((owner_id: number) => {
    const golferName = (championRosters as any[]).find((r) => r.owner_id === owner_id)?.golfers?.full_name ?? 'champion'
    return {
      season_year,
      owner_id,
      tournament_id: tournamentId,
      flight_id: flightId,
      entry_kind: 'MAJOR_WINNER_PAYOUT',
      amount: winnerPayoutAmount,
      note: `Owned ${golferName}, the ${season_year} ${tournament.name} winner`,
      is_paid: false,
    }
  })
  if (winnerPayoutRows.length > 0) {
    await supabase.from('ledger').insert(winnerPayoutRows)
  }

  // Compute MAJOR_PAYOUT (1st/2nd/3rd standings via top-N funnel)
  const standings = await computeMajorFinalStandings(supabase, tournamentId, flightId)

  // Determine 1st/2nd/3rd places considering ties.
  // Per rules: ties split combined pool evenly. So if 2 owners tied 1st, they share (1st + 2nd) pool / 2 each.
  const payouts = MAJOR_PAYOUTS[tournamentId] ?? [840, 240, 120]
  const payoutRows = computePayoutEntries(standings, payouts, season_year, tournamentId, flightId, tournament.name)

  if (payoutRows.length > 0) {
    await supabase.from('ledger').insert(payoutRows)
  }

  // Flip status to final
  await supabase.from('tournaments').update({ status: 'final' }).eq('id', tournamentId)

  return {
    event_type: 'MAJOR',
    champion_golfers: championIds.length,
    champion_owners: championOwnerIds.length,
    winner_pot_each: winnerPayoutAmount,
    standings_top: standings.slice(0, 5).map((s: any) => ({ owner_name: s.owner_name, points: s.points })),
    payouts_written: payoutRows.length,
    flipped_to_final: true,
  }
}

// Top-N daily-funnel: top 4 strokes Th/Fr, top 2 Sa/Su, summed across days, then add bonuses for owner total.
async function computeMajorFinalStandings(supabase: any, tournamentId: number, flightId: number) {
  // Pull all scores for this tournament
  const { data: scores } = await supabase
    .from('scores')
    .select('golfer_id, round_number, strokes_vs_par, status')
    .eq('tournament_id', tournamentId)

  // Pull all rosters
  const { data: rosters } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, owners(name)')
    .eq('flight_id', flightId)

  // Pull bonuses to add to totals
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('owner_id, points')
    .eq('tournament_id', tournamentId)

  // Compute field-worst per round (for missed-cut penalty)
  const fieldWorstByRound = new Map<number, number>()
  for (const s of (scores ?? []) as any[]) {
    if (s.status !== 'active') continue
    const cur = fieldWorstByRound.get(s.round_number)
    if (cur === undefined || s.strokes_vs_par > cur) {
      fieldWorstByRound.set(s.round_number, s.strokes_vs_par)
    }
  }

  // Index strokes by golfer-round and golfer status
  const strokesByGolferRound = new Map<string, number>()
  const golferStatus = new Map<number, string>()
  for (const s of (scores ?? []) as any[]) {
    strokesByGolferRound.set(`${s.golfer_id}-${s.round_number}`, s.strokes_vs_par)
    if (s.status !== 'active') golferStatus.set(s.golfer_id, s.status)
  }

  // Group rosters by owner
  const rostersByOwner = new Map<number, { owner_name: string; golfer_ids: number[] }>()
  for (const r of (rosters ?? []) as any[]) {
    const entry = rostersByOwner.get(r.owner_id) ?? { owner_name: r.owners?.name ?? 'Unknown', golfer_ids: [] }
    entry.golfer_ids.push(r.golfer_id)
    rostersByOwner.set(r.owner_id, entry)
  }

  // Bonus totals
  const bonusByOwner = new Map<number, number>()
  for (const b of (bonuses ?? []) as any[]) {
    bonusByOwner.set(b.owner_id, (bonusByOwner.get(b.owner_id) ?? 0) + Number(b.points))
  }

  // Compute per-owner total via top-N funnel
  const standings: { owner_id: number; owner_name: string; points: number }[] = []
  for (const [owner_id, ownerInfo] of rostersByOwner.entries()) {
    let strokesTotal = 0
    for (const roundNumber of [1, 2, 3, 4]) {
      const topN = roundNumber === 3 || roundNumber === 4 ? 2 : 4
      const roundCandidates = ownerInfo.golfer_ids
        .map((gid) => {
          let strokes = strokesByGolferRound.get(`${gid}-${roundNumber}`)
          // Missed-cut penalty: if golfer is cut, on weekend rounds substitute field-worst
          const cutOrWd = golferStatus.get(gid)
          if (cutOrWd === 'mc' && roundNumber >= 3) {
            const worst = fieldWorstByRound.get(roundNumber)
            if (worst !== undefined) strokes = worst
          }
          if (strokes === undefined || strokes === null) return null
          return { golfer_id: gid, strokes }
        })
        .filter((x): x is { golfer_id: number; strokes: number } => x !== null)
        .sort((a, b) => a.strokes - b.strokes)
      const counted = roundCandidates.slice(0, topN)
      strokesTotal += counted.reduce((sum, c) => sum + c.strokes, 0)
    }
    const pointsFromStrokes = -strokesTotal
    const bonusTotal = bonusByOwner.get(owner_id) ?? 0
    standings.push({ owner_id, owner_name: ownerInfo.owner_name, points: pointsFromStrokes + bonusTotal })
  }

  standings.sort((a, b) => b.points - a.points)
  return standings
}

// Compute payout ledger entries from final standings with tie handling
function computePayoutEntries(
  standings: { owner_id: number; owner_name: string; points: number }[],
  payouts: [number, number, number],
  season_year: number,
  tournamentId: number,
  flightId: number,
  tournamentName: string,
) {
  if (standings.length === 0) return []

  // Group owners by points (descending), each group = a position cluster
  const groups: { points: number; owner_ids: number[] }[] = []
  for (const s of standings) {
    const last = groups[groups.length - 1]
    if (last && last.points === s.points) {
      last.owner_ids.push(s.owner_id)
    } else {
      groups.push({ points: s.points, owner_ids: [s.owner_id] })
    }
  }

  // Allocate payouts to position slots 1, 2, 3.
  // If group at slot 1 has N owners, they share payouts[0..N-1] equally.
  // Then next slot is N+1, etc.
  const ledgerRows: any[] = []
  let slot = 0
  for (const group of groups) {
    if (slot >= 3) break
    const slotsTaken = Math.min(group.owner_ids.length, 3 - slot)
    let combinedPool = 0
    for (let i = 0; i < slotsTaken; i++) {
      combinedPool += payouts[slot + i]
    }
    // Anyone left in this group beyond the 3 slots gets nothing
    const owners_to_pay = group.owner_ids.slice(0, slotsTaken)
    // But per the "ties split combined pool evenly" rule, the ENTIRE tied group shares
    // the combined pool of the slots they consumed. So all in the group split combinedPool equally.
    const owners_in_payout = group.owner_ids.length <= (3 - slot)
      ? group.owner_ids                                  // entire group fits in payout slots
      : group.owner_ids.slice(0, 3 - slot)               // partial - only first ones get paid

    const perOwner = owners_in_payout.length > 0
      ? combinedPool / owners_in_payout.length
      : 0

    const placeLabel = slotsTaken === 1
      ? (slot === 0 ? '1st' : slot === 1 ? '2nd' : '3rd')
      : `T-${slot + 1}`

    for (const owner_id of owners_in_payout) {
      ledgerRows.push({
        season_year,
        owner_id,
        tournament_id: tournamentId,
        flight_id: flightId,
        entry_kind: 'MAJOR_PAYOUT',
        amount: perOwner,
        note: `${placeLabel} place in ${tournamentName}`,
        is_paid: false,
      })
    }
    slot += slotsTaken
    if (group.owner_ids.length > slotsTaken) break  // any remaining in group don't pay
  }
  return ledgerRows
}
