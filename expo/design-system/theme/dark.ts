/**
 * Dark theme — light.ts と同じ構造で darkColors を束ねる。
 */

import {
  colors,
  spacing,
  radius,
  elevationDark,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  duration,
  easing,
} from '../tokens/primitives';
import { darkColors } from '../tokens/semantic/dark';
import { makeButtonTokens, makeCardTokens } from '../tokens/components';

export const darkTheme = {
  name: 'dark' as const,
  colors: darkColors,
  spacing,
  radius,
  elevation: elevationDark,
  typography: {
    fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
    letterSpacing,
  },
  motion: { duration, easing },
  components: {
    button: makeButtonTokens(darkColors),
    card: makeCardTokens(darkColors),
  },
  tokens: {
    colors,
  },
};
