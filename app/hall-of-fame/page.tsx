import { getYearlongStandings, getEventResults, getMajorWinners, getChampions } from '../../lib/queries';

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
  const tallyRanked = [...majorTally.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main className="max-w-5xl mx-auto px-6 pt-10 pb-16">
      {/* Eyebrow */}
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
          Better than most
        </p>
      </div>

      <section className="mb-12 text-center">
        <h1 className="serif text-6xl md:text-7xl font-semibold tracking-tight text-[color:var(--green-deep)] leading-none">
          Hall of Fame
        </h1>
        <div className="divider-rule mt-6 mb-3 max-w-xs mx-auto" />
        <p className="text-sm text-[color:var(--green-moss)] italic serif">
          {champions.length} {champions.length === 1 ? 'season' : 'seasons'} contested, since 2023
        </p>
      </section>

      {/* Champions */}
      <section className="mb-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-2xl text-[color:var(--green-deep)]">Honored Champions</h2>
          <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
            year-long winners
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {champions.map((c) => (
            <div
              key={c.season_year}
              className="relative bg-[color:var(--cream-deep)] border border-[color:var(--green-forest)]/15 p-8 text-center"
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] uppercase text-[color:var(--gold-masters)] bg-[color:var(--green-deep)] px-2 py-0.5" style={{ letterSpacing: '0.18em' }}>
                Champion
              </div>
              <div className="serif text-sm text-[color:var(--green-moss)] italic mt-3 tabular">{c.season_year}</div>
              <div className="serif text-3xl font-semibold text-[color:var(--green-deep)] mt-1">Mr. {c.owner_name}</div>
              <div className="divider-rule mt-3 mb-3 max-w-[80px] mx-auto" />
              <div className="text-xs uppercase text-[color:var(--green-moss)] tabular" style={{ letterSpacing: '0.18em' }}>
                {c.total_score} pts
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Major Winner Tally */}
      <section className="mb-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-2xl text-[color:var(--green-deep)]">Major Winners</h2>
          <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
            $120 winnings tally
          </span>
        </div>

        <div className="border-t-2 border-[color:var(--green-deep)]">
          {tallyRanked.map(([owner, count], i) => (
            <div
              key={owner}
              className="flex items-baseline justify-between py-3 px-4 border-b border-[color:var(--green-forest)]/10"
            >
              <div className="flex items-baseline gap-4">
                <span className="serif text-sm text-[color:var(--green-moss)] tabular w-5">{i + 1}.</span>
                <span className="serif text-base text-[color:var(--green-deep)]">{owner}</span>
              </div>
              <span className="text-xs uppercase text-[color:var(--green-moss)] tabular" style={{ letterSpacing: '0.18em' }}>
                {count} {count === 1 ? 'major' : 'majors'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Per-Season Standings */}
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
          <section key={year} className="mb-20">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="serif text-2xl text-[color:var(--green-deep)]">
                <span className="tabular">{year}</span> Season
              </h2>
              <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                Final standings
              </span>
            </div>

            <div className="border-t-2 border-[color:var(--green-deep)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--green-forest)]/30">
                    <th className="text-left py-3 px-3 text-[10px] uppercase text-[color:var(--green-moss)] font-normal w-8" style={{ letterSpacing: '0.18em' }}>#</th>
                    <th className="text-left py-3 px-3 text-[10px] uppercase text-[color:var(--green-moss)] font-normal" style={{ letterSpacing: '0.18em' }}>Owner</th>
                    {eventNames.map((n) => (
                      <th key={n} className="text-right py-3 px-2 text-[10px] uppercase text-[color:var(--green-moss)] font-normal whitespace-nowrap" style={{ letterSpacing: '0.18em' }}>
                        {n.replace('Championship', 'Ch.').replace('Tournament', '').replace('The ', '')}
                      </th>
                    ))}
                    <th className="text-right py-3 px-3 text-[10px] uppercase text-[color:var(--green-moss)] font-normal" style={{ letterSpacing: '0.18em' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr
                      key={s.owner_name}
                      className={`border-b border-[color:var(--green-forest)]/10 ${s.finish_rank === 1 ? 'bg-[color:var(--cream-deep)]/60' : ''}`}
                    >
                      <td className="py-3 px-3 serif text-[color:var(--green-moss)] tabular">{s.finish_rank}</td>
                      <td className="py-3 px-3 serif text-[color:var(--green-deep)]">
                        {s.owner_name}
                        {s.finish_rank === 1 && <span className="ml-2 text-[color:var(--gold-masters)]">★</span>}
                      </td>
                      {eventNames.map((n) => {
                        const v = ownerEventScore.get(s.owner_name)?.get(n);
                        return (
                          <td key={n} className="text-right py-3 px-2 tabular text-[color:var(--green-forest)] text-xs">
                            {v ?? '—'}
                          </td>
                        );
                      })}
                      <td className="text-right py-3 px-3 serif font-semibold text-[color:var(--green-deep)] tabular">
                        {s.total_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </main>
  );
}