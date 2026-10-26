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

/**
 * My食品の名前を、現在の検索で DB (Identity 辞書) に着地するかで2つに分ける (PRD §6.5.4「DB拡張への接続」)。
 * 着地あり = 検索の語彙の穴 (別名テーブルで直す) / 着地なし = DB の穴 (Identity 拡張の手がかり)。
 * 集計時の検索で判定するので、DB・語彙の更新が反映される。
 */
export function classifyMyFoodNames<T extends { name: string }>(
  foods: readonly T[] | undefined,
  locale?: AppLocale,
): { landed: T[]; notLanded: T[] } {
  const landed: T[] = [];
  const notLanded: T[] = [];
  for (const f of foods ?? []) {
    (findLayer1Landing(f.name, locale) ? landed : notLanded).push(f);
  }
  return { landed, notLanded };
}

/**
 * ユーザーが押したときだけ OS の共有シートで送る本文 (「見つからなかった食品」と同じ作り)。
 * **含めるのは、画面に出ている My食品の名前と、DB に着地するかだけ。** 数値・日時・記録は含めない
 * (名前は自由文で食事内容を含むため、画面に見せたものだけを送る)。
 */
export function buildMyFoodShareText<T extends { name: string }>(
  foods: readonly T[] | undefined,
  dateISO: string,
  locale?: AppLocale,
): string {
  const { landed, notLanded } = classifyMyFoodNames(foods, locale);
  const lines = [
    ...notLanded.map((f) => `no-match\t${f.name}`),
    ...landed.map((f) => `matches-db\t${f.name}`),
  ];
  return [`Hachibu my-foods ${dateISO.slice(0, 10)}`, 'landing\tname', ...lines].join('\n');
}
