import { supabase } from './supabase';

export type YearlongStanding = {
  season_year: number;
  owner_name: string;
  total_score: number;
  finish_rank: number;
  notes: string | null;
};

export type EventResult = {
  season_year: number;
  tournament_name: string;
  event_type: string;
  owner_name: string;
  total_score: number;
  was_major_winner: boolean;
};

export type Tournament = {
  id: number;
  name: string;
  venue: string | null;
  start_date: string;
  end_date: string;
  event_type: 'MAJOR' | 'PGA';
  status: 'upcoming' | 'live' | 'final';
};

export type Owner = {
  id: number;
  name: string;
  nickname: string | null;
  is_active: boolean;
};

export type EventScore = {
  tournament_id: number;
  tournament_name: string;
  event_type: 'MAJOR' | 'PGA';
  status: 'upcoming' | 'live' | 'final';
  start_date: string;
  ranks: { rank: number; owner_name: string; score: number }[]; // top 3 for majors, all scorers for non-majors
  major_winner_owner: string | null;
  major_winner_golfer: string | null;
};

export async function getYearlongStandings(year: number): Promise<YearlongStanding[]> {
  const { data, error } = await supabase
    .from('historical_results')
    .select('season_year, owner_name, total_score, finish_rank, notes')
    .eq('season_year', year)
    .eq('tournament_name', 'YEARLONG')
    .order('finish_rank');
  if (error) throw error;
  return (data ?? []) as YearlongStanding[];
}

export async function getEventResults(year: number): Promise<EventResult[]> {
  const { data, error } = await supabase
    .from('historical_results')
    .select('season_year, tournament_name, event_type, owner_name, total_score, was_major_winner')
    .eq('season_year', year)
    .neq('tournament_name', 'YEARLONG')
    .order('tournament_name');
  if (error) throw error;
  return (data ?? []) as EventResult[];
}

export async function getMajorWinners(): Promise<EventResult[]> {
  const { data, error } = await supabase
    .from('historical_results')
    .select('season_year, tournament_name, event_type, owner_name, total_score, was_major_winner')
    .eq('was_major_winner', true)
    .order('season_year', { ascending: false })
    .order('tournament_name');
  if (error) throw error;
  return (data ?? []) as EventResult[];
}

export async function getChampions(): Promise<YearlongStanding[]> {
  const { data, error } = await supabase
    .from('historical_results')
    .select('season_year, owner_name, total_score, finish_rank, notes')
    .eq('tournament_name', 'YEARLONG')
    .eq('finish_rank', 1)
    .order('season_year', { ascending: false });
  if (error) throw error;
  return (data ?? []) as YearlongStanding[];
}

export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, venue, start_date, end_date, event_type, status')
    .order('start_date');
  if (error) throw error;
  return (data ?? []) as Tournament[];
}

export async function getActiveOwners(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from('owners')
    .select('id, name, nickname, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Owner[];
}

export async function getLiveYearlong(): Promise<{ owner_name: string; total: number; per_event: Record<string, number> }[]> {
  const { data, error } = await supabase
    .from('v_owner_tournament_score')
    .select('owner_name, tournament_name, total_score, event_type');
  if (error) throw error;

  const rows = (data ?? []) as { owner_name: string; tournament_name: string; total_score: number; event_type: string }[];
  const byOwner = new Map<string, { total: number; per_event: Record<string, number> }>();
  for (const r of rows) {
    if (!byOwner.has(r.owner_name)) byOwner.set(r.owner_name, { total: 0, per_event: {} });
    const o = byOwner.get(r.owner_name)!;
    o.per_event[r.tournament_name] = r.total_score;
    o.total += r.total_score;
  }
  return [...byOwner.entries()]
    .map(([owner_name, v]) => ({ owner_name, ...v }))
    .sort((a, b) => b.total - a.total);
}

// All events with status + scoring; for majors: top-3, for non-majors: all owners with positive bonuses
export async function getEventScores(): Promise<EventScore[]> {
  const { data: tdata, error: terr } = await supabase
    .from('tournaments')
    .select('id, name, event_type, status, start_date, flight_id')
    .order('start_date');
  if (terr) throw terr;
  const tournaments = (tdata ?? []) as { id: number; name: string; event_type: 'MAJOR' | 'PGA'; status: 'upcoming' | 'live' | 'final'; start_date: string; flight_id: number }[];

  const finalIds = tournaments.filter((t) => t.status !== 'upcoming').map((t) => t.id);
  let scores: { tournament_id: number; owner_name: string; total_score: number }[] = [];
  if (finalIds.length) {
    const { data: sdata, error: serr } = await supabase
      .from('v_owner_tournament_score')
      .select('tournament_id, owner_name, total_score')
      .in('tournament_id', finalIds);
    if (serr) throw serr;
    scores = (sdata ?? []) as any[];
  }

  // Champions for major events
  const { data: champData } = await supabase
    .from('bonuses')
    .select('tournament_id, owner_id, golfer_id, bonus_kind')
    .eq('bonus_kind', 'CHAMPION');
  const { data: ownerData } = await supabase.from('owners').select('id, name');
  const { data: golferData } = await supabase.from('golfers').select('id, full_name');
  const ownerMap = new Map((ownerData ?? []).map((o: any) => [o.id, o.name]));
  const golferMap = new Map((golferData ?? []).map((g: any) => [g.id, g.full_name]));
  const champByTournament = new Map<number, { owner: string; golfer: string }>();
  for (const c of (champData ?? []) as any[]) {
    champByTournament.set(c.tournament_id, {
      owner: ownerMap.get(c.owner_id) ?? '',
      golfer: golferMap.get(c.golfer_id) ?? '',
    });
  }

  return tournaments.map((t) => {
    const tScores = scores
      .filter((s) => s.tournament_id === t.id)
      .map((s) => ({ owner_name: s.owner_name, score: s.total_score }))
      .sort((a, b) => b.score - a.score);

    let ranks: { rank: number; owner_name: string; score: number }[] = [];
    if (t.status !== 'upcoming') {
      if (t.event_type === 'MAJOR') {
        ranks = tScores.slice(0, 3).map((s, i) => ({ rank: i + 1, owner_name: s.owner_name, score: s.score }));
      } else {
        // Non-majors: only show point-getters (positive scores)
        ranks = tScores.filter((s) => s.score > 0).map((s, i) => ({ rank: i + 1, owner_name: s.owner_name, score: s.score }));
      }
    }

    const champ = champByTournament.get(t.id);
    return {
      tournament_id: t.id,
      tournament_name: t.name,
      event_type: t.event_type,
      status: t.status,
      start_date: t.start_date,
      ranks,
      major_winner_owner: champ?.owner ?? null,
      major_winner_golfer: champ?.golfer ?? null,
    };
  });
}

export type StandingRank = {
  owner_id: number;
  rank: number | null;
  is_tied: boolean;
  is_fallback: boolean; // true if using last year's data
};

// Compute current rank by yearlong points; fall back to prev year if no events scored yet
export async function getOwnerRanks(): Promise<Map<number, StandingRank>> {
  // Get current year from view; if everyone is at 0, fall back to last year
  const { data: current, error: cErr } = await supabase
    .from('v_yearlong_standings')
    .select('owner_id, owner_name, season_score, season_year')
    .order('season_year', { ascending: false })
    .limit(50);
  if (cErr) throw cErr;

  const result = new Map<number, StandingRank>();

  if (!current || current.length === 0) return result;

  // Most recent season
  const latestYear = current[0].season_year;
  const currentRows = current.filter((r: any) => r.season_year === latestYear);
  const hasScored = currentRows.some((r: any) => Number(r.season_score) !== 0);

  let useRows = currentRows;
  let isFallback = false;

  if (!hasScored) {
    // Fall back to historical_results from previous year
    const prevYear = latestYear - 1;
    const { data: hist } = await supabase
      .from('historical_results')
      .select('owner_name, yearlong_total')
      .eq('season_year', prevYear);
    if (hist && hist.length > 0) {
      const { data: ownersData } = await supabase
        .from('owners')
        .select('id, name');
      const nameToId = new Map((ownersData ?? []).map((o: any) => [o.name, o.id]));
      useRows = hist
        .map((h: any) => ({
          owner_id: nameToId.get(h.owner_name),
          owner_name: h.owner_name,
          season_score: Number(h.yearlong_total) || 0,
          season_year: h.season_year    // <-- ADD THIS LINE
        }))
        .filter((r: any) => r.owner_id !== undefined);
      isFallback = true;
    }
  }

  // Sort highest to lowest, compute ranks with ties
  const sorted = [...useRows].sort((a: any, b: any) => Number(b.season_score) - Number(a.season_score));

  let currentRank = 0;
  let prevScore: number | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const r: any = sorted[i];
    const score = Number(r.season_score);
    if (prevScore === null || score !== prevScore) {
      currentRank = i + 1;
    }
    prevScore = score;
    result.set(r.owner_id, {
      owner_id: r.owner_id,
      rank: currentRank,
      is_tied: false,
      is_fallback: isFallback,
    });
  }

  // Mark ties
  const rankCounts = new Map<number, number>();
  for (const r of result.values()) {
    if (r.rank !== null) rankCounts.set(r.rank, (rankCounts.get(r.rank) ?? 0) + 1);
  }
  for (const r of result.values()) {
    if (r.rank !== null && (rankCounts.get(r.rank) ?? 0) > 1) r.is_tied = true;
  }

  // Add owners that aren't in the standings (e.g., new owners) with null rank
  const { data: allActive } = await supabase
    .from('owners')
    .select('id')
    .eq('is_active', true);
  for (const o of allActive ?? []) {
    if (!result.has((o as any).id)) {
      result.set((o as any).id, {
        owner_id: (o as any).id,
        rank: null,
        is_tied: false,
        is_fallback: isFallback,
      });
    }
  }

  return result;
}
export type TournamentDetail = {
  tournament: Tournament;
  flight_id: number;
  rosters: {
    owner_id: number;
    owner_name: string;
    nickname: string | null;
    rank: number;
    is_tied: boolean;
    daily_scores: { day: 'Th' | 'Fr' | 'Sa' | 'Su'; score: number | null }[];
    bonuses: { kind: string; points: number; detail: string }[];
    bonus_total: number;
    total_score: number;
    golfers: {
      golfer_id: number;
      full_name: string;
      purchase_price: number;
      is_keeper: boolean;
      day_scores: { day: 'Th' | 'Fr' | 'Sa' | 'Su'; raw_score: number | null; counted: boolean }[];
      best_round_total: number;  // sum of counted rounds
    }[];
  }[];
  major_winner: { owner_name: string; golfer_name: string } | null;
};

const ROUND_TO_DAY: Record<number, 'Th' | 'Fr' | 'Sa' | 'Su'> = {
  1: 'Th', 2: 'Fr', 3: 'Sa', 4: 'Su',
};
const DAY_TO_ROUND: Record<'Th' | 'Fr' | 'Sa' | 'Su', number> = {
  Th: 1, Fr: 2, Sa: 3, Su: 4,
};

export async function getTournamentDetail(tournamentId: number): Promise<TournamentDetail | null> {
  const { data: tdata, error: terr } = await supabase
    .from('tournaments')
    .select('id, name, venue, start_date, end_date, event_type, status, flight_id')
    .eq('id', tournamentId)
    .single();
  if (terr || !tdata) return null;
  const tournament = tdata as Tournament & { flight_id: number };

  const { data: rosterData } = await supabase
    .from('rosters')
    .select('owner_id, golfer_id, purchase_price, is_keeper')
    .eq('flight_id', tournament.flight_id);

  const { data: ownersData } = await supabase
    .from('owners')
    .select('id, name, nickname')
    .eq('is_active', true);

  const { data: golfersData } = await supabase
    .from('golfers')
    .select('id, full_name');

  const golferIds = [...new Set((rosterData ?? []).map((r: any) => r.golfer_id))];

  // Convention: scores stored as raw strokes vs par (negative = good).
  // The site displays POINTS (positive = good), so we invert at read time.
  const { data: scoresData } = golferIds.length > 0 ? await supabase
    .from('scores')
    .select('golfer_id, round_number, strokes_vs_par')
    .eq('tournament_id', tournamentId)
    .in('golfer_id', golferIds) : { data: [] };

  const { data: tScores } = await supabase
    .from('v_owner_tournament_score')
    .select('owner_id, owner_name, total_score')
    .eq('tournament_id', tournamentId);

  const { data: bonusData } = await supabase
    .from('bonuses')
    .select('owner_id, golfer_id, bonus_kind, points, round_number')
    .eq('tournament_id', tournamentId);

  // adjusted scores view — if it exists, use it; if not, fall back to computing counted via funnel logic
  let adjData: any[] = [];
  try {
    const { data: adj } = await supabase
      .from('v_adjusted_scores')
      .select('owner_id, golfer_id, round_number, is_counted')
      .eq('tournament_id', tournamentId);
    adjData = adj ?? [];
  } catch (e) {
    adjData = [];
  }

  const ownerMap = new Map((ownersData ?? []).map((o: any) => [o.id, o]));
  const golferMap = new Map((golfersData ?? []).map((g: any) => [g.id, g]));

  const rostersByOwner = new Map<number, any[]>();
  for (const r of rosterData ?? []) {
    if (!rostersByOwner.has(r.owner_id)) rostersByOwner.set(r.owner_id, []);
    rostersByOwner.get(r.owner_id)!.push(r);
  }

  // Per-golfer-per-day raw strokes vs par
  const strokesByGolferRound = new Map<string, number>();
  for (const s of scoresData ?? []) {
    const sa = s as any;
    strokesByGolferRound.set(`${sa.golfer_id}-${sa.round_number}`, sa.strokes_vs_par);
  }

  // Counted-flag per (owner, golfer, round) from view
  const countedFlag = new Map<string, boolean>();
  for (const a of adjData) {
    countedFlag.set(`${a.owner_id}-${a.golfer_id}-${a.round_number}`, a.is_counted);
  }

  // Bonuses per owner
  const bonusesByOwner = new Map<number, { kind: string; points: number; detail: string }[]>();
  for (const b of (bonusData ?? []) as any[]) {
    if (!bonusesByOwner.has(b.owner_id)) bonusesByOwner.set(b.owner_id, []);
    const golfer = b.golfer_id ? golferMap.get(b.golfer_id) : null;
    const dayLabel = b.round_number ? ROUND_TO_DAY[b.round_number] : null;
    const detail =
      b.bonus_kind === 'CHAMPION' ? `Champion: ${(golfer as any)?.full_name ?? '—'}` :
      b.bonus_kind === 'DAILY_LOW' ? `${dayLabel ?? 'Daily'} low${golfer ? `: ${(golfer as any).full_name}` : ''}` :
      b.bonus_kind === 'HIO' ? `Hole-in-one${golfer ? `: ${(golfer as any).full_name}` : ''}` :
      b.bonus_kind;
    bonusesByOwner.get(b.owner_id)!.push({
      kind: b.bonus_kind,
      points: Number(b.points) || 0,
      detail,
    });
  }

  const days: ('Th' | 'Fr' | 'Sa' | 'Su')[] = ['Th', 'Fr', 'Sa', 'Su'];

  // Helper: compute counted-set when no v_adjusted_scores view exists.
  // Top N golfers per day based on POINTS (= -strokes_vs_par). N=4 for Th/Fr, N=2 for Sa/Su.
  const computeCountedFallback = (
    ownerId: number,
    roster: any[],
  ): Map<string, boolean> => {
    const result = new Map<string, boolean>();
    for (const day of days) {
      const roundNum = DAY_TO_ROUND[day];
      const candidates = roster
        .map((r: any) => {
          const strokes = strokesByGolferRound.get(`${r.golfer_id}-${roundNum}`);
          if (strokes === null || strokes === undefined) return null;
          return { golfer_id: r.golfer_id, points: -strokes };
        })
        .filter((x: any) => x !== null)
        .sort((a: any, b: any) => b!.points - a!.points);
      const topN = day === 'Sa' || day === 'Su' ? 2 : 4;
      candidates.slice(0, topN).forEach((c: any) => {
        result.set(`${ownerId}-${c!.golfer_id}-${roundNum}`, true);
      });
    }
    return result;
  };

  const useFallback = adjData.length === 0;

  const allOwnerIds = [...rostersByOwner.keys()];
  const rostersOut = allOwnerIds.map((oid) => {
    const owner = ownerMap.get(oid) as any;
    const ownerRoster = rostersByOwner.get(oid) ?? [];

    const fallbackCounted = useFallback ? computeCountedFallback(oid, ownerRoster) : null;

    const golfers = ownerRoster.map((r: any) => {
      const golfer = golferMap.get(r.golfer_id) as any;
      const day_scores = days.map((d) => {
        const roundNum = DAY_TO_ROUND[d];
        const strokes = strokesByGolferRound.get(`${r.golfer_id}-${roundNum}`);
        // Convert strokes to POINTS for display (negate strokes_vs_par)
        const points = strokes === undefined ? null : -strokes;
        const counted = useFallback
          ? (fallbackCounted!.get(`${oid}-${r.golfer_id}-${roundNum}`) ?? false)
          : (countedFlag.get(`${oid}-${r.golfer_id}-${roundNum}`) ?? false);
        return { day: d, raw_score: points, counted };
      });
      const best_round_total = day_scores
        .filter((d) => d.counted)
        .reduce((s, d) => s + (d.raw_score ?? 0), 0);
      return {
        golfer_id: r.golfer_id,
        full_name: golfer?.full_name ?? 'Unknown',
        purchase_price: r.purchase_price,
        is_keeper: r.is_keeper,
        day_scores,
        best_round_total,
      };
    });

    const daily_scores = days.map((d) => {
      const dayPoints = golfers
        .map((g) => {
          const ds = g.day_scores.find((ds: any) => ds.day === d);
          return ds && ds.counted && ds.raw_score !== null ? ds.raw_score : null;
        })
        .filter((s): s is number => s !== null);
      return {
        day: d,
        score: dayPoints.length > 0 ? dayPoints.reduce((a, b) => a + b, 0) : null,
      };
    });

    const bonuses = bonusesByOwner.get(oid) ?? [];
    const bonus_total = bonuses.reduce((s, b) => s + b.points, 0);
    const ownerScore = (tScores ?? []).find((s: any) => s.owner_id === oid);

    return {
      owner_id: oid,
      owner_name: owner?.name ?? 'Unknown',
      nickname: owner?.nickname ?? null,
      rank: 0,
      is_tied: false,
      daily_scores,
      bonuses,
      bonus_total,
      total_score: ownerScore ? Number((ownerScore as any).total_score) : 0,
      golfers,
    };
  });

  rostersOut.sort((a, b) => b.total_score - a.total_score);

  let currentRank = 0;
  let prevScore: number | null = null;
  for (let i = 0; i < rostersOut.length; i++) {
    if (prevScore === null || rostersOut[i].total_score !== prevScore) {
      currentRank = i + 1;
    }
    prevScore = rostersOut[i].total_score;
    rostersOut[i].rank = currentRank;
  }
  const rankCounts = new Map<number, number>();
  for (const r of rostersOut) rankCounts.set(r.rank, (rankCounts.get(r.rank) ?? 0) + 1);
  for (const r of rostersOut) r.is_tied = (rankCounts.get(r.rank) ?? 0) > 1;

  const champBonus = (bonusData ?? []).find((b: any) => b.bonus_kind === 'CHAMPION') as any;
  const major_winner = champBonus
    ? {
        owner_name: (ownerMap.get(champBonus.owner_id) as any)?.name ?? '',
        golfer_name: (golferMap.get(champBonus.golfer_id) as any)?.full_name ?? '',
      }
    : null;

  return {
    tournament: tournament as any,
    flight_id: tournament.flight_id,
    rosters: rostersOut,
    major_winner,
  };
}
