/**
 * Helpers to render a `FoodLog` in the log list with Identity-aware metadata.
 *
 * Spec: docs/IA-identity-spec.md
 *
 * Behavior:
 *   - `title`: Bucket label when the log was created via single-tap on a
 *     bucket button (`wasShortTap === true`). Otherwise the Identity label
 *     (e.g. "鶏むね・ささみ"). Falls back to legacy `categoryLabel/subTypeLabel`
 *     for older logs that have no `identityId`.
 *   - `subtitle`: "<Attribute label> · <Style label>" when present.
 *   - `amountText`: `<value><unitLabel>` using the Identity's `amount.unitLabel`
 *     (preferred) or default suffix mapping.
 *   - `addonsText`: comma-separated add-on labels (Identity流用 + Pure Addon).
 *   - `bucketHint`: Bucket label shown as a chip-like hint when `title` is the
 *     Identity (so the user can still see which bucket it came from).
 */

import {
  PURE_ADDONS_BY_ID,
  getBucketDef,
  getIdentity,
} from '@/constants/identity';
import {
  AmountUnit,
  AttributeOption,
  Identity,
  StyleOption,
} from '@/types/identity';
import { FoodLog, FoodLogAddon } from '@/types/nutrition';
import { migrateAmountValueForUnit } from './amount-migration';

const UNIT_SUFFIX: Record<AmountUnit, string> = {
  g: 'g',
  ml: 'ml',
  piece: '個',
  serving: '人前',
  percent: '%',
  plate: '皿',
  slice: '切',
  cut: '切れ',
};

export interface LogDisplayInfo {
  title: string;
  /** Optional secondary line: Attribute · Style summary (e.g. "皮あり · 揚げ"). */
  subtitle?: string;
  /** Optional bucket badge (when title is the Identity, this shows the bucket). */
  bucketHint?: string;
  /** Amount including unit suffix (e.g. "150 g", "5 本", "1 食"). */
  amountText: string;
  /** Comma-separated addon labels, or undefined when no addons. */
  addonsText?: string;
}

export function getLogDisplayInfo(log: FoodLog): LogDisplayInfo {
  const identity = log.identityId ? getIdentity(log.identityId) : undefined;

  // Older logs (pre Phase 2) — fall back to legacy fields.
  if (!identity) {
    return {
      title: log.subTypeLabel ?? log.categoryLabel ?? '記録',
      subtitle: undefined,
      amountText: legacyAmountText(log),
      addonsText: legacyAddonsText(log),
    };
  }

  const bucket = getBucketDef(identity.primaryHome.bucket);
  const isShortTap = log.wasShortTap === true;

  // Title rule:
  //   - shortTap → bucket label (matches user's tap target, avoids surprise)
  //   - otherwise → Identity label
  const title = isShortTap && bucket ? bucket.label : identity.label;
  const bucketHint = !isShortTap && bucket ? bucket.label : undefined;

  return {
    title,
    subtitle: buildSubtitle(identity, log),
    bucketHint,
    amountText: buildAmountText(identity, log),
    addonsText: buildAddonsText(log.appliedAddons),
  };
}

// ---------------------------------------------------------------------------
// Subtitle: Attribute · Style summary
// ---------------------------------------------------------------------------

function buildSubtitle(identity: Identity, log: FoodLog): string | undefined {
  const parts: string[] = [];
  if (log.attrKey) {
    const attr = identity.attributes?.find((a: AttributeOption) => a.key === log.attrKey);
    // Skip the default attribute (it's implied — showing it would be noise).
    if (attr && !attr.isDefault) {
      parts.push(attr.label);
    }
  }
  if (log.styleKey) {
    const style = identity.styles?.find((s: StyleOption) => s.key === log.styleKey);
    if (style && !style.isDefault) {
      parts.push(style.label);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

// ---------------------------------------------------------------------------
// Amount text: number + Identity-specific unit suffix
// ---------------------------------------------------------------------------

function buildAmountText(identity: Identity, log: FoodLog): string {
  const rawValue = log.amountValue ?? identity.amount.default;
  // Translate legacy 'serving' values into the Identity's current unit (e.g. percent).
  const value = migrateAmountValueForUnit(rawValue, log.amountUnit, identity.amount.unit);
  // chip-aware: prefer human label ("1人前", "大盛") when the saved value
  // matches a defined chip exactly.
  const chipHit = identity.amount.chips?.find((c) => c.value === value);
  if (chipHit) return chipHit.label;
  const suffix = identity.amount.unitLabel ?? UNIT_SUFFIX[identity.amount.unit];
  return `${formatAmountValue(value)} ${suffix}`;
}

function formatAmountValue(v: number): string {
  // Integer values display cleanly; fractional values keep one decimal.
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(1).replace(/\.0$/, '');
}

// ---------------------------------------------------------------------------
// Addon labels (Identity流用 or Pure Addon)
// ---------------------------------------------------------------------------

function buildAddonsText(addons?: FoodLogAddon[]): string | undefined {
  if (!addons || addons.length === 0) return undefined;
  const parts = addons.map(addonLabel).filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return `+ ${parts.join(' / ')}`;
}

function addonLabel(a: FoodLogAddon): string | null {
  if (a.refType === 'identity') {
    const id = getIdentity(a.refId);
    if (id?.asAddon?.defaultLabel) return prefixUnits(id.asAddon.defaultLabel, a.units);
    if (id) return prefixUnits(id.label, a.units);
    return null;
  }
  const pure = PURE_ADDONS_BY_ID[a.refId];
  if (pure) return prefixUnits(pure.label, a.units);
  return null;
}

function prefixUnits(label: string, units: number): string {
  if (units === 1) return label;
  return `${label} ×${formatAmountValue(units)}`;
}

// ---------------------------------------------------------------------------
// Legacy fallbacks (older logs without identityId)
// ---------------------------------------------------------------------------

function legacyAmountText(log: FoodLog): string {
  if (log.amountLabel) return log.amountLabel;
  if (log.amountValue && log.amountUnit) {
    const suffix = log.amountUnit === 'piece' ? '個' : log.amountUnit;
    return `${log.amountValue} ${suffix}`;
  }
  if (log.portionLabel) return log.portionLabel;
  if (log.portionValue) return `× ${log.portionValue}`;
  if (log.amountMultiplier) return `× ${log.amountMultiplier}`;
  return '';
}

function legacyAddonsText(log: FoodLog): string | undefined {
  const fromToppings = log.toppings?.map((t) => t.label) ?? [];
  const fromAdditions = log.additions ?? [];
  const all = [...fromToppings, ...fromAdditions];
  if (all.length === 0) return undefined;
  return `+ ${all.join(' / ')}`;
}
