/**
 * identity-attribute.ts — 「種類 (Attribute)」依存のトッピング・量を解決する純粋関数群。
 *
 * Add-on / Amount は本来 Identity 直下に定義されるが、種類によって中身が変わる
 * 食品 (餅 vs 団子、唐揚げ vs とんかつ、月見うどん 等) では AttributeOption 側に
 * 上書きを置く。ここではその「実効値」を一貫したルールで解決する。
 *
 * 解決ルール: 選択中の AttributeOption に上書きがあればそれを、無ければ Identity の
 * 値にフォールバックする。includedAddonIds (factor に1つ織り込み済み) は隠さず、追加分として表示する。
 */

import { AltAmountSpec, AmountSpec, Identity } from '@/types/identity';

function findAttribute(identity: Identity, attributeKey: string | undefined) {
  if (!attributeKey) return undefined;
  return identity.attributes?.find((a) => a.key === attributeKey);
}

/**
 * 種類に「代替の量単位」(例: 唐揚げのg⇔個数) が定義されていればそれを返す。
 * 保存・計算は常に主単位 (getEffectiveAmountSpec) で行い、これは入力UIの
 * 便宜レイヤーに過ぎない。
 */
export function getEffectiveAltAmountSpec(
  identity: Identity,
  attributeKey: string | undefined,
): AltAmountSpec | undefined {
  return findAttribute(identity, attributeKey)?.altAmount;
}

/**
 * この種類の factor に1つ織り込み済みの Add-on id の集合。
 * 非表示にはしない。シートが「含まれています。足す分だけ選んでください」と案内する。
 */
export function getIncludedAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): Set<string> {
  return new Set(findAttribute(identity, attributeKey)?.includedAddonIds ?? []);
}

/** 種類を考慮した実効 amount spec。種類に上書きが無ければ Identity.amount。 */
export function getEffectiveAmountSpec(
  identity: Identity,
  attributeKey: string | undefined,
): AmountSpec {
  return findAttribute(identity, attributeKey)?.amount ?? identity.amount;
}

/** 「トッピング」欄に既定表示する Add-on id。 */
export function getEffectiveDefaultAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): string[] {
  const attr = findAttribute(identity, attributeKey);
  const base = attr?.defaultAddonIds ?? identity.defaultAddonIds ?? [];
  return base;
}

/** この種類で選択可能な Add-on のホワイトリスト。 */
export function getEffectiveAllowedAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): string[] {
  const attr = findAttribute(identity, attributeKey);
  const base = attr?.allowedAddonIds ?? identity.allowedAddonIds ?? [];
  return base;
}
