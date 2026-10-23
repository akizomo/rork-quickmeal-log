/**
 * 検索カバレッジ (外部基準) の不変条件。
 *
 * 内製ベンチマーク (search-benchmark) は DB を見ながら作った語彙なので、DB に無いものを測れない。
 * ここでは DB と独立に決めた外部基準 (search-coverage.baseline.test-data.ts) を使い、
 *   1. 別名テーブルの寄せ先が実在し、その語で本当に寄せ先に着地する
 *   2. 外部基準のうち「名前で着地しない語」が、凍結リスト (理由つき) に無いまま増えない
 *   3. 凍結リストの語が解消したら外す (改善の固定)
 * を検査する。
 */
import { ALL_IDENTITIES } from '@/constants/identity';
import { SEARCH_ALIASES } from '@/constants/identity/search-aliases';
import { searchEntriesFuzzy } from './identity-search';
import { classifyCoverage } from './search-coverage';
import { COVERAGE_BASELINE } from './search-coverage.baseline.test-data';
import { KNOWN_COVERAGE_GAPS } from './search-coverage.known-gaps.test-data';

const identityById = new Map(ALL_IDENTITIES.map((i) => [i.id, i]));

function parseKey(key: string): { id: string; attr?: string; style?: string } {
  const m = key.match(/^([^/[]+)(?:\/([^[]+))?(?:\[(.+)\])?$/)!;
  return { id: m[1], attr: m[2], style: m[3] };
}

describe('別名テーブル (search-aliases.ts)', () => {
  it('キーが指す Identity / 種類 / スタイルが DB に実在する', () => {
    const bad: string[] = [];
    for (const key of Object.keys(SEARCH_ALIASES)) {
      const { id, attr, style } = parseKey(key);
      const identity = identityById.get(id);
      if (!identity) { bad.push(`${key}: Identity "${id}" が無い`); continue; }
      if (attr && !identity.attributes?.some((a) => a.key === attr)) bad.push(`${key}: 種類 "${attr}" が無い`);
      if (style && !identity.styles?.some((s) => s.key === style)) bad.push(`${key}: スタイル "${style}" が無い`);
    }
    expect(bad).toEqual([]);
  });

  it('別名がどのキーにも1回しか現れない (寄せ先が曖昧にならない)', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const [key, words] of Object.entries(SEARCH_ALIASES)) {
      for (const w of words) {
        const prev = seen.get(w);
        if (prev && prev !== key) dup.push(`「${w}」: ${prev} と ${key}`);
        seen.set(w, key);
      }
    }
    expect(dup).toEqual([]);
  });

  it('別名で検索すると、寄せ先が層1の1位に着地する (誤った寄せ先を検出)', () => {
    const miss: string[] = [];
    for (const [key, words] of Object.entries(SEARCH_ALIASES)) {
      const { id, attr, style } = parseKey(key);
      for (const w of words) {
        const top = searchEntriesFuzzy(w, { locale: 'ja' }).confident.slice(0, 3);
        // 1位であること。上位3に入るだけだと、1位が別物 (自信ありげな取り違え) を許してしまう。
        const ok = top.slice(0, 1).some(
          (r) =>
            r.entry.identity.id === id &&
            (!attr || r.entry.attribute?.key === attr || !r.entry.attribute) &&
            (!style || r.entry.style?.key === style),
        );
        if (!ok) {
          miss.push(`「${w}」→ ${key}  実際: ${top.map((r) => r.entry.identity.id + (r.entry.attribute ? '/' + r.entry.attribute.key : '')).join(', ') || '∅'}`);
        }
      }
    }
    expect(miss).toEqual([]);
  });
});

describe('外部基準カバレッジ', () => {
  const unique = [...new Map(COVERAGE_BASELINE.map((t) => [t.q, t])).values()];
  const results = unique.map((t) => ({ t, c: classifyCoverage(t.q) }));
  const uncovered = results.filter((r) => r.c.status === 'weak' || r.c.status === 'gap');

  it('外部基準の語が重複していない (同じ語を別の軸で数えない)', () => {
    const qs = COVERAGE_BASELINE.map((t) => t.q);
    // 軸をまたぐ同語は許容 (例: 唐揚げ) だが、同じ軸・同じグループ内の重複は書き損じ
    const key = (t: { q: string; src: string; group: string }) => `${t.src}/${t.group}/${t.q}`;
    const ks = COVERAGE_BASELINE.map(key);
    expect(ks.filter((k, i) => ks.indexOf(k) !== i)).toEqual([]);
    expect(qs.length).toBeGreaterThan(500);
  });

  it('名前で着地しない語が、理由つきの凍結リストに無いまま増えていない (退行 / 新しい穴)', () => {
    const added = uncovered.filter((r) => !(r.t.q in KNOWN_COVERAGE_GAPS)).map((r) => `${r.t.q} (${r.c.status}: ${r.c.detail})`);
    expect(added).toEqual([]);
  });

  it('凍結リストに、もう解消した語が残っていない (改善の固定)', () => {
    const stillUncovered = new Set(uncovered.map((r) => r.t.q));
    expect(Object.keys(KNOWN_COVERAGE_GAPS).filter((q) => !stillUncovered.has(q))).toEqual([]);
  });

  it('凍結リストの語は全て外部基準に存在する', () => {
    const all = new Set(COVERAGE_BASELINE.map((t) => t.q));
    expect(Object.keys(KNOWN_COVERAGE_GAPS).filter((q) => !all.has(q))).toEqual([]);
  });

  it('カバレッジ (名前で着地 + 推測着地 + 記録不要の案内) が 90% を下回らない', () => {
    const covered = results.filter((r) => ['named', 'inferred', 'negligible'].includes(r.c.status)).length;
    expect(covered / results.length).toBeGreaterThanOrEqual(0.9);
  });
});
