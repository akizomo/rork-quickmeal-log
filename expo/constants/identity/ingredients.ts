/**
 * Ingredient-tab Identity definitions (食材タブ — 66 Identities across 9 buckets).
 *
 * Spec: docs/IA-identity-spec.md §2.1, §3 (migrations), §5 (add-ons), §6 (amount)
 *
 * Convention:
 *   - Each Identity carries `defaultMacro` matching one default-amount serving
 *     (= AmountSpec.default × unit).
 *   - Attribute factors are multiplicative on the default macro.
 *   - Style factors are multiplicative as well; "special" styles carry inline
 *     `migration` references to other buckets.
 *   - `defaultAddonIds` / `allowedAddonIds` use IDs from
 *     `addons.ts` and from cross-bucket Identity references (Identity流用).
 */

import { Identity, NutritionNoteSource } from '@/types/identity';

// 豆知識の出典 (§10.14 追補-1: UI に表示する前提で持つ)。
// 採用階層は公的機関・大学の公衆衛生機関・系統的レビューまで (§10.14 追補-3)。

/** 栄養素の「働き」の記述元。国が定型文を定めているためオーバークレームにならない。 */
const SRC_CAA: NutritionNoteSource = {
  label: '消費者庁 食品表示基準（栄養機能食品）',
  url: 'https://www.caa.go.jp/policies/policy/food_labeling/foods_with_nutrient_function_claims',
};

// ---------------------------------------------------------------------------
// 豆知識の補強出典 (alsoSources)。方針: docs/US-food-db-design.md §10.14 追補 (2026-09-29)・照合記録: docs/NUTRITION_NOTES_SOURCES.md
// 2系統以上で照合できたノートだけが UI に出る (utils/weekly-recap.ts の pickNutritionNote)。
// ---------------------------------------------------------------------------

/** 成分表 (八訂 増補2023) の個別食品ページ。100gあたりの実測値。 */
const seibun = (label: string, itemNo: string): NutritionNoteSource => ({
  label: `文部科学省 日本食品標準成分表（八訂）増補2023 ${label}`,
  url: `https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=${itemNo}`,
});

const harvard = (label: string, path: string): NutritionNoteSource => ({
  label: `ハーバード公衆衛生大学院 The Nutrition Source（${label}）`,
  url: `https://nutritionsource.hsph.harvard.edu/${path}`,
});
const H_IRON = harvard('鉄', 'iron/');
const H_VITK = harvard('ビタミンK', 'vitamin-k/');
const H_VITC = harvard('ビタミンC', 'vitamin-c/');
const H_VITA = harvard('ビタミンA', 'vitamin-a/');
const H_VITE = harvard('ビタミンE', 'vitamin-e/');
const H_CALCIUM = harvard('カルシウム', 'calcium/');
const H_POTASSIUM = harvard('カリウム', 'potassium/');
const H_AVOCADO = harvard('アボカド', 'avocados/');

/** 加工肉の定義 (塩漬け・燻製などで風味や保存性を高めた肉。例: ハム・ソーセージ・ジャーキー)。 */
const SRC_WHO_PROCESSED_MEAT: NutritionNoteSource = {
  label: 'WHO 赤肉・加工肉の発がん性に関するQ&A',
  url: 'https://who.int/news-room/questions-and-answers/item/cancer-carcinogenicity-of-the-consumption-of-red-meat-and-processed-meat',
};

/** 鶏むね肉(皮なし,生) たんぱく質22.5g・脂質2.62g / 鶏皮のみ(生) 脂質32.4g (USDA SR Legacy)。 */
const SRC_USDA_CHICKEN: NutritionNoteSource = {
  label: '米国農務省 USDA FoodData Central（鶏むね肉・鶏皮）',
  url: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171077/nutrients',
};

/** 卵のDIAAS: ゆで卵110〜135%(年齢の基準による)、FAOの「優れた品質」は100以上。 */
const SRC_EGG_DIAAS_2024: NutritionNoteSource = {
  label: 'Journal of Nutritional Science 2024（卵のたんぱく質品質 DIAAS）',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11658930/',
};

/** 卵たんぱくのDIAAS 101±11.7 (17種のたんぱく質源の比較)。 */
const SRC_EGG_DIAAS_2020: NutritionNoteSource = {
  label: 'Food Science & Nutrition 2020（たんぱく質源のDIAAS比較）',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7590266/',
};

/** 調理法別のビタミン保持率 (10種の野菜。ビタミンCはゆでるのが最も低い)。 */
const SRC_COOKING_VITAMINS: NutritionNoteSource = {
  label: 'Food Science and Biotechnology 2017（調理法とビタミン保持率）',
  url: 'https://doi.org/10.1007/s10068-017-0281-1',
};

/** 組成・含有量の記述元。 */
const SRC_SEIBUN: NutritionNoteSource = {
  label: '文部科学省 日本食品標準成分表',
  url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/',
};

// ---------------------------------------------------------------------------
// Bucket 1: ごはんパン麺 (staple) — 13 Identity
// ---------------------------------------------------------------------------

const BUCKET_STAPLE: Identity[] = [
  {
    id: 'rice',
    label: 'ごはん',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 234, protein: 3.8, fat: 0.5, carbs: 56 },
    nutritionNotes: [
      { text: 'ごはんは、脳や体を動かすエネルギー源になる糖質が主成分です。', source: SRC_SEIBUN },
    ],
    amount: {
      unit: 'g',
      default: 150, step: 10,
      chips: [
        { label: '小', value: 100 },
        { label: '普通', value: 150 },
        { label: '大', value: 220 },
      ],
    },
    attributes: [
      { key: 'white', label: '白米', isDefault: true },
      { key: 'brown', label: '玄米', factor: { kcal: 1.06, fat: 3.0 } },
      { key: 'mixed', label: '雑穀', factor: { kcal: 1.03 } },
    ],
    styles: [
      { key: 'plain', label: 'そのまま', isDefault: true },
      {
        key: 'donburi',
        label: '丼に',
        // 牛丼系は牛丼/親子丼/ねぎとろ丼/中華丼/麻婆丼で macro・addon が大きく異なるため、
        // 既定値に固定せずどんぶりシートを開いてユーザーに選ばせる。
        migration: { bucketKey: 'rice_dish', identityKey: 'gyudon_class', openTargetSheet: true },
      },
      {
        key: 'curry_pour',
        label: 'カレーかけ',
        migration: { bucketKey: 'curry', identityKey: 'curry_class', confirmMessage: 'カレーライスとして記録します' },
      },
      {
        key: 'nabe_yaki',
        label: '雑炊・鍋焼き',
        migration: { bucketKey: 'misc_dish', identityKey: 'nabe', attributeKey: 'yose', confirmMessage: '雑炊として記録します' },
      },
    ],
    defaultAddonIds: ['natto', 'egg', 'kimchi_top', 'salmon_flake', 'mentaiko', 'nori_furikake'],
    allowedAddonIds: [
      'natto', 'egg', 'kimchi_top', 'salmon_flake', 'mentaiko', 'nori_furikake',
      'butter_cream', 'shirasu', 'katsuobushi',
    ], // cheese / rayu は白米には不自然なので除外
    searchTags: ['ごはん', 'ご飯', '白米', 'はくまい', '玄米', 'げんまい', '米', 'こめ', '赤飯', 'せきはん'],
  },
  {
    id: 'onigiri',
    label: 'おにぎり',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 175, protein: 2.8, fat: 0.5, carbs: 38 },
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'plain_ume', label: '塩・梅', isDefault: true },
      { key: 'salmon', label: '鮭', factor: { kcal: 1.11, protein: 1.96, fat: 3 } },
      { key: 'tuna_mayo', label: 'ツナマヨ', factor: { kcal: 1.34, protein: 1.79, fat: 17, carbs: 0.84 } },
      { key: 'okaka_kombu', label: 'おかか・昆布', factor: { kcal: 1.03, protein: 1.07 } },
    ],
  },
  {
    id: 'okayu',
    label: 'おかゆ・雑炊',
    searchTags: ['おかゆ', 'ぞうすい', 'かゆ'],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 140, protein: 2.4, fat: 0.3, carbs: 33 },
    nutritionNotes: [
      { text: 'おかゆは水分が多い分、同じ一杯でもごはんより糖質は控えめになります。', source: SRC_SEIBUN },
    ],
    amount: {
      unit: 'g',
      default: 200, step: 10,
      chips: [
        { label: '普通', value: 200 },
        { label: '大盛', value: 280 },
      ],
    },
    defaultAddonIds: ['egg', 'kimchi_top', 'salmon_flake'],
    allowedAddonIds: ['egg', 'kimchi_top', 'salmon_flake', 'nori_furikake'],
  },
  {
    id: 'bread',
    label: 'パン',
    // 「トースト」系は Style にしない: 焼いても1枚あたりの kcal はほぼ動かず、マクロの段差が
    // 無い (IA spec §1.5 分割軸)。ガーリックトーストは 食パン + バター (butter_cream は
    // default Add-on の先頭) で表現できるため、語彙で着地させるだけで Identity/Style は足さない。
    searchTags: [
      'トースト', 'しょくぱん', 'ガーリックトースト', 'ガーリックブレッド', 'ガーリックパン',
      'バタートースト', 'ジャムトースト',
    ],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    quickTapDisabled: true, // Attribute span too wide (食パン 158 → ナン 320, F 2.5 → 11)
    defaultMacro: { kcal: 158, protein: 5.3, fat: 2.5, carbs: 28 },
    amount: {
      unit: 'g',
      default: 60, step: 10,
      chips: [
        { label: '1枚', value: 60 },
        { label: '2枚', value: 120 },
      ], // ナンは attribute amount override で piece 単位に切り替えるため chip 不要
    },
    attributes: [
      { key: 'plain', label: '食パン', isDefault: true },
      { key: 'whole', label: '全粒・ライ麦', factor: { fat: 1.2 } },
      { key: 'baguette', label: 'フランスパン', factor: { kcal: 1.06, protein: 1.06, fat: 0.32, carbs: 1.23 }, searchTags: ['バゲット', 'ガーリックバゲット'] },
      // ベーグルは1個単位で扱うのが自然。factor は 60g 食パン基準のスケール済み値。
      {
        key: 'bagel',
        label: 'ベーグル',
        factor: { kcal: 1.5, protein: 1.7, carbs: 1.6 },
        amount: { unit: 'piece', default: 1, unitLabel: '個', chips: [{ label: '1個', value: 1 }, { label: '2個', value: 2 }] },
      },
      // ナンも1枚単位。factor は食パン 60g 基準のスケール済み値。
      {
        key: 'naan',
        label: 'ナン',
        factor: { kcal: 1.7, protein: 1.5, fat: 1.4, carbs: 1.5 },
        amount: { unit: 'piece', default: 1, unitLabel: '枚', step: 0.5, chips: [{ label: '1/2枚', value: 0.5 }, { label: '1枚', value: 1 }] },
      },
    ],
    styles: [
      { key: 'plain', label: 'そのまま', isDefault: true },
      {
        key: 'sandwich',
        label: 'サンドに',
        migration: { bucketKey: 'sandwich', identityKey: 'cold_sand', confirmMessage: 'サンドとして記録します' },
      },
    ],
    defaultAddonIds: ['butter_cream', 'jam', 'honey', 'peanut_butter', 'cheese', 'avocado'],
    allowedAddonIds: [
      'butter_cream', 'jam', 'honey', 'peanut_butter', 'maple_syrup',
      'cheese', 'avocado', 'egg', 'ham', 'bacon_sausage', 'canned_lean_fish',
    ],
  },
  // bread_rich (クロワッサン/デニッシュ) は次に出てくる
  {
    id: 'bread_rich',
    label: 'パン (リッチ)',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 200, protein: 3.8, fat: 11, carbs: 21 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '1個', value: 1 }, { label: '2個', value: 2 }] },
    attributes: [
      { key: 'croissant', label: 'クロワッサン', isDefault: true },
      { key: 'danish', label: 'デニッシュ', factor: { kcal: 1.10, fat: 1.18, carbs: 1.14 } },
    ],
    defaultAddonIds: ['jam', 'honey', 'butter_cream'],
    allowedAddonIds: ['jam', 'honey', 'butter_cream', 'maple_syrup', 'peanut_butter', 'cheese'],
  },
  {
    id: 'oatmeal',
    label: 'オートミール',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 105, protein: 4, fat: 2, carbs: 20 },
    amount: { unit: 'g', default: 30, step: 10, chips: [{ label: '30', value: 30 }, { label: '50', value: 50 }] },
    defaultAddonIds: ['honey', 'granola_top', 'berry_top', 'banana_slice', 'milk', 'nuts'],
    allowedAddonIds: [
      'honey', 'maple_syrup', 'jam', 'granola_top', 'berry_top', 'banana_slice',
      'nuts', 'peanut_butter', 'milk', 'kinako', 'avocado',
    ], // cheese は除外 (savory oatmeal は少数派)
  },
  {
    id: 'cereal',
    label: 'シリアル',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 134, protein: 3, fat: 1.5, carbs: 30 },
    amount: { unit: 'g', default: 40, step: 10, chips: [{ label: '30', value: 30 }, { label: '40', value: 40 }, { label: '50', value: 50 }] },
    attributes: [
      { key: 'plain', label: 'プレーン', isDefault: true },
      { key: 'granola', label: 'グラノーラ', factor: { kcal: 1.7, fat: 5.3, carbs: 1.2 } },
      { key: 'sweet', label: '加糖', factor: { kcal: 1.05, carbs: 1.1 } },
    ],
    defaultAddonIds: ['milk', 'berry_top', 'banana_slice', 'honey'],
    allowedAddonIds: ['milk', 'berry_top', 'banana_slice', 'honey', 'granola_top'],
  },
  {
    id: 'mochi',
    label: '餅・団子',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    // 基準: 切り餅プレーン 1個≒50g (117kcal/P2/F0.3/C25)。
    // 種類で餅/団子を選び、団子のトッピング(みたらし・あんこ等)は addon で足す。
    defaultMacro: { kcal: 117, protein: 2, fat: 0.3, carbs: 25 },
    nutritionNotes: [
      { text: '餅は水分が少ない分、同じ重さのごはんよりエネルギーが高くなります。見た目の量より多めに入ります。', source: SRC_SEIBUN },
    ],
    referenceDescription: '切り餅1個≒50g / 団子は串1本(3個)が目安。たれ・あんこはトッピングで追加',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      // 餅は Identity 既定 (きなこ/はちみつ/海苔) をそのまま使う
      { key: 'mochi', label: '餅', isDefault: true },
      // 白玉・上新粉団子(プレーン)は餅よりやや水分が多く軽め。
      // 団子はみたらし・あんこが定番なのでトッピングを差し替える。
      {
        key: 'dango',
        label: '団子',
        factor: { kcal: 0.85, carbs: 0.86 },
        defaultAddonIds: ['mitarashi_tare', 'anko', 'kinako'],
      },
    ],
    defaultAddonIds: ['kinako', 'honey', 'nori_furikake'],
    allowedAddonIds: ['kinako', 'honey', 'nori_furikake', 'butter_cream', 'mitarashi_tare', 'anko'],
    searchTags: ['餅', '団子', 'みたらし', 'あんこ', '串団子', 'だんご'],
  },
  {
    id: 'potato',
    label: 'じゃがいも・里芋',
    // かぼちゃもここに着地させる。温野菜 (35kcal/C7) とは kcal 2.2倍・C 3倍の段差が
    // あるのに対し、かぼちゃ (78/1.9/0.3/20.6) は本 Identity (76/1.9/0.1/17) とほぼ
    // 同値で、同じ「でんぷん質の野菜」群に入る。選択肢は増やさず具体名は
    // referenceDescription に置く (IA spec §1.5「分割の軸はマクロの段差」)。
    searchTags: ['さといも', '里芋', 'ポテト', 'じゃがいも', 'ジャガイモ', '馬鈴薯', 'ながいも', '長芋', 'やまいも', '山芋', 'かぼちゃ', '南瓜'],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    referenceDescription: 'じゃがいも・里芋・長芋・かぼちゃなど、でんぷん質の多い野菜',
    defaultMacro: { kcal: 76, protein: 1.9, fat: 0.1, carbs: 17 },
    nutritionNotes: [
      {
        text: 'じゃがいもや里芋に含まれるビタミンCは、皮膚や粘膜の健康維持を助けるとともに、抗酸化作用を持つ栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITC],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 70 }, { label: '1個', value: 100 }, { label: '大', value: 180 }] },
    styles: [
      { key: 'plain', label: '蒸し・茹で', isDefault: true },
      { key: 'baked', label: '焼き', factor: { kcal: 1.11, carbs: 1.17 } },
      // マッシュ自体のkcalは茹でと同等 (factor省略=1.0)。バター・牛乳分は
      // defaultAddonIds の butter_cream で別計上する (ingredient全体で共通)。
      { key: 'mashed', label: 'マッシュ', searchTags: ['つぶし', 'マッシュポテト'] },
      {
        key: 'fried',
        label: '揚げ',
        migration: { bucketKey: 'misc_dish', identityKey: 'fried_main', attributeKey: 'fries', confirmMessage: 'フライドポテトとして記録します' },
      },
      {
        key: 'salad_mayo',
        label: 'ポテトサラダ',
        migration: { bucketKey: 'veggies', identityKey: 'side_creamy', confirmMessage: 'ポテトサラダとして記録します' },
      },
    ],
    defaultAddonIds: ['butter_cream', 'cheese', 'mayo'],
    allowedAddonIds: ['butter_cream', 'cheese', 'mayo', 'bacon_sausage'],
  },
  {
    id: 'sweet_potato',
    label: 'さつまいも',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 130, protein: 1.2, fat: 0.2, carbs: 32 },
    nutritionNotes: [
      { text: 'さつまいもの食物繊維は、便通に関わる成分です。いも類のなかでも多く含みます。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 70 }, { label: '100', value: 100 }, { label: '大', value: 200 }] },
    styles: [
      { key: 'plain', label: '蒸し・茹で', isDefault: true },
      { key: 'baked', label: '焼き', factor: { kcal: 1.25, carbs: 1.27 } },
      {
        key: 'syrup_baked',
        label: '焼き蜜・揚げ蜜',
        migration: { bucketKey: 'snack_drink', identityKey: 'wagashi', confirmMessage: '焼き芋・大学いもとして記録します' },
      },
    ],
    defaultAddonIds: ['butter_cream', 'honey'],
    allowedAddonIds: ['butter_cream', 'honey', 'kinako'],
    searchTags: ['さつまいも', '薩摩芋', 'さつま芋', 'やきいも', '焼き芋'],
  },
  {
    id: 'noodle_udon',
    label: 'うどん・蕎麦',
    searchTags: ['そば'],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 210, protein: 5.2, fat: 0.8, carbs: 43 }, // 茹でうどん 200g
    amount: {
      unit: 'g',
      default: 200, step: 10,
      chips: [
        { label: '1玉', value: 200 },
        { label: '大盛', value: 280 },
      ],
    },
    attributes: [
      { key: 'udon', label: 'うどん', isDefault: true },
      { key: 'soba', label: '蕎麦', factor: { kcal: 1.26, protein: 1.85, fat: 1.25, carbs: 1.21 } },
    ],
  },
  {
    id: 'noodle_pasta',
    label: 'パスタ麺',
    searchTags: ['パスタ', 'スパゲティ', 'すぱげてぃ'],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 284, protein: 10.2, fat: 1.4, carbs: 59 }, // 乾燥パスタ 80g
    amount: {
      unit: 'g',
      default: 80, step: 10,
      chips: [
        { label: '60g', value: 60 },
        { label: '80g', value: 80 },
        { label: '100g', value: 100 },
      ],
    },
    attributes: [
      { key: 'regular', label: '普通', isDefault: true },
      { key: 'whole', label: '全粒粉', factor: { kcal: 0.97, protein: 1.1, fat: 1.5, carbs: 0.92 } },
    ],
  },
  {
    id: 'noodle_ramen',
    label: '中華麺',
    searchTags: ['ちゅうかめん', 'ラーメン', 'らーめん'],
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 203, protein: 6.4, fat: 0.6, carbs: 42 }, // 茹で中華麺 120g
    amount: {
      unit: 'g',
      default: 120, step: 10,
      chips: [
        { label: '1玉', value: 120 },
        { label: '大盛', value: 180 },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Bucket 2: 肉魚(低脂肪) (lean_protein) — 8 Identity
// ---------------------------------------------------------------------------

const BUCKET_LEAN_PROTEIN: Identity[] = [
  {
    id: 'chicken_lean',
    label: '鶏むね・ささみ',
    searchTags: ['とりむね', '鶏むね', '鶏むね肉', 'むねにく', '胸肉', 'ささみ', 'とりささみ', '鶏ささみ', 'ささ身'],
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 105, protein: 23, fat: 1.5, carbs: 0 },
    nutritionNotes: [
      {
        text: '鶏むね（皮なし）は、たんぱく質が多く脂質が控えめな食材です。成分表では100gあたり、たんぱく質24.4g・脂質1.9gです（米国USDAでは22.5g・2.62g）。',
        source: seibun('鶏むね（皮なし）', '11_11214_7'),
        alsoSources: [SRC_USDA_CHICKEN],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'no_skin', label: '皮なし', isDefault: true },
      // 八訂「若どり むね 皮つき 生」100g = 133kcal/P21.3/F5.9 基準 (皮なし 105/23/1.5 比)。
      // 旧値 (kcal 1.4 / fat 6.5) は F が 9.75g になり八訂比で約65%過大で、
      // PFC 逆算 180kcal に対し記録 147kcal と -23% 乖離していた。
      { key: 'with_skin', label: '皮あり', factor: { kcal: 1.267, protein: 0.926, fat: 3.933 } },
    ],
    styles: [
      { key: 'raw', label: '生' },
      { key: 'light', label: 'あっさり', isDefault: true },
      { key: 'oil', label: '油あり', factor: { kcal: 1.2, fat: 1.6 } },
      {
        key: 'fried',
        label: '揚げ',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'karaage_mune',
          confirmMessage: '唐揚げ(むね)として記録します',
        },
      },
    ],
  },
  {
    id: 'salad_chicken',
    label: 'サラダチキン',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 110, protein: 25, fat: 1.7, carbs: 0.5 },
    amount: { unit: 'piece', default: 1, unitLabel: 'パック' },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 55, protein: 12, fat: 0.7, carbs: 0.2 },
      defaultLabel: 'サラダチキン (刻み)',
    },
    defaultAddonIds: ['dressing'], // mayo はユーザー指摘で除外
    allowedAddonIds: ['dressing', 'mayo'],
  },
  {
    id: 'white_fish',
    label: '白身魚・赤身魚',
    searchTags: ['しろみざかな', '白身魚', 'あかみざかな', '赤身魚', 'たら', '鱈', 'かれい', '鰈', 'まぐろ', '鮪', 'ひらめ', '鮃', 'たい', '鯛'],
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: default 80g→100g 化 (modal-set 1食量を chicken_lean/red_meat と揃える)
    // base = タラ・カレイ・ヒラメ等の白身魚。マグロ赤身は attribute で分岐。
    defaultMacro: { kcal: 75, protein: 16, fat: 0.7, carbs: 0 },
    nutritionNotes: [
      { text: '赤身の魚は、泳ぎ続けるために酸素をたくわえる色素たんぱく質を多く持ち、そのぶん赤血球をつくるのに必要な鉄も多く含みます。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '1切', value: 80 }, { label: '1食', value: 100 }, { label: '2切', value: 160 }] },
    attributes: [
      { key: 'white', label: '白身魚（タラ・カレイ等）', isDefault: true },
      { key: 'tuna_red', label: 'マグロ赤身', factor: { kcal: 1.67, protein: 1.65, fat: 2.0 } },
    ],
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      // 「焼き魚」の検索は fatty_fish の[焼き]に寄せる。こちらのラベルは「あっさり」
      // で、検索結果に出ても何を選んだのか分からないため tag は付けない。
      { key: 'light', label: 'あっさり', factor: { kcal: 1.1 } },
      { key: 'oil', label: '油あり', factor: { kcal: 1.3, fat: 4 } },
      // 白身魚の醤油煮つけ。煮汁の内訳は fatty_fish の同名 Style と同じ。
      {
        key: 'nizuke',
        label: '煮つけ',
        macroDelta: { kcal: 45, protein: 1.5, fat: 0.5, carbs: 8.5 },
        searchTags: ['にざかな', '煮魚', 'につけ', '煮つけ'],
      },
      {
        key: 'breaded_fried',
        label: 'フライに',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'fish_fry',
          confirmMessage: '魚介揚げとして記録します',
        },
      },
    ],
  },
  {
    id: 'seafood_lean',
    label: 'イカ・タコ・エビ・貝',
    searchTags: ['いか', '烏賊', 'たこ', '蛸', 'えび', '海老', 'かい', '貝', 'ほたて', '帆立', 'あさり', '浅蜊', 'かに', '蟹'],
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: default 80g→100g 化 (modal-set 1食量を chicken_lean/red_meat と揃える)
    defaultMacro: { kcal: 88, protein: 17.5, fat: 0.8, carbs: 1 },
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '80', value: 80 }, { label: '1食', value: 100 }, { label: '150', value: 150 }] },
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      { key: 'light', label: 'あっさり' },
      { key: 'oil', label: '油あり', factor: { kcal: 1.3, fat: 4 } },
      {
        key: 'breaded_fried',
        label: 'フライに',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'ebi_fry',
          confirmMessage: 'エビフライ等として記録します',
        },
      },
    ],
  },
  {
    id: 'red_meat',
    label: '赤身肉 (牛・豚)',
    searchTags: ['あかみにく', '赤身肉', 'ぎゅうにく', '牛肉', 'ぶたにく', '豚肉', 'ももにく', 'もも肉', 'ぎゅうもも', '牛もも肉', 'ぶたひれ', '豚ヒレ肉', 'ひれにく', 'ヒレ肉'],
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: Attribute 部位分岐追加。default は もも・ヒレ (純赤身、modal-set median 寄り)。
    // 旧 default 135/21/5 (牛もも基準) → 新 130/22/4 (牛豚もも・ヒレ平均)。
    defaultMacro: { kcal: 130, protein: 22, fat: 4, carbs: 0 },
    nutritionNotes: [
      {
        text: '赤身肉に含まれる鉄は、赤血球をつくるのに必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_IRON],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'momo_hire', label: 'もも・ヒレ', isDefault: true },
      // 牛もも 138 / 豚もも 119 / 牛豚ヒレ 117-130 → 平均130/F4
      { key: 'shoulder_loin', label: '肩ロース・ロース赤身', factor: { kcal: 1.15, fat: 1.7 } },
      // → 150 / P22 / F6.8 / 0 (牛肩ロース赤身 152/F8.6 寄り)
    ],
    styles: [
      { key: 'light', label: 'あっさり', isDefault: true },
      { key: 'oil', label: '油あり', factor: { kcal: 1.2, fat: 1.6 } },
    ],
  },
  {
    id: 'canned_lean_fish',
    label: 'ツナ缶',
    searchTags: ['つな', 'つなかん', 'ツナ'],
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 50, protein: 11, fat: 0.5, carbs: 0.1 },
    nutritionNotes: [
      { text: 'ツナ缶は、油漬けか水煮かで脂質が大きく変わります。同じ「ツナ」でも選ぶ缶で結果が変わります。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'piece', default: 1, unitLabel: '缶', chips: [{ label: '半缶', value: 0.5 }, { label: '1缶', value: 1 }, { label: '2缶', value: 2 }] },
    attributes: [
      { key: 'water', label: '水煮', isDefault: true },
      {
        key: 'oil_soaked',
        label: '油漬',
        // Migration to fatty side
        migration: { bucketKey: 'fatty_protein', identityKey: 'canned_fatty_fish' },
      },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 35,
      addedMacro: { kcal: 25, protein: 5.5, fat: 0.3, carbs: 0.05 },
      defaultLabel: 'ツナ',
    },
    defaultAddonIds: ['mayo'], // ツナマヨ定番
    allowedAddonIds: ['mayo'],
  },
  {
    id: 'protein_drink',
    label: 'プロテイン',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // 基準: ザバス ミルクプロテイン脂肪0 (200ml) ≒ 100kcal/P15/F0/C10
    // 自販機・コンビニで最量販の主力製品を 1食=100% の基準にする。
    defaultMacro: { kcal: 100, protein: 15, fat: 0, carbs: 10 },
    // 量はザバスのたんぱく質量バリエーションを基準に選ぶ (基準=P15 200ml)。
    // P20≒135%, P30≒200% で全マクロを比例スケール。
    // chip ラベルは「P○○(容量目安)」形式で直感的に分かるよう表示。
    amount: { unit: 'percent', default: 100, chips: [{ label: 'P15 (200ml)', value: 100 }, { label: 'P20 (270ml)', value: 135 }, { label: 'P30 (400ml)', value: 200 }] },
    attributes: [
      { key: 'commercial_drink', label: 'ドリンク市販', isDefault: true },
      // パウダー系は**脂質が 0 のまま記録されていた**。base (ザバス脂肪0) が F:0 の
      // ため factor では加算できず、書きようが無かった (PFC逆算と +20〜36% 乖離)。
      // macroDelta で実際の脂質を足す。
      // 水割り = プロテインパウダー約27g (100kcal/P20/F1.5/C2) 相当。
      { key: 'powder_water', label: 'パウダー水割り', factor: { kcal: 1.02, protein: 1.33, carbs: 0.2 }, macroDelta: { kcal: 0, protein: 0, fat: 1.5, carbs: 0 } },
      // 牛乳割り = 上記パウダー + 牛乳200ml (122kcal/P6.6/F7.6/C9.6)。F 9.1g は両者の合計。
      { key: 'powder_milk', label: 'パウダー牛乳割り', factor: { kcal: 2.3, protein: 1.773, carbs: 1.16 }, macroDelta: { kcal: 0, protein: 0, fat: 9.1, carbs: 0 } },
    ],
    searchableFrom: ['snack_drink', 'dairy_soy'],
    searchTags: ['プロテイン', 'シェイク', 'ドリンク', 'ホエイ', 'ソイ', 'ザバス'],
  },
  {
    id: 'jerky',
    label: 'ジャーキー類',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 85, protein: 15, fat: 2, carbs: 3.5 },
    nutritionNotes: [
      {
        text: 'ジャーキーは、水分を抜き、塩で味つけ・保存した加工肉です。成分表では100gあたり、たんぱく質54.8g・食塩相当量4.8gで、生の牛かた肉（16.5g・0.1g）よりどちらも濃くなっています。',
        source: seibun('ビーフジャーキー', '11_11107_7'),
        alsoSources: [SRC_WHO_PROCESSED_MEAT],
      },
    ],
    amount: { unit: 'g', default: 30, step: 10, chips: [{ label: '20', value: 20 }, { label: '30', value: 30 }, { label: '50', value: 50 }] },
    searchTags: ['ビーフジャーキー', 'さきいか', 'あたりめ'],
  },
  {
    id: 'liver',
    label: 'レバー',
    // 脂質3.5g/100gは同バケットのred_meat(赤身肉, F4g/100g)より低く、fatty_proteinではなくlean_protein相当
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 130, protein: 20, fat: 3.5, carbs: 2.5 },
    nutritionNotes: [
      {
        text: 'レバーは、赤血球をつくる鉄と、夜間の視力の維持に関わるビタミンAが際立って多い食材です。成分表では鶏レバー100gに、鉄9.0mg・ビタミンA14,000μgRAEが含まれます。',
        source: seibun('鶏レバー', '11_11232_7'),
        alsoSources: [H_IRON, H_VITA],
      },
      {
        text: 'レバーに多いビタミンAは、夜間の視力の維持を助けるとともに、皮膚や粘膜の健康維持を助ける栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITA],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }] },
  },
];

// ---------------------------------------------------------------------------
// Bucket 3: 卵 (egg) — 1 Identity
// ---------------------------------------------------------------------------

const BUCKET_EGG: Identity[] = [
  {
    id: 'egg',
    label: '卵',
    // 「卵」「玉子」の漢字が無く、玉子 がサンドイッチの具に誤着地していた。
    searchTags: ['たまご', '卵', '玉子', 'ゆでたまご', 'ゆで卵', 'たまごやき', '卵焼き', 'めだまやき', '目玉焼き', 'なまたまご', '生卵'],
    primaryHome: { tab: 'ingredient', bucket: 'egg' },
    defaultMacro: { kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 },
    nutritionNotes: [
      {
        text: '卵のたんぱく質は、FAOの評価法（DIAAS）で最上位の「優れた品質」（100以上）に分類されます。ゆで卵は年齢の基準により110〜135%、卵たんぱくは101%という報告があります。',
        source: SRC_EGG_DIAAS_2024,
        alsoSources: [SRC_EGG_DIAAS_2020],
      },
    ],
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'whole', label: '全卵', isDefault: true },
      { key: 'white', label: '卵白', factor: { kcal: 0.23, protein: 0.6, fat: 0 } },
      { key: 'yolk', label: '卵黄', factor: { kcal: 0.73, protein: 0.45, fat: 0.96 } },
    ],
    styles: [
      { key: 'raw', label: '生', isDefault: true },
      { key: 'boiled', label: 'ゆで', factor: { kcal: 1.04 } },
      { key: 'fried', label: '目玉焼き', factor: { kcal: 1.33, fat: 1.44 } },
      { key: 'omelet', label: '卵焼き・スクランブル', factor: { kcal: 1.47, fat: 1.54, carbs: 7.5 } },
      { key: 'chawan', label: '茶碗蒸し', factor: { kcal: 1.07, protein: 0.97, fat: 0.96, carbs: 15 } },
    ],
    asAddon: {
      unit: 'piece',
      unitAmount: 1,
      addedMacro: { kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.3 },
      defaultLabel: '卵',
    },
  },
];

// ---------------------------------------------------------------------------
// Bucket 4: 脂あり肉魚 (fatty_protein) — 9 Identity
// ---------------------------------------------------------------------------

const BUCKET_FATTY_PROTEIN: Identity[] = [
  // v1.2: chicken_thigh を bucket先頭 (=default) に変更。modal-set内 F median (F14g)。
  // 旧 default の beef_pork (F16.5g) は modal-set 内 F最大寄りで、短押し時の F誤差を縮める。
  // 旧 chicken_thigh の quickTapDisabled は削除 (modal-set default として短押し対象に)。
  // 皮なし派は長押しで attribute 変更 → silent migration が走る。
  {
    id: 'chicken_thigh',
    label: '鶏もも・手羽',
    searchTags: ['とりもも', '鶏もも', '鶏もも肉', 'ももにく', 'てば', '手羽', 'てばさき', '手羽先', 'とりかわ', '鶏皮'],
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 200, protein: 17, fat: 14, carbs: 0 },
    nutritionNotes: [
      {
        text: '鶏の脂質は皮に集まっています。成分表では、むね肉100gの脂質は皮つきが17.2g、皮なしが1.9gです。米国USDAでも、皮のみは32.4g、皮なしのむね肉は2.62gです。',
        source: seibun('鶏むね（皮つき）', '11_11213_7'),
        alsoSources: [SRC_USDA_CHICKEN],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '1枚', value: 250 }] },
    attributes: [
      { key: 'with_skin', label: '皮あり', isDefault: true },
      {
        key: 'no_skin',
        label: '皮なし',
        // Silent migration to lean_protein
        migration: { bucketKey: 'lean_protein', identityKey: 'chicken_lean' },
      },
    ],
    styles: [
      { key: 'light', label: 'あっさり', isDefault: true },
      { key: 'oil', label: '油あり', factor: { kcal: 1.18, fat: 1.5 } },
      {
        key: 'fried',
        label: '揚げ',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'karaage_momo',
          confirmMessage: '唐揚げ(もも)として記録します',
        },
      },
    ],
  },
  {
    id: 'beef_pork',
    label: '牛・豚 (普通脂)',
    searchTags: ['ぎゅうにく', 'ぶたにく', 'とんかつ', 'めんちかつ'],
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 230, protein: 17.5, fat: 16.5, carbs: 0 },
    nutritionNotes: [
      { text: '牛肉や豚肉の鉄(ヘム鉄)は、野菜や大豆の鉄(非ヘム鉄)より吸収されやすい形をしています。組み合わせを気にせず、そのままとれるのが特徴です。', source: SRC_SEIBUN },
      {
        text: '牛肉や豚肉に含まれる鉄は、赤血球をつくるのに必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_IRON],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'beef', label: '牛（ロース・もも等）', isDefault: true },
      { key: 'pork', label: '豚（ロース・肩ロース等）', factor: { kcal: 0.96, protein: 1.03, fat: 0.91 } },
    ],
    styles: [
      { key: 'light', label: 'あっさり', isDefault: true },
      { key: 'oil', label: '油あり', factor: { kcal: 1.18, fat: 1.5 } },
      {
        key: 'breaded_fried_pork',
        label: 'とんかつに',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'tonkatsu',
          confirmMessage: 'とんかつとして記録します',
        },
      },
      {
        key: 'breaded_fried_beef',
        label: 'メンチカツに',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'menchi',
          confirmMessage: 'メンチカツとして記録します',
        },
      },
    ],
  },
  {
    id: 'beef_pork_fatty',
    label: '牛・豚 (高脂)',
    searchTags: ['ばらにく', 'バラ肉', 'ぶたばら', '豚バラ', '豚バラ肉', 'ぎゅうばら', '牛バラ', '牛バラ肉', 'さーろいん', 'ほるもん', 'ホルモン'],
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    quickTapDisabled: true, // Attribute バラ/サーロイン/ホルモン/タン: kcal 220-470, F 17-46
    defaultMacro: { kcal: 380, protein: 16, fat: 35, carbs: 0 },
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'bara', label: 'バラ（豚）', isDefault: true },
      { key: 'bara_beef', label: 'バラ（牛）', factor: { kcal: 1.24, protein: 0.69, fat: 1.31 } },
      { key: 'sirloin', label: 'サーロイン', factor: { kcal: 0.84, fat: 0.8 } },
      { key: 'horumon', label: 'ホルモン', factor: { kcal: 0.58, protein: 0.94, fat: 0.49 } },
      { key: 'tan', label: 'タン', factor: { kcal: 0.71, protein: 0.95, fat: 0.57 } },
    ],
  },
  {
    id: 'fatty_fish',
    label: '脂魚',
    searchTags: ['あぶらざかな', '脂魚', 'さけ', '鮭', 'しゃけ', 'さば', '鯖', 'さんま', '秋刀魚', 'ぶり', '鰤', 'いわし', '鰯', 'うなぎ', '鰻', 'あじ', '鯵'],
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    quickTapDisabled: true, // Attribute 鮭/サバ/ぶり/さんま/いわし/うなぎ: kcal 130-290, F 9-24
    defaultMacro: { kcal: 200, protein: 20, fat: 12, carbs: 0 },
    nutritionNotes: [
      { text: '鮭などの脂がのった魚に含まれる不飽和脂肪酸は、常温でも固まりにくく、肉の脂(飽和脂肪酸)とは性質が違います。', source: SRC_SEIBUN },
      { text: '脂がのった魚に多いn-3系脂肪酸は、皮膚の健康維持を助ける栄養素です。', source: SRC_CAA },
    ],
    amount: { unit: 'g', default: 80, step: 10, chips: [{ label: '1切', value: 80 }, { label: '100', value: 100 }, { label: '2切', value: 160 }] },
    attributes: [
      { key: 'salmon', label: '鮭', isDefault: true },
      { key: 'saba', label: 'サバ', factor: { kcal: 1.0, fat: 1.17 } },
      { key: 'buri', label: 'ぶり', factor: { kcal: 1.1, fat: 1.25 } },
      { key: 'sanma', label: 'さんま', factor: { kcal: 1.45, protein: 0.73, fat: 2.0 } },
      { key: 'iwashi', label: 'いわし', factor: { kcal: 0.81, fat: 0.83 } },
      // 蒲焼のたれの糖質は macroDelta で足す。旧実装は `carbs: 999` を factor に
      // 置いていたが、factor は乗算なのでベース carbs: 0 に対して 0×999=0 となり
      // **C が丸ごと欠落していた** (コメントの "C handled separately" は実在せず、
      // unagi はこの1箇所にしか出現しない)。C 2.5g は八訂 うなぎ蒲焼 3.1g/100g の
      // 既定量80g換算。kcal/P/F の校正値そのものは既存のまま据え置く。
      { key: 'unagi', label: 'うなぎ蒲焼', factor: { kcal: 1.45, fat: 1.75 }, macroDelta: { kcal: 0, protein: 0, fat: 0, carbs: 2.5 }, searchTags: ['うなぎ', 'かばやき', '蒲焼'] },
    ],
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      { key: 'grilled', label: '焼き', factor: { kcal: 1.1 }, searchTags: ['やきざかな', '焼き魚', 'やきさかな'] },
      // 煮汁 (砂糖4g+みりん6g+醤油12g、味噌煮なら味噌8g) の平均値を加算。
      // 生魚は carbs: 0 なので factor では表現できず macroDelta を使う。
      // 内訳の整合: P1.5×4 + F0.5×9 + C8.5×4 = 44.5 ≒ kcal 45。
      {
        key: 'nizuke',
        label: '煮つけ・味噌煮',
        macroDelta: { kcal: 45, protein: 1.5, fat: 0.5, carbs: 8.5 },
        // 「ぶりだいこん」(ひらがな) は入れない。クエリ「だいこん」が部分一致して
        // 大根を脂魚に着地させてしまうため。漢字形なら「だいこん」とは一致しない。
        searchTags: ['にざかな', '煮魚', 'につけ', '煮つけ', 'さばのみそに', 'さばの味噌煮', 'さばみそ', 'みそに', '味噌煮', 'ぶり大根'],
      },
    ],
  },
  {
    id: 'canned_fatty_fish',
    label: '缶詰魚 (脂魚)',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 280, protein: 28, fat: 16, carbs: 0.5 },
    nutritionNotes: [
      { text: '魚の缶詰は加圧加熱で骨まで柔らかくなるため、骨ごと食べられます。生の切り身では残す部分がそのままとれます。', source: SRC_SEIBUN },
      {
        text: '骨ごと食べられる魚の缶詰でとれるカルシウムは、骨や歯の形成に必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_CALCIUM],
      },
    ],
    referenceDescription: 'さば缶・いわし缶など。コンビニ個食サイズ(100〜150g)が目安。190g大缶は量を調整',
    amount: { unit: 'piece', default: 1, chips: [{ label: '半缶', value: 0.5 }, { label: '1缶', value: 1 }] },
    attributes: [
      { key: 'water', label: '水煮', isDefault: true },
      // さば味噌煮缶 150g ≒ 315kcal/P24/F19.5/C10 基準。旧値は味噌だれの C が
      // 3.5g にしかならず (実際は約10g)、PFC 逆算と +16% 乖離していた。
      // 水煮より魚の比率が下がるぶん P は減る。
      { key: 'miso', label: '味噌煮', factor: { kcal: 1.125, protein: 0.857, fat: 1.219, carbs: 20 } },
      { key: 'oil', label: '油漬', factor: { kcal: 1.3, fat: 1.5 } },
    ],
    searchableFrom: ['lean_protein'],
    searchTags: ['鯖缶', 'さば缶', 'いわし缶', '缶詰'],
  },
  {
    id: 'ham',
    label: 'ハム',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 40, protein: 5, fat: 2.5, carbs: 1 },
    nutritionNotes: [
      {
        text: 'ハムやベーコンなどの加工肉は、塩漬けや燻製などで風味や保存性を高めた肉です。成分表では、ロースハム100gに食塩相当量2.3g、ばらベーコンに2.6gが含まれます。',
        source: seibun('ロースハム', '11_11176_7'),
        alsoSources: [SRC_WHO_PROCESSED_MEAT],
      },
    ],
    amount: { unit: 'piece', default: 2, unitLabel: '枚', chips: [{ label: '2枚', value: 2 }, { label: '4枚', value: 4 }] },
    asAddon: {
      unit: 'piece',
      unitAmount: 2,
      addedMacro: { kcal: 40, protein: 5, fat: 2.5, carbs: 1 },
      defaultLabel: 'ハム',
    },
  },
  {
    id: 'bacon_sausage',
    label: 'ベーコン・ソーセージ',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 100, protein: 5, fat: 9, carbs: 0.5 },
    nutritionNotes: [
      {
        text: 'ベーコンやソーセージは、脂質と塩分をあわせて含みます。成分表では100gあたり、ばらベーコンが脂質19.4g・食塩相当量2.6g、ウインナーが脂質30.6g・食塩相当量1.9gです。',
        source: seibun('ばらベーコン', '11_11183_7'),
        alsoSources: [SRC_WHO_PROCESSED_MEAT],
      },
    ],
    amount: { unit: 'piece', default: 2, unitLabel: '枚', chips: [{ label: '2枚', value: 2 }, { label: '1パック', value: 5 }] },
    attributes: [
      { key: 'bacon', label: 'ベーコン', isDefault: true },
      { key: 'sausage', label: 'ソーセージ', factor: { kcal: 1.5, protein: 1.4, fat: 1.33 } },
      { key: 'wiener', label: 'ウインナー', factor: { kcal: 0.8, protein: 0.8, fat: 0.83 } },
    ],
    asAddon: {
      unit: 'piece',
      unitAmount: 1,
      addedMacro: { kcal: 40, protein: 2, fat: 3.5, carbs: 0.2 },
      defaultLabel: 'ベーコン',
    },
  },
  {
    id: 'protein_bar',
    label: 'プロテインバー',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    // 基準: P15相当のバー(160kcal/P15/F5/C15)を100%とし、protein_drinkと同様タンパク質量ベースでスケール
    defaultMacro: { kcal: 160, protein: 15, fat: 5, carbs: 15 },
    amount: { unit: 'percent', default: 100, chips: [{ label: 'P10', value: 67 }, { label: 'P15', value: 100 }, { label: 'P20', value: 133 }] },
    searchableFrom: ['snack_drink'],
    searchTags: ['プロテイン', 'バー', '一本満足'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 5: 乳・大豆 (dairy_soy) — 9 Identity
// ---------------------------------------------------------------------------

const BUCKET_DAIRY_SOY: Identity[] = [
  {
    id: 'milk',
    label: '牛乳',
    searchTags: ['ぎゅうにゅう', 'ミルク'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 134, protein: 6.6, fat: 7.6, carbs: 9.6 },
    nutritionNotes: [
      {
        text: '牛乳に多く含まれるカルシウムは、骨や歯の形成に必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_CALCIUM],
      },
    ],
    amount: { unit: 'ml', default: 200, step: 10, chips: [{ label: 'コップ', value: 100 }, { label: '200', value: 200 }, { label: '500', value: 500 }] },
    attributes: [
      { key: 'plain', label: '普通', isDefault: true },
      { key: 'low_fat', label: '低脂肪', factor: { kcal: 0.69, fat: 0.26, carbs: 1.15 } },
    ],
    asAddon: {
      unit: 'ml',
      unitAmount: 50,
      addedMacro: { kcal: 30, protein: 1.6, fat: 1.9, carbs: 2.4 },
      defaultLabel: 'ミルク',
    },
    defaultAddonIds: ['honey'], // ホットミルク+はちみつ
    allowedAddonIds: ['honey', 'granola_top'],
  },
  {
    id: 'yogurt',
    label: 'ヨーグルト',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 62, protein: 3.6, fat: 3, carbs: 4.9 },
    nutritionNotes: [
      { text: 'ヨーグルトは、乳酸菌が乳を発酵させ乳酸に変えることで固まる食品です。', source: SRC_SEIBUN },
    ],
    // 飲むヨーグルトは Attribute=drink で吸収するため chip 削除 (単位齟齬解消)
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 80 }, { label: '1パック', value: 100 }, { label: '大', value: 150 }] },
    attributes: [
      { key: 'unsweetened', label: '無糖', isDefault: true },
      { key: 'sweetened', label: '加糖', factor: { kcal: 1.39, carbs: 2.45 } },
      { key: 'greek', label: 'ギリシャ', factor: { kcal: 0.97, protein: 2.78, fat: 0.13, carbs: 0.73 } },
      { key: 'drink', label: '飲む', factor: { kcal: 1.04, protein: 0.83, fat: 0.66, carbs: 1.63 } },
    ],
    defaultAddonIds: ['honey', 'granola_top', 'berry_top', 'banana_slice', 'jam', 'nuts'],
    allowedAddonIds: ['honey', 'granola_top', 'berry_top', 'banana_slice', 'jam', 'nuts', 'peanut_butter', 'kinako'],
  },
  {
    id: 'cheese',
    label: 'チーズ',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 80, protein: 5, fat: 6, carbs: 1 },
    nutritionNotes: [
      {
        text: 'チーズは、少量でもカルシウムが多い食品です。成分表では、プロセスチーズ100gに630mg（牛乳は110mg）が含まれます。',
        source: seibun('プロセスチーズ', '13_13040_7'),
        alsoSources: [H_CALCIUM],
      },
    ],
    amount: { unit: 'g', default: 20, chips: [{ label: 'スライス1枚', value: 18 }, { label: '30', value: 30 }, { label: '50', value: 50 }] }, // スライス1枚=18g (実測値。step整合を優先せず精度維持)
    attributes: [
      { key: 'slice', label: 'スライス・6P', isDefault: true },
      { key: 'mozza', label: 'モッツァレラ', factor: { kcal: 0.85, protein: 1.20, fat: 0.83, carbs: 0.50 } },
      { key: 'cream', label: 'クリーム', factor: { kcal: 1.39, protein: 0.5, fat: 1.67 } },
      { key: 'parmesan', label: 'パルメザン', factor: { kcal: 1.34, protein: 1.96, fat: 1.13 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 20,
      addedMacro: { kcal: 80, protein: 5, fat: 6, carbs: 1 },
      defaultLabel: 'チーズ',
    },
  },
  {
    id: 'cheese_low_fat',
    label: 'チーズ (低脂)',
    searchTags: ['かってーじちーず', 'ていしつちーず', '低脂質チーズ'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    referenceDescription: 'カッテージチーズなど低脂質チーズが基準',
    defaultMacro: { kcal: 32, protein: 4, fat: 1.4, carbs: 1 },
    amount: { unit: 'g', default: 30, step: 10, chips: [{ label: '30', value: 30 }, { label: '50', value: 50 }, { label: '100', value: 100 }] },
    // サラダのトッピングとして必要 (§5)。`cheese` との違いは脂質で、普通のチーズ
    // 6g/20g に対しこちらは 1.4g/30g。この**群間の段差**こそが分類軸であり、
    // フェタ/パルメザン等の銘柄差 (群内) は Attribute にも分けない (spec §1.5)。
    asAddon: {
      unit: 'g',
      unitAmount: 30,
      addedMacro: { kcal: 32, protein: 4, fat: 1.4, carbs: 1 },
      defaultLabel: 'チーズ (低脂)',
    },
  },
  {
    id: 'soy_milk',
    label: '豆乳',
    searchTags: ['とうにゅう'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 92, protein: 7.2, fat: 4, carbs: 6.2 },
    nutritionNotes: [
      {
        text: '豆乳は大豆由来のたんぱく質を含みますが、カルシウムは牛乳ほど多くありません。成分表では、調製豆乳が100gあたり31mg、牛乳は110mgです。牛乳の代わりにするときは、カルシウムが強化された製品かどうかが分かれ目になります。',
        source: seibun('調製豆乳', '4_04053_7'),
        alsoSources: [H_CALCIUM],
      },
    ],
    amount: { unit: 'ml', default: 200, step: 10, chips: [{ label: 'コップ', value: 100 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'plain', label: '無調整', isDefault: true },
      { key: 'adjusted', label: '調整', factor: { kcal: 1.2, fat: 1.15, carbs: 1.23 } },
    ],
    defaultAddonIds: ['honey', 'kinako'],
    allowedAddonIds: ['honey', 'kinako', 'granola_top'],
  },
  {
    id: 'tofu',
    label: '豆腐',
    searchTags: ['とうふ', 'ひややっこ', 'やっこ'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 83, protein: 7.5, fat: 4.5, carbs: 3 },
    nutritionNotes: [
      {
        text: '豆腐は、たんぱく質とカルシウムを含む食品です。成分表では、木綿豆腐100gにたんぱく質7.0g・カルシウム93mgが含まれます。',
        source: seibun('木綿豆腐', '4_04032_7'),
        alsoSources: [H_CALCIUM],
      },
    ],
    amount: { unit: 'piece', default: 0.5, unitLabel: '丁', chips: [{ label: '半丁', value: 0.5 }, { label: '1丁', value: 1 }] },
    attributes: [
      { key: 'silken', label: '絹', isDefault: true },
      { key: 'firm', label: '木綿', factor: { kcal: 1.33, protein: 1.33, fat: 1.44, carbs: 0.67 } },
      { key: 'koya', label: '高野豆腐', factor: { kcal: 1.02, protein: 1.15, fat: 1.2, carbs: 0.47 } },
    ],
    defaultAddonIds: ['katsuobushi', 'kimchi_top'], // 冷奴+削り節は王道
    allowedAddonIds: ['katsuobushi', 'kimchi_top', 'mentaiko'],
  },
  {
    id: 'aburaage',
    label: '油揚げ系',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    quickTapDisabled: true, // Attribute 油揚げ/厚揚げ/がんもどき: kcal 75 → 175 (133%差)
    defaultMacro: { kcal: 75, protein: 4, fat: 7, carbs: 0 },
    amount: { unit: 'piece', default: 1, unitLabel: '枚' },
    attributes: [
      { key: 'thin', label: '油揚げ', isDefault: true },
      // C はベースが 0 なので factor では足せない (旧 `carbs: 999` は 0×999=0 で
      // 無効だった / うなぎ蒲焼と同型)。macroDelta で 1g を加算する。
      { key: 'thick', label: '厚揚げ', factor: { kcal: 2.33, protein: 3, fat: 1.86 }, macroDelta: { kcal: 0, protein: 0, fat: 0, carbs: 1 } },
      { key: 'ganmodoki', label: 'がんもどき', factor: { kcal: 1.6, protein: 2.0, fat: 1.5 } },
    ],
    searchTags: ['油揚げ', '厚揚げ', 'がんもどき'],
  },
  {
    id: 'natto',
    label: '納豆',
    searchTags: ['なっとう'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 80, protein: 6.6, fat: 4, carbs: 5 },
    nutritionNotes: [
      {
        text: '納豆は、発酵の過程でビタミンKを増やす食品です。成分表では、ゆで大豆100gが7μgなのに対し、納豆は600μgです。',
        source: seibun('糸引き納豆', '4_04046_7'),
        alsoSources: [H_VITK],
      },
      {
        text: '納豆に多いビタミンKは、正常な血液凝固と骨の健康維持に関わる栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITK],
      },
    ],
    amount: { unit: 'piece', default: 1, unitLabel: 'パック' },
    asAddon: {
      unit: 'piece',
      unitAmount: 1,
      addedMacro: { kcal: 80, protein: 6.6, fat: 4, carbs: 5 },
      defaultLabel: '納豆',
    },
  },
  {
    id: 'edamame_soy',
    label: '大豆・枝豆',
    searchTags: ['だいず', 'えだまめ'],
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 65, protein: 6, fat: 3, carbs: 4 },
    nutritionNotes: [
      {
        text: '大豆や枝豆に含まれる鉄は、赤血球をつくるのに必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_IRON],
      },
      { text: '大豆の鉄は植物性で、肉や魚の鉄より吸収されにくい形です。ビタミンCを含むものと組み合わせると吸収が高まります。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'g', default: 50, step: 10, chips: [{ label: '小皿', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'edamame', label: '枝豆', isDefault: true },
      { key: 'soybeans_boiled', label: '大豆水煮', factor: { kcal: 1.08, protein: 1.17, fat: 1.5, carbs: 0.75 } },
    ],
    // サラダのトッピングとして必要 (§5)。ひよこ豆・キドニー豆は銘柄差が
    // 群内に収まるため Attribute を分けず、`soybeans_boiled` (大豆水煮) で
    // 代表させる — 豆サラダで動くのは主に **C** であり、その段差は豆の種類
    // ではなく「豆が入っているか否か」で決まる (spec §1.5)。
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 65, protein: 6, fat: 3, carbs: 4 },
      defaultLabel: '豆 (大豆・枝豆)',
    },
  },
];

// ---------------------------------------------------------------------------
// Bucket 6: 野菜・汁物 (veggies) — 9 Identity
// ---------------------------------------------------------------------------

const BUCKET_VEGGIES: Identity[] = [
  {
    id: 'salad_raw',
    label: 'サラダ・生野菜',
    // サラダの「派生」は Identity ではなく **base + Add-on の組み合わせ**で表現する
    // (spec §1.5)。本 Identity は 25kcal/100g のほぼ空の器で、カロリーは全て Add-on
    // 側にあるため、派生名はここへ着地させて中身を Add-on で組ませるのが正しい。
    //
    // 一般形 (「ニース風サラダ」等) は `head-nouns.ts` の主辞「サラダ」が層2で拾うので、
    // **ここへの追加は whitelist ではなく「層2→層1の昇格」**。頻出の派生名だけを
    // 昇格させ、網羅は主辞辞書に任せる。
    // 生食が主の野菜はここにも登録する (veg_cooked と両方に出して選ばせる)。
    // 本 Identity は 25kcal/100g で、トマト(20)・きゅうり(13) は温野菜(35)より近い。
    searchTags: [
      'なまやさい', '生野菜', 'シーザーサラダ', 'グリーンサラダ', 'ギリシャサラダ', 'ギリシャ風サラダ', 'コブサラダ',
      'とまと', 'トマト', 'きゅうり', '胡瓜', 'きゃべつ', 'キャベツ', 'れたす', 'レタス', 'ベビーリーフ', 'サニーレタス',
    ],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 25, protein: 1.4, fat: 0.3, carbs: 5 },
    nutritionNotes: [
      { text: 'にんじんなど色の濃い野菜のβ-カロテンは脂溶性で、油と一緒だと吸収されやすくなります。ドレッシングをかけるのは理にかなっています。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 50 }, { label: '普通', value: 100 }, { label: '大', value: 150 }] },
    // default は6件が上限 (`Identity.defaultAddonIds` の "4–6 typical"、実測でも最大6)。
    // 枠が埋まっていたため、**誤差への寄与が最小の `crouton` (25kcal/F1.0) を外し、
    // 脂質の主役である `cheese` (80kcal/F6.0) を昇格**させた。サラダの記録が過小に
    // なる主因はチーズと油であり、それが default に無いのが v1.3 までの実害だった。
    // crouton は allowed に残るため選択不能になるわけではない。
    defaultAddonIds: ['avocado', 'canned_lean_fish', 'nuts', 'dressing', 'salad_chicken', 'cheese'],
    allowedAddonIds: [
      'avocado', 'canned_lean_fish', 'nuts', 'dressing', 'salad_chicken',
      'crouton', 'corn_top', 'cheese', 'cheese_low_fat', 'edamame_soy',
      'bacon_sausage', 'shirasu', 'mayo', 'oil',
    ],
  },
  {
    id: 'veg_cooked',
    label: '温野菜',
    // 一般野菜の名前が1つも無く、「人参」「玉葱」等が軒並み無着地だった。
    // 漢字とひらがなを併記する (IA spec §4.1)。ブロッコリー・アスパラ等は
    // veg_dense (高タンパク野菜)、芋類は staple なのでここには入れない。
    searchTags: [
      'おんやさい', 'にたやさい',
      'にんじん', '人参', 'たまねぎ', '玉ねぎ', '玉葱', 'なす', '茄子', 'なすび',
      'きゅうり', '胡瓜', 'はくさい', '白菜', 'だいこん', '大根',
      'ねぎ', 'ながねぎ', '長ねぎ', '長葱', 'きゃべつ', 'キャベツ',
      'ごぼう', '牛蒡', 'れんこん', '蓮根', 'ぴーまん', 'ピーマン',
      'もやし', 'ズッキーニ', 'オクラ', 'とまと', 'トマト',
    ],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    // 一般野菜の代表値 (葉物・根菜・きのこ等)。
    // ブロッコリー類など高タンパク野菜は veg_dense へ。
    referenceDescription: '葉物・根菜・きのこ等の一般野菜。ブロッコリー類は「高タンパク野菜」へ',
    defaultMacro: { kcal: 35, protein: 1.5, fat: 0.3, carbs: 7 },
    nutritionNotes: [
      { text: '野菜は加熱するとかさが減り、生のままより多くの量を食べやすくなります。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 50 }, { label: '普通', value: 100 }, { label: '大', value: 150 }] },
    styles: [
      { key: 'steamed', label: '蒸し・茹で', isDefault: true },
      // 炒め油は「野菜の脂質に比例する」ものではなく**一定量加わる**ので macroDelta。
      // 小さじ1 (4g) = 36kcal 基準。旧実装は fat×10 の乗算で、ベース脂質が違う
      // Identity 間で油の量がズレ (一般野菜3.0g / 高タンパク野菜4.0g)、さらに
      // kcal は×1.7 しか増えないため PFC 逆算と最大 -76% 乖離していた。
      { key: 'stir_fry', label: '炒め', macroDelta: { kcal: 36, protein: 0, fat: 4, carbs: 0 } },
      {
        key: 'breaded_fried',
        label: '天ぷらに',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'tempura',
          confirmMessage: '天ぷらとして記録します',
        },
      },
    ],
    // 鰹節除外はユーザー指摘に基づく既存判断のため維持 (allowedAddonIds にも含めない)。
    // v1.4: dressing は allowed にありながら default に出ておらず、温野菜サラダ・
    // ぽん酢代替として頻出のはずが埋もれていた (salad_raw と同型の「allowed 止まり」)。
    defaultAddonIds: ['mayo', 'dressing'],
    allowedAddonIds: ['mayo', 'dressing'],
  },
  {
    id: 'veg_dense',
    label: '高タンパク野菜',
    searchTags: ['こうたんぱくやさい', 'たかたんぱくやさい', 'きのこ'],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    // ブロッコリー基準 (生 100g): kcal 35, P 4.3, F 0.4, C 5
    defaultMacro: { kcal: 35, protein: 4.3, fat: 0.4, carbs: 5 },
    nutritionNotes: [
      { text: 'ブロッコリーは、野菜には珍しく、筋肉や臓器の材料になるたんぱく質を含む野菜です。', source: SRC_SEIBUN },
      {
        text: 'ブロッコリーに多いビタミンCは、皮膚や粘膜の健康維持を助けるとともに、抗酸化作用を持つ栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITC],
      },
    ],
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 50 }, { label: '普通', value: 100 }, { label: '大', value: 150 }] },
    attributes: [
      { key: 'broccoli', label: 'ブロッコリー', isDefault: true },
      { key: 'cauliflower', label: 'カリフラワー', factor: { kcal: 0.71, protein: 0.70, fat: 0.25, carbs: 1.0 } },
      { key: 'asparagus', label: 'アスパラガス', factor: { kcal: 0.63, protein: 0.60, fat: 0.50, carbs: 0.74 } },
      { key: 'brussels_sprouts', label: '芽キャベツ', factor: { kcal: 1.43, protein: 1.14, fat: 0.50, carbs: 1.80 }, searchTags: ['めきゃべつ'] },
      { key: 'spinach', label: 'ほうれん草', factor: { kcal: 0.57, protein: 0.67, fat: 0.75, carbs: 0.62 }, searchTags: ['ほうれんそう'] },
      // きのこ類 — 主要6種の平均値 (生/100g: kcal 20, P 2.5, F 0.4, C 3.4)。ブロッコリー比 factor
      { key: 'mushroom', label: 'きのこ', factor: { kcal: 0.57, protein: 0.58, fat: 1.00, carbs: 0.68 }, searchTags: ['きのこ', 'えのき', 'しいたけ', 'しめじ', 'エリンギ', 'まいたけ', 'なめこ'] },
    ],
    styles: [
      { key: 'steamed', label: '蒸し・茹で', isDefault: true },
      // 炒め油は「野菜の脂質に比例する」ものではなく**一定量加わる**ので macroDelta。
      // 小さじ1 (4g) = 36kcal 基準。旧実装は fat×10 の乗算で、ベース脂質が違う
      // Identity 間で油の量がズレ (一般野菜3.0g / 高タンパク野菜4.0g)、さらに
      // kcal は×1.7 しか増えないため PFC 逆算と最大 -76% 乖離していた。
      { key: 'stir_fry', label: '炒め', macroDelta: { kcal: 36, protein: 0, fat: 4, carbs: 0 } },
    ],
    // v1.4: dressing/cheese は allowed にありながら default に出ておらず埋もれていた
    // (veg_cooked と同型)。ブロッコリーのチーズ焼き等、チーズは高タンパク野菜で
    // 特に典型的な組み合わせのため cheese も昇格。oil は stir_fry Style の
    // macroDelta と役割が重なるため allowed のまま (default には出さない)。
    defaultAddonIds: ['mayo', 'dressing', 'cheese'],
    allowedAddonIds: ['mayo', 'dressing', 'cheese', 'oil'],
  },
  {
    id: 'corn',
    label: 'とうもろこし',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    // 茹でとうもろこし1本 (可食部120g目安)。日本食品標準成分表ベース (100gあたり
    // kcal 99/P3.5/F1.7/C18.6)。温野菜(35kcal/100g)より糖質が高く別項目にする。
    defaultMacro: { kcal: 118, protein: 4.2, fat: 2, carbs: 22 },
    nutritionNotes: [
      { text: 'とうもろこしは野菜のなかでは糖質が多く、主食に近い組成です。ごはんやパンと重ねると糖質が積み上がります。', source: SRC_SEIBUN },
    ],
    referenceDescription: '1本(可食部)=120g目安',
    amount: { unit: 'piece', default: 1, unitLabel: '本', chips: [{ label: '半分', value: 0.5 }, { label: '1本', value: 1 }, { label: '2本', value: 2 }] },
    attributes: [
      { key: 'boiled', label: '茹で', isDefault: true },
      {
        key: 'canned',
        label: 'コーン缶',
        factor: { kcal: 0.331, protein: 0.321, fat: 0.125, carbs: 0.382 }, // ≒39kcal/P1.4/F0.25/C8.4 (50g、缶詰は汁切り後)
        amount: { unit: 'g', default: 50, chips: [{ label: '大さじ2', value: 20 }, { label: '小鉢', value: 50 }] },
      },
    ],
    defaultAddonIds: ['mayo'],
    allowedAddonIds: ['mayo', 'cheese'],
    searchTags: ['コーン', 'とうもろこし', 'コーン缶'],
  },
  {
    id: 'side_seasoned',
    label: '煮物・和え物',
    // ひらがな形だけだと漢字クエリが一切当たらない (normalize は漢字→読み変換を
    // しない)。IA spec §4.1 の規約に従い漢字形を併記する。「煮物」「和え物」は
    // label に含まれるため重複させない。
    searchTags: [
      'にもの', 'あえもの', 'きんぴらごぼう', 'きんぴら', 'ひじきに', 'ひじき煮',
      'ちくぜんに', '筑前煮', 'きりぼしだいこん', '切り干し大根',
      'かぼちゃのにもの', 'かぼちゃの煮物',
    ],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 55, protein: 1.7, fat: 2.5, carbs: 6.5 },
    amount: { unit: 'g', default: 50, step: 10, chips: [{ label: '小鉢', value: 50 }, { label: '1皿', value: 100 }] },
  },
  {
    id: 'side_creamy',
    label: 'クリーミー系',
    searchTags: ['ぽてさら'],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 130, protein: 1.5, fat: 8, carbs: 12 },
    amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '小', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'potato_salad', label: 'ポテトサラダ', isDefault: true },
      { key: 'macaroni', label: 'マカロニサラダ', factor: { kcal: 1.12, protein: 2.31, carbs: 1.25 } },
      { key: 'coleslaw', label: 'コールスロー', factor: { kcal: 0.38, protein: 0.54, fat: 0.44, carbs: 0.33 } },
    ],
  },
  {
    id: 'pickles',
    label: '漬物',
    searchTags: ['つけもの'],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 14, protein: 0.5, fat: 0.1, carbs: 2 },
    amount: { unit: 'g', default: 30, chips: [{ label: '少', value: 15 }, { label: '小皿', value: 30 }] },
    attributes: [
      { key: 'kimchi', label: 'キムチ', isDefault: true },
      { key: 'asazuke', label: '浅漬け', factor: { kcal: 0.86 }, searchTags: ['あさづけ'] },
      { key: 'ume', label: '梅干し', factor: { kcal: 0.21, carbs: 0.3 }, searchTags: ['うめぼし'] },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 30,
      addedMacro: { kcal: 14, protein: 0.5, fat: 0.1, carbs: 2 },
      defaultLabel: 'キムチ',
    },
  },
  {
    id: 'veggie_soup',
    label: '野菜スープ',
    searchTags: ['やさいすーぷ', 'こんそめ'],
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    // コンソメ系薄口スープ基準 (野菜 100g + スープ 200ml 程度)。ミネストローネは misc_dish の soup_western へ。
    defaultMacro: { kcal: 35, protein: 1.5, fat: 0.5, carbs: 6 },
    nutritionNotes: [
      {
        text: 'ビタミンCは熱で壊れやすく、ゆでると減ります。成分表ではほうれんそう100gが、生で35mg、ゆでて19mgです。10種の野菜の研究でも、ゆでるのはビタミンCの保持率がもっとも低い調理法でした。',
        source: seibun('ほうれんそう（生）', '6_06267_7'),
        alsoSources: [H_VITC, SRC_COOKING_VITAMINS],
      },
    ],
    amount: { unit: 'ml', default: 200, step: 10, chips: [{ label: '小', value: 150 }, { label: '普通', value: 200 }, { label: '大', value: 300 }] },
  },
  // v1.2: 汁物 4 Identity (miso_soup / tonjiru / soup_western / soup_creamy) は
  // 「スープ=料理」の整理に基づき misc_dish (dishes.ts) へ移送。
];

// ---------------------------------------------------------------------------
// Bucket 7: 果物 (fruit) — 5 Identity
// ---------------------------------------------------------------------------

const BUCKET_FRUIT: Identity[] = [
  // v1.2: banana を bucket先頭 (=default) に変更。
  // NHNS 摂取量第1位 + modal-set kcal median (citrus 50 / banana 86 / apple 135 の中央)。
  {
    id: 'banana',
    label: 'バナナ',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 86, protein: 1.1, fat: 0.2, carbs: 22 },
    nutritionNotes: [
      { text: 'バナナは、体内の水分バランスに関わるミネラルのひとつ、カリウムを含みます。', source: SRC_SEIBUN },
      {
        text: 'バナナに含まれるカリウムは、正常な血圧の維持に必要な栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_POTASSIUM],
      },
    ],
    amount: { unit: 'piece', default: 1 },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 45, protein: 0.5, fat: 0.1, carbs: 11 },
      defaultLabel: 'バナナ',
    },
  },
  {
    id: 'apple_pear',
    label: 'りんご・梨',
    searchTags: ['なし', '梨', 'りんご', '林檎', 'アップル'],
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 135, protein: 0.5, fat: 0.5, carbs: 35 },
    nutritionNotes: [
      { text: 'りんごや梨の食物繊維は、便通に関わる成分です。皮の近くに多く含まれるため、皮ごと食べるかどうかで量が変わります。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'piece', default: 1 },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 27, protein: 0.1, fat: 0.1, carbs: 7 },
      defaultLabel: 'りんご',
    },
  },
  {
    id: 'citrus',
    label: '柑橘',
    searchTags: ['かんきつ', '柑橘', 'みかん', '蜜柑', 'オレンジ', 'グレープフルーツ', 'レモン', '檸檬'],
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 50, protein: 0.8, fat: 0.1, carbs: 13 },
    nutritionNotes: [
      {
        text: '柑橘に多いビタミンCは水に溶けるタイプで、体にためておけません。まとめてではなく、日々こまめにとりたい栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITC],
      },
    ],
    amount: { unit: 'piece', default: 1 },
  },
  {
    id: 'ichigo',
    label: 'いちご',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 44, protein: 1.2, fat: 0.1, carbs: 11 }, // 10粒分
    nutritionNotes: [
      {
        text: 'いちごに多いビタミンCは、皮膚や粘膜の健康維持を助けるとともに、抗酸化作用を持つ栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITC],
      },
    ],
    amount: {
      unit: 'piece',
      unitLabel: '粒',
      default: 10,
      chips: [
        { label: '5粒',  value: 5  },
        { label: '10粒', value: 10 },
        { label: '15粒', value: 15 },
      ],
    },
    searchTags: ['ストロベリー', 'いちご', '苺'],
  },
  {
    id: 'berry',
    label: 'ベリー・ぶどう',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 28, protein: 0.5, fat: 0.2, carbs: 7 },
    amount: { unit: 'g', default: 50, step: 10, chips: [{ label: '50', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'blueberry', label: 'ブルーベリー', isDefault: true },
      { key: 'grape', label: 'ぶどう', factor: { kcal: 1.07, carbs: 1.14 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 25, protein: 0.4, fat: 0.2, carbs: 6 },
      defaultLabel: 'ベリー',
    },
    searchTags: ['ぶどう', '葡萄', 'ブルーベリー', 'いちじく', '無花果', 'ベリー'],
  },
  {
    id: 'fruit_other',
    label: 'その他の果物',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    referenceDescription: 'キウイ・桃・パイナップル・マンゴー・柿・すいかなど',
    defaultMacro: { kcal: 60, protein: 0.7, fat: 0.2, carbs: 15 },
    amount: { unit: 'piece', default: 1 },
    searchTags: ['キウイ', '桃', 'パイナップル', 'マンゴー', '柿', 'すいか', '西瓜', 'すいか', 'キウイフルーツ', 'パイン'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 8: 油・調味 (added_fat) — 6 Identity
// ---------------------------------------------------------------------------

const BUCKET_ADDED_FAT: Identity[] = [
  {
    id: 'oil',
    label: 'オイル',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 110, protein: 0, fat: 12, carbs: 0 },
    nutritionNotes: [
      { text: '油は少ない量でもエネルギーが大きく、小さじ1杯の差がそのまま効いてきます。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'ml', default: 15, step: 5, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 15 }] },
    attributes: [
      { key: 'olive', label: 'オリーブ', isDefault: true },
      { key: 'sesame', label: 'ごま' },
      { key: 'mct', label: 'MCT', factor: { kcal: 1.13 } },
      { key: 'coconut', label: 'ココナッツ', factor: { kcal: 1.13 } },
    ],
    asAddon: {
      unit: 'ml',
      unitAmount: 15,
      addedMacro: { kcal: 110, protein: 0, fat: 12, carbs: 0 },
      defaultLabel: '油',
    },
    searchTags: ['あぶら', '油', 'サラダ油', 'さらだあぶら', 'ごま油', '胡麻油', 'ごまあぶら', 'オリーブオイル', 'おりーぶおいる', '植物油'],
  },
  {
    id: 'butter_cream',
    label: 'バター・生クリーム',
    searchTags: ['なまくりーむ'],
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 75, protein: 0.1, fat: 8.1, carbs: 0 },
    amount: { unit: 'g', default: 10, step: 5, chips: [{ label: '5', value: 5 }, { label: '10', value: 10 }, { label: '大さじ', value: 15 }] },
    attributes: [
      { key: 'butter', label: 'バター', isDefault: true },
      { key: 'margarine', label: 'マーガリン', factor: { kcal: 0.95 } },
      { key: 'cream', label: '生クリーム', factor: { kcal: 0.8, fat: 0.79 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 10,
      addedMacro: { kcal: 75, protein: 0.1, fat: 8.1, carbs: 0 },
      defaultLabel: 'バター',
    },
  },
  {
    id: 'mayo',
    label: 'マヨネーズ',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 80, protein: 0.2, fat: 8.8, carbs: 0.5 },
    nutritionNotes: [
      { text: 'マヨネーズは、エネルギーのほとんどが油由来です。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'ml', default: 12, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 12 }] }, // 大さじ=12ml (マヨの実測値。step整合を優先せず精度維持)
    asAddon: {
      unit: 'ml',
      unitAmount: 12,
      addedMacro: { kcal: 80, protein: 0.2, fat: 8.8, carbs: 0.5 },
      defaultLabel: 'マヨ',
    },
  },
  {
    id: 'dressing',
    label: 'ドレッシング',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 60, protein: 0.1, fat: 5, carbs: 2 },
    amount: { unit: 'ml', default: 15, step: 5, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 15 }] },
    attributes: [
      { key: 'oily', label: '油あり', isDefault: true },
      { key: 'no_oil', label: 'ノンオイル', factor: { kcal: 0.25, fat: 0, carbs: 1.5 } },
    ],
    asAddon: {
      unit: 'ml',
      unitAmount: 15,
      addedMacro: { kcal: 60, protein: 0.1, fat: 5, carbs: 2 },
      defaultLabel: 'ドレッシング',
    },
  },
  {
    id: 'avocado',
    label: 'アボカド',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 90, protein: 1, fat: 9, carbs: 0.5 },
    nutritionNotes: [
      {
        text: 'アボカドは果物ですが、糖質ではなく脂質が主成分です。成分表では、100gあたり脂質17.5g・炭水化物7.9gです。',
        source: seibun('アボカド', '7_07006_7'),
        alsoSources: [H_AVOCADO],
      },
    ],
    amount: { unit: 'piece', default: 0.5, chips: [{ label: '1/4個', value: 0.25 }, { label: '半個', value: 0.5 }, { label: '1個', value: 1 }] },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 90, protein: 1, fat: 9, carbs: 0.5 },
      defaultLabel: 'アボカド',
    },
    searchableFrom: ['fruit'],
    searchTags: ['アボカド'],
  },
  {
    // PFC: kcal 180 / fat 15g (75% from fat) — 油脂優位なので added_fat に分類。
    // おやつタブからの検索導線は searchableFrom で確保。
    id: 'nuts',
    label: 'ナッツ',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 180, protein: 6, fat: 15, carbs: 5 },
    nutritionNotes: [
      { text: 'ナッツの脂質は不飽和脂肪酸が中心で、常温でも固まりにくく、肉の脂(飽和脂肪酸)とは性質が違います。', source: SRC_SEIBUN },
      {
        text: 'ナッツに含まれるビタミンEは、抗酸化作用により、体内の脂質を酸化から守り細胞の健康維持を助ける栄養素です。',
        source: SRC_CAA,
        alsoSources: [H_VITE],
      },
    ],
    amount: { unit: 'g', default: 30, step: 5, chips: [{ label: '一掴み', value: 15 }, { label: '30', value: 30 }, { label: '50', value: 50 }] },
    attributes: [
      { key: 'plain', label: '素焼', isDefault: true },
      { key: 'salted', label: '塩入' },
      { key: 'roasted', label: 'ロースト' },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 15,
      addedMacro: { kcal: 90, protein: 3, fat: 8, carbs: 2 },
      defaultLabel: 'ナッツ',
    },
    searchableFrom: ['snack_drink'],
    searchTags: ['ナッツ', 'アーモンド', 'カシュー', 'ピーナッツ', 'くるみ', 'ミックスナッツ'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 9: おやつ甘飲 (snack_drink) — 10 Identity
// ---------------------------------------------------------------------------

const BUCKET_SNACK_DRINK: Identity[] = [
  {
    id: 'chocolate',
    label: 'チョコ',
    searchTags: ['板チョコ', 'ミルクチョコ', 'チョコレート'],
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // 基準は板チョコ (明治ミルクチョコ等) 1枚=50g。
    defaultMacro: { kcal: 138, protein: 1.7, fat: 8.3, carbs: 14 },
    nutritionNotes: [
      { text: 'チョコはカカオ分が高いほど砂糖が減り、脂質の割合が増えます。カカオ分が高い＝低エネルギーとは限りません。', source: SRC_SEIBUN },
    ],
    referenceDescription: '板チョコ1枚(明治ミルクチョコ等)で約50g。1かけ≈5g',
    amount: { unit: 'g', default: 25, chips: [{ label: '2〜3かけ', value: 15 }, { label: '板半分', value: 25 }, { label: '板1枚', value: 50 }] },
    attributes: [
      { key: 'plain', label: '普通', isDefault: true },
      { key: 'high_cacao', label: 'ハイカカオ', factor: { kcal: 1.09, protein: 1.75, fat: 1.5, carbs: 0.47 } },
    ],
  },
  {
    id: 'wagashi',
    label: '和菓子・米菓',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 145, protein: 2.4, fat: 0.2, carbs: 33 },
    nutritionNotes: [
      { text: '和菓子は洋菓子と比べて油脂の使用が少なく、糖質が中心です。同じ甘いものでも脂質の入り方が違います。', source: SRC_SEIBUN },
    ],
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1個', value: 1 }, { label: '大', value: 1.5 }] },
    searchTags: ['大福', 'どら焼き', '羊羹', 'せんべい', '煎餅', 'まんじゅう', '饅頭', '大学いも', '焼き芋', 'もなか', '最中'],
  },
  {
    id: 'cake',
    label: 'ケーキ・洋菓子',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 230, protein: 4, fat: 12, carbs: 28 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1切', value: 1 }] },
    searchTags: ['ショート', 'チーズケーキ', 'シュー', 'ティラミス', 'モンブラン', 'ガトーショコラ', 'タルト'],
  },
  {
    id: 'pudding',
    label: 'プリン・ゼリー',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // 市販カッププリン(森永等)基準 100g: kcal 117, P 4.0, F 5.4, C 13。ゼリーは低カロリー寄り。
    defaultMacro: { kcal: 117, protein: 4, fat: 5.4, carbs: 13 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '1個', value: 1 }, { label: '大', value: 1.5 }] },
    searchTags: ['プリン', 'ゼリー', 'カスタード'],
    attributes: [
      { key: 'custard', label: 'プリン', isDefault: true },
      { key: 'jelly', label: 'ゼリー・杏仁', factor: { kcal: 0.41, protein: 0.35, fat: 0.06, carbs: 0.62 } },
    ],
  },
  {
    id: 'ice',
    label: 'アイス',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 215, protein: 4, fat: 10, carbs: 27 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1個', value: 1 }] },
    searchTags: ['アイスクリーム', 'ソフトクリーム', 'シャーベット', 'ジェラート'],
  },
  {
    id: 'cookie',
    label: 'クッキー・焼菓子',
    searchTags: ['やきがし', 'びすけっと', 'まふぃん'],
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 130, protein: 1.8, fat: 5.5, carbs: 17 },
    referenceDescription: 'クッキー・ビスケット・マフィン等。1枚≈10g',
    amount: { unit: 'g', default: 30, step: 10, chips: [{ label: '3枚', value: 30 }, { label: '大袋', value: 60 }] },
  },
  {
    id: 'snack',
    label: 'スナック菓子',
    searchTags: ['すなっくがし', 'ポテチ', 'ぽてち', 'ポテトチップス', 'かっぱえびせん', 'コーンスナック'],
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 320, protein: 4, fat: 18, carbs: 36 },
    referenceDescription: 'ポテチ・コーンスナック等。1袋(ポテチ普通サイズ)≈60g',
    amount: { unit: 'g', default: 60, step: 10, chips: [{ label: '半袋', value: 30 }, { label: '1袋', value: 60 }] },
  },
  {
    id: 'popcorn',
    label: 'ポップコーン',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // 市販袋ポップコーン塩・バターしょうゆ基準 (マイクポップコーン等):
    // kcal 510 / P 8.5 / F 27 / C 56 per 100g (1袋50g = 255 / 4.3 / 13.5 / 28)
    defaultMacro: { kcal: 255, protein: 4.3, fat: 13.5, carbs: 28 },
    nutritionNotes: [
      { text: 'ポップコーンは、とうもろこしをそのまま弾けさせた全粒の穀物です。', source: SRC_SEIBUN },
    ],
    referenceDescription: '市販袋ポップコーン1袋≈50g。映画館 S≈70g / M≈120g / L≈180g',
    amount: {
      unit: 'g',
      default: 50,
      chips: [
        { label: '半袋', value: 25 },
        { label: '1袋', value: 50 },
        { label: '映画館S', value: 70 },
        { label: '映画館M', value: 120 },
        { label: '映画館L', value: 180 },
      ],
    },
    attributes: [
      // 塩・バターしょうゆは macro 差が小さい (両方 ~510-520 kcal/100g) ため統合
      { key: 'salt_butter', label: '塩・バターしょうゆ', isDefault: true },
      // キャラメル: ~490 kcal / P 3.5 / F 17 / C 75 per 100g (糖衣で炭水化物↑、油は塩より少なめ)
      { key: 'caramel', label: 'キャラメル', factor: { kcal: 0.96, protein: 0.41, fat: 0.63, carbs: 1.34 } },
    ],
    searchTags: ['ポップコーン', 'popcorn', 'マイクポップコーン'],
  },
  {
    id: 'sweet_bread',
    label: '菓子パン',
    searchTags: ['かしぱん', 'めろんぱん', 'あんぱん', 'クリームパン', 'チョココロネ', 'カレーパン'],
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 305, protein: 6, fat: 8, carbs: 51 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '半分', value: 0.5 }, { label: '1個', value: 1 }] },
  },
  {
    id: 'dried_fruit',
    label: 'ドライフルーツ',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 90, protein: 1, fat: 0.2, carbs: 22 },
    nutritionNotes: [
      { text: 'ドライフルーツは水分が抜けている分、同じ重さの生の果物より糖質が濃くなります。少量でも生の果物ひとつ分に届きます。', source: SRC_SEIBUN },
    ],
    referenceDescription: 'レーズン・ドライマンゴー等。ひとつかみ≈30g',
    amount: { unit: 'g', default: 30, step: 10, chips: [{ label: 'ひとつかみ', value: 30 }, { label: '小袋', value: 50 }] },
    searchableFrom: ['fruit'],
    searchTags: ['ドライフルーツ', 'ドライ'],
  },
  {
    id: 'sweet_drink',
    label: 'ジュース',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 140, protein: 0, fat: 0, carbs: 35 },
    referenceDescription: 'コーラ・サイダー・果汁ジュース・スポーツドリンクなど、サラッと甘い飲み物',
    amount: { unit: 'ml', default: 350, step: 10, chips: [{ label: 'コップ1杯', value: 200 }, { label: '缶1本', value: 350 }, { label: '1本(500)', value: 500 }] },
    searchTags: ['ジュース', 'コーラ', 'サイダー', 'スポドリ', '炭酸', '果汁'],
  },
  {
    id: 'sweet_drink_rich',
    label: 'フラペ・タピオカ系',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 280, protein: 5, fat: 10, carbs: 50 },
    referenceDescription: 'フラペチーノ・タピオカミルクティーなど、生クリームやトッピングでこってり甘い飲み物',
    amount: { unit: 'ml', default: 350, step: 10, chips: [{ label: 'S/Short', value: 240 }, { label: 'M/Tall', value: 350 }, { label: 'L/Grande', value: 470 }] },
    searchTags: ['フラペチーノ', 'タピオカ', 'ミルクティー', 'シェイク', 'スタバ'],
  },
  {
    id: 'alcohol',
    label: 'お酒',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // JP にアルコールの Identity が1つも無く、ビール等が記録できなかった
    // (US には `us_beer` があり、ロケール間で非対称だった)。
    // IA spec §1.5 の判定を上から適用した結果:
    //   1. 既存 Identity で記録できるか → No。`sweet_drink` は同じ 140kcal/350ml でも
    //      C 35g (ビールは 10.9g)。糖質が3倍ずれるのでジュースでは代用できない
    //   2. Attribute/Style で表現できるか → No。「ジュース」と「お酒」は別の型
    //   3. Add-on か → No
    //   4. → Identity 新設。バケットは増やさず snack_drink 内に置く
    //      (§1.5「アルコールは新バケットを作らず snack_drink 内クラスタで解決」)
    //
    // ⚠️ アルコールの熱量はエタノール (7kcal/g) 由来で、**PFC から逆算できない**。
    // 4P+9F+4C ≠ kcal になるのは仕様であり、kcal を独立したアンカーとする
    // (US-food-db-design.md §4.1 / `us_beer` と同じ扱い)。
    quickTapDisabled: true, // Attribute 間で kcal 82-193 と幅がある
    // 基準 = ビール 350ml (八訂 淡色 39kcal/100ml)。
    defaultMacro: { kcal: 140, protein: 1.1, fat: 0, carbs: 10.9 },
    referenceDescription: 'ビール350ml(缶1本)が基準。お酒の熱量は糖質・脂質からは計算できない',
    amount: {
      unit: 'ml',
      default: 350,
      step: 10,
      chips: [{ label: '中瓶/缶(350)', value: 350 }, { label: 'ジョッキ(500)', value: 500 }],
    },
    attributes: [
      { key: 'beer', label: 'ビール', isDefault: true, searchTags: ['びーる', '発泡酒', 'はっぽうしゅ', '生ビール'] },
      // 以下は酒種ごとに1杯の量が違うため、量チップを Attribute 側で上書きする。
      {
        key: 'sake',
        label: '日本酒',
        searchTags: ['にほんしゅ', '清酒', 'せいしゅ', '冷酒', '熱燗'],
        factor: { kcal: 1.379, protein: 0.655, carbs: 0.809 }, // 1合180ml ≒ 193kcal/P0.7/C8.8
        amount: { unit: 'ml', default: 180, step: 10, chips: [{ label: '1合(180)', value: 180 }, { label: '半合(90)', value: 90 }] },
      },
      {
        key: 'wine',
        label: 'ワイン',
        searchTags: ['わいん', '赤ワイン', '白ワイン'],
        factor: { kcal: 0.586, protein: 0.218, carbs: 0.165 }, // グラス120ml ≒ 82kcal/C1.8
        amount: { unit: 'ml', default: 120, step: 10, chips: [{ label: 'グラス(120)', value: 120 }, { label: '2杯(240)', value: 240 }] },
      },
      {
        key: 'spirits',
        label: '焼酎・ウイスキー',
        searchTags: ['しょうちゅう', 'ういすきー', '焼酎', 'ウイスキー', '泡盛', 'ジン', 'ウォッカ'],
        // 蒸留酒は糖質ゼロ。焼酎(25度)60ml ≒ 86kcal。ウイスキーはシングル30ml相当。
        factor: { kcal: 0.614, protein: 0, carbs: 0 },
        amount: { unit: 'ml', default: 60, step: 10, chips: [{ label: '1杯(60)', value: 60 }, { label: 'ダブル(120)', value: 120 }] },
      },
      {
        key: 'chuhai',
        label: 'チューハイ・ハイボール',
        searchTags: ['ちゅーはい', 'はいぼーる', '酎ハイ', 'サワー', 'レモンサワー'],
        factor: { kcal: 1.279, protein: 0, carbs: 1.009 }, // 350ml ≒ 179kcal/C11
      },
    ],
    searchTags: ['おさけ', 'お酒', 'さけ', '酒', 'アルコール', 'あるこーる', '晩酌', 'ばんしゃく'],
  },
];

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export const INGREDIENT_IDENTITIES: Identity[] = [
  ...BUCKET_STAPLE,
  ...BUCKET_LEAN_PROTEIN,
  ...BUCKET_EGG,
  ...BUCKET_FATTY_PROTEIN,
  ...BUCKET_DAIRY_SOY,
  ...BUCKET_VEGGIES,
  ...BUCKET_FRUIT,
  ...BUCKET_ADDED_FAT,
  ...BUCKET_SNACK_DRINK,
];

export const INGREDIENT_IDENTITIES_BY_BUCKET = {
  staple: BUCKET_STAPLE,
  lean_protein: BUCKET_LEAN_PROTEIN,
  egg: BUCKET_EGG,
  fatty_protein: BUCKET_FATTY_PROTEIN,
  dairy_soy: BUCKET_DAIRY_SOY,
  veggies: BUCKET_VEGGIES,
  fruit: BUCKET_FRUIT,
  added_fat: BUCKET_ADDED_FAT,
  snack_drink: BUCKET_SNACK_DRINK,
} as const;
