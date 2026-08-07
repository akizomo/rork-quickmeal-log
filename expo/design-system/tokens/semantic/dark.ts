/**
 * Semantic tokens (Dark theme) — light.ts と同じ構造、値だけダーク用に反転。
 *
 * 「層が上がるほど明るい」は light/dark 共通のルール。反転するのは *どちらの端から
 * 梯子を積むか* であって、方向そのものではない。light は明るい端に 300→200→50、
 * dark は暗い端に 950→900→850 と積む。段差 (ΔL*) は両テーマで一致させてあり、
 * 層間コントラスト比も light 1.089/1.043 : dark 1.079/1.039 と揃う
 * (実測根拠は colors.ts の ivory コメント参照)。
 */

import { colors } from '../primitives';
import type { SemanticColors } from './types';

export const darkColors: SemanticColors = {
  surface: {
    sunken:  colors.ivory[950], // -1: 凹み (入力欄の地・トラック・非選択の塗り)
    default: colors.ivory[900], //  0: 文脈の地 (ページ / シート / ダイアログ)
    raised:  colors.ivory[850], // +1: カード
    inverse: colors.ivory[50],  // 同家系 (ほぼ白) でフリップ
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
    // primary/secondary の default・pressed は Button の「塗り面」として使われる。
    // 旧sage[400]/ivory[700]は「ダーク背景上の文字色」として選ばれた値で、白文字を
    // 乗せるボタン背景に転用すると中間グレーの罠でAAが成立しなかった (2.19:1 / 3.22:1)。
    // 2026-08-05、文字が乗る面として十分暗い段まで下げてAA(4.5:1)を確保した。
    // action.text (リンク色) は文字色としての用途のままなのでsage[400]を維持している。
    primary: {
      default:     colors.sage[700],  // '#54736C' — onAction(白)比 5.10:1
      pressed:     colors.sage[900],  // '#264F44' — 押下でさらに暗く、9.04:1
      disabled:    colors.sage[800],  // '#355E52' — disabledはAA対象外 (WCAG 1.4.3)
      container:   colors.sage[900],  // '#264F44' — sage コンテナ (selected 背景)
      onContainer: colors.sage[200],  // '#C9D8C2' — dark container 上の明色テキスト
    },
    secondary: {
      default:  colors.ivory[800],  // '#403A2E' — content.primary(白)比 10.52:1
      pressed:  colors.ivory[900],  // '#1D1913' — 押下でさらに暗く、16.32:1
      disabled: colors.ivory[700],  // '#8F8A7A' — disabledはAA対象外 (WCAG 1.4.3)
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
    // light は border が面より「暗い」側 (ivory[600]/[500])、dark は「明るい」側に置く。
    // 旧値は '#3A3329' / '#252018' の直書きで、subtle は raised より暗く
    // カード上で境界として機能していなかった (2026-08-06 に ivory ランプへ移設)。
    default: colors.ivory[800],   // 区切り線     (raised比 1.44 / light の 1.43 と一致)
    subtle:  colors.ivory[825],   // 控えめな境界 (default面比 1.23 / light と同値)
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
      within:       { text: colors.moss[300],  graphic: colors.moss[300],  background: colors.moss[800]  },
      mildExceed:   { text: colors.amber[300], graphic: colors.amber[300], background: colors.amber[800] },
      severeExceed: { text: colors.clay[300],  graphic: colors.clay[300],  background: colors.clay[800]  },
      track: colors.ivory[950],  // 空のリング/バー (凹み = surface.sunken と同じ段)
    },

    trend: {
      improve: { text: colors.moss[300],  graphic: colors.moss[400],  background: colors.moss[800]  },
      worsen:  { text: colors.amber[300], graphic: colors.amber[400], background: colors.amber[800] },
      stable:  { text: colors.stone[300], graphic: colors.stone[400], background: colors.stone[700] },
    },
  },
};
