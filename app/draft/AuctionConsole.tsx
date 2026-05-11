'use client';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { Owner, StandingRank } from '../../lib/queries';
import {
  AuctionSession, AuctionBid, OwnerState, GolferPoolEntry,
  getAuctionBids, getOwnerStates, getGolferPool, getAuctionSession,
  recordSale, undoSale, setMeetingUrl,
  setNominationOrder, shuffleArray,
  getCurrentNominator, getUpcomingNominators,
  applyKeepersToAuction, shortName,
  getFullSnakeOrder,
} from '../../lib/auction';
import { getFlight } from '../../lib/draft';
import { getOwnerTheme } from '../../lib/owner-themes';

function RankBadge({ rank }: { rank: StandingRank | undefined }) {
  if (!rank || rank.rank === null) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--green-forest)]/30 border border-white text-white text-[9px] font-semibold shrink-0">
        —
      </span>
    );
  }
  const text = `${rank.is_tied ? 'T' : ''}${rank.rank}`;
  const fontSize = text.length >= 3 ? 'text-[7px]' : 'text-[9px]';
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--green-deep)] border border-white text-white ${fontSize} font-bold tabular shrink-0`}
      title={rank.is_fallback ? `Last season's rank` : `This year's rank`}
    >
      {text}
    </span>
  );
}

const SHORT_NAME: Record<string, string> = {
  'Daniel Petric': 'Petric',
  'Michael H. Murnane': 'Murn',
  'Joseph Babyar': 'Joey',
  'Benjamin Nagle': 'Nagle',
  'Joshua Dunn': 'Josh',
  'Donald J. Dunn': 'DJ',
  'Nicholas Tuminello': 'Tumi',
  'Anshu Khanna': 'Anshu',
  'Patrick Dillon': 'Pat',
  'Kyle Stofko': 'Kyle',
  'Zachary Stierhoff': 'Z',
  'Conor Murnane': 'Conor',
  'Cory R. Waite': 'Cor Cor',
};
const colHeader = (name: string) => SHORT_NAME[name] ?? name.split(/\s+/)[0];

// Conditional formatting for remaining budget
function budgetVisuals(remaining: number, starting: number = 75) {
  const pct = Math.max(0, Math.min(100, (remaining / starting) * 100));
  let textCls = '';
  let barCls = '';
  if (remaining >= 60)      { textCls = 'text-[color:var(--green-deep)]';     barCls = 'bg-[color:var(--green-deep)]'; }
  else if (remaining >= 40) { textCls = 'text-[color:var(--green-forest)]';   barCls = 'bg-[color:var(--green-forest)]'; }
  else if (remaining >= 20) { textCls = 'text-[#9a7a00]';                     barCls = 'bg-[color:var(--gold-masters)]'; }
  else if (remaining >= 1)  { textCls = 'text-[color:var(--chicago-red)]';    barCls = 'bg-[color:var(--chicago-red)]'; }
  else                      { textCls = 'text-[color:var(--chicago-red)] font-bold'; barCls = 'bg-[color:var(--chicago-red)]'; }
  return { textCls, barCls, pct };
}

function BudgetMeter({ remaining, starting = 75, showAmount = true, size = 'sm' }: { remaining: number; starting?: number; showAmount?: boolean; size?: 'xs' | 'sm' | 'md' }) {
  const v = budgetVisuals(remaining, starting);
  const heightCls = size === 'xs' ? 'h-0.5' : size === 'sm' ? 'h-1' : 'h-1.5';
  const textCls = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-[11px]' : 'text-sm';
  return (
    <div className="flex flex-col items-stretch gap-0.5 w-full">
      {showAmount && (
        <div className={`tabular ${textCls} ${v.textCls} font-semibold leading-none`}>
          ${remaining}
        </div>
      )}
      <div className={`${heightCls} bg-[color:var(--green-forest)]/15 rounded-full overflow-hidden`}>
        <div className={`h-full ${v.barCls} transition-all duration-500 rounded-full`} style={{ width: `${v.pct}%` }} />
      </div>
    </div>
  );
}

export default function AuctionConsole({
  flightId, flightName, sessionId,
  initialSession, owners, initialBids, initialOwnerStates, initialPool,
  ranks,
}: {
  flightId: number; flightName: string; sessionId: number;
  initialSession: AuctionSession;
  owners: Owner[];
  initialBids: AuctionBid[];
  initialOwnerStates: OwnerState[];
  initialPool: GolferPoolEntry[];
  ranks: StandingRank[];
}) {
  const [session, setSession] = useState(initialSession);
  const [bids, setBids] = useState(initialBids);
  const [ownerStates, setOwnerStates] = useState(initialOwnerStates);
  const [pool, setPool] = useState(initialPool);

  const [isDriver, setIsDriver] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);

  const [nominatedGolferId, setNominatedGolferId] = useState<number | null>(null);
  const [currentBid, setCurrentBid] = useState<string>('');
  const [currentBidderId, setCurrentBidderId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [poolFilter, setPoolFilter] = useState('');

  // Mobile collapse states
  const [showSnake, setShowSnake] = useState(false);
  const [showRosters, setShowRosters] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('forelokos_driver') : null;
    if (stored === 'true') setIsDriver(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      try {
        const [s, b, os, p] = await Promise.all([
          getAuctionSession(flightId),
          getAuctionBids(flightId),
          getOwnerStates(flightId),
          getGolferPool(flightId),
        ]);
        if (!mounted) return;
        if (s) setSession(s);
        setBids(b);
        setOwnerStates(os);
        setPool(p);
      } catch {}
    };
    const interval = setInterval(tick, 4000);
    return () => { mounted = false; clearInterval(interval); };
  }, [flightId]);

  const enterDriverMode = () => {
    setIsDriver(true);
    if (typeof window !== 'undefined') localStorage.setItem('forelokos_driver', 'true');
    setShowDriverModal(false);
  };
  const exitDriverMode = () => {
    setIsDriver(false);
    if (typeof window !== 'undefined') localStorage.removeItem('forelokos_driver');
  };

  const ownerById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const ownerStateById = useMemo(() => new Map(ownerStates.map((s) => [s.owner_id, s])), [ownerStates]);
  const rankByOwner = useMemo(() => new Map(ranks.map((r) => [r.owner_id, r])), [ranks]);

  const orderedOwners = useMemo(() => {
    if (!session.nomination_order || session.nomination_order.length === 0) return owners;
    const n = session.nomination_order.length;
    const round = Math.floor(session.current_pick / n);
    const dir = round % 2 === 0 ? session.nomination_order : [...session.nomination_order].reverse();
    const ordered = dir.map((id) => owners.find((o) => o.id === id)).filter(Boolean) as typeof owners;
    const inOrder = new Set(ordered.map((o) => o.id));
    return [...ordered, ...owners.filter((o) => !inOrder.has(o.id))];
  }, [owners, session.nomination_order, session.current_pick]);

  const bidByGolfer = useMemo(() => {
    const m = new Map<number, AuctionBid>();
    for (const b of bids.filter((b) => b.is_active)) m.set(b.golfer_id, b);
    return m;
  }, [bids]);

  const bidsByOwner = useMemo(() => {
    const m = new Map<number, AuctionBid[]>();
    for (const b of bids.filter((b) => b.is_active)) {
      if (!m.has(b.owner_id)) m.set(b.owner_id, []);
      m.get(b.owner_id)!.push(b);
    }
    for (const arr of Array.from(m.values())) {
      arr.sort((a, b) => Number(b.amount) - Number(a.amount));
    }
    return m;
  }, [bids]);

  const currentNominatorId = getCurrentNominator(session.nomination_order, session.current_pick);
  const currentNominator = currentNominatorId ? ownerById.get(currentNominatorId) : null;
  const upcomingIds = getUpcomingNominators(session.nomination_order, session.current_pick + 1, 4);
  const upcoming = upcomingIds.map((id) => ownerById.get(id)).filter(Boolean) as Owner[];

  const fullSnake = useMemo(
    () => getFullSnakeOrder(session.nomination_order, session.current_pick, 10),
    [session.nomination_order, session.current_pick]
  );

  const filteredPool = useMemo(() => pool.filter((g) =>
    !poolFilter || g.full_name.toLowerCase().includes(poolFilter.toLowerCase())
  ), [pool, poolFilter]);

  const nominatedGolfer = nominatedGolferId ? pool.find(g => g.golfer_id === nominatedGolferId) : null;
  const currentBidder = currentBidderId ? ownerById.get(currentBidderId) : null;

  const lastSale = useMemo(() => {
    const active = bids.filter(b => b.is_active && !b.is_keeper);
    return active.length > 0 ? active[active.length - 1] : null;
  }, [bids]);

  // Actions
  const handleNominate = (golferId: number) => {
    if (!isDriver) return;
    const golfer = pool.find(g => g.golfer_id === golferId);
    if (!golfer || !golfer.is_available) return;
    setNominatedGolferId(golferId);
    setCurrentBid('');
    setCurrentBidderId(null);
    setError(null);
  };
  const handleClearNomination = () => {
    setNominatedGolferId(null);
    setCurrentBid('');
    setCurrentBidderId(null);
    setError(null);
  };
  const bumpBid = (newAmount: string, newBidderId: number | null) => {
    setCurrentBid(newAmount);
    if (newBidderId !== null) setCurrentBidderId(newBidderId);
    setError(null);
  };
  const handleSold = () => {
    setError(null);
    if (!isDriver) { setError('Take the wheel first'); return; }
    if (nominatedGolferId === null) { setError('No golfer on the floor'); return; }
    if (currentBidderId === null) { setError('Pick a high bidder'); return; }
    const amt = parseInt(currentBid, 10);
    if (isNaN(amt) || amt < 0) { setError('Enter the winning bid'); return; }
    const ownerState = ownerStateById.get(currentBidderId);
    if (ownerState && amt > ownerState.remaining) {
      setError(`${ownerById.get(currentBidderId)?.name}: over budget by $${amt - ownerState.remaining}`);
    }
    const cellKey = `${nominatedGolferId}-${currentBidderId}`;
    const golferName = nominatedGolfer?.full_name ?? '';
    const ownerName = ownerById.get(currentBidderId)?.name ?? '';
    startTransition(async () => {
      try {
        await recordSale({
          session_id: sessionId, flight_id: flightId,
          golfer_id: nominatedGolferId, owner_id: currentBidderId,
          amount: amt, pick_order: session.current_pick,
        });
        setBids((prev) => [...prev, {
          id: -Date.now(), flight_id: flightId, golfer_id: nominatedGolferId,
          owner_id: currentBidderId, amount: amt, pick_order: session.current_pick,
          is_keeper: false, is_active: true,
          golfer_name: golferName, owner_name: ownerName,
          created_at: new Date().toISOString(),
        }]);
        setSession((s) => ({ ...s, current_pick: s.current_pick + 1 }));
        setFlashCell(cellKey);
        setTimeout(() => setFlashCell(null), 1500);
        setNominatedGolferId(null);
        setCurrentBid('');
        setCurrentBidderId(null);
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleUndoLast = () => {
    if (!isDriver) return;
    const activeBids = bids.filter((b) => b.is_active && !b.is_keeper);
    if (activeBids.length === 0) { setError('Nothing to undo'); return; }
    const last = activeBids[activeBids.length - 1];
    if (!confirm(`Undo: ${last.golfer_name} → ${last.owner_name} for $${last.amount}?`)) return;
    startTransition(async () => {
      try {
        await undoSale(last.id, sessionId);
        setBids((prev) => prev.filter((b) => b.id !== last.id));
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleUndoPick = (bidId: number, label: string) => {
    if (!isDriver) return;
    if (!confirm(`Undo: ${label}?`)) return;
    startTransition(async () => {
      try {
        await undoSale(bidId, sessionId);
        setBids((prev) => prev.filter((b) => b.id !== bidId));
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleRandomize = () => {
    if (!isDriver) return;
    if (session.nomination_order && !confirm('Re-randomize nomination order?')) return;
    const order = shuffleArray(owners.map((o) => o.id));
    startTransition(async () => {
      try {
        await setNominationOrder(sessionId, order);
        setSession((s) => ({ ...s, nomination_order: order }));
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleApplyKeepers = async () => {
    if (!isDriver) return;
    if (!confirm('Apply declared keepers? This pre-populates rosters with kept golfers at original prices.')) return;
    startTransition(async () => {
      try {
        const prevFlight = await getFlight(2026, 1);
        if (!prevFlight) { setError('Masters flight not found'); return; }
        const result = await applyKeepersToAuction(flightId, prevFlight.id);
        setInfo(`Applied ${result.applied} keeper${result.applied === 1 ? '' : 's'}.`);
        setTimeout(() => setInfo(null), 4000);
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleUndoAllKeepers = () => {
    if (!isDriver) return;
    const keeperBids = bids.filter((b) => b.is_active && b.is_keeper);
    if (keeperBids.length === 0) return;
    if (!confirm(`Clear all ${keeperBids.length} keeper${keeperBids.length === 1 ? '' : 's'}? Owners get their budget back.`)) return;
    startTransition(async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        await supabase.from('auction_bids').update({ is_active: false }).eq('flight_id', flightId).eq('is_keeper', true).eq('is_active', true);
        const golferIds = keeperBids.map((b) => b.golfer_id);
        await supabase.from('flight_pools').update({ is_available: true }).eq('flight_id', flightId).in('golfer_id', golferIds);
        await supabase.from('auction_sessions').update({ current_pick: 0 }).eq('id', sessionId);
        setBids((prev) => prev.map((b) => b.is_keeper ? { ...b, is_active: false } : b));
        setSession((s) => ({ ...s, current_pick: 0 }));
      } catch (e: any) { setError(e.message); }
    });
  };
  const handleSkipNomination = () => {
    if (!isDriver) return;
    if (!confirm(`Skip ${currentNominator ? shortName(currentNominator.name) : 'this nominator'}? Order will advance.`)) return;
    startTransition(async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        await supabase.from('auction_sessions').update({ current_pick: session.current_pick + 1, current_golfer_id: null }).eq('id', sessionId);
        setSession((s) => ({ ...s, current_pick: s.current_pick + 1, current_golfer_id: null }));
        setNominatedGolferId(null);
        setCurrentBid('');
        setCurrentBidderId(null);
      } catch (e: any) { setError(e.message); }
    });
  };

  const hasKeepersApplied = bids.some((b) => b.is_keeper && b.is_active);
  const startingBudget = Number(session.starting_budget) || 75;
  const currentRoundLabel = (() => {
    const n = session.nomination_order?.length ?? 12;
    const r = Math.floor(session.current_pick / n) + 1;
    const p = (session.current_pick % n) + 1;
    return `${r}.${String(p).padStart(2, '0')}`;
  })();

  return (
    <main className="max-w-[1800px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-16">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 flex-wrap gap-3 pb-3 sm:pb-4 border-b-2 border-[#1a3a6e]/40">
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase text-[#1a3a6e]" style={{ letterSpacing: '0.24em' }}>
            Draft Arena · {flightName}
          </p>
          <h1 className="serif text-2xl sm:text-3xl font-semibold text-[color:var(--green-deep)] mt-1">The Auction Arena</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {session.meeting_url && (
            <a href={session.meeting_url} target="_blank" rel="noreferrer"
               className="text-[9px] sm:text-[10px] uppercase text-[color:var(--gold-masters)] bg-[color:var(--green-deep)] px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-[color:var(--green-forest)]"
               style={{ letterSpacing: '0.18em' }}>
              Join call →
            </a>
          )}
          {isDriver ? (
            <button onClick={exitDriverMode}
              className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)]"
              style={{ letterSpacing: '0.18em' }}>
              Step out
            </button>
          ) : (
            <button onClick={() => setShowDriverModal(true)}
              className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-deep)] border border-[color:var(--green-deep)] px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-[color:var(--green-deep)] hover:text-[color:var(--cream)]"
              style={{ letterSpacing: '0.18em' }}>
              Take wheel
            </button>
          )}
        </div>
      </div>

      {/* DRIVER MODAL */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-[color:var(--green-deep)]/60 z-50 flex items-center justify-center p-4 sm:p-6"
             onClick={() => setShowDriverModal(false)}>
          <div className="bg-white max-w-sm w-full p-6 sm:p-8 border border-[color:var(--green-forest)]/25"
               onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.24em' }}>Bidding controls</p>
            <p className="serif text-lg sm:text-xl text-[color:var(--green-deep)] mb-4">
              You&apos;re already watching. Take the wheel only if you&apos;re entering bids — multiple drivers will conflict.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDriverModal(false)}
                className="text-xs uppercase text-[color:var(--green-moss)] px-4 py-2"
                style={{ letterSpacing: '0.18em' }}>Just watching</button>
              <button onClick={enterDriverMode}
                className="text-xs uppercase bg-[color:var(--green-deep)] text-[color:var(--cream)] px-4 py-2"
                style={{ letterSpacing: '0.18em' }}>I&apos;m running it</button>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT: 3-col desktop, stacked mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px_300px] gap-3 sm:gap-4">

        {/* LEFT — auction floor + grid */}
        <div className="min-w-0">

          {/* HERO */}
          {nominatedGolfer ? (
            <section className="bg-[color:var(--cream-tint)]/40 border border-[color:var(--green-forest)]/15 p-4 sm:p-6 mb-4 sm:mb-5"
              style={{
                borderTop: `3px solid var(--gold-masters)`,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04)',
              }}>
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <p className="text-[9px] sm:text-[10px] uppercase text-[#1a3a6e]" style={{ letterSpacing: '0.24em' }}>
                  On the floor · Pick {currentRoundLabel} · {currentNominator ? `${shortName(currentNominator.name)} nominated` : ''}
                </p>
                {isDriver && (
                  <button onClick={handleClearNomination}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)]"
                    style={{ letterSpacing: '0.18em' }}>
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-3 sm:gap-4 flex-wrap mb-3 sm:mb-5">
                <h2 className="serif text-3xl sm:text-5xl md:text-6xl font-semibold text-[color:var(--green-deep)] leading-none">
                  {nominatedGolfer.full_name}
                </h2>
                {nominatedGolfer.odds && (
                  <span className="text-lg sm:text-2xl tabular text-[color:var(--gold-masters)]">{nominatedGolfer.odds}</span>
                )}
              </div>
              <div className="flex items-baseline gap-3 mb-4 sm:mb-5 flex-wrap">
                <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.24em' }}>
                  High bid:
                </span>
                {currentBid && currentBidder ? (
                  <span className="serif text-2xl sm:text-3xl text-[color:var(--green-deep)] font-semibold tabular">
                    ${currentBid} · {shortName(currentBidder.name)}
                  </span>
                ) : (
                  <span className="serif text-lg sm:text-2xl text-[color:var(--green-moss)] italic">awaiting bids</span>
                )}
              </div>
              {isDriver && (
                <div className="border-t border-[color:var(--green-forest)]/15 pt-3 sm:pt-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3">
                    <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>Bid:</span>
                    <input type="number" min="0" value={currentBid}
                      onChange={(e) => setCurrentBid(e.target.value)}
                      placeholder="$"
                      className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border-2 border-[color:var(--green-forest)]/30 focus:border-[color:var(--green-deep)] outline-none tabular text-lg sm:text-xl serif font-semibold"
                      onKeyDown={(e) => { if (e.key === 'Enter' && currentBidderId !== null) handleSold(); }}
                    />
                    <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>→ bidder:</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {orderedOwners.map((o) => {
                      const remain = ownerStateById.get(o.id)?.remaining ?? startingBudget;
                      const isHighBidder = currentBidderId === o.id;
                      const theme = getOwnerTheme(o.name);
                      return (
                      <button key={o.id}
                          onClick={() => bumpBid(currentBid, o.id)}
                          className={`px-2 py-1.5 sm:py-2 text-xs border transition-all ${
                            isHighBidder
                              ? 'bg-[color:var(--green-deep)] text-[color:var(--cream)] border-[color:var(--green-deep)]'
                              : 'bg-[color:var(--cream-tint)]/60 text-[color:var(--green-deep)] border-[color:var(--green-forest)]/20 hover:bg-[color:var(--cream-tint)] hover:border-[color:var(--green-forest)]/40'
                          }`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <RankBadge rank={rankByOwner.get(o.id)} />
                            <span className="serif font-semibold text-[11px] sm:text-xs">{shortName(o.name)}</span>
                          </div>
                          <BudgetMeter remaining={remain} starting={startingBudget} size="xs" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleSold}
                      disabled={isPending || currentBidderId === null || !currentBid}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[color:var(--chicago-red)] text-white text-sm sm:text-base uppercase font-bold tracking-widest hover:bg-[#922826] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ letterSpacing: '0.2em' }}>
                      SOLD
                    </button>
                    <span className="text-[10px] sm:text-xs text-[color:var(--green-moss)] italic">Hit Enter or tap SOLD</span>
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-[color:var(--chicago-red)] mt-3 serif italic">{error}</p>}
            </section>
          ) : (
            <section className="bg-[color:var(--cream-tint)]/40 border border-[color:var(--green-forest)]/15 p-4 sm:p-6 mb-4 sm:mb-5"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04)' }}>
              <div className="flex items-baseline justify-between flex-wrap gap-3 sm:gap-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mb-1" style={{ letterSpacing: '0.24em' }}>
                    Pick {currentRoundLabel} · Up to nominate
                  </p>
                  <p className="serif text-2xl sm:text-3xl text-[color:var(--green-deep)] font-semibold">
                    {currentNominator ? shortName(currentNominator.name) : 'Awaiting order'}
                  </p>
                  {upcoming.length > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-[color:var(--green-moss)] mt-1" style={{ letterSpacing: '0.1em' }}>
                      next: {upcoming.map((o) => shortName(o.name)).join(' · ')}
                    </p>
                  )}
                </div>
                {lastSale && (
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mb-1" style={{ letterSpacing: '0.24em' }}>Last pick</p>
                    <p className="serif text-sm sm:text-base text-[color:var(--green-deep)]">{lastSale.golfer_name}</p>
                    <p className="text-xs text-[color:var(--green-moss)] tabular">${lastSale.amount} → {shortName(lastSale.owner_name)}</p>
                  </div>
                )}
              </div>
              {isDriver && (
                <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mt-3 sm:mt-4 italic" style={{ letterSpacing: '0.18em' }}>
                  Tap any available golfer below to nominate
                </p>
              )}
              {error && <p className="text-xs text-[color:var(--chicago-red)] mt-3 serif italic">{error}</p>}
              {info && <p className="text-xs text-[color:var(--green-deep)] mt-3 serif italic">{info}</p>}
            </section>
          )}

          {/* TICKER STRIP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="bg-[color:var(--cream-tint)]/40 px-3 sm:px-4 py-2.5 sm:py-3 border border-[color:var(--green-forest)]/15 md:col-span-2 max-h-32 overflow-y-auto"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}>
              <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mb-1.5" style={{ letterSpacing: '0.18em' }}>Drafted</p>
              {bids.filter(b => b.is_active).length === 0 ? (
                <p className="text-xs text-[color:var(--green-moss)] italic serif">No picks yet.</p>
              ) : (
                <div className="text-[11px] sm:text-xs text-[color:var(--green-deep)] leading-relaxed flex flex-wrap gap-x-1 gap-y-1">
                  {bids.filter(b => b.is_active).slice().reverse().map((b, i) => {
                    const theme = getOwnerTheme(b.owner_name);
                    return (
                      <span key={b.id} className="inline-flex items-baseline gap-1">
                        {i > 0 && <span className="text-[color:var(--green-moss)]/40">|</span>}
                        <span className="serif">
                          {b.golfer_name}
                          <span className="tabular text-[color:var(--green-moss)] mx-1">${b.amount}</span>
                          <span style={{ color: theme.primary }} className="font-semibold">({shortName(b.owner_name)})</span>
                          {b.is_keeper && <span className="text-[color:var(--gold-masters)] text-[9px] ml-0.5">K</span>}
                        </span>
                        {isDriver && (
                          <button onClick={() => handleUndoPick(b.id, `${b.golfer_name} → ${b.owner_name} for $${b.amount}${b.is_keeper ? ' (keeper)' : ''}`)}
                            className="text-[9px] uppercase text-[color:var(--chicago-red)]/70 hover:text-[color:var(--chicago-red)] hover:underline transition-colors"
                            style={{ letterSpacing: '0.1em' }}
                            title={b.is_keeper ? 'Undo this keeper' : 'Undo this pick'}>
                            ↶
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-[color:var(--cream-tint)]/40 px-3 sm:px-4 py-2.5 sm:py-3 border border-[color:var(--green-forest)]/15 flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}>
              {isDriver && (
                <>
                  <button onClick={handleRandomize}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)]"
                    style={{ letterSpacing: '0.18em' }}>
                    {session.nomination_order ? 'Re-rand' : 'Randomize'}
                  </button>
                  <span className="text-[color:var(--green-forest)]/30">·</span>
                  <button onClick={handleApplyKeepers} disabled={hasKeepersApplied}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] disabled:opacity-30"
                    style={{ letterSpacing: '0.18em' }}>
                    {hasKeepersApplied ? '✓ keepers' : 'apply keepers'}
                  </button>
                  <span className="text-[color:var(--green-forest)]/30">·</span>
                  <button onClick={handleUndoAllKeepers} disabled={!hasKeepersApplied}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)] disabled:opacity-30"
                    style={{ letterSpacing: '0.18em' }}>
                    clear keepers
                  </button>
                  <span className="text-[color:var(--green-forest)]/30">·</span>
                  <button onClick={handleSkipNomination} disabled={!session.nomination_order}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] disabled:opacity-30"
                    style={{ letterSpacing: '0.18em' }}>
                    skip
                  </button>
                  <span className="text-[color:var(--green-forest)]/30">·</span>
                  <button onClick={handleUndoLast}
                    disabled={bids.filter(b => b.is_active && !b.is_keeper).length === 0}
                    className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--chicago-red)] disabled:opacity-30"
                    style={{ letterSpacing: '0.18em' }}>
                    undo
                  </button>
                </>
              )}
            </div>
          </div>

          {/* MOBILE-ONLY TOGGLES for snake + rosters */}
          <div className="lg:hidden flex gap-2 mb-3">
            <button onClick={() => setShowSnake((v) => !v)}
              className="flex-1 text-[10px] uppercase text-[color:var(--green-deep)] border border-[color:var(--green-forest)]/30 px-3 py-2 bg-white/50 hover:bg-[color:var(--cream-tint)]/40"
              style={{ letterSpacing: '0.18em' }}>
              {showSnake ? 'Hide snake' : 'Show snake'} ▾
            </button>
            <button onClick={() => setShowRosters((v) => !v)}
              className="flex-1 text-[10px] uppercase text-[color:var(--green-deep)] border border-[color:var(--green-forest)]/30 px-3 py-2 bg-white/50 hover:bg-[color:var(--cream-tint)]/40"
              style={{ letterSpacing: '0.18em' }}>
              {showRosters ? 'Hide rosters' : 'Show rosters'} ▾
            </button>
          </div>

          {showSnake && (
            <div className="lg:hidden mb-3">
              <SnakeColumn fullSnake={fullSnake} session={session} ownerById={ownerById} />
            </div>
          )}
          {showRosters && (
            <div className="lg:hidden mb-3">
              <RostersColumn orderedOwners={orderedOwners} ownerStateById={ownerStateById}
                bidsByOwner={bidsByOwner} currentNominatorId={currentNominatorId}
                rankByOwner={rankByOwner} startingBudget={startingBudget} bids={bids} />
            </div>
          )}

          {/* GRID HEADER */}
          <div className="overflow-x-auto mb-2">
            <div className="grid gap-px bg-[color:var(--green-deep)]/15 min-w-[900px]"
                 style={{ gridTemplateColumns: `220px repeat(${owners.length}, minmax(60px, 1fr))` }}>
              <div className="bg-[color:var(--cream-tint)]/60">
                <input type="text" value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)}
                  placeholder="filter golfers…"
                  className="w-full px-2 py-1 bg-white border border-[color:var(--green-forest)]/20 text-xs rounded-sm" />
              </div>
              {orderedOwners.map((o) => {
                const st = ownerStateById.get(o.id);
                const remain = st?.remaining ?? startingBudget;
                const isNominator = currentNominatorId === o.id;
                const theme = getOwnerTheme(o.name);
                return (
                 <div key={o.id}
                    className={`p-2 ${isNominator ? 'bg-[color:var(--cream-deep)]' : 'bg-[color:var(--cream-tint)]/60'}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <RankBadge rank={rankByOwner.get(o.id)} />
                      <span className="serif text-[10px] sm:text-[11px] text-[color:var(--green-deep)] font-semibold">{colHeader(o.name)}</span>
                    </div>
                    <BudgetMeter remaining={remain} starting={startingBudget} size="xs" />
                    {isNominator && <div className="text-[8px] uppercase text-center mt-0.5 font-semibold" style={{ letterSpacing: '0.15em', color: theme.primary }}>nom</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* GRID */}
          <div className="overflow-x-auto">
            <div className="bg-[color:var(--green-forest)]/15 grid gap-px min-w-[900px]"
                 style={{ gridTemplateColumns: `220px repeat(${owners.length}, minmax(60px, 1fr))` }}>
              {filteredPool.map((g) => {
                const bid = bidByGolfer.get(g.golfer_id);
                const isSold = !!bid;
                const isNominated = nominatedGolferId === g.golfer_id;
                const isClickable = isDriver && g.is_available && !isNominated;
                return (
                  <div key={`golfer-${g.golfer_id}`} className="contents">
                    <button
                      onClick={() => handleNominate(g.golfer_id)}
                      disabled={!isClickable}
                      className={`p-2 flex items-baseline justify-between gap-2 text-left transition-colors ${
                        isNominated ? 'bg-[color:var(--gold-masters)]/30 ring-1 ring-[color:var(--gold-masters)]' :
                        isSold ? 'bg-[#2a4636]/[.08] opacity-60' :
                        isClickable ? 'bg-[color:var(--cream-tint)]/50 hover:bg-[color:var(--cream-deep)] cursor-pointer' :
                        'bg-[color:var(--cream-tint)]/50 cursor-default'
                      }`}>
                      <span className={`serif text-xs truncate ${isSold ? 'text-[color:var(--green-moss)] line-through' : 'text-[color:var(--green-deep)]'}`}>
                        {g.full_name}
                      </span>
                      {isSold && bid ? (
                        <span className="text-[10px] tabular shrink-0 flex items-baseline gap-1">
                          <span className="text-[color:var(--green-deep)] font-semibold">${bid.amount}</span>
                          <span className="text-[color:var(--green-moss)]">{shortName(bid.owner_name)}</span>
                        </span>
                      ) : g.odds ? (
                        <span className="text-[10px] tabular text-[color:var(--green-moss)]/60 shrink-0">{g.odds}</span>
                      ) : null}
                    </button>
                    {orderedOwners.map((o) => {
                      const isBuyer = bid?.owner_id === o.id;
                      const cellKey = `${g.golfer_id}-${o.id}`;
                      const isFlashing = flashCell === cellKey;
                      const theme = getOwnerTheme(o.name);
                      return (
                        <div key={cellKey}
                          className="p-2 text-center transition-all duration-500"
                          style={{
                            background: isFlashing ? 'var(--gold-masters)' :
                                       isBuyer ? theme.primaryAlpha :
                                       isSold ? 'rgba(42, 70, 54, 0.05)' :
                                       'var(--cream-tint)',
                            opacity: !isBuyer && isSold ? 0.6 : 1,
                            boxShadow: isBuyer ? `inset 0 0 0 1.5px ${theme.primary}` : undefined,
                          }}>
                          {isBuyer && (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" style={{ color: theme.primary }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 6 L5 9 L10 3" />
                                </svg>
                                <span className="text-sm tabular serif font-semibold" style={{ color: theme.primary }}>${bid.amount}</span>
                              </div>
                              {bid.is_keeper && <div className="text-[8px] uppercase text-[color:var(--gold-masters)]" style={{ letterSpacing: '0.15em' }}>K</div>}
                            </div>
                          )}
                          {!isBuyer && isSold && (
                            <div className="w-1 h-1 rounded-full bg-[color:var(--green-forest)]/20 mx-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filteredPool.length === 0 && (
                <div className="bg-white p-4 text-xs text-[color:var(--green-moss)] italic" style={{ gridColumn: `span ${owners.length + 1}` }}>
                  No golfers in pool.
                </div>
              )}
            </div>
          </div>

          <p className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] mt-3 text-right" style={{ letterSpacing: '0.18em' }}>
            Updates every 4s · {pool.length} golfers · {bids.filter(b => b.is_active).length} drafted
          </p>
        </div>

        {/* SNAKE — desktop only sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          <SnakeColumn fullSnake={fullSnake} session={session} ownerById={ownerById} />
        </aside>

        {/* ROSTERS — desktop only sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          <RostersColumn orderedOwners={orderedOwners} ownerStateById={ownerStateById}
            bidsByOwner={bidsByOwner} currentNominatorId={currentNominatorId}
            rankByOwner={rankByOwner} startingBudget={startingBudget} bids={bids} />
        </aside>

      </div>
    </main>
  );
}

// ============================================================
// Reusable Snake and Rosters columns (used in desktop sidebar + mobile collapsible)
// ============================================================

function SnakeColumn({ fullSnake, session, ownerById }: any) {
  return (
    <div className="bg-[color:var(--cream-tint)]/40 border border-[color:var(--green-forest)]/15 flex flex-col h-full lg:max-h-[calc(100vh-2rem)]"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}>
      <div className="px-2 py-2 border-b border-[color:var(--green-forest)]/15 flex items-baseline justify-between">
        <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold" style={{ letterSpacing: '0.18em' }}>Snake</p>
      </div>
      <div className="overflow-y-auto px-1 py-1 max-h-96 lg:max-h-none">
        {fullSnake.length === 0 ? (
          <p className="text-[10px] text-[color:var(--green-moss)] italic serif p-2">Click &quot;Randomize&quot;.</p>
        ) : (
          <div className="space-y-1">
            {fullSnake.map((round: any) => (
              <div key={round.round}>
                <p className="text-[8px] uppercase text-[color:var(--green-moss)] flex items-baseline gap-1 px-1 py-0.5" style={{ letterSpacing: '0.15em' }}>
                  <span>R{round.round}</span>
                  <span className="text-[color:var(--green-forest)]/40">{round.direction === 'forward' ? '→' : '←'}</span>
                </p>
                {round.ownerIds.map((ownerId: number, i: number) => {
                  const pickNum = round.pickNumbers[i];
                  const owner = ownerById.get(ownerId);
                  const isCurrent = pickNum === session.current_pick;
                  const isPast = pickNum < session.current_pick;
                  const label = `${round.round}.${String(i + 1).padStart(2, '0')}`;
                  return (
                    <div key={`${round.round}-${i}`}
                      className="px-1 py-0.5 flex items-baseline gap-1 text-[10px]"
                      style={{
                        background: isCurrent ? 'rgba(253, 181, 21, 0.3)' : undefined,
                        boxShadow: isCurrent ? 'inset 0 0 0 1px var(--gold-masters)' : undefined,
                        opacity: isPast ? 0.4 : 1,
                      }}>
                      <span className="tabular text-[9px] text-[color:var(--green-moss)] shrink-0 w-[26px]">{label}</span>
                      <span className="serif text-[color:var(--green-deep)] truncate">
                        {owner ? shortName(owner.name) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RostersColumn({ orderedOwners, ownerStateById, bidsByOwner, currentNominatorId, rankByOwner, startingBudget, bids }: any) {
  return (
    <div className="bg-[color:var(--cream-tint)]/40 border border-[color:var(--green-forest)]/15 flex flex-col h-full lg:max-h-[calc(100vh-2rem)]"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}>
      <div className="px-3 py-2 border-b border-[color:var(--green-forest)]/15 flex items-baseline justify-between">
        <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold" style={{ letterSpacing: '0.18em' }}>Rosters</p>
        <p className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.15em' }}>
          {bids.filter((b: any) => b.is_active).length} picks
        </p>
      </div>
      <div className="overflow-y-auto px-2 py-2 max-h-96 lg:max-h-none">
        <div className="space-y-2">
          {orderedOwners.map((o: any) => {
            const st = ownerStateById.get(o.id);
            const remain = st?.remaining ?? startingBudget;
            const ownerBids = bidsByOwner.get(o.id) ?? [];
            const isNominator = currentNominatorId === o.id;
            const theme = getOwnerTheme(o.name);
            return (
             <div key={o.id}
                className="p-2 bg-[color:var(--cream-tint)]/40 border"
                style={{
                  borderColor: isNominator ? 'var(--gold-masters)' : 'rgba(42, 70, 54, 0.15)',
                  background: isNominator ? 'rgba(253, 181, 21, 0.08)' : undefined,
                }}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <RankBadge rank={rankByOwner.get(o.id)} />
                    <span className="serif text-xs text-[color:var(--green-deep)] font-semibold truncate">{shortName(o.name)}</span>
                    {isNominator && <span className="text-[7px] uppercase shrink-0 font-semibold" style={{ letterSpacing: '0.15em', color: theme.primary }}>nom</span>}
                  </div>
                  <span className="text-[9px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.1em' }}>
                    {ownerBids.length} pick{ownerBids.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mb-1.5">
                  <BudgetMeter remaining={remain} starting={startingBudget} size="sm" />
                </div>
                {ownerBids.length === 0 ? (
                  <p className="text-[10px] text-[color:var(--green-moss)]/60 italic serif">No picks yet.</p>
                ) : (
                  <div className="text-[10px] leading-snug flex flex-wrap gap-x-1 gap-y-0.5">
                    {ownerBids.map((b: any, i: number) => (
                      <span key={b.id} className="serif">
                        {i > 0 && <span className="text-[color:var(--green-moss)]/40 mr-0.5">|</span>}
                        <span className="text-[color:var(--green-deep)]">
                          {b.is_keeper && <span className="text-[color:var(--gold-masters)] mr-0.5">K</span>}
                          {b.golfer_name}
                        </span>
                        <span className="tabular text-[color:var(--green-moss)] ml-0.5">(${b.amount})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
