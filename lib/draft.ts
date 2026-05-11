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

// Get all keeper declarations for a flight (for spectator view)
export async function getAllKeeperDeclarations(flight_id: number) {
  const { data, error } = await supabase
    .from('keeper_declarations')
    .select('id, owner_id, golfer_id, keeper_price, keeper_stage, owners(name), golfers(full_name)')
    .eq('flight_id', flight_id);
  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    owner_id: d.owner_id,
    owner_name: d.owners?.name ?? '',
    golfer_id: d.golfer_id,
    golfer_name: d.golfers?.full_name ?? '',
    keeper_price: d.keeper_price,
    keeper_stage: d.keeper_stage,
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
  const { error } = await supabase
    .from('keeper_declarations')
    .upsert(
      { flight_id, owner_id, golfer_id, keeper_price, keeper_stage },
      { onConflict: 'flight_id,owner_id' }
    );
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
