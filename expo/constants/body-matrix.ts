import { BiologicalBasis, BodyAxisLevel, BodyStage, BodyType9 } from '@/types/nutrition';

// 9-cell body type matrix definitions.
// Reference values per cell are ranges of BMI and body fat percentage.
// Based on general fitness/health guidelines (ACSM, ISSN) for visualization.
// `bodyFatMax = null` means an open upper bound (displayed as "n%+").

export interface BodyMatrixCellRef {
  bmiMin: number;
  bmiMax: number;
  bodyFatMin: number;
  bodyFatMax: number | null; // null => open-ended (display "+")
}

// Index: [muscleLevel][fatLevel] (0-2 × 0-2)
export const MALE_BODY_MATRIX: readonly (readonly BodyMatrixCellRef[])[] = [
  // muscle = 少なめ (0)
  [
    { bmiMin: 17, bmiMax: 19, bodyFatMin: 10, bodyFatMax: 14 },
    { bmiMin: 19, bmiMax: 22, bodyFatMin: 18, bodyFatMax: 22 },
    { bmiMin: 23, bmiMax: 27, bodyFatMin: 25, bodyFatMax: null },
  ],
  // muscle = ふつう (1)
  [
    { bmiMin: 19, bmiMax: 21, bodyFatMin: 10, bodyFatMax: 15 },
    { bmiMin: 21, bmiMax: 24, bodyFatMin: 15, bodyFatMax: 20 },
    { bmiMin: 24, bmiMax: 27, bodyFatMin: 22, bodyFatMax: 27 },
  ],
  // muscle = 多め (2)
  [
    { bmiMin: 21, bmiMax: 23, bodyFatMin: 8, bodyFatMax: 12 },
    { bmiMin: 24, bmiMax: 26, bodyFatMin: 13, bodyFatMax: 17 },
    { bmiMin: 27, bmiMax: 30, bodyFatMin: 20, bodyFatMax: 25 },
  ],
];

export const FEMALE_BODY_MATRIX: readonly (readonly BodyMatrixCellRef[])[] = [
  // muscle = 少なめ (0)
  [
    { bmiMin: 16, bmiMax: 18, bodyFatMin: 18, bodyFatMax: 22 },
    { bmiMin: 18, bmiMax: 21, bodyFatMin: 25, bodyFatMax: 30 },
    { bmiMin: 23, bmiMax: 27, bodyFatMin: 32, bodyFatMax: null },
  ],
  // muscle = ふつう (1)
  [
    { bmiMin: 18, bmiMax: 20, bodyFatMin: 18, bodyFatMax: 22 },
    { bmiMin: 20, bmiMax: 23, bodyFatMin: 23, bodyFatMax: 28 },
    { bmiMin: 24, bmiMax: 27, bodyFatMin: 30, bodyFatMax: 35 },
  ],
  // muscle = 多め (2)
  [
    { bmiMin: 20, bmiMax: 22, bodyFatMin: 16, bodyFatMax: 20 },
    { bmiMin: 23, bmiMax: 25, bodyFatMin: 21, bodyFatMax: 25 },
    { bmiMin: 26, bmiMax: 29, bodyFatMin: 27, bodyFatMax: 32 },
  ],
];

// Axis labels (statement-neutral, no value judgment).
export const FAT_AXIS_LABELS: Record<BodyAxisLevel, string> = {
  0: '脂肪:少なめ',
  1: '脂肪:ふつう',
  2: '脂肪:多め',
};

export const MUSCLE_AXIS_LABELS: Record<BodyAxisLevel, string> = {
  0: '筋量:少なめ',
  1: '筋量:ふつう',
  2: '筋量:多め',
};

export function getMatrix(basis: BiologicalBasis): readonly (readonly BodyMatrixCellRef[])[] {
  return basis === 'male_basis' ? MALE_BODY_MATRIX : FEMALE_BODY_MATRIX;
}

export function getCellRef(basis: BiologicalBasis, cell: BodyType9): BodyMatrixCellRef {
  return getMatrix(basis)[cell.muscle][cell.fat];
}

/**
 * Reference weight range at user's height for a given cell.
 * Returns rounded kg values from BMI range × height².
 */
export function getCellReferenceWeightRange(
  basis: BiologicalBasis,
  cell: BodyType9,
  heightCm: number
): { min: number; max: number } {
  const ref = getCellRef(basis, cell);
  const h = heightCm / 100;
  const m2 = h * h;
  return {
    min: Math.round(ref.bmiMin * m2),
    max: Math.round(ref.bmiMax * m2),
  };
}

/** Midpoint body fat for cells with a defined max; for open-ended uses the min. */
export function getCellBodyFatTypical(ref: BodyMatrixCellRef): number {
  if (ref.bodyFatMax == null) return ref.bodyFatMin;
  return Math.round((ref.bodyFatMin + ref.bodyFatMax) / 2);
}

export function formatWeightRange(range: { min: number; max: number }): string {
  if (range.min === range.max) return `${range.min}kg`;
  return `${range.min}–${range.max}kg`;
}

export function formatBodyFatRange(ref: BodyMatrixCellRef): string {
  if (ref.bodyFatMax == null) return `${ref.bodyFatMin}%+`;
  if (ref.bodyFatMin === ref.bodyFatMax) return `${ref.bodyFatMin}%`;
  return `${ref.bodyFatMin}–${ref.bodyFatMax}%`;
}

/**
 * Map a 9-cell body type to a legacy 5-stage body stage
 * (for rendering with existing BodyTypeSilhouette until 18 SVGs are ready).
 */
export function bodyType9ToStage(cell: BodyType9): BodyStage {
  if (cell.fat === 0 && cell.muscle === 0) return 1;
  if (cell.fat === 0) return 2;
  if (cell.fat === 1) return 3;
  if (cell.fat === 2 && cell.muscle === 0) return 5;
  return 4;
}

export function bodyType9Equal(a: BodyType9 | null | undefined, b: BodyType9 | null | undefined): boolean {
  if (!a || !b) return false;
  return a.fat === b.fat && a.muscle === b.muscle;
}

/**
 * Auto-derive a natural target cell from current cell + direction.
 *
 * - lose: reduce fat by 1 step (clamp at 0)
 * - maintain: same cell
 * - gain: add 1 step of muscle; if already maxed, add fat (bulk)
 */
export function deriveTargetCellFromDirection(
  current: BodyType9,
  direction: 'lose' | 'maintain' | 'gain'
): BodyType9 {
  if (direction === 'maintain') return current;
  if (direction === 'lose') {
    return {
      fat: Math.max(0, current.fat - 1) as BodyAxisLevel,
      muscle: current.muscle,
    };
  }
  // gain: prefer muscle increase, fall back to bulk (fat up)
  if (current.muscle < 2) {
    return {
      fat: current.fat,
      muscle: (current.muscle + 1) as BodyAxisLevel,
    };
  }
  return {
    fat: Math.min(2, current.fat + 1) as BodyAxisLevel,
    muscle: current.muscle,
  };
}
