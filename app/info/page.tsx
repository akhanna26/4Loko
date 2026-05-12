'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';

type FAQ = {
  category: 'Format' | 'Scoring' | 'Draft' | 'Keepers' | 'Payouts' | 'Bonuses';
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  // Format
  { category: 'Format', question: 'How many tournaments per year?',
    answer: 'Eight events total per season: 4 majors (Masters, PGA Championship, US Open, The Open Championship) and 4 elevated events (RBC Heritage, Memorial Tournament, Travelers Championship, FedEx St. Jude Championship). Tournaments are grouped into 4 flights, one major + one elevated each.' },
  { category: 'Format', question: 'How do flights work?',
    answer: 'A flight is a major + its companion elevated event. You draft once per flight (before the major), and the roster you draft is used for both events. So your Masters draft roster also plays the RBC Heritage. There are 4 flights per season, meaning 4 drafts total.' },
  { category: 'Format', question: 'How many owners?',
    answer: '12 active owners in 2026: Anshu, Conor, Daniel Petric, DJ, Joey, Josh, Pat, Murn, Nagle, Tumi, Z, and Kyle.' },

  // Scoring
  { category: 'Scoring', question: 'How does daily scoring work at majors?',
    answer: 'For each day, your team scores = sum of your top-N golfers\u2019 stroke counts vs. par (inverted to points-up). On Thursday and Friday, the top 4 golfers count. On Saturday and Sunday, only the top 2 count. Remaining roster spots don\u2019t contribute that day.' },
  { category: 'Scoring', question: 'How does scoring work at elevated events?',
    answer: 'Elevated events (RBC Heritage, Memorial, Travelers, FedEx) use top-finish tier scoring instead of daily funnel. You score points for each rostered golfer who finishes top 1 / top 10 / top 20 in the real-world tournament. Plus standard bonuses (daily lows, HIO, champion) stack on top.' },
  { category: 'Scoring', question: 'What happens to golfers who miss the cut?',
    answer: 'Starting in 2025: missed-cut golfers receive the field-worst score for the missed weekend days. In 2024 and before, they simply dropped out and contributed nothing.' },
  { category: 'Scoring', question: 'Are scores stored as strokes or points?',
    answer: 'Internally as strokes vs. par (golf convention, negative = good). The site displays them inverted as points (positive = good). If Scheffler shoots -7 vs par, that\u2019s +7 points in our display.' },

  // Draft
  { category: 'Draft', question: 'How much is the auction budget?',
    answer: '$75 per draft. Same amount for every major.' },
  { category: 'Draft', question: 'What is the roster size?',
    answer: 'Minimum 4, maximum 10 golfers per roster.' },
  { category: 'Draft', question: 'Can I bid on a golfer for $1?',
    answer: 'Yes. Minimum bid is $1.' },
  { category: 'Draft', question: 'When does the draft happen?',
    answer: 'Wednesday night before each major tee-time. Drafts are run live on this site via the Draft Arena.' },

  // Keepers
  { category: 'Keepers', question: 'How do keepers work?',
    answer: 'You can declare a keeper from your previous flight\u2019s roster. The keeper is added to your new draft roster automatically, at the original purchase price (which counts against your $75 budget). You only get one keeper per major, max.' },
  { category: 'Keepers', question: 'What does a keeper cost?',
    answer: 'A $10 keeper fee is paid into the year-long pot the first time you keep someone. If you keep the same golfer a second consecutive major, the fee escalates to $20. A third time = $30. Maximum 3 consecutive keeps.' },
  { category: 'Keepers', question: 'Does the keeper fee escalate the purchase price?',
    answer: 'No. The keeper fee escalates ($10 \u2192 $20 \u2192 $30) but the auction-budget hit stays at the original purchase price forever. So you can keep a $40 golfer for $40 every time, regardless of escalation.' },
  { category: 'Keepers', question: 'When do I declare a keeper?',
    answer: 'Before the draft for the new flight. There\u2019s a "Declare keeper" link in the navigation and on the homepage during draft week.' },

  // Payouts
  { category: 'Payouts', question: 'How much does each major buy-in cost?',
    answer: 'Masters: $125. PGA Championship, US Open, The Open Championship: $100 each.' },
  { category: 'Payouts', question: 'How are major payouts split?',
    answer: '70% to 1st place, 20% to 2nd, 10% to 3rd. Ties split the combined pool evenly. Buy-ins from all 12 owners create the pool. At 12 owners: Masters pool = $1500 ($1050/$300/$150). Other majors = $1200 ($840/$240/$120).' },
  { category: 'Payouts', question: 'What is the major-winner pool?',
    answer: '$10 per owner per major. The owner who has the real-world tournament winner on their roster collects the full $120 (12 \u00d7 $10). So if Rory wins the Masters and you have him on your roster, you win $120 that week beyond any standings payout.' },
  { category: 'Payouts', question: 'How much is the year-long buy-in?',
    answer: '$75 per owner (since 2025). Was $25 in 2024.' },
  { category: 'Payouts', question: 'How are year-long payouts split?',
    answer: '75% to 1st place, 25% to 2nd. Ties split evenly. At 12 owners: year-long pool = $900 ($675/$225). Add keeper-fee escalation revenue on top of base buy-ins.' },
  { category: 'Payouts', question: 'What does it cost to play a full season?',
    answer: 'Base cost in 2026: $125 (Masters) + $100 \u00d7 3 (other majors) + $40 (4 \u00d7 $10 major-winner pool entries) + $75 (year-long buy-in) = $540 minimum. Add keeper fees ($10/$20/$30 per declared keeper) on top.' },

  // Bonuses
  { category: 'Bonuses', question: 'What bonuses can I earn?',
    answer: 'Three kinds: +1 point for each rostered golfer who shoots the day\u2019s low score (a "daily low"); +1 point for each rostered golfer with a hole-in-one during the event; +3 points if you have the actual tournament winner on your roster ("Champion bonus").' },
  { category: 'Bonuses', question: 'Do bonuses apply at elevated events?',
    answer: 'Yes \u2014 bonuses (daily low, HIO, Champion) earn points at both majors and elevated events. Same rules.' },
  { category: 'Bonuses', question: 'Can multiple owners earn the same daily-low bonus?',
    answer: 'Yes. If two golfers tie for the day\u2019s low score, both their owners get +1 each.' },
];

const CATEGORIES = ['All', 'Format', 'Scoring', 'Draft', 'Keepers', 'Payouts', 'Bonuses'] as const;

const HEADING_CLASS = "serif text-3xl sm:text-5xl text-[color:var(--green-deep)] font-light leading-none";
const HEADING_STYLE = { letterSpacing: '-0.02em' };

export default function RulesPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
      const matchesQuery = !query ||
        faq.question.toLowerCase().includes(query.toLowerCase()) ||
        faq.answer.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <Link href="/" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← 2026 Season
      </Link>

      <header className="mb-8 sm:mb-10">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.32em' }}>
          The Book
        </p>
        <h1 className="serif text-4xl sm:text-6xl font-light text-[color:var(--green-deep)] leading-none" style={{ letterSpacing: '-0.02em' }}>
          Rules & Payouts
        </h1>
        <p className="serif italic text-sm text-[color:var(--green-moss)] mt-3">
          Everything that governs the FORE Loko Cup
        </p>
      </header>

      {/* Payout structure widget */}
      <section className="mb-10 sm:mb-12">
        <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
          <h2 className={HEADING_CLASS} style={HEADING_STYLE}>Payouts</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            12 owners · 2026
          </span>
        </div>
        <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm">
          <div className="bg-[color:var(--cream-tint)]/60 p-4 sm:p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold mb-3" style={{ letterSpacing: '0.18em' }}>Per major</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="serif py-1">Masters buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$125</td></tr>
                    <tr><td className="serif py-1">Other majors buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$100</td></tr>
                    <tr><td className="serif py-1">Major-winner pool entry</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$10</td></tr>
                    <tr style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}><td className="serif py-1.5 font-semibold">Masters payout (1/2/3)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$1050 / $300 / $150</td></tr>
                    <tr><td className="serif py-1.5 font-semibold">Other majors (1/2/3)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$840 / $240 / $120</td></tr>
                    <tr><td className="serif py-1.5 font-semibold">Major winner pool</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$120</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold mb-3" style={{ letterSpacing: '0.18em' }}>Year-long</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="serif py-1">Buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$75</td></tr>
                    <tr><td className="serif py-1">Plus: keeper-fee escalation</td><td className="tabular text-right text-[color:var(--green-deep)]">+ $10/$20/$30</td></tr>
                    <tr style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}><td className="serif py-1.5 font-semibold">Payout (1/2)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$675 / $225</td></tr>
                  </tbody>
                </table>
                <p className="text-[10px] uppercase text-[color:var(--green-deep)] font-semibold mt-5 mb-2" style={{ letterSpacing: '0.18em' }}>Full season cost</p>
                <p className="serif text-3xl font-light text-[color:var(--green-deep)] tabular leading-none" style={{ letterSpacing: '-0.02em' }}>$540<span className="text-sm text-[color:var(--green-moss)] italic ml-2">base, before keepers</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="mb-10 sm:mb-12">
        <div className="flex items-baseline justify-between mb-4 sm:mb-5 gap-2">
          <h2 className={HEADING_CLASS} style={HEADING_STYLE}>FAQ</h2>
          <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
            {FAQS.length} entries · {filtered.length} showing
          </span>
        </div>

        <div className="bg-white/80 border border-[color:var(--green-forest)]/15 shadow-sm">
          <div className="bg-[color:var(--cream-tint)]/60 p-4 sm:p-6">
            {/* Search + filter */}
            <input
              type="text"
              placeholder="Search rules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-[color:var(--green-forest)]/20 px-4 py-3 text-sm serif text-[color:var(--green-deep)] placeholder-[color:var(--green-moss)] focus:outline-none focus:border-[color:var(--green-deep)] transition-colors"
            />
            <div className="flex flex-wrap gap-2 mt-3 mb-5">
              {CATEGORIES.map((cat) => (
                <button key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="text-[10px] uppercase tabular px-3 py-1.5 border transition-colors"
                  style={{
                    letterSpacing: '0.18em',
                    background: activeCategory === cat ? 'var(--green-deep)' : 'white',
                    color: activeCategory === cat ? 'white' : 'var(--green-forest)',
                    borderColor: activeCategory === cat ? 'var(--green-deep)' : 'rgba(42,70,54,0.2)',
                    opacity: activeCategory === cat ? 1 : 0.7,
                  }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* FAQ items */}
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="serif italic text-[color:var(--green-moss)] text-center py-8">
                  No rules match that search.
                </p>
              )}
              {filtered.map((faq, i) => (
                <details key={i} className="bg-white border border-[color:var(--green-forest)]/10 group">
                  <summary className="cursor-pointer p-3 sm:p-4 flex items-baseline justify-between gap-4 hover:bg-[color:var(--cream-tint)]/40 transition-colors list-none">
                    <div className="flex items-baseline gap-3 min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase text-[color:var(--green-moss)] shrink-0" style={{ letterSpacing: '0.18em' }}>
                        {faq.category}
                      </span>
                      <span className="serif text-sm sm:text-base text-[color:var(--green-deep)] font-semibold">{faq.question}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-[color:var(--green-moss)] group-open:rotate-90 transition-transform shrink-0">+</span>
                  </summary>
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 border-t border-[color:var(--green-forest)]/10">
                    <p className="serif text-sm text-[color:var(--green-deep)] leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
