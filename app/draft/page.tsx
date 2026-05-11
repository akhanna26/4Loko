import { getFlight } from '../../lib/draft';
import {
  getAuctionSession,
  getAuctionBids,
  getOwnerStates,
  getGolferPool,
} from '../../lib/auction';
import AuctionConsole from './AuctionConsole';
import { getActiveOwners, getOwnerRanks } from '../../lib/queries';

export const dynamic = 'force-dynamic';

export default async function DraftPage() {
  const flight = await getFlight(2026, 2); // PGA Championship
  if (!flight) {
    return (
      <main className="max-w-4xl mx-auto px-6 pt-10">
        <p className="serif text-2xl text-[color:var(--green-deep)]">PGA Championship flight not configured.</p>
      </main>
    );
  }

  const [session, owners, bids, ownerStates, pool, ranks] = await Promise.all([
    getAuctionSession(flight.id),
    getActiveOwners(),
    getAuctionBids(flight.id),
    getOwnerStates(flight.id),
    getGolferPool(flight.id),
    getOwnerRanks(),
  ]);

  if (!session) {
    return (
      <main className="max-w-4xl mx-auto px-6 pt-10">
        <p className="serif text-2xl text-[color:var(--green-deep)]">Auction session not found. Run the schema SQL first.</p>
      </main>
    );
  }

  return (
<AuctionConsole
      flightId={flight.id}
      flightName={flight.name ?? 'PGA Championship'}
      sessionId={session.id}
      initialSession={session}
      owners={owners}
      initialBids={bids}
      initialOwnerStates={ownerStates}
      initialPool={pool}
      ranks={Array.from(ranks.values())}
    />
  );
}