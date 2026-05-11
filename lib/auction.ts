import { supabase } from './supabase';

export type AuctionSession = {
  id: number;
  flight_id: number;
  status: 'setup' | 'keepers' | 'live' | 'final';
  nomination_order: number[] | null;
  current_pick: number;
  current_golfer_id: number | null;
  starting_budget: number;
  meeting_url: string | null;
  current_bid_owner_id: number | null;
  current_bid_amount: number | null;
};

export type AuctionBid = {
  id: number;
  flight_id: number;
  golfer_id: number;
  golfer_name: string;
  owner_id: number;
  owner_name: string;
  amount: number;
  pick_order: number;
  is_keeper: boolean;
  is_active: boolean;
  created_at: string;
};

export type OwnerState = {
  owner_id: number;
  owner_name: string;
  remaining: number;
  picks: number;
  spent: number;
};

export type GolferPoolEntry = {
  golfer_id: number;
  full_name: string;
  is_available: boolean;
  odds: string | null;
  sold_to_owner_id: number | null;
  sold_to_owner_name: string | null;
  sold_for_amount: number | null;
  is_keeper: boolean;
};

// Fetch the active auction session for a flight
export async function getAuctionSession(flight_id: number): Promise<AuctionSession | null> {
  const { data, error } = await supabase
    .from('auction_sessions')
    .select('*')
    .eq('flight_id', flight_id)
    .maybeSingle();
  if (error) throw error;
  return data as AuctionSession | null;
}

// Active sale log
export async function getAuctionBids(flight_id: number): Promise<AuctionBid[]> {
  const { data, error } = await supabase
    .from('auction_bids')
    .select('id, flight_id, golfer_id, owner_id, amount, pick_order, is_keeper, is_active, created_at, golfers(full_name), owners(name)')
    .eq('flight_id', flight_id)
    .order('pick_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    id: b.id,
    flight_id: b.flight_id,
    golfer_id: b.golfer_id,
    golfer_name: b.golfers?.full_name ?? '',
    owner_id: b.owner_id,
    owner_name: b.owners?.name ?? '',
    amount: b.amount,
    pick_order: b.pick_order,
    is_keeper: b.is_keeper,
    is_active: b.is_active,
    created_at: b.created_at,
  }));
}

// Live owner state (budgets, picks, spent)
export async function getOwnerStates(flight_id: number): Promise<OwnerState[]> {
  const { data, error } = await supabase
    .from('v_auction_owner_state')
    .select('*')
    .eq('flight_id', flight_id);
  if (error) throw error;
  return (data ?? []) as OwnerState[];
}

// Golfer pool with sale info
export async function getGolferPool(flight_id: number): Promise<GolferPoolEntry[]> {
  const { data: poolData, error: poolErr } = await supabase
    .from('flight_pools')
    .select('golfer_id, is_available, golfers(full_name, odds)')
    .eq('flight_id', flight_id);
  if (poolErr) throw poolErr;

  const { data: bidsData } = await supabase
    .from('auction_bids')
    .select('golfer_id, owner_id, amount, is_keeper, owners(name)')
    .eq('flight_id', flight_id)
    .eq('is_active', true);

  const bidsByGolfer = new Map<number, any>(
    (bidsData ?? []).map((b: any) => [b.golfer_id, b])
  );

  return ((poolData ?? []) as any[])
    .map((p) => {
      const bid = bidsByGolfer.get(p.golfer_id);
      return {
        golfer_id: p.golfer_id,
        full_name: p.golfers?.full_name ?? '',
        is_available: p.is_available && !bid,
        odds: p.golfers?.odds ?? null,
        sold_to_owner_id: bid?.owner_id ?? null,
        sold_to_owner_name: bid?.owners?.name ?? null,
        sold_for_amount: bid?.amount ?? null,
        is_keeper: bid?.is_keeper ?? false,
      };
    })
    .sort((a, b) => {
      // Sort by odds (favorites first), then by name
      const oddsA = a.odds ? parseInt(a.odds.replace('+', ''), 10) : 99999;
      const oddsB = b.odds ? parseInt(b.odds.replace('+', ''), 10) : 99999;
      if (oddsA !== oddsB) return oddsA - oddsB;
      return a.full_name.localeCompare(b.full_name);
    });
}

// Compute next nominator from snake order
// nomination_order = [owner_id_1, owner_id_2, ..., owner_id_12]
// pick 0 → order[0], pick 1 → order[1], ..., pick 11 → order[11]
// pick 12 → order[11] (snake reverse), pick 13 → order[10], ..., pick 23 → order[0]
// pick 24 → order[0] again, etc.
export function getCurrentNominator(nomination_order: number[] | null, pick: number): number | null {
  if (!nomination_order || nomination_order.length === 0) return null;
  const n = nomination_order.length;
  const round = Math.floor(pick / n);
  const idx = pick % n;
  // Even rounds (0, 2, 4...): forward; Odd rounds (1, 3, 5...): backward
  const actualIdx = round % 2 === 0 ? idx : (n - 1 - idx);
  return nomination_order[actualIdx];
}

// Get next 4 nominators for the queue display
export function getUpcomingNominators(nomination_order: number[] | null, current_pick: number, count = 4): number[] {
  if (!nomination_order || nomination_order.length === 0) return [];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const id = getCurrentNominator(nomination_order, current_pick + i);
    if (id !== null) result.push(id);
  }
  return result;
}

// Set current golfer on the floor (commissioner clicks a golfer to nominate)
export async function setCurrentGolfer(session_id: number, golfer_id: number | null) {
  const { error } = await supabase
    .from('auction_sessions')
    .update({ current_golfer_id: golfer_id, current_bid_owner_id: null, current_bid_amount: null })
    .eq('id', session_id);
  if (error) throw error;
}

// Record a sale (the main action)
export async function recordSale(params: {
  session_id: number;
  flight_id: number;
  golfer_id: number;
  owner_id: number;
  amount: number;
  pick_order: number;
  is_keeper?: boolean;
}) {
  const { error: bidErr } = await supabase.from('auction_bids').insert({
    flight_id: params.flight_id,
    golfer_id: params.golfer_id,
    owner_id: params.owner_id,
    amount: params.amount,
    pick_order: params.pick_order,
    is_keeper: params.is_keeper ?? false,
    is_active: true,
  });
  if (bidErr) throw bidErr;

  // Advance pick, clear current golfer
  const { error: sessErr } = await supabase
    .from('auction_sessions')
    .update({
      current_pick: params.pick_order + 1,
      current_golfer_id: null,
      current_bid_owner_id: null,
      current_bid_amount: null,
    })
    .eq('id', params.session_id);
  if (sessErr) throw sessErr;
}

// Undo a sale (mark inactive)
export async function undoSale(bid_id: number, session_id: number) {
  const { data: bid } = await supabase
    .from('auction_bids')
    .select('pick_order')
    .eq('id', bid_id)
    .single();

  const { error: bidErr } = await supabase
    .from('auction_bids')
    .update({ is_active: false })
    .eq('id', bid_id);
  if (bidErr) throw bidErr;

  // Roll back pick if it was the most recent
  if (bid) {
    await supabase
      .from('auction_sessions')
      .update({ current_pick: bid.pick_order })
      .eq('id', session_id);
  }
}

// Update meeting URL
export async function setMeetingUrl(session_id: number, url: string) {
  const { error } = await supabase
    .from('auction_sessions')
    .update({ meeting_url: url || null })
    .eq('id', session_id);
  if (error) throw error;
}

// Set nomination order (random shuffle)
export async function setNominationOrder(session_id: number, owner_ids: number[]) {
  const { error } = await supabase
    .from('auction_sessions')
    .update({ nomination_order: owner_ids })
    .eq('id', session_id);
  if (error) throw error;
}

// Randomize nomination order
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Set session status (live, final, etc.)
export async function setSessionStatus(session_id: number, status: AuctionSession['status']) {
  const { error } = await supabase.from('auction_sessions').update({ status }).eq('id', session_id);
  if (error) throw error;
}
// Apply declared keepers to the auction as pre-existing bids at original purchase price
// Keeper fee → year-long pot (separate, handled at draft finalization)
// Original price → auction budget hit (this is what we record as a bid here)
export async function applyKeepersToAuction(flight_id: number, prev_flight_id: number) {
  // Find all keeper declarations for this flight
  const { data: declarations, error: dErr } = await supabase
    .from('keeper_declarations')
    .select('owner_id, golfer_id')
    .eq('flight_id', flight_id);
  if (dErr) throw dErr;
  if (!declarations || declarations.length === 0) return { applied: 0 };

  // Get original purchase prices from prev flight rosters
  const { data: prevRosters, error: rErr } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, purchase_price')
    .eq('flight_id', prev_flight_id)
    .in('golfer_id', declarations.map((d: any) => d.golfer_id));
  if (rErr) throw rErr;

  const priceLookup = new Map<string, number>();
  for (const r of prevRosters ?? []) {
    priceLookup.set(`${r.owner_id}-${r.golfer_id}`, r.purchase_price);
  }

  // Wipe existing keeper-flagged bids for this flight first (idempotent)
  await supabase.from('auction_bids').delete().eq('flight_id', flight_id).eq('is_keeper', true);

  // Insert one bid per keeper at original price
  let pickOrder = 0;
  const inserts = [];
  for (const decl of declarations as any[]) {
    const price = priceLookup.get(`${decl.owner_id}-${decl.golfer_id}`);
    if (price === undefined) continue;
    inserts.push({
      flight_id,
      owner_id: decl.owner_id,
      golfer_id: decl.golfer_id,
      amount: price,
      pick_order: pickOrder++,
      is_keeper: true,
      is_active: true,
    });
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from('auction_bids').insert(inserts);
    if (insErr) throw insErr;

    // Mark those golfers as unavailable in the pool
    await supabase
      .from('flight_pools')
      .update({ is_available: false })
      .eq('flight_id', flight_id)
      .in('golfer_id', declarations.map((d: any) => d.golfer_id));

    // Bump current_pick past the keepers so live nominations start fresh
    await supabase
      .from('auction_sessions')
      .update({ current_pick: inserts.length })
      .eq('flight_id', flight_id);
  }

  return { applied: inserts.length };
}

// Helper: shorten owner name for tight UI ("Anshu Khanna" → "A. Khanna")
export function shortName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName;
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1];
  return `${first}. ${last}`;
}
// Compute the full snake order: rounds × owners, with direction
export function getFullSnakeOrder(
  nomination_order: number[] | null,
  current_pick: number,
  total_rounds: number = 10,
): { round: number; direction: 'forward' | 'reverse'; ownerIds: number[]; pickNumbers: number[] }[] {
  if (!nomination_order || nomination_order.length === 0) return [];
  const n = nomination_order.length;
  const result = [];
  for (let r = 0; r < total_rounds; r++) {
    const direction = r % 2 === 0 ? 'forward' : 'reverse';
    const ownerIds = direction === 'forward' ? [...nomination_order] : [...nomination_order].reverse();
    const pickNumbers = ownerIds.map((_, i) => r * n + i);
    result.push({ round: r + 1, direction: direction as 'forward' | 'reverse', ownerIds, pickNumbers });
  }
  return result;
}