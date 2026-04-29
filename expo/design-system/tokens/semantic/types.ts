/**
 * Semantic token の型定義。
 *
 * 値そのものは light.ts / dark.ts (将来) で定義する。
 * このファイルは「構造 (どんな役割のトークンがあるか)」のみを決める。
 */

export type SemanticColors = {
  surface: {
    default: string; // 画面全体の背景
    raised: string; // カード等、一段持ち上がった面
    overlay: string; // シート・モーダル・ポップ
    sunken: string; // 一段凹ませた面
    inverse: string; // 反転面
  };

  content: {
    primary: string; // 主要テキスト・アイコン
    secondary: string; // 補助テキスト
    tertiary: string; // さらに弱いテキスト
    disabled: string;
    inverse: string; // 反転面上のテキスト
    onAction: string; // action.primary 面上のテキスト
  };

  action: {
    primary: {
      default: string;
      pressed: string;
      disabled: string;
      // Material の primary-container パターン。
      // selected state の背景や chip active など、filled ではないが
      // ブランドに紐づく「選択された・アクティブな」面に使う。
      container: string;
      onContainer: string; // container 面上のテキスト (濃いブランド色)
    };
    secondary: {
      default: string;
      pressed: string;
      disabled: string;
    };
    ghost: {
      default: string; // 通常は transparent
      pressed: string;
      disabled: string;
    };
    // Text button / inline link 用。body text (content.primary) と
    // 区別できるよう、必ずブランド色 (sage) を使う。
    text: {
      default: string;
      pressed: string;
      disabled: string;
    };
  };

  border: {
    default: string;
    subtle: string;
    strong: string;
    focus: string;
    inverse: string;
  };

  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };

  // Brand accent (目標達成・ハイライトなど)
  accent: {
    default: string;
    subtle: string;
  };

  /**
   * Nutrition / fitness domain semantic.
   *
   * PFC バー、カロリー予算リング、体重トレンドなど、
   * このアプリに固有の「栄養・進捗の可視化」で使う色。
   *
   * 原則:
   * - グラフ・バー・リングは必ずここから参照する (status.* を流用しない)
   * - action.primary (sage) はドメイン可視化に使わない (操作と情報を混同させない)
   * - 3 macro の hue は固定 (protein=clay, fat=amber, carbs=moss)
   */
  nutrition: {
    // PFC macros — default はフィル色、container はトラック/残量表示色
    protein: { default: string; container: string };
    fat:     { default: string; container: string };
    carbs:   { default: string; container: string };

    // カロリー予算ゲージ (3段階)
    calorie: {
      within:       string; // 予算内 (健康的)
      mildExceed:   string; // 軽度超過 (注意)
      severeExceed: string; // 大幅超過 (警告)
      track:        string; // 空のリング/バー
    };

    // 体重・進捗トレンド
    trend: {
      improve: string; // 目標に向かっている (success相当)
      worsen:  string; // 目標から離れた (warning相当)
      stable:  string; // ほぼ変化なし (neutral)
    };
  };
};
