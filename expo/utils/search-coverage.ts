/**
 * search-coverage.ts — 検索語が「DBに名前で着地するか」の分類 (外部基準との突き合わせ用)。
 *
 *   negligible … 「記録不要」の案内が出る語 (お茶・調味料・薬味…。negligible-foods.ts)。着地はしないが、案内で足りる
 *   named    … 層1の上位3に、名前・部分・タグ一致 (完全/前方/部分) で着地する
 *   inferred … 層1に着地するが、含まれる語 (ビーフカレー→カレー) の推測のみ
 *   weak     … 層2 (もしかして) か語彙チップ止まり。Identity には着地しない
 *   gap      … 何も出ない、または層1に別物しか出ない見込みの無いもの
 *
 * 「正解が何か」は判定しない (それは人手のラベルが要る)。名前を知っているか=カバレッジだけを
 * 機械で測り、weak / gap だけを人が仕分ける。
 */
import { getCategoryHints, getVocabularyMatches, searchEntriesFuzzy } from './identity-search';
import { findNegligible } from './negligible-foods';

export type CoverageStatus = 'named' | 'inferred' | 'negligible' | 'weak' | 'gap';

export function classifyCoverage(q: string): { status: CoverageStatus; detail: string } {
  const negligible = findNegligible(q, 'ja');
  if (negligible) return { status: 'negligible', detail: negligible };
  const { confident, maybe } = searchEntriesFuzzy(q, { locale: 'ja' });
  const fmt = (r: (typeof confident)[number]) =>
    r.entry.preset
      ? `★${r.entry.preset.label}`
      : `${r.entry.identity.id}${r.entry.attribute ? '/' + r.entry.attribute.key : ''}${r.entry.style ? '[' + r.entry.style.key + ']' : ''}`;
  const sure = confident.filter((r) => r.method !== 'contains').slice(0, 3);
  if (sure.length > 0) return { status: 'named', detail: sure.map(fmt).join(', ') };
  if (confident.length > 0) return { status: 'inferred', detail: confident.slice(0, 3).map(fmt).join(', ') };
  const vocab = getVocabularyMatches(q, 'ja');
  if (maybe.length > 0 || vocab.length > 0) {
    // i18n-ignore: 開発者向けの監査レポート文言 (UI には出さない)
    return { status: 'weak', detail: `L2=${maybe.slice(0, 3).map(fmt).join(',') || '∅'} 語彙=${vocab.map((v) => v.identity ?? `b:${v.bucket}`).join(',') || '∅'}` };
  }
  const hints = getCategoryHints(q, 'ja');
  // i18n-ignore: 開発者向けの監査レポート文言 (UI には出さない)
  return { status: 'gap', detail: `ヒント=${hints.join(',') || '∅'}` };
}
