import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { flight_id, session_id } = await request.json();
    if (!flight_id || !session_id) {
      return NextResponse.json({ error: 'flight_id and session_id required' }, { status: 400 });
    }

    // Fetch active winning bids for this flight
    const { data: bids, error: bidsErr } = await supabaseAdmin
      .from('auction_bids')
      .select('owner_id, golfer_id, amount, is_keeper')
      .eq('flight_id', flight_id)
      .eq('is_active', true);
    if (bidsErr) throw bidsErr;
    if (!bids || bids.length === 0) {
      return NextResponse.json({ error: 'No active bids to materialize' }, { status: 400 });
    }

    // Fetch keeper declarations to preserve keeper_stage
    const { data: keeperDecls, error: kErr } = await supabaseAdmin
      .from('keeper_declarations')
      .select('owner_id, golfer_id, keeper_stage')
      .eq('flight_id', flight_id);
    if (kErr) throw kErr;

    const stageMap = new Map<string, number>();
    for (const d of (keeperDecls ?? []) as any[]) {
      stageMap.set(`${d.owner_id}-${d.golfer_id}`, d.keeper_stage);
    }

    // Wipe existing rosters for this flight (idempotent)
    const { error: delErr } = await supabaseAdmin
      .from('rosters')
      .delete()
      .eq('flight_id', flight_id);
    if (delErr) throw delErr;

    // Build roster rows
    const rosterRows = (bids as any[]).map((b) => ({
      flight_id,
      owner_id: b.owner_id,
      golfer_id: b.golfer_id,
      purchase_price: b.amount,
      is_keeper: b.is_keeper,
      keeper_stage: b.is_keeper ? (stageMap.get(`${b.owner_id}-${b.golfer_id}`) ?? 1) : 0,
    }));

    // Insert new rosters (bypasses RLS via service role)
    const { error: insErr } = await supabaseAdmin
      .from('rosters')
      .insert(rosterRows);
    if (insErr) throw insErr;

    // Lock session as final
    const { error: sessErr } = await supabaseAdmin
      .from('auction_sessions')
      .update({ status: 'final' })
      .eq('id', session_id);
    if (sessErr) throw sessErr;

    return NextResponse.json({ materialized: rosterRows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 500 });
  }
}
