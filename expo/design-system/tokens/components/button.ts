/**
 * Component tokens — Button.
 *
 * semantic トークンを Button の言語に翻訳する。
 * variant × size × state でテーブル状に持つ。
 */

import { radius, spacing, fontSize, fontWeight, lineHeight } from '../primitives';
import type { SemanticColors } from '../semantic/types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonTokens = {
  variant: Record<
    ButtonVariant,
    {
      background: { default: string; pressed: string; disabled: string };
      label: { default: string; disabled: string };
      border: { default: string; pressed: string };
    }
  >;
  size: Record<
    ButtonSize,
    {
      height: number;
      paddingH: number;
      fontSize: number;
      lineHeight: number;
      radius: number;
      gap: number;
    }
  >;
  fontWeight: string;
};

export const makeButtonTokens = (sc: SemanticColors): ButtonTokens => ({
  variant: {
    primary: {
      background: {
        default: sc.action.primary.default,
        pressed: sc.action.primary.pressed,
        disabled: sc.action.primary.disabled,
      },
      label: {
        default: sc.content.onAction,
        disabled: sc.content.disabled,
      },
      border: {
        default: sc.action.primary.default,
        pressed: sc.action.primary.pressed,
      },
    },
    secondary: {
      background: {
        default: sc.action.secondary.default,
        pressed: sc.action.secondary.pressed,
        disabled: sc.action.secondary.disabled,
      },
      label: {
        default: sc.content.primary,
        disabled: sc.content.disabled,
      },
      border: {
        default: sc.border.default,
        pressed: sc.border.strong,
      },
    },
    ghost: {
      background: {
        default: sc.action.ghost.default,
        pressed: sc.action.ghost.pressed,
        disabled: sc.action.ghost.disabled,
      },
      label: {
        default: sc.content.primary,
        disabled: sc.content.disabled,
      },
      border: {
        default: 'transparent',
        pressed: 'transparent',
      },
    },
  },
  size: {
    sm: {
      height: 36,
      paddingH: spacing['4'],
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      radius: radius.md,
      gap: spacing['1.5'],
    },
    md: {
      height: 48, // Material/HIG の最小タッチ領域を両方満たす
      paddingH: spacing['5'],
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      radius: radius.lg,
      gap: spacing['2'],
    },
    lg: {
      height: 56,
      paddingH: spacing['6'],
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      radius: radius.lg,
      gap: spacing['2'],
    },
  },
  fontWeight: fontWeight.semibold,
});
