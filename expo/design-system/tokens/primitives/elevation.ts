/**
 * Elevation primitive tokens — 影/持ち上がり表現。
 *
 * 設計方針:
 * - Material の「影の強さ」と iOS HIG の「控えめで柔らかい影」を両立。
 * - React Native 用に shadowColor / shadowOffset / shadowOpacity / shadowRadius /
 *   elevation (Android) を持つ構造で定義。
 * - Component 層で iOS は translucency を被せるなどの演出が可能。
 */

import { colors } from './colors';

type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android
};

export const elevation: Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', Shadow> = {
  none: {
    shadowColor: colors.transparent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
  },
};

export type ElevationToken = keyof typeof elevation;
