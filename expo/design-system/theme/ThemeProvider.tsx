/**
 * ThemeProvider / useTheme
 *
 * システムの colorScheme を検知して light / dark を自動切替する。
 * theme prop を渡した場合は強制適用 (テスト・dev ツール用)。
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, type Theme } from './light';
import { darkTheme } from './dark';

export const ThemeContext = createContext<Theme>(lightTheme);

type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: Theme;
};

export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const resolvedTheme = useMemo(() => {
    if (theme) return theme;
    return colorScheme === 'dark' ? darkTheme : lightTheme;
  }, [theme, colorScheme]);

  return <ThemeContext.Provider value={resolvedTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
