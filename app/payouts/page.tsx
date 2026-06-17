import { getMajorPayoutCard, getOwnerBalances, getKeeperFeesByOwner, MajorPayoutCard, OwnerKeeperFees } from '../../lib/payouts';
import PayoutToggle, { MultiPayoutToggle, KeeperFeeToggle } from './PayoutToggle';

export const dynamic = 'force-dynamic';

const SEASON = 2026;

const MAJORS = [
  { id: 2, short: 'Masters' },
  { id: 4, short: 'PGA' },
  { id: 6, short: 'U.S. Open' },
  { id: 8, short: 'The Open' },
];

export default async function PayoutsPage() {
  const [cards, balances, keeperFees] = await Promise.all([
    Promise.all(MAJORS.map((m) => getMajorPayoutCard(SEASON, m.id))),
    getOwnerBalances(SEASON),
    getKeeperFeesByOwner(SEASON),
  ]);
  const validCards = cards.filter((c): c is MajorPayoutCard => c !== null);

  // Total keeper fees across all owners (year-long pot contribution)
  const totalKeeperFees = keeperFees.reduce((sum, o) => sum + o.total, 0);
  const totalKeeperFeesPaid = keeperFees.filter((o) => o.is_paid).reduce((sum, o) => sum + o.total, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.28em' }}>
          The 2026 Season
        </p>
        <h1 className="serif text-3xl sm:text-5xl font-semibold tracking-tight text-[color:var(--green-deep)] mt-3 leading-none">
          Payouts
        </h1>
        <div className="divider-rule mt-5 mb-3 max-w-[160px] mx-auto" />
        <p className="text-xs sm:text-sm text-[color:var(--green-moss)] italic serif">
          Treasurer's ledger. Tap a checkbox when money changes hands.
        </p>
      </div>

      {/* Keeper Fees (NEW, top section) */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
          <h2 className="serif text-xl text-[color:var(--green-deep)] font-semibold">Keeper Fees</h2>
          <div className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.14em' }}>
            ${totalKeeperFeesPaid.toFixed(0)} / ${totalKeeperFees.toFixed(0)} collected · flows to year-long pot
          </div>
        </div>
        <div className="space-y-3">
          {keeperFees.map((o) => (
            <KeeperFeeCard key={o.owner_id} owner={o} />
          ))}
        </div>
        <p className="text-[10px] sm:text-xs text-[color:var(--green-moss)] serif italic mt-4 text-center">
          Stage 1 = $10, stage 2 = $20, stage 3 = $30 for consecutive re-keeps of the same golfer. Resets when keeper changes.
        </p>
      </section>

      {/* Per-Major */}
      <section className="mb-12">
        <h2 className="serif text-xl text-[color:var(--green-deep)] mb-4 font-semibold">Per-Major</h2>
        <div className="space-y-5">
          {validCards.map((card) => (
            <MajorCard key={card.tournament_id} card={card} />
          ))}
        </div>
      </section>

      {/* Owner Net Balance (collapsed) */}
      <section className="mb-12">
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center gap-2 text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] transition-colors" style={{ letterSpacing: '0.18em' }}>
            <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2 L8 6 L4 10" />
            </svg>
            <span>Owner Net Balance</span>
          </summary>
          <div className="mt-4 overflow-x-auto border shadow-sm" style={{ background: 'white', borderColor: 'rgba(14, 42, 74, 0.18)' }}>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr style={{ background: 'var(--cream-deep)', borderBottom: '1px solid rgba(42,70,54,0.1)' }}>
                  <th className="text-left px-3 py-2 text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Owner</th>
                  <th className="text-right px-3 py-2 text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Paid In</th>
                  <th className="text-right px-3 py-2 text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Of Owed</th>
                  <th className="text-right px-3 py-2 text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Received</th>
                  <th className="text-right px-3 py-2 text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Of Winnings</th>
                  <th className="text-right px-3 py-2 text-[9px] uppercase text-[color:var(--green-deep)] font-semibold" style={{ letterSpacing: '0.16em' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b, i) => (
                  <tr key={b.owner_id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(42,70,54,0.08)' }}>
                    <td className="px-3 py-2 serif text-sm text-[color:var(--green-deep)]">{b.owner_name}</td>
                    <td className="text-right px-3 py-2 tabular text-sm">${b.total_paid_in.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-xs text-[color:var(--green-moss)]">${b.total_owed.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-sm">${b.total_winnings_received.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-xs text-[color:var(--green-moss)]">${b.total_winnings_owed.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-sm font-semibold" style={{ color: b.net_balance > 0 ? 'var(--green-deep)' : b.net_balance < 0 ? 'var(--chicago-red)' : 'var(--green-moss)' }}>
                      {b.net_balance > 0 ? `+$${b.net_balance.toFixed(0)}` : b.net_balance < 0 ? `-$${Math.abs(b.net_balance).toFixed(0)}` : '$0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] sm:text-xs text-[color:var(--green-moss)] serif italic mt-3 text-center">
            Year-long buy-ins and keeper fees not yet included in net balance.
          </p>
        </details>
      </section>
    </main>
  );
}

function KeeperFeeCard({ owner }: { owner: OwnerKeeperFees }) {
  const hasLines = owner.lines.length > 0;
  return (
    <div
      className="border shadow-sm overflow-hidden"
      style={{
        background: 'white',
        borderColor: 'rgba(14, 42, 74, 0.18)',
      }}
    >
      <div
        className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-3 flex-wrap"
        style={{ background: 'var(--cream-deep)', borderBottom: '1px solid rgba(42,70,54,0.1)' }}
      >
        <h3 className="serif text-base text-[color:var(--green-deep)] font-semibold">
          {owner.owner_name}
        </h3>
        <div className="flex items-center gap-4">
          <span className="tabular text-sm font-semibold text-[color:var(--green-deep)]">
            ${owner.total.toFixed(0)}
          </span>
          {owner.payment_id !== null && hasLines && (
            <KeeperFeeToggle paymentId={owner.payment_id} initialPaid={owner.is_paid} />
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {hasLines ? (
          <>
            <div className="space-y-1.5">
              {owner.lines.map((line, i) => (
                <div key={`${line.flight_id}-${i}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="serif text-sm text-[color:var(--green-deep)] truncate">{line.golfer_name}</span>
                    <span className="text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.14em' }}>
                      {line.tournament_name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-[10px] text-[color:var(--green-moss)] tabular">stage {line.keeper_stage}</span>
                    <span className="tabular text-sm font-semibold text-[color:var(--green-deep)] w-10 text-right">${line.keeper_price.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[color:var(--green-forest)]/10 flex items-baseline justify-between">
              <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.14em' }}>
                {owner.lines.map((l) => `$${l.keeper_price.toFixed(0)}`).join(' + ')}
              </span>
              <span className="tabular text-sm font-semibold text-[color:var(--green-deep)]">= ${owner.total.toFixed(0)}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-[color:var(--green-moss)] serif italic text-center py-1">
            No keepers declared yet.
          </p>
        )}
      </div>
    </div>
  );
}

function MajorCard({ card }: { card: MajorPayoutCard }) {
  const isFinal = card.status === 'final';
  const isUpcoming = card.status === 'upcoming';
  const placeLabels = ['1st', '2nd', '3rd'];

  const ownerBuyins = card.buyins.map((b) => {
    const winner = card.winner_pool_buyins.find((w) => w.owner_id === b.owner_id);
    const totalAmount = Math.abs(b.amount) + (winner ? Math.abs(winner.amount) : 0);
    const ledgerIds = winner ? [b.id, winner.id] : [b.id];
    const bothPaid = winner ? b.is_paid && winner.is_paid : b.is_paid;
    return {
      owner_id: b.owner_id,
      owner_name: b.owner_name,
      ledgerIds,
      totalAmount,
      bothPaid,
    };
  });

  const totalPaid = ownerBuyins.filter((o) => o.bothPaid).length;
  const totalOwners = ownerBuyins.length;
  const perOwnerTotal = card.buyin_per_owner + card.winner_pool_per_owner;

  return (
    <div
      className="border shadow-sm overflow-hidden"
      style={{
        background: 'white',
        borderColor: 'rgba(14, 42, 74, 0.18)',
        opacity: isUpcoming ? 0.7 : 1,
      }}
    >
      <div
        className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-3 flex-wrap"
        style={{ background: 'var(--cream-deep)', borderBottom: '1px solid rgba(42,70,54,0.1)' }}
      >
        <div>
          <h3 className="serif text-base sm:text-lg text-[color:var(--green-deep)] font-semibold">
            {card.tournament_name}
          </h3>
          <p className="text-[9px] uppercase text-[color:var(--green-moss)] mt-0.5" style={{ letterSpacing: '0.18em' }}>
            {card.status}
          </p>
        </div>
        <div className="text-right text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.14em' }}>
          {totalPaid} / {totalOwners} paid in
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <div className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>
              Buy-in pool
            </div>
            <div className="tabular text-xl serif font-semibold text-[color:var(--green-deep)]">
              ${card.buyin_pool}
              <span className="text-xs text-[color:var(--green-moss)] font-normal"> ({totalOwners} × ${card.buyin_per_owner})</span>
            </div>
          </div>

          {isFinal && card.place_payouts.length > 0 && (
            <div className="mb-4">
              <div className="text-[9px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.16em' }}>
                Top 3 payouts
              </div>
              <div className="space-y-1.5">
                {card.place_payouts.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] uppercase text-[color:var(--green-moss)] tabular shrink-0" style={{ letterSpacing: '0.14em', width: '24px' }}>
                        {placeLabels[idx] ?? `${idx + 1}`}
                      </span>
                      <span className="serif text-sm text-[color:var(--green-deep)] truncate">{p.owner_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="tabular text-sm font-semibold text-[color:var(--green-deep)]">${p.amount.toFixed(0)}</span>
                      <PayoutToggle ledgerId={p.id} initialPaid={p.is_paid} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[9px] uppercase text-[color:var(--green-moss)] mb-1" style={{ letterSpacing: '0.16em' }}>
              Major-winner pot
            </div>
            <div className="tabular text-sm serif text-[color:var(--green-deep)] mb-2">
              ${card.winner_pool_total}
              <span className="text-xs text-[color:var(--green-moss)]"> ({totalOwners} × ${card.winner_pool_per_owner})</span>
            </div>
            {card.winner_payout ? (
              <div className="flex items-center justify-between gap-3">
                <div className="serif text-sm text-[color:var(--green-deep)] truncate">
                  {card.winner_payout.owner_name}
                  <span className="text-[10px] text-[color:var(--green-moss)] italic ml-1.5">
                    {card.winner_payout.note ? `· ${card.winner_payout.note.replace(/^Owned /, '').replace(/, the .+$/, '')}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="tabular text-sm font-semibold text-[color:var(--green-deep)]">${card.winner_payout.amount.toFixed(0)}</span>
                  <PayoutToggle ledgerId={card.winner_payout.id} initialPaid={card.winner_payout.is_paid} />
                </div>
              </div>
            ) : isUpcoming ? null : (
              <div className="text-[10px] text-[color:var(--green-moss)] italic serif">
                Awaiting champion identification
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.16em' }}>
            Owners paid in
            <span className="ml-1 text-[color:var(--green-deep)]/60 normal-case tracking-normal italic font-normal" style={{ letterSpacing: '0.04em' }}>
              · ${perOwnerTotal} each (${card.buyin_per_owner} buy-in + ${card.winner_pool_per_owner} pot)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {ownerBuyins.map((o) => (
              <div key={o.owner_id} className="flex items-center gap-2 min-w-0">
                <MultiPayoutToggle ledgerIds={o.ledgerIds} initialAllPaid={o.bothPaid} />
                <span className="serif text-xs text-[color:var(--green-deep)] truncate flex-1" style={{ opacity: o.bothPaid ? 1 : 0.7 }}>
                  {o.owner_name}
                </span>
                <span className="tabular text-[10px] text-[color:var(--green-moss)] shrink-0">
                  ${o.totalAmount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
