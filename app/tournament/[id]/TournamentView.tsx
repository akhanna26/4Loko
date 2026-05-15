'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TournamentDetail } from '../../../lib/queries';
import { getMajorAccent } from '../../../components/Emblems';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
function formatDateRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', { month: 'long' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}, ${s.getFullYear()}`;
}

const shortName = (name: string) => {
  const p = name.trim().split(/\s+/);
  if (p.length < 2) return name;
  return `${p[0][0]}. ${p[p.length - 1]}`;
};

const HEADING_CLASS = "serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none";
const HEADING_STYLE = { letterSpacing: '-0.02em' };

export default function TournamentView({ detail }: { detail: TournamentDetail }) {
  const { tournament, rosters, major_winner } = detail;
  const isFinal = tournament.status === 'final';
  const isLive = tournament.status === 'live';
  const isUpcoming = tournament.status === 'upcoming';
  const isMajor = tournament.event_type === 'MAJOR';

  const accent = getMajorAccent(tournament.name);
  const primary = accent?.primary ?? 'var(--green-deep)';
  const secondary = accent?.accent ?? 'var(--gold-masters)';

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const sortedRosters = useMemo(() => {
    return [...rosters].sort((a, b) => b.total_score - a.total_score || a.owner_name.localeCompare(b.owner_name));
  }, [rosters]);

  const toggle = (ownerId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  };

  const formatScore = (s: number) => s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`;
  const dailyDisplay = (s: number | null) => s === null ? '—' : (s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`);

  const podium = sortedRosters.slice(0, 3).filter(r => r.total_score > 0);

  const colTemplate = '20px minmax(80px, 1fr) 46px repeat(4, 32px) 32px 14px';

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <Link href="/" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← 2026 Season
      </Link>

      {/* HEADER */}
      <header className="p-6 sm:p-8 md:p-10 mb-8 sm:mb-10 relative"
        style={{
          background: `linear-gradient(135deg, ${primary}10 0%, rgba(255,255,255,0.92) 50%, ${primary}10 100%)`,
          border: `1px solid ${primary}30`,
          borderTop: `3px solid ${primary}`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 12px ${primary}10`,
        }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="w-2 h-2 rounded-full bg-[color:var(--chicago-red)] live-pulse" />
            )}
            <p className="text-[10px] sm:text-[11px] uppercase font-semibold" style={{ letterSpacing: '0.32em', color: isLive ? 'var(--chicago-red)' : primary }}>
              {isLive ? 'Live Now' : isFinal ? 'Final' : 'Upcoming'} · {isMajor ? 'Major' : 'Elevated Event'}
            </p>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.2em' }}>
            {formatDateRange(tournament.start_date, tournament.end_date)}
          </span>
        </div>

        <h1 className="font-light leading-[0.95] text-4xl sm:text-6xl md:text-7xl text-[color:var(--green-deep)] break-words" style={{ letterSpacing: '-0.02em' }}>
          {tournament.name.toUpperCase()}
        </h1>
        {tournament.venue && (
          <p className="serif italic text-sm sm:text-base text-[color:var(--green-moss)] mt-3">{tournament.venue}</p>
        )}
      </header>

      {/* UPCOMING — empty state */}
      {isUpcoming && (
        <section className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm p-6 sm:p-8 text-center">
          <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.24em' }}>
            Coming up
          </p>
          <p className="serif text-base sm:text-lg text-[color:var(--green-deep)]">
            {isMajor ? 'Draft happens before tee time. Check back when scoring begins.' : 'Rosters carry over from this flight\u2019s major. Bonuses score during the event.'}
          </p>
        </section>
      )}

      {!isUpcoming && (
        <>
          {/* PODIUM */}
          {podium.length > 0 && (
            <section className="mb-8 sm:mb-10">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {podium.map((r, i) => {
                  const labelColor = i === 0 ? 'var(--gold-masters)' : i === 1 ? 'var(--silver)' : 'var(--bronze)';
                  const labelText = i === 0 ? 'Winner' : i === 1 ? '2nd' : '3rd';
                  return (
                    <div key={r.owner_id}
                      className="p-3 sm:p-4 bg-white border border-[color:var(--green-forest)]/15 shadow-sm"
                      style={i === 0
                        ? { borderTop: `3px solid ${labelColor}` }
                        : { borderTop: `2px solid ${labelColor}` }}>
                      <p className="text-[9px] sm:text-[10px] uppercase" style={{ letterSpacing: '0.18em', color: labelColor }}>{labelText}</p>
                      <p className="serif text-sm sm:text-lg text-[color:var(--green-deep)] font-semibold mt-1 truncate">{r.owner_name}</p>
                      <p className="text-xs sm:text-sm tabular text-[color:var(--green-moss)] mt-0.5">{formatScore(r.total_score)}</p>
                    </div>
                  );
                })}
              </div>
              {major_winner && isMajor && (
                <div className="mt-3 p-3 sm:p-4 bg-white border border-[color:var(--green-forest)]/15 shadow-sm"
                  style={{ borderLeft: `3px solid ${primary}` }}>
                  <p className="text-[10px] uppercase" style={{ letterSpacing: '0.24em', color: primary }}>Major Winner Pot</p>
                  <p className="serif text-sm sm:text-base mt-1 text-[color:var(--green-deep)] font-semibold">{major_winner.golfer_name}</p>
                  <p className="text-xs italic text-[color:var(--green-moss)]">on {major_winner.owner_name}&apos;s roster</p>
                </div>
              )}
            </section>
          )}

          {/* STANDINGS — expandable Standings-style table */}
          <section className="mb-10 sm:mb-14">
            <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
              <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Standings</h2>
              <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
                Tap rows to expand
              </span>
            </div>

            <div className="bg-white border-2 shadow-sm overflow-x-auto"
              style={{
                borderColor: 'rgba(14, 42, 74, 0.15)',
                boxShadow: '0 2px 8px rgba(14, 42, 74, 0.05)',
              }}>
              <div className="bg-[color:var(--cream-tint)]/60 p-2 sm:p-3">
                <div className="min-w-[340px]">
                  {/* Column header */}
                  <div className="grid items-baseline gap-1 px-2 py-2"
                    style={{
                      gridTemplateColumns: colTemplate,
                      background: 'var(--cream-deep)',
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                    }}>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>#</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Owner</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-deep)] text-right font-semibold" style={{ letterSpacing: '0.14em' }}>Total</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Th</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Fr</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Sa</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Su</span>
                    <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Bon</span>
                    <span />
                  </div>

                  {/* Owner rows */}
                  {sortedRosters.map((r, i) => {
                    const rank = i + 1;
                    const isLeader = rank === 1 && r.total_score > 0;
                    const isExpanded = expanded.has(r.owner_id);
                    return (
                      <div key={r.owner_id}>
                        <button
                          onClick={() => toggle(r.owner_id)}
                          className="grid w-full items-baseline gap-1 px-2 py-3 text-left transition-all hover:bg-[color:var(--cream-deep)]/40"
                          style={{
                            gridTemplateColumns: colTemplate,
                            borderTop: i === 0 ? 'none' : '1px solid rgba(42, 70, 54, 0.12)',
                            background: isLeader
                              ? 'linear-gradient(135deg, rgba(253, 181, 21, 0.08) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(253, 181, 21, 0.08) 100%)'
                              : 'white',
                            borderLeft: isLeader ? '3px solid var(--gold-masters)' : '3px solid transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <span className="text-[11px] sm:text-xs tabular text-[color:var(--green-moss)]">{rank}</span>
                          <span className="serif text-xs sm:text-sm text-[color:var(--green-deep)] truncate" style={{ fontWeight: isLeader ? 700 : 500 }}>
                            <span className="hidden sm:inline">{r.owner_name}</span>
                            <span className="sm:hidden">{shortName(r.owner_name)}</span>
                            {isLeader && <span className="ml-1 text-[color:var(--gold-masters)]">★</span>}
                          </span>
                          <span className="text-[11px] sm:text-sm tabular text-right font-bold" style={{ color: isLeader ? 'var(--green-deep)' : r.total_score > 0 ? 'var(--green-deep)' : 'var(--green-moss)' }}>
                            {formatScore(r.total_score)}
                          </span>
                          {r.daily_scores.map((d) => {
                            const s = d.score;
                            const color =
                              s === null ? 'rgba(42,70,54,0.4)' :
                              s >= 5 ? 'var(--masters-green)' :
                              s >= 2 ? 'var(--green-forest)' :
                              s === 0 ? 'var(--green-moss)' :
                              s < 0 ? 'var(--chicago-red)' :
                              'var(--green-deep)';
                            const weight = s !== null && s >= 5 ? 700 : s !== null && s >= 2 ? 600 : 500;
                            return (
                              <span key={d.day} className="text-[10px] tabular text-right" style={{ color, fontWeight: weight }}>
                                {dailyDisplay(s)}
                              </span>
                            );
                          })}
                          <span className="text-[10px] tabular text-right" style={{ color: r.bonus_total > 0 ? secondary : 'rgba(42,70,54,0.4)', fontWeight: r.bonus_total > 0 ? 700 : 400 }}>
                            {r.bonus_total > 0 ? `+${r.bonus_total}` : '—'}
                          </span>
                          <span className="text-[10px] text-right text-[color:var(--green-moss)]">{isExpanded ? '▾' : '▸'}</span>
                        </button>

                        {/* EXPANDED PER-GOLFER DETAIL */}
                        {isExpanded && (
                          <div className="px-3 sm:px-5 py-3 sm:py-4"
                            style={{
                              background: 'rgba(245, 241, 230, 0.85)',
                              borderLeft: `2px solid ${primary}`,
                            }}>
                            <p className="text-[10px] uppercase mb-2 sm:mb-3" style={{ letterSpacing: '0.18em', color: primary }}>
                              {r.owner_name} · roster
                            </p>

                            <div className="overflow-x-auto">
                              <div className="min-w-[420px]">
                                {/* Roster column header */}
                                <div className="grid gap-1 py-1 mb-1 border-b border-[color:var(--green-forest)]/15"
                                  style={{ gridTemplateColumns: 'minmax(120px, 1fr) 32px repeat(4, 32px) 36px 36px' }}>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.16em' }}>Golfer</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>$</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Thu</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Fri</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Sat</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Sun</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Bon</span>
                                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] text-right" style={{ letterSpacing: '0.14em' }}>Tot</span>
                                </div>

                                {r.golfers.map((g) => {
                                  const golferBonusPts = r.bonuses
                                    .filter((b: any) => b.detail.includes(g.full_name))
                                    .reduce((sum: number, b: any) => sum + b.points, 0);
                                  const golferTotal = g.best_round_total + golferBonusPts;
                                  return (
                                    <div key={g.golfer_id} className="grid gap-1 py-1.5 items-baseline"
                                      style={{
                                        gridTemplateColumns: 'minmax(120px, 1fr) 32px repeat(4, 32px) 36px 36px',
                                        borderTop: '1px solid rgba(255,255,255,0.7)',
                                      }}>
                                      <span className="serif text-xs text-[color:var(--green-deep)] truncate">
                                        {g.is_keeper && <span className="mr-1 text-[8px] uppercase font-bold" style={{ color: secondary, letterSpacing: '0.15em' }}>K</span>}
                                        {g.full_name}
                                      </span>
                                      <span className="text-[10px] tabular text-[color:var(--green-moss)] text-right">${g.purchase_price}</span>
                                      {g.day_scores.map((ds) => {
                                        const s = ds.raw_score;
                                        const baseColor =
                                          s === null ? 'rgba(42,70,54,0.3)' :
                                          s >= 5 ? 'var(--masters-green)' :
                                          s >= 2 ? 'var(--green-forest)' :
                                          s === 0 ? 'var(--green-moss)' :
                                          s < 0 ? 'var(--chicago-red)' :
                                          'var(--green-deep)';
                                        const color = ds.counted ? primary : (s !== null ? baseColor : 'rgba(42,70,54,0.3)');
                                        return (
                                          <span key={ds.day} className="text-[10px] tabular text-right"
                                            style={{
                                              color,
                                              fontWeight: ds.counted ? 700 : 400,
                                              background: ds.counted && s !== null ? `${primary}12` : 'transparent',
                                              paddingLeft: '3px',
                                              paddingRight: '3px',
                                            }}>
                                            {s === null ? '—' : formatScore(s)}
                                          </span>
                                        );
                                      })}
                                      <span className="text-[10px] tabular text-right" style={{ color: golferBonusPts > 0 ? secondary : 'rgba(42,70,54,0.4)', fontWeight: golferBonusPts > 0 ? 700 : 400 }}>
                                        {golferBonusPts > 0 ? `+${golferBonusPts}` : '—'}
                                      </span>
                                      <span className="text-[10px] tabular text-right font-bold"
                                        style={{ color: golferTotal > 0 ? primary : 'rgba(42,70,54,0.4)' }}>
                                        {golferTotal > 0 ? `+${golferTotal}` : '—'}
                                      </span>
                                    </div>
                                  );
                                })}

                                {r.golfers.length === 0 && (
                                  <p className="text-[10px] text-[color:var(--green-moss)] italic serif py-2">No roster recorded.</p>
                                )}
                              </div>
                            </div>

                            {/* Bonuses (full list) */}
                            {r.bonuses.length > 0 && (
                              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(42,70,54,0.1)' }}>
                                <p className="text-[10px] uppercase mb-1.5" style={{ letterSpacing: '0.18em', color: secondary }}>
                                  Bonuses · +{r.bonus_total}
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {r.bonuses.map((b, idx) => (
                                    <div key={idx} className="text-[11px]">
                                      <span className="serif text-[color:var(--green-deep)]">{b.detail}</span>
                                      <span className="tabular ml-1 font-bold" style={{ color: secondary }}>+{b.points}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p className="mt-3 text-[10px] text-[color:var(--green-moss)] italic serif">
                              Bold scores count toward team total (top 4 Thu/Fri, top 2 Sat/Sun).
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mt-3 text-right" style={{ letterSpacing: '0.18em' }}>
              Tap any row to see per-golfer scoring
            </p>
          </section>
        </>
      )}
    </main>
  );
}
