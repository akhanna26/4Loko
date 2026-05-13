import { getMajorWinners, getChampions, getYearlongStandings } from '../../lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const HEADING_CLASS = "serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none";
const HEADING_STYLE = { letterSpacing: '-0.02em' };

const WHITE_CASE_STYLE: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.85)',
  border: '1px solid rgba(42, 70, 54, 0.15)',
  boxShadow: '0 2px 8px rgba(14, 42, 74, 0.05)',
};

const INNER_CREAM_STYLE: React.CSSProperties = {
  background: 'rgba(240, 234, 219, 0.6)',
};

function formatScore(s: number) {
  return s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`;
}

export default async function HallOfFamePage() {
  const [majorWinners, champions, hist2025, hist2024, hist2023] = await Promise.all([
    getMajorWinners(),
    getChampions(),
    getYearlongStandings(2025),
    getYearlongStandings(2024),
    getYearlongStandings(2023),
  ]);

  const majorTally = new Map<string, number>();
  for (const m of majorWinners) {
    majorTally.set(m.owner_name, (majorTally.get(m.owner_name) ?? 0) + 1);
  }
  const tallyRanked = Array.from(majorTally.entries()).sort((a, b) => b[1] - a[1]);

  const yearLookup: Record<number, typeof hist2025> = {
    2025: hist2025,
    2024: hist2024,
    2023: hist2023,
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <Link href="/" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← 2026 Season
      </Link>

      {/* HEADER — Butler's Cabin gold gradient */}
      <header className="mb-10 sm:mb-12 p-6 sm:p-10 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(253, 181, 21, 0.12) 0%, rgba(255, 255, 255, 0.92) 50%, rgba(253, 181, 21, 0.12) 100%)',
          border: '1px solid rgba(253, 181, 21, 0.35)',
          borderTop: '3px solid var(--gold-masters)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 12px rgba(253, 181, 21, 0.1)',
        }}>
        <p className="text-[10px] uppercase mb-2" style={{ letterSpacing: '0.32em', color: 'var(--gold-masters)' }}>
          Presenting the FORE Lokos Hall of Fame
        </p>
        <h1 className="serif text-4xl sm:text-6xl md:text-7xl font-light text-[color:var(--green-deep)] leading-none" style={{ letterSpacing: '-0.02em' }}>
          Hall of Fame
        </h1>
        <p className="serif italic text-sm sm:text-base text-[color:var(--green-moss)] mt-3 sm:mt-4">
          Kings Amongst Men
        </p>
      </header>

      {/* CHAMPIONS */}
      {champions.length > 0 && (
        <section className="mb-12 sm:mb-14">
          <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
            <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Year-long Champions</h2>
            <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
              {champions.length} seasons
            </span>
          </div>

          <div style={WHITE_CASE_STYLE}>
            <div style={INNER_CREAM_STYLE} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {champions.map((c) => (
                  <div key={c.season_year}
                    style={{
                      background: 'white',
                      border: '1px solid rgba(42, 70, 54, 0.15)',
                      borderTop: '3px solid var(--gold-masters)',
                      boxShadow: '0 1px 3px rgba(14, 42, 74, 0.06)',
                    }}
                    className="p-4">
                    <p className="text-[10px] uppercase tabular text-[color:var(--gold-masters)] font-semibold" style={{ letterSpacing: '0.24em' }}>
                      {c.season_year}
                    </p>
                    <p className="serif text-lg sm:text-xl text-[color:var(--green-deep)] font-semibold mt-1">{c.owner_name}</p>
                    <p className="text-xs tabular text-[color:var(--green-moss)] mt-0.5">
                      {formatScore(Number(c.total_score))} pts
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MAJOR TALLY */}
      {tallyRanked.length > 0 && (
        <section className="mb-12 sm:mb-14">
          <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
            <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Major Tally</h2>
            <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
              All-time wins
            </span>
          </div>

          <div style={WHITE_CASE_STYLE}>
            <div style={INNER_CREAM_STYLE} className="p-4 sm:p-6">
              <div className="space-y-1">
                {tallyRanked.map(([name, count], i) => (
                  <div key={name} className="flex items-baseline justify-between gap-3 py-2 px-2"
                    style={{
                      background: 'white',
                      borderBottom: i < tallyRanked.length - 1 ? '1px solid rgba(42, 70, 54, 0.08)' : 'none',
                    }}>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs tabular text-[color:var(--green-moss)] w-6">#{i + 1}</span>
                      <span className="serif text-sm sm:text-base text-[color:var(--green-deep)]">{name}</span>
                    </div>
                    <span className="text-sm sm:text-base tabular font-semibold text-[color:var(--gold-masters)]">
                      {count} {count === 1 ? 'major' : 'majors'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MAJOR WINNERS LOG */}
      {majorWinners.length > 0 && (
        <section className="mb-12 sm:mb-14">
          <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
            <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Major Winners</h2>
            <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
              {majorWinners.length} {majorWinners.length === 1 ? 'win' : 'wins'}
            </span>
          </div>

          <div style={WHITE_CASE_STYLE}>
            <div style={INNER_CREAM_STYLE} className="p-4 sm:p-6">
              <div className="space-y-1">
                {majorWinners.map((m, i) => (
                  <div key={`${m.season_year}-${m.tournament_name}`} className="flex items-baseline justify-between gap-3 py-2 px-2"
                    style={{
                      background: 'white',
                      borderBottom: i < majorWinners.length - 1 ? '1px solid rgba(42, 70, 54, 0.08)' : 'none',
                    }}>
                    <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                      <span className="text-xs tabular text-[color:var(--green-moss)] shrink-0">{m.season_year}</span>
                      <span className="text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
                        {m.tournament_name}
                      </span>
                    </div>
                    <span className="serif text-sm sm:text-base text-[color:var(--green-deep)] font-semibold shrink-0">{m.owner_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HISTORICAL STANDINGS */}
      {[2025, 2024, 2023].map((year) => {
        const standings = yearLookup[year];
        if (!standings || standings.length === 0) return null;
        return (
          <section key={year} className="mb-10 sm:mb-12">
            <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
              <h2 className={HEADING_CLASS} style={HEADING_STYLE}>{year}</h2>
              <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
                Final standings
              </span>
            </div>

            <div style={WHITE_CASE_STYLE}>
              <div style={INNER_CREAM_STYLE} className="p-4 sm:p-6">
                <div className="space-y-1">
                  {standings.map((s, i) => {
                    const isLeader = s.finish_rank === 1;
                    return (
                      <div key={s.owner_name} className="grid items-baseline gap-3 py-2 px-2"
                        style={{
                          gridTemplateColumns: '30px 1fr 80px 60px',
                          background: isLeader ? 'linear-gradient(135deg, rgba(253, 181, 21, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(253, 181, 21, 0.08) 100%)' : 'white',
                          borderLeft: isLeader ? '3px solid var(--gold-masters)' : '3px solid transparent',
                          borderBottom: i < standings.length - 1 ? '1px solid rgba(42, 70, 54, 0.08)' : 'none',
                          paddingLeft: isLeader ? '8px' : '8px',
                        }}>
                        <span className="text-xs tabular text-[color:var(--green-moss)]">
                          {s.finish_rank}
                        </span>
                        <span className="serif text-sm sm:text-base text-[color:var(--green-deep)]" style={{ fontWeight: isLeader ? 700 : 500 }}>
                          {s.owner_name}
                          {isLeader && <span className="ml-1.5 text-[color:var(--gold-masters)]">★</span>}
                        </span>
                        <span className="text-xs italic text-[color:var(--green-moss)] truncate">{s.notes ?? ''}</span>
                        <span className="text-sm tabular text-right font-bold" style={{ color: isLeader ? 'var(--gold-masters)' : 'var(--green-deep)' }}>
                          {formatScore(Number(s.total_score))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
