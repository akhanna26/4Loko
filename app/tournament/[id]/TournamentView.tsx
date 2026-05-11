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

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join('').toUpperCase();

const shortName = (name: string) => {
  const p = name.trim().split(/\s+/);
  if (p.length < 2) return name;
  return `${p[0][0]}. ${p[p.length - 1]}`;
};

type SortKey = 'rank' | 'name' | 'th' | 'fr' | 'sa' | 'su' | 'bonus' | 'total';

export default function TournamentView({ detail }: { detail: TournamentDetail }) {
  const { tournament, rosters, major_winner } = detail;
  const isFinal = tournament.status === 'final';
  const isLive = tournament.status === 'live';
  const isUpcoming = tournament.status === 'upcoming';
  const isMajor = tournament.event_type === 'MAJOR';

  const accent = getMajorAccent(tournament.name);
  const primary = accent?.primary ?? 'var(--green-deep)';
  const secondary = accent?.accent ?? 'var(--gold-masters)';

  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRosters = useMemo(() => {
    const sorted = [...rosters];
    sorted.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'rank': av = a.rank; bv = b.rank; break;
        case 'name': av = a.owner_name; bv = b.owner_name; break;
        case 'th': av = a.daily_scores.find(d => d.day === 'Th')?.score ?? 0; bv = b.daily_scores.find(d => d.day === 'Th')?.score ?? 0; break;
        case 'fr': av = a.daily_scores.find(d => d.day === 'Fr')?.score ?? 0; bv = b.daily_scores.find(d => d.day === 'Fr')?.score ?? 0; break;
        case 'sa': av = a.daily_scores.find(d => d.day === 'Sa')?.score ?? 0; bv = b.daily_scores.find(d => d.day === 'Sa')?.score ?? 0; break;
        case 'su': av = a.daily_scores.find(d => d.day === 'Su')?.score ?? 0; bv = b.daily_scores.find(d => d.day === 'Su')?.score ?? 0; break;
        case 'bonus': av = a.bonus_total; bv = b.bonus_total; break;
        case 'total': av = a.total_score; bv = b.total_score; break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rosters, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(['total', 'th', 'fr', 'sa', 'su', 'bonus'].includes(key) ? 'desc' : 'asc');
    }
  };

  const SortHeader = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <button onClick={() => handleSort(k)}
      className={`text-[10px] uppercase font-semibold tracking-wider hover:opacity-70 ${align === 'right' ? 'text-right ml-auto' : 'text-left'}`}
      style={{ letterSpacing: '0.18em', color: sortKey === k ? primary : 'var(--green-moss)' }}>
      {label}{sortKey === k && (sortDir === 'asc' ? ' ↑' : ' ↓')}
    </button>
  );

  const podium = sortedRosters
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .filter(r => r.rank <= 3 && r.total_score > 0);

  const dailyDisplay = (s: number | null) => s === null ? '—' : s.toString();
  const formatScore = (s: number) => s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`;

  return (
    <main className="max-w-6xl mx-auto px-6 pt-10 pb-16">
      <Link href="/" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← 2026 Season
      </Link>

      {/* HEADER — cream-first, venue color in stripe + text only */}
      <header className="bg-[color:var(--cream-deep)]/40 px-8 py-8 mb-10 relative"
        style={{
          borderTop: `3px solid ${primary}`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
        }}>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-baseline gap-2.5">
            {accent && <span style={{ color: primary }}><accent.Emblem className="w-4 h-4" /></span>}
            <p className="text-[10px] uppercase" style={{ letterSpacing: '0.32em', color: primary }}>
              {isMajor ? 'Major' : 'Elevated Event'} · {formatDateRange(tournament.start_date, tournament.end_date)}
            </p>
          </div>
          <span className={`text-[10px] uppercase tabular ${isLive ? 'live-pulse' : ''}`}
            style={{
              letterSpacing: '0.24em',
              color: isLive ? 'var(--chicago-red)' : isFinal ? 'var(--green-moss)' : 'var(--green-forest)',
              opacity: isFinal ? 0.7 : 1,
            }}>
            {tournament.status}
          </span>
        </div>

        <h1 className="font-light leading-none text-5xl md:text-6xl"
          style={{ letterSpacing: '-0.02em', color: primary }}>
          {tournament.name.toUpperCase()}
        </h1>
        {tournament.venue && (
          <p className="serif italic text-sm text-[color:var(--green-moss)] mt-3">{tournament.venue}</p>
        )}
      </header>

      {/* UPCOMING — empty state */}
      {isUpcoming && (
        <section className="bg-[color:var(--cream-deep)]/30 border border-[color:var(--green-forest)]/20 p-8 text-center">
          <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.24em' }}>
            Coming up
          </p>
          <p className="serif text-lg text-[color:var(--green-deep)]">
          {isMajor ? 'Draft happens before tee time. Check back when scoring begins.' : 'Rosters carry over from this flight\u2019s major. Bonuses score during the event.'}
          </p>
        </section>
      )}

      {!isUpcoming && (
        <>
          {/* PODIUM + MAJOR WINNER */}
          {(podium.length > 0) && (
            <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-stretch">
              <div className="grid grid-cols-3 gap-3">
                {podium.map((r, i) => {
                  const labelColor = i === 0 ? 'var(--gold-masters)' : i === 1 ? 'var(--silver)' : 'var(--bronze)';
                  const labelText = i === 0 ? 'Winner' : i === 1 ? '2nd' : '3rd';
                  return (
                    <div key={r.owner_id}
                      className="p-4 bg-[color:var(--cream)] border border-[color:var(--green-forest)]/15"
                      style={i === 0
                        ? { borderTop: `3px solid ${labelColor}` }
                        : { borderTop: `2px solid ${labelColor}` }}>
                      <p className="text-[10px] uppercase" style={{ letterSpacing: '0.24em', color: labelColor }}>{labelText}</p>
                      <p className="serif text-xl text-[color:var(--green-deep)] font-semibold mt-1">{r.owner_name}</p>
                      <p className="text-sm tabular text-[color:var(--green-moss)] mt-0.5">{formatScore(r.total_score)}</p>
                    </div>
                  );
                })}
              </div>
              {major_winner && isMajor && (
                <div className="p-4 max-w-xs flex flex-col justify-center bg-[color:var(--cream)] border border-[color:var(--green-forest)]/15"
                  style={{ borderLeft: `3px solid ${primary}` }}>
                  <p className="text-[10px] uppercase" style={{ letterSpacing: '0.24em', color: primary }}>Major Winner Pot</p>
                  <p className="serif text-base mt-1 text-[color:var(--green-deep)]">{major_winner.golfer_name}</p>
                  <p className="text-xs italic text-[color:var(--green-moss)]">on {major_winner.owner_name}'s roster</p>
                </div>
              )}
            </section>
          )}

          {/* STANDINGS TABLE */}
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="serif text-2xl font-semibold" style={{ color: primary }}>Standings</h2>
              <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                Click to sort
              </span>
            </div>
            <div className="bg-[color:var(--cream-deep)]/30 overflow-x-auto" style={{ borderTop: `2px solid ${primary}` }}>
              <div className="min-w-[800px]">
                <div className="grid gap-2 px-4 py-2 border-b border-[color:var(--green-forest)]/15"
                  style={{ gridTemplateColumns: '40px minmax(180px, 1fr) repeat(4, 60px) 60px 80px' }}>
                  <SortHeader k="rank" label="#" />
                  <SortHeader k="name" label="Owner" />
                  <SortHeader k="th" label="Thu" align="right" />
                  <SortHeader k="fr" label="Fri" align="right" />
                  <SortHeader k="sa" label="Sat" align="right" />
                  <SortHeader k="su" label="Sun" align="right" />
                  <SortHeader k="bonus" label="Bonus" align="right" />
                  <SortHeader k="total" label="Total" align="right" />
                </div>

                {sortedRosters.map((r) => {
                  const rank = r.is_tied ? `T${r.rank}` : r.rank;
                  const isLeader = r.rank === 1 && r.total_score > 0;
                  return (
                    <div key={r.owner_id}
                      className="grid gap-2 px-4 py-2 border-b border-[color:var(--green-forest)]/10 items-baseline hover:bg-[color:var(--cream-deep)]/60"
                      style={{ gridTemplateColumns: '40px minmax(180px, 1fr) repeat(4, 60px) 60px 80px', background: isLeader ? 'var(--cream-deep)' : 'transparent' }}>
                      <span className="serif text-sm tabular" style={{ color: isLeader ? primary : 'var(--green-moss)' }}>{rank}</span>
                      <span className={`serif text-sm ${isLeader ? 'font-semibold' : ''}`} style={{ color: isLeader ? primary : 'var(--green-deep)' }}>{r.owner_name}</span>
                      {r.daily_scores.map((d) => (
                        <span key={d.day} className={`text-xs tabular text-right ${d.score && d.score > 0 ? 'text-[color:var(--green-deep)]' : 'text-[color:var(--green-moss)]/50'}`}>
                          {dailyDisplay(d.score)}
                        </span>
                      ))}
                      <span className="text-xs tabular text-right" style={{ color: r.bonus_total > 0 ? secondary : 'var(--green-moss)', fontWeight: r.bonus_total > 0 ? 600 : 400 }}>
                        {r.bonus_total > 0 ? `+${r.bonus_total}` : '—'}
                      </span>
                      <span className="text-base tabular text-right font-semibold" style={{ color: isLeader ? primary : r.total_score > 0 ? 'var(--green-deep)' : 'var(--green-moss)' }}>
                        {formatScore(r.total_score)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PER-OWNER ROSTER DETAIL */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="serif text-2xl font-semibold" style={{ color: primary }}>Rosters</h2>
              <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                {sortedRosters.length} owners · counted scores in venue color
              </span>
            </div>
            <div className="space-y-6">
              {sortedRosters.map((r) => {
                const rankLabel = r.is_tied ? `T${r.rank}` : r.rank;
                const isLeader = r.rank === 1 && r.total_score > 0;
                return (
                  <div key={r.owner_id} className="bg-[color:var(--cream)] border border-[color:var(--green-forest)]/15 p-5"
                    style={isLeader ? { borderLeft: `3px solid ${secondary}` } : {}}>
                    <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-[color:var(--green-forest)]/15 flex-wrap gap-2">
                      <div className="flex items-baseline gap-3">
                        <span className="serif text-sm tabular" style={{ color: isLeader ? primary : 'var(--green-moss)' }}>#{rankLabel}</span>
                        <h3 className={`serif text-xl font-semibold ${isLeader ? '' : 'text-[color:var(--green-deep)]'}`} style={isLeader ? { color: primary } : {}}>{r.owner_name}</h3>
                        {r.nickname && r.nickname !== r.owner_name && (
                          <span className="text-xs text-[color:var(--green-moss)] italic">({r.nickname})</span>
                        )}
                      </div>
                      <span className="text-xl tabular font-semibold" style={{ color: isLeader ? primary : r.total_score > 0 ? 'var(--green-deep)' : 'var(--green-moss)' }}>
                        {formatScore(r.total_score)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[700px]">
                        <div className="grid gap-2 py-1 border-b border-[color:var(--green-forest)]/10 text-[10px] uppercase text-[color:var(--green-moss)]"
                          style={{ gridTemplateColumns: 'minmax(180px, 1fr) 60px repeat(4, 50px) 60px', letterSpacing: '0.18em' }}>
                          <span>Golfer</span>
                          <span className="text-right">Cost</span>
                          <span className="text-right">Thu</span>
                          <span className="text-right">Fri</span>
                          <span className="text-right">Sat</span>
                          <span className="text-right">Sun</span>
                          <span className="text-right">Counted</span>
                        </div>
                        {r.golfers.map((g) => (
                          <div key={g.golfer_id} className="grid gap-2 py-1.5 border-b border-[color:var(--green-forest)]/5 items-baseline"
                            style={{ gridTemplateColumns: 'minmax(180px, 1fr) 60px repeat(4, 50px) 60px' }}>
                            <span className="serif text-sm text-[color:var(--green-deep)]">
                              {g.is_keeper && <span className="mr-1 text-[9px] uppercase font-semibold" style={{ color: secondary, letterSpacing: '0.15em' }}>K</span>}
                              {g.full_name}
                            </span>
                            <span className="text-xs tabular text-[color:var(--green-moss)] text-right">${g.purchase_price}</span>
                            {g.day_scores.map((ds) => (
                              <span key={ds.day} className={`text-xs tabular text-right ${
                                ds.raw_score === null ? 'text-[color:var(--green-moss)]/30' :
                                ds.counted ? 'font-semibold px-1' :
                                'text-[color:var(--green-moss)]/40'
                              }`}
                              style={ds.counted && ds.raw_score !== null ? { color: primary, background: `${primary}10` } : {}}>
                                {ds.raw_score === null ? '—' : formatScore(ds.raw_score)}
                              </span>
                            ))}
                            <span className={`text-xs tabular text-right ${g.best_round_total > 0 ? 'font-semibold' : 'text-[color:var(--green-moss)]/50'}`} style={g.best_round_total > 0 ? { color: primary } : {}}>
                              {g.best_round_total > 0 ? `+${g.best_round_total}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {r.bonuses.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[color:var(--green-forest)]/10">
                        <p className="text-[10px] uppercase mb-2" style={{ letterSpacing: '0.18em', color: secondary }}>Bonuses · +{r.bonus_total}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {r.bonuses.map((b, i) => (
                            <div key={i} className="text-xs">
                              <span className="serif text-[color:var(--green-deep)]">{b.detail}</span>
                              <span className="tabular ml-1.5 font-semibold" style={{ color: secondary }}>+{b.points}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.golfers.length === 0 && (
                      <p className="text-xs text-[color:var(--green-moss)] italic serif py-3">No roster recorded.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}