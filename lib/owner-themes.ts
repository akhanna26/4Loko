// Owner-themed accent colors based on each owner's team allegiance.
// Used subtly across the site (rank badges, draft picks, roster cards).
// Each owner has primary + secondary; primary is the dominant accent.

export type OwnerTheme = {
  primary: string;
  secondary: string;
  // Optional tint version of primary (with alpha) for backgrounds
  primaryAlpha: string;
};

const DEFAULT_THEME: OwnerTheme = {
  primary: '#1a3022',
  secondary: '#6b7e6b',
  primaryAlpha: 'rgba(26, 48, 34, 0.1)',
};

// Map by full owner name (must match owners.name in database)
const OWNER_THEMES: Record<string, OwnerTheme> = {
  // Anshu — Packers (green/gold)
  'Anshu Khanna': {
    primary: '#1f5b3f',
    secondary: '#ffb612',
    primaryAlpha: 'rgba(31, 91, 63, 0.12)',
  },
  // Conor — White Sox (black/silver)
  'Conor Murnane': {
    primary: '#1a1a1a',
    secondary: '#c4ced4',
    primaryAlpha: 'rgba(26, 26, 26, 0.12)',
  },
  // Petric — Colorado Buffaloes (gold/black)
  'Daniel Petric': {
    primary: '#cfb87c',
    secondary: '#000000',
    primaryAlpha: 'rgba(207, 184, 124, 0.18)',
  },
  // DJ — Titans (navy/light-blue)
  'Donald J. Dunn': {
    primary: '#0c2340',
    secondary: '#4b92db',
    primaryAlpha: 'rgba(12, 35, 64, 0.12)',
  },
  // Joey — Illinois Illini (orange/navy)
  'Joseph Babyar': {
    primary: '#e84a27',
    secondary: '#13294b',
    primaryAlpha: 'rgba(232, 74, 39, 0.12)',
  },
  // Josh — Bengals (orange/black)
  'Joshua Dunn': {
    primary: '#fb4f14',
    secondary: '#000000',
    primaryAlpha: 'rgba(251, 79, 20, 0.12)',
  },
  // Pat — Patriots (navy/red/silver)
  'Patrick Dillon': {
    primary: '#002a5c',
    secondary: '#c60c30',
    primaryAlpha: 'rgba(0, 42, 92, 0.12)',
  },
  // Murn — Oklahoma State (orange/black)
  'Michael H. Murnane': {
    primary: '#ff7300',
    secondary: '#000000',
    primaryAlpha: 'rgba(255, 115, 0, 0.12)',
  },
  // Nagle — Kent State (navy/gold)
  'Benjamin Nagle': {
    primary: '#002664',
    secondary: '#eaab00',
    primaryAlpha: 'rgba(0, 38, 100, 0.12)',
  },
  // Tumi — Bowling Green (orange/brown)
  'Nicholas Tuminello': {
    primary: '#fe5000',
    secondary: '#4f2c1d',
    primaryAlpha: 'rgba(254, 80, 0, 0.12)',
  },
  // Z — Ohio Bobcats (green/white)
  'Zachary Stierhoff': {
    primary: '#00694e',
    secondary: '#cda077',
    primaryAlpha: 'rgba(0, 105, 78, 0.12)',
  },
  // Kyle — Bears (navy/orange)
  'Kyle Stofko': {
    primary: '#0b162a',
    secondary: '#c83803',
    primaryAlpha: 'rgba(11, 22, 42, 0.14)',
  },
  // Cory — Guardians (red/navy) - emeritus
  'Cory R. Waite': {
    primary: '#e31937',
    secondary: '#002b5c',
    primaryAlpha: 'rgba(227, 25, 55, 0.12)',
  },
};

export function getOwnerTheme(ownerName: string): OwnerTheme {
  return OWNER_THEMES[ownerName] ?? DEFAULT_THEME;
}
