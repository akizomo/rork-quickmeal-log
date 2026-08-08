/**
 * Tests for amount-edit.ts
 *
 * Pure-logic layer for the Amount Edit Dialog.
 * All tests run in Node environment (no React Native APIs).
 *
 * TDD order: this file was written BEFORE amount-edit.ts.
 * Run: cd expo && bun test amount-edit
 */

import {
  parseAmountInput,
  clampToRange,
  snapToStep,
  isValidAmount,
  incrementBy,
  decrementBy,
  matchesPreset,
  wouldKeystrokeProduceOutOfRange,
  buildSushiAmountEditConfig,
  buildPizzaAmountEditConfig,
  buildIdentityAmountEditConfig,
  stepperStepAt,
  type AmountEditConfig,
} from './amount-edit';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const intConfig: AmountEditConfig = {
  min: 1,
  max: 30,
  step: 1,
  decimals: 0,
  unitLabel: '貫',
  presets: [6, 8, 10, 12, 16, 20],
  defaultValue: 8,
};

const halfConfig: AmountEditConfig = {
  min: 1,
  max: 10,
  step: 0.5,
  decimals: 1,
  unitLabel: '玉',
  presets: [1, 1.5, 2, 3],
  defaultValue: 2,
};

// ---------------------------------------------------------------------------
// parseAmountInput
// ---------------------------------------------------------------------------

describe('parseAmountInput', () => {
  it('empty string → null', () => {
    expect(parseAmountInput('', intConfig)).toBeNull();
  });

  it('whitespace only → null', () => {
    expect(parseAmountInput('   ', intConfig)).toBeNull();
  });

  it('negative number → null', () => {
    expect(parseAmountInput('-3', intConfig)).toBeNull();
  });

  it('non-numeric string → null', () => {
    expect(parseAmountInput('abc', intConfig)).toBeNull();
  });

  it('simple integer', () => {
    expect(parseAmountInput('8', intConfig)).toBe(8);
  });

  it('full-width digit (８)', () => {
    expect(parseAmountInput('８', intConfig)).toBe(8);
  });

  it('full-width digits (２０)', () => {
    expect(parseAmountInput('２０', intConfig)).toBe(20);
  });

  it('full-width decimal (８．５) with decimals=1', () => {
    expect(parseAmountInput('８．５', halfConfig)).toBe(8.5);
  });

  it('decimal string with decimals=1', () => {
    expect(parseAmountInput('8.5', halfConfig)).toBe(8.5);
  });

  it('decimal string with decimals=0 → integer part only', () => {
    expect(parseAmountInput('8.5', intConfig)).toBe(8);
  });

  it('leading zero (08)', () => {
    expect(parseAmountInput('08', intConfig)).toBe(8);
  });

  it('trailing dot (5.) → 5', () => {
    expect(parseAmountInput('5.', halfConfig)).toBe(5);
  });

  it('leading dot (.5) with decimals=1 → 0.5', () => {
    expect(parseAmountInput('.5', halfConfig)).toBe(0.5);
  });

  it('multiple dots (8.5.5) with decimals=1 → 8.5', () => {
    expect(parseAmountInput('8.5.5', halfConfig)).toBe(8.5);
  });

  it('mixed alpha-numeric (12abc34) → 1234', () => {
    expect(parseAmountInput('12abc34', intConfig)).toBe(1234);
  });

  it('dot-only (.) → null', () => {
    expect(parseAmountInput('.', halfConfig)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clampToRange
// ---------------------------------------------------------------------------

describe('clampToRange', () => {
  it('below min → min', () => {
    expect(clampToRange(0, intConfig)).toBe(1);
  });

  it('exactly min → min', () => {
    expect(clampToRange(1, intConfig)).toBe(1);
  });

  it('in range → unchanged', () => {
    expect(clampToRange(15, intConfig)).toBe(15);
  });

  it('exactly max → max', () => {
    expect(clampToRange(30, intConfig)).toBe(30);
  });

  it('above max → max', () => {
    expect(clampToRange(99, intConfig)).toBe(30);
  });

  it('NaN → min', () => {
    expect(clampToRange(NaN, intConfig)).toBe(1);
  });

  it('Infinity → max', () => {
    expect(clampToRange(Infinity, intConfig)).toBe(30);
  });

  it('-Infinity → min', () => {
    expect(clampToRange(-Infinity, intConfig)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// snapToStep
// ---------------------------------------------------------------------------

describe('snapToStep', () => {
  it('step=1: 2.4 → 2', () => {
    expect(snapToStep(2.4, intConfig)).toBe(2);
  });

  it('step=1: 2.6 → 3', () => {
    expect(snapToStep(2.6, intConfig)).toBe(3);
  });

  it('step=1: exact integer → unchanged', () => {
    expect(snapToStep(8, intConfig)).toBe(8);
  });

  it('step=0.5: 2.74 → 2.5', () => {
    expect(snapToStep(2.74, halfConfig)).toBeCloseTo(2.5);
  });

  it('step=0.5: 2.76 → 3.0', () => {
    expect(snapToStep(2.76, halfConfig)).toBeCloseTo(3.0);
  });

  it('step=0.5: exactly 2.5 → 2.5', () => {
    expect(snapToStep(2.5, halfConfig)).toBeCloseTo(2.5);
  });

  it('snap and clamp: value below min snaps to min', () => {
    // halfConfig min=1; snapToStep(0.3) = snap to 0.5, but then clamp to 1
    expect(snapToStep(0.3, halfConfig)).toBeCloseTo(1);
  });

  it('snap and clamp: value above max snaps to max', () => {
    // halfConfig max=10; snapToStep(10.4) = snap to 10.5, clamp to 10
    expect(snapToStep(10.4, halfConfig)).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// isValidAmount
// ---------------------------------------------------------------------------

describe('isValidAmount', () => {
  it('in-range, step-aligned → true', () => {
    expect(isValidAmount(8, intConfig)).toBe(true);
  });

  it('at min → true', () => {
    expect(isValidAmount(1, intConfig)).toBe(true);
  });

  it('at max → true', () => {
    expect(isValidAmount(30, intConfig)).toBe(true);
  });

  it('below min → false', () => {
    expect(isValidAmount(0, intConfig)).toBe(false);
  });

  it('above max → false', () => {
    expect(isValidAmount(31, intConfig)).toBe(false);
  });

  it('NaN → false', () => {
    expect(isValidAmount(NaN, intConfig)).toBe(false);
  });

  it('off-step with step=0.5 (2.3) → false', () => {
    expect(isValidAmount(2.3, halfConfig)).toBe(false);
  });

  it('step-aligned with step=0.5 (2.5) → true', () => {
    expect(isValidAmount(2.5, halfConfig)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// incrementBy / decrementBy
// ---------------------------------------------------------------------------

describe('incrementBy', () => {
  it('mid-range: +1', () => {
    expect(incrementBy(8, intConfig)).toBe(9);
  });

  it('at max: no change', () => {
    expect(incrementBy(30, intConfig)).toBe(30);
  });

  it('step=0.5: 2 → 2.5', () => {
    expect(incrementBy(2, halfConfig)).toBeCloseTo(2.5);
  });

  it('non-snapped input (2.3, step=0.5): 直上の格子点 → 2.5', () => {
    // 「snap してから +step」だと 2.5 を飛ばして 3.0 に行ってしまう。
    // +/- は「一段上/下の有効値へ移る」意味なので 2.5 が正しい。
    expect(incrementBy(2.3, halfConfig)).toBeCloseTo(2.5);
  });

  it('at max with step=0.5: stays at max', () => {
    expect(incrementBy(10, halfConfig)).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// stepperTiers (段階制の +/- 刻み)
// ---------------------------------------------------------------------------

describe('stepperTiers', () => {
  // 数え物の既定: 1未満は 0.5 刻み / 1以上は 1 刻み。入力グリッドは 0.25。
  const countConfig: AmountEditConfig = {
    min: 0.25,
    max: 8,
    step: 0.25,
    stepperTiers: [
      { upTo: 1, step: 0.5 },
      { upTo: Infinity, step: 1 },
    ],
    decimals: 2,
    unitLabel: '個',
    presets: [0.5, 1, 2],
    defaultValue: 1,
  };

  it('1個以上は 1 刻みで上がる', () => {
    expect(incrementBy(1, countConfig)).toBeCloseTo(2);
    expect(incrementBy(2, countConfig)).toBeCloseTo(3);
  });

  it('1個未満は 0.5 刻みで上がる', () => {
    expect(incrementBy(0.5, countConfig)).toBeCloseTo(1);
  });

  it('1個から下げると 0.5個 に降りる (0 に落ちない)', () => {
    expect(decrementBy(1, countConfig)).toBeCloseTo(0.5);
  });

  it('2個から下げると 1個', () => {
    expect(decrementBy(2, countConfig)).toBeCloseTo(1);
  });

  it('チップ由来の 1.5個 から +/- は 2個 / 1個 (飛ばさない)', () => {
    expect(incrementBy(1.5, countConfig)).toBeCloseTo(2);
    expect(decrementBy(1.5, countConfig)).toBeCloseTo(1);
  });

  it('入力された 0.25個 は有効、+ で 0.5個 に乗る', () => {
    expect(isValidAmount(0.25, countConfig)).toBe(true);
    expect(incrementBy(0.25, countConfig)).toBeCloseTo(0.5);
  });

  it('0.3個 のような格子外は無効 (完了ボタンを塞ぐ)', () => {
    expect(isValidAmount(0.3, countConfig)).toBe(false);
  });
});

describe('decrementBy', () => {
  it('mid-range: -1', () => {
    expect(decrementBy(8, intConfig)).toBe(7);
  });

  it('at min: no change', () => {
    expect(decrementBy(1, intConfig)).toBe(1);
  });

  it('step=0.5: 2 → 1.5', () => {
    expect(decrementBy(2, halfConfig)).toBeCloseTo(1.5);
  });

  it('at min with step=0.5: stays at min', () => {
    expect(decrementBy(1, halfConfig)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// matchesPreset
// ---------------------------------------------------------------------------

describe('matchesPreset', () => {
  it('exact match → preset value', () => {
    expect(matchesPreset(10, intConfig)).toBe(10);
  });

  it('off-preset value → null', () => {
    expect(matchesPreset(8.5, intConfig)).toBeNull();
  });

  it('off-preset integer → null', () => {
    expect(matchesPreset(7, intConfig)).toBeNull();
  });

  it('step=0.5, presets [1,1.5,2,3]: 1.5 → 1.5', () => {
    expect(matchesPreset(1.5, halfConfig)).toBeCloseTo(1.5);
  });

  it('floating-point near-match (1.5000001) → 1.5', () => {
    expect(matchesPreset(1.5000001, halfConfig)).toBeCloseTo(1.5);
  });

  it('value not in presets → null', () => {
    expect(matchesPreset(2.5, halfConfig)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// wouldKeystrokeProduceOutOfRange
// ---------------------------------------------------------------------------

describe('wouldKeystrokeProduceOutOfRange', () => {
  it('"10" → "100" with max=30 → true (would exceed max)', () => {
    expect(wouldKeystrokeProduceOutOfRange('10', '100', intConfig)).toBe(true);
  });

  it('"1" → "10" with max=30 → false (still in range)', () => {
    expect(wouldKeystrokeProduceOutOfRange('1', '10', intConfig)).toBe(false);
  });

  it('"2" → "2." with decimals=0 → true (decimal forbidden)', () => {
    expect(wouldKeystrokeProduceOutOfRange('2', '2.', intConfig)).toBe(true);
  });

  it('"2" → "2." with decimals=1 → false (decimal allowed)', () => {
    expect(wouldKeystrokeProduceOutOfRange('2', '2.', halfConfig)).toBe(false);
  });

  it('"" → "8" with min=10 → false (below-min while typing is allowed)', () => {
    expect(wouldKeystrokeProduceOutOfRange('', '8', intConfig)).toBe(false);
  });

  it('"2" → "2.5" with decimals=1, max=10 → false', () => {
    expect(wouldKeystrokeProduceOutOfRange('2', '2.5', halfConfig)).toBe(false);
  });

  it('"" → "." with decimals=1 → false (mid-type is fine)', () => {
    expect(wouldKeystrokeProduceOutOfRange('', '.', halfConfig)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildSushiAmountEditConfig
// ---------------------------------------------------------------------------

describe('buildSushiAmountEditConfig', () => {
  const mode = {
    key: 'piece' as const,
    label: 'セット寿司（貫）',
    unitLabel: '貫',
    presetCounts: [6, 8, 10, 12, 16, 20],
    min: 1,
    max: 40,
    macroPerUnit: { kcal: 55, protein: 3, fat: 1.2, carbs: 8.2 },
  };

  it('produces config with correct unitLabel', () => {
    const config = buildSushiAmountEditConfig(mode);
    expect(config.unitLabel).toBe('貫');
  });

  it('preserves min and max', () => {
    const config = buildSushiAmountEditConfig(mode);
    expect(config.min).toBe(1);
    expect(config.max).toBe(40);
  });

  it('defaults to step=1 when mode has no step', () => {
    const config = buildSushiAmountEditConfig(mode);
    expect(config.step).toBe(1);
    expect(config.decimals).toBe(0);
  });

  it('uses mode step when provided', () => {
    const config = buildSushiAmountEditConfig({ ...mode, step: 0.5 });
    expect(config.step).toBe(0.5);
    expect(config.decimals).toBe(1);
  });

  it('presets match presetCounts', () => {
    const config = buildSushiAmountEditConfig(mode);
    expect(config.presets).toEqual([6, 8, 10, 12, 16, 20]);
  });

  it('all presets satisfy isValidAmount', () => {
    const config = buildSushiAmountEditConfig(mode);
    for (const p of config.presets) {
      expect(isValidAmount(p, config)).toBe(true);
    }
  });

  it('defaultValue is first preset when mode has no step', () => {
    const config = buildSushiAmountEditConfig(mode);
    // defaultValue should be the first preset or min — implementation detail, but must be valid
    expect(isValidAmount(config.defaultValue, config)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildPizzaAmountEditConfig
// ---------------------------------------------------------------------------

describe('buildPizzaAmountEditConfig', () => {
  const pizzaConfig = {
    kind: 'pizza_slices' as const,
    pizzaTypes: [
      { key: 'regular' as const, label: 'ふつう', macroPerSlice: { kcal: 150, protein: 6, fat: 6, carbs: 18 } },
    ],
    presetSlices: [1, 2, 3, 4, 6, 8],
    minSlices: 1,
    maxSlices: 12,
  };

  it('uses minSlices/maxSlices as min/max', () => {
    const config = buildPizzaAmountEditConfig(pizzaConfig);
    expect(config.min).toBe(1);
    expect(config.max).toBe(12);
  });

  it('unitLabel is 切', () => {
    const config = buildPizzaAmountEditConfig(pizzaConfig);
    expect(config.unitLabel).toBe('切');
  });

  it('defaults to step=1', () => {
    const config = buildPizzaAmountEditConfig(pizzaConfig);
    expect(config.step).toBe(1);
    expect(config.decimals).toBe(0);
  });

  it('presets match presetSlices', () => {
    const config = buildPizzaAmountEditConfig(pizzaConfig);
    expect(config.presets).toEqual([1, 2, 3, 4, 6, 8]);
  });

  it('all presets satisfy isValidAmount', () => {
    const config = buildPizzaAmountEditConfig(pizzaConfig);
    for (const p of config.presets) {
      expect(isValidAmount(p, config)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// buildIdentityAmountEditConfig
// ---------------------------------------------------------------------------

describe('buildIdentityAmountEditConfig', () => {
  it('uses chips as presets', () => {
    const spec = {
      unit: 'g' as const,
      default: 150,
      chips: [
        { label: '小 100g', value: 100 },
        { label: '並 150g', value: 150 },
        { label: '大 200g', value: 200 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.presets).toEqual([100, 150, 200]);
    expect(config.defaultValue).toBe(150);
  });

  it('falls back to empty presets when chips undefined', () => {
    const spec = { unit: 'piece' as const, default: 1 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.presets).toEqual([]);
    expect(config.defaultValue).toBe(1);
  });

  it('uses unitLabel from spec when provided', () => {
    const spec = {
      unit: 'piece' as const,
      default: 5,
      unitLabel: '本',
    };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.unitLabel).toBe('本');
  });

  it('falls back to unit-derived label when unitLabel not provided (g → g)', () => {
    const spec = { unit: 'g' as const, default: 100 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.unitLabel).toBe('g');
  });

  it('falls back to unit-derived label for piece → 個', () => {
    const spec = { unit: 'piece' as const, default: 1 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.unitLabel).toBe('個');
  });

  it('defaults step=1 when not specified', () => {
    const spec = { unit: 'g' as const, default: 100 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.step).toBe(1);
  });

  it('all presets satisfy isValidAmount', () => {
    const spec = {
      unit: 'g' as const,
      default: 150,
      chips: [
        { label: '小', value: 100 },
        { label: '並', value: 150 },
        { label: '大', value: 200 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    for (const p of config.presets) {
      expect(isValidAmount(p, config)).toBe(true);
    }
  });

  it('min is first chip value when chips defined', () => {
    const spec = {
      unit: 'g' as const,
      default: 150,
      chips: [
        { label: '小', value: 100 },
        { label: '並', value: 150 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    // min should be ≤ first chip
    expect(config.min).toBeLessThanOrEqual(100);
  });

  // -------------------------------------------------------------------------
  // percent unit (人前/食 → % 化)
  // -------------------------------------------------------------------------

  it('percent unit falls back to "%" suffix', () => {
    const spec = { unit: 'percent' as const, default: 100 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.unitLabel).toBe('%');
  });

  it('percent unit with step=10, chips at 50/100/150 builds valid config', () => {
    const spec = {
      unit: 'percent' as const,
      default: 100,
      step: 10,
      min: 10,
      max: 400,
      chips: [
        { label: '小', value: 50 },
        { label: '1人前', value: 100 },
        { label: '大盛', value: 150 },
        { label: '特盛', value: 200 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    // % の入力グリッドは常に 1 (67%/133% のような非10刻みチップが実在する)。
    // spec.step=10 は +/- の刻みとして stepperTiers に入る。
    expect(config.step).toBe(1);
    expect(stepperStepAt(100, config)).toBe(10);
    expect(config.decimals).toBe(0);
    expect(config.min).toBe(10);
    expect(config.max).toBe(400);
    expect(config.presets).toEqual([50, 100, 150, 200]);
    expect(config.defaultValue).toBe(100);
    expect(config.unitLabel).toBe('%');
    for (const p of config.presets) {
      expect(isValidAmount(p, config)).toBe(true);
    }
  });

  it('percent: 10刻みでないチップ (67%/133%) も有効なまま扱える', () => {
    const spec = {
      unit: 'percent' as const,
      default: 100,
      chips: [
        { label: '小', value: 67 },
        { label: '1本', value: 100 },
        { label: '大', value: 133 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    for (const p of config.presets) {
      expect(isValidAmount(p, config)).toBe(true);
      expect(snapToStep(p, config)).toBe(p);
    }
    // +/- は 10 刻みのまま。67% から + は直上の 70%
    expect(incrementBy(67, config)).toBe(70);
    expect(decrementBy(67, config)).toBe(60);
  });

  // -------------------------------------------------------------------------
  // count units (個/切/切れ/皿)
  // -------------------------------------------------------------------------

  it('piece: 入力グリッドは 0.25、+/- は段階制', () => {
    const spec = { unit: 'piece' as const, default: 1 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(config.step).toBe(0.25);
    expect(config.min).toBe(0.25);
    expect(config.decimals).toBe(2);
    expect(stepperStepAt(0.5, config)).toBe(0.5);
    expect(stepperStepAt(3, config)).toBe(1);
    // チップの無い食材 (卵など) でも半分に降りられる
    expect(decrementBy(1, config)).toBeCloseTo(0.5);
  });

  it('piece: 半分チップが丸められずそのまま有効', () => {
    const spec = {
      unit: 'piece' as const,
      default: 0.5,
      unitLabel: '丁',
      chips: [
        { label: '半丁', value: 0.5 },
        { label: '1丁', value: 1 },
      ],
    };
    const config = buildIdentityAmountEditConfig(spec);
    expect(isValidAmount(0.5, config)).toBe(true);
    expect(snapToStep(0.5, config)).toBe(0.5);
    expect(isValidAmount(config.defaultValue, config)).toBe(true);
  });

  it('piece: spec.step が明示されていれば段階制を使わずその刻みで統一する', () => {
    const spec = { unit: 'piece' as const, default: 1, unitLabel: '枚', step: 0.5 };
    const config = buildIdentityAmountEditConfig(spec);
    expect(stepperStepAt(0.5, config)).toBe(0.5);
    expect(stepperStepAt(3, config)).toBe(0.5);
    expect(incrementBy(1, config)).toBeCloseTo(1.5);
  });

  it('percent: snapToStep(30) with step=10 stays at 30', () => {
    const config: AmountEditConfig = {
      min: 10, max: 400, step: 10, decimals: 0, unitLabel: '%',
      presets: [50, 100], defaultValue: 100,
    };
    expect(snapToStep(30, config)).toBe(30);
  });

  it('percent: snapToStep(34) with step=10 snaps to 30', () => {
    const config: AmountEditConfig = {
      min: 10, max: 400, step: 10, decimals: 0, unitLabel: '%',
      presets: [50, 100], defaultValue: 100,
    };
    expect(snapToStep(34, config)).toBe(30);
  });

  it('percent: incrementBy(50, step=10) → 60', () => {
    const config: AmountEditConfig = {
      min: 10, max: 400, step: 10, decimals: 0, unitLabel: '%',
      presets: [50, 100], defaultValue: 100,
    };
    expect(incrementBy(50, config)).toBe(60);
  });
});

// buildIngredientAmountEditConfig と QuickIngredientSheet は到達不能なため削除済み
// (Identity-first IA 移行により openQuickIngredientSheet の呼び出し元が消滅)。
