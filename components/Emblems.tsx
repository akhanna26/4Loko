// Custom emblems for each major. Single-color line drawings,
// referential not official — a flag, a trophy, a shield, a claret jug.

export function MastersEmblem({ className = 'emblem' }: { className?: string }) {
  // Pin flag — reads as "the green at Augusta"
  return (
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
  <path d="M6 8 L6 22 L18 22 L18 8" />
  <path d="M6 8 L9 4 L15 4 L18 8" />
  <path d="M12 4 L12 12" />
  <circle cx="10" cy="10" r="0.5" fill="currentColor" />
  <circle cx="14" cy="10" r="0.5" fill="currentColor" />
  <circle cx="10" cy="14" r="0.5" fill="currentColor" />
  <circle cx="14" cy="14" r="0.5" fill="currentColor" />
</svg>
  );
}

export function PGAEmblem({ className = 'emblem' }: { className?: string }) {
  // Wanamaker — large trophy outline with two handles
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 5 H17 L16.2 13 Q16 16 12 16 Q8 16 7.8 13 Z" />
      <path d="M7 7 Q4 7.5 4 10 Q4 12 7 12" />
      <path d="M17 7 Q20 7.5 20 10 Q20 12 17 12" />
      <line x1="12" y1="16" x2="12" y2="19" />
      <path d="M9 19.5 H15" />
    </svg>
  );
}

export function USOpenEmblem({ className = 'emblem' }: { className?: string }) {
  // Striped shield — USGA-coded without copying their crest
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4 H19 V13 Q19 18 12 21 Q5 18 5 13 Z" />
      <line x1="5" y1="9"  x2="19" y2="9"  strokeWidth="1.1" />
      <line x1="5" y1="13" x2="19" y2="13" strokeWidth="1.1" />
    </svg>
  );
}

export function OpenEmblem({ className = 'emblem' }: { className?: string }) {
  // Claret jug — distinctive bulbous body with handle
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 4 H14 V6 H10 Z" />
      <path d="M9 6 H15 V8 H9 Z" />
      <path d="M9.5 8 Q7 11 7 14 Q7 18 12 18 Q17 18 17 14 Q17 11 14.5 8 Z" />
      <path d="M16.5 11 Q19 11 19 13 Q19 14.5 17 14.5" />
      <line x1="9" y1="20" x2="15" y2="20" strokeWidth="1.6" />
    </svg>
  );
}

// Map tournament name -> emblem + full venue palette
export type MajorPalette = {
  Emblem: React.FC<{ className?: string }>;
  dotClass: string;
  primary: string;        // CSS var for primary brand color
  accent: string;         // secondary accent color
  bracket: string;        // color used for the timeline bracket grouping
  emblemTint: string;     // dot/wash color
  textOnPrimary: string;  // text color on the primary background
};

export function getMajorAccent(name: string): MajorPalette | null {
  const n = name.toLowerCase();
  if (n.includes('masters')) {
    return {
      Emblem: MastersEmblem,
      dotClass: 'bg-[color:var(--masters-pine)]',
      primary: 'var(--masters-green)',
      accent: 'var(--masters-azalea)',
      bracket: 'var(--masters-pine)',
      emblemTint: 'var(--masters-gold)',
      textOnPrimary: 'var(--cream)',
    };
  }
  if (n.includes('pga')) {
    return {
      Emblem: PGAEmblem,
      dotClass: 'bg-[color:var(--pga-navy)]',
      primary: 'var(--pga-navy)',
      accent: 'var(--pga-red)',
      bracket: 'var(--pga-navy)',
      emblemTint: 'var(--pga-silver)',
      textOnPrimary: 'var(--cream)',
    };
  }
  if (n.includes('us open')) {
    return {
      Emblem: USOpenEmblem,
      dotClass: 'bg-[color:var(--usopen-navy)]',
      primary: 'var(--usopen-navy)',
      accent: 'var(--usopen-red)',
      bracket: 'var(--usopen-navy)',
      emblemTint: 'var(--usopen-red)',
      textOnPrimary: 'var(--cream)',
    };
  }
  if (n.includes('open')) {
    return {
      Emblem: OpenEmblem,
      dotClass: 'bg-[color:var(--open-claret)]',
      primary: 'var(--open-claret)',
      accent: 'var(--open-gold)',
      bracket: 'var(--open-claret)',
      emblemTint: 'var(--open-gold)',
      textOnPrimary: 'var(--cream)',
    };
  }
  return null;
}
