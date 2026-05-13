'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveKeeperDeclaration, clearKeeperDeclaration, computeKeeperPrice, RosterEntry } from '../../../lib/draft';

import { getOwnerTheme } from '../../../lib/owner-themes';

export default function KeeperForm({
  ownerId,
  ownerName,
  flightId,
  roster,
  currentDeclaration,
}: {
  ownerId: number;
  ownerName: string;
  flightId: number;
  roster: RosterEntry[];
  currentDeclaration: { golfer_id: number; keeper_price: number; keeper_stage: number } | null;
}) {
  const theme = getOwnerTheme(ownerName);
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
    <div className="border-2 shadow-sm overflow-hidden"
      style={{
        background: 'var(--cream-deep)',
        borderColor: 'rgba(14, 42, 74, 0.2)',
      }}>
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
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer transition-all last:border-b-0 hover:shadow-md"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${theme.primary}15 0%, rgba(255, 255, 255, 0.98) 50%, ${theme.primary}15 100%)`
                  : 'white',
                margin: '6px',
                border: isSelected ? `1px solid ${theme.primary}60` : '1px solid rgba(14, 42, 74, 0.18)',
                borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid rgba(14, 42, 74, 0.18)',
                boxShadow: isSelected ? `0 2px 8px ${theme.primary}25` : '0 1px 3px rgba(14, 42, 74, 0.06)',
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
                  Keeper fee: <span className="text-[color:var(--green-deep)] font-semibold">${price}</span>{g.was_keeper && ` · stage ${g.keeper_stage} keep`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.14em' }}>
                  Drafted
                </div>
                <div className="serif text-base sm:text-lg text-[color:var(--green-moss)] tabular">${g.purchase_price}</div>
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
              : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
            border: `1px solid ${theme.primary}`,
            boxShadow: selected === null ? 'none' : `0 2px 12px ${theme.primary}40`,
          }}
        >
          {isPending ? 'Saving…' : currentDeclaration ? 'Update keeper' : `Confirm ${keeperInfo ? `· $${keeperInfo.price}` : ''}`}
          {!isPending && <span className="transition-transform group-hover:translate-x-0.5">→</span>}
        </button>
      </div>
    </div>
  );
}
