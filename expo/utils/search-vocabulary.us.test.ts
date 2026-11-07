/**
 * US 版の語彙辞書 (constants/identity/vocabulary.us.ts) の不変条件と、基本の動作。
 * 日本語版の辞書は identity-search.test.ts 側で検査している。
 */
import { buildRegistry } from '@/constants/identity';
import { US_DISH_VOCABULARY, US_HEAD_NOUNS } from '@/constants/identity/vocabulary.us';

import { getCategoryHints, getVocabularyMatches } from './identity-search';
import { enTokens } from './identity-search-en';

const registry = buildRegistry('en-US', 'en-US');
const bucketKeys = new Set(registry.buckets.map((b) => b.key));
const identityIds = new Set(Object.values(registry.byBucket).flat().map((i) => i.id));
const key = (s: string) => [...new Set(enTokens(s))].sort().join(' ');

describe('US 語彙辞書 — データの健全性', () => {
  it('寄せ先のバケット / Identity が US の DB に実在する', () => {
    const bad: string[] = [];
    for (const { phrase, target } of US_DISH_VOCABULARY) {
      if (!bucketKeys.has(target.bucket)) bad.push(`${phrase}: バケット "${target.bucket}" が無い`);
      if (target.identity && !identityIds.has(target.identity)) bad.push(`${phrase}: Identity "${target.identity}" が無い`);
    }
    for (const { heads, targets } of US_HEAD_NOUNS) {
      for (const t of targets) if (!bucketKeys.has(t.bucket)) bad.push(`${heads.join('/')}: バケット "${t.bucket}" が無い`);
    }
    expect(bad).toEqual([]);
  });

  it('同じ語 (語の集合が同じ) が別々のバケットに寄せられていない', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const { phrase, target } of US_DISH_VOCABULARY) {
      const k = key(phrase);
      const prev = seen.get(k);
      if (prev && prev !== target.bucket) dup.push(`"${phrase}": ${prev} と ${target.bucket}`);
      seen.set(k, target.bucket);
    }
    // 'chips' (snack_drink) と 'nachos chips' のように別の語なら許す。ここでは完全に同じ語だけを見る。
    expect(dup).toEqual([]);
  });

  it('辞書が十分な大きさ (料理名 400語以上)', () => {
    expect(new Set(US_DISH_VOCABULARY.map((e) => key(e.phrase))).size).toBeGreaterThan(400);
  });
});

describe('US 語彙辞書 — 動作', () => {
  const buckets = (q: string) => getVocabularyMatches(q, 'en-US').map((m) => m.bucket);

  it('DB に専用の Identity が無い料理を、バケットへ案内する', () => {
    expect(buckets('sloppy joe')).toContain('burger_sandwich');
    expect(buckets('gnocchi')).toContain('pizza_pasta');
    expect(buckets('bibimbap')).toContain('asian_takeout');
    expect(buckets('chile relleno')).toContain('mexican');
    expect(buckets('lobster bisque')).toContain('soup_stew');
  });

  it('語尾の主辞 (2語以上) でバケットへ案内する。1語だけの主辞では案内しない', () => {
    expect(buckets('mystery sandwich')).toContain('burger_sandwich');
    expect(buckets('mystery soup')).toContain('soup_stew');
    expect(buckets('soup')).toEqual([]);
  });

  it('2語以上の料理名は、単独の語より優先される (ham sandwich でなく sloppy joe)', () => {
    expect(buckets('beef sloppy joe')).toEqual(['burger_sandwich']);
  });

  it('名前や複合で強く着地している語には、案内を出さない (whole milk / ham sandwich)', () => {
    expect(buckets('whole milk')).toEqual([]);
    expect(buckets('ham sandwich')).toEqual([]);
  });

  it('綴り違いでも案内する (6文字以上)', () => {
    expect(buckets('dumplngs')).toContain('asian_takeout');
  });

  it('カテゴリヒントは語のどこにあっても拾い、最大4件', () => {
    const hints = getCategoryHints('spicy veggie burger bowl', 'en-US');
    expect(hints).toEqual(expect.arrayContaining(['burger_sandwich', 'bowl_salad']));
    expect(hints.length).toBeLessThanOrEqual(4);
  });

  it('何も入力しない / 辞書に無い語では空', () => {
    expect(buckets('')).toEqual([]);
    expect(buckets('xyzzy')).toEqual([]);
    expect(getCategoryHints('xyzzy', 'en-US')).toEqual([]);
  });

  it('日本語の検索 (locale ja) には影響しない', () => {
    expect(getVocabularyMatches('グラタン', 'ja').length).toBeGreaterThan(0);
    expect(getVocabularyMatches('sloppy joe', 'ja')).toEqual([]);
  });
});
