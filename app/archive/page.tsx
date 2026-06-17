import { getArchivedFlights } from '../../lib/archive';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SEASON = 2026;

export default async function ArchiveIndex() {
  const flights = await getArchivedFlights(SEASON);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.28em' }}>
          The 2026 Season
        </p>
        <h1 className="serif text-3xl sm:text-5xl font-semibold tracking-tight text-[color:var(--green-deep)] mt-3 leading-none">
          Archive
        </h1>
        <div className="divider-rule mt-5 mb-3 max-w-[160px] mx-auto" />
        <p className="text-xs sm:text-sm text-[color:var(--green-moss)] italic serif">
          Final rosters and results from completed flights.
        </p>
      </div>

      {flights.length === 0 ? (
        <p className="text-center text-sm text-[color:var(--green-moss)] serif italic">
          No completed flights yet.
        </p>
      ) : (
        <div className="space-y-3">
          {flights.map((f) => (
            <Link
              key={f.flight_id}
              href={`/archive/${f.flight_id}`}
              className="block transition-all hover:shadow-md"
              style={{
                background: 'white',
                border: '1px solid rgba(14, 42, 74, 0.18)',
                borderLeft: '3px solid var(--green-forest)',
                boxShadow: '0 1px 4px rgba(14, 42, 74, 0.06)',
              }}
            >
              <div className="px-4 sm:px-5 py-3 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <h3 className="serif text-base sm:text-lg text-[color:var(--green-deep)] font-semibold">
                    {f.primary_tournament_name}
                  </h3>
                  <p className="text-[10px] uppercase text-[color:var(--green-moss)] mt-0.5" style={{ letterSpacing: '0.18em' }}>
                    Flight {f.flight_number} · Final
                  </p>
                </div>
                <div className="text-right">
                  {f.champion_name && (
                    <p className="serif text-xs text-[color:var(--green-deep)]">
                      Won by <span className="italic">{f.champion_name}</span>
                    </p>
                  )}
                  <p className="text-[9px] uppercase text-[color:var(--green-moss)] mt-1" style={{ letterSpacing: '0.18em' }}>
                    View results →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
