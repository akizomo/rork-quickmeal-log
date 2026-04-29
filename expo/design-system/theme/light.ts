/**
 * Light theme — semantic + component + primitive を束ねる。
 *
 * 使用側は `theme.colors.surface.default` のように参照する。
 * primitive は `theme.tokens.colors.sage[500]` でのみ参照可 (基本は semantic を使う)。
 */

import {
  colors,
  spacing,
  radius,
  elevation,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  duration,
  easing,
} from '../tokens/primitives';
import { lightColors } from '../tokens/semantic';
import { makeButtonTokens, makeCardTokens } from '../tokens/components';

export const lightTheme = {
  name: 'light' as const,
  colors: lightColors,
  spacing,
  radius,
  elevation,
  typography: {
    fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
    letterSpacing,
  },
  motion: { duration, easing },
  components: {
    button: makeButtonTokens(lightColors),
    card: makeCardTokens(lightColors),
  },
  // 直接 primitive が必要な場合のエスケープハッチ
  tokens: {
    colors,
  },
};

export type Theme = typeof lightTheme;
