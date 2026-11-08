/**
 * us-usda-links.ts — US 食材の既定値と、USDA FoodData Central (SR Legacy) の突き合わせ表。
 *
 * 日本語版の seibun-links.ts (日本食品標準成分表) と同じ考え方:
 *   「DB の既定値 (defaultMacro) は、既定量 (amount.default) ぶんの合計」なので、USDA の100gあたり値 × 既定量の重さ
 *   と比べる。値の出どころ (fdcId) と重さの根拠を1件ずつ記録し、us-usda-verification.test.ts が機械で検査する。
 *
 * grams     … 既定量の重さ (g)。g 単位の Identity は amount.default、個数・容量の Identity は USDA の portion の重さ
 * weight    … 'portion' = USDA の portion (gram_weight) から取った / 'assumed' = 通例値・換算 (密度 1.0 など)
 * ignore    … 比べない栄養素 (理由は note に書く)
 *
 * 一次出典: USDA FoodData Central, SR Legacy (April 2018)。取得: 2026-11-07。
 *   https://fdc.nal.usda.gov/download-datasets (FoodData_Central_sr_legacy_food_csv_2018-04.zip)
 * 抜粋は constants/reference/usda-sr-legacy.json (再生成: bun scripts/usda-sync.ts <展開した CSV のフォルダ>)。
 */
export type Nutrient = 'kcal' | 'protein' | 'fat' | 'carbs';

export interface UsdaLink {
  /** 'us_identity' (Identity の既定値) */
  key: string;
  fdcId: number;
  grams: number;
  weight: 'portion' | 'assumed';
  ignore?: Nutrient[];
  note?: string;
}

export const USDA_LINKS: UsdaLink[] = [
  { key: 'us_bread', fdcId: 174924, grams: 58, weight: 'portion', note: '食パン2枚 (1枚 29g)' },
  { key: 'us_rice_cup', fdcId: 168878, grams: 186, weight: 'assumed', note: 'DB の既定量 186g (USDA の 1 cup は 158g)' },
  { key: 'us_pasta_plain', fdcId: 169737, grams: 140, weight: 'assumed' },
  { key: 'us_potato', fdcId: 170093, grams: 173, weight: 'portion', note: 'medium potato' },
  { key: 'us_oatmeal', fdcId: 173905, grams: 234, weight: 'portion', note: '1 cup cooked' },
  { key: 'us_tortilla', fdcId: 175037, grams: 48, weight: 'portion' },
  { key: 'us_bagel', fdcId: 174899, grams: 99, weight: 'portion' },
  { key: 'us_cereal', fdcId: 173884, grams: 55, weight: 'assumed', note: 'Cheerios を代表に。シリアルは銘柄で 350〜420kcal/100g' },
  { key: 'us_chicken_breast', fdcId: 171477, grams: 100, weight: 'assumed' },
  { key: 'us_turkey_breast', fdcId: 174516, grams: 100, weight: 'assumed' },
  { key: 'us_white_fish', fdcId: 171956, grams: 100, weight: 'assumed', note: 'Atlantic cod' },
  { key: 'us_shrimp', fdcId: 175180, grams: 100, weight: 'assumed' },
  { key: 'us_canned_tuna', fdcId: 173709, grams: 113, weight: 'assumed', note: '4 oz' },
  { key: 'us_egg', fdcId: 171287, grams: 100, weight: 'portion', note: '卵2個 (large 50g ×2)' },
  { key: 'us_egg_whites', fdcId: 172183, grams: 120, weight: 'assumed' },
  { key: 'us_ground_beef', fdcId: 174032, grams: 100, weight: 'assumed', note: '85% lean patty, broiled' },
  { key: 'us_steak', fdcId: 172165, grams: 170, weight: 'assumed', note: '6 oz。rib eye (separable lean and fat)' },
  { key: 'us_pork_chop', fdcId: 167827, grams: 150, weight: 'assumed', note: 'loin chop (separable lean and fat), broiled' },
  { key: 'us_bacon_strip', fdcId: 168322, grams: 23, weight: 'portion', note: '2 slices (1 slice 11.5g)' },
  { key: 'us_salmon', fdcId: 175168, grams: 150, weight: 'assumed', note: 'Atlantic, farmed, cooked' },
  { key: 'us_milk', fdcId: 171267, grams: 244, weight: 'portion', note: '2% milk, 1 cup' },
  { key: 'us_cheese_slice', fdcId: 170899, grams: 28, weight: 'portion', note: 'cheddar 1 oz slice' },
  { key: 'us_greek_yogurt', fdcId: 170894, grams: 170, weight: 'portion', note: 'nonfat, 1 container' },
  { key: 'us_cottage_cheese', fdcId: 172179, grams: 226, weight: 'portion', note: 'creamed (4%)、1 cup small curd 225g' },
  { key: 'us_tofu_us', fdcId: 172448, grams: 140, weight: 'assumed', note: 'firm (nigari)' },
  { key: 'us_salad_greens', fdcId: 169247, grams: 85, weight: 'assumed', note: 'romaine。ミックスは 20kcal/100g 前後' },
  { key: 'us_broccoli', fdcId: 169967, grams: 100, weight: 'assumed' },
  { key: 'us_beans_legumes', fdcId: 173735, grams: 172, weight: 'portion', note: 'black beans, 1 cup' },
  { key: 'us_corn', fdcId: 169999, grams: 154, weight: 'assumed' },
  { key: 'us_mixed_veg', fdcId: 170472, grams: 182, weight: 'assumed' },
  { key: 'us_banana', fdcId: 173944, grams: 118, weight: 'portion', note: 'medium' },
  { key: 'us_apple', fdcId: 171688, grams: 182, weight: 'portion', note: 'medium (3" dia)' },
  { key: 'us_berries', fdcId: 171711, grams: 100, weight: 'assumed', note: 'blueberries を代表に (strawberries は 32kcal/100g)' },
  { key: 'us_orange', fdcId: 169097, grams: 131, weight: 'portion' },
  { key: 'us_grapes', fdcId: 174683, grams: 92, weight: 'assumed' },
  { key: 'us_melon', fdcId: 169092, grams: 160, weight: 'portion', note: 'cantaloupe 1 cup cubes' },
  { key: 'us_butter', fdcId: 173410, grams: 14, weight: 'portion', note: '1 tbsp 14.2g' },
  { key: 'us_olive_oil', fdcId: 171413, grams: 13.5, weight: 'portion', note: '1 tbsp 13.5g' },
  { key: 'us_mayo_tbsp', fdcId: 171009, grams: 14, weight: 'portion', note: '1 tbsp 13.8g' },
  { key: 'us_ranch_tbsp', fdcId: 173592, grams: 15, weight: 'portion' },
  { key: 'us_peanut_butter', fdcId: 174266, grams: 32, weight: 'portion', note: '2 tbsp' },
  { key: 'us_nuts_mixed', fdcId: 168599, grams: 28, weight: 'portion', note: '1 oz' },
  { key: 'us_chips', fdcId: 169677, grams: 28, weight: 'portion', note: '1 oz' },
  { key: 'us_cookies', fdcId: 172716, grams: 43, weight: 'assumed', note: '市販の大きめのクッキー2枚 (1枚 約21g) と仮定。USDA の portion は 12.9g/枚で小さい' },
  { key: 'us_ice_cream', fdcId: 167575, grams: 132, weight: 'portion', note: '1 cup = 132g (1/2 cup 66g の2倍)' },
  { key: 'us_soda', fdcId: 174852, grams: 370, weight: 'portion', note: 'cola, 12 fl oz can' },
  { key: 'us_crackers_snack', fdcId: 174982, grams: 30, weight: 'assumed' },
  { key: 'us_energy_drink', fdcId: 173210, grams: 492, weight: 'portion', note: 'Red Bull 16 fl oz' },
  { key: 'us_sweet_tea', fdcId: 171888, grams: 365, weight: 'assumed', note: 'lemon, sweetened RTD。12 fl oz ≒ 365g' },
  { key: 'us_beer', fdcId: 168746, grams: 356, weight: 'portion', note: '12 fl oz can' },
  { key: 'us_wine', fdcId: 173190, grams: 147, weight: 'portion', note: 'red, 5 fl oz' },
  { key: 'us_hard_seltzer', fdcId: 168749, grams: 354, weight: 'assumed', note: 'light beer を代用 (ハードセルツァーは銘柄の表示値 約100kcal/12oz)' },
  // ---- 2026-11-07 ④で足した食品 (既定の種類。他の種類は USDA の値から係数を計算して作った) ----
  { key: 'us_pastry', fdcId: 174987, grams: 57, weight: 'portion', note: 'croissant (medium)。donut / muffin / danish は us/ingredients.ts の種類のコメントに fdcId' },
  { key: 'us_dessert', fdcId: 174944, grams: 100, weight: 'assumed', note: 'cake slice 100g (チョコフロスティング)。cheesecake / pie / brownie は種類のコメントに fdcId' },
  { key: 'us_juice', fdcId: 169098, grams: 248, weight: 'portion', note: 'orange juice, 1 cup' },
  { key: 'us_dip_spread', fdcId: 174289, grams: 30, weight: 'portion', note: 'hummus 2 tbsp (guacamole は avocado からの仮定値)' },
  { key: 'us_fruit_other', fdcId: 169124, grams: 150, weight: 'assumed', note: 'pineapple 150g。mango / peach / pear / kiwi / cherries / plum は種類のコメントに fdcId' },
];

/** 照合しない US 食材とその理由 (一覧にして見落としを防ぐ)。 */
export const USDA_UNLINKED: Record<string, string> = {
  us_sausage: '1本の重さが種類で大きく違う (朝食用リンク 23g と イタリアン 87g)。種類ごとの照合が要る',
  us_plant_milk: 'オーツ・アーモンド・豆乳の代表値。アーモンド無糖は 15kcal/100g、オーツは 50 前後で、1つの出典で代表できない',
  us_protein_bar: '銘柄の表示値 (Quest 系 200kcal 前後)。USDA の汎用値は無い',
  us_coffee_drink: 'チェーンの飲料 (Starbucks 等) の表示値。USDA の汎用値は無い',
  us_smoothie: 'チェーンの飲料の表示値。USDA の汎用値は無い',
  us_cocktail: '酒の種類と量で大きく変わる。代表値の根拠は未取得',
};
