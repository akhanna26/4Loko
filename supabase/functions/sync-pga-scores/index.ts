// Supabase Edge Function: pulls PGA Championship leaderboard from ESPN every 15 min
// and upserts scores into the database.
// Deploy: supabase functions deploy sync-pga-scores
// Test: curl https://YOUR_PROJECT.functions.supabase.co/sync-pga-scores

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOURNAMENT_ID = 4 // PGA Championship
const TOURNAMENT_PAR = 70 // Aronimink — verify and adjust

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Confirm tournament is live before processing
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, name')
      .eq('id', TOURNAMENT_ID)
      .single()

    if (!tournament || tournament.status !== 'live') {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Tournament not live (status=${tournament?.status})`
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Fetch ESPN leaderboard
    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard'
    const espnRes = await fetch(espnUrl)
    if (!espnRes.ok) throw new Error(`ESPN fetch failed: ${espnRes.status}`)
    const espn = await espnRes.json()

    const event = espn.events?.[0]
    if (!event) throw new Error('No event in ESPN response')

    const competition = event.competitions?.[0]
    if (!competition) throw new Error('No competition in event')

    const competitors = competition.competitors ?? []

    let processed = 0
    let failedResolves: string[] = []
    const rows: any[] = []

    for (const c of competitors) {
      const golferName = c.athlete?.displayName
      if (!golferName) continue

      const status = c.status?.position?.id // ESPN status codes
      const isCut = c.status?.type?.name === 'STATUS_CUT'
      const isWD = c.status?.type?.name === 'STATUS_WITHDRAWN'
      const dbStatus = isWD ? 'wd' : isCut ? 'mc' : 'active'

      // Get the score for each round from linescores
      const lineScores = c.linescores ?? []

      for (let roundIdx = 0; roundIdx < lineScores.length; roundIdx++) {
        const ls = lineScores[roundIdx]
        const strokes = ls?.value
        if (typeof strokes !== 'number' || strokes === 0) continue

        const strokesVsPar = strokes - TOURNAMENT_PAR
        const roundNumber = roundIdx + 1

        // Resolve golfer ID using your SQL function (handles aliases)
        const { data: resolved } = await supabase
          .rpc('resolve_golfer', { golfer_name: golferName })

        if (!resolved) {
          failedResolves.push(golferName)
          continue
        }

        rows.push({
          tournament_id: TOURNAMENT_ID,
          golfer_id: resolved,
          round_number: roundNumber,
          strokes_vs_par: strokesVsPar,
          status: dbStatus,
        })
        processed++
      }
    }

    // Bulk upsert
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
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
