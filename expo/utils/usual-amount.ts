/**
 * 量の初期値の学習 (いつもの量)。PRD §6.5.1「量の初期値 (いつもの量)」。
 *
 * うどん・そば固有の処理ではなく、全 Identity・全単位に同じ規則を適用する:
 * - 学習の単位は 記録先 Identity × 種類 (Attribute)
 * - 直近 USUAL_AMOUNT_WINDOW 件の下側中央値を候補にする (= 実際に記録された値)
 * - 直近窓のうち USUAL_AMOUNT_MIN_AGREE 件以上が候補の ±USUAL_AMOUNT_TOLERANCE
 *   以内なら採用。満たさなければ undefined (既定値のまま)
 *
 * 入力は ⭐️ 履歴ではなく FoodLog 本体。保存後の量の修正も学習に反映させるため。
 */

import type { AmountSpec, Identity } from '@/types/identity';
import type { FoodLog } from '@/types/nutrition';
import { migrateAmountValueForUnit } from './amount-migration';
import { getEffectiveAmountSpec } from './identity-attribute';

export const USUAL_AMOUNT_WINDOW = 5;
export const USUAL_AMOUNT_MIN_AGREE = 3;
export const USUAL_AMOUNT_TOLERANCE = 0.15;

export interface UsualAmountQuery {
  /** 記録先 Identity (FoodLog.identityId と照合する)。 */
  identityId: string;
  /** 正規化済みの種類キー (未指定ログは既定の種類として扱うため、呼び出し側で既定を渡す)。 */
  attributeKey: string | undefined;
  /** その Identity の既定の種類キー。attrKey 未保存ログの読み替えに使う。 */
  defaultAttributeKey: string | undefined;
  /** 現在の実効 AmountSpec (単位の照合・既定値の比較・範囲の確認に使う)。 */
  spec: AmountSpec;
  /** 編集中のログ自身を学習から外す。 */
  excludeLogId?: string;
}

/** FoodLog は g / ml 以外を 'piece' に畳んで保存している (identity-log-bridge)。 */
function legacyUnitOf(spec: AmountSpec): 'g' | 'ml' | 'piece' {
  return spec.unit === 'g' || spec.unit === 'ml' ? spec.unit : 'piece';
}

/**
 * いつもの量を返す。学習が成立しない、または既定値と同じなら undefined。
 */
export function deriveUsualAmount(logs: readonly FoodLog[], q: UsualAmountQuery): number | undefined {
  const unit = legacyUnitOf(q.spec);
  const values: { ts: string; value: number }[] = [];
  for (const log of logs) {
    if (log.id === q.excludeLogId) continue;
    if (log.identityId !== q.identityId) continue;
    if ((log.attrKey ?? q.defaultAttributeKey) !== q.attributeKey) continue;
    if (log.amountValue === undefined || !(log.amountValue > 0)) continue;
    if ((log.amountUnit ?? 'piece') !== unit) continue;
    const value = migrateAmountValueForUnit(log.amountValue, log.amountUnit, q.spec.unit);
    values.push({ ts: log.timestamp, value });
  }
  if (values.length < USUAL_AMOUNT_MIN_AGREE) return undefined;

  values.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  const recent = values.slice(0, USUAL_AMOUNT_WINDOW).map((v) => v.value);
  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];

  const agree = recent.filter((v) => Math.abs(v - median) <= median * USUAL_AMOUNT_TOLERANCE).length;
  if (agree < USUAL_AMOUNT_MIN_AGREE) return undefined;

  if (q.spec.min !== undefined && median < q.spec.min) return undefined;
  if (q.spec.max !== undefined && median > q.spec.max) return undefined;
  if (median === q.spec.default) return undefined;
  return median;
}

/**
 * Identity と種類から実効 spec・既定の種類を引いて deriveUsualAmount を呼ぶ。
 * attributeKey 未指定なら既定の種類として扱う。
 */
export function usualAmountForIdentity(
  logs: readonly FoodLog[],
  identity: Identity,
  attributeKey: string | undefined,
  excludeLogId?: string,
): number | undefined {
  const defaultAttributeKey =
    identity.attributes?.find((a) => a.isDefault)?.key ?? identity.attributes?.[0]?.key;
  const attr = attributeKey ?? defaultAttributeKey;
  return deriveUsualAmount(logs, {
    identityId: identity.id,
    attributeKey: attr,
    defaultAttributeKey,
    spec: getEffectiveAmountSpec(identity, attr),
    excludeLogId,
  });
}
