import { getActiveOwners } from '../../../lib/queries';
import { getFlight, getOwnerPrevRoster, getKeeperDeclaration } from '../../../lib/draft';
import KeeperForm from './KeeperForm';

export const dynamic = 'force-dynamic';

export default async function OwnerKeeperPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId: ownerIdStr } = await params;
  const ownerId = parseInt(ownerIdStr, 10);

  if (isNaN(ownerId)) {
    return (
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Invalid owner ID: {ownerIdStr}</p>
      </main>
    );
  }

  const owners = await getActiveOwners();
  const owner = owners.find((o) => o.id === ownerId);
  if (!owner) {
    return (
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Owner not found.</p>
        <p className="text-sm text-[color:var(--green-moss)] mt-2">
          Looking for ID {ownerId}. Available IDs: {owners.map((o) => `${o.id}=${o.name}`).join(', ')}
        </p>
      </main>
    );
  }

  const pgaFlight = await getFlight(2026, 2);
  const mastersFlight = await getFlight(2026, 1);
  if (!pgaFlight || !mastersFlight) return <main className="p-8">Flights not configured.</main>;

  const roster = await getOwnerPrevRoster(ownerId, mastersFlight.id);
  const currentDecl = await getKeeperDeclaration(pgaFlight.id, ownerId);

  return (
    <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
          PGA Championship Keeper · {owner.name}
        </p>
      </div>

      <section className="mb-10 text-center">
        <h1 className="serif text-5xl font-semibold tracking-tight text-[color:var(--green-deep)] leading-none">
          {owner.name}
        </h1>
        <div className="divider-rule mt-5 mb-3 max-w-[160px] mx-auto" />
        <p className="text-sm text-[color:var(--green-moss)] italic serif">
          Choose one Masters golfer to keep, or none.
        </p>
      </section>

      {roster.length === 0 ? (
        <p className="text-center text-sm text-[color:var(--green-moss)] serif italic">
          No Masters roster found for {owner.name}. Cannot select a keeper.
        </p>
      ) : (
        <KeeperForm
          ownerId={ownerId}
          flightId={pgaFlight.id}
          roster={roster}
          currentDeclaration={currentDecl ? {
            golfer_id: currentDecl.golfer_id,
            keeper_price: currentDecl.keeper_price,
            keeper_stage: currentDecl.keeper_stage,
          } : null}
        />
      )}
    </main>
  );
}