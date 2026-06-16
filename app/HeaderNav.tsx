'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '2026 Season', mobileLabel: '2026' },
  { href: '/hall-of-fame', label: 'Hall of Fame', mobileLabel: 'HOF' },
  { href: '/keepers', label: 'Keepers', mobileLabel: 'Keepers' },
  { href: '/draft', label: 'Draft', mobileLabel: 'Draft' },
  { href: '/payouts', label: 'Payouts', mobileLabel: 'Payouts' },
  { href: '/info', label: 'Rules', mobileLabel: 'Rules' },
];

export default function HeaderNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop: flat nav, tight spacing */}
      <nav className="hidden sm:flex items-center gap-3 text-[10px] uppercase text-[color:var(--green-forest)] whitespace-nowrap" style={{ letterSpacing: '0.14em' }}>
        {LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-3">
            {i > 0 && <span className="text-[color:var(--green-forest)]/30">|</span>}
            <a href={link.href} className="hover:text-[color:var(--green-deep)] transition-colors">
              {link.label}
            </a>
          </span>
        ))}
      </nav>

      {/* Mobile: hamburger */}
      <div className="sm:hidden relative">
        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 -m-1.5 text-[color:var(--green-deep)] hover:text-[color:var(--green-forest)] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 min-w-[180px] z-50 shadow-lg"
            style={{
              background: 'white',
              border: '1px solid rgba(14, 42, 74, 0.2)',
            }}
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-[11px] uppercase text-[color:var(--green-forest)] hover:bg-[color:var(--cream-deep)] hover:text-[color:var(--green-deep)] transition-colors border-b border-[color:var(--green-forest)]/10 last:border-b-0"
                style={{ letterSpacing: '0.16em' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
