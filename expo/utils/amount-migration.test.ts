/**
 * Tests for amount-migration.ts
 *
 * Backward compatibility: old FoodLog entries saved with
 *   amountUnit: 'serving' / amountValue: 1.0  (= 1人前)
 * must continue to render and recompute correctly even after the underlying
 * Identity has been migrated to unit: 'percent' (default: 100).
 *
 * The migration helper translates a legacy value to the current Identity's
 * unit so that all downstream code paths (resolver, display, chip lookup)
 * can treat values uniformly.
 */

import { migrateAmountValueForUnit, isLegacyServingValue } from './amount-migration';

describe('migrateAmountValueForUnit', () => {
  it('serving 1.0 → percent 100 (1人前 → 100%)', () => {
    expect(migrateAmountValueForUnit(1.0, 'serving', 'percent')).toBe(100);
  });

  it('serving 0.5 → percent 50 (半分 → 50%)', () => {
    expect(migrateAmountValueForUnit(0.5, 'serving', 'percent')).toBe(50);
  });

  it('serving 1.5 → percent 150 (大盛 → 150%)', () => {
    expect(migrateAmountValueForUnit(1.5, 'serving', 'percent')).toBe(150);
  });

  it('serving 2.0 → percent 200', () => {
    expect(migrateAmountValueForUnit(2.0, 'serving', 'percent')).toBe(200);
  });

  it('percent 50 stays 50 (no migration needed)', () => {
    expect(migrateAmountValueForUnit(50, 'percent', 'percent')).toBe(50);
  });

  it('g 200 stays 200 (different family, no migration)', () => {
    expect(migrateAmountValueForUnit(200, 'g', 'g')).toBe(200);
  });

  it('piece 30 → percent: returns input unchanged (above heuristic threshold)', () => {
    // We only migrate serving → percent; cross-family conversions return input
    // unless the legacy-compression heuristic fires.
    expect(migrateAmountValueForUnit(30, 'piece', 'percent')).toBe(30);
  });

  it('heuristic: piece 0.5 → percent 50 (legacy serving stored as piece)', () => {
    // Old FoodLog compressed `serving` down to `piece` (toLegacyAmountUnit).
    // Sub-5 values on a now-percent Identity must be legacy serving fragments.
    expect(migrateAmountValueForUnit(0.5, 'piece', 'percent')).toBe(50);
  });

  it('heuristic: piece 1.0 → percent 100', () => {
    expect(migrateAmountValueForUnit(1.0, 'piece', 'percent')).toBe(100);
  });

  it('heuristic: piece 2.0 → percent 200 (boundary: 大盛 of nabe etc.)', () => {
    expect(migrateAmountValueForUnit(2.0, 'piece', 'percent')).toBe(200);
  });

  it('heuristic does NOT fire on percent value 10 (min)', () => {
    expect(migrateAmountValueForUnit(10, 'percent', 'percent')).toBe(10);
  });

  it('heuristic does NOT fire on percent value 50', () => {
    expect(migrateAmountValueForUnit(50, 'percent', 'percent')).toBe(50);
  });

  it('serving → g: returns input unchanged (no defined conversion)', () => {
    expect(migrateAmountValueForUnit(1.0, 'serving', 'g')).toBe(1.0);
  });

  it('undefined input unit + percent + sub-5 → heuristic migrates (50)', () => {
    // Very old logs (pre-amountUnit tracking) on a now-percent Identity get
    // the same heuristic treatment.
    expect(migrateAmountValueForUnit(0.5, undefined, 'percent')).toBe(50);
  });

  it('undefined input unit + g → returns input unchanged', () => {
    expect(migrateAmountValueForUnit(150, undefined, 'g')).toBe(150);
  });
});

describe('isLegacyServingValue', () => {
  it('returns true when saved unit is serving and current is percent', () => {
    expect(isLegacyServingValue('serving', 'percent')).toBe(true);
  });

  it('returns false when both are percent', () => {
    expect(isLegacyServingValue('percent', 'percent')).toBe(false);
  });

  it('returns false when both are serving', () => {
    expect(isLegacyServingValue('serving', 'serving')).toBe(false);
  });

  it('returns false when current is g', () => {
    expect(isLegacyServingValue('serving', 'g')).toBe(false);
  });

  it('returns false when saved unit is undefined', () => {
    expect(isLegacyServingValue(undefined, 'percent')).toBe(false);
  });
});
