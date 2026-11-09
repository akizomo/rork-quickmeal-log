/**
 * US 検索 — 言い方の崩し方に対する頑健さ (2026-11-09)。
 *
 * 目的: 「新しい語の1位正解」(汎化) を、**私が語を書かずに**測る。チューニング用語彙のうち 1位に着地している語に、
 * 機械的な崩し (複数形・量の前置き・「my」・大きさ・語順・綴り違い・大文字・記号) をかけて、**同じ食品が1位に残る割合**を型ごとに出す。
 *   - 語を書くのは私なので、書いた語は DB や辞書に引きずられる (231/380 語が既存と重なった)。崩し方なら偏りが入らない。
 *   - 型ごとの数字が、直す仕組み (どの規則が足りないか) をそのまま指す。
 *
 * ラチェット: 各型の下限は 2026-11-09 の実測から少し引いた値。**下げない**。直したら引き上げる。
 * 「plural/singular」は mass noun (tofus / chilis / pb&js) のような不自然な複数形を含むので、下限は低めにしてある。
 */
import { buildRegistry } from '@/constants/identity';
import type { Identity } from '@/types/identity';
import { searchEntriesFuzzy } from './identity-search';
import { createEngine } from './search-benchmark.engine';
import { US_TUNING_CORPUS } from './search-benchmark.us.corpus.test-data';
import type { Item } from './search-benchmark.corpus.test-data';

const registry = buildRegistry('en-US', 'en-US');
const ids: Identity[] = [...new Map(Object.values(registry.byBucket).flat().map((i) => [i.id, i])).values()];
const { evaluate } = createEngine('en-US', ids, { bucketLanding: true });
for (let i = 0; i < 20; i++) searchEntriesFuzzy('warmup', { locale: 'en-US' });

const pluralize = (w: string) => (/s$/.test(w) ? w.slice(0, -1) : /(ch|sh|x|o)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
const typo = (w: string) => (w.length >= 6 ? w.slice(0, 2) + w[3] + w[2] + w.slice(4) : null); // 隣の入れ替え
const typoSub = (w: string) => (w.length >= 6 ? w.slice(0, 3) + (w[3] === 'e' ? 'a' : 'e') + w.slice(4) : null);
const typoDel = (w: string) => (w.length >= 6 ? w.slice(0, 3) + w.slice(4) : null);
const P: Record<string, (q: string) => string | null> = {
  'plural/singular': (q) => { const t = q.split(' '); t[t.length - 1] = pluralize(t[t.length - 1]); return t.join(' '); },
  'prefix: glass/cup/slice/bowl of': (q) => `bowl of ${q}`,
  'prefix: 2': (q) => `2 ${q}`,
  'prefix: my': (q) => `my ${q}`,
  'suffix: large': (q) => `${q} large`,
  'suffix: homemade': (q) => `homemade ${q}`,
  'word order swap': (q) => { const t = q.split(' '); return t.length === 2 ? `${t[1]} ${t[0]}` : null; },
  'typo: transpose': (q) => { const t = q.split(' '); const i = t.findIndex((w) => w.length >= 6); if (i < 0) return null; const x = typo(t[i]); if (!x) return null; t[i] = x; return t.join(' '); },
  'typo: substitute': (q) => { const t = q.split(' '); const i = t.findIndex((w) => w.length >= 6); if (i < 0) return null; const x = typoSub(t[i]); if (!x) return null; t[i] = x; return t.join(' '); },
  'typo: delete': (q) => { const t = q.split(' '); const i = t.findIndex((w) => w.length >= 6); if (i < 0) return null; const x = typoDel(t[i]); if (!x) return null; t[i] = x; return t.join(' '); },
  'UPPERCASE': (q) => q.toUpperCase(),
  'hyphenated': (q) => (q.includes(' ') ? q.replace(/ /g, '-') : null),
  'with: + "and"': (q) => (q.includes(' ') ? q.replace(' ', ' and ') : null),
  'trailing period': (q) => `${q}.`,
};
const FLOORS: Record<string, number> = {
  'plural/singular': 93, 'prefix: glass/cup/slice/bowl of': 98, 'prefix: 2': 98, 'prefix: my': 98, 'suffix: large': 98, 'suffix: homemade': 98,
  'word order swap': 96, 'typo: transpose': 93, 'typo: substitute': 91, 'typo: delete': 90, 'UPPERCASE': 99, 'hyphenated': 95, 'with: + "and"': 93, 'trailing period': 99,
};

describe('US 検索 — 言い方の崩し方に対する頑健さ', () => {
it('崩した語でも、1位に着地していた語は1位に残る (型ごとの下限)', () => {
  const base = US_TUNING_CORPUS.filter((i) => i.kind !== 'chain' && i.kind !== 'gap' && !/[^a-z0-9% '&-]/.test(i.q));
  const passing = base.filter((i) => evaluate(i).status === 'top1');
  const lines = [`base words passing top1: ${passing.length}/${base.length}`];
  for (const [name, f] of Object.entries(P)) {
    let n = 0, ok = 0; const bad: string[] = [];
    for (const it of passing) {
      const q2 = f(it.q);
      if (!q2 || q2 === it.q) continue;
      n++;
      const r = evaluate({ ...it, q: q2 } as Item);
      if (r.status === 'top1') ok++; else if (bad.length < 6) bad.push(`${q2} → ${r.top.slice(0, 2).join(',') || '∅'} (want ${it.e[0]})`);
    }
    lines.push(`${name.padEnd(34)} ${String(ok).padStart(3)}/${String(n).padStart(3)} = ${(100 * ok / Math.max(1, n)).toFixed(1)}%  e.g. ${bad.join(' | ')}`);
  }
  const rates: Record<string, number> = {};
  for (const [name, f] of Object.entries(P)) {
    let n = 0, ok = 0;
    for (const it of passing) { const q2 = f(it.q); if (!q2 || q2 === it.q) continue; n++; if (evaluate({ ...it, q: q2 } as Item).status === 'top1') ok++; }
    rates[name] = (100 * ok) / Math.max(1, n);
  }
  if (process.env.SEARCH_EVAL_PRINT === '1') console.log(lines.join('\n'));
  const low = Object.entries(FLOORS).filter(([k, floor]) => rates[k] < floor).map(([k, floor]) => `${k}: ${rates[k].toFixed(1)}% < ${floor}%`);
  expect(low).toEqual([]);
});
});
