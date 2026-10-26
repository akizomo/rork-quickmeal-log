/**
 * 名前が、すでに Identity 辞書の検索で「確実な一致 (層1)」に着地するか (PRD §6.5.4「すでに DB にある食品を、
 * 気づかず My食品にするケース」)。
 *
 * - 数値入力ページで名前を入れたとき、層1があれば「すでにあります ›」を一行だけ出す (層2以降は出さない)
 * - 保存時と診断で「My食品の名前が、いまの検索で DB に着地するか」を分けて数える
 */
import { searchEntriesFuzzy, type SearchEntryResult } from '@/utils/identity-search';
import type { AppLocale } from '@/types/locale';

/** 層1 (confident) の先頭。無ければ null。名前が短すぎる (1文字) ときは誤検知を避けて null。 */
export function findLayer1Landing(name: string, locale?: AppLocale): SearchEntryResult | null {
  const q = name.normalize('NFKC').trim();
  if (q.length < 2) return null;
  const { confident } = searchEntriesFuzzy(q, { locale });
  return confident[0] ?? null;
}
