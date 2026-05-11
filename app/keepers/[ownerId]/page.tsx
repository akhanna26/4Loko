import { getActiveOwners } from '../../../lib/queries';
import { getFlight, getOwnerPrevRoster, getKeeperDeclaration } from '../../../lib/draft';
import { getOwnerTheme } from '../../../lib/owner-themes';
import KeeperForm from './KeeperForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join('').toUpperCase();

export default async function OwnerKeeperPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId: ownerIdStr } = await params;
  const ownerId = parseInt(ownerIdStr, 10);
  if (isNaN(ownerId)) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Invalid owner ID: {ownerIdStr}</p>
      </main>
    );
  }

  const owners = await getActiveOwners();
  const owner = owners.find((o) => o.id === ownerId);
  if (!owner) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
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
  const theme = getOwnerTheme(owner.name);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <Link href="/keepers" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← All keepers
      </Link>

      {/* OWNER HEADER */}
      <header className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm p-6 sm:p-8 mb-6 sm:mb-8"
        style={{ borderTop: `3px solid ${theme.primary}` }}>
        <p className="text-[9px] sm:text-[10px] uppercase mb-3" style={{ letterSpacing: '0.32em', color: theme.primary }}>
          PGA Championship Keeper · Aronimink
        </p>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white flex items-center justify-center text-sm sm:text-base tabular font-semibold border-2 border-white shadow-sm shrink-0"
            style={{
              letterSpacing: '0.05em',
              background: theme.primary,
            }}
          >
            {initials(owner.name)}
          </div>
          <div>
            <h1 className="serif text-3xl sm:text-4xl font-light text-[color:var(--green-deep)] leading-none" style={{ letterSpacing: '-0.02em' }}>
              {owner.name}
            </h1>
            <p className="serif italic text-sm text-[color:var(--green-moss)] mt-2">
              Choose one Masters golfer to keep, or none.
            </p>
          </div>
        </div>
      </header>

      {/* KEEPER FORM */}
      {roster.length === 0 ? (
        <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm p-6 sm:p-8 text-center">
          <p className="serif italic text-[color:var(--green-moss)]">
            No Masters roster found for {owner.name}. Cannot select a keeper.
          </p>
        </div>
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
