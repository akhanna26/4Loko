// Supabase Edge Function: sync-pga-scores
// Runs every 15 minutes. Fetches ESPN PGA leaderboard, parses, upserts into scores table.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard';

// PGA Championship 2026 — Aronimink Golf Club, par 70
const TOURNAMENT_PAR = 70;
const TOURNAMENT_ID = 4; // FORE Lokos tournament_id for PGA Championship

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Verify tournament is in 'live' state
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, name')
    .eq('id', TOURNAMENT_ID)
    .single();

  if (!tournament || tournament.status !== 'live') {
    return new Response(JSON.stringify({
      skipped: true,
      reason: `Tournament ${TOURNAMENT_ID} status is "${tournament?.status}", not live.`
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 2. Fetch ESPN leaderboard
  let espnData;
  try {
    const espnResponse = await fetch(ESPN_URL);
    if (!espnResponse.ok) throw new Error(`ESPN returned ${espnResponse.status}`);
    espnData = await espnResponse.json();
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'ESPN fetch failed',
      message: e.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Find the event in ESPN data
  const event = espnData?.events?.find((e: any) => 
    e.name?.toLowerCase().includes('pga championship') ||
    e.shortName?.toLowerCase().includes('pga champ')
  );

  if (!event) {
    return new Response(JSON.stringify({
      error: 'PGA Championship not found in ESPN events',
      available: espnData?.events?.map((e: any) => e.name) ?? []
    }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const competitors = event?.competitions?.[0]?.competitors ?? [];

  // 4. Parse each player and prepare score rows
  const scoreRows: any[] = [];
  const failedResolves: string[] = [];
  let totalProcessed = 0;
  let totalUpserted = 0;

  for (const c of competitors) {
    const name = c?.athlete?.displayName;
    if (!name) continue;
    totalProcessed++;

    // Resolve name to our golfer_id via our alias function
    const { data: resolved, error: resolveErr } = await supabase.rpc('resolve_golfer', { input_name: name });
    if (resolveErr || !resolved) {
      failedResolves.push(name);
      continue;
    }
    const golferId = resolved;

    // Determine status
    const positionId = c?.status?.position?.id;
    const positionLabel = c?.status?.position?.displayName ?? '';
    const espnStatus = c?.status?.type?.name ?? '';
    let recordStatus: 'active' | 'mc' | 'wd' = 'active';
    if (espnStatus.includes('STATUS_WD') || positionLabel.includes('WD')) recordStatus = 'wd';
    else if (positionLabel.includes('CUT') || positionId === 'CUT') recordStatus = 'mc';

    // Linescores: each round's gross score
    const linescores = c?.linescores ?? [];
    for (const ls of linescores) {
      const round = ls?.period;
      const value = ls?.value;
      if (!round || value == null) continue;
      const strokesVsPar = Number(value) - TOURNAMENT_PAR;
      scoreRows.push({
        tournament_id: TOURNAMENT_ID,
        golfer_id: golferId,
        round_number: round,
        strokes_vs_par: strokesVsPar,
        status: recordStatus,
      });
    }
  }

  // 5. Upsert all rows
  if (scoreRows.length > 0) {
    const { error: upsertErr, count } = await supabase
      .from('scores')
      .upsert(scoreRows, {
        onConflict: 'tournament_id,golfer_id,round_number',
        count: 'exact',
      });
    if (upsertErr) {
      return new Response(JSON.stringify({
        error: 'Upsert failed',
        message: upsertErr.message,
        attempted: scoreRows.length
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    totalUpserted = count ?? scoreRows.length;
  }

  return new Response(JSON.stringify({
    success: true,
    espn_event_name: event.name,
    competitors_seen: competitors.length,
    rows_processed: totalProcessed,
    rows_upserted: totalUpserted,
    failed_resolves: failedResolves,
    timestamp: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});
