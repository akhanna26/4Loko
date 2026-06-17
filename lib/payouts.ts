import { supabase } from './supabase';

export type LedgerEntry = {
  id: number;
  season_year: number;
  owner_id: number;
  owner_name: string;
  tournament_id: number | null;
  tournament_name: string | null;
  flight_id: number | null;
  entry_kind: string;
  amount: number;
  note: string | null;
  is_paid: boolean;
  paid_at: string | null;
};

export type MajorPayoutCard = {
  tournament_id: number;
  tournament_name: string;
  status: 'upcoming' | 'live' | 'final';
  buyin_per_owner: number;
  buyin_pool: number;
  winner_pool_per_owner: number;
  winner_pool_total: number;
  buyins: LedgerEntry[];
  winner_pool_buyins: LedgerEntry[];
  place_payouts: LedgerEntry[];
  winner_payout: LedgerEntry | null;
};

export type OwnerBalance = {
  owner_id: number;
  owner_name: string;
  total_owed: number;
  total_paid_in: number;
  total_winnings_owed: number;
  total_winnings_received: number;
  net_balance: number;
};

export type KeeperFeeLine = {
  flight_id: number;
  flight_number: number;
  tournament_name: string;
  golfer_name: string;
  keeper_price: number;
  keeper_stage: number;
};

export type OwnerKeeperFees = {
  owner_id: number;
  owner_name: string;
  lines: KeeperFeeLine[];
  total: number;
  is_paid: boolean;
  payment_id: number | null;
};

export async function getMajorPayoutCard(season_year: number, tournament_id: number): Promise<MajorPayoutCard | null> {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('id', tournament_id)
    .single();

  if (!tournament) return null;

  const { data: ledgerRows } = await supabase
    .from('ledger')
    .select('id, season_year, owner_id, tournament_id, flight_id, entry_kind, amount, note, is_paid, paid_at, owners(name)')
    .eq('season_year', season_year)
    .eq('tournament_id', tournament_id);

  const rows: LedgerEntry[] = (ledgerRows ?? []).map((r: any) => ({
    id: r.id,
    season_year: r.season_year,
    owner_id: r.owner_id,
    owner_name: r.owners?.name ?? 'Unknown',
    tournament_id: r.tournament_id,
    tournament_name: tournament.name,
    flight_id: r.flight_id,
    entry_kind: r.entry_kind,
    amount: Number(r.amount),
    note: r.note,
    is_paid: r.is_paid,
    paid_at: r.paid_at,
  }));

  const buyins = rows
    .filter((r) => r.entry_kind === 'MAJOR_BUYIN')
    .sort((a, b) => a.owner_name.localeCompare(b.owner_name));
  const winner_pool_buyins = rows
    .filter((r) => r.entry_kind === 'MAJOR_WINNER_BUYIN')
    .sort((a, b) => a.owner_name.localeCompare(b.owner_name));
  const place_payouts = rows
    .filter((r) => r.entry_kind === 'MAJOR_PAYOUT')
    .sort((a, b) => b.amount - a.amount);
  const winner_payout = rows.find((r) => r.entry_kind === 'MAJOR_WINNER_PAYOUT') ?? null;

  const buyin_per_owner = buyins.length > 0 ? Math.abs(buyins[0].amount) : 0;
  const winner_pool_per_owner = winner_pool_buyins.length > 0 ? Math.abs(winner_pool_buyins[0].amount) : 0;

  return {
    tournament_id,
    tournament_name: tournament.name,
    status: tournament.status,
    buyin_per_owner,
    buyin_pool: buyin_per_owner * buyins.length,
    winner_pool_per_owner,
    winner_pool_total: winner_pool_per_owner * winner_pool_buyins.length,
    buyins,
    winner_pool_buyins,
    place_payouts,
    winner_payout,
  };
}

export async function getKeeperFeesByOwner(season_year: number): Promise<OwnerKeeperFees[]> {
  const { data: owners } = await supabase
    .from('owners')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (!owners) return [];

  // Fixed: column is season_year, not year
  const { data: flights } = await supabase
    .from('flights')
    .select('id, flight_number, season_year')
    .eq('season_year', season_year);

  const flightIds = (flights ?? []).map((f: any) => f.id);
  const flightById = new Map<number, { flight_number: number }>();
  for (const f of (flights ?? []) as any[]) {
    flightById.set(f.id, { flight_number: f.flight_number });
  }

  if (flightIds.length === 0) {
    return owners.map((o: any) => ({
      owner_id: o.id,
      owner_name: o.name,
      lines: [],
      total: 0,
      is_paid: false,
      payment_id: null,
    }));
  }

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, event_type, flight_id')
    .in('flight_id', flightIds);

  const majorByFlight = new Map<number, string>();
  for (const t of (tournaments ?? []) as any[]) {
    if (t.event_type === 'MAJOR') majorByFlight.set(t.flight_id, t.name);
  }

  const { data: declarations } = await supabase
    .from('keeper_declarations')
    .select('owner_id, golfer_id, keeper_price, keeper_stage, flight_id, golfers(full_name)')
    .in('flight_id', flightIds);

  const { data: payments } = await supabase
    .from('keeper_fee_payments')
    .select('id, owner_id, is_paid')
    .eq('season_year', season_year);

  const paidByOwner = new Map<number, { id: number; is_paid: boolean }>();
  for (const p of (payments ?? []) as any[]) {
    paidByOwner.set(p.owner_id, { id: p.id, is_paid: p.is_paid });
  }

  const linesByOwner = new Map<number, KeeperFeeLine[]>();
  for (const d of (declarations ?? []) as any[]) {
    if (!linesByOwner.has(d.owner_id)) linesByOwner.set(d.owner_id, []);
    const flightInfo = flightById.get(d.flight_id);
    const tournamentName = majorByFlight.get(d.flight_id) ?? `Flight ${flightInfo?.flight_number ?? '?'}`;

    linesByOwner.get(d.owner_id)!.push({
      flight_id: d.flight_id,
      flight_number: flightInfo?.flight_number ?? 0,
      tournament_name: tournamentName,
      golfer_name: d.golfers?.full_name ?? 'Unknown',
      keeper_price: Number(d.keeper_price),
      keeper_stage: d.keeper_stage,
    });
  }

  return owners.map((o: any) => {
    const lines = (linesByOwner.get(o.id) ?? []).sort((a, b) => a.flight_number - b.flight_number);
    const total = lines.reduce((sum, l) => sum + l.keeper_price, 0);
    const payment = paidByOwner.get(o.id);
    return {
      owner_id: o.id,
      owner_name: o.name,
      lines,
      total,
      is_paid: payment?.is_paid ?? false,
      payment_id: payment?.id ?? null,
    };
  });
}

export async function getOwnerBalances(season_year: number): Promise<OwnerBalance[]> {
  const { data: ledgerRows } = await supabase
    .from('ledger')
    .select('owner_id, amount, is_paid, entry_kind, owners(name)')
    .eq('season_year', season_year);

  const byOwner = new Map<number, OwnerBalance>();

  for (const r of (ledgerRows ?? []) as any[]) {
    const owner_id = r.owner_id;
    const amount = Number(r.amount);
    const name = r.owners?.name ?? 'Unknown';

    if (!byOwner.has(owner_id)) {
      byOwner.set(owner_id, {
        owner_id,
        owner_name: name,
        total_owed: 0,
        total_paid_in: 0,
        total_winnings_owed: 0,
        total_winnings_received: 0,
        net_balance: 0,
      });
    }
    const b = byOwner.get(owner_id)!;

    if (amount < 0) {
      b.total_owed += Math.abs(amount);
      if (r.is_paid) b.total_paid_in += Math.abs(amount);
    } else {
      b.total_winnings_owed += amount;
      if (r.is_paid) b.total_winnings_received += amount;
    }
  }

  for (const b of byOwner.values()) {
    b.net_balance = b.total_winnings_received - b.total_paid_in;
  }

  return [...byOwner.values()].sort((a, b) => a.owner_name.localeCompare(b.owner_name));
}

export async function toggleLedgerPaid(ledger_id: number, new_is_paid: boolean): Promise<void> {
  const { error } = await supabase
    .from('ledger')
    .update({
      is_paid: new_is_paid,
      paid_at: new_is_paid ? new Date().toISOString() : null,
    })
    .eq('id', ledger_id);

  if (error) throw error;
}

export async function toggleKeeperFeePaid(payment_id: number, new_is_paid: boolean): Promise<void> {
  const { error } = await supabase
    .from('keeper_fee_payments')
    .update({
      is_paid: new_is_paid,
      paid_at: new_is_paid ? new Date().toISOString() : null,
    })
    .eq('id', payment_id);

  if (error) throw error;
}
