import { getOwnerTheme } from '../../lib/owner-themes';
import { getActiveOwners } from '../../lib/queries';
import { getFlight, getAllKeeperDeclarations } from '../../lib/draft';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function KeepersIndex() {
  const owners = await getActiveOwners();
  const flight = await getFlight(2026, 2);
  if (!flight) return <main className="p-8">PGA Championship flight not found.</main>;

  const declarations = await getAllKeeperDeclarations(flight.id);
  const declaredByOwner = new Map(declarations.map((d) => [d.owner_id, d]));

  return (
    <main className="max-w-5xl mx-auto px-6 pt-10 pb-16">
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
          The PGA Championship · Aronimink · May 14–17
        </p>
      </div>

      <section className="mb-10 text-center">
        <h2 className="serif text-3xl font-semibold tracking-tight text-[color:var(--green-deep)]">
          Declare your keeper
        </h2>
        <p className="text-sm text-[color:var(--green-moss)] italic serif mt-3 max-w-md mx-auto">
          Each owner may keep one Masters golfer for the PGA Championship. The keeper fee goes to the year-long pot.
        </p>
      </section>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="serif text-xl text-[color:var(--green-deep)]">The Field</h3>
          <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
            {declarations.length} of {owners.length} declared
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {owners.map((o) => {
            const decl = declaredByOwner.get(o.id);
            const isDeclared = !!decl;
            const theme = getOwnerTheme(o.name);
            const initials = o.name.split(/\s+/).map((n: string) => n[0]).filter((c: string) => /[A-Za-z]/.test(c)).slice(0, 2).join('').toUpperCase();
            return (
              <Link
                key={o.id}
                href={`/keepers/${o.id}`}
                className="group flex items-center gap-3 p-3 sm:p-4 transition-all hover:shadow-md"
                style={{
                  background: isDeclared
                    ? `linear-gradient(135deg, ${theme.primary}15 0%, white 50%, ${theme.primary}15 100%)`
                    : 'white',
                  border: `1px solid ${theme.primary}30`,
                  borderLeft: `3px solid ${theme.primary}`,
                  boxShadow: '0 1px 4px rgba(14, 42, 74, 0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center text-xs tabular font-semibold shadow-sm shrink-0"
                  style={{
                    letterSpacing: '0.05em',
                    background: theme.primary,
                    border: `2px solid ${theme.secondary}`,
                  }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="serif text-sm sm:text-base text-[color:var(--green-deep)] font-semibold truncate">{o.name}</span>
                    {isDeclared ? (
                      <span className="text-[9px] sm:text-[10px] uppercase shrink-0" style={{ letterSpacing: '0.18em', color: theme.primary }}>
                        ✓ Declared
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--chicago-red)] flex items-center gap-1 shrink-0" style={{ letterSpacing: '0.18em' }}>
                        Choose <span aria-hidden="true">→</span>
                      </span>
                    )}
                  </div>
                  {isDeclared && (
                    <div className="text-[10px] sm:text-xs text-[color:var(--green-moss)] serif italic truncate">
                      Keeping {decl.golfer_name} · ${decl.keeper_price}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="text-center text-xs text-[color:var(--green-moss)] serif italic">
        Honor system. Click your name to declare or update.
      </section>
    </main>
  );
}
