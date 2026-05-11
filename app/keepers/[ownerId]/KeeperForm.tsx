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
    <div>
      <div className="border-t-2 border-[color:var(--green-deep)]">
        {sortedRoster.map((g, i) => {
          const isSelected = selected === g.golfer_id;
          const { price } = computeKeeperPrice(g.was_keeper ? g.keeper_stage : 0);
          return (
            <label
              key={g.golfer_id}
              className={`flex items-center gap-4 p-4 cursor-pointer border-b border-[color:var(--green-forest)]/10 transition-colors ${
                isSelected ? 'bg-[color:var(--cream-deep)]' : 'hover:bg-[color:var(--cream-deep)]/40'
              }`}
            >
              <input
                type="radio"
                name="keeper"
                checked={isSelected}
                onChange={() => setSelected(g.golfer_id)}
                className="w-4 h-4 accent-[color:var(--green-deep)]"
              />
              <div className="flex-1">
                <div className="serif text-base text-[color:var(--green-deep)]">{g.full_name}</div>
                <div className="text-xs text-[color:var(--green-moss)] mt-0.5 tabular">
                  Drafted ${g.purchase_price}{g.was_keeper && ` · was keeper (stage ${g.keeper_stage})`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                  Keeper fee
                </div>
                <div className="serif text-lg text-[color:var(--green-deep)] tabular">${price}</div>
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-[color:var(--chicago-red)]">{error}</p>}

      <div className="mt-6 flex items-center gap-3 justify-end">
        {currentDeclaration && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="px-4 py-2 text-xs uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)] transition-colors disabled:opacity-50"
            style={{ letterSpacing: '0.18em' }}
          >
            Clear declaration
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={selected === null || isPending}
          className="px-6 py-3 bg-[color:var(--green-deep)] text-[color:var(--cream)] text-xs uppercase disabled:opacity-40 hover:bg-[color:var(--green-forest)] transition-colors"
          style={{ letterSpacing: '0.18em' }}
        >
          {isPending ? 'Saving…' : currentDeclaration ? 'Update keeper' : `Confirm ${keeperInfo ? `· $${keeperInfo.price}` : ''}`}
        </button>
      </div>
    </div>
  );
}