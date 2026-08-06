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

/**
 * Dark theme 用の elevation。
 *
 * light の elevation は「白背景に黒影」を前提にしている。ダークの surface
 * (ivory[900]台、stone[900]とほぼ同じ暗さ) にそのまま適用すると、shadowColorと
 * 背景の明度がほぼ同じため opacity をいくら上げても黒 on 黒でコントラストが
 * 知覚できない (2026-08-06 実機確認)。
 * Material Dark theme の指針と同様、ダークでは「黒い影」ではなく「淡いglow」で
 * 持ち上がりを表現する。shadowColor を stone[300] (明るいニュートラルグレー) にし、
 * 背景よりわずかに明るい滲みとして知覚させる。
 *
 * lightは6段がshadowRadius/offset/opacityすべてで等差の意味を持つが、暗背景の
 * glowはそこまで多くの段を知覚弁別できない。opacityだけ揃えてradius/offsetは
 * 6段のまま残すと差が曖昧なまま複雑さだけ残るため、実際に用途が分かれる
 * none/sm/md/lg の4段に構造ごと統合する (xs→sm、xl→lg のエイリアス)。
 * キー自体は既存呼び出し側 (t.elevation.xs 等) との互換のため全て残す。
 */
const DARK_SM: Shadow = { ...elevation.sm, shadowColor: colors.stone[300], shadowOpacity: 0.06 };
const DARK_MD: Shadow = { ...elevation.md, shadowColor: colors.stone[300], shadowOpacity: 0.08 };
const DARK_LG: Shadow = { ...elevation.lg, shadowColor: colors.stone[300], shadowOpacity: 0.09 };

export const elevationDark: Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', Shadow> = {
  none: elevation.none,
  xs: DARK_SM,
  sm: DARK_SM,
  md: DARK_MD,
  lg: DARK_LG,
  xl: DARK_LG,
};
