import { NextRequest, NextResponse } from 'next/server';
import { getFlightPicks } from '../../../../../lib/archive';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ flightId: string }> }) {
  const { flightId: flightIdStr } = await params;
  const flightId = parseInt(flightIdStr, 10);
  if (isNaN(flightId)) {
    return new NextResponse('Invalid flight ID', { status: 400 });
  }

  const { picks, flight } = await getFlightPicks(flightId);
  if (!flight) {
    return new NextResponse('Flight not found', { status: 404 });
  }

  // Sort by owner then by purchase_price desc
  const sorted = [...picks].sort((a, b) => {
    const cmp = a.owner_name.localeCompare(b.owner_name);
    if (cmp !== 0) return cmp;
    return b.purchase_price - a.purchase_price;
  });

  const headers = ['flight_number', 'tournament', 'owner', 'golfer', 'purchase_price', 'is_keeper', 'keeper_stage', 'bonus_points'];
  const rows = sorted.map((p) => [
    flight.flight_number,
    flight.primary_tournament_name,
    p.owner_name,
    p.golfer_name,
    p.purchase_price.toFixed(2),
    p.is_keeper ? 'true' : 'false',
    p.keeper_stage,
    p.bonus_points,
  ]);

  const escape = (v: any): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');

  const filename = `4loko-flight-${flight.flight_number}-${flight.primary_tournament_name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
