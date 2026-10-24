/**
 * negligible-foods.ts — 検索語が「記録不要」の食べ物かの判定 (constants/identity/negligible-foods.ts)。
 */
import { NEGLIGIBLE_EN, NEGLIGIBLE_JA, type NegligibleEntry, type NegligibleGroup } from '@/constants/identity/negligible-foods';
import type { AppLocale } from '@/types/locale';
import { queryVariants, toKey } from './identity-search-keys';

const indexFor = (entries: NegligibleEntry[]): Map<string, NegligibleGroup> => {
  const m = new Map<string, NegligibleGroup>();
  for (const e of entries) for (const t of e.terms) m.set(toKey(t), e.group);
  return m;
};

const JA = indexFor(NEGLIGIBLE_JA);
const EN = indexFor(NEGLIGIBLE_EN);

/** 完全一致 (表記ゆれは畳み込み済み) のときだけ分類を返す。部分一致では返さない。 */
export function findNegligible(query: string, locale: AppLocale): NegligibleGroup | null {
  const index = locale === 'en-US' ? EN : JA;
  for (const v of queryVariants(query)) {
    const hit = index.get(v.key);
    if (hit) return hit;
  }
  return null;
}
