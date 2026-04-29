/**
 * ThemeProvider / useTheme
 *
 * B-2 方針: 当面 light のみだが、将来の dark / カスタム切替に備えて
 * Context 経由で theme を配布できる形にしておく。
 */

import React, { createContext, useContext, useMemo } from 'react';
import { lightTheme, type Theme } from './light';

const ThemeContext = createContext<Theme>(lightTheme);

type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: Theme;
};

export function ThemeProvider({ children, theme = lightTheme }: ThemeProviderProps) {
  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
