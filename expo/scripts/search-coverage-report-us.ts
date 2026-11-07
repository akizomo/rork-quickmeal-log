/**
 * search-coverage-report-us.ts — US 版の外部基準 (search-coverage.us.baseline.test-data.ts) を検索に通し、
 * 「DB が名前を知っているか」を分類して出す。日本版は search-coverage-report.ts。
 *
 * 使い方: bun scripts/search-coverage-report-us.ts [--gaps]
 */
import { US_COVERAGE_BASELINE } from '@/utils/search-coverage.us.baseline.test-data';
import { classifyCoverage } from '@/utils/search-coverage';

const onlyGaps = process.argv.includes('--gaps');
const seen = new Set<string>();
const rows = US_COVERAGE_BASELINE.filter((t) => (seen.has(t.q) ? false : (seen.add(t.q), true))).map((t) => ({ t, c: classifyCoverage(t.q, 'en-US') }));
const counts: Record<string, number> = {};
for (const r of rows) counts[r.c.status] = (counts[r.c.status] ?? 0) + 1;
console.log(`# US 検索カバレッジ (外部基準 ${rows.length}語)\n`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' / '), '\n');
const bySrc: Record<string, { n: number; ok: number }> = {};
for (const r of rows) {
  const s = (bySrc[r.t.src] ??= { n: 0, ok: 0 });
  s.n++;
  if (['named', 'inferred', 'negligible'].includes(r.c.status)) s.ok++;
}
for (const [k, v] of Object.entries(bySrc)) console.log(`${k}: ${v.ok}/${v.n} (${((v.ok / v.n) * 100).toFixed(1)}%)`);
for (const status of ['gap', 'weak', 'inferred', 'negligible', 'named'] as const) {
  if (onlyGaps && (status === 'named' || status === 'inferred' || status === 'negligible')) continue;
  const set = rows.filter((r) => r.c.status === status);
  console.log(`\n## ${status} (${set.length})`);
  for (const r of set) console.log(`- [${r.t.src}/${r.t.group}] ${r.t.q} → ${r.c.detail}`);
}
