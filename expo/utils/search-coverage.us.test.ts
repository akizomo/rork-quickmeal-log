/**
 * US 版 検索カバレッジ (外部基準) の不変条件。日本語は search-coverage.test.ts。
 *
 * 内製ベンチマーク (search-benchmark.us) は DB を見ながら作った語彙なので DB に無いものを測れない。
 * ここでは DB と独立に決めた外部基準 (search-coverage.us.baseline.test-data.ts) で、
 *   1. 外部基準のうち「名前で着地しない語」が、凍結リストに無いまま増えない
 *   2. 凍結リストの語が解消したら外す (改善の固定)
 *   3. カバレッジが床を下回らない
 * を検査する。着地の「正しさ」は判定しない (それは search-benchmark.us の仕事)。
 *
 * リストの更新:
 *   SEARCH_COVERAGE_US_SHRINK=1 bun run test -- search-coverage.us   … 解消した語だけを消す
 *   SEARCH_COVERAGE_US_WRITE_KNOWN=1 bun run test -- search-coverage.us … 初期化 (人が内容を確認した上で)
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildRegistry } from '@/constants/identity';
import { US_SEARCH_ALIASES } from '@/constants/identity/search-aliases.us';
import { searchEntriesFuzzy } from './identity-search';
import { classifyCoverage } from './search-coverage';
import { US_COVERAGE_BASELINE } from './search-coverage.us.baseline.test-data';
import { US_KNOWN_COVERAGE_GAPS } from './search-coverage.us.known-gaps.test-data';

const registry = buildRegistry('en-US', 'en-US');
const identityById = new Map(Object.values(registry.byBucket).flat().map((i) => [i.id, i]));

function parseKey(key: string): { id: string; attr?: string; style?: string } {
  const m = key.match(/^([^/[]+)(?:\/([^[]+))?(?:\[(.+)\])?$/)!;
  return { id: m[1], attr: m[2], style: m[3] };
}

describe('別名テーブル (search-aliases.us.ts)', () => {
  it('キーが指す Identity / 種類 / スタイルが DB に実在する', () => {
    const bad: string[] = [];
    for (const key of Object.keys(US_SEARCH_ALIASES)) {
      const { id, attr, style } = parseKey(key);
      const identity = identityById.get(id);
      if (!identity) { bad.push(`${key}: Identity "${id}" が無い`); continue; }
      if (attr && !identity.attributes?.some((a) => a.key === attr)) bad.push(`${key}: 種類 "${attr}" が無い`);
      if (style && !identity.styles?.some((s) => s.key === style)) bad.push(`${key}: スタイル "${style}" が無い`);
    }
    expect(bad).toEqual([]);
  });

  // 同じ語が別のキーに2回あると、どちらに寄るかが曖昧になる。意図した上書き (種類を優先する) は
  // 「Identity キーと、その種類のキー」の組だけ許す。
  it('別名が別々の Identity に重複して寄せられていない', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const [key, words] of Object.entries(US_SEARCH_ALIASES)) {
      for (const w of words) {
        const norm = w.toLowerCase();
        const prev = seen.get(norm);
        if (prev && parseKey(prev).id !== parseKey(key).id) dup.push(`"${w}": ${prev} と ${key}`);
        seen.set(norm, key);
      }
    }
    expect(dup).toEqual([]);
  });
});

/**
 * 別名で検索しても、寄せ先が1位に着地しない語 (凍結リスト)。**増やさない・解消したら外す。**
 * 種類のラベルそのものが、別の Identity の名前・別名と同じ語 (tomato → トマトスープの種類) は、
 * identity-search.ts の US_CONTEXT_BOUND (日本語版の contextBound の英語版) で食品そのものを先にした (2026-11-07)。
 * 残りは、別名より Identity のタグの完全一致が強い語 (sandwich → PB&J のタグ) など。
 */
const KNOWN_ALIAS_MISSES = [
  'breakfast sausage', 'mocha frappuccino', 'sandwich',
  'bbq chicken', 'baked chicken', 'chipotle chicken bowl', 'fried fish', 'fried fish plate', 'spinach salad', 'green salad', 'biscuits',
];

describe('別名テーブル — 寄せ先への着地', () => {
  it('別名で検索すると寄せ先が層1の1位に着地する (凍結リストを除く)', () => {
    const miss: string[] = [];
    for (const [key, words] of Object.entries(US_SEARCH_ALIASES)) {
      const { id, attr } = parseKey(key);
      for (const w of words) {
        const top = searchEntriesFuzzy(w, { locale: 'en-US' }).confident[0];
        const ok = !!top && top.entry.identity.id === id && (!attr || top.entry.attribute?.key === attr || !top.entry.attribute);
        if (!ok) miss.push(w);
      }
    }
    expect(miss.filter((w) => !KNOWN_ALIAS_MISSES.includes(w))).toEqual([]);
    // 解消した語は凍結リストから外す (改善の固定)
    expect(KNOWN_ALIAS_MISSES.filter((w) => !miss.includes(w))).toEqual([]);
  });
});

const unique = [...new Map(US_COVERAGE_BASELINE.map((t) => [t.q, t])).values()];
const results = unique.map((t) => ({ t, c: classifyCoverage(t.q, 'en-US') }));
const uncovered = results.filter((r) => r.c.status === 'weak' || r.c.status === 'gap');
const isCovered = (r: (typeof results)[number]) => ['named', 'inferred', 'negligible'].includes(r.c.status);

describe('US 外部基準カバレッジ', () => {
  it('外部基準の語が重複していない', () => {
    const key = (t: { q: string; src: string; group: string }) => `${t.src}/${t.group}/${t.q}`;
    const ks = US_COVERAGE_BASELINE.map(key);
    expect(ks.filter((k, i) => ks.indexOf(k) !== i)).toEqual([]);
    expect(unique.length).toBeGreaterThan(600);
  });

  it('名前で着地しない語が、凍結リストに無いまま増えていない (退行 / 新しい穴)', () => {
    const added = uncovered.filter((r) => !(r.t.q in US_KNOWN_COVERAGE_GAPS)).map((r) => `${r.t.q} (${r.c.status}: ${r.c.detail})`);
    expect(added).toEqual([]);
  });

  it('凍結リストに、もう解消した語が残っていない (改善の固定)', () => {
    const stillUncovered = new Set(uncovered.map((r) => r.t.q));
    expect(Object.keys(US_KNOWN_COVERAGE_GAPS).filter((q) => !stillUncovered.has(q))).toEqual([]);
  });

  it('凍結リストの語は全て外部基準に存在する', () => {
    const all = new Set(US_COVERAGE_BASELINE.map((t) => t.q));
    expect(Object.keys(US_KNOWN_COVERAGE_GAPS).filter((q) => !all.has(q))).toEqual([]);
  });

  // 目標は日本語版と同じ 90%。初回測定 (2026-11-07) は床からの出発。改善のたびに床を上げる。
  const COVERAGE_FLOOR = 0.84; // 2026-11-07 ② の後の実測 84.2% (初回は 35%)
  it(`カバレッジ (名前で着地 + 推測着地 + 記録不要の案内) が ${COVERAGE_FLOOR * 100}% を下回らない (目標 90%)`, () => {
    expect(results.filter(isCovered).length / results.length).toBeGreaterThanOrEqual(COVERAGE_FLOOR);
  });

  it('(更新用) US_KNOWN_COVERAGE_GAPS を書き換える', () => {
    const file = path.join(__dirname, 'search-coverage.us.known-gaps.test-data.ts');
    const write = (entries: [string, string][], note: string) => {
      const body = entries.map(([q, why]) => `  ${JSON.stringify(q)}: ${JSON.stringify(why)},`).join('\n');
      fs.writeFileSync(file, `/**\n * US 版 外部基準カバレッジのうち、名前で着地しない語の凍結リスト (ラチェット)。${note}\n * 日本語版 (search-coverage.known-gaps.test-data.ts) と違い、まだ理由の分類をしていない。\n * 値は初回測定時の状態 (weak=もしかして止まり / gap=何も出ない) と上位の候補。分類は改善の作業の中で付ける。\n * **手で足さない** — 足したくなったら退行している。\n */\nexport const US_KNOWN_COVERAGE_GAPS: Record<string, string> = {\n${body}\n};\n`);
    };
    const now = new Map(uncovered.map((r) => [r.t.q, `${r.c.status}: ${r.c.detail}`]));
    if (process.env.SEARCH_COVERAGE_US_WRITE_KNOWN === '1') write([...now.entries()], '初期化: 初回測定 (2026-11-07) の未着地を全て凍結。');
    else if (process.env.SEARCH_COVERAGE_US_SHRINK === '1') write(Object.entries(US_KNOWN_COVERAGE_GAPS).filter(([q]) => now.has(q)), '改善により縮小済み (増やしていない)。');
    expect(true).toBe(true);
  });
});
