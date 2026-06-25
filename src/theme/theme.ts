/**
 * Design tokens for the Aussie Boyz World Cup app — "Pitch Velocity".
 *
 * A dark "Dark Pitch" system: deep Pitch-Navy backgrounds, charcoal glass
 * cards, and a single Electric-Lime accent used sparingly for live indicators,
 * highlights and calls-to-action. Numbers and micro-labels use a monospace
 * face for a precise, broadcast-data feel; headlines use a muscular display
 * face. The app is dark-only.
 */

const palette = {
  lime: '#CAF300', // Electric Lime — primary accent
  limeDim: '#B0D500', // slightly calmer lime for secondary highlights
  onLime: '#171E00', // near-black text that sits on lime fills
  gold: '#FFD700', // score / wildcard gold
  purple: '#8B5CF6', // stat comparison (away side)
  live: '#FF3B30', // reserved live / alert red
  navy: '#0A0F14', // page background (level 0)
  charcoal: '#161C24', // cards / containers (level 1)
};

/** Brand font families (loaded in app/_layout.tsx via expo-google-fonts). */
export const fonts = {
  brand: 'Anybody_900Black_Italic', // wordmark
  display: 'Anybody_800ExtraBold', // big titles / scores
  heading: 'Anybody_700Bold', // section + group headings
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodyBold: 'HankenGrotesk_700Bold',
  mono: 'JetBrainsMono_500Medium', // numbers, minutes, micro-labels
  monoBold: 'JetBrainsMono_700Bold',
};

export type Theme = {
  dark: boolean;
  colors: {
    accent: string;
    accentDim: string;
    accentSoft: string;
    gold: string;
    live: string;
    statPurple: string;
    bg: string;
    surface: string;
    surfaceAlt: string;
    elevated: string;
    border: string;
    hairline: string;
    glassBorder: string;
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
  fonts: typeof fonts;
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
  hero: 44,
};

export const pitchTheme: Theme = {
  dark: true,
  colors: {
    accent: palette.lime,
    accentDim: palette.limeDim,
    accentSoft: 'rgba(202,243,0,0.10)',
    gold: palette.gold,
    live: palette.live,
    statPurple: palette.purple,
    bg: palette.navy,
    surface: palette.charcoal,
    surfaceAlt: '#1C2530',
    elevated: '#202B38',
    border: 'rgba(255,255,255,0.10)',
    hairline: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(202,243,0,0.12)',
    text: '#E6EAD9',
    textSecondary: '#C5C9AC',
    textMuted: '#8F9378',
    onAccent: palette.onLime,
    win: palette.lime,
    draw: '#7C8593',
    loss: palette.live,
    qualify: 'rgba(202,243,0,0.07)',
    playoff: 'rgba(255,215,0,0.10)',
    skeleton: '#1C2530',
  },
  fonts,
  spacing,
  radius,
  font,
};

// Dark-only: both exports resolve to Pitch Velocity so existing imports keep working.
export const darkTheme = pitchTheme;
export const lightTheme = pitchTheme;

/** Tabular figures keep digits from shifting in scores, clocks and tables. */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };
