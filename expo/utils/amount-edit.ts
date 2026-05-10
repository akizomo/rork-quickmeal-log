/**
 * Pure logic for the Amount Edit Dialog.
 *
 * Category-agnostic module — the dialog receives one AmountEditConfig
 * regardless of whether the source is sushi, pizza, or an identity food.
 *
 * All functions are pure (no side effects) and testable in Node environment.
 */

import { SushiModeDef, PizzaConfig } from '@/constants/dish-master';
import { AmountSpec, AmountUnit } from '@/types/identity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AmountEditConfig {
  min: number;
  max: number;
  /** Step between valid values. 1 for integers, 0.5 for half-unit categories, etc. */
  step: number;
  /** Derived from step: 0 = integers only, 1 = one decimal place. */
  decimals: 0 | 1;
  /** Unit suffix to display next to the value (e.g. "貫", "切", "g"). */
  unitLabel: string;
  /** Preset shortcut values, all guaranteed to be valid (in range and step-aligned). */
  presets: ReadonlyArray<number>;
  /** Default value when the dialog opens or when input is cleared. */
  defaultValue: number;
}

// ---------------------------------------------------------------------------
// Core pure functions
// ---------------------------------------------------------------------------

/**
 * Normalize a raw text input (possibly full-width) into a number.
 * Returns null for empty, non-numeric, or negative strings.
 */
export function parseAmountInput(
  raw: string,
  config: AmountEditConfig,
): number | null {
  // Normalize full-width digits and decimal point
  let s = raw
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30),
    )
    .replace(/[．]/g, '.')
    .trim();

  // Reject negative sign
  if (s.includes('-')) return null;

  // Strip non-digit non-dot characters
  s = s.replace(/[^\d.]/g, '');

  if (!s) return null;

  // Handle multiple decimal points: keep digits between first and second dot only
  const firstDotIdx = s.indexOf('.');
  if (firstDotIdx !== -1) {
    const secondDotIdx = s.indexOf('.', firstDotIdx + 1);
    const intPart = s.slice(0, firstDotIdx);
    const decPart =
      secondDotIdx !== -1
        ? s.slice(firstDotIdx + 1, secondDotIdx)
        : s.slice(firstDotIdx + 1);
    s = intPart + '.' + decPart;
  }

  // Strip decimal part when category only supports integers
  if (config.decimals === 0) {
    s = s.split('.')[0];
  }

  if (!s) return null;

  const n = Number(s);
  if (!isFinite(n) || isNaN(n)) return null;

  return n;
}

/**
 * Clamp a value to [min, max].
 * NaN → min; Infinity → max; -Infinity → min.
 */
export function clampToRange(value: number, config: AmountEditConfig): number {
  if (isNaN(value) || value === -Infinity) return config.min;
  if (value === Infinity) return config.max;
  return Math.min(Math.max(value, config.min), config.max);
}

/**
 * Snap a value to the nearest step-aligned position, then clamp.
 */
export function snapToStep(value: number, config: AmountEditConfig): number {
  const { min, step } = config;
  const snapped = min + Math.round((value - min) / step) * step;
  // Round to avoid floating-point noise (e.g. 2.5000000000002)
  const precision = step % 1 === 0 ? 0 : 1;
  const rounded =
    Math.round(snapped * Math.pow(10, precision)) / Math.pow(10, precision);
  return clampToRange(rounded, config);
}

/**
 * Returns true if value is finite, within [min, max], and step-aligned.
 */
export function isValidAmount(
  value: number,
  config: AmountEditConfig,
): boolean {
  if (!isFinite(value) || isNaN(value)) return false;
  if (value < config.min || value > config.max) return false;
  const steps = (value - config.min) / config.step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/**
 * Increase value by one step (snap input first, then add, then clamp).
 */
export function incrementBy(
  value: number,
  config: AmountEditConfig,
): number {
  const snapped = snapToStep(value, config);
  return clampToRange(snapped + config.step, config);
}

/**
 * Decrease value by one step (snap input first, then subtract, then clamp).
 */
export function decrementBy(
  value: number,
  config: AmountEditConfig,
): number {
  const snapped = snapToStep(value, config);
  return clampToRange(snapped - config.step, config);
}

/**
 * Returns the matching preset value if `value` equals a preset (within 1e-6),
 * otherwise null.
 */
export function matchesPreset(
  value: number,
  config: AmountEditConfig,
): number | null {
  for (const preset of config.presets) {
    if (Math.abs(value - preset) < 1e-6) return preset;
  }
  return null;
}

/**
 * Returns true if typing `nextRaw` (after typing `currentRaw`) would produce
 * an invalid state and the keystroke should be rejected.
 *
 * Rules:
 * - Decimal point is rejected when config.decimals === 0
 * - A fully-parseable value above max is rejected
 * - Partially-typed values below min are allowed (user may still be typing)
 */
export function wouldKeystrokeProduceOutOfRange(
  _currentRaw: string,
  nextRaw: string,
  config: AmountEditConfig,
): boolean {
  // Reject decimal input when not allowed
  if (config.decimals === 0 && nextRaw.includes('.')) return true;

  const parsed = parseAmountInput(nextRaw, config);
  if (parsed === null) return false; // mid-type or empty — allow

  // Reject only overshoots (below-min is OK while the user is still typing)
  return parsed > config.max;
}

// ---------------------------------------------------------------------------
// Config builders
// ---------------------------------------------------------------------------

/** Derive decimals from step. */
function decimalsFromStep(step: number): 0 | 1 {
  return step % 1 === 0 ? 0 : 1;
}

/**
 * Build an AmountEditConfig from a SushiModeDef (sushi category).
 *
 * Accepts an optional `step` field even though SushiModeDef doesn't define
 * one yet — it will be added to the master as an optional field.
 */
export function buildSushiAmountEditConfig(
  mode: SushiModeDef & { step?: number },
): AmountEditConfig {
  const step = mode.step ?? 1;
  return {
    min: mode.min,
    max: mode.max,
    step,
    decimals: decimalsFromStep(step),
    unitLabel: mode.unitLabel,
    presets: mode.presetCounts,
    defaultValue: mode.presetCounts[0] ?? mode.min,
  };
}

/**
 * Build an AmountEditConfig from a PizzaConfig (pizza category).
 */
export function buildPizzaAmountEditConfig(
  config: PizzaConfig & { step?: number },
): AmountEditConfig {
  const step = config.step ?? 1;
  return {
    min: config.minSlices,
    max: config.maxSlices,
    step,
    decimals: decimalsFromStep(step),
    unitLabel: '切',
    presets: config.presetSlices,
    defaultValue: config.presetSlices[0] ?? config.minSlices,
  };
}

/**
 * Minimal shape needed for buildIngredientAmountEditConfig.
 * Matches a subset of AmountCandidate from @/types/quick-log
 * without importing React-Native-coupled types.
 */
export interface AmountCandidateInput {
  amount: number;
  unit: string;
  label?: string;
}

/**
 * Build an AmountEditConfig from a QuickIngredientSheet's amount candidates.
 * Filters candidates to the current unit, derives presets, min, max, step.
 */
export function buildIngredientAmountEditConfig(
  candidates: AmountCandidateInput[],
  currentUnit: string,
): AmountEditConfig {
  const filtered = candidates
    .filter((c) => c.unit === currentUnit)
    .sort((a, b) => a.amount - b.amount);

  const presets = filtered.map((c) => c.amount);

  // Detect fractional values to set step=0.5; otherwise step=1
  const hasFraction = filtered.some((c) => c.amount % 1 !== 0);
  const step = hasFraction ? 0.5 : 1;

  const minAmount = presets[0] ?? 1;
  const maxAmount = presets.at(-1) ?? 100;

  const INGREDIENT_UNIT_LABEL: Record<string, string> = {
    g: 'g',
    ml: 'ml',
    piece: '個',
  };
  const unitLabel = INGREDIENT_UNIT_LABEL[currentUnit] ?? currentUnit;

  const defaultValue = minAmount;

  return {
    min: 1,
    max: Math.max(maxAmount * 4, 100),
    step,
    decimals: decimalsFromStep(step),
    unitLabel,
    presets,
    defaultValue,
  };
}

/** Default suffix labels for AmountUnit values. */
const UNIT_LABEL_FALLBACK: Record<AmountUnit, string> = {
  g: 'g',
  ml: 'ml',
  piece: '個',
  serving: '人前',
  plate: '皿',
  slice: '切',
  cut: '切れ',
};

/**
 * Build an AmountEditConfig from an AmountSpec (identity food).
 *
 * When AmountSpec doesn't carry explicit min/max/step (current state),
 * sensible defaults are derived from the chip values.
 */
export function buildIdentityAmountEditConfig(
  spec: AmountSpec & { min?: number; max?: number; step?: number },
): AmountEditConfig {
  const step = spec.step ?? 1;
  const presets: number[] = (spec.chips ?? []).map((c) => c.value);

  const derivedMin = spec.min ?? 1;
  const lastChipValue = presets.at(-1);
  const derivedMax =
    spec.max ?? (lastChipValue !== undefined ? lastChipValue * 4 : spec.default * 4);

  const unitLabel = spec.unitLabel ?? UNIT_LABEL_FALLBACK[spec.unit] ?? spec.unit;

  return {
    min: derivedMin,
    max: derivedMax,
    step,
    decimals: decimalsFromStep(step),
    unitLabel,
    presets,
    defaultValue: spec.default,
  };
}
