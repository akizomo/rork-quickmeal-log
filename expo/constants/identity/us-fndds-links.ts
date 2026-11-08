/**
 * us-fndds-links.ts — US の一皿料理の既定値と、USDA FNDDS (米国人の食事調査 What We Eat in America で使う
 * 標準食品・標準の1人前の重さ) の突き合わせ表。食材 (us-usda-links.ts) と違い、料理は店・盛りで大きく変わるので、
 * **1点との一致ではなく「小〜大の幅」に収まるか**を見る: DB の kcal が 下端×0.8 〜 上端×1.35 の内側。
 * (上側を広く取るのは、FNDDS の標準の1人前よりチェーンの盛りの方が大きいため)
 *
 * refs … 幅の両端を決める FNDDS の食品と重さ。重さは FNDDS の portion (gram_weight) か、その倍数 (count)。
 * 一次出典: USDA FoodData Central, FNDDS (Survey Foods) 2021-2023 (CSV 2022-10-28 版)。取得: 2026-11-07。
 *   https://fdc.nal.usda.gov/download-datasets (FoodData_Central_survey_food_csv_2022-10-28.zip)
 * 抜粋は constants/reference/fndds.json (再生成: bun scripts/fndds-sync.ts <展開したフォルダ>)。
 */
export interface FnddsRef {
  fdcId: number;
  /** 重さ (g)。FNDDS の portion の gram_weight × count と一致すること */
  grams: number;
  /** 何の重さか (記録用) */
  what: string;
}

export interface FnddsLink {
  key: string;
  /** 幅の下端・上端 (2点以上。最小と最大を使う) */
  refs: FnddsRef[];
  note?: string;
}

export const FNDDS_LINKS: FnddsLink[] = [
  { key: 'us_cheeseburger', refs: [{ fdcId: 2342334, grams: 115, what: 'cheeseburger, 1 small patty' }, { fdcId: 2342354, grams: 210, what: 'cheeseburger, 1 large patty' }] },
  { key: 'us_hamburger', refs: [{ fdcId: 2342366, grams: 90, what: 'hamburger, 1 small patty' }, { fdcId: 2342375, grams: 175, what: 'hamburger, 1 large patty' }] },
  { key: 'us_chicken_sandwich', refs: [{ fdcId: 2342453, grams: 140, what: 'chicken fillet sandwich, fried, regular' }, { fdcId: 2342455, grams: 280, what: 'chicken fillet sandwich, fried, large' }] },
  { key: 'us_grilled_cheese', refs: [{ fdcId: 2341206, grams: 116, what: 'grilled cheese, American' }, { fdcId: 2341208, grams: 116, what: 'grilled cheese, cheddar' }] },
  { key: 'us_pbj', refs: [{ fdcId: 2343037, grams: 60, what: 'PB&J, frozen without crusts' }, { fdcId: 2343030, grams: 112, what: 'PB&J sandwich' }] },
  { key: 'us_wrap', refs: [{ fdcId: 2342462, grams: 161, what: 'chicken fillet wrap, grilled' }, { fdcId: 2342437, grams: 200, what: 'chicken salad wrap' }] },
  { key: 'us_pizza_pepperoni', refs: [{ fdcId: 2344123, grams: 124, what: 'pepperoni pizza thin crust, 2 small pieces (62g×2)' }, { fdcId: 2344123, grams: 182, what: 'pepperoni pizza thin crust, 2 large pieces (91g×2)' }] },
  { key: 'us_mac_cheese', refs: [{ fdcId: 2344296, grams: 230, what: 'macaroni with cheese, 1 cup' }, { fdcId: 2344296, grams: 345, what: '1.5 cups (restaurant)' }], note: '1.5 cup は食堂・外食の盛りの仮定' },
  { key: 'us_lasagna', refs: [{ fdcId: 2344234, grams: 206, what: 'lasagna with meat, 1/6 of 8" square' }, { fdcId: 2344234, grams: 350, what: 'lasagna with meat, restaurant portion (assumed)' }] },
  { key: 'us_tenders_nuggets', refs: [{ fdcId: 2341499, grams: 128, what: 'chicken nuggets (fast food), 8 pieces (16g×8)' }, { fdcId: 2341499, grams: 140, what: '1 cup' }] },
  { key: 'us_wings', refs: [{ fdcId: 2341474, grams: 132, what: 'fried wing from restaurant, 6 drummettes (22g×6)' }, { fdcId: 2341474, grams: 330, what: 'fried wing from restaurant, 6 whole wings (55g×6)' }], note: '6 本の幅が大きい (ドラムだけ vs 手羽全体)' },
  { key: 'us_burrito', refs: [{ fdcId: 2344019, grams: 190, what: 'beef & cheese burrito, small/regular' }, { fdcId: 2344027, grams: 330, what: 'chicken & cheese burrito, large' }] },
  { key: 'us_quesadilla', refs: [{ fdcId: 2344075, grams: 120, what: 'cheese quesadilla, full circle' }, { fdcId: 2344077, grams: 140, what: 'chicken quesadilla, full circle' }] },
  { key: 'us_nachos', refs: [{ fdcId: 2344066, grams: 250, what: 'nachos with beans, 1 order' }, { fdcId: 2344060, grams: 250, what: 'nachos, 1 order' }] },
  { key: 'us_enchiladas', refs: [{ fdcId: 2344049, grams: 300, what: 'enchilada NFS, 2 (150g×2)' }, { fdcId: 2344051, grams: 300, what: 'enchilada pork, 2' }] },
  { key: 'us_fajitas', refs: [{ fdcId: 2344088, grams: 190, what: 'chicken fajita, 2 (95g×2)' }, { fdcId: 2344088, grams: 380, what: 'chicken fajita, 4 (assumed plate)' }] },
  { key: 'us_burrito_bowl', refs: [{ fdcId: 2344045, grams: 270, what: 'burrito bowl chicken with rice' }, { fdcId: 2344040, grams: 225, what: 'burrito bowl beef or pork' }] },
  { key: 'us_soup_creamy', refs: [{ fdcId: 2342606, grams: 248, what: 'clam chowder New England, 1 cup' }, { fdcId: 2342606, grams: 602, what: 'clam chowder New England, 1 can (10.75 oz) prepared' }] },
  { key: 'us_protein_salad', refs: [{ fdcId: 2341636, grams: 208, what: 'chicken salad spread, 1 cup' }, { fdcId: 2342284, grams: 238, what: 'tuna salad with egg, 1 cup' }] },
  { key: 'us_lo_mein_fried_rice', refs: [{ fdcId: 2344282, grams: 400, what: 'lo mein NFS, 2 cups' }, { fdcId: 2344285, grams: 600, what: 'lo mein with pork, 3 cups' }] },
  { key: 'us_pad_thai', refs: [{ fdcId: 2344288, grams: 400, what: 'pad thai NFS, 2 cups' }, { fdcId: 2344292, grams: 600, what: 'pad thai with meat, 3 cups' }] },
  { key: 'us_sushi_roll', refs: [{ fdcId: 2344447, grams: 240, what: 'sushi roll eel, 8 pieces (30g×8)' }, { fdcId: 2344450, grams: 240, what: 'sushi roll tuna, 8 pieces' }] },
  { key: 'us_breakfast_sandwich', refs: [{ fdcId: 2342794, grams: 135, what: 'egg sandwich on croissant, regular' }, { fdcId: 2342803, grams: 185, what: 'egg sandwich on bagel, regular' }] },
];

/** FNDDS に近い料理が無い / 比べる意味が薄いもの (理由つき)。 */
export const FNDDS_UNLINKED: Record<string, string> = {
  us_blt: 'FNDDS の BLT は 105g (home size)。外食の BLT (パン・ベーコン・マヨ) と重さが合わず比べられない',
  us_hot_dog: 'FNDDS の "hot dog" はパンを含まない品目の組み合わせ。パン込みの1本の標準が引けなかった',
  us_deli_sub: 'FNDDS の submarine はツナ/チキンサラダ系 (マヨ入り) のみ。ターキー・ハムの6インチが引けなかった',
  us_pizza_cheese: 'us_pizza_pepperoni と同じ系統 (チーズのみは約 -10%)。単独の照合は省略',
  us_pasta_tomato: 'FNDDS はソースと麺が別品目で、外食の1皿の標準が無い',
  us_pasta_alfredo: '同上',
  us_pasta_meat: '同上 (spaghetti with meat sauce は冷凍ダイエット食のみ)',
  us_fried_chicken: '2ピース (胸 + もも) の標準が FNDDS に無い (胸 1 個 175g=438kcal まで)',
  us_rotisserie_grilled: '1/4 羽の標準が FNDDS に無い (胸 1/4 羽 155g=271kcal / 部位別)',
  us_chicken_and_waffles: 'FNDDS に無い',
  us_tacos: 'FNDDS で見つからなかった (taco の表記ゆれ)',
  us_steak_potato: '複数品目の組み合わせ (ステーキ + ベイクドポテト)。食材側 (us_steak / us_potato) で照合済み',
  us_meatloaf_mash: '複数品目の組み合わせ',
  us_bbq_plate: '複数品目の組み合わせ',
  us_roast_plate: '複数品目の組み合わせ',
  us_pot_pie: 'FNDDS で見つからなかった',
  us_casserole: '種類が広すぎて代表値が引けない (green bean / tuna / hotdish)',
  us_seafood_plate: 'fish & chips の標準が FNDDS で見つからなかった',
  us_chili: 'FNDDS で見つからなかった (chili con carne の表記)',
  us_soup_light: 'FNDDS で見つからなかった (chicken noodle の表記)',
  us_stew_gumbo: '種類が広すぎる (beef stew / gumbo / jambalaya)',
  us_entree_salad: 'ドレッシング・トッピングで大きく変わる (FNDDS は "no dressing")',
  us_grain_bowl: 'FNDDS に無い (chain/restaurant の bowl)',
  us_poke_bowl: 'FNDDS に無い',
  us_chinese_combo: '2品の組み合わせ (オレンジチキン 1 cup=660kcal + チャーハン)。1品ずつの標準は引けたが組み合わせの標準が無い',
  us_teriyaki_bowl: 'FNDDS に無い',
  us_ramen_pho: 'FNDDS で見つからなかった (ramen の表記)',
  us_curry_asian: '種類が広すぎる (thai / indian)',
  us_eggs_bacon: '複数品目の組み合わせ (卵 + ベーコン + トースト)',
  us_pancakes_waffles: 'パンケーキの大きさ (直径 4"〜8") で3枚の kcal が 270〜1270 まで動く。標準の大きさが決められない',
  us_breakfast_burrito: 'FNDDS で見つからなかった',
  us_oatmeal_bowl: '具 (トッピング) の量で決まる。オートミール本体は食材側で照合済み',
  us_avocado_toast: 'FNDDS に無い',
  us_biscuits_gravy: 'FNDDS で見つからなかった',
};
