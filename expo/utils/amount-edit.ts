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
import type { AppLocale } from '@/types/locale';
import { UNIT_LABELS } from './unit-labels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AmountEditConfig {
  min: number;
  max: number;
  /**
   * 入力グリッド。キーボード入力・チップ値が有効とみなされる刻み (0起点)。
   * 「打てる最小刻み」であって「+/- の移動量」ではない — 後者は stepperTiers。
   * 数え物は 0.25 (1/4個)、% は 1、g/ml は spec 由来 (既定 1)。
   */
  step: number;
  /**
   * +/- の移動刻み。値の大きさごとに刻みを変える段階制で、境界 (upTo) 昇順・
   * 最後の要素は upTo: Infinity。省略時は全域 step (= 入力グリッドと同じ)。
   *
   * 数え物は [1未満: 0.5, 1以上: 1]。「半分」は 1個未満でこそ意味を持ち、
   * 3個・10貫と数える帯では 1 刻みでないとタップ数が倍になるため。
   */
  stepperTiers?: readonly { upTo: number; step: number }[];
  /** Derived from step: 0 = integers only, 1 = 0.5 刻み, 2 = 0.25 刻み. */
  decimals: 0 | 1 | 2;
  /** Unit suffix to display next to the value (e.g. "貫", "切", "g"). */
  unitLabel: string;
  /** Preset shortcut values, all guaranteed to be valid (in range and step-aligned). */
  presets: readonly number[];
  /** Default value when the dialog opens or when input is cleared. */
  defaultValue: number;
}

/** Floating-point tolerance for grid comparisons. */
const EPS = 1e-9;

/** Round to the config's decimal precision, killing float noise (2.5000000000002). */
function roundToPrecision(value: number, decimals: 0 | 1 | 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

/**
 * The +/- increment that applies at `value`.
 * Falls back to the input grid when no tiers are defined.
 *
 * `direction` は境界ちょうどの値をどちらの帯に属させるかを決める。1個から
 * 下げるときは下の帯 (0.5刻み) を使わないと 0 に落ちてしまい、上げるときは
 * 上の帯 (1刻み) を使わないと 1.5個 に留まってしまう。
 */
export function stepperStepAt(
  value: number,
  config: AmountEditConfig,
  direction: 'up' | 'down' = 'up',
): number {
  const tiers = config.stepperTiers;
  if (!tiers || tiers.length === 0) return config.step;
  for (const tier of tiers) {
    const inTier =
      direction === 'down' ? value <= tier.upTo + EPS : value < tier.upTo - EPS;
    if (inTier) return tier.step;
  }
  return tiers[tiers.length - 1].step;
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
 * Snap a value to the nearest grid position, then clamp.
 *
 * The grid is anchored at 0 (not at `min`), so min と step は互いに独立に
 * 決められる。min 起点だと min を動かすたびに全チップ値が無効化される
 * (例: min=1/step=0.5 では 0.5 が格子外) という結合があった。
 */
export function snapToStep(value: number, config: AmountEditConfig): number {
  const snapped = Math.round(value / config.step) * config.step;
  return clampToRange(roundToPrecision(snapped, config.decimals), config);
}

/**
 * Returns true if value is finite, within [min, max], and grid-aligned.
 */
export function isValidAmount(
  value: number,
  config: AmountEditConfig,
): boolean {
  if (!isFinite(value) || isNaN(value)) return false;
  if (value < config.min || value > config.max) return false;
  const steps = value / config.step;
  return Math.abs(steps - Math.round(steps)) < EPS;
}

/**
 * Move to the next stepper-grid point strictly above `value`, then clamp.
 *
 * 「一段上の値へ移る」であって「現在値 + step」ではない。チップやキーボードで
 * ステッパー格子から外れた値 (例: 1.5個) にいるとき、加算方式だと丸め先を
 * 飛び越してしまう (1.5 → snap 2 → +1 = 3) ため。
 */
export function incrementBy(
  value: number,
  config: AmountEditConfig,
): number {
  const step = stepperStepAt(value, config);
  const next = Math.floor(value / step + EPS) * step + step;
  return clampToRange(roundToPrecision(next, config.decimals), config);
}

/**
 * Move to the previous stepper-grid point strictly below `value`, then clamp.
 */
export function decrementBy(
  value: number,
  config: AmountEditConfig,
): number {
  const step = stepperStepAt(value, config, 'down');
  const prev = Math.ceil(value / step - EPS) * step - step;
  return clampToRange(roundToPrecision(prev, config.decimals), config);
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

/** Derive decimals from the input grid. */
function decimalsFromStep(step: number): 0 | 1 | 2 {
  if (step % 1 === 0) return 0;
  if (Math.abs(step * 2 - Math.round(step * 2)) < EPS) return 1;
  return 2;
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
    unitLabel: '切', // i18n-ignore: sushi-specific JA unit label, not shown to EN users (sushi tab is JA food DB)
    presets: config.presetSlices,
    defaultValue: config.presetSlices[0] ?? config.minSlices,
  };
}


/** 数え物の単位 (個/切/切れ/皿)。半端が「半分」「1/4」で表現される。 */
const COUNT_UNITS: ReadonlySet<AmountUnit> = new Set<AmountUnit>([
  'piece',
  'slice',
  'cut',
  'plate',
]);

/**
 * 数え物の +/- 刻み。1個未満は 0.5 刻み (半分に降りられる)、1個以上は 1 刻み
 * (いちご15粒・寿司10貫まで押し上げてもタップ数が膨らまない)。
 * 1/4 や 1.5 は入力グリッド (0.25) 側で表現でき、チップ・キーボードから入る。
 */
const COUNT_STEPPER_TIERS: readonly { upTo: number; step: number }[] = [
  { upTo: 1, step: 0.5 },
  { upTo: Infinity, step: 1 },
];

/**
 * Build an AmountEditConfig from an AmountSpec (identity food).
 *
 * When AmountSpec doesn't carry explicit min/max/step (current state),
 * sensible defaults are derived from the chip values.
 *
 * `spec.step` は「+/- の刻み」を指す。入力できる刻み (config.step) は単位から
 * 決まり、常に同じかそれより細かい: 数え物 0.25 / % 1 / g・ml は spec.step 準拠。
 */
export function buildIdentityAmountEditConfig(
  spec: AmountSpec & { min?: number; max?: number; step?: number },
  uiLanguage: AppLocale = 'ja',
): AmountEditConfig {
  // Percent unit gets a coarser default stepper step (10) and a wider min/max
  // envelope matching what a user can sensibly express: 10% – 400%.
  const isPercent = spec.unit === 'percent';
  const isCount = COUNT_UNITS.has(spec.unit);
  const stepperStep = spec.step ?? (isPercent ? 10 : 1);

  // 入力グリッド。ステッパーより細かく打てることが目的なので、単位ごとに固定。
  // 数え物: 1/4個 まで。% : 1% まで (67%/133% 等の非10刻みチップが実在する)。
  // g/ml: 従来どおり spec.step と一致 (10g 刻みの食材は 10g 単位のまま)。
  const step = isCount ? 0.25 : isPercent ? 1 : stepperStep;
  const presets: number[] = (spec.chips ?? []).map((c) => c.value);

  // min の既定は「その単位で最小の意味ある量」。入力グリッドは0起点なので、
  // min を動かしてもチップ値の有効性には影響しない。
  const derivedMin = spec.min ?? (isPercent ? 10 : isCount ? 0.25 : stepperStep);
  const lastChipValue = presets.at(-1);
  const derivedMax =
    spec.max ??
    (isPercent
      ? Math.max((lastChipValue ?? spec.default) * 2, 400)
      : lastChipValue !== undefined
      ? lastChipValue * 4
      : spec.default * 4);

  const unitLabel = spec.unitLabel ?? UNIT_LABELS[uiLanguage][spec.unit] ?? spec.unit;

  return {
    min: derivedMin,
    max: derivedMax,
    step,
    // 数え物で spec.step が明示されている場合 (例: ナン 0.5枚) は段階制をやめ、
    // その刻みで全域を統一する。コンテンツ側の意図を段階制で上書きしない。
    stepperTiers: isCount
      ? spec.step
        ? [{ upTo: Infinity, step: spec.step }]
        : COUNT_STEPPER_TIERS
      : [{ upTo: Infinity, step: stepperStep }],
    decimals: decimalsFromStep(step),
    unitLabel,
    presets,
    defaultValue: spec.default,
  };
}
