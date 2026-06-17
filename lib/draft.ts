import { supabase } from './supabase';

export type Flight = { id: number; name: string | null; flight_number: number; season_year: number };
export type RosterEntry = { golfer_id: number; full_name: string; purchase_price: number; was_keeper: boolean; keeper_stage: number };

// Fetch a flight by season + number
export async function getFlight(season_year: number, flight_number: number): Promise<Flight | null> {
  const { data, error } = await supabase
    .from('flights')
    .select('id, name, flight_number, season_year')
    .eq('season_year', season_year)
    .eq('flight_number', flight_number)
    .single();
  if (error) return null;
  return data as Flight;
}

// Get an owner's previous-flight roster (eligible keeper sources)
export async function getOwnerPrevRoster(owner_id: number, prev_flight_id: number): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from('rosters')
    .select('golfer_id, purchase_price, is_keeper, keeper_stage, golfers(full_name)')
    .eq('owner_id', owner_id)
    .eq('flight_id', prev_flight_id);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    golfer_id: r.golfer_id,
    full_name: r.golfers?.full_name ?? 'Unknown',
    purchase_price: r.purchase_price,
    was_keeper: r.is_keeper,
    keeper_stage: r.keeper_stage,
  }));
}

// Get current keeper declaration (if any)
export async function getKeeperDeclaration(flight_id: number, owner_id: number) {
  const { data, error } = await supabase
    .from('keeper_declarations')
    .select('id, golfer_id, keeper_price, keeper_stage, golfers(full_name)')
    .eq('flight_id', flight_id)
    .eq('owner_id', owner_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Get all keeper declarations for a flight (for spectator view).
// Enriches with cap_price = purchase_price from the previous flight's roster for that owner+golfer.
export async function getAllKeeperDeclarations(flight_id: number) {
  // Step 1: look up this flight's flight_number so we can compute previous
  const { data: thisFlight } = await supabase
    .from('flights')
    .select('id, flight_number, season_year')
    .eq('id', flight_id)
    .single();

  // Step 2: declarations themselves
  const { data: declarations, error: declErr } = await supabase
    .from('keeper_declarations')
    .select('id, owner_id, golfer_id, keeper_price, keeper_stage, owners(name), golfers(full_name)')
    .eq('flight_id', flight_id);
  if (declErr) throw declErr;

  // Step 3: previous flight id (same season, flight_number - 1)
  let prevFlightId: number | null = null;
  if (thisFlight && thisFlight.flight_number > 1) {
    const { data: prev } = await supabase
      .from('flights')
      .select('id')
      .eq('season_year', thisFlight.season_year)
      .eq('flight_number', thisFlight.flight_number - 1)
      .single();
    prevFlightId = prev?.id ?? null;
  }

  // Step 4: cap = purchase_price from previous flight roster for each (owner, golfer)
  const capByOwnerGolfer = new Map<string, number>();
  if (prevFlightId !== null && declarations && declarations.length > 0) {
    const ownerIds = [...new Set(declarations.map((d: any) => d.owner_id))];
    const golferIds = [...new Set(declarations.map((d: any) => d.golfer_id))];
    const { data: rosters } = await supabase
      .from('rosters')
      .select('owner_id, golfer_id, purchase_price')
      .eq('flight_id', prevFlightId)
      .in('owner_id', ownerIds)
      .in('golfer_id', golferIds);
    for (const r of (rosters ?? []) as any[]) {
      capByOwnerGolfer.set(`${r.owner_id}:${r.golfer_id}`, Number(r.purchase_price));
    }
  }

  return (declarations ?? []).map((d: any) => ({
    id: d.id,
    owner_id: d.owner_id,
    owner_name: d.owners?.name ?? '',
    golfer_id: d.golfer_id,
    golfer_name: d.golfers?.full_name ?? '',
    keeper_price: d.keeper_price,
    keeper_stage: d.keeper_stage,
    cap_price: capByOwnerGolfer.get(`${d.owner_id}:${d.golfer_id}`) ?? null,
  }));
}

// Compute keeper price: prev keeper_stage + 1, max stage 3 (= $30)
export function computeKeeperPrice(prevStage: number): { price: number; stage: number } {
  const stage = Math.min(prevStage + 1, 3);
  const price = stage * 10;
  return { price, stage };
}

// Save / update keeper declaration
export async function saveKeeperDeclaration(
  flight_id: number,
  owner_id: number,
  golfer_id: number,
  keeper_price: number,
  keeper_stage: number,
) {
  // Delete existing first (in case they're switching)
  await supabase.from('keeper_declarations').delete().eq('flight_id', flight_id).eq('owner_id', owner_id);
  const { error } = await supabase.from('keeper_declarations').insert({
    flight_id, owner_id, golfer_id, keeper_price, keeper_stage,
  });
  if (error) throw error;
}

export async function clearKeeperDeclaration(flight_id: number, owner_id: number) {
  const { error } = await supabase
    .from('keeper_declarations')
    .delete()
    .eq('flight_id', flight_id)
    .eq('owner_id', owner_id);
  if (error) throw error;
}
