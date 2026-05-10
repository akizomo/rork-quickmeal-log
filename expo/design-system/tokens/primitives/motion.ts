/**
 * Motion primitive tokens — アニメーション時間・イージング・スプリング
 *
 * ## 使い分けルール
 *
 * ### Timing (duration + easing)
 * | token   | ms  | easing    | 用途                                  |
 * |---------|-----|-----------|---------------------------------------|
 * | fast    | 120 | standard  | opacity 単体、マイクロフィードバック  |
 * | short   | 200 | exit      | 要素の退場、シンプルなフェード        |
 * | medium  | 300 | standard  | 画面内遷移 (Stack animationDuration)  |
 * | long    | 450 | enter     | 要素の入場、プログレスリング          |
 * | xlong   | 600 | enter     | 長い演出・イラストアニメーション      |
 *
 * ### Easing (cubic bezier — Easing.bezier(...easing.enter) で使用)
 * | token    | 用途                                           |
 * |----------|------------------------------------------------|
 * | standard | 画面内遷移・汎用 (M3 Emphasized)               |
 * | enter    | 要素の入場: 滑らかに減速 (M3 Emp. Decelerate)  |
 * | exit     | 要素の退場: すばやく加速 (M3 Emp. Accelerate)  |
 *
 * ### Spring (tension/friction — Animated.spring({ ...spring.enter, useNativeDriver: true }))
 * | token | 用途                                             |
 * |-------|--------------------------------------------------|
 * | enter | シート/モーダル入場: 自然な浮き上がり            |
 * | exit  | シート/モーダル退場: すっと消える                |
 * | snap  | ドラッグ解放後のスナップバック                   |
 * | pop   | フィードバック要素の出現 (ごく軽いバウンス)      |
 */

export const duration = {
  instant: 0,
  fast:   120, // M3 short3: opacity 変化のみ
  short:  200, // M3 short4: 要素の退場・シンプルなフェード
  medium: 300, // M3 medium2: 画面内遷移 (Stack animationDuration と同値)
  long:   450, // M3 long1: 要素の入場・プログレスリング
  xlong:  600, // M3 long4: 長い演出
} as const;

export const easing = {
  // 画面内遷移・汎用 (M3 Emphasized: cubic-bezier(0.2, 0, 0, 1))
  standard: [0.2, 0, 0, 1] as const,
  // 要素の入場 — 滑らかに減速 (M3 Emphasized Decelerate: cubic-bezier(0, 0, 0, 1))
  enter:    [0, 0, 0, 1] as const,
  // 要素の退場 — すばやく加速 (M3 Emphasized Accelerate: cubic-bezier(0.3, 0, 1, 1))
  exit:     [0.3, 0, 1, 1] as const,
} as const;

/**
 * スプリング設定プリセット (tension/friction API)
 * 使用例: Animated.spring(val, { ...spring.enter, useNativeDriver: true }).start()
 */
export const spring = {
  // シート/モーダル入場: わずかに underdamped で自然な浮き上がり感
  enter: { tension: 65, friction: 11 },
  // シート/モーダル退場: overdamped でスパッと消える
  exit:  { tension: 100, friction: 20 },
  // ドラッグ解放後のスナップバック
  snap:  { tension: 90, friction: 12 },
  // フィードバック要素の出現 (ごく軽いバウンス)
  pop:   { tension: 160, friction: 14 },
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;
