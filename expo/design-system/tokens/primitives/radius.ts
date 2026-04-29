/**
 * Radius primitive tokens — 角丸の段階。
 *
 * iOS HIG (大きめ 10〜24) に合わせつつ、Material の小さめ radius も表現できる。
 * PRD の shape.border-radius: 24px / button-radius: 16px / input-radius: 12px を包含。
 */

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12, // input
  lg: 16, // button
  xl: 20,
  '2xl': 24, // card
  '3xl': 32,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
