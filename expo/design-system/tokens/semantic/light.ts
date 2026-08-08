/**
 * Semantic tokens (Light theme) — primitive → 意味付け。
 *
 * この層の値だけを画面/コンポーネントから参照すること。
 * primitive (colors.sage[300] など) を直接参照してはいけない。
 *
 * 色相の役割ルール:
 *   - ivory  = surface / 通常 border (紙・面の家系、light & dark 両方をカバー)
 *   - stone  = content / text / icon / 強い border (描画物の家系)
 *   - sage   = ブランド / 操作 (action.*, focus, text link)
 *   - ai     = アクセント / ハイライト (藍)
 *   - moss / amber / clay / fog = status
 */

import { colors } from '../primitives';
import type { SemanticColors } from './types';

export const lightColors: SemanticColors = {
  // レイヤーモデル (2026-07-30整理):
  //   色      = 同じ文脈内のレイヤー差 (レイヤーが上 = 白に近い)
  //   scrim+影 = 文脈そのものの切り替え (ページ → シート/ダイアログ)
  // シートは色を消費せず surface.default に戻るため、白の天井にぶつからない。
  // ivory を 300 → 200 → 50 と順に使い、輝度が単調増加する階段にしている。
  // raised は 50 (ほぼ純白の紙) にして、default との分離をはっきり付ける。
  surface: {
    sunken: colors.ivory[300],  // -1: 凹み (入力欄の地・トラック・非選択の塗り)
    default: colors.ivory[200], //  0: 文脈の地 (ページ / シート / ダイアログ)
    raised: colors.ivory[50],   // +1: カード
    inverse: colors.ivory[900], // 同家系 (warm near-black) でフリップ
  },

  content: {
    primary: colors.stone[900], // body text: link (sage) と区別するため stone
    // 補助テキスト全般 (説明文・注釈・ラベル)。surface.default比コントラスト比 約4.2:1、
    // surface.raised比 約4.6:1、AA(4.5:1)準拠 (defaultはわずかに下回るが大半の文章は
    // raised=カード内にあるため実害は限定的と判断)。primaryとの自己コントラストが
    // 旧stone[700](約2.15:1)では体感で差が無さすぎたため、2026-08-05にstone[600]へ緩和 (約3.68:1)。
    secondary: colors.stone[600],
    // 非テキスト専用 (アイコン・placeholder・区切り線等)。WCAGの非テキストUI基準(3:1)を満たす
    // stone[500](約3.6〜3.9:1)を使用。テキストの色としては使わないこと (secondaryを使う)。
    tertiary: colors.stone[500],
    disabled: colors.stone[300],  // disabled は AA 対象外 (WCAG 1.4.3)
    inverse: colors.stone[50], // 反転面 (ivory[900]) 上の明色テキスト
    inverseSecondary: colors.stone[200], // 反転面上のセカンダリ (キャプション等)。ivory[900]比コントラスト比約12.2:1
    onAction: colors.ivory[50], // action.primary 面上はウォームな明色
  },

  action: {
    primary: {
      default: colors.sage[800], // AA compliant contrast vs ivory text
      pressed: colors.sage[900],
      disabled: colors.sage[200],
      container: colors.sage[100], // 選択状態・chip active の背景
      onContainer: colors.sage[900], // container 面上の濃い brand text
    },
    secondary: {
      default: colors.ivory[500],
      pressed: colors.ivory[600],
      disabled: colors.ivory[300],
    },
    ghost: {
      default: colors.transparent,
      pressed: colors.ivory[400],
      disabled: colors.transparent,
    },
    // Text button / inline link。常にブランド色で body text と区別する。
    text: {
      default: colors.sage[700], // AA compliant on light surface
      pressed: colors.sage[900],
      disabled: colors.stone[300],
      // surface.inverse (ivory[900]) 上で使うテキストボタン色。sage[700]は暗背景でコントラスト比
      // 約3.4:1 しか出ずAA不適合なため、約7.9:1を確保できるsage[400]を別途用意する。
      onInverse: colors.sage[400],
    },
  },

  border: {
    default: colors.ivory[600],
    subtle: colors.ivory[500],
    strong: colors.stone[400], // 高コントラスト needs は stone
    focus: colors.sage[700], // ブランドの focus ring / 選択枠
    inverse: colors.ivory[800], // 反転面上の border は同家系
  },

  status: {
    // container/onContainer は action.primary と同じ digit 規則 (container=100, onContainer=900)。
    success: { default: colors.moss[500], container: colors.moss[100], onContainer: colors.moss[900] },
    warning: { default: colors.amber[500], container: colors.amber[100], onContainer: colors.amber[900] },
    danger: { default: colors.clay[400], container: colors.clay[100], onContainer: colors.clay[900] },
    info: { default: colors.fog[500], container: colors.fog[100], onContainer: colors.fog[900] }, // 霧色 — slate から fog へ
  },

  accent: {
    default: colors.ai[600], // 藍 (indigo) — 暖色系 PFC と hue family が別
    subtle: colors.ai[100],
  },

  nutrition: {
    // PFC macros — status 色 (clay/amber/moss) と衝突しないよう専用 hue を使う。
    //   terracotta = 肉・筋肉 (煉瓦色, clay より orange 寄り)
    //   kogecha    = 油・バター (焦茶, amber より赤み強めの brown)
    //   seagrass   = 穀物・野菜 (海草色, moss より teal 寄り)
    // text は 600 番 (500 より濃くAAコントラスト余裕あり)、graphic はバー/グラフ専用の
    // 400 番 (彩度・明度が高くP/Fの見分けがつきやすい。文字ではないのでAA制約なし)。
    protein: { text: colors.terracotta[600], graphic: colors.terracotta[400], background: colors.terracotta[100] },
    fat:     { text: colors.kogecha[600],    graphic: colors.kogecha[400],    background: colors.kogecha[100]    },
    carbs:   { text: colors.seagrass[600],   graphic: colors.seagrass[400],   background: colors.seagrass[100]   },

    // カロリー予算 (3段階) — status の意味と重なる "アラート" 系なので
    // moss/amber/clay を再利用してOK。PFC macros と同じく text=600/graphic=400/background=100。
    // mildExceed のみ amber[600]がbackground比4.41:1でAA(4.5)未達だったため、
    // 2026-08-07にtextをamber[700]へ強化 (6.91:1)。
    // onGraphic: graphicはtheme非依存の固定トーン(400番)なので、その上に乗る文字も
    // 固定色にする(light/darkとも同じstone[900])。カレンダードット等で使用。
    calorie: {
      within:       { text: colors.moss[600],  graphic: colors.moss[400],  background: colors.moss[100],  onGraphic: colors.stone[900] }, // 予算内
      mildExceed:   { text: colors.amber[700], graphic: colors.amber[400], background: colors.amber[100], onGraphic: colors.stone[900] }, // 軽度超過
      severeExceed: { text: colors.clay[600],  graphic: colors.clay[400],  background: colors.clay[100],  onGraphic: colors.stone[900] }, // 大幅超過
      track:        colors.ivory[300],  // 空のリング/バー (凹み = surface.sunkenと同じ段、2026-08-06)
    },

    // 体重・進捗トレンド — status と意味が重なるため hue 共有。同じく text=600/graphic=400/background=100。
    // worsen(amber[600])はcalorie.mildExceedと同じ理由でamber[700]へ強化 (2026-08-07)。
    // stable(stone[600] on stone[100])も3.92:1でAA未達だったため stone[700] (6.71:1) へ強化。
    trend: {
      improve: { text: colors.moss[600],  graphic: colors.moss[400],  background: colors.moss[100]  }, // 改善
      worsen:  { text: colors.amber[700], graphic: colors.amber[400], background: colors.amber[100] }, // 悪化 (danger ではなく warning 感)
      stable:  { text: colors.stone[700], graphic: colors.stone[400], background: colors.stone[100] }, // 維持 (ニュートラル)
    },
  },
};
