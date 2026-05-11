'use client';
import { useState, useMemo } from 'react';

type Standing = { owner_name: string; total: number; per_event: Record<string, number> };
type EventOrder = { name: string; short: string; type: 'MAJOR' | 'PGA' };

function MedalDot({ rank }: { rank: number }) {
  if (rank > 3) return null;
  const color = rank === 1 ? 'var(--gold-masters)' : rank === 2 ? 'var(--silver)' : 'var(--bronze)';
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold tabular shrink-0 ml-1.5"
      style={{ background: color, color: 'var(--green-deep)', lineHeight: 1 }}
      aria-label={`Position ${rank}`}>
      {rank}
    </span>
  );
}

function computeQuartiles(values: number[]): { p50: number; p75: number } {
  const positive = values.filter((v) => v != null && v > 0).sort((a, b) => a - b);
  if (positive.length === 0) return { p50: 0, p75: 0 };
  const p50idx = Math.floor(positive.length * 0.5);
  const p75idx = Math.floor(positive.length * 0.75);
  return {
    p50: positive[p50idx] ?? positive[positive.length - 1],
    p75: positive[p75idx] ?? positive[positive.length - 1],
  };
}

function tieredScoreStyle(score: number | null | undefined, q: { p50: number; p75: number }): { color: string; weight: number } {
  if (score === null || score === undefined) return { color: 'var(--green-moss)', weight: 400 };
  if (score === 0) return { color: 'var(--green-moss)', weight: 400 };
  if (score < 0) return { color: 'var(--chicago-red)', weight: 400 };
  if (q.p75 > 0 && score >= q.p75) return { color: 'var(--masters-green)', weight: 700 };
  if (q.p50 > 0 && score >= q.p50) return { color: 'var(--green-forest)', weight: 600 };
  return { color: 'var(--green-deep)', weight: 500 };
}

export default function StandingsExpandable({
  standings, eventOrder, tournamentStatusByName,
}: {
  standings: Standing[];
  eventOrder: EventOrder[];
  tournamentStatusByName: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const quartilesByEvent = useMemo(() => {
    const map: Record<string, { p50: number; p75: number }> = {};
    for (const e of eventOrder) {
      const values = standings.map((s) => s.per_event[e.name]).filter((v) => v != null) as number[];
      map[e.name] = computeQuartiles(values);
    }
    return map;
  }, [standings, eventOrder]);

  const totalQuartiles = useMemo(() => computeQuartiles(standings.map((s) => s.total)), [standings]);

  const toggle = (ownerName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ownerName)) next.delete(ownerName);
      else next.add(ownerName);
      return next;
    });
  };

  // Detect if any tournament is currently live
  const hasLive = Object.values(tournamentStatusByName).some((s) => s === 'live');

  const colTemplate = hasLive
    ? '40px minmax(170px, 1fr) ' + eventOrder.map((e) => (e.type === 'MAJOR' ? '52px' : '46px')).join(' ') + ' 64px 28px'
    : '40px minmax(170px, 1fr) 64px ' + eventOrder.map((e) => (e.type === 'MAJOR' ? '52px' : '46px')).join(' ') + ' 28px';

  const renderCell = (eventName: string, score: number | undefined, isElev: boolean) => {
    const status = tournamentStatusByName[eventName];
    if (status === 'upcoming') {
      return (
        <span className="text-[10px] text-[color:var(--green-moss)]/40 italic serif" style={{ letterSpacing: '0.05em' }}>—</span>
      );
    }
    if (score === undefined || score === null) {
      return <span className="text-[10px] text-[color:var(--green-moss)]/40">—</span>;
    }
    if (score === 0) return <span className="text-xs tabular" style={{ color: 'var(--green-moss)' }}>E</span>;
    const style = tieredScoreStyle(score, quartilesByEvent[eventName]);
    return (
      <span
        className="text-xs tabular"
        style={{ color: style.color, fontWeight: style.weight }}>
        {score > 0 ? `+${score}` : score}
      </span>
    );
  };

  const renderTotal = (total: number, isLeader: boolean) => {
    if (isLeader) {
      return (
        <span className="text-sm tabular text-[color:var(--green-deep)]" style={{ fontWeight: 700 }}>
          {total > 0 ? `+${total}` : total === 0 ? 'E' : total}
        </span>
      );
    }
    const style = tieredScoreStyle(total, totalQuartiles);
    return (
      <span className="text-sm tabular" style={{ color: style.color, fontWeight: Math.max(style.weight, 600) }}>
        {total > 0 ? `+${total}` : total === 0 ? 'E' : total}
      </span>
    );
  };

  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-4 sm:mb-6 gap-2 flex-wrap">
        <h2 className="serif text-2xl sm:text-3xl text-[color:var(--green-deep)] font-semibold">Standings</h2>
        <div className="flex items-baseline gap-3">
          {hasLive && (
            <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase tabular text-[color:var(--chicago-red)] font-semibold" style={{ letterSpacing: '0.2em' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--chicago-red)] live-pulse" />
              Live scoring
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            Tap rows to expand
          </span>
        </div>
      </div>

      <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm overflow-x-auto">
        <div className="bg-[color:var(--cream-tint)]/60 p-3 sm:p-5">
          <div className="min-w-[800px]">
            <div className="board-row board-header" style={{ gridTemplateColumns: colTemplate, background: 'var(--cream-deep)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="board-cell">Pos</div>
              <div className="board-cell">Owner</div>
              {!hasLive && <div className="board-cell text-right" style={{ color: 'var(--green-deep)', fontWeight: 700 }}>Total</div>}
              {eventOrder.map((e) => (
                <div key={e.short} className={`board-cell text-right ${e.type === 'PGA' ? 'board-col-elev' : ''}`}>
                  {e.short}
                </div>
              ))}
              {hasLive && <div className="board-cell text-right">Total</div>}
              <div className="board-cell" />
            </div>

            {standings.map((s, i) => {
              const isLeader = i === 0;
              const isExpanded = expanded.has(s.owner_name);
              const rank = i + 1;
              return (
                <div key={s.owner_name}>
                  <button
                    onClick={() => toggle(s.owner_name)}
                    className={`board-row w-full text-left transition-colors hover:bg-white/30 ${isLeader ? 'board-row-leader' : ''}`}
                    style={{
                      gridTemplateColumns: colTemplate,
                      display: 'grid',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.7)',
                    }}
                  >
                    <div className="board-cell text-xs tabular" style={{ color: 'var(--green-moss)' }}>{rank}</div>
                    <div className="board-cell board-name flex items-center" style={{ fontSize: '14px', color: 'var(--green-deep)', fontWeight: isLeader ? 600 : 400 }}>
                      <span>{s.owner_name}</span>
                      <MedalDot rank={rank} />
                    </div>
                    {!hasLive && <div className="board-cell text-right">{renderTotal(s.total, isLeader)}</div>}
                    {eventOrder.map((e) => (
                      <div key={e.short} className={`board-cell text-right ${e.type === 'PGA' ? 'board-col-elev' : ''}`}>
                        {renderCell(e.name, s.per_event[e.name], e.type === 'PGA')}
                      </div>
                    ))}
                    {hasLive && <div className="board-cell text-right">{renderTotal(s.total, isLeader)}</div>}
                    <div className="board-cell text-right text-[10px] text-[color:var(--green-moss)]">
                      {isExpanded ? '▾' : '▸'}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-[color:var(--cream-deep)]/60 border-l-2 border-[color:var(--green-deep)] px-4 sm:px-6 py-4">
                      <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-3" style={{ letterSpacing: '0.18em' }}>
                        {s.owner_name} · per-event
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {eventOrder.map((e) => {
                          const score = s.per_event[e.name];
                          const status = tournamentStatusByName[e.name];
                          const isMajor = e.type === 'MAJOR';
                          const display = status === 'upcoming' ? '—' :
                                          score === undefined || score === null ? '—' :
                                          score > 0 ? `+${score}` : score === 0 ? 'E' : `${score}`;
                          const style = (status === 'upcoming' || score == null)
                            ? { color: 'var(--green-moss)', weight: 400 }
                            : tieredScoreStyle(score, quartilesByEvent[e.name]);
                          return (
                            <div key={e.name}
                              className="bg-[color:var(--cream)] border border-[color:var(--green-forest)]/15 p-3"
                              style={isMajor ? { borderTop: '2px solid var(--green-deep)' } : {}}>
                              <p className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                                {e.name}
                              </p>
                              <p className="serif text-base mt-1 tabular"
                                style={{ color: style.color, fontWeight: style.weight }}>
                                {display}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[10px] text-[color:var(--green-moss)] italic serif">
                        Click any event in the calendar below for the full leaderboard, rosters, and per-day scoring.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
