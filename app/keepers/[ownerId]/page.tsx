import { getActiveOwners } from '../../../lib/queries';
import { getFlight, getOwnerPrevRoster, getKeeperDeclaration, getMajorForFlight } from '../../../lib/draft';
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

  const currentFlight = await getFlight(2026, 4);
  const prevFlight = await getFlight(2026, 3);
  if (!currentFlight || !prevFlight) return <main className="p-8">Flights not configured.</main>;

  const [currentMajor, prevMajor, roster, currentDecl] = await Promise.all([
    getMajorForFlight(currentFlight.id),
    getMajorForFlight(prevFlight.id),
    getOwnerPrevRoster(ownerId, prevFlight.id),
    getKeeperDeclaration(currentFlight.id, ownerId),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
          {currentMajor?.name ?? ''} Keeper · {owner.name}
        </p>
      </div>

      <section className="mb-10 text-center">
        <h1 className="serif text-5xl font-semibold tracking-tight text-[color:var(--green-deep)] leading-none">
          {owner.name}
        </h1>
        <div className="divider-rule mt-5 mb-3 max-w-[160px] mx-auto" />
        <p className="text-sm text-[color:var(--green-moss)] italic serif">
          Choose one {prevMajor?.name ?? 'previous major'} golfer to keep, or none.
        </p>
      </section>

      {roster.length === 0 ? (
        <p className="text-center text-sm text-[color:var(--green-moss)] serif italic">
          No {prevMajor?.name ?? 'previous major'} roster found for {owner.name}. Cannot select a keeper.
        </p>
      ) : (
        <KeeperForm
          ownerId={ownerId}
          ownerName={owner.name}
          flightId={currentFlight.id}
          prevMajorName={prevMajor?.name ?? 'Previous Major'}
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
