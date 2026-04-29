/**
 * Typography primitive tokens — フォント・サイズ・行間・ウェイト。
 *
 * 設計方針:
 * - 独自スケール (xs/sm/md/lg/xl/2xl/display) で Material (MD Type Scale) と
 *   iOS HIG (Type Style) の両方に意味写像しやすい粒度にする。
 * - Plus Jakarta Sans を primary にし、iOS/Android/Web のフォールバックを用意。
 * - lineHeight は数値 (RN: number = px) で保持。letter spacing は px で保持。
 */

export const fontFamily = {
  display:
    'PlusJakartaSans_700Bold, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  heading:
    'PlusJakartaSans_600SemiBold, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body:
    'PlusJakartaSans_400Regular, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:
    'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15, // body default
  lg: 17, // iOS body default
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  display: 44,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 22,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 42,
  display: 52,
} as const;

export const letterSpacing = {
  tighter: -0.8,
  tight: -0.3,
  normal: 0,
  wide: 0.2,
  wider: 0.6,
} as const;

export type FontFamilyToken = keyof typeof fontFamily;
export type FontWeightToken = keyof typeof fontWeight;
export type FontSizeToken = keyof typeof fontSize;
