/**
 * Semantic tokens (Dark theme) — light.ts と同じ構造、値だけダーク用に反転。
 *
 * ivory スケール上の方向性:
 *   surface.sunken  < surface.default < surface.raised
 *   (暗い)                                        (明るい — 相対的)
 *
 * ivory[900] = '#1D1913' を surface.default に指定 (colors.ts コメント参照)。
 * raised は ivory[900] より少し明るいカスタム値。sunken はさらに暗いカスタム値。
 */

import { colors } from '../primitives';
import type { SemanticColors } from './types';

const DARK_SURFACE_SUNKEN = '#0E0C08'; // ほぼ黒 (入力欄 / トラック)
const DARK_SURFACE_RAISED = '#2B2620'; // カード面 (ivory[900] より微かに明るい)

export const darkColors: SemanticColors = {
  surface: {
    sunken:  DARK_SURFACE_SUNKEN,
    default: colors.ivory[900],  // '#1D1913' — ページ / シート / ダイアログ
    raised:  DARK_SURFACE_RAISED,
    inverse: colors.ivory[50],   // ほぼ白 (反転面)
  },

  content: {
    primary:          colors.stone[50],   // '#F7F7F6' — メインテキスト
    // 補助テキスト全般。raised比 ≈5.7:1 / default比 ≈6.6:1、AA(4.5:1)準拠。
    // primaryとの自己コントラストが旧stone[200](約1.33:1)では差が無さすぎたため、
    // 2026-08-05にstone[400]へ変更 (約2.46:1)。stone[500]はraised比3.81:1でAA未達のため不可。
    secondary:        colors.stone[400],  // '#9FA09A'
    tertiary:         colors.stone[500],  // '#80817A' — 非テキスト UI (アイコン / placeholder)
    disabled:         colors.stone[700],  // '#4C534B'
    inverse:          colors.stone[900],  // '#1C1C1A' — light inverse面上のテキスト
    inverseSecondary: colors.stone[700],  // '#4C534B'
    onAction:         colors.ivory[50],   // '#FFFDF7' — sage action面上のテキスト
  },

  action: {
    primary: {
      default:     colors.sage[400],  // '#9AB594' — ダーク背景上で認識できる明るい sage
      pressed:     colors.sage[300],  // '#B9C9B1'
      disabled:    colors.sage[800],  // '#355E52' — 彩度を落として "無効感"
      container:   colors.sage[900],  // '#264F44' — sage コンテナ (selected 背景)
      onContainer: colors.sage[200],  // '#C9D8C2' — dark container 上の明色テキスト
    },
    secondary: {
      default:  colors.ivory[700],  // '#8F8A7A' — ダーク背景上で視認できる中間グレー
      pressed:  colors.stone[600],  // '#6E776E'
      disabled: colors.ivory[800],  // '#403A2E'
    },
    ghost: {
      default:  colors.transparent,
      pressed:  colors.ivory[800],  // '#403A2E'
      disabled: colors.transparent,
    },
    text: {
      default:   colors.sage[400],  // '#9AB594' — ダーク背景上のリンク色
      pressed:   colors.sage[300],
      disabled:  colors.stone[700],
      onInverse: colors.sage[700],  // '#54736C' — light inverse面上のリンク色
    },
  },

  border: {
    default: '#3A3329',           // 区切り線 (DARK_SURFACE_RAISED より少し暗い)
    subtle:  '#252018',           // ほぼ見えない境界
    strong:  colors.stone[600],   // '#6E776E'
    focus:   colors.sage[400],    // '#9AB594' — focus ring
    inverse: colors.ivory[300],   // '#F3EEE4' — light inverse面上のボーダー
  },

  status: {
    success: { default: colors.moss[400],  container: colors.moss[800],  onContainer: colors.moss[200]  },
    warning: { default: colors.amber[400], container: colors.amber[800], onContainer: colors.amber[200] },
    danger:  { default: colors.clay[300],  container: colors.clay[800],  onContainer: colors.clay[200]  },
    info:    { default: colors.fog[400],   container: colors.fog[800],   onContainer: colors.fog[200]   },
  },

  accent: {
    default: colors.ai[400],  // '#617AC4' — ダーク背景上の藍アクセント
    subtle:  colors.ai[800],  // '#1D2C5E' — [900]は真黒に近いため一段上げ
  },

  nutrition: {
    protein: { text: colors.terracotta[300], graphic: colors.terracotta[400], background: colors.terracotta[800] },
    fat:     { text: colors.kogecha[300],    graphic: colors.kogecha[400],    background: colors.kogecha[800]    },
    carbs:   { text: colors.seagrass[300],   graphic: colors.seagrass[400],   background: colors.seagrass[800]   },

    calorie: {
      within:       { text: colors.moss[300],  graphic: colors.moss[400],  background: colors.moss[800]  },
      mildExceed:   { text: colors.amber[300], graphic: colors.amber[400], background: colors.amber[800] },
      severeExceed: { text: colors.clay[300],  graphic: colors.clay[400],  background: colors.clay[800]  },
      track: colors.ivory[700],  // '#8F8A7A' — 空のリング/バー
    },

    trend: {
      improve: { text: colors.moss[300],  graphic: colors.moss[400],  background: colors.moss[800]  },
      worsen:  { text: colors.amber[300], graphic: colors.amber[400], background: colors.amber[800] },
      stable:  { text: colors.stone[300], graphic: colors.stone[400], background: colors.stone[700] },
    },
  },
};
