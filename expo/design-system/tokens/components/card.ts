/**
 * Component tokens — Card.
 */

import { radius, spacing, elevation } from '../primitives';
import type { SemanticColors } from '../semantic/types';

export type CardVariant = 'raised' | 'flat' | 'outlined';

export type CardTokens = {
  variant: Record<
    CardVariant,
    {
      background: string;
      border: { width: number; color: string };
      shadow: (typeof elevation)[keyof typeof elevation];
    }
  >;
  padding: number;
  radius: number;
  gap: number;
};

export const makeCardTokens = (sc: SemanticColors): CardTokens => ({
  variant: {
    raised: {
      background: sc.surface.raised,
      border: { width: 0, color: 'transparent' },
      shadow: elevation.none,
    },
    flat: {
      background: sc.surface.overlay,
      border: { width: 0, color: 'transparent' },
      shadow: elevation.none,
    },
    outlined: {
      background: sc.surface.raised,
      border: { width: 1, color: sc.border.subtle },
      shadow: elevation.none,
    },
  },
  padding: spacing['5'],
  radius: radius['2xl'],
  gap: spacing['3'],
});
