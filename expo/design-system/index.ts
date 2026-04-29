/**
 * Design System — public entry point.
 *
 * 画面/機能コードからは原則このエントリだけを参照する。
 *   import { Button, Card, useTheme } from '@/design-system';
 */

// Theme (hooks / provider)
export { ThemeProvider, useTheme, lightTheme } from './theme';
export type { Theme } from './theme';

// Components
export {
  Button,
  Card,
  Heading,
  Body,
  Caption,
  NumberField,
  SelectCard,
  Chip,
  Badge,
  BottomSheet,
} from './components';
export type {
  ButtonProps,
  CardProps,
  HeadingProps,
  BodyProps,
  CaptionProps,
  NumberFieldProps,
  SelectCardProps,
  ChipProps,
  ChipSize,
  BadgeProps,
  BadgeTone,
  BadgeSize,
  BottomSheetProps,
  BottomSheetAction,
} from './components';

// Tokens (エスケープハッチ — 原則 useTheme 経由で取得する)
export * as tokens from './tokens/primitives';
export type { SemanticColors } from './tokens/semantic';
export type {
  ButtonTokens,
  ButtonVariant,
  ButtonSize,
  CardTokens,
  CardVariant,
} from './tokens/components';
