'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveKeeperDeclaration, clearKeeperDeclaration, computeKeeperPrice, RosterEntry } from '../../../lib/draft';

export default function KeeperForm({
  ownerId,
  flightId,
  roster,
  currentDeclaration,
}: {
  ownerId: number;
  flightId: number;
  roster: RosterEntry[];
  currentDeclaration: { golfer_id: number; keeper_price: number; keeper_stage: number } | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(currentDeclaration?.golfer_id ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sortedRoster = [...roster].sort((a, b) => b.purchase_price - a.purchase_price);

  const handleSave = async () => {
    setError(null);
    if (selected === null) return;
    const golfer = roster.find((g) => g.golfer_id === selected);
    if (!golfer) return;
    const { price, stage } = computeKeeperPrice(golfer.was_keeper ? golfer.keeper_stage : 0);
    startTransition(async () => {
      try {
        await saveKeeperDeclaration(flightId, ownerId, selected, price, stage);
        router.push('/keepers');
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? 'Save failed');
      }
    });
  };

  const handleClear = async () => {
    setError(null);
    startTransition(async () => {
      try {
        await clearKeeperDeclaration(flightId, ownerId);
        setSelected(null);
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? 'Clear failed');
      }
    });
  };

  const selectedGolfer = roster.find((g) => g.golfer_id === selected);
  const keeperInfo = selectedGolfer ? computeKeeperPrice(selectedGolfer.was_keeper ? selectedGolfer.keeper_stage : 0) : null;

  return (
    <div className="bg-[color:var(--cream-tint)]/70 border border-[color:var(--green-forest)]/15 shadow-sm overflow-hidden">
      <div className="bg-[color:var(--cream-deep)]/40 px-4 sm:px-5 py-3 border-b border-[color:var(--green-forest)]/15 flex items-baseline justify-between">
        <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold" style={{ letterSpacing: '0.18em' }}>
          Masters Roster
        </p>
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
          {sortedRoster.length} golfers
        </p>
      </div>

      <div>
        {sortedRoster.map((g, i) => {
          const isSelected = selected === g.golfer_id;
          const { price } = computeKeeperPrice(g.was_keeper ? g.keeper_stage : 0);
          return (
           <label
              key={g.golfer_id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer border-b border-[color:var(--green-forest)]/10 transition-all last:border-b-0 hover:shadow-sm"
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(253, 181, 21, 0.18) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(253, 181, 21, 0.18) 100%)'
                  : 'rgba(255, 255, 255, 0.6)',
                border: isSelected ? '1px solid rgba(253, 181, 21, 0.4)' : '1px solid rgba(42, 70, 54, 0.08)',
                borderLeft: isSelected ? '3px solid var(--gold-masters)' : '3px solid rgba(42, 70, 54, 0.08)',
                boxShadow: isSelected ? '0 2px 8px rgba(253, 181, 21, 0.15)' : 'none',
              }}
            >
              <input
                type="radio"
                name="keeper"
                checked={isSelected}
                onChange={() => setSelected(g.golfer_id)}
                className="w-4 h-4 accent-[color:var(--green-deep)] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="serif text-sm sm:text-base text-[color:var(--green-deep)] font-semibold truncate">
                  {g.full_name}
                </div>
                <div className="text-[10px] sm:text-xs text-[color:var(--green-moss)] mt-0.5 tabular">
                  Drafted ${g.purchase_price}{g.was_keeper && ` · was keeper (stage ${g.keeper_stage})`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.14em' }}>
                  Fee
                </div>
                <div className="serif text-base sm:text-lg text-[color:var(--green-deep)] tabular font-semibold">${price}</div>
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="px-4 sm:px-5 py-3 border-t border-[color:var(--green-forest)]/15 bg-[color:var(--chicago-red)]/5">
          <p className="text-xs sm:text-sm text-[color:var(--chicago-red)] serif italic">{error}</p>
        </div>
      )}

      <div className="bg-[color:var(--cream-deep)]/40 px-4 sm:px-5 py-3 sm:py-4 border-t border-[color:var(--green-forest)]/15 flex items-center gap-3 justify-end flex-wrap">
        {currentDeclaration && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)] transition-colors disabled:opacity-50"
            style={{ letterSpacing: '0.18em' }}
          >
            Clear
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={selected === null || isPending}
          className="group px-5 sm:px-6 py-2.5 sm:py-3 text-white text-[10px] sm:text-xs uppercase disabled:opacity-40 transition-all flex items-center gap-2"
          style={{
            letterSpacing: '0.18em',
            background: selected === null
              ? 'var(--green-moss)'
              : 'linear-gradient(135deg, var(--green-deep) 0%, var(--green-forest) 100%)',
            border: '1px solid var(--green-deep)',
            boxShadow: selected === null ? 'none' : '0 2px 12px rgba(26, 48, 34, 0.3)',
          }}
        >
          {isPending ? 'Saving…' : currentDeclaration ? 'Update keeper' : `Confirm ${keeperInfo ? `· $${keeperInfo.price}` : ''}`}
          {!isPending && <span className="transition-transform group-hover:translate-x-0.5">→</span>}
        </button>
      </div>
    </div>
  );
}
