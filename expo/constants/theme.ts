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
 *   accent / accentSoft                            →  ai primitive (藍 indigo)
 *   danger                                         →  clay primitive
 */

import { colors } from '@/design-system/tokens/primitives';
import { lightColors } from '@/design-system/tokens/semantic/light';

export const palette = {
  background: lightColors.surface.default,    // ivory[200]
  card: lightColors.surface.raised,            // ivory[100] (2026-07-30のレイヤー整理でivory[400]から変更)
  cardStrong: colors.ivory[500],
  sheet: lightColors.surface.sunken,           // ivory[300] (旧 surface.overlay。2026-07-30にsunkenへ統合、値は不変)
  surface: colors.ivory[100],                  // very light paper
  border: lightColors.border.default,          // ivory[600]

  // Text — DS に合わせて stone 系 (body text)
  text: lightColors.content.primary,           // stone[900]
  textMuted: lightColors.content.secondary,    // stone[700]

  // Brand — sage の代表3段
  sage: colors.sage[300],
  sageStrong: colors.sage[600],
  sageDeep: colors.sage[800],

  // Accent — 藍 (ai primitive, 暖色系 PFC とは別 hue family)
  accent: colors.ai[600],
  accentSoft: colors.ai[100],

  // Status
  danger: lightColors.status.danger.default,           // clay[400]

  // Shadows / overlays
  shadow: 'rgba(80, 88, 74, 0.12)',
  dim: 'rgba(43, 50, 42, 0.18)',
  white: colors.white,

  // モーダル/ボトムシートの暗幕。RGBは共通 (20, 28, 24) で、
  // 不透明度だけ文脈に応じて3段階 (元は各ファイルで独立にrgba直書きされ値がドリフトしていた)。
  scrimLight: 'rgba(20, 28, 24, 0.32)',
  scrimMedium: 'rgba(20, 28, 24, 0.4)',
  scrimHeavy: 'rgba(20, 28, 24, 0.5)',

  // シート/セクション見出し用の暖色系ダークインク。
  // 元は #1F2C23 / #243228 / #243128 とファイルごとに微妙にドリフトしていた値を統一。
  sheetInk: '#243228',
} as const;
