/**
 * identity-vocabulary-en.ts — US 版の語彙辞書の照合 (日本語版の getVocabularyMatches / getCategoryHints の英語版)。
 *
 * データは constants/identity/vocabulary.us.ts。照合は identity-search-en.ts と同じ「語の集合」で行う
 * (小文字化・複数形の畳み込み・つなぎ語の除去・語順に依存しない)。
 *
 *   vocabulary (もしかして) … 打った語に含まれる最長の料理名が当たる。2語以上の料理名 (sloppy joe) は、
 *                              単独の語 (ham) より具体的なので先に。無ければ主辞 (… sandwich / … soup)。
 *   category hints (このカテゴリかも) … 常時表示の逃げ道。料理名・主辞が語のどこにあっても拾い、
 *                              6文字以上の語は綴り違い (編集距離1) も許す。
 */
import { US_DISH_VOCABULARY, US_HEAD_NOUNS, type UsVocabTarget } from '@/constants/identity/vocabulary.us';
import type { BucketKey } from '@/types/identity';

import { enTokens, withinOne } from './identity-search-en';

export interface UsVocabularyMatch {
  bucket: BucketKey;
  identity?: string;
  source: 'dish_vocabulary' | 'head_noun';
}

interface DishEntry { tokens: string[]; target: UsVocabTarget }
interface HeadEntry { tokens: string[]; targets: UsVocabTarget[] }

const uniq = (xs: string[]) => [...new Set(xs)];

const DISH_INDEX: DishEntry[] = US_DISH_VOCABULARY
  .map(({ phrase, target }) => ({ tokens: uniq(enTokens(phrase)), target }))
  .filter((e) => e.tokens.length > 0);

const HEAD_INDEX: HeadEntry[] = US_HEAD_NOUNS.flatMap(({ heads, targets }) =>
  heads.map((h) => ({ tokens: uniq(enTokens(h)), targets })).filter((e) => e.tokens.length > 0),
);

/** 綴り直しの辞書 (6文字以上の単独の語だけ)。 */
const SINGLE_WORDS = uniq([
  ...DISH_INDEX.filter((e) => e.tokens.length === 1).map((e) => e.tokens[0]),
  ...HEAD_INDEX.filter((e) => e.tokens.length === 1).map((e) => e.tokens[0]),
]).filter((w) => w.length >= 6);

const subsetOf = (tokens: string[], q: Set<string>) => tokens.every((t) => q.has(t));

function pushUnique(out: UsVocabularyMatch[], target: UsVocabTarget, source: UsVocabularyMatch['source'], cap: number) {
  if (out.length >= cap) return;
  if (out.some((m) => m.bucket === target.bucket && m.identity === target.identity)) return;
  out.push({ bucket: target.bucket, identity: target.identity, source });
}

/** 綴り違いを直した語の集合 (辞書の単独の語と編集距離1・候補が1つのときだけ)。 */
function correctedTokens(tokens: string[]): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) {
    if (t.length < 6 || SINGLE_WORDS.includes(t)) continue;
    const cands = SINGLE_WORDS.filter((w) => withinOne(t, w));
    if (cands.length === 1) out.add(cands[0]);
  }
  return out;
}

/**
 * もしかして (層2/3)。2語以上の料理名が当たればそれだけ (具体的)。単独の語だけなら、主辞 (≥2語のクエリ) を
 * 先に、続けて単独の料理名。最大3件。
 */
export function usVocabularyMatches(query: string): UsVocabularyMatch[] {
  const tokens = enTokens(query);
  if (tokens.length === 0) return [];
  const q = correctedTokens(tokens);
  const out: UsVocabularyMatch[] = [];

  const dish = DISH_INDEX.filter((e) => subsetOf(e.tokens, q));
  const longest = dish.reduce((m, e) => Math.max(m, e.tokens.length), 0);
  if (longest >= 2) {
    for (const e of dish) if (e.tokens.length === longest) pushUnique(out, e.target, 'dish_vocabulary', 3);
    return out;
  }

  // 主辞は語尾 (veggie burger / tomato soup)。「X with Y」「X and Y」の頭 (pasta with pesto) も許す。
  if (tokens.length >= 2) {
    const ends = new Set([tokens[tokens.length - 1], tokens[0]]);
    for (const h of HEAD_INDEX) {
      if (h.tokens.length === 1 ? ends.has(h.tokens[0]) : subsetOf(h.tokens, q)) {
        for (const t of h.targets) pushUnique(out, t, 'head_noun', 3);
      }
    }
  }
  for (const e of dish) pushUnique(out, e.target, 'dish_vocabulary', 3);
  return out;
}

/** このカテゴリかも (層4)。料理名・主辞が語のどこにあっても拾う。最大4件。 */
export function usCategoryHints(query: string): BucketKey[] {
  const tokens = enTokens(query);
  if (tokens.length === 0) return [];
  const q = correctedTokens(tokens);
  const seen = new Set<BucketKey>();
  const hits: BucketKey[] = [];
  const add = (b: BucketKey) => { if (!seen.has(b) && hits.length < 4) { seen.add(b); hits.push(b); } };

  [...DISH_INDEX]
    .filter((e) => subsetOf(e.tokens, q))
    .sort((a, b) => b.tokens.length - a.tokens.length)
    .forEach((e) => add(e.target.bucket));
  for (const h of HEAD_INDEX) if (subsetOf(h.tokens, q)) h.targets.forEach((t) => add(t.bucket));
  return hits;
}
