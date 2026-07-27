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
    inverseSecondary: string; // 反転面上の補助テキスト (キャプション等)
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
      onInverse: string; // surface.inverse 上で使う、AA準拠のコントラストを確保した明るいsage
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
    // action.primary と同じ container パターン。
    //   default      = 単体で使う本体色 (アイコン・テキスト・アクセント線など)
    //   container    = 淡い背景 (バッジ・ボタン背景等の面)
    //   onContainer  = container 面上に乗せるテキスト/アイコン色
    success: { default: string; container: string; onContainer: string };
    warning: { default: string; container: string; onContainer: string };
    danger: { default: string; container: string; onContainer: string };
    info: { default: string; container: string; onContainer: string };
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
   * - 3 macro の hue は固定 (protein=terracotta, fat=kogecha, carbs=seagrass)
   */
  nutrition: {
    // PFC macros — text/graphic/background の3用途で分離する。
    //   text       = ラベル文字色 (AA コントラスト確認済み・変更不可)
    //   graphic    = バー・グラフの塗り色 (text より彩度高め。文字コントラスト制約を受けない)
    //   background = トラック/残量表示・chip 背景などの淡色
    protein: { text: string; graphic: string; background: string };
    fat:     { text: string; graphic: string; background: string };
    carbs:   { text: string; graphic: string; background: string };

    // カロリー予算ゲージ (3段階) — 各状態も text/graphic/background の3用途で分離する。
    calorie: {
      within:       { text: string; graphic: string; background: string }; // 予算内 (健康的)
      mildExceed:   { text: string; graphic: string; background: string }; // 軽度超過 (注意)
      severeExceed: { text: string; graphic: string; background: string }; // 大幅超過 (警告)
      track:        string; // 空のリング/バー (単一値。3用途の対象外)
    };

    // 体重・進捗トレンド — 各状態も text/graphic/background の3用途で分離する。
    trend: {
      improve: { text: string; graphic: string; background: string }; // 目標に向かっている (success相当)
      worsen:  { text: string; graphic: string; background: string }; // 目標から離れた (warning相当)
      stable:  { text: string; graphic: string; background: string }; // ほぼ変化なし (neutral)
    };
  };
};
