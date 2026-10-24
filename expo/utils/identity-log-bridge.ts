/**
 * Bridge between the new Identity-first IA (Phase 2 resolver) and the legacy
 * `FoodLog` storage shape used by `app-state-provider`.
 *
 * Purpose: keep storage backward-compatible (old `categoryKey`/`subTypeKey`
 * fields still populated) while emitting the new `identityId`/`originIdentityId`
 * fields on every new log.
 *
 * Spec: docs/IA-identity-spec.md §6.3 (record shape)
 */

import { getBucketDef, getIdentity } from '@/constants/identity';
import { Identity } from '@/types/identity';
import { FoodLog, MealSlot } from '@/types/nutrition';
import type { AppLocale } from '@/types/locale';
import { getEffectiveAmountSpec } from './identity-attribute';
import { UNIT_LABELS } from './unit-labels';
import { ResolveResult } from './identity-resolver';

export interface BridgeMeta {
  id: string;
  date: string;
  timestamp: string;
  mealSlot?: MealSlot;
  /** True when called from quickLogIdentity (single-tap on bucket button). */
  wasShortTap?: boolean;
}

/**
 * Convert an Identity-first resolved draft into a FoodLog.
 *
 * - `categoryKey` / `categoryLabel` mirror the recordIdentity's primary bucket
 *   so existing UI that groups by `categoryKey` keeps working.
 * - `subTypeKey` / `subTypeLabel` mirror the recordIdentity itself.
 * - `identityId` / `originIdentityId` carry the new IA metadata.
 */
export function logDraftToFoodLog(draft: ResolveResult, meta: BridgeMeta, locale: AppLocale = 'ja'): FoodLog {
  const recordIdentity = requireIdentity(draft.recordIdentityId);
  const bucketKey = recordIdentity.primaryHome.bucket;
  const bucketDef = getBucketDef(bucketKey);

  return {
    id: meta.id,
    date: meta.date,
    timestamp: meta.timestamp,
    mealSlot: meta.mealSlot,
    mode: recordIdentity.primaryHome.tab === 'dish' ? 'dish' : 'ingredient',
    categoryKey: bucketKey,
    categoryLabel: bucketDef?.label ?? bucketKey,
    subTypeKey: recordIdentity.id,
    subTypeLabel: recordIdentity.label,
    baseMacro: draft.baseMacro,
    macro: draft.totalMacro,
    attrKey: draft.attributeKey,
    styleKey: draft.styleKey,
    amountValue: draft.amountValue,
    amountUnit: toLegacyAmountUnit(recordIdentity, draft.attributeKey),
    amountLabel: buildAmountLabel(recordIdentity, draft.attributeKey, draft.amountValue, locale),
    identityId: recordIdentity.id,
    originIdentityId: draft.originIdentityId,
    appliedAddons: draft.addons?.map((a) => ({
      refId: a.refId,
      refType: a.refType,
      units: a.units,
      addedMacro: a.addedMacro,
    })),
    wasShortTap: meta.wasShortTap,
  };
}

function requireIdentity(id: string): Identity {
  const found = getIdentity(id);
  if (!found) throw new Error(`identity-log-bridge: unknown Identity id "${id}"`);
  return found;
}

/**
 * Map the IA's wider AmountUnit set to the legacy FoodLog's narrower set.
 * Anything that isn't 'g' / 'ml' degrades to 'piece' for legacy compatibility.
 */
function toLegacyAmountUnit(identity: Identity, attributeKey: string | undefined): 'g' | 'ml' | 'piece' {
  // 保存する amountValue は種類 (Attribute) 別の実効 spec の単位で数えた値。Identity 共通の
  // 単位を保存すると、種類が g で上書きしている食品 (唐揚げ) が 'piece' で残り、
  // 「いつもの量」(usual-amount.ts) の単位一致判定から永久に外れる。
  const u = getEffectiveAmountSpec(identity, attributeKey).unit;
  if (u === 'g' || u === 'ml') return u;
  return 'piece';
}

export function buildAmountLabel(
  identity: Identity,
  attributeKey: string | undefined,
  amountValue: number,
  locale: AppLocale,
): string {
  // 種類 (Attribute) 別の量の上書き (例: ソーセージ=本) を反映する。
  const spec = getEffectiveAmountSpec(identity, attributeKey);
  const u = spec.unit;
  // chip-aware: if value matches a defined chip exactly, prefer its human label
  // (e.g. "1人前", "大盛"). Falls back to numeric + suffix otherwise.
  const chipHit = spec.chips?.find((c) => c.value === amountValue);
  if (chipHit) return chipHit.label;
  if (u === 'g' || u === 'ml' || u === 'percent') return `${amountValue}${u === 'percent' ? '%' : u}`;
  const unitLabel = spec.unitLabel ?? UNIT_LABELS[locale][u];
  return `${amountValue}${unitLabel}`;
}
