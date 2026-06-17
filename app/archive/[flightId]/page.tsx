import { getFlightPicks, getFlightDraftHistory } from '../../../lib/archive';
import { getOwnerTheme } from '../../../lib/owner-themes';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function FlightArchivePage({ params }: { params: Promise<{ flightId: string }> }) {
  const { flightId: flightIdStr } = await params;
  const flightId = parseInt(flightIdStr, 10);
  if (isNaN(flightId)) {
    return (
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Invalid flight ID.</p>
      </main>
    );
  }

  const [{ picks, flight }, draftHistory] = await Promise.all([
    getFlightPicks(flightId),
    getFlightDraftHistory(flightId),
  ]);

  if (!flight) {
    return (
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Flight not found.</p>
        <Link href="/archive" className="text-sm text-[color:var(--green-moss)] underline mt-3 block">
          ← Back to archive
        </Link>
      </main>
    );
  }

  const byOwner = new Map<number, { owner_id: number; owner_name: string; picks: typeof picks }>();
  for (const p of picks) {
    if (!byOwner.has(p.owner_id)) {
      byOwner.set(p.owner_id, { owner_id: p.owner_id, owner_name: p.owner_name, picks: [] });
    }
    byOwner.get(p.owner_id)!.picks.push(p);
  }
  const owners = [...byOwner.values()]
    .map((o) => ({ ...o, picks: [...o.picks].sort((a, b) => b.purchase_price - a.purchase_price) }))
    .sort((a, b) => a.owner_name.localeCompare(b.owner_name));

  const totalsByOwner = new Map<number, { spent: number; points: number }>();
  for (const o of owners) {
    const spent = o.picks.reduce((sum, p) => sum + p.purchase_price, 0);
    const points = o.picks.reduce((sum, p) => sum + p.bonus_points, 0);
    totalsByOwner.set(o.owner_id, { spent, points });
  }

  const ownersByPoints = [...owners].sort((a, b) =>
    (totalsByOwner.get(b.owner_id)!.points - totalsByOwner.get(a.owner_id)!.points)
  );

  const maxPicks = Math.max(...owners.map((o) => o.picks.length), 1);

  // Split draft history into keepers (locked-in at the start) and auction picks (chronological)
  const keepers = draftHistory.filter((b) => b.is_keeper).sort((a, b) => a.pick_order - b.pick_order);
  const auctionPicks = draftHistory.filter((b) => !b.is_keeper);

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-8 pb-16">
      <div className="text-center mb-8">
        <Link href="/archive" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)]" style={{ letterSpacing: '0.18em' }}>
          ← Archive
        </Link>
        <p className="text-[10px] uppercase text-[color:var(--green-moss)] mt-3" style={{ letterSpacing: '0.28em' }}>
          Flight {flight.flight_number} · Final
        </p>
        <h1 className="serif text-3xl sm:text-5xl font-semibold tracking-tight text-[color:var(--green-deep)] mt-2 leading-none">
          {flight.primary_tournament_name}
        </h1>
        <div className="divider-rule mt-5 mb-3 max-w-[160px] mx-auto" />
        {flight.champion_name && (
          <p className="text-xs sm:text-sm text-[color:var(--green-moss)] italic serif">
            Champion: <span className="text-[color:var(--green-deep)] font-semibold not-italic">{flight.champion_name}</span>
          </p>
        )}
      </div>

      {/* Export bar */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="serif text-xl text-[color:var(--green-deep)] font-semibold">Final Rosters</h2>
        <a
          href={`/api/archive/${flight.flight_id}/csv`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase text-[color:var(--green-deep)] border border-[color:var(--green-forest)]/30 hover:bg-[color:var(--cream-deep)] transition-colors"
          style={{ letterSpacing: '0.18em' }}
          download
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 1 V8 M3 5 L6 8 L9 5 M2 10 H10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </a>
      </div>

      {/* Grid view */}
      <section className="mb-10 overflow-x-auto">
        <div className="min-w-[700px] sm:min-w-[900px]" style={{ background: 'white', border: '1px solid rgba(14, 42, 74, 0.18)' }}>
          <div className="grid" style={{ gridTemplateColumns: `60px repeat(${owners.length}, minmax(110px, 1fr))`, borderBottom: '2px solid rgba(42,70,54,0.2)', background: 'var(--cream-deep)' }}>
            <div className="px-2 py-3 text-[9px] uppercase text-[color:var(--green-moss)] tabular self-center text-center" style={{ letterSpacing: '0.14em' }}>
              Pick
            </div>
            {owners.map((o) => {
              const theme = getOwnerTheme(o.owner_name);
              return (
                <div key={o.owner_id} className="px-2 py-3 text-center" style={{ borderLeft: '1px solid rgba(42,70,54,0.08)' }}>
                  <div
                    className="text-[10px] uppercase font-semibold truncate"
                    style={{ letterSpacing: '0.1em', color: theme.primary }}
                    title={o.owner_name}
                  >
                    {o.owner_name.split(' ').map((n: string, i: number) => i === 0 ? n[0] + '.' : n).join(' ')}
                  </div>
                </div>
              );
            })}
          </div>

          {Array.from({ length: maxPicks }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid"
              style={{
                gridTemplateColumns: `60px repeat(${owners.length}, minmax(110px, 1fr))`,
                borderBottom: rowIdx === maxPicks - 1 ? 'none' : '1px solid rgba(42,70,54,0.06)',
              }}
            >
              <div className="px-2 py-2 text-[10px] text-[color:var(--green-moss)] tabular text-center self-center">
                {rowIdx + 1}
              </div>
              {owners.map((o) => {
                const p = o.picks[rowIdx];
                if (!p) return <div key={o.owner_id} style={{ borderLeft: '1px solid rgba(42,70,54,0.06)' }} />;
                return (
                  <div
                    key={o.owner_id}
                    className="px-2 py-2 text-center"
                    style={{
                      borderLeft: '1px solid rgba(42,70,54,0.06)',
                      background: p.is_keeper ? 'rgba(212,175,55,0.07)' : 'transparent',
                    }}
                  >
                    <div className="serif text-[11px] text-[color:var(--green-deep)] truncate leading-tight" title={p.golfer_name}>
                      {p.golfer_name}
                    </div>
                    <div className="text-[10px] tabular text-[color:var(--green-moss)] mt-0.5">
                      ${p.purchase_price.toFixed(0)}
                      {p.is_keeper && <span className="ml-1 text-[8px]" style={{ color: 'var(--gold-masters)' }}>K{p.keeper_stage}</span>}
                      {p.bonus_points > 0 && <span className="ml-1 text-[color:var(--green-deep)] font-semibold">+{p.bonus_points}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div
            className="grid"
            style={{
              gridTemplateColumns: `60px repeat(${owners.length}, minmax(110px, 1fr))`,
              borderTop: '2px solid rgba(42,70,54,0.2)',
              background: 'var(--cream-deep)',
            }}
          >
            <div className="px-2 py-2 text-[9px] uppercase text-[color:var(--green-moss)] self-center text-center" style={{ letterSpacing: '0.14em' }}>
              Total
            </div>
            {owners.map((o) => {
              const t = totalsByOwner.get(o.owner_id)!;
              return (
                <div key={o.owner_id} className="px-2 py-2 text-center" style={{ borderLeft: '1px solid rgba(42,70,54,0.08)' }}>
                  <div className="text-[10px] tabular text-[color:var(--green-moss)]">${t.spent.toFixed(0)}</div>
                  <div className="text-[11px] tabular text-[color:var(--green-deep)] font-semibold">+{t.points} pts</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Standings */}
      <section className="mb-10">
        <h2 className="serif text-xl text-[color:var(--green-deep)] mb-3 font-semibold">Standings</h2>
        <div style={{ background: 'white', border: '1px solid rgba(14, 42, 74, 0.18)' }}>
          {ownersByPoints.map((o, i) => {
            const totals = totalsByOwner.get(o.owner_id)!;
            const theme = getOwnerTheme(o.owner_name);
            return (
              <div
                key={o.owner_id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  borderBottom: i === ownersByPoints.length - 1 ? 'none' : '1px solid rgba(42,70,54,0.08)',
                  borderLeft: `3px solid ${theme.primary}`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] uppercase text-[color:var(--green-moss)] tabular" style={{ letterSpacing: '0.14em', width: '24px' }}>
                    {i + 1}
                  </span>
                  <span className="serif text-sm text-[color:var(--green-deep)] truncate">{o.owner_name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] text-[color:var(--green-moss)] tabular">${totals.spent.toFixed(0)}</span>
                  <span className="serif text-sm font-semibold text-[color:var(--green-deep)] tabular">+{totals.points}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Draft History */}
      <section className="mb-10">
        <h2 className="serif text-xl text-[color:var(--green-deep)] mb-3 font-semibold">Draft History</h2>

        {keepers.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.18em' }}>
              Keepers
            </h3>
            <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}>
              {keepers.map((k, i) => {
                const theme = getOwnerTheme(k.owner_name);
                return (
                  <div
                    key={k.bid_id}
                    className="flex items-center justify-between px-3 py-2 gap-3"
                    style={{
                      borderBottom: i === keepers.length - 1 ? 'none' : '1px solid rgba(212,175,55,0.18)',
                      borderLeft: `3px solid ${theme.primary}`,
                    }}
                  >
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="serif text-sm text-[color:var(--green-deep)] font-semibold truncate">{k.owner_name}</span>
                      <span className="serif text-sm text-[color:var(--green-deep)] truncate">{k.golfer_name}</span>
                    </div>
                    <span className="tabular text-sm font-semibold text-[color:var(--green-deep)] shrink-0">${k.amount.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h3 className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.18em' }}>
          Auction picks (in order)
        </h3>
        <div style={{ background: 'white', border: '1px solid rgba(14, 42, 74, 0.18)' }}>
          {auctionPicks.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[color:var(--green-moss)] serif italic">
              No auction picks recorded for this flight.
            </p>
          ) : (
            auctionPicks.map((b, i) => {
              const theme = getOwnerTheme(b.owner_name);
              return (
                <div
                  key={b.bid_id}
                  className="flex items-center justify-between px-3 py-2 gap-3"
                  style={{
                    borderBottom: i === auctionPicks.length - 1 ? 'none' : '1px solid rgba(42,70,54,0.06)',
                    borderLeft: `3px solid ${theme.primary}`,
                  }}
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="text-[10px] uppercase text-[color:var(--green-moss)] tabular shrink-0" style={{ letterSpacing: '0.14em', width: '20px' }}>
                      {i + 1}
                    </span>
                    <span className="serif text-sm text-[color:var(--green-deep)] font-semibold truncate">{b.owner_name}</span>
                    <span className="serif text-sm text-[color:var(--green-deep)] truncate">{b.golfer_name}</span>
                  </div>
                  <span className="tabular text-sm font-semibold text-[color:var(--green-deep)] shrink-0">${b.amount.toFixed(0)}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
