/**
 * Backward-compat for amount values when the underlying Identity's
 * `amount.unit` has changed across versions.
 *
 * Concrete case (v1.3 → v1.4): Identities like udon/soba/ramen/protein_drink
 * used `unit: 'serving'` with default 1.0 (1.0 = 1人前). They are now
 * `unit: 'percent'` with default 100 (100 = 1人前). Old FoodLog entries on disk
 * still carry the legacy `amountUnit: 'serving'` + `amountValue: 1.0` form, so
 * we translate at the boundary instead of mutating stored data.
 *
 * Keep this module dependency-free (pure functions) for easy testing.
 */

import { AmountUnit } from '@/types/identity';

/**
 * Convert an amount value saved with `savedUnit` into the equivalent value
 * for `currentUnit`. Returns the input unchanged when no defined conversion
 * applies — callers should treat that as best-effort (display will fall back
 * to the saved value as-is, which is the least-surprising legacy behavior).
 *
 * Defined conversions:
 *   - 'serving' → 'percent'  : multiply by 100 (1.0人前 → 100%, 0.5 → 50%)
 *   - Heuristic for legacy logs: the v1.x FoodLog schema narrowly typed
 *     `amountUnit` as `'g'|'ml'|'piece'`, so old serving logs were stored as
 *     `amountUnit: 'piece'`. When the current Identity is 'percent' and the
 *     value is below 10 (impossible under the new min=10 constraint), assume
 *     a legacy serving value and multiply by 100.
 *
 * @param value     The amount value as stored
 * @param savedUnit The unit the value was originally saved under (or undefined for very old logs)
 * @param currentUnit The current Identity's `amount.unit`
 */
export function migrateAmountValueForUnit(
  value: number,
  savedUnit: AmountUnit | string | undefined,
  currentUnit: AmountUnit,
): number {
  if (savedUnit === 'serving' && currentUnit === 'percent') {
    return value * 100;
  }
  // Heuristic: storage compressed 'serving' down to 'piece' in legacy FoodLog
  // (see identity-log-bridge.toLegacyAmountUnit). Old serving values were in
  // [0.5, 2.0] across all Identities; new percent values are ≥ 10 by min
  // constraint. Anything below 5 on a now-'percent' Identity must be legacy.
  if (currentUnit === 'percent' && value > 0 && value < 5) {
    return value * 100;
  }
  if (!savedUnit || savedUnit === currentUnit) return value;
  return value;
}

/**
 * Quick predicate: "this saved value needs a serving→percent translation".
 * Useful for UI hints or conditional logic that wants to know whether
 * a translation will fire.
 */
export function isLegacyServingValue(
  savedUnit: AmountUnit | string | undefined,
  currentUnit: AmountUnit,
): boolean {
  return savedUnit === 'serving' && currentUnit === 'percent';
}
