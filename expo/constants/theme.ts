/**
 * Legacy palette — 後方互換のために残す。
 *
 * 値は Design System の semantic / primitive トークンから派生する
 * (単一の source of truth)。新規コードは `@/design-system` から
 * `useTheme()` / 直接トークンを取得して使うこと。
 *
 * 旧 palette キーと DS の対応:
 *   background / card / sheet / surface / border  →  ivory 家系 (surface.*, border.*)
 *   text / textMuted                               →  stone 家系 (content.*)
 *   sage / sageStrong / sageDeep                   →  sage primitive 各段
 *   accent / accentSoft                            →  lavender primitive
 *   danger                                         →  clay primitive
 */

import { colors } from '@/design-system/tokens/primitives';
import { lightColors } from '@/design-system/tokens/semantic/light';

export const palette = {
  background: lightColors.surface.default,    // ivory[200]
  card: lightColors.surface.raised,            // ivory[400]
  cardStrong: colors.ivory[500],
  sheet: lightColors.surface.overlay,          // ivory[300]
  surface: colors.ivory[100],                  // very light paper
  border: lightColors.border.default,          // ivory[600]

  // Text — DS に合わせて stone 系 (body text)
  text: lightColors.content.primary,           // stone[900]
  textMuted: lightColors.content.secondary,    // stone[700]

  // Brand — sage の代表3段
  sage: colors.sage[300],
  sageStrong: colors.sage[600],
  sageDeep: colors.sage[800],

  // Accent — dusty lavender (暖色系 PFC とは別 hue family)
  accent: colors.lavender[300],
  accentSoft: colors.lavender[100],

  // Status
  danger: lightColors.status.danger,           // clay[400]

  // Shadows / overlays
  shadow: 'rgba(80, 88, 74, 0.12)',
  dim: 'rgba(43, 50, 42, 0.18)',
  white: colors.white,
} as const;
