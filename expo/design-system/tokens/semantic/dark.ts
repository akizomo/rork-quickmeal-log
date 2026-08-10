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
    // light の content.primary(stone[900] L*10.2)は黒から10.2離した柔らかい黒。
    // 旧stone[50](L*97.2)は白から2.8しか離れておらずほぼ純白だった (2026-08-07指摘)。
    // stone[100]/[200]を実機比較し、200の方が白すぎず落ち着いて見えたため採用。
    primary:          colors.stone[200],  // '#D8D8D4' — メインテキスト
    // 補助テキスト全般。raised比 ≈5.7:1 / default比 ≈6.6:1、AA(4.5:1)準拠。
    // primaryとの自己コントラストが旧stone[200](約1.33:1)では差が無さすぎたため、
    // 2026-08-05にstone[400]へ変更 (約2.46:1)。stone[500]はraised比3.81:1でAA未達のため不可。
    secondary:        colors.stone[400],  // '#9FA09A'
    tertiary:         colors.stone[500],  // '#80817A' — 非テキスト UI (アイコン / placeholder)
    disabled:         colors.stone[700],  // '#4C534B'
    inverse:          colors.stone[900],  // '#1C1C1A' — light inverse面上のテキスト
    inverseSecondary: colors.stone[700],  // '#4C534B'
    // Material 3 のダークテーマ慣習 (tonal palette 反転): primary buttonは
    // 明るいトーン+暗い文字にする (Google製品等で広く採用、2026-08-07指摘)。
    // 旧実装は「ライトのbg方向を保ったまま暗くして白文字のAAを確保する」
    // 対症療法で、中間暗さのsageに白文字という沈んだ配色になっていた。
    onAction:         colors.stone[900],  // '#1C1C1A' — sage action面(明るいトーン)上の濃色テキスト
  },

  action: {
    // primary の default/pressed はダークでは明るいsageトーン+濃色文字 (M3方向)。
    // container/onContainer は「選択状態の控えめな面」という別ロールなので、
    // 引き続き暗いトーンのまま (M3でもcontainerはprimaryと逆方向に振れる)。
    primary: {
      default:     colors.sage[400],  // '#9AB594' — onAction(濃色)比 7.65:1
      pressed:     colors.sage[500],  // '#82A280' — 押下でさらに暗く、6.04:1
      disabled:    colors.sage[200],  // '#C9D8C2' — disabledはAA対象外 (WCAG 1.4.3)、明方向に統一
      container:   colors.sage[950],  // '#022E24' — 薄い色付け (light containerと同程度のCR、2026-08-07)
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

    // 操作可能要素の輪郭 (2026-08-09追加)。light 側は近白背景に対して stone[500]
    // (3:1達成に必要な最小の濃さ) が視覚的に重すぎたため意図的に stone[400] へ
    // 下げ 1.4.11 を満たさない例外にしたが (light.ts 参照)、dark は近黒背景に対する
    // stone[500] が同じ問題を起こさなかったため、こちらは 3:1 適合のまま維持する
    // (raised 4.12 / default 4.45 / sunken 5.28)。
    interactive: colors.stone[500], // '#80817A'
    // 選択枠は dark では「明るい側へ」振る (面が暗いので明度差の付け方が逆になる)。
    // sage[400] だと interactive 比 1.76:1 で light (2.34) より弱かったため、
    // 明度差を light と揃うところまで上げた sage[300] を採用 (2.26:1)。
    selected: colors.sage[300],   // '#B9C9B1' — raised 9.30

    focus:   colors.sage[400],    // '#9AB594' — テキスト選択 / focus ring
    inverse: colors.ivory[300],   // '#F3EEE4' — light inverse面上のボーダー
  },

  status: {
    success: { default: colors.moss[400],  container: colors.moss[800],  onContainer: colors.moss[200]  },
    warning: { default: colors.amber[400], container: colors.amber[800], onContainer: colors.amber[200] },
    danger:  { default: colors.clay[300],  container: colors.clay[800],  onContainer: colors.clay[200]  },
    info:    { default: colors.fog[400],   container: colors.fog[800],   onContainer: colors.fog[200]   },
  },

  accent: {
    // ai[400] on ai[800] (Badge tone="accent" の組み合わせ) は3.23:1でAA(4.5)未達だったため、
    // 2026-08-07にai[300]へ強化 (4.74:1)。
    default: colors.ai[300],  // '#8498D8' — ダーク背景上の藍アクセント
    subtle:  colors.ai[800],  // '#1D2C5E' — [900]は真黒に近いため一段上げ
  },

  nutrition: {
    protein: { text: colors.terracotta[300], graphic: colors.terracotta[400], background: colors.terracotta[800] },
    fat:     { text: colors.kogecha[300],    graphic: colors.kogecha[400],    background: colors.kogecha[800]    },
    carbs:   { text: colors.seagrass[300],   graphic: colors.seagrass[400],   background: colors.seagrass[800]   },

    // PFC(protein/fat/carbs)と同じtext=300/graphic=400の2トーン制。旧実装は
    // text===graphicで、リングのtoleranceColor(within.text)とprogressColor
    // (within.graphic)が完全に同色になり2本のアークが区別できなかった
    // (2026-08-07指摘)。
    calorie: {
      within:       { text: colors.moss[300],  graphic: colors.moss[400],  background: colors.moss[800],  onGraphic: colors.stone[900] },
      mildExceed:   { text: colors.amber[300], graphic: colors.amber[400], background: colors.amber[800], onGraphic: colors.stone[900] },
      severeExceed: { text: colors.clay[300],  graphic: colors.clay[400],  background: colors.clay[800],  onGraphic: colors.stone[900] },
      track: colors.ivory[950],  // 空のリング/バー (凹み = surface.sunken と同じ段)
    },

    // stable(stone[300] on stone[700])は4.30:1でAA未達だったため、
    // 2026-08-07にtextをstone[200]へ強化 (5.55:1)。
    trend: {
      improve: { text: colors.moss[300],  graphic: colors.moss[400],  background: colors.moss[800]  },
      worsen:  { text: colors.amber[300], graphic: colors.amber[400], background: colors.amber[800] },
      stable:  { text: colors.stone[200], graphic: colors.stone[400], background: colors.stone[700] },
    },
  },
};
