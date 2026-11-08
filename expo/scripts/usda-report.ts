/**
 * usda-report.ts — US 食材の既定値と USDA (SR Legacy) の差を一覧にする。
 * 使い方: bun scripts/usda-report.ts [--bad]   (--bad: 許容を超えるものだけ)
 */
import { buildRegistry } from '@/constants/identity';
import { USDA_LINKS } from '@/constants/identity/us-usda-links';
import ref from '@/constants/reference/usda-sr-legacy.json';

const reg = buildRegistry('en-US', 'en-US');
const byId = new Map(Object.values(reg.byBucket).flat().map((i) => [i.id, i]));
const onlyBad = process.argv.includes('--bad');
const f = (n: number) => (Math.round(n * 10) / 10).toString().padStart(6);
for (const l of USDA_LINKS) {
  const id = byId.get(l.key)!;
  const r = (ref as any).foods[String(l.fdcId)];
  const s = l.grams / 100;
  const exp = { kcal: r.per100g.kcal * s, protein: r.per100g.protein * s, fat: r.per100g.fat * s, carbs: r.per100g.carbs * s };
  const db = id.defaultMacro;
  const pct = ((db.kcal - exp.kcal) / Math.max(exp.kcal, 1)) * 100;
  const bad = Math.abs(pct) > 20 && Math.abs(db.kcal - exp.kcal) > 15;
  if (onlyBad && !bad) continue;
  console.log(`${bad ? '✗' : ' '} ${l.key.padEnd(20)} db ${f(db.kcal)} ${f(db.protein)} ${f(db.fat)} ${f(db.carbs)} | usda ${f(exp.kcal)} ${f(exp.protein)} ${f(exp.fat)} ${f(exp.carbs)} | ${pct.toFixed(0).padStart(4)}%  ${r.name.slice(0, 48)}`);
}
