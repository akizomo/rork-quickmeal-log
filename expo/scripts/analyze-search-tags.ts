/**
 * Coverage analyzer for Identity.searchTags.
 *
 * Run from `expo/`:
 *   bun scripts/analyze-search-tags.ts
 *
 * Outputs:
 *   - 全 Identity 件数 / searchTags 定義あり / 平均件数
 *   - ひらがな/カタカナ/ローマ字/英語/漢字 表記カバレッジ
 *   - searchTags 未定義の Identity 一覧 (上位)
 *
 * このスクリプトは仕様詳細化フェーズの D1-3 (カバレッジ調査) のため。
 */

import { ALL_IDENTITIES } from '../constants/identity';

const HIRAGANA_RE = /[\u3041-\u3096]/;
const KATAKANA_RE = /[\u30A1-\u30FA]/;
const KANJI_RE = /[\u4E00-\u9FFF]/;
const LATIN_RE = /[a-zA-Z]/;
// "ローマ字 (日本語ローマ字綴り) っぽい" 簡易判定: 全てラテン文字 + 母音含む短い綴り
// 厳密な判定は難しいので、英語名と区別するヒューリスティック:
//   - 全部小文字 alpha のみ かつ
//   - 母音/子音パターンがある程度日本語ローマ字の特徴を示す (ka, shi, tsu, kk, etc.)
function looksLikeRomaji(s: string): boolean {
  if (!/^[a-z]+$/.test(s)) return false;
  if (s.length < 2 || s.length > 20) return false;
  // ローマ字ぽい連続パターン: kk/tt/ss/pp 促音、ou/uu/ei 長音
  if (/(kk|tt|ss|pp|cch|sh|ch|ts|nn|ou|uu|ei|aa)/.test(s)) return true;
  // 末尾母音が日本語ぽい
  if (/[aeiou]$/.test(s) && /[bcdfghjklmnprstwyz][aeiou]/.test(s)) return true;
  return false;
}

function looksLikeEnglish(s: string): boolean {
  if (!/^[a-zA-Z][a-zA-Z\s-]*$/.test(s)) return false;
  // 英単語っぽい: looksLikeRomaji を満たさず、3文字以上
  return s.length >= 3 && !looksLikeRomaji(s.toLowerCase());
}

interface IdentityCoverage {
  id: string;
  label: string;
  tagCount: number;
  hasHiragana: boolean;
  hasKatakana: boolean;
  hasKanji: boolean;
  hasRomaji: boolean;
  hasEnglish: boolean;
}

const total = ALL_IDENTITIES.length;
const withTags = ALL_IDENTITIES.filter((id) => (id.searchTags?.length ?? 0) > 0);

const coverage: IdentityCoverage[] = ALL_IDENTITIES.map((id) => {
  const tags = id.searchTags ?? [];
  const all = [id.label, ...tags];
  return {
    id: id.id,
    label: id.label,
    tagCount: tags.length,
    hasHiragana: all.some((s) => HIRAGANA_RE.test(s)),
    hasKatakana: all.some((s) => KATAKANA_RE.test(s)),
    hasKanji: all.some((s) => KANJI_RE.test(s)),
    hasRomaji: all.some((s) => looksLikeRomaji(s)),
    hasEnglish: all.some((s) => looksLikeEnglish(s)),
  };
});

const totalTagCount = withTags.reduce((s, id) => s + (id.searchTags?.length ?? 0), 0);
const avgTagsPerIdentityWithTags =
  withTags.length > 0 ? (totalTagCount / withTags.length).toFixed(1) : '0';
const avgTagsPerIdentity = total > 0 ? (totalTagCount / total).toFixed(1) : '0';

const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

const hiraganaCount = coverage.filter((c) => c.hasHiragana).length;
const katakanaCount = coverage.filter((c) => c.hasKatakana).length;
const kanjiCount = coverage.filter((c) => c.hasKanji).length;
const romajiCount = coverage.filter((c) => c.hasRomaji).length;
const englishCount = coverage.filter((c) => c.hasEnglish).length;

console.log('=== Identity searchTags Coverage Analysis ===\n');
console.log(`Total Identities          : ${total}`);
console.log(`With searchTags (any)     : ${withTags.length} (${pct(withTags.length)})`);
console.log(`Total searchTags entries  : ${totalTagCount}`);
console.log(`Avg tags per identity     : ${avgTagsPerIdentity} (overall) / ${avgTagsPerIdentityWithTags} (only those with tags)`);
console.log('');
console.log('-- 表記カバレッジ (label + searchTags 合計で判定) --');
console.log(`ひらがな表記あり          : ${hiraganaCount} (${pct(hiraganaCount)})`);
console.log(`カタカナ表記あり          : ${katakanaCount} (${pct(katakanaCount)})`);
console.log(`漢字表記あり              : ${kanjiCount} (${pct(kanjiCount)})`);
console.log(`ローマ字表記あり (推定)   : ${romajiCount} (${pct(romajiCount)})`);
console.log(`英語表記あり (推定)       : ${englishCount} (${pct(englishCount)})`);
console.log('');

// searchTags 未定義 Identity (上位 30)
const noTags = coverage.filter((c) => c.tagCount === 0);
console.log(`-- searchTags 未定義の Identity (${noTags.length} 件) --`);
console.log('上位 30 件:');
for (const c of noTags.slice(0, 30)) {
  console.log(`  - [${c.id}] ${c.label}`);
}

// ひらがな表記なし Identity (上位 30)
const noHiragana = coverage.filter((c) => !c.hasHiragana);
console.log('');
console.log(`-- ひらがな表記なしの Identity (${noHiragana.length} 件) --`);
console.log('上位 30 件:');
for (const c of noHiragana.slice(0, 30)) {
  console.log(`  - [${c.id}] ${c.label} (tags: ${c.tagCount})`);
}

// ローマ字表記なし Identity (上位 30)
const noRomaji = coverage.filter((c) => !c.hasRomaji);
console.log('');
console.log(`-- ローマ字表記なしの Identity (${noRomaji.length} 件) --`);
console.log('上位 30 件:');
for (const c of noRomaji.slice(0, 30)) {
  console.log(`  - [${c.id}] ${c.label} (tags: ${c.tagCount})`);
}
