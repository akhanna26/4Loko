import { getActiveOwners } from '../../lib/queries';
import { getFlight, getAllKeeperDeclarations } from '../../lib/draft';
import { getOwnerTheme } from '../../lib/owner-themes';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join('').toUpperCase();

export default async function KeepersIndex() {
  const owners = await getActiveOwners();
  const flight = await getFlight(2026, 2);
  if (!flight) return <main className="p-8">PGA Championship flight not found.</main>;
  const declarations = await getAllKeeperDeclarations(flight.id);
  const declaredByOwner = new Map(declarations.map((d) => [d.owner_id, d]));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      {/* HEADER */}
      <header className="mb-8 sm:mb-10">
        <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.32em' }}>
          The PGA Championship · Aronimink · May 14–17
        </p>
        <h1 className="serif text-3xl sm:text-5xl font-light leading-none text-[color:var(--green-deep)]" style={{ letterSpacing: '-0.02em' }}>
          Declare your keeper
        </h1>
        <p className="serif italic text-sm text-[color:var(--green-moss)] mt-3 max-w-xl">
          Each owner may keep one Masters golfer for the PGA Championship. Keeper fee goes to the year-long pot ($10 first keep, $20 second, $30 third).
        </p>
      </header>

      {/* OWNERS GRID */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
          <h2 className="serif text-2xl sm:text-3xl text-[color:var(--green-deep)] font-semibold">Owners</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            {declarations.length} of {owners.length} declared
          </span>
        </div>

        <div className="bg-white/80 border border-[color:var(--green-forest)]/15 p-3 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {owners.map((o) => {
              const decl = declaredByOwner.get(o.id);
              const isDeclared = !!decl;
              const theme = getOwnerTheme(o.name);
              return (
                <Link
                  key={o.id}
                  href={`/keepers/${o.id}`}
                  className="group flex items-center gap-3 p-3 sm:p-4 bg-[color:var(--cream-tint)]/60 border border-[color:var(--green-forest)]/10 hover:bg-[color:var(--cream-deep)]/50 transition-all"
                  style={{ borderLeft: `3px solid ${theme.primary}` }}
                >
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white flex items-center justify-center text-xs tabular font-semibold border-2 border-white shadow-sm shrink-0"
                    style={{
                      letterSpacing: '0.05em',
                      background: theme.primary,
                    }}
                  >
                    {initials(o.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="serif text-sm sm:text-base text-[color:var(--green-deep)] font-semibold truncate">
                      {o.name}
                    </div>
                    {isDeclared && decl ? (
                      <div className="text-[11px] sm:text-xs text-[color:var(--green-moss)] truncate">
                        Keeping {decl.golfer_name} · ${decl.keeper_price}
                      </div>
                    ) : (
                      <div className="text-[10px] sm:text-[11px] uppercase text-[color:var(--green-forest)]/50" style={{ letterSpacing: '0.14em' }}>
                        Not yet declared
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isDeclared ? (
                      <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--gold-masters)] font-semibold" style={{ letterSpacing: '0.18em' }}>
                        ✓
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--chicago-red)] flex items-center gap-1 transition-transform group-hover:translate-x-0.5" style={{ letterSpacing: '0.18em' }}>
                        Choose →
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <p className="text-[10px] uppercase text-[color:var(--green-moss)] text-center serif italic" style={{ letterSpacing: '0.05em' }}>
        Honor system · Click your name to declare or update
      </p>
    </main>
  );
}
