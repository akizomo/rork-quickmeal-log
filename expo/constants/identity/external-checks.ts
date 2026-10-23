/**
 * external-checks.ts — 成分表に無い食品 (チェーンの商品・US 食材) の、公式値・USDA との照合。
 *
 * 成分表 (seibun-links.ts) と同じ仕組みで、**値の出どころを1件ずつ記録**して突き合わせる。
 * 値は取得日時点のもの (公式は改定される)。取得できなかった出典は「未取得」として docs/MACRO_SOURCES.md に書く。
 */
import type { SeibunLink } from './seibun-links';

export interface ExternalCheck {
  link: SeibunLink;
  /** 出典の100gあたりの値 (g 基準でないものは、その単位ぶんの値 = 1食の値) */
  ref: { kcal: number; protein: number; fat: number; carbs: number };
  /** 出典の種類 */
  source: 'mcdonalds-jp' | 'usda-fdc' | 'yoshinoya';
  url: string;
  retrievedAt: string;
  /** 出典側の食品名 (記録用) */
  sourceName: string;
}

export const EXTERNAL_CHECKS: ExternalCheck[] = [
  {
    // 公式の栄養成分は「5ピース 1食あたり」。DB の既定量 (5個) と同じ単位なので、1食ぶんで直接比べる。
    link: { key: 'fried_main/nugget', foodNo: '-', food: 'チキンマックナゲット 5ピース', weight: 'known', note: '公式は5ピース1食の値。重さの代わりに「1個=1単位」で比べる (100個あたりに換算)' },
    ref: { kcal: 262 * 20, protein: 15.3 * 20, fat: 15.9 * 20, carbs: 14.4 * 20 }, // 5ピースの値 ×20 = 100ピースあたり
    source: 'mcdonalds-jp',
    url: 'https://www.mcdonalds.co.jp/products/1610/',
    retrievedAt: '2026-10-22',
    sourceName: 'チキンマックナゲット 5ピース (262kcal/P15.3/F15.9/C14.4 per 5ピース)',
  },
  {
    // 吉野家公式 (2026年10月8日現在) お子様セットのトッピング「ウィンナー 2本」: 86kcal/P3.2/F6.1/C4.4。
    // 炭水化物 4.4g はケチャップ等の味付けぶん。2本=2単位で比べる (100本あたりに換算)。
    link: { key: 'bacon_sausage/wiener', foodNo: '-', food: 'ウィンナー 2本', weight: 'known', ignore: ['carbs'], note: '炭水化物 4.4g は味付け (ケチャップ等) を含む可能性があり、公式に内訳が無いので比べない' },
    ref: { kcal: 86 * 50, protein: 3.2 * 50, fat: 6.1 * 50, carbs: 4.4 * 50 },
    source: 'yoshinoya',
    url: 'https://www.yoshinoya.com/pdf/allergy/',
    retrievedAt: '2026-10-22',
    sourceName: 'ウィンナー 2本 (86kcal/P3.2/F6.1/C4.4)',
  },
  {
    // USDA SR Legacy 171287 Egg, whole, raw, fresh: 143kcal/P12.6/F9.51/C0.72 per 100g。1個=50g (可食部)。
    // 国内の成分表 (12004 鶏卵 全卵 生: 142/12.2/10.2/0.4) とも一致する = 国内外の2系統で確認できた。
    link: { key: 'us_egg/scrambled', foodNo: '-', food: 'Egg, whole, raw, fresh', gramsPerUnit: 50, weight: 'known' },
    ref: { kcal: 143, protein: 12.6, fat: 9.51, carbs: 0.72 },
    source: 'usda-fdc',
    url: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171287/nutrients',
    retrievedAt: '2026-10-22',
    sourceName: 'Egg, whole, raw, fresh (SR Legacy 171287)',
  },
  {
    // USDA 168322 Pork, cured, bacon, pre-sliced, cooked, pan-fried: 468kcal/P33.9/F35.1/C1.7 per 100g。
    // 1枚の重さは取得できなかった (1枚 ≒ 8g は通例値) ので組成だけ照合する。
    link: { key: 'us_bacon_strip/regular', foodNo: '-', food: 'Pork, cured, bacon, pre-sliced, cooked, pan-fried', gramsPerUnit: 8, weight: 'assumed', note: '1 strip ≒ 8g (通例値・未取得)' },
    ref: { kcal: 468, protein: 33.9, fat: 35.1, carbs: 1.7 },
    source: 'usda-fdc',
    url: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/168322/nutrients',
    retrievedAt: '2026-10-22',
    sourceName: 'Pork, cured, bacon, pre-sliced, cooked, pan-fried (SR Legacy 168322)',
  },
];
