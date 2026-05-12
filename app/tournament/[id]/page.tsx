export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getTournamentDetail } from '../../../lib/queries';
import TournamentView from './TournamentView';

export const dynamic = 'force-dynamic';

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentId = parseInt(id, 10);
  if (isNaN(tournamentId)) {
    return <main className="p-8">Invalid tournament.</main>;
  }
  const detail = await getTournamentDetail(tournamentId);
  if (!detail) {
    return <main className="p-8">Tournament not found.</main>;
  }
  return <TournamentView detail={detail} />;
}
