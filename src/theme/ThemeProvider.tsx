import React, { createContext, useContext } from 'react';
import { pitchTheme, Theme } from './theme';

const ThemeContext = createContext<Theme>(pitchTheme);

// Dark-only "Pitch Velocity" — the app ignores the device light/dark setting.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={pitchTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
