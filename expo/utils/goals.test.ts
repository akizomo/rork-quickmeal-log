/**
 * Tests for goals.ts — v1.7 goal-anchor & manual target-weight helpers (PRD §6.4.4).
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test goals
 */

import {
  BMI_OVERWEIGHT,
  BMI_UNDERWEIGHT,
  CARRYOVER_HARD_FLOOR_KCAL,
  bmiFromWeight,
  carryoverSoftFloorKcal,
  classifyCarryoverDeduction,
  classifyTargetBodyFat,
  classifyTargetWeight,
  deriveDirectionFromWeights,
  estimateMonthsToTarget,
  formatGoalDuration,
  healthyWeightRange,
  minCarryoverDays,
  projectBodyFatAtWeight,
  weightForBmi,
} from './goals';

describe('bmiFromWeight / weightForBmi', () => {
  it('computes BMI from weight and height', () => {
    expect(bmiFromWeight(72, 170)).toBeCloseTo(24.91, 1);
    expect(bmiFromWeight(50, 160)).toBeCloseTo(19.53, 1);
  });

  it('is the inverse of weightForBmi', () => {
    const w = weightForBmi(22, 170);
    expect(bmiFromWeight(w, 170)).toBeCloseTo(22, 1);
  });
});

describe('healthyWeightRange', () => {
  it('returns the 18.5–25 BMI band in kg', () => {
    const r = healthyWeightRange(170);
    expect(r).not.toBeNull();
    expect(r!.minKg).toBeCloseTo(weightForBmi(BMI_UNDERWEIGHT, 170), 5);
    expect(r!.maxKg).toBeCloseTo(weightForBmi(BMI_OVERWEIGHT, 170), 5);
    // 170cm → 53.5 .. 72.3 kg
    expect(r!.minKg).toBeCloseTo(53.5, 1);
    expect(r!.maxKg).toBeCloseTo(72.3, 1);
  });

  it('returns null for missing/invalid height', () => {
    expect(healthyWeightRange(null)).toBeNull();
    expect(healthyWeightRange(0)).toBeNull();
  });
});

describe('classifyTargetWeight', () => {
  const H = 170; // 170cm: 17.5→50.6, 18.5→53.5, 25→72.3 kg

  it('ok inside the normal band (BMI 18.5–25) regardless of direction', () => {
    expect(classifyTargetWeight(64, H, 'lose')).toBe('ok'); // BMI ~22.1
    expect(classifyTargetWeight(weightForBmi(22, H), H, 'gain')).toBe('ok');
  });

  it('lose direction only checks the floor — overshoot above 25 is not flagged', () => {
    // 改善方向 (減量) で「まだ標準体重より重い」ことを理由に警告しない。
    expect(classifyTargetWeight(75, H, 'lose')).toBe('ok'); // BMI ~25.95, still lose direction
    expect(classifyTargetWeight(52, H, 'lose')).toBe('soft'); // BMI ~17.99, undershoot
    expect(classifyTargetWeight(49, H, 'lose')).toBe('hard'); // BMI ~16.96
  });

  it('gain direction only checks the ceiling — undershoot below 18.5 is not flagged', () => {
    expect(classifyTargetWeight(52, H, 'gain')).toBe('ok'); // BMI ~17.99, still gain direction
    expect(classifyTargetWeight(75, H, 'gain')).toBe('soft'); // BMI ~25.95, overshoot
    expect(classifyTargetWeight(49, H, 'gain')).toBe('ok'); // gain has no hard ceiling
  });

  it('maintain/recomp/unknown direction skips judgement entirely', () => {
    expect(classifyTargetWeight(49, H, 'maintain')).toBe('ok');
    expect(classifyTargetWeight(49, H, 'recomp')).toBe('ok');
    expect(classifyTargetWeight(49, H, null)).toBe('ok');
  });

  it('boundary semantics: 17.5 floor is inclusive-soft (lose direction)', () => {
    // pass raw (unrounded) weights so the threshold logic is tested, not weightForBmi rounding
    expect(classifyTargetWeight(50.575, H, 'lose')).toBe('soft'); // BMI exactly 17.5 → not hard
    expect(classifyTargetWeight(50.5, H, 'lose')).toBe('hard'); // BMI ~17.47 → hard
  });

  it('boundary semantics: 25 ceiling is inclusive-ok (gain direction)', () => {
    expect(classifyTargetWeight(72.25, H, 'gain')).toBe('ok'); // BMI exactly 25.0 → ok
    expect(classifyTargetWeight(72.5, H, 'gain')).toBe('soft'); // BMI ~25.09 → soft
  });

  it('skips judgement (ok) when height or weight is unknown', () => {
    expect(classifyTargetWeight(40, null, 'lose')).toBe('ok');
    expect(classifyTargetWeight(null, H, 'lose')).toBe('ok');
  });
});

describe('deriveDirectionFromWeights', () => {
  it('maintain within ±0.5kg', () => {
    expect(deriveDirectionFromWeights(70, 70)).toBe('maintain');
    expect(deriveDirectionFromWeights(70, 70.4)).toBe('maintain');
    expect(deriveDirectionFromWeights(70, 69.6)).toBe('maintain');
  });

  it('lose when target is lighter', () => {
    expect(deriveDirectionFromWeights(77, 73)).toBe('lose');
  });

  it('gain when target is heavier', () => {
    expect(deriveDirectionFromWeights(74, 78)).toBe('gain');
  });
});

describe('estimateMonthsToTarget', () => {
  it('lose at standard pace: 80→73 ≈ 4 months', () => {
    // weeklyKg = 80 * 0.005 * 1.0 = 0.4kg → 7kg / 0.4 = 17.5wk / 4.345 ≈ 4.03mo
    const m = estimateMonthsToTarget(80, 73, 'standard', 'lose');
    expect(m).not.toBeNull();
    expect(m!).toBeCloseTo(4.03, 1);
  });

  it('gentle pace takes longer than strong pace', () => {
    const gentle = estimateMonthsToTarget(80, 73, 'gentle', 'lose')!;
    const strong = estimateMonthsToTarget(80, 73, 'strong', 'lose')!;
    expect(gentle).toBeGreaterThan(strong);
  });

  it('returns null for maintain/recomp', () => {
    expect(estimateMonthsToTarget(80, 80, 'standard', 'maintain')).toBeNull();
    expect(estimateMonthsToTarget(80, 80, 'standard', 'recomp')).toBeNull();
  });

  it('returns null when there is no delta', () => {
    expect(estimateMonthsToTarget(80, 80, 'standard', 'lose')).toBeNull();
  });
});

describe('formatGoalDuration', () => {
  it('renders months in 0.5 steps', () => {
    expect(formatGoalDuration(2.5)).toBe('約 2.5 ヶ月');
    expect(formatGoalDuration(4.03)).toBe('約 4 ヶ月');
  });

  it('renders weeks under 1 month', () => {
    expect(formatGoalDuration(0.5)).toBe('約 2 週間');
    expect(formatGoalDuration(0.1)).toBe('約 1 週間');
  });

  it('caps very long horizons', () => {
    expect(formatGoalDuration(12)).toBe('1 年以上');
    expect(formatGoalDuration(20)).toBe('1 年以上');
  });
});

describe('carryoverSoftFloorKcal', () => {
  it('mirrors the goal kcal floor (PRD §6.4.1)', () => {
    expect(carryoverSoftFloorKcal('male_basis')).toBe(1500);
    expect(carryoverSoftFloorKcal('female_basis')).toBe(1200);
  });

  it('falls back to the lower floor when basis is unknown', () => {
    expect(carryoverSoftFloorKcal(null)).toBe(1200);
    expect(carryoverSoftFloorKcal(undefined)).toBe(1200);
  });

  it('never inverts with the hard floor', () => {
    for (const basis of ['male_basis', 'female_basis', null] as const) {
      expect(carryoverSoftFloorKcal(basis)).toBeGreaterThan(CARRYOVER_HARD_FLOOR_KCAL);
    }
  });
});

describe('classifyCarryoverDeduction', () => {
  it('judges the effective target, not the deduction size', () => {
    // 同じ 300kcal 控除でも、目標が違えば判定が変わる
    expect(classifyCarryoverDeduction(2400, 300, 'male_basis')).toBe('ok'); // 実効 2100
    expect(classifyCarryoverDeduction(1730, 300, 'male_basis')).toBe('soft'); // 実効 1430 < 1500
    expect(classifyCarryoverDeduction(1270, 300, 'female_basis')).toBe('hard'); // 実効 970 < 1000
  });

  it('boundaries are inclusive on the safe side', () => {
    expect(classifyCarryoverDeduction(2000, 1000, 'female_basis')).toBe('soft'); // 実効ちょうど 1000
    expect(classifyCarryoverDeduction(2000, 1001, 'female_basis')).toBe('hard'); // 実効 999
    expect(classifyCarryoverDeduction(2000, 800, 'female_basis')).toBe('ok'); // 実効ちょうど 1200
    expect(classifyCarryoverDeduction(2000, 801, 'female_basis')).toBe('soft'); // 実効 1199
  });

  it('skips judgement when the target is not set yet', () => {
    expect(classifyCarryoverDeduction(0, 500, 'male_basis')).toBe('ok');
  });
});

describe('minCarryoverDays', () => {
  const MAX = 14;

  it('allows 1 day when the deduction stays above the hard floor', () => {
    // 目標2400・余剰600 → 1日でも実効1800なので分割不要
    expect(minCarryoverDays(2400, 600, MAX)).toBe(1);
  });

  it('forces more days when a single day would breach the hard floor', () => {
    // 目標1270・余剰600 → 1日=実効670(NG) / 2日=300で実効970(NG) / 3日=200で実効1070(OK)
    expect(minCarryoverDays(1270, 600, MAX)).toBe(3);
  });

  it('is consistent with classifyCarryoverDeduction at the returned minimum', () => {
    const target = 1270;
    const surplus = 600;
    const days = minCarryoverDays(target, surplus, MAX);
    expect(classifyCarryoverDeduction(target, Math.ceil(surplus / days), 'female_basis')).not.toBe('hard');
    // 1日でも減らすと hard に落ちる = 真の境界であること
    expect(classifyCarryoverDeduction(target, Math.ceil(surplus / (days - 1)), 'female_basis')).toBe('hard');
  });

  it('caps at maxDays when even full splitting cannot clear the floor', () => {
    expect(minCarryoverDays(1100, 5000, MAX)).toBe(MAX);
  });

  it('returns 1 for degenerate inputs', () => {
    expect(minCarryoverDays(0, 600, MAX)).toBe(1);
    expect(minCarryoverDays(2000, 0, MAX)).toBe(1);
  });
});

describe('classifyTargetBodyFat', () => {
  it('lose/recomp: flags below-essential-fat targets as hard', () => {
    expect(classifyTargetBodyFat(4, 'male_basis', 'lose')).toBe('hard');
    expect(classifyTargetBodyFat(12, 'female_basis', 'recomp')).toBe('hard');
  });

  it('lose/recomp: flags athlete-range targets as soft-low', () => {
    expect(classifyTargetBodyFat(8, 'male_basis', 'lose')).toBe('soft-low');
    expect(classifyTargetBodyFat(15, 'female_basis', 'recomp')).toBe('soft-low');
  });

  it('lose direction never flags the ceiling — improvement from obesity is not scolded', () => {
    // 30%から25%を目指す、という改善方向の目標に上限超過の警告は出さない。
    expect(classifyTargetBodyFat(26, 'male_basis', 'lose')).toBe('ok');
    expect(classifyTargetBodyFat(33, 'female_basis', 'lose')).toBe('ok');
  });

  it('gain: flags above-obesity-threshold targets as soft-high', () => {
    expect(classifyTargetBodyFat(26, 'male_basis', 'gain')).toBe('soft-high');
    expect(classifyTargetBodyFat(33, 'female_basis', 'gain')).toBe('soft-high');
  });

  it('gain direction never flags the floor', () => {
    expect(classifyTargetBodyFat(4, 'male_basis', 'gain')).toBe('ok');
  });

  it('maintain/unknown direction skips judgement entirely', () => {
    expect(classifyTargetBodyFat(4, 'male_basis', 'maintain')).toBe('ok');
    expect(classifyTargetBodyFat(4, 'male_basis', null)).toBe('ok');
  });

  it('accepts mid-range targets', () => {
    expect(classifyTargetBodyFat(18, 'male_basis', 'lose')).toBe('ok');
    expect(classifyTargetBodyFat(25, 'female_basis', 'gain')).toBe('ok');
  });

  it('skips judgement when basis or value is unknown', () => {
    expect(classifyTargetBodyFat(3, null, 'lose')).toBe('ok');
    expect(classifyTargetBodyFat(null, 'male_basis', 'lose')).toBe('ok');
  });
});

describe('projectBodyFatAtWeight', () => {
  it('drops BF% when losing weight (fat-first)', () => {
    // 80kg @ 25% = 20kg fat. -10kg のうち 75% (7.5kg) が脂肪 → 12.5kg / 70kg = 17.9%
    expect(projectBodyFatAtWeight(80, 25, 70)).toBe(18);
  });

  it('rises only mildly when gaining weight (muscle-led)', () => {
    // 60kg @ 20% = 12kg fat. +5kg のうち 30% (1.5kg) が脂肪 → 13.5kg / 65kg = 20.8%
    expect(projectBodyFatAtWeight(60, 20, 65)).toBe(21);
  });

  it('is unchanged when the target equals the current weight', () => {
    expect(projectBodyFatAtWeight(70, 22, 70)).toBe(22);
  });

  it('stays consistent with the target weight it was given', () => {
    // 目標体重と必ず組で整合すること — これが手動指定時の不整合バグの回帰テスト。
    const bf = projectBodyFatAtWeight(80, 25, 55);
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThanOrEqual(0);
    expect(bf!).toBeLessThan(25);
  });

  it('returns null when current BF% is unknown', () => {
    expect(projectBodyFatAtWeight(80, null, 70)).toBeNull();
    expect(projectBodyFatAtWeight(null, 25, 70)).toBeNull();
    expect(projectBodyFatAtWeight(80, 25, null)).toBeNull();
  });
});
