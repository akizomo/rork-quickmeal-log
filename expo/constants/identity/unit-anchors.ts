/**
 * unit-anchors.ts — 「1個あたり / 100gあたり / 1食あたり」の外部アンカー (DB監査の物差し)。
 *
 * 目的: DB の数値を**自分自身と比べる**テスト (PFC↔kcal の整合など) では、基準量の取り違えを
 * 検出できない。「ソーセージ2枚」「2個=72kcal の卵 (defaultMacro は1個分なのに既定量が2個)」は
 * どちらも内部では矛盾せず、**外側の常識** (卵1個は約75kcal) と比べて初めて見つかる。
 * その常識をここに明示的な表として持ち、db-invariants.test.ts が全件を突き合わせる。
 *
 * 範囲は「2倍・3倍の取り違えを捕まえる」ための**ゆるい帯**であり、正確な値ではない。
 * 狭めすぎると、日本食品標準成分表の個体差・メーカー差で誤検知する。
 *
 * ⚠ 値は一般的な食品の目安 (記憶ベース)。**一次出典との照合は seibun-links.ts / external-checks.ts で別に行う** (docs/MACRO_SOURCES.md)。このアンカーは照合できない領域 (%基準の料理) の物差しとして残す。
 *   照合したら note に出典を書き、範囲を締めてよい。範囲外の項目を見つけたら、アンカーを
 *   緩めるのではなく、まず DB 側 (defaultMacro / factor / amount) を疑うこと。
 *
 * 比べる量 (Identity/種類ごとの実効 amount spec から決まる):
 *   g / ml            … 100g (ml) あたりの kcal
 *   piece/plate/slice/cut … 1単位あたりの kcal
 *   percent / serving … 既定量 (1食) の kcal そのもの
 */
export interface UnitAnchor {
  /** 'identity' または 'identity/attribute'。種類を持つ Identity は種類まで指定する。 */
  key: string;
  /** 比べる kcal の許容範囲 [下限, 上限] (単位は上記)。 */
  kcal: [number, number];
  /** 数える単位の期待ラベル (個/枚/本…)。省略時は検査しない。 */
  unitLabel?: string;
  note?: string;
}

export const JP_ANCHORS: UnitAnchor[] = [
  // ---- 1個・1枚・1本あたり ----
  { key: 'onigiri/plain_ume', kcal: [150, 230], unitLabel: '個', note: 'コンビニおにぎり 1個 ≈ 170-190' },
  { key: 'onigiri/salmon', kcal: [160, 240], unitLabel: '個' },
  { key: 'onigiri/tuna_mayo', kcal: [200, 300], unitLabel: '個' },
  { key: 'bread/bagel', kcal: [200, 320], unitLabel: '個' },
  { key: 'bread/naan', kcal: [200, 330], unitLabel: '枚' },
  { key: 'bread_rich/croissant', kcal: [170, 270], unitLabel: '個' },
  { key: 'mochi/mochi', kcal: [90, 140], unitLabel: '個', note: '切り餅1個 50g ≈ 117' },
  { key: 'egg/whole', kcal: [60, 95], unitLabel: '個', note: 'Mサイズ 1個 ≈ 75-80' },
  { key: 'ham', kcal: [15, 35], unitLabel: '枚' },
  { key: 'bacon_sausage/bacon', kcal: [30, 80], unitLabel: '枚' },
  { key: 'bacon_sausage/sausage', kcal: [50, 110], unitLabel: '本' },
  { key: 'bacon_sausage/wiener', kcal: [45, 75], unitLabel: '本', note: 'ウインナー 321kcal/100g × 1本 15-20g' },
  { key: 'ichigo', kcal: [3, 8], unitLabel: '粒' },
  { key: 'apple_pear', kcal: [110, 170] },
  { key: 'citrus', kcal: [35, 80] },
  { key: 'pudding/custard', kcal: [90, 160] },
  { key: 'ice', kcal: [150, 300] },
  { key: 'sweet_bread', kcal: [250, 420] },
  { key: 'sushi_plate', kcal: [80, 160], unitLabel: '皿', note: '回転寿司 1皿 = 2貫 ≈ 100-130' },
  { key: 'sushi_piece', kcal: [45, 85], unitLabel: '貫' },
  { key: 'maki/maki_thin', kcal: [130, 240], unitLabel: '本' },
  { key: 'maki/maki_thick', kcal: [40, 100], unitLabel: '切' },
  { key: 'maki/inari', kcal: [90, 160], unitLabel: '個' },
  { key: 'maki/temaki', kcal: [120, 230] },
  { key: 'cold_sand/egg', kcal: [250, 450] },
  { key: 'hot_dog_pita/corn_dog', kcal: [250, 400] },
  { key: 'burrito_taco/burrito', kcal: [400, 650] },
  { key: 'fried_main/nugget', kcal: [35, 65], unitLabel: '個', note: 'マックナゲット5個 ≈ 263' },
  { key: 'fried_main/fried_chicken', kcal: [190, 260], unitLabel: 'ピース', note: 'ケンタッキー 1ピース ≈ 218-237' },
  { key: 'fried_main/ebi_fry', kcal: [60, 110], unitLabel: '本' },
  { key: 'fried_main/tonkatsu', kcal: [350, 600], unitLabel: '枚', note: 'ロースかつ 1枚 150g ≈ 450-550' },
  { key: 'fried_main/tonkatsu_hire', kcal: [250, 450], unitLabel: '枚' },
  { key: 'fried_main/menchi', kcal: [200, 350], unitLabel: '個', note: 'メンチカツ 1個 90-100g ≈ 250-300' },
  { key: 'fried_main/korokke', kcal: [120, 220], unitLabel: '個', note: 'コロッケ 1個 ≈ 150-180' },
  { key: 'yakitori', kcal: [50, 100], unitLabel: '本' },
  { key: 'tenshin/gyoza', kcal: [35, 65], unitLabel: '個' },
  { key: 'tenshin/shumai', kcal: [30, 55], unitLabel: '個' },
  { key: 'tenshin/harumaki', kcal: [100, 180], unitLabel: '本' },
  { key: 'tenshin/xiaolongbao', kcal: [30, 70], unitLabel: '個' },
  { key: 'fresh_roll', kcal: [50, 90], unitLabel: '本' },
  { key: 'okonomi/okonomiyaki', kcal: [450, 800], unitLabel: '枚' },
  { key: 'tenshin/nikuman', kcal: [150, 330], unitLabel: '個', note: 'コンビニ肉まん 1個 ≈ 220-250' },
  { key: 'tenshin/anman', kcal: [200, 360], unitLabel: '個', note: 'あんまん 1個 ≈ 270-290' },
  { key: 'gyudon_class/unadon', kcal: [600, 850], note: 'うな重 ≈ 650-750' },
  { key: 'okonomi/takoyaki', kcal: [40, 70], unitLabel: '個', note: 'たこ焼き 1個 ≈ 45-55 (8個で約400)' },

  // ---- 100g (ml) あたり ----
  { key: 'rice/white', kcal: [140, 180], note: '炊飯後 156' },
  { key: 'noodle_udon/udon', kcal: [90, 120], note: 'ゆで 105' },
  { key: 'noodle_pasta/regular', kcal: [330, 380], note: '乾麺 重量 (80g)' },
  { key: 'chicken_lean/no_skin', kcal: [95, 125] },
  { key: 'chicken_thigh/with_skin', kcal: [180, 250] },
  { key: 'beef_pork/beef', kcal: [200, 260] },
  { key: 'beef_pork/minced', kcal: [190, 260], note: '豚ひき 209 / 牛ひき 251' },
  { key: 'chicken_thigh/minced', kcal: [150, 200], note: '鶏ひき 171' },
  { key: 'beef_pork_fatty/bara', kcal: [330, 420] },
  { key: 'fatty_fish/salmon', kcal: [170, 270] },
  { key: 'milk/plain', kcal: [55, 75] },
  { key: 'cheese/slice', kcal: [300, 400] },
  { key: 'butter_cream/butter', kcal: [700, 780] },
  { key: 'oil', kcal: [700, 900] },
  { key: 'mayo', kcal: [600, 730] },
  { key: 'nuts/plain', kcal: [560, 680] },
  { key: 'chocolate/plain', kcal: [520, 600] },
  { key: 'potato', kcal: [60, 95] },
  { key: 'sweet_potato', kcal: [110, 150] },
  { key: 'salad_raw', kcal: [15, 40] },
  { key: 'veg_dense/broccoli', kcal: [25, 50] },
  { key: 'oatmeal', kcal: [330, 400] },
  { key: 'cereal/granola', kcal: [400, 600] },
  { key: 'alcohol/beer', kcal: [35, 45] },
  { key: 'alcohol/sake', kcal: [95, 115] },
  { key: 'alcohol/wine', kcal: [60, 80] },
  { key: 'fried_main/karaage_momo', kcal: [250, 350] },
  { key: 'fried_main/fries', kcal: [240, 320] },
  { key: 'meat_solo/steak', kcal: [230, 330] },
  { key: 'meat_solo/shogayaki', kcal: [250, 400], note: '豚ロース生姜焼き ≈ 300-330/100g' },

  // ---- 1食あたり (percent / serving) ----
  { key: 'gyudon_class/gyudon', kcal: [550, 800] },
  { key: 'curry_class/curry', kcal: [600, 900] },
  { key: 'ramen_light/shoyu', kcal: [450, 650] },
  { key: 'ramen_heavy/tonkotsu', kcal: [600, 900] },
  { key: 'tsukemen/tsukemen', kcal: [750, 1100] },
  { key: 'pasta_cream', kcal: [650, 900] },
  { key: 'katsudon_tendon/katsudon', kcal: [750, 1000] },
  { key: 'udon/kake', kcal: [250, 400], note: 'ゆで麺270g+つゆ ≒ 300。はなまる かけ(1玉) 273〜292' },
  { key: 'soba/kake', kcal: [350, 500] },
  { key: 'teishoku/yakizakana', kcal: [450, 750], note: '吉野家公式 478-622 (dish-references.ts で照合済み)' },
  { key: 'bento/makunouchi', kcal: [600, 800] },
  { key: 'burger/beef', kcal: [300, 450] },
  { key: 'burger_big/standard', kcal: [550, 850] },
  { key: 'soup/miso_light', kcal: [25, 60] },
  { key: 'fried_rice_omurice/chahan', kcal: [600, 850] },
  { key: 'bibimbap/bibimbap', kcal: [550, 750] },
];

export const US_ANCHORS: UnitAnchor[] = [
  { key: 'us_egg/scrambled', kcal: [60, 95], note: '卵1個 ≈ 72 (USDA large egg)。defaultMacro は1個分、既定量は2個' },
  { key: 'us_bacon_strip/regular', kcal: [35, 60], note: 'USDA cooked bacon 1 slice (8g) ≈ 43' },
  { key: 'us_bread/white', kcal: [60, 110] },
  { key: 'us_bagel/plain', kcal: [230, 330] },
  { key: 'us_tortilla/flour', kcal: [100, 200] },
  { key: 'us_cheese_slice/cheddar', kcal: [80, 130] },
  { key: 'us_banana', kcal: [90, 130] },
  { key: 'us_apple', kcal: [80, 130] },
  { key: 'us_orange', kcal: [50, 90] },
  { key: 'us_cookies/chocolate_chip', kcal: [70, 170] },
  { key: 'us_chicken_breast/grilled', kcal: [150, 185] },
  { key: 'us_ground_beef/regular', kcal: [220, 290] },
];
