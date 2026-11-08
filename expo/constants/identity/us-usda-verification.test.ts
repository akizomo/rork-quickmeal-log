/**
 * US 食材の既定値と USDA FoodData Central (SR Legacy) の機械照合 (日本語版: seibun-verification.test.ts)。
 *
 * 内部の整合 (PFC と kcal の関係) だけでは、**基準量の取り違え** (ステーキ 6 oz = 170g の既定量に 100g ぶんの値が入っていた)
 * が見えない。2026-11-07 の初回照合で、US 食材 9件がこの種の食い違い (-17〜-50%) だった。
 * 出典・重さの根拠は us-usda-links.ts、抜粋は constants/reference/usda-sr-legacy.json。
 */
import ref from '@/constants/reference/usda-sr-legacy.json';

import { buildRegistry } from './index';
import { USDA_LINKS, USDA_UNLINKED, type Nutrient } from './us-usda-links';

const registry = buildRegistry('en-US', 'en-US');
const ingredients = Object.values(registry.byBucket).flat().filter((i) => i.primaryHome.tab === 'ingredient');
const byId = new Map(ingredients.map((i) => [i.id, i]));
const foods = (ref as { foods: Record<string, { name: string; per100g: Record<Nutrient, number>; portions: { desc: string; grams: number }[] }> }).foods;

function expected(l: (typeof USDA_LINKS)[number]): Record<Nutrient, number> {
  const f = foods[String(l.fdcId)];
  const s = l.grams / 100;
  return { kcal: f.per100g.kcal * s, protein: f.per100g.protein * s, fat: f.per100g.fat * s, carbs: f.per100g.carbs * s };
}

/** 既定量の kcal の許容: 20% かつ 15kcal を超えて外れたら食い違い。 */
const KCAL_TOL = { pct: 0.2, abs: 15 };
/** P/F/C の許容: 30% かつ 4g を超えて外れたら食い違い。 */
const MACRO_TOL = { pct: 0.3, abs: 4 };

describe('US 食材 × USDA SR Legacy — 出典の健全性', () => {
  it('照合表のキーが US の食材 Identity に実在し、重複していない', () => {
    const keys = USDA_LINKS.map((l) => l.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    expect(keys.filter((k) => !byId.has(k))).toEqual([]);
  });

  it('fdcId が抜粋 JSON にある', () => {
    expect(USDA_LINKS.filter((l) => !foods[String(l.fdcId)]).map((l) => l.key)).toEqual([]);
  });

  it('重さの根拠が portion のものは、USDA の portion の重さ (の整数倍) と一致する', () => {
    const bad: string[] = [];
    for (const l of USDA_LINKS.filter((x) => x.weight === 'portion')) {
      const portions = foods[String(l.fdcId)].portions.map((p) => p.grams).filter((g) => g > 0);
      const ok = portions.some((g) => [0.5, 1, 2, 3, 4].some((n) => Math.abs(g * n - l.grams) / l.grams < 0.03));
      if (!ok) bad.push(`${l.key}: ${l.grams}g が portion ${JSON.stringify(portions)} のどれの倍数でもない`);
    }
    expect(bad).toEqual([]);
  });

  it('US の食材 Identity は、全て照合表にあるか、照合しない理由が書いてある', () => {
    const linked = new Set(USDA_LINKS.map((l) => l.key));
    const missing = ingredients.map((i) => i.id).filter((id) => !linked.has(id) && !(id in USDA_UNLINKED));
    expect(missing).toEqual([]);
    expect(Object.keys(USDA_UNLINKED).filter((id) => !byId.has(id) || linked.has(id))).toEqual([]);
  });
});

describe('US 食材 × USDA SR Legacy — 既定値の照合', () => {
  it('既定量ぶんの kcal が USDA の値 (100g あたり × 重さ) から外れていない', () => {
    const bad: string[] = [];
    for (const l of USDA_LINKS) {
      if (l.ignore?.includes('kcal')) continue;
      const exp = expected(l).kcal;
      const db = byId.get(l.key)!.defaultMacro.kcal;
      if (Math.abs(db - exp) > Math.max(exp * KCAL_TOL.pct, KCAL_TOL.abs)) {
        bad.push(`${l.key}: DB ${db}kcal / USDA ${exp.toFixed(0)}kcal (${l.grams}g, ${foods[String(l.fdcId)].name})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('既定量ぶんの P/F/C が USDA の値から外れていない', () => {
    const bad: string[] = [];
    for (const l of USDA_LINKS) {
      const exp = expected(l);
      const db = byId.get(l.key)!.defaultMacro;
      for (const n of ['protein', 'fat', 'carbs'] as const) {
        if (l.ignore?.includes(n)) continue;
        if (Math.abs(db[n] - exp[n]) > Math.max(exp[n] * MACRO_TOL.pct, MACRO_TOL.abs)) {
          bad.push(`${l.key}.${n}: DB ${db[n]}g / USDA ${exp[n].toFixed(1)}g`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
