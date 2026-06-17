import { getMajorPayoutCard, getOwnerBalances, MajorPayoutCard, LedgerEntry } from '../../lib/payouts';
import PayoutToggle from './PayoutToggle';

export const dynamic = 'force-dynamic';

const SEASON = 2026;

// All four majors, in season order. Memorial/etc are elevated events - no payouts.
const MAJORS = [
  { id: 2, short: 'Masters' },
  { id: 4, short: 'PGA' },
  { id: 6, short: 'U.S. Open' },
  { id: 8, short: 'The Open' },
];

export default async function PayoutsPage() {
  const cards = await Promise.all(
    MAJORS.map((m) => getMajorPayoutCard(SEASON, m.id))
  );
  const validCards = cards.filter((c): c is MajorPayoutCard => c !== null);
  const balances = await getOwnerBalances(SEASON);

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

      {/* Major Payouts */}
      <section className="mb-12">
        <h2 className="serif text-xl text-[color:var(--green-deep)] mb-4 font-semibold">Per-Major</h2>
        <div className="space-y-5">
          {validCards.map((card) => (
            <MajorCard key={card.tournament_id} card={card} />
          ))}
        </div>
      </section>

      {/* Owner Balances */}
      <section className="mb-12">
        <h2 className="serif text-xl text-[color:var(--green-deep)] mb-4 font-semibold">Owner Net Balance</h2>
        <div
          className="overflow-x-auto border shadow-sm"
          style={{ background: 'white', borderColor: 'rgba(14, 42, 74, 0.18)' }}
        >
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
              {balances.map((b, i) => {
                const isOutstanding = b.total_paid_in < b.total_owed || b.total_winnings_received < b.total_winnings_owed;
                return (
                  <tr key={b.owner_id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(42,70,54,0.08)' }}>
                    <td className="px-3 py-2 serif text-sm text-[color:var(--green-deep)]">{b.owner_name}</td>
                    <td className="text-right px-3 py-2 tabular text-sm">${b.total_paid_in.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-xs text-[color:var(--green-moss)]">${b.total_owed.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-sm">${b.total_winnings_received.toFixed(0)}</td>
                    <td className="text-right px-3 py-2 tabular text-xs text-[color:var(--green-moss)]">${b.total_winnings_owed.toFixed(0)}</td>
                    <td
                      className="text-right px-3 py-2 tabular text-sm font-semibold"
                      style={{ color: b.net_balance > 0 ? 'var(--green-deep)' : b.net_balance < 0 ? 'var(--chicago-red)' : 'var(--green-moss)' }}
                    >
                      {b.net_balance > 0 ? `+$${b.net_balance.toFixed(0)}` : b.net_balance < 0 ? `-$${Math.abs(b.net_balance).toFixed(0)}` : '$0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] sm:text-xs text-[color:var(--green-moss)] serif italic mt-3 text-center">
          Net = winnings received minus money paid in. Year-long and keeper fees not yet included; coming soon.
        </p>
      </section>
    </main>
  );
}

function MajorCard({ card }: { card: MajorPayoutCard }) {
  const isFinal = card.status === 'final';
  const isUpcoming = card.status === 'upcoming';
  const placeLabels = ['1st', '2nd', '3rd'];

  const totalBuyinsPaid = card.buyins.filter((b) => b.is_paid).length + card.winner_pool_buyins.filter((b) => b.is_paid).length;
  const totalBuyinsExpected = card.buyins.length + card.winner_pool_buyins.length;

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
          {totalBuyinsPaid} / {totalBuyinsExpected} paid in
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Pool + Payouts */}
        <div>
          <div className="mb-4">
            <div className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>
              Buy-in pool
            </div>
            <div className="tabular text-xl serif font-semibold text-[color:var(--green-deep)]">
              ${card.buyin_pool} <span className="text-xs text-[color:var(--green-moss)] font-normal">({card.buyins.length} × ${card.buyin_per_owner})</span>
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
              ${card.winner_pool_total} <span className="text-xs text-[color:var(--green-moss)]">({card.winner_pool_buyins.length} × ${card.winner_pool_per_owner})</span>
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

        {/* RIGHT: Buy-in checkboxes */}
        <div>
          <div className="text-[9px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.16em' }}>
            Owners paid in
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {card.buyins.map((b) => {
              // Find matching winner pool entry for same owner
              const winnerBuyin = card.winner_pool_buyins.find((w) => w.owner_id === b.owner_id);
              const both = winnerBuyin ? b.is_paid && winnerBuyin.is_paid : b.is_paid;
              return (
                <BuyinRow
                  key={b.owner_id}
                  ownerName={b.owner_name}
                  buyinId={b.id}
                  buyinPaid={b.is_paid}
                  winnerId={winnerBuyin?.id}
                  winnerPaid={winnerBuyin?.is_paid ?? false}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyinRow({
  ownerName,
  buyinId,
  buyinPaid,
  winnerId,
  winnerPaid,
}: {
  ownerName: string;
  buyinId: number;
  buyinPaid: boolean;
  winnerId?: number;
  winnerPaid: boolean;
}) {
  const both = winnerId !== undefined ? buyinPaid && winnerPaid : buyinPaid;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <PayoutToggle ledgerId={buyinId} initialPaid={buyinPaid} />
      {winnerId !== undefined && <PayoutToggle ledgerId={winnerId} initialPaid={winnerPaid} />}
      <span
        className="serif text-xs text-[color:var(--green-deep)] truncate"
        style={{ opacity: both ? 1 : 0.65 }}
      >
        {ownerName}
      </span>
    </div>
  );
}
