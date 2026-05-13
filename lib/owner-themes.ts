export type OwnerTheme = {
  primary: string;
  secondary: string;
  primaryAlpha: string;
};

const THEMES: Record<string, OwnerTheme> = {
  'Anshu Khanna':       { primary: '#1f5b3f', secondary: '#ffb612', primaryAlpha: 'rgba(31, 91, 63, 0.12)' },
  'Conor Murnane':      { primary: '#1a1a1a', secondary: '#c4ced4', primaryAlpha: 'rgba(26, 26, 26, 0.12)' },
  'Daniel Petric':      { primary: '#cfb87c', secondary: '#000000', primaryAlpha: 'rgba(207, 184, 124, 0.18)' },
  'Donald J. Dunn':     { primary: '#0c2340', secondary: '#4b92db', primaryAlpha: 'rgba(12, 35, 64, 0.12)' },
  'Joseph Babyar':      { primary: '#e84a27', secondary: '#13294b', primaryAlpha: 'rgba(232, 74, 39, 0.12)' },
  'Joshua Dunn':        { primary: '#fb4f14', secondary: '#000000', primaryAlpha: 'rgba(251, 79, 20, 0.12)' },
  'Patrick Dillon':     { primary: '#002a5c', secondary: '#c60c30', primaryAlpha: 'rgba(0, 42, 92, 0.12)' },
  'Michael H. Murnane': { primary: '#ff7300', secondary: '#000000', primaryAlpha: 'rgba(255, 115, 0, 0.12)' },
  'Benjamin Nagle':     { primary: '#002664', secondary: '#eaab00', primaryAlpha: 'rgba(0, 38, 100, 0.12)' },
  'Nicholas Tuminello': { primary: '#fe5000', secondary: '#4f2c1d', primaryAlpha: 'rgba(254, 80, 0, 0.12)' },
  'Zachary Stierhoff':  { primary: '#00694e', secondary: '#cda077', primaryAlpha: 'rgba(0, 105, 78, 0.12)' },
  'Kyle Stofko':        { primary: '#0b162a', secondary: '#c83803', primaryAlpha: 'rgba(11, 22, 42, 0.12)' },
  'Cory R. Waite':      { primary: '#e31937', secondary: '#002b5c', primaryAlpha: 'rgba(227, 25, 55, 0.12)' },
};

const FALLBACK: OwnerTheme = {
  primary: '#2a4636',
  secondary: '#6b7e6b',
  primaryAlpha: 'rgba(42, 70, 54, 0.12)',
};

export function getOwnerTheme(ownerName: string): OwnerTheme {
  return THEMES[ownerName] ?? FALLBACK;
}
