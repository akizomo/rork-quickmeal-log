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
  buildRegistry,
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
import type { AppLocale } from '@/types/locale';
import { migrateAmountValueForUnit } from './amount-migration';
import { getEffectiveAmountSpec } from './identity-attribute';
import { UNIT_LABELS } from './unit-labels';

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

export function getLogDisplayInfo(log: FoodLog, uiLanguage: AppLocale = 'ja'): LogDisplayInfo {
  const identity = log.identityId ? getIdentity(log.identityId) : undefined;

  // Older logs (pre Phase 2) — fall back to legacy fields.
  if (!identity) {
    return {
      title: log.subTypeLabel ?? log.categoryLabel ?? (uiLanguage === 'en-US' ? 'Log' : '記録'), // i18n-ignore: legacy logs without labels, fallback for JA
      subtitle: undefined,
      amountText: legacyAmountText(log, uiLanguage),
      addonsText: legacyAddonsText(log),
    };
  }

  const bucket = getBucketDef(identity.primaryHome.bucket);
  const localizedBucketLabel = bucket
    ? buildRegistry('ja', uiLanguage).buckets.find((b) => b.key === bucket.key)?.label ?? bucket.label
    : undefined;
  const isShortTap = log.wasShortTap === true;

  // Title rule:
  //   - shortTap → bucket label (matches user's tap target, avoids surprise)
  //   - otherwise → Identity label
  const title = isShortTap && localizedBucketLabel ? localizedBucketLabel : identity.label;
  const bucketHint = !isShortTap && localizedBucketLabel ? localizedBucketLabel : undefined;

  return {
    title,
    subtitle: buildSubtitle(identity, log),
    bucketHint,
    amountText: buildAmountText(identity, log, uiLanguage),
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

function buildAmountText(identity: Identity, log: FoodLog, uiLanguage: AppLocale): string {
  // 種類 (Attribute) が量の単位を上書きしている場合はそちらで表示する
  // (例: ベーコン=枚 / ソーセージ=本、唐揚げ=g)。
  const spec = getEffectiveAmountSpec(identity, log.attrKey);
  const rawValue = log.amountValue ?? spec.default;
  // Translate legacy 'serving' values into the Identity's current unit (e.g. percent).
  const value = migrateAmountValueForUnit(rawValue, log.amountUnit, spec.unit);
  // chip-aware: prefer human label ("1人前", "大盛") when the saved value
  // matches a defined chip exactly.
  const suffix = spec.unitLabel ?? UNIT_LABELS[uiLanguage][spec.unit];
  const chipHit = spec.chips?.find((c) => c.value === value);
  // 数値だけのチップ ("100" / "150") は単位を補う (シートの chipDisplayLabel と同じ規則)。
  if (chipHit) return /^\d+(\.\d+)?$/.test(chipHit.label.trim()) ? `${chipHit.label}${suffix}` : chipHit.label;
  return `${formatAmountValue(value)} ${suffix}`;
}

function formatAmountValue(v: number): string {
  // Integer values display cleanly; fractional values keep one decimal.
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(1).replace(/\.0$/, '');
}

const NUMERIC_CHIP_RE = /^\d+(\.\d+)?$/;

/**
 * 記録・削除のトーストに添える量の要約。「何が・どれだけ入ったか」を、記録した
 * その場で読めるようにする (タップで即記録されたとき、どの量で入ったかが見えなかった)。
 *
 *   - g / ml: 数値を必ず出し、名前のある量チップ (「普通」「1枚」) に当たれば括弧で添える
 *     → 「150g（普通）」「60g（1枚）」。数字だけのチップ (「100」) や数値を含むチップ
 *     (「60g」) は数値と同じことを言うだけなので添えない
 *   - 数え物・% など: チップ名がそのまま量を言っている (「半丁」「1缶」「P15 (200ml)」) ので
 *     チップ名だけ。当たらなければ数値+単位
 *   - Identity の無い旧ログは一覧と同じ旧表記。何も無ければ undefined (トーストは名前だけ)
 */
export function getLogAmountSummary(log: FoodLog, uiLanguage: AppLocale = 'ja'): string | undefined {
  const identity = log.identityId ? getIdentity(log.identityId) : undefined;
  if (!identity) return legacyAmountText(log, uiLanguage) || undefined;

  const spec = getEffectiveAmountSpec(identity, log.attrKey);
  const value = migrateAmountValueForUnit(log.amountValue ?? spec.default, log.amountUnit, spec.unit);
  const suffix = spec.unitLabel ?? UNIT_LABELS[uiLanguage][spec.unit];
  const numeric = formatAmountValue(value);
  // 日本語は「150g」と詰める。英語は単位の前に空白を置く
  const measured = uiLanguage === 'ja' ? `${numeric}${suffix}` : `${numeric} ${suffix}`;
  const chip = spec.chips?.find((c) => c.value === value);
  const chipLabel = chip?.label.trim();

  if (spec.unit !== 'g' && spec.unit !== 'ml') {
    if (!chipLabel) return measured;
    return NUMERIC_CHIP_RE.test(chipLabel) ? measured : chipLabel;
  }
  if (!chipLabel || NUMERIC_CHIP_RE.test(chipLabel) || chipLabel.includes(numeric)) return measured;
  return uiLanguage === 'ja' ? `${measured}（${chipLabel}）` : `${measured} (${chipLabel})`;
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

function legacyAmountText(log: FoodLog, uiLanguage: AppLocale): string {
  if (log.amountLabel) return log.amountLabel;
  if (log.amountValue && log.amountUnit) {
    const suffix = log.amountUnit === 'piece' ? UNIT_LABELS[uiLanguage].piece : log.amountUnit;
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
