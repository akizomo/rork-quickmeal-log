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
        // content.disabled(stone300)はsage200と同程度の明度でほぼ判別不能。
        // ただしブランド色(sage800)にすると彩度が高く「アクティブに見える」ため、
        // 無彩色のcontent.secondary(stone500)で読める程度のコントラストを保ちつつ
        // 「無効化されている感 (desaturated)」を出す。
        disabled: sc.content.secondary,
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
        // content.disabled(stone300)はivory系disabled背景とのコントラストが低すぎるため、
        // content.secondary(stone500)に上げて視認性を確保しつつ薄さは維持する。
        disabled: sc.content.secondary,
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
        // secondaryと同じ理由でcontent.secondary(stone500)に統一。
        disabled: sc.content.secondary,
      },
      border: {
        default: 'transparent',
        pressed: 'transparent',
      },
    },
  },
  // fontSize/lineHeight/fontWeight は components/Typography.tsx の Label ロールと同じ
  // primitive (fontSize.sm/md/lg, fontWeight.semibold) から意図的に揃えている。
  // Button は状態別の文字色 (pressed/disabled) と numberOfLines を Text に直接持たせる
  // 必要があるため <Label> は使わず Text を直接組んでいるが、値は Label と同じ意味を持つ。
  // Label の size ラインナップを変更したらここも見直すこと。
  // radius は全サイズ full (pill) に統一 (2026-07-30決定)。ボタンだけ角丸長方形にする
  // 積極的な理由がなく、アプリ内の自前実装ボタンの大半が既に full 相当だったため揃えた。
  size: {
    sm: {
      height: 36,
      paddingH: spacing['4'],
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      radius: radius.full,
      gap: spacing['1'],
    },
    md: {
      height: 48, // Material/HIG の最小タッチ領域を両方満たす
      paddingH: spacing['5'],
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      radius: radius.full,
      gap: spacing['2'],
    },
    lg: {
      height: 56,
      paddingH: spacing['6'],
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      radius: radius.full,
      gap: spacing['2'],
    },
  },
  fontWeight: fontWeight.semibold,
});
