/**
 * Semantic token の型定義。
 *
 * 値そのものは light.ts / dark.ts (将来) で定義する。
 * このファイルは「構造 (どんな役割のトークンがあるか)」のみを決める。
 */

export type SemanticColors = {
  /**
   * レイヤー = 色。文脈の切り替え = scrim + 影。
   *
   * 同じ文脈の中でレイヤーが上がるほど白に近づく (sunken < default < raised)。
   * シート/ダイアログは「上のレイヤー」ではなく **新しい文脈** なので、背景色は
   * default に戻り、ページの上にあることは scrim と elevation が表現する。
   * これによりシート内のカードも raised を使えて、白の天井にぶつからない。
   */
  surface: {
    sunken: string; // -1: 凹み (入力欄の地・トラック・非選択の塗り)
    default: string; //  0: 文脈の地 (ページ / シート / ダイアログ)
    raised: string; // +1: カード
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
      // disabled背景の上に乗せる文字色。content.secondary(ページ上の補助テキスト
      // 用に設計された色)を流用すると、disabled背景の明暗によっては
      // コントラストが成立しない (2026-08-07指摘、dark ではCR1.77だった)。
      onDisabled: string;
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
      onDisabled: string;
    };
    ghost: {
      default: string; // 通常は transparent
      pressed: string;
      disabled: string;
      onDisabled: string;
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

  /**
   * border は「装飾の線」と「操作可能要素の輪郭」で要求が違う。
   *
   * default / subtle / strong は **区切り線・面の縁** (装飾) 用で、面と同じ
   * ivory 家系から取っているため背景比 3:1 は原理的に出ない。WCAG 1.4.11 は
   * 装飾的な区切り線に 3:1 を要求しないので、これは仕様どおり。
   *
   * 一方 Chip / SelectCard / 選択タイルのように **枠が「ここが操作できる範囲だ」を
   * 伝えている** 要素は 1.4.11 の対象になる。そちらは interactive / selected を使う
   * (stone 家系 = 描画物の家系から取り、dark は背景比 3:1 を満たす)。
   *
   * ただし light の interactive は例外: 近白背景で 3:1 に必要な濃さ (stone[500]) が
   * 視覚的に重すぎたため、意図的に stone[300] (1.82:1、1.4.11 未達) に留めている
   * (light.ts のコメント参照、2026-08-09)。dark は同じ問題が出ないため 3:1 適合のまま。
   *
   * 「区切り線か、操作対象の輪郭か」で選ぶこと。見た目の濃さで選ばない。
   */
  border: {
    default: string;
    subtle: string;
    strong: string;
    /** 操作可能要素の非選択枠。dark は背景比 3:1 以上、light は意図的な例外 (light.ts 参照) */
    interactive: string;
    /** 操作可能要素の選択中の枠。interactive との明度差で状態を伝える */
    selected: string;
    /** テキスト選択ハイライト / フォーカスリング。選択状態の枠には selected を使う */
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
      // onGraphic = graphic色の塗り(カレンダードット等)の上に直接文字を置く場合の色。
      // graphicはtheme非依存の固定トーン(400番)なので、onGraphicも同じくtheme非依存の
      // 固定色にする(light/dark両方で同じ値)。
      within:       { text: string; graphic: string; background: string; onGraphic: string }; // 予算内 (健康的)
      mildExceed:   { text: string; graphic: string; background: string; onGraphic: string }; // 軽度超過 (注意)
      severeExceed: { text: string; graphic: string; background: string; onGraphic: string }; // 大幅超過 (警告)
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
