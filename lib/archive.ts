import { supabase } from './supabase';

export type ArchivePick = {
  owner_id: number;
  owner_name: string;
  golfer_id: number;
  golfer_name: string;
  purchase_price: number;
  is_keeper: boolean;
  keeper_stage: number;
  bonus_points: number;
};

export type ArchiveFlightSummary = {
  flight_id: number;
  flight_number: number;
  primary_tournament_id: number;
  primary_tournament_name: string;
  primary_tournament_status: string;
  champion_name: string | null;
};

export type ArchiveBid = {
  bid_id: number;
  owner_id: number;
  owner_name: string;
  golfer_id: number;
  golfer_name: string;
  amount: number;
  is_keeper: boolean;
  pick_order: number;
  created_at: string;
};

// Fixed: use season_year (not year) and use two-step query since tournaments has flight_id
export async function getArchivedFlights(season_year: number): Promise<ArchiveFlightSummary[]> {
  const { data: flights } = await supabase
    .from('flights')
    .select('id, flight_number, season_year')
    .eq('season_year', season_year)
    .order('flight_number', { ascending: true });

  if (!flights || flights.length === 0) return [];

  const flightIds = flights.map((f: any) => f.id);
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, event_type, flight_id')
    .in('flight_id', flightIds);

  // Map flight_id -> primary major tournament
  const majorByFlight = new Map<number, any>();
  for (const t of (tournaments ?? []) as any[]) {
    if (t.event_type === 'MAJOR') majorByFlight.set(t.flight_id, t);
  }

  const archived: ArchiveFlightSummary[] = [];
  for (const f of flights as any[]) {
    const major = majorByFlight.get(f.id);
    if (!major) continue;
    if (major.status !== 'final') continue;

    const { data: championBonus } = await supabase
      .from('bonuses')
      .select('golfer_id, golfers(full_name)')
      .eq('tournament_id', major.id)
      .eq('bonus_kind', 'CHAMPION')
      .maybeSingle();

    archived.push({
      flight_id: f.id,
      flight_number: f.flight_number,
      primary_tournament_id: major.id,
      primary_tournament_name: major.name,
      primary_tournament_status: major.status,
      champion_name: (championBonus as any)?.golfers?.full_name ?? null,
    });
  }
  return archived;
}

// All picks for a given flight, with bonus_points scoped to the flight's primary major
export async function getFlightPicks(flight_id: number): Promise<{ picks: ArchivePick[]; flight: ArchiveFlightSummary | null }> {
  const { data: flight } = await supabase
    .from('flights')
    .select('id, flight_number, season_year')
    .eq('id', flight_id)
    .single();

  if (!flight) return { picks: [], flight: null };

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, event_type, flight_id')
    .eq('flight_id', flight_id);

  const major = (tournaments ?? []).find((t: any) => t.event_type === 'MAJOR') ?? (tournaments ?? [])[0];
  if (!major) return { picks: [], flight: null };

  const summary: ArchiveFlightSummary = {
    flight_id: (flight as any).id,
    flight_number: (flight as any).flight_number,
    primary_tournament_id: major.id,
    primary_tournament_name: major.name,
    primary_tournament_status: major.status,
    champion_name: null,
  };

  const { data: championBonus } = await supabase
    .from('bonuses')
    .select('golfer_id, golfers(full_name)')
    .eq('tournament_id', major.id)
    .eq('bonus_kind', 'CHAMPION')
    .maybeSingle();
  summary.champion_name = (championBonus as any)?.golfers?.full_name ?? null;

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, purchase_price, is_keeper, keeper_stage, owners(name), golfers(full_name)')
    .eq('flight_id', flight_id);

  const { data: bonusRows } = await supabase
    .from('bonuses')
    .select('owner_id, golfer_id, points')
    .eq('tournament_id', major.id);

  const bonusMap = new Map<string, number>();
  for (const b of (bonusRows ?? []) as any[]) {
    const key = `${b.owner_id}:${b.golfer_id}`;
    bonusMap.set(key, (bonusMap.get(key) ?? 0) + Number(b.points));
  }

  const picks: ArchivePick[] = ((rosterRows ?? []) as any[]).map((r) => ({
    owner_id: r.owner_id,
    owner_name: r.owners?.name ?? 'Unknown',
    golfer_id: r.golfer_id,
    golfer_name: r.golfers?.full_name ?? 'Unknown',
    purchase_price: Number(r.purchase_price),
    is_keeper: r.is_keeper,
    keeper_stage: r.keeper_stage,
    bonus_points: bonusMap.get(`${r.owner_id}:${r.golfer_id}`) ?? 0,
  }));

  return { picks, flight: summary };
}

// Draft history: chronological auction picks for a flight (active = winning bids only)
export async function getFlightDraftHistory(flight_id: number): Promise<ArchiveBid[]> {
  const { data: bids } = await supabase
    .from('auction_bids')
    .select('id, owner_id, golfer_id, amount, is_keeper, pick_order, created_at, owners(name), golfers(full_name)')
    .eq('flight_id', flight_id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return ((bids ?? []) as any[]).map((b) => ({
    bid_id: b.id,
    owner_id: b.owner_id,
    owner_name: b.owners?.name ?? 'Unknown',
    golfer_id: b.golfer_id,
    golfer_name: b.golfers?.full_name ?? 'Unknown',
    amount: Number(b.amount),
    is_keeper: b.is_keeper,
    pick_order: b.pick_order,
    created_at: b.created_at,
  }));
}
