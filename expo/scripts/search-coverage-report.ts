/**
 * search-coverage-report.ts — 外部基準 (search-coverage.baseline.test-data.ts) を検索に通し、
 * 「DBが名前を知っているか」を分類して出す。
 *
 * 使い方: bun scripts/search-coverage-report.ts [--gaps]
 */
import { COVERAGE_BASELINE } from '@/utils/search-coverage.baseline.test-data';
import { classifyCoverage } from '@/utils/search-coverage';

const onlyGaps = process.argv.includes('--gaps');
const seen = new Set<string>();
const rows = COVERAGE_BASELINE.filter((t) => (seen.has(t.q) ? false : (seen.add(t.q), true))).map((t) => ({ t, c: classifyCoverage(t.q) }));
const counts: Record<string, number> = {};
for (const r of rows) counts[r.c.status] = (counts[r.c.status] ?? 0) + 1;
console.log(`# 検索カバレッジ (外部基準 ${rows.length}語)\n`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' / '), '\n');
for (const status of ['gap', 'weak', 'inferred', 'negligible', 'named'] as const) {
  if (onlyGaps && (status === 'named' || status === 'inferred' || status === 'negligible')) continue;
  const set = rows.filter((r) => r.c.status === status);
  console.log(`\n## ${status} (${set.length})`);
  for (const r of set) console.log(`- [${r.t.src}/${r.t.group}] ${r.t.q} → ${r.c.detail}`);
}
