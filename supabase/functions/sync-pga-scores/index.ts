import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Match ESPN event names to your tournament IDs
// Add new mappings each season as the calendar fills in.
const ESPN_TOURNAMENT_MAP: Record<string, { dbId: number; par: number }> = {
  'PGA Championship': { dbId: 4, par: 70 },        // 2026 Aronimink
  'U.S. Open': { dbId: 6, par: 70 },                // varies by venue
  'The Open Championship': { dbId: 8, par: 71 },    // varies by venue
  'The Masters': { dbId: 2, par: 72 },              // Augusta is always 72
  'RBC Heritage': { dbId: 1, par: 71 },             // Harbour Town
  'Memorial Tournament': { dbId: 3, par: 72 },      // Muirfield Village
  'Travelers Championship': { dbId: 5, par: 70 },   // TPC River Highlands
  'FedEx St. Jude Championship': { dbId: 7, par: 70 }, // TPC Southwind
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch ESPN scoreboard
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

    // 2. Match ESPN event to our DB tournament
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

    // 3. Verify the matched tournament is LIVE in our DB
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, name, id')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Tournament ${tournamentId} not found in DB`,
        espn_event_name: espnEventName,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (tournament.status !== 'live') {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Tournament "${tournament.name}" status is "${tournament.status}", not "live". Function does nothing.`,
        espn_event_name: espnEventName,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 4. Parse competitors from ESPN
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

      for (let roundIdx = 0; roundIdx < lineScores.length; roundIdx++) {
        const ls = lineScores[roundIdx]
        const strokes = ls?.value
        // Skip if no value yet OR if value is 0 (not started)
        if (typeof strokes !== 'number' || strokes === 0) continue

        const strokesVsPar = strokes - tournamentPar
        const roundNumber = roundIdx + 1

        // Resolve golfer ID via your existing SQL function (handles aliases)
        const { data: resolved } = await supabase
          .rpc('resolve_golfer', { golfer_name: golferName })

        if (!resolved) {
          failedResolves.push(golferName)
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

    // 5. Bulk upsert into scores
    if (rows.length > 0) {
      const { error } = await supabase
        .from('scores')
        .upsert(rows, { onConflict: 'tournament_id,golfer_id,round_number' })
      if (error) throw error
    }

    return new Response(JSON.stringify({
      processed,
      rows_upserted: rows.length,
      failed_resolves: failedResolves,
      tournament_name: tournament.name,
      espn_event_name: espnEventName,
      tournament_id: tournamentId,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
