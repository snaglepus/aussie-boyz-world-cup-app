/**
 * Design tokens for the Aussie Boyz World Cup app.
 *
 * Philosophy (from UX research): one brand accent, one reserved "live" colour,
 * an otherwise near-neutral palette, generous spacing, tabular figures for all
 * numbers. Dark surfaces are dark grey (never pure black) with elevation shown
 * through progressively lighter greys; accents are slightly desaturated in dark.
 */

const palette = {
  // Brand — a fresh green/gold nod to the "Aussie Boyz" name.
  green: '#1FA05A',
  greenDark: '#39B26E',
  gold: '#F4C20D',
  // Reserved live / alert colour. Never reused for anything else.
  live: '#EF4444',
  liveDark: '#F87171',
  // Semantic
  win: '#1FA05A',
  draw: '#9AA3AF',
  loss: '#EF4444',
};

export type Theme = {
  dark: boolean;
  colors: {
    accent: string;
    accentSoft: string;
    gold: string;
    live: string;
    bg: string;
    surface: string;
    surfaceAlt: string;
    elevated: string;
    border: string;
    hairline: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    onAccent: string;
    win: string;
    draw: string;
    loss: string;
    qualify: string; // top-2 band
    playoff: string; // best-third band
    skeleton: string;
  };
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: {
    caption: number;
    small: number;
    body: number;
    emphasis: number;
    title: number;
    heading: number;
    hero: number;
  };
};

const spacing = (n: number) => n * 4;
const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
const font = {
  caption: 12,
  small: 13,
  body: 15,
  emphasis: 17,
  title: 20,
  heading: 26,
  hero: 48,
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    accent: palette.green,
    accentSoft: 'rgba(31,160,90,0.12)',
    gold: palette.gold,
    live: palette.live,
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#FBFCFD',
    elevated: '#FFFFFF',
    border: '#E5E8EC',
    hairline: '#EDEFF2',
    text: '#11151C',
    textSecondary: '#566072',
    textMuted: '#8A93A2',
    onAccent: '#FFFFFF',
    win: palette.win,
    draw: palette.draw,
    loss: palette.loss,
    qualify: 'rgba(31,160,90,0.16)',
    playoff: 'rgba(244,194,13,0.18)',
    skeleton: '#E9ECF0',
  },
  spacing,
  radius,
  font,
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    accent: palette.greenDark,
    accentSoft: 'rgba(57,178,110,0.16)',
    gold: palette.gold,
    live: palette.liveDark,
    bg: '#0E1116',
    surface: '#151A21',
    surfaceAlt: '#1A2129',
    elevated: '#1C232C',
    border: '#262E39',
    hairline: '#222932',
    text: '#E6E8EB',
    textSecondary: '#A7B0BD',
    textMuted: '#6F7A88',
    onAccent: '#06130C',
    win: palette.greenDark,
    draw: '#7C8593',
    loss: palette.liveDark,
    qualify: 'rgba(57,178,110,0.20)',
    playoff: 'rgba(244,194,13,0.16)',
    skeleton: '#202833',
  },
  spacing,
  radius,
  font,
};

/** Tabular figures keep digits from shifting in scores, clocks and tables. */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };
