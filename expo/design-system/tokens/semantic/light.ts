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
 *   - tan    = アクセント / ハイライト
 *   - moss / amber / clay / slate = status
 */

import { colors } from '../primitives';
import type { SemanticColors } from './types';

export const lightColors: SemanticColors = {
  surface: {
    default: colors.ivory[200],
    raised: colors.ivory[400],
    overlay: colors.ivory[300],
    sunken: colors.ivory[500],
    inverse: colors.ivory[900], // 同家系 (warm near-black) でフリップ
  },

  content: {
    primary: colors.stone[900], // body text: link (sage) と区別するため stone
    secondary: colors.stone[700], // AAA (~7:1) vs ivory[200] surface
    tertiary: colors.stone[600], // AA (~4.3:1) — caption 等の小さい text まで許容
    disabled: colors.stone[400], // disabled は AA 対象外 (WCAG 1.4.3)
    inverse: colors.stone[50], // 反転面 (ivory[900]) 上の明色テキスト
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
    success: colors.moss[500],
    warning: colors.amber[500],
    danger: colors.clay[400],
    info: colors.slate[500],
  },

  accent: {
    default: colors.lavender[300], // dusty lavender — 暖色系 PFC と hue family が別
    subtle: colors.lavender[100],
  },

  nutrition: {
    // PFC macros — status 色 (clay/amber/moss) と衝突しないよう専用 hue を使う。
    //   rose     = 肉・筋肉 (clay より pink 寄り)
    //   cinnamon = 油・バター (amber より赤み強めの brown)
    //   olive    = 穀物・野菜 (moss より yellow-green 寄り)
    protein: { default: colors.rose[500],     container: colors.rose[100]     },
    fat:     { default: colors.cinnamon[500], container: colors.cinnamon[100] },
    carbs:   { default: colors.olive[500],    container: colors.olive[100]    },

    // カロリー予算 (3段階) — status の意味と重なる "アラート" 系なので
    // moss/amber/clay を再利用してOK。
    calorie: {
      within:       colors.moss[500],   // 予算内
      mildExceed:   colors.amber[500],  // 軽度超過
      severeExceed: colors.clay[500],   // 大幅超過
      track:        colors.ivory[500],  // 空のリング/バー
    },

    // 体重・進捗トレンド — status と意味が重なるため hue 共有。
    trend: {
      improve: colors.moss[500],   // 改善
      worsen:  colors.amber[500],  // 悪化 (danger ではなく warning 感)
      stable:  colors.stone[500],  // 維持 (ニュートラル)
    },
  },
};
