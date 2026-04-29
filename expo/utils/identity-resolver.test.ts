/**
 * Tests for identity-resolver.ts
 *
 * Specs covered:
 *   - Pattern A (count) and Pattern B (g) amount factor
 *   - Style migration (Style > Attribute priority)
 *   - Attribute migration
 *   - Add-on (pure Addon and Identity-flavored asAddon)
 *   - confirmMessage propagation
 */

import { resolveLog } from './identity-resolver';
import { getIdentity } from '@/constants/identity';

describe('Identity registry sanity', () => {
  it('has the Identities required by these tests', () => {
    expect(getIdentity('egg')).toBeDefined();
    expect(getIdentity('rice')).toBeDefined();
    expect(getIdentity('chicken_thigh')).toBeDefined();
    expect(getIdentity('chicken_lean')).toBeDefined();
    expect(getIdentity('potato')).toBeDefined();
    expect(getIdentity('fries')).toBeDefined();
    expect(getIdentity('canned_lean_fish')).toBeDefined();
    expect(getIdentity('canned_fatty_fish')).toBeDefined();
    expect(getIdentity('fried_main')).toBeDefined();
    expect(getIdentity('natto')).toBeDefined();
  });
});

describe('resolveLog — Pattern A (no amount chips)', () => {
  it('returns defaultMacro for egg with no attribute/style chosen', () => {
    const result = resolveLog({ originIdentityId: 'egg' });

    expect(result.recordIdentityId).toBe('egg');
    expect(result.originIdentityId).toBe('egg');
    expect(result.amountValue).toBe(1);
    expect(result.baseMacro).toEqual({ kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 });
    expect(result.totalMacro).toEqual({ kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 });
    expect(result.confirmMessage).toBeUndefined();
  });
});

describe('resolveLog — Pattern B (g amount with chips)', () => {
  it('scales rice by amount factor (200g of 150g default)', () => {
    const result = resolveLog({ originIdentityId: 'rice', amountValue: 200 });

    expect(result.recordIdentityId).toBe('rice');
    expect(result.amountValue).toBe(200);
    // 234 * 200/150 = 312
    expect(result.baseMacro.kcal).toBeCloseTo(312, 1);
    expect(result.baseMacro.protein).toBeCloseTo(5.1, 1);
    expect(result.baseMacro.fat).toBeCloseTo(0.7, 1);
    expect(result.baseMacro.carbs).toBeCloseTo(74.7, 1);
  });
});

describe('resolveLog — Attribute migration', () => {
  it('migrates chicken_thigh + Attribute=no_skin to chicken_lean', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      attributeKey: 'no_skin',
    });

    expect(result.originIdentityId).toBe('chicken_thigh');
    expect(result.recordIdentityId).toBe('chicken_lean');
    // After migration we use chicken_lean's defaultMacro (100g)
    expect(result.baseMacro).toEqual({ kcal: 105, protein: 23, fat: 1.5, carbs: 0 });
    // Silent migration — no confirmMessage
    expect(result.confirmMessage).toBeUndefined();
  });

  it('migrates canned_lean_fish + oil_soaked to canned_fatty_fish', () => {
    const result = resolveLog({
      originIdentityId: 'canned_lean_fish',
      attributeKey: 'oil_soaked',
    });

    expect(result.recordIdentityId).toBe('canned_fatty_fish');
    expect(result.baseMacro.kcal).toBeCloseTo(280, 1);
    expect(result.baseMacro.protein).toBeCloseTo(28, 1);
  });
});

describe('resolveLog — Style migration', () => {
  it('migrates potato + Style=fried to fries with confirmMessage', () => {
    const result = resolveLog({
      originIdentityId: 'potato',
      styleKey: 'fried',
    });

    expect(result.recordIdentityId).toBe('fries');
    // fries default 150g = 320 kcal
    expect(result.baseMacro.kcal).toBeCloseTo(320, 1);
    expect(result.baseMacro.fat).toBeCloseTo(15, 1);
    expect(result.confirmMessage).toBe('フライドポテトとして記録します');
    // Style key is dropped after migration
    expect(result.styleKey).toBeUndefined();
  });

  it('discards amountValue when migration crosses to a different unit (chicken_thigh 100g + fried)', () => {
    // Bug regression: previously amountValue=100 (g) was applied to fried_main
    // (piece, default 3) → 100/3 ≈ 33x → ~15050 kcal. After the fix the
    // resolver must use fried_main's default amount (3 pieces).
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      styleKey: 'fried',
      amountValue: 100, // origin's unit (g) — should be ignored after migration
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.amountValue).toBe(3); // fried_main.amount.default
    // 350 × 1.29 (karaage) = 451.5 — sensible value, not 15050.
    expect(result.baseMacro.kcal).toBeCloseTo(451.5, 1);
  });

  it('Style migration takes priority over Attribute migration (chicken_thigh + no_skin + fried → fried_main(karaage))', () => {
    const result = resolveLog({
      originIdentityId: 'chicken_thigh',
      attributeKey: 'no_skin',
      styleKey: 'fried',
    });

    expect(result.recordIdentityId).toBe('fried_main');
    expect(result.attributeKey).toBe('karaage');
    expect(result.confirmMessage).toBe('唐揚げとして記録します');
    // fried_main default 350 × karaage factor 1.29 = 451.5
    expect(result.baseMacro.kcal).toBeCloseTo(451.5, 1);
  });
});

describe('resolveLog — Add-ons', () => {
  it('adds Identity-flavored add-ons (egg + natto) to a rice base', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      amountValue: 200,
      addons: [
        { refId: 'egg', refType: 'identity', units: 1 },
        { refId: 'natto', refType: 'identity', units: 1 },
      ],
    });

    expect(result.addons).toHaveLength(2);
    // base (rice 200g) ≈ 312 kcal; +egg 75 +natto 80 = 467
    expect(result.totalMacro.kcal).toBeCloseTo(467, 0);
    // protein: 5.1 + 6.2 + 6.6 = 17.9
    expect(result.totalMacro.protein).toBeCloseTo(17.9, 1);
    // fat: 0.7 + 5.2 + 4 = 9.9
    expect(result.totalMacro.fat).toBeCloseTo(9.9, 1);
  });

  it('multiplies addon units (egg ×2)', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      addons: [{ refId: 'egg', refType: 'identity', units: 2 }],
    });

    // rice default 150g = 234 kcal; +egg×2 (75×2=150) = 384
    expect(result.totalMacro.kcal).toBeCloseTo(384, 0);
    expect(result.addons?.[0]?.addedMacro.kcal).toBeCloseTo(150, 0);
  });

  it('handles a pure-Addon reference (mentaiko on rice)', () => {
    const result = resolveLog({
      originIdentityId: 'rice',
      addons: [{ refId: 'mentaiko', refType: 'addon', units: 1 }],
    });

    // 234 + 25 = 259
    expect(result.totalMacro.kcal).toBeCloseTo(259, 0);
  });
});
