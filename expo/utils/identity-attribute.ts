/**
 * identity-attribute.ts — 「種類 (Attribute)」依存のトッピング・量を解決する純粋関数群。
 *
 * Add-on / Amount は本来 Identity 直下に定義されるが、種類によって中身が変わる
 * 食品 (餅 vs 団子、唐揚げ vs とんかつ、月見うどん 等) では AttributeOption 側に
 * 上書きを置く。ここではその「実効値」を一貫したルールで解決する。
 *
 * 解決ルール: 選択中の AttributeOption に上書きがあればそれを、無ければ Identity の
 * 値にフォールバックする。hiddenAddonIds は二重計上防止のため最終結果から除外する。
 */

import { AmountSpec, Identity } from '@/types/identity';

function findAttribute(identity: Identity, attributeKey: string | undefined) {
  if (!attributeKey) return undefined;
  return identity.attributes?.find((a) => a.key === attributeKey);
}

/** この種類で隠すべき Add-on id の集合 (factor に織り込み済み等)。 */
export function getHiddenAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): Set<string> {
  return new Set(findAttribute(identity, attributeKey)?.hiddenAddonIds ?? []);
}

/** 種類を考慮した実効 amount spec。種類に上書きが無ければ Identity.amount。 */
export function getEffectiveAmountSpec(
  identity: Identity,
  attributeKey: string | undefined,
): AmountSpec {
  return findAttribute(identity, attributeKey)?.amount ?? identity.amount;
}

/** 「トッピング」欄に既定表示する Add-on id (hidden を除外済み)。 */
export function getEffectiveDefaultAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): string[] {
  const attr = findAttribute(identity, attributeKey);
  const base = attr?.defaultAddonIds ?? identity.defaultAddonIds ?? [];
  const hidden = new Set(attr?.hiddenAddonIds ?? []);
  return base.filter((id) => !hidden.has(id));
}

/** この種類で選択可能な Add-on のホワイトリスト (hidden を除外済み)。 */
export function getEffectiveAllowedAddonIds(
  identity: Identity,
  attributeKey: string | undefined,
): string[] {
  const attr = findAttribute(identity, attributeKey);
  const base = attr?.allowedAddonIds ?? identity.allowedAddonIds ?? [];
  const hidden = new Set(attr?.hiddenAddonIds ?? []);
  return base.filter((id) => !hidden.has(id));
}
