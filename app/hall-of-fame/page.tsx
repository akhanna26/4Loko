import { getYearlongStandings, getEventResults, getMajorWinners, getChampions } from '../../lib/queries';

const HEADING_CLASS = "serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none";
const HEADING_STYLE = { letterSpacing: '-0.02em' };

const shortName = (name: string) => {
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
};

export default async function HallOfFame() {
  const [champions, majors2024, majors2025, events2024, events2025, allMajors] = await Promise.all([
    getChampions(),
    getYearlongStandings(2024),
    getYearlongStandings(2025),
    getEventResults(2024),
    getEventResults(2025),
    getMajorWinners(),
  ]);

  const majorTally = new Map<string, number>();
  for (const m of allMajors) {
    majorTally.set(m.owner_name, (majorTally.get(m.owner_name) ?? 0) + 1);
  }
  const tallyRanked = Array.from(majorTally.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">

      {/* HERO — gold gradient, Butler's Cabin energy */}
      <section className="mb-10 sm:mb-14">
        <div className="p-6 sm:p-8 md:p-10 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(253, 181, 21, 0.08) 0%, rgba(255, 255, 255, 0.92) 50%, rgba(253, 181, 21, 0.08) 100%)',
            border: '1px solid rgba(253, 181, 21, 0.35)',
            borderTop: '3px solid var(--gold-masters)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 4px 16px rgba(253, 181, 21, 0.12)',
          }}>
          <p className="text-[10px] uppercase mb-3" style={{ letterSpacing: '0.32em', color: 'var(--gold-masters)' }}>
            The Clubhouse · Year-Long Legacy
          </p>
          <h1 className="font-light leading-[0.95] text-5xl sm:text-7xl md:text-8xl text-[color:var(--green-deep)]" style={{ letterSpacing: '-0.025em' }}>
            HALL OF FAME
          </h1>
          <p className="serif italic text-sm sm:text-base text-[color:var(--green-moss)] mt-4">
            {champions.length} {champions.length === 1 ? 'season' : 'seasons'} contested · since 2023
          </p>
        </div>
      </section>

      {/* HONORED CHAMPIONS */}
      <section className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6 gap-2">
          <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Honored Champions</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            year-long winners
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {champions.map((c) => (
            <div
              key={c.season_year}
              className="relative p-6 sm:p-8 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(253, 181, 21, 0.06) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(253, 181, 21, 0.06) 100%)',
                border: '1px solid rgba(253, 181, 21, 0.35)',
                borderTop: '3px solid var(--gold-masters)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 12px rgba(253, 181, 21, 0.1)',
              }}>

              {/* Wreath/trophy SVG */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 opacity-20">
                <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="var(--gold-masters)" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M10 30 Q5 22 10 14 Q15 8 20 8 Q25 8 30 14 Q35 22 30 30" />
                  <path d="M12 28 Q9 22 13 16" />
                  <path d="M28 28 Q31 22 27 16" />
                  <circle cx="20" cy="20" r="3" fill="var(--gold-masters)" stroke="none" opacity="0.4" />
                </svg>
              </div>

              <div className="serif text-sm text-[color:var(--green-moss)] italic tabular mt-3" style={{ letterSpacing: '0.05em' }}>
                {c.season_year}
              </div>
              <div className="serif text-3xl sm:text-4xl font-semibold text-[color:var(--green-deep)] mt-2 leading-tight" style={{ letterSpacing: '-0.01em' }}>
                {c.owner_name}
              </div>

              {/* Gold divider */}
              <div className="flex items-center justify-center gap-1.5 my-4">
                <span className="w-8 h-px" style={{ background: 'var(--gold-masters)', opacity: 0.4 }} />
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="var(--gold-masters)" opacity="0.6">
                  <path d="M6 0 L7 4 L11 5 L8 7 L9 11 L6 9 L3 11 L4 7 L1 5 L5 4 Z" />
                </svg>
                <span className="w-8 h-px" style={{ background: 'var(--gold-masters)', opacity: 0.4 }} />
              </div>

              <div className="text-[10px] uppercase tabular text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
                {c.total_score} points
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MAJOR WINNERS TALLY */}
      <section className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6 gap-2">
          <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Major Winners</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            $120 winnings tally
          </span>
        </div>

        <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm">
          <div className="bg-[color:var(--cream-tint)]/60 p-3 sm:p-5">
            {tallyRanked.map(([owner, count], i) => {
              const isTop = i === 0;
              return (
                <div
                  key={owner}
                  className="flex items-baseline justify-between py-2.5 sm:py-3 px-2 sm:px-3 transition-colors"
                  style={{
                    borderBottom: i === tallyRanked.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.7)',
                    borderLeft: isTop ? '3px solid var(--gold-masters)' : '3px solid transparent',
                    paddingLeft: isTop ? '8px' : undefined,
                  }}>
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <span className="serif text-sm text-[color:var(--green-moss)] tabular w-5 shrink-0">{i + 1}.</span>
                    <span className={`serif ${isTop ? 'text-base sm:text-lg font-semibold' : 'text-sm sm:text-base'} text-[color:var(--green-deep)]`}>
                      {owner}
                    </span>
                    {isTop && <span className="text-[color:var(--gold-masters)] text-sm">★</span>}
                  </div>
                  <span className="text-[10px] sm:text-xs uppercase text-[color:var(--green-moss)] tabular" style={{ letterSpacing: '0.18em' }}>
                    {count} {count === 1 ? 'major' : 'majors'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PER-SEASON STANDINGS */}
      {[
        { year: 2025, standings: majors2025, events: events2025 },
        { year: 2024, standings: majors2024, events: events2024 },
      ].map(({ year, standings, events }) => {
        const eventNames = [...new Set(events.map((e) => e.tournament_name))];
        const ownerEventScore = new Map<string, Map<string, number>>();
        for (const e of events) {
          if (!ownerEventScore.has(e.owner_name)) ownerEventScore.set(e.owner_name, new Map());
          ownerEventScore.get(e.owner_name)!.set(e.tournament_name, e.total_score);
        }

        return (
          <section key={year} className="mb-12 sm:mb-16">
            <div className="flex items-baseline justify-between mb-4 sm:mb-6 gap-2">
              <h2 className={HEADING_CLASS} style={HEADING_STYLE}>
                <span className="tabular">{year}</span> Season
              </h2>
              <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
                Final standings
              </span>
            </div>

            <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm overflow-x-auto">
              <div className="bg-[color:var(--cream-tint)]/60 p-3 sm:p-5">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <th className="text-left py-2.5 px-2 text-[9px] uppercase text-[color:var(--green-moss)] font-normal w-7" style={{ letterSpacing: '0.18em' }}>#</th>
                      <th className="text-left py-2.5 px-2 text-[9px] uppercase text-[color:var(--green-moss)] font-normal" style={{ letterSpacing: '0.18em' }}>Owner</th>
                      {eventNames.map((n) => (
                        <th key={n} className="text-right py-2.5 px-1.5 text-[9px] uppercase text-[color:var(--green-moss)] font-normal whitespace-nowrap" style={{ letterSpacing: '0.18em' }}>
                          {n.replace('Championship', 'Ch.').replace('Tournament', '').replace('The ', '')}
                        </th>
                      ))}
                      <th className="text-right py-2.5 px-2 text-[9px] uppercase text-[color:var(--green-deep)] font-semibold" style={{ letterSpacing: '0.18em' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => {
                      const isChamp = s.finish_rank === 1;
                      return (
                        <tr
                          key={s.owner_name}
                          style={{
                            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.7)',
                            background: isChamp ? 'rgba(253, 181, 21, 0.06)' : undefined,
                            borderLeft: isChamp ? '3px solid var(--gold-masters)' : undefined,
                          }}>
                          <td className="py-2.5 px-2 serif text-[color:var(--green-moss)] tabular text-xs">{s.finish_rank}</td>
                          <td className="py-2.5 px-2 serif text-[color:var(--green-deep)] text-sm">
                            {s.owner_name}
                            {isChamp && <span className="ml-2 text-[color:var(--gold-masters)]">★</span>}
                          </td>
                          {eventNames.map((n) => {
                            const v = ownerEventScore.get(s.owner_name)?.get(n);
                            return (
                              <td key={n} className="text-right py-2.5 px-1.5 tabular text-[color:var(--green-forest)] text-xs">
                                {v ?? '—'}
                              </td>
                            );
                          })}
                          <td className="text-right py-2.5 px-2 serif text-[color:var(--green-deep)] tabular text-sm" style={{ fontWeight: isChamp ? 700 : 600 }}>
                            {s.total_score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
