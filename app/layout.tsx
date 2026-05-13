import './globals.css';
import type { Metadata } from 'next';
import { Inter_Tight, Source_Serif_4 } from 'next/font/google';

const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-sans' });
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'FORE Lokos',
  description: 'Fantasy golf majors · est. 2023',
};

const SPONSORS = [
  'Stove Gardner Coding Solutions',
  'The Antonellis',
  'Deez',
  'A Nerd',
  'The Power of Love',
  'LIV (RIP)',
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sponsor = SPONSORS[Math.floor(Math.random() * SPONSORS.length)];

  return (
    <html lang="en" className={`${interTight.variable} ${sourceSerif.variable}`}>
      <body className="sans-tight">
        <header className="border-b border-[color:var(--green-forest)]/15 bg-[color:var(--cream)]">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <a href="/" className="flex flex-col items-start group">
              <span className="serif text-2xl font-semibold tracking-tight text-[color:var(--green-deep)] leading-none flex items-baseline">
                F
                <svg viewBox="0 0 24 24" className="inline-block" style={{ width: '0.78em', height: '0.78em', verticalAlign: '-0.08em', margin: '0 0.02em' }}>
                  <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="9" y1="6.5" x2="9" y2="17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M9 7.2 L16.5 9 L9 10.8 Z" fill="currentColor" />
                </svg>
                RE Lokos
              </span>
              <span className="chi-star-rule mt-1.5">
                <span className="chi-star" aria-hidden="true" />
                <span className="chi-star" aria-hidden="true" />
                <span className="chi-star" aria-hidden="true" />
                <span className="chi-star" aria-hidden="true" />
              </span>
            </a>
            <nav className="flex items-center gap-4 text-[11px] uppercase text-[color:var(--green-forest)]" style={{ letterSpacing: '0.18em' }}>
  <a href="/" className="hover:text-[color:var(--green-deep)] transition-colors">2026 Season</a>
  <span className="text-[color:var(--green-forest)]/30">|</span>
  <a href="/hall-of-fame" className="hover:text-[color:var(--green-deep)] transition-colors">Hall of Fame</a>
  <span className="text-[color:var(--green-forest)]/30">|</span>
  <a href="/keepers" className="hover:text-[color:var(--green-deep)] transition-colors">Keepers</a>
  <span className="text-[color:var(--green-forest)]/30">|</span>
  <a href="/draft" className="hover:text-[color:var(--green-deep)] transition-colors">Draft</a>
  <span className="text-[color:var(--green-forest)]/30">|</span>
<a href="/info" className="hover:text-[color:var(--green-deep)] transition-colors">Rules</a>
</nav>
          </div>
        </header>
        {children}
        <footer className="mt-24 border-t border-[color:var(--green-forest)]/15 bg-[color:var(--cream)]">
          <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-baseline flex-wrap gap-2">
            <span className="text-[10px] uppercase text-[color:var(--green-moss)]" style={{ letterSpacing: '0.18em' }}>
              FORE Lokos · Chicago · Vol. IV
            </span>
            <span className="text-[10px] serif italic text-[color:var(--green-moss)]" style={{ letterSpacing: '0.05em' }}>
              presented by {sponsor}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
