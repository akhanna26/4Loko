import {
  getTournaments,
  getActiveOwners,
  getLiveYearlong,
  getEventScores,
} from '../lib/queries';
import { getMajorAccent } from '../components/Emblems';
import Link from 'next/link';
import StandingsExpandable from './StandingsExpandable';
import { getOwnerTheme } from '../lib/owner-themes';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function daysUntil(iso: string): number {
  const d = new Date(iso).getTime() - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
}

const EVENT_ORDER = [
  { name: 'The Masters',                  short: 'Mas',   type: 'MAJOR' as const },
  { name: 'RBC Heritage',                 short: 'RBC',   type: 'PGA'   as const },
  { name: 'PGA Championship',             short: 'PGA',   type: 'MAJOR' as const },
  { name: 'Memorial Tournament',          short: 'Mem',   type: 'PGA'   as const },
  { name: 'US Open',                      short: 'USO',   type: 'MAJOR' as const },
  { name: 'Travelers Championship',       short: 'Trav',  type: 'PGA'   as const },
  { name: 'The Open Championship',        short: 'Open',  type: 'MAJOR' as const },
  { name: 'FedEx St. Jude Championship',  short: 'FedEx', type: 'PGA'   as const },
];

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join('').toUpperCase();

const shortName = (name: string) => {
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
};

export default async function SeasonPage() {
  const [tournaments, owners, standings, eventScores] = await Promise.all([
    getTournaments(),
    getActiveOwners(),
    getLiveYearlong(),
    getEventScores(),
  ]);

  const liveTournament = tournaments.find((t) => t.status === 'live');
  const nextUpcoming = tournaments.find((t) => t.status === 'upcoming');
  const lastFinal = [...tournaments].reverse().find((t) => t.status === 'final');

  const isDraftWeek = nextUpcoming && nextUpcoming.event_type === 'MAJOR' && daysUntil(nextUpcoming.start_date) <= 7 && daysUntil(nextUpcoming.start_date) >= 0;
  const isLive = !!liveTournament;
  const heroAccent = isLive ? getMajorAccent(liveTournament.name) : (nextUpcoming ? getMajorAccent(nextUpcoming.name) : null);

  const flightPairs: { major: typeof eventScores[number]; elevated: typeof eventScores[number] | null }[] = [];
  let pendingMajor: typeof eventScores[number] | null = null;
  for (const e of eventScores) {
    if (e.event_type === 'MAJOR') {
      if (pendingMajor) flightPairs.push({ major: pendingMajor, elevated: null });
      pendingMajor = e;
    } else {
      if (pendingMajor) {
        flightPairs.push({ major: pendingMajor, elevated: e });
        pendingMajor = null;
      }
    }
  }
  if (pendingMajor) flightPairs.push({ major: pendingMajor, elevated: null });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">
      <section className="mb-10 sm:mb-14">
        {isLive ? (
          <LiveHero tournament={liveTournament} accent={heroAccent} />
        ) : isDraftWeek ? (
          <DraftWeekHero tournament={nextUpcoming} accent={heroAccent} />
        ) : nextUpcoming ? (
          <BrandHero nextUpcoming={nextUpcoming} accent={heroAccent} />
        ) : lastFinal ? (
          <SeasonConcludedHero lastFinal={lastFinal} />
        ) : null}
      </section>

      <StandingsExpandable
        standings={standings}
        eventOrder={EVENT_ORDER}
        tournamentStatusByName={Object.fromEntries(tournaments.map((t) => [t.name, t.status]))}
      />

      <section className="mb-12 sm:mb-16 mt-12 sm:mt-16">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6 gap-2">
          <h2 className="serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none" style={{ letterSpacing: '-0.02em' }}>Calendar</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            {tournaments.length} events · 4 flights
          </span>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid rgba(14, 42, 74, 0.2)',
          boxShadow: '0 2px 8px rgba(14, 42, 74, 0.06)',
          padding: '16px',
        }}>
          <div className="space-y-3">
            {flightPairs.map((pair, idx) => {
              const accent = getMajorAccent(pair.major.tournament_name);
              const flightNum = idx + 1;
              const bracketColor = accent?.bracket ?? 'var(--green-deep)';
              const tournamentMajor = tournaments.find((t) => t.id === pair.major.tournament_id);
              const tournamentElevated = pair.elevated ? tournaments.find((t) => t.id === pair.elevated!.tournament_id) : null;

              return (
                <div key={pair.major.tournament_id}
                  style={{
                    background: 'rgba(245, 241, 230, 0.5)',
                    borderLeft: `3px solid ${bracketColor}`,
                    padding: '12px 16px 12px 24px',
                    position: 'relative',
                  }}>
                  <div className="absolute -left-[3px] top-3 w-2 sm:w-3 h-px" style={{ background: bracketColor }} />
                  <div className="absolute -left-[3px] bottom-3 w-2 sm:w-3 h-px" style={{ background: bracketColor }} />
                  <p className="text-[9px] uppercase mb-2 mt-1"
                    style={{ letterSpacing: '0.32em', color: bracketColor }}>
                    Flight {flightNum}
                  </p>

                  <EventCard event={pair.major} tournament={tournamentMajor} accent={accent} isMajor />

                  {pair.elevated && (
                    <div className="ml-2 sm:ml-4 mt-1 mb-3">
                      <EventCard event={pair.elevated} tournament={tournamentElevated} accent={accent} isMajor={false} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
          <h2 className="serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none" style={{ letterSpacing: '-0.02em' }}>Field</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            {owners.length} owners
          </span>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid rgba(14, 42, 74, 0.2)',
          boxShadow: '0 2px 8px rgba(14, 42, 74, 0.06)',
          padding: '16px',
        }}>
          <div style={{ background: 'rgba(245, 241, 230, 0.5)', padding: '16px' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {owners.map((o) => {
                const theme = getOwnerTheme(o.name);
                return (
                  <div key={o.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5"
                    style={{
                      background: 'white',
                      border: `1px solid ${theme.primary}30`,
                      borderLeft: `3px solid ${theme.primary}`,
                    }}>
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center text-[10px] sm:text-xs tabular font-semibold shadow-sm shrink-0"
                      style={{
                        letterSpacing: '0.05em',
                        background: theme.primary,
                        border: `2px solid ${theme.secondary}`,
                      }}
                    >
                      {initials(o.name)}
                    </div>
                    <span className="serif text-xs sm:text-sm text-[color:var(--green-deep)] truncate">{o.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BrandHero({ nextUpcoming, accent }: { nextUpcoming: any; accent: any }) {
  return (
    <div className="text-center pt-4 pb-8 sm:pt-6 sm:pb-10 border-b border-[color:var(--green-forest)]/15">
      <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.32em' }}>
        Volume IV · The 2026 Season
      </p>
      <h1 className="mt-4 sm:mt-6 mb-2 leading-none flex items-center justify-center gap-2 sm:gap-4">
        <span className="text-4xl sm:text-7xl font-light text-[color:var(--green-deep)]" style={{ letterSpacing: '-0.02em' }}>F</span>
        <span className="inline-flex items-center" style={{ marginBottom: '0.05em' }}>
          <svg className="w-8 h-8 sm:w-14 sm:h-14 text-[color:var(--gold-masters)]" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="30" cy="30" r="22" />
            <line x1="30" y1="14" x2="30" y2="46" />
            <path d="M30 18 L42 22 L30 26 Z" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="text-4xl sm:text-7xl font-light text-[color:var(--green-deep)]" style={{ letterSpacing: '-0.02em' }}>RE LOKOS</span>
      </h1>
      <div className="flex items-center justify-center gap-1 mt-1">
        {[0, 1, 2, 3].map((i) => (
          <svg key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[color:var(--chicago-red)]" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 0 L7 4 L11 5 L8 7 L9 11 L6 9 L3 11 L4 7 L1 5 L5 4 Z" />
          </svg>
        ))}
      </div>
      <p className="mt-6 sm:mt-8 serif italic text-sm sm:text-base text-[color:var(--green-moss)] px-2">
        Up next: <span className="text-[color:var(--green-deep)] not-italic font-semibold">{nextUpcoming.name}</span>
        <span className="hidden sm:inline">
          <span className="mx-2 text-[color:var(--green-forest)]/40">·</span>
          {nextUpcoming.venue}
        </span>
        <span className="mx-1.5 sm:mx-2 text-[color:var(--green-forest)]/40">·</span>
        {Math.max(0, daysUntil(nextUpcoming.start_date))}d
      </p>
    </div>
  );
}

function DraftWeekHero({ tournament, accent }: { tournament: any; accent: any }) {
  const days = Math.max(0, daysUntil(tournament.start_date));
  const primary = accent?.primary ?? 'var(--green-deep)';
  return (
    <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm p-6 sm:p-10 relative"
      style={{
        borderTop: `3px solid ${primary}`,
      }}>
      <p className="text-[9px] sm:text-[10px] uppercase mb-3" style={{ letterSpacing: '0.32em', color: primary }}>
        Draft Week · Bidding Wednesday
      </p>
      <h1 className="font-light leading-none text-3xl sm:text-7xl text-[color:var(--green-deep)] break-words" style={{ letterSpacing: '-0.02em' }}>
        {tournament.name.toUpperCase()}
      </h1>
      <p className="serif italic text-xs sm:text-sm text-[color:var(--green-moss)] mt-3 sm:mt-4">
        {tournament.venue} · tees off in {days} {days === 1 ? 'day' : 'days'}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-5 sm:mt-6">
        <Link href="/keepers" className="text-[10px] uppercase border-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-[color:var(--cream-deep)] transition-colors"
          style={{ letterSpacing: '0.18em', color: primary, borderColor: primary }}>
          Declare keeper →
        </Link>
        <Link href="/draft" className="text-[10px] uppercase border-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-[color:var(--cream-deep)] transition-colors"
          style={{ letterSpacing: '0.18em', color: primary, borderColor: primary }}>
          Open auction arena →
        </Link>
      </div>
    </div>
  );
}

function LiveHero({ tournament, accent }: { tournament: any; accent: any }) {
  const primary = accent?.primary ?? 'var(--gold-masters)';
  return (
    <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm p-6 sm:p-10 relative"
      style={{
        borderTop: `3px solid ${primary}`,
      }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[color:var(--chicago-red)] live-pulse" />
        <span className="text-[9px] sm:text-[10px] uppercase tabular text-[color:var(--chicago-red)]" style={{ letterSpacing: '0.32em' }}>
          Live · Round In Progress
        </span>
      </div>
      <h1 className="font-light leading-none text-3xl sm:text-7xl text-[color:var(--green-deep)] break-words" style={{ letterSpacing: '-0.02em' }}>
        {tournament.name.toUpperCase()}
      </h1>
      <p className="serif italic text-xs sm:text-sm text-[color:var(--green-moss)] mt-3 sm:mt-4">
        {tournament.venue}
      </p>
      <Link href={`/tournament/${tournament.id}`} className="inline-block mt-5 sm:mt-6 text-[10px] uppercase border-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-[color:var(--cream-deep)] transition-colors"
        style={{ letterSpacing: '0.18em', color: primary, borderColor: primary }}>
        Open leaderboard →
      </Link>
    </div>
  );
}

function SeasonConcludedHero({ lastFinal }: { lastFinal: any }) {
  return (
    <div className="bg-[color:var(--cream-deep)]/40 border border-[color:var(--green-forest)]/25 p-6">
      <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.24em' }}>
        The Season Has Concluded
      </p>
      <h2 className="serif text-2xl sm:text-3xl text-[color:var(--green-deep)]">{lastFinal.name} · Final</h2>
    </div>
  );
}

function EventCard({ event, tournament, accent, isMajor }: any) {
  const isFinal = event.status === 'final';
  const isLive = event.status === 'live';

  const winner = event.ranks.find((r: any) => r.rank === 1);
  const second = event.ranks.find((r: any) => r.rank === 2);
  const third = event.ranks.find((r: any) => r.rank === 3);
  const otherScorers = event.ranks.filter((r: any) => r.score > 0 && r.rank > 3);

  const formatScore = (s: number) => s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`;

  return (
    <Link href={`/tournament/${event.tournament_id}`}
      className="block bg-[color:var(--cream)] border border-[color:var(--green-forest)]/15 hover:shadow-md transition-shadow"
      style={isMajor && accent ? { borderLeft: `4px solid ${accent.primary}` } : {}}>
      <div className="px-3 sm:px-5 py-3 sm:py-4">
        <div className="flex items-baseline justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              {accent && <accent.Emblem className="emblem" />}
              <span className={`serif ${isMajor ? 'text-lg sm:text-2xl text-[color:var(--green-deep)] font-semibold' : 'text-sm sm:text-base text-[color:var(--green-forest)]'}`}>
                {event.tournament_name}
              </span>
              {isMajor && accent && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 text-[color:var(--cream)]"
                  style={{ background: accent.primary, letterSpacing: '0.18em' }}>
                  Major
                </span>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[color:var(--green-moss)] mt-1 truncate">
              {tournament?.venue} · {formatDate(event.start_date)}
            </div>
          </div>
          <span
            className={`text-[9px] sm:text-[10px] uppercase tabular shrink-0 ${
              isFinal ? 'text-[color:var(--green-moss)]' :
              isLive ? 'text-[color:var(--chicago-red)] live-pulse' :
              'text-[color:var(--green-forest)]/50'
            }`}
            style={{ letterSpacing: '0.24em' }}
          >
            {event.status}
          </span>
        </div>

        {isFinal && isMajor && winner && (
          <div className="mt-3 pt-3 border-t border-[color:var(--green-forest)]/10">
            <div className="flex items-baseline gap-x-4 sm:gap-x-6 gap-y-1 flex-wrap">
              <Podium rank={1} owner_name={winner.owner_name} score={winner.score} />
              {second && <Podium rank={2} owner_name={second.owner_name} score={second.score} />}
              {third && <Podium rank={3} owner_name={third.owner_name} score={third.score} />}
            </div>
            {otherScorers.length > 0 && (
              <div className="mt-2 text-[10px] uppercase text-[color:var(--green-moss)] flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-0.5" style={{ letterSpacing: '0.18em' }}>
                <span className="text-[color:var(--green-forest)]/60">The rest</span>
                {otherScorers.map((r: any) => (
                  <span key={r.owner_name}>
                    {shortName(r.owner_name)} <span className="tabular">({formatScore(r.score)})</span>
                  </span>
                ))}
              </div>
            )}
            {event.major_winner_golfer && event.major_winner_owner && (
              <p className="mt-2 text-[11px] sm:text-xs text-[color:var(--green-moss)] serif italic">
                Major winner: {event.major_winner_golfer} ({event.major_winner_owner})
              </p>
            )}
          </div>
        )}

        {isFinal && !isMajor && otherScorers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[color:var(--green-forest)]/10">
            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-1" style={{ letterSpacing: '0.18em' }}>Bonuses</p>
            <div className="flex items-baseline gap-x-3 sm:gap-x-4 gap-y-0.5 flex-wrap text-[11px] sm:text-xs">
              {event.ranks.filter((r: any) => r.score > 0).map((r: any) => (
                <span key={r.owner_name} className="serif">
                  {shortName(r.owner_name)} <span className="tabular text-[color:var(--chicago-red)]">+{r.score}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function Podium({ rank, owner_name, score }: { rank: number; owner_name: string; score: number }) {
  const labelColor = rank === 1 ? 'text-[color:var(--gold-masters)]' : rank === 2 ? 'text-[color:var(--silver)]' : 'text-[color:var(--bronze)]';
  const labelText = rank === 1 ? 'Winner' : rank === 2 ? '2nd' : '3rd';
  const nameSize = rank === 1 ? 'text-base sm:text-lg' : rank === 2 ? 'text-sm sm:text-base' : 'text-sm';
  const formatScore = (s: number) => s > 0 ? `+${s}` : s === 0 ? 'E' : `${s}`;

  return (
    <div className="flex items-baseline gap-1.5 sm:gap-2">
      <span className={`text-[9px] sm:text-[10px] uppercase ${labelColor}`} style={{ letterSpacing: '0.18em' }}>{labelText}</span>
      <span className={`serif ${nameSize} text-[color:var(--green-deep)] ${rank === 1 ? 'font-semibold' : ''}`}>{owner_name}</span>
      <span className="text-[11px] sm:text-xs tabular text-[color:var(--green-moss)]">{formatScore(score)}</span>
    </div>
  );
}
