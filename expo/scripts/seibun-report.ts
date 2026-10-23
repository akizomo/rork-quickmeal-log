/**
 * seibun-report.ts — DB と成分表の照合結果を一覧にする。  bun scripts/seibun-report.ts
 */
import { SEIBUN_LINKS } from '@/constants/identity/seibun-links';
import { compareLink, SEIBUN_FOODS , compareDish } from '@/utils/seibun-compare';

// ---- %基準の料理 (チェーン公式との照合) ----
import { DISH_REFERENCES } from '@/constants/identity/dish-references';

const rows = SEIBUN_LINKS.map(compareLink);
for (const r of rows) {
  const f = SEIBUN_FOODS[r.link.foodNo];
  const tag = r.problems.length ? '✗' : '✓';
  const impl = r.impliedGrams !== undefined ? ` 逆算${r.impliedGrams.toFixed(0)}g/単位(仮定${r.link.gramsPerUnit}g)` : '';
  console.log(`${tag} ${r.link.key.padEnd(28)} DB ${r.db.kcal.toFixed(0).padStart(4)}/${r.db.protein.toFixed(1)}/${r.db.fat.toFixed(1)}/${r.db.carbs.toFixed(1)}  成分表 ${r.ref.kcal}/${r.ref.protein}/${r.ref.fat}/${r.ref.carbs} [${f.name}]${impl}`);
  for (const p of r.problems) console.log(`     - ${p}`);
}
console.log(`\n${rows.filter((r) => !r.problems.length).length}/${rows.length} 件が範囲内`);
console.log('\n## 料理 (チェーン公式)');
for (const d of DISH_REFERENCES.map(compareDish)) {
  const f = (k: 'kcal' | 'protein' | 'fat' | 'carbs') => (d.range[k] ? `${d.range[k]![0].toFixed(0)}〜${d.range[k]![1].toFixed(0)}` : '-');
  console.log(`${d.problems.length ? '✗' : '✓'} ${d.ref.key.padEnd(24)} DB ${d.db.kcal.toFixed(0)}/${d.db.protein.toFixed(0)}/${d.db.fat.toFixed(0)}/${d.db.carbs.toFixed(0)}  公式 ${f('kcal')} / ${f('protein')} / ${f('fat')} / ${f('carbs')}`);
  for (const p of d.problems) console.log(`     - ${p}`);
}
