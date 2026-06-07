/**
 * Tests for goals.ts — v1.7 goal-anchor & manual target-weight helpers (PRD §6.4.4).
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test goals
 */

import {
  BMI_OVERWEIGHT,
  BMI_UNDERWEIGHT,
  bmiFromWeight,
  classifyTargetWeight,
  deriveDirectionFromWeights,
  estimateMonthsToTarget,
  formatGoalDuration,
  healthyWeightRange,
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

  it('ok inside the normal band (BMI 18.5–25)', () => {
    expect(classifyTargetWeight(64, H)).toBe('ok'); // BMI ~22.1
    expect(classifyTargetWeight(weightForBmi(22, H), H)).toBe('ok');
  });

  it('soft just below 18.5 but at/above 17.5', () => {
    expect(classifyTargetWeight(52, H)).toBe('soft'); // BMI ~17.99
  });

  it('soft above 25 (JASSO overweight, not the legacy 27)', () => {
    expect(classifyTargetWeight(75, H)).toBe('soft'); // BMI ~25.95
  });

  it('hard below 17.5 (ED clinical referral line)', () => {
    expect(classifyTargetWeight(49, H)).toBe('hard'); // BMI ~16.96
  });

  it('boundary semantics: 17.5 floor is inclusive-soft, 25 ceiling is inclusive-ok', () => {
    // pass raw (unrounded) weights so the threshold logic is tested, not weightForBmi rounding
    expect(classifyTargetWeight(50.575, H)).toBe('soft'); // BMI exactly 17.5 → not hard
    expect(classifyTargetWeight(50.5, H)).toBe('hard'); // BMI ~17.47 → hard
    expect(classifyTargetWeight(72.25, H)).toBe('ok'); // BMI exactly 25.0 → ok
    expect(classifyTargetWeight(72.5, H)).toBe('soft'); // BMI ~25.09 → soft
  });

  it('skips judgement (ok) when height or weight is unknown', () => {
    expect(classifyTargetWeight(40, null)).toBe('ok');
    expect(classifyTargetWeight(null, H)).toBe('ok');
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
