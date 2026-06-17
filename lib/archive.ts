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

// All flights whose primary tournament is final - eligible for the archive
export async function getArchivedFlights(season_year: number): Promise<ArchiveFlightSummary[]> {
  const { data: flights } = await supabase
    .from('flights')
    .select('id, flight_number, year, tournaments(id, name, status, event_type)')
    .eq('year', season_year)
    .order('flight_number', { ascending: true });

  if (!flights) return [];

  const archived: ArchiveFlightSummary[] = [];
  for (const f of flights as any[]) {
    // Each flight has multiple tournaments; the "primary" major (MAJOR event_type) is what we care about
    const tourneys = Array.isArray(f.tournaments) ? f.tournaments : f.tournaments ? [f.tournaments] : [];
    const major = tourneys.find((t: any) => t.event_type === 'MAJOR') ?? tourneys[0];
    if (!major) continue;
    if (major.status !== 'final') continue;

    // Find the champion - whoever rostered the actual tournament winner
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
  // Resolve flight + primary tournament
  const { data: flight } = await supabase
    .from('flights')
    .select('id, flight_number, year, tournaments(id, name, status, event_type)')
    .eq('id', flight_id)
    .single();

  if (!flight) return { picks: [], flight: null };

  const tourneys = Array.isArray((flight as any).tournaments) ? (flight as any).tournaments : [(flight as any).tournaments];
  const major = tourneys.find((t: any) => t?.event_type === 'MAJOR') ?? tourneys[0];

  const summary: ArchiveFlightSummary = {
    flight_id: (flight as any).id,
    flight_number: (flight as any).flight_number,
    primary_tournament_id: major.id,
    primary_tournament_name: major.name,
    primary_tournament_status: major.status,
    champion_name: null,
  };

  // Champion lookup
  const { data: championBonus } = await supabase
    .from('bonuses')
    .select('golfer_id, golfers(full_name)')
    .eq('tournament_id', major.id)
    .eq('bonus_kind', 'CHAMPION')
    .maybeSingle();
  summary.champion_name = (championBonus as any)?.golfers?.full_name ?? null;

  // Rosters joined to owners and golfers
  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, purchase_price, is_keeper, keeper_stage, owners(name), golfers(full_name)')
    .eq('flight_id', flight_id);

  // Bonus points - all bonuses for this flight's primary major
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
