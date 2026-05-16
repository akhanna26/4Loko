import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ESPN_TOURNAMENT_MAP: Record<string, { dbId: number; par: number; flightId: number }> = {
  'PGA Championship': { dbId: 4, par: 70, flightId: 2 },
  'U.S. Open': { dbId: 6, par: 70, flightId: 3 },
  'The Open Championship': { dbId: 8, par: 71, flightId: 4 },
  'The Masters': { dbId: 2, par: 72, flightId: 1 },
  'RBC Heritage': { dbId: 1, par: 71, flightId: 1 },
  'Memorial Tournament': { dbId: 3, par: 72, flightId: 2 },
  'Travelers Championship': { dbId: 5, par: 70, flightId: 3 },
  'FedEx St. Jude Championship': { dbId: 7, par: 70, flightId: 4 },
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Short-circuit: if NO tournament is live, skip all work
    const { data: liveCheck } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('status', 'live')
      .maybeSingle()

    if (!liveCheck) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'No tournament currently live'
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
    const espnRes = await fetch(espnUrl)
    if (!espnRes.ok) throw new Error(`ESPN fetch failed: ${espnRes.status}`)
    const espn = await espnRes.json()

    const event = espn.events?.[0]
    if (!event) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No ESPN event in response' }),
        { headers: { 'Content-Type': 'application/json' } })
    }

    const espnEventName = event.name || event.shortName || ''
    const mapping = ESPN_TOURNAMENT_MAP[espnEventName]
    if (!mapping) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Unknown ESPN event: "${espnEventName}". Add to ESPN_TOURNAMENT_MAP.`,
        espn_event_name: espnEventName,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    const tournamentId = mapping.dbId
    const tournamentPar = mapping.par
    const flightId = mapping.flightId

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, name, id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Tournament ${tournamentId} not found in DB`,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (tournament.status !== 'live') {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Tournament "${tournament.name}" status is "${tournament.status}", not "live".`,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ---- SYNC SCORES ----
    const competition = event.competitions?.[0]
    if (!competition) throw new Error('No competition in event')
    const competitors = competition.competitors ?? []

    let processed = 0
    const failedResolves: string[] = []
    const rows: any[] = []
    const espnFieldCount = competitors.length
    

    for (const c of competitors) {
      const golferName = c.athlete?.displayName
      if (!golferName) continue

      const statusName = c.status?.type?.name
      const isWD = statusName === 'STATUS_WITHDRAWN'
      const isCut = statusName === 'STATUS_CUT'
      const dbStatus = isWD ? 'wd' : isCut ? 'mc' : 'active'

      const lineScores = c.linescores ?? []
      const roundTotals = lineScores.filter((ls: any) => ls?.period >= 1 && ls?.period <= 4)

      // Track who's "in" for each round (to determine round complete)
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

    /// ---- AUTO DAILY-LOW BONUS (self-correcting) ----
    // Every sync: wipe all DAILY_LOW for this tournament and rebuild from
    // current scores. Whoever holds a round's field-low right now gets it.
    // As the round progresses the bonus moves automatically; once the round
    // ends it's permanent because scores stop changing.
    const bonusReport: Record<number, { lowScore: number | null; golfers: string[] }> = {}

    await supabase
      .from('bonuses')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('bonus_kind', 'DAILY_LOW')

    const rebuiltBonusRows: any[] = []

    for (const roundNumber of [1, 2, 3, 4]) {
      const { data: roundScores } = await supabase
        .from('scores')
        .select('golfer_id, strokes_vs_par, status')
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
        .eq('status', 'active')

      if (!roundScores || roundScores.length === 0) {
        bonusReport[roundNumber] = { lowScore: null, golfers: [] }
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
        rebuiltBonusRows.push({
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

      bonusReport[roundNumber] = {
        lowScore: fieldLow,
        golfers: (golferNames ?? []).map((g: any) => g.full_name),
      }
    }

    if (rebuiltBonusRows.length > 0) {
      await supabase
        .from('bonuses')
        .upsert(rebuiltBonusRows, {
          onConflict: 'tournament_id,owner_id,golfer_id,bonus_kind,round_number',
          ignoreDuplicates: true,
        })
    }

    return new Response(JSON.stringify({
      processed,
      rows_upserted: rows.length,
      failed_resolves: failedResolves,
      tournament_name: tournament.name,
      espn_event_name: espnEventName,
      tournament_id: tournamentId,
      bonus_report: bonusReport,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})