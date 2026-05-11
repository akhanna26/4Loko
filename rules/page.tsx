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
  { category: 'Scoring', question: 'How does daily scoring work?',
    answer: 'For each day, your team\'s score = sum of your top-N golfers\' stroke counts vs. par (inverted to points-up). On Thursday and Friday, the top 4 golfers count. On Saturday and Sunday, only the top 2 count. The remaining golfers on your roster don\'t contribute that day.' },
  { category: 'Scoring', question: 'What happens to golfers who miss the cut?',
    answer: 'Starting in 2025: missed-cut golfers receive the field-worst score for the missed weekend days. In 2024 and before, they simply dropped out and contributed nothing.' },
  { category: 'Scoring', question: 'Are scores stored as strokes or points?',
    answer: 'Points. We invert raw strokes-vs-par so positive numbers = good. If Scheffler shoots -7 on a day (7 under par), he scores +7 points for the day in our system.' },

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
    answer: 'You can declare a keeper from your previous flight\'s roster. The keeper is added to your new draft roster automatically, at the original purchase price (which counts against your $75 budget). You only get one keeper per major, max.' },
  { category: 'Keepers', question: 'What does a keeper cost?',
    answer: 'A $10 keeper fee is paid into the year-long pot the first time you keep someone. If you keep the same golfer a second consecutive major, the fee escalates to $20. A third time = $30. Maximum 3 consecutive keeps.' },
  { category: 'Keepers', question: 'Does the keeper fee escalate the purchase price?',
    answer: 'No. The keeper fee escalates ($10 → $20 → $30) but the auction-budget hit stays at the original purchase price forever. So you can keep a $40 golfer for $40 every time, regardless of escalation.' },
  { category: 'Keepers', question: 'When do I declare a keeper?',
    answer: 'Before the draft for the new flight. There\'s a "Declare keeper" link in the navigation and on the homepage during draft week.' },

  // Payouts
  { category: 'Payouts', question: 'How much does each major buy-in cost?',
    answer: 'Masters: $125. PGA Championship, US Open, The Open Championship: $100 each.' },
  { category: 'Payouts', question: 'How are major payouts split?',
    answer: '70% to 1st place, 20% to 2nd, 10% to 3rd. Ties split the combined pool evenly. Buy-ins from all 12 owners create the pool. At 12 owners: Masters pool = $1500 ($1050/$300/$150). Other majors = $1200 ($840/$240/$120).' },
  { category: 'Payouts', question: 'What is the major-winner pool?',
    answer: '$10 per owner per major. The owner who has the real-world tournament winner on their roster collects the full $120 (12 × $10). So if Rory wins the Masters and you have him on your roster, you win $120 that week beyond any standings payout.' },
  { category: 'Payouts', question: 'How much is the year-long buy-in?',
    answer: '$75 per owner (since 2025). Was $25 in 2024.' },
  { category: 'Payouts', question: 'How are year-long payouts split?',
    answer: '75% to 1st place, 25% to 2nd. Ties split evenly. At 12 owners: year-long pool = $900 ($675/$225). Add keeper-fee escalation revenue on top of base buy-ins.' },
  { category: 'Payouts', question: 'What does it cost to play a full season?',
    answer: 'Base cost in 2026: $125 (Masters) + $100 × 3 (other majors) + $40 (4 × $10 major-winner pool entries) + $75 (year-long buy-in) = $540 minimum. Add keeper fees ($10/$20/$30 per declared keeper) on top.' },

  // Bonuses
  { category: 'Bonuses', question: 'What bonuses can I earn?',
    answer: 'Three kinds: +1 point for each rostered golfer who shoots the day\'s low score (a "daily low"); +1 point for each rostered golfer with a hole-in-one during the event; +3 points if you have the actual tournament winner on your roster ("Champion bonus").' },
  { category: 'Bonuses', question: 'Do bonuses apply at elevated events?',
    answer: 'Yes — bonuses (daily low, HIO, Champion) earn points at both majors and elevated events. Same rules.' },
  { category: 'Bonuses', question: 'Can multiple owners earn the same daily-low bonus?',
    answer: 'Yes. If two golfers tie for the day\'s low score, both their owners get +1 each.' },
];

const CATEGORIES = ['All', 'Format', 'Scoring', 'Draft', 'Keepers', 'Payouts', 'Bonuses'] as const;

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
    <main className="max-w-4xl mx-auto px-6 pt-10 pb-16">
      <Link href="/" className="text-[10px] uppercase text-[color:var(--green-moss)] hover:text-[color:var(--green-deep)] mb-6 inline-block" style={{ letterSpacing: '0.18em' }}>
        ← 2026 Season
      </Link>

      <header className="mb-10">
        <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-2" style={{ letterSpacing: '0.32em' }}>
          The Book
        </p>
        <h1 className="serif text-5xl md:text-6xl font-light text-[color:var(--green-deep)] leading-none" style={{ letterSpacing: '-0.02em' }}>
          Rules & Payouts
        </h1>
        <p className="serif italic text-sm text-[color:var(--green-moss)] mt-3">
          Everything that governs the FORE Loko Cup
        </p>
      </header>

      {/* PAYOUT QUICK REFERENCE */}
      <section className="mb-12 bg-white/50 border border-[color:var(--green-forest)]/15 p-6">
        <h2 className="serif text-2xl font-semibold text-[color:var(--green-deep)] mb-4">Payout structure</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-3" style={{ letterSpacing: '0.18em' }}>Per major</p>
            <table className="w-full text-sm">
              <tbody className="space-y-1">
                <tr><td className="serif py-1">Masters buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$125</td></tr>
                <tr><td className="serif py-1">Other majors buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$100</td></tr>
                <tr><td className="serif py-1">Major-winner pool entry</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$10</td></tr>
                <tr className="border-t border-[color:var(--green-forest)]/20"><td className="serif py-1.5 font-semibold">Masters payout (1st/2nd/3rd)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$1050 / $300 / $150</td></tr>
                <tr><td className="serif py-1.5 font-semibold">Other majors (1st/2nd/3rd)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$840 / $240 / $120</td></tr>
                <tr><td className="serif py-1.5 font-semibold">Major winner pool</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$120</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mb-3" style={{ letterSpacing: '0.18em' }}>Year-long</p>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="serif py-1">Buy-in</td><td className="tabular text-right text-[color:var(--green-deep)] font-semibold">$75</td></tr>
                <tr><td className="serif py-1">Plus: keeper-fee escalation</td><td className="tabular text-right text-[color:var(--green-deep)]">+ $10/$20/$30</td></tr>
                <tr className="border-t border-[color:var(--green-forest)]/20"><td className="serif py-1.5 font-semibold">Payout (1st/2nd)</td><td className="tabular text-right text-[color:var(--gold-masters)] font-semibold">$675 / $225</td></tr>
              </tbody>
            </table>
            <p className="text-[10px] uppercase text-[color:var(--green-moss)] mt-5 mb-2" style={{ letterSpacing: '0.18em' }}>Full season cost</p>
            <p className="serif text-3xl font-light text-[color:var(--green-deep)] tabular leading-none">$540<span className="text-sm text-[color:var(--green-moss)] italic ml-2">base, before keepers</span></p>
          </div>
        </div>
      </section>

      {/* SEARCH BAR */}
      <section className="mb-6">
        <input
          type="text"
          placeholder="Search rules..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/70 border border-[color:var(--green-forest)]/20 px-4 py-3 text-sm serif text-[color:var(--green-deep)] placeholder-[color:var(--green-moss)] focus:outline-none focus:border-[color:var(--green-deep)] transition-colors"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className="text-[10px] uppercase tabular px-3 py-1.5 border transition-colors"
              style={{
                letterSpacing: '0.18em',
                background: activeCategory === cat ? 'var(--green-deep)' : 'transparent',
                color: activeCategory === cat ? 'var(--cream)' : 'var(--green-forest)',
                borderColor: activeCategory === cat ? 'var(--green-deep)' : 'var(--green-forest)',
                opacity: activeCategory === cat ? 1 : 0.5,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ LIST */}
      <section className="space-y-3">
        {filtered.length === 0 && (
          <p className="serif italic text-[color:var(--green-moss)] text-center py-12">
            No rules match that search.
          </p>
        )}
        {filtered.map((faq, i) => (
          <details key={i} className="bg-white/50 border border-[color:var(--green-forest)]/15 group">
            <summary className="cursor-pointer p-4 flex items-baseline justify-between gap-4 hover:bg-white/30 transition-colors">
              <div className="flex items-baseline gap-3">
                <span className="text-[9px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
                  {faq.category}
                </span>
                <span className="serif text-base text-[color:var(--green-deep)] font-semibold">{faq.question}</span>
              </div>
              <span className="text-xs text-[color:var(--green-moss)] group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <div className="px-4 pb-4 pt-1 border-t border-[color:var(--green-forest)]/10">
              <p className="serif text-sm text-[color:var(--green-deep)] leading-relaxed">{faq.answer}</p>
            </div>
          </details>
        ))}
      </section>

      <p className="text-[10px] uppercase text-[color:var(--green-moss)] mt-8 text-right italic" style={{ letterSpacing: '0.18em' }}>
        {FAQS.length} entries · {filtered.length} showing
      </p>
    </main>
  );
}