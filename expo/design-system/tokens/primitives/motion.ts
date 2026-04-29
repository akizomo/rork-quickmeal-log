/**
 * Motion primitive tokens — アニメーション時間と easing。
 *
 * - Material Motion の duration 区分と iOS の natural motion を包含。
 * - easing は React Native Animated / Reanimated で使える cubic bezier 係数。
 */

export const duration = {
  instant: 0,
  fast: 120,
  base: 200,
  slow: 320,
  slower: 480,
  slowest: 640,
} as const;

export const easing = {
  // Material "standard" / iOS "ease-in-out" 相当
  standard: [0.2, 0, 0, 1] as const,
  // 減速 (要素が入ってくる時)
  decelerate: [0, 0, 0, 1] as const,
  // 加速 (要素が出ていく時)
  accelerate: [0.3, 0, 1, 1] as const,
  // ばね的
  emphasized: [0.2, 0, 0, 1] as const,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
