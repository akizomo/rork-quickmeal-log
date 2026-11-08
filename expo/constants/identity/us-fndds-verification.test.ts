/**
 * US の一皿料理 × USDA FNDDS の機械照合 (食材は us-usda-verification.test.ts)。
 * 1点との一致ではなく「FNDDS の小〜大の幅に収まるか」を見る (下端×0.8 〜 上端×1.35)。
 * 2026-11-07 の初回照合で、寿司巻 (8 切れ) が 500kcal (FNDDS 230〜280kcal の倍近く) だったのを 290kcal に直した。
 */
import ref from '@/constants/reference/fndds.json';

import { buildRegistry } from './index';
import { FNDDS_LINKS, FNDDS_UNLINKED } from './us-fndds-links';

const registry = buildRegistry('en-US', 'en-US');
const dishes = Object.values(registry.byBucket).flat().filter((i) => i.primaryHome.tab === 'dish');
const byId = new Map(dishes.map((i) => [i.id, i]));
const foods = (ref as { foods: Record<string, { name: string; per100g: Record<string, number>; portions: { desc: string; grams: number }[] }> }).foods;

const LOW = 0.8;
const HIGH = 1.35;

/**
 * 幅の外にある料理 (理由つき)。**増やさない・解消したら外す。**
 * どちらも「FNDDS の標準の1人前より、チェーン・レストランの盛りが大きい」ことが理由で、DB の値の誤りとは見ていない。
 */
const KNOWN_DEVIATIONS: Record<string, string> = {
  us_quesadilla: 'DB は大きめ・外食の1枚 (600kcal)。FNDDS の1枚は 120〜140g で 380〜400kcal。外食 (Chili\'s 等) はその倍近くある',
  us_burrito_bowl: 'DB は Chipotle の chicken bowl 基準 (700kcal)。FNDDS の burrito bowl は 225〜270g で 420〜480kcal。Chipotle の盛り (約 500g) は大きい',
};

const kcalRange = (l: (typeof FNDDS_LINKS)[number]) => {
  const kc = l.refs.map((r) => (foods[String(r.fdcId)].per100g.kcal * r.grams) / 100);
  return { lo: Math.min(...kc), hi: Math.max(...kc) };
};

describe('US 料理 × USDA FNDDS — 出典の健全性', () => {
  it('照合表のキーが US の料理 Identity に実在し、重複していない', () => {
    const keys = FNDDS_LINKS.map((l) => l.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    expect(keys.filter((k) => !byId.has(k))).toEqual([]);
  });

  it('fdcId が抜粋 JSON にあり、重さが FNDDS の portion の gram_weight の整数倍と一致する', () => {
    const bad: string[] = [];
    for (const l of FNDDS_LINKS) {
      for (const r of l.refs) {
        const f = foods[String(r.fdcId)];
        if (!f) { bad.push(`${l.key}: fdcId ${r.fdcId} が無い`); continue; }
        // 「(assumed)」と書いたものは通例値。それ以外は portion の整数倍 (1〜8個) と ±3% で一致すること
        if (/assumed|restaurant/.test(r.what)) continue;
        const ok = f.portions.some((p) => [1, 2, 3, 4, 6, 8].some((n) => Math.abs(p.grams * n - r.grams) / r.grams < 0.03));
        if (!ok) bad.push(`${l.key}: ${r.what} ${r.grams}g が portion ${JSON.stringify(f.portions.map((p) => p.grams))} の倍数でない`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('US の料理 Identity は、全て照合表にあるか、照合しない理由が書いてある', () => {
    const linked = new Set(FNDDS_LINKS.map((l) => l.key));
    expect(dishes.map((i) => i.id).filter((id) => !linked.has(id) && !(id in FNDDS_UNLINKED))).toEqual([]);
    expect(Object.keys(FNDDS_UNLINKED).filter((id) => !byId.has(id) || linked.has(id))).toEqual([]);
  });
});

describe('US 料理 × USDA FNDDS — 既定値の幅の照合', () => {
  const outside = FNDDS_LINKS.filter((l) => {
    const { lo, hi } = kcalRange(l);
    const db = byId.get(l.key)!.defaultMacro.kcal;
    return db < lo * LOW || db > hi * HIGH;
  }).map((l) => l.key);

  it('既定の kcal が FNDDS の幅 (下端×0.8 〜 上端×1.35) の外にあるものが、理由つきの凍結リスト以外に無い', () => {
    expect(outside.filter((k) => !(k in KNOWN_DEVIATIONS))).toEqual([]);
  });

  it('凍結リストに、もう幅に収まったものが残っていない (改善の固定)', () => {
    expect(Object.keys(KNOWN_DEVIATIONS).filter((k) => !outside.includes(k))).toEqual([]);
  });
});
