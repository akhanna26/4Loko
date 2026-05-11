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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--green-forest)]/15">
          {owners.map((o) => {
            const decl = declaredByOwner.get(o.id);
            const isDeclared = !!decl;
            return (
              <Link
                key={o.id}
                href={`/keepers/${o.id}`}
                className={`p-5 transition-all ${
                  isDeclared
                    ? 'bg-[color:var(--cream)] hover:bg-[color:var(--cream-deep)]'
                    : 'bg-[color:var(--cream)] hover:bg-[color:var(--cream-deep)] hover:shadow-sm'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="serif text-base text-[color:var(--green-deep)]">{o.name}</span>
                  {isDeclared ? (
                    <span className="text-[10px] uppercase text-[color:var(--gold-masters)]" style={{ letterSpacing: '0.18em' }}>
                      ✓ Declared
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase text-[color:var(--chicago-red)] flex items-center gap-1.5" style={{ letterSpacing: '0.18em' }}>
                      Choose keeper
                      <span aria-hidden="true">→</span>
                    </span>
                  )}
                </div>
                {isDeclared && (
                  <div className="text-xs text-[color:var(--green-moss)] mt-2 serif italic">
                    Keeping {decl.golfer_name} · ${decl.keeper_price}
                  </div>
                )}
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