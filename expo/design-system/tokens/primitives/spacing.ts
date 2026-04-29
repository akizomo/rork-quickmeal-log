/**
 * Spacing primitive tokens — 4px ベースの段階スケール。
 *
 * Material (4dp grid) / iOS HIG (通常8pt刻みだが4pt補助あり) どちらにも対応。
 * 命名は数値ベース (xs/sm/md ではなく 0/1/2...) にし、乗算で直感的に扱えるようにする。
 */

export const spacing = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '32': 128,
} as const;

export type SpacingToken = keyof typeof spacing;
