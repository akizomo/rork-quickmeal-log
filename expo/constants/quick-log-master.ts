import {
  AmountCandidate,
  AttributeKey,
  AttributeOption,
  CookingMethodKey,
  MethodOption,
  PartKey,
  PartOption,
  QuickLogCategoryDef,
  QuickLogSubcategory,
} from '@/types/quick-log';

// ---------------------------------------------------------------------------
// Reusable detail option presets
// ---------------------------------------------------------------------------

const ATTR_TUNA: AttributeOption[] = [
  { key: 'water' as AttributeKey, label: '水煮' },
  { key: 'oil' as AttributeKey, label: '油漬', factor: { kcal: 1.7, fat: 6 } },
  { key: 'unknown' as AttributeKey, label: 'わからない', factor: { kcal: 1.2, fat: 2 } },
];

const ATTR_YOGURT: AttributeOption[] = [
  { key: 'unsweetened' as AttributeKey, label: '無糖' },
  { key: 'sweetened' as AttributeKey, label: '加糖', factor: { kcal: 1.4, carbs: 1.9 } },
  { key: 'unknown' as AttributeKey, label: 'わからない', factor: { kcal: 1.2, carbs: 1.4 } },
];

const ATTR_SOY: AttributeOption[] = [
  { key: 'plain' as AttributeKey, label: '無調整' },
  { key: 'adjusted' as AttributeKey, label: '調整', factor: { kcal: 1.15, carbs: 1.5 } },
  { key: 'unknown' as AttributeKey, label: 'わからない', factor: { kcal: 1.08, carbs: 1.25 } },
];

const PART_BEEF: PartOption[] = [
  { key: 'lean' as PartKey, label: '赤身', factor: { kcal: 0.65, protein: 1.15, fat: 0.3 } },
  { key: 'loin' as PartKey, label: 'ロース' },
  { key: 'fatty' as PartKey, label: 'バラ・脂多め', factor: { kcal: 1.55, protein: 0.8, fat: 2.2 } },
  { key: 'unknown' as PartKey, label: 'わからない', factor: { kcal: 0.95, protein: 1.0, fat: 0.85 } },
];

const PART_PORK: PartOption[] = [
  { key: 'lean' as PartKey, label: 'ヒレ・もも', factor: { kcal: 0.6, protein: 1.2, fat: 0.25 } },
  { key: 'loin' as PartKey, label: 'ロース' },
  { key: 'fatty' as PartKey, label: 'バラ・脂多め', factor: { kcal: 1.6, protein: 0.75, fat: 2.4 } },
  { key: 'unknown' as PartKey, label: 'わからない', factor: { kcal: 0.95, protein: 1.0, fat: 0.85 } },
];

// Cooking method factors are conservative — applied on top of base macro
// (and any part/attribute factor). The "light" key is used as system default
// when no method is recorded.
const METHOD_BASE: MethodOption[] = [
  { key: 'raw' as CookingMethodKey, label: '生' },
  { key: 'light' as CookingMethodKey, label: 'あっさり' },
  { key: 'oil' as CookingMethodKey, label: '油あり', factor: { kcal: 1.2, fat: 1.6 } },
  { key: 'fried' as CookingMethodKey, label: '揚げもの', factor: { kcal: 1.55, fat: 2.3, carbs: 1.25 } },
];

const methodsForLeanProtein = (): MethodOption[] => METHOD_BASE;
const methodsForFattyProtein = (): MethodOption[] => [
  { key: 'light' as CookingMethodKey, label: 'あっさり' },
  { key: 'oil' as CookingMethodKey, label: '油あり', factor: { kcal: 1.18, fat: 1.5 } },
  { key: 'fried' as CookingMethodKey, label: '揚げもの', factor: { kcal: 1.5, fat: 2.1, carbs: 1.2 } },
];

// ---------------------------------------------------------------------------
// Amount candidate helpers (g / ml / piece)
// ---------------------------------------------------------------------------

const g = (key: string, label: string, amount: number, isDefault?: boolean): AmountCandidate => ({
  key, label, amount, unit: 'g', ...(isDefault ? { isDefault: true } : {}),
});
const ml = (key: string, label: string, amount: number, isDefault?: boolean): AmountCandidate => ({
  key, label, amount, unit: 'ml', ...(isDefault ? { isDefault: true } : {}),
});
const pc = (key: string, label: string, amount: number, isDefault?: boolean): AmountCandidate => ({
  key, label, amount, unit: 'piece', ...(isDefault ? { isDefault: true } : {}),
});

// ---------------------------------------------------------------------------
// Subcategory helper
// ---------------------------------------------------------------------------

type SubcatInput = Omit<QuickLogSubcategory, 'detailUi'> & { detailUi?: QuickLogSubcategory['detailUi'] };

function s(input: SubcatInput): QuickLogSubcategory {
  return { detailUi: 'none', ...input };
}

// ---------------------------------------------------------------------------
// 1. staple / 主食
// ---------------------------------------------------------------------------

const STAPLE: QuickLogSubcategory[] = [
  s({
    key: 'rice',
    label: 'ごはん',
    baseMacroPer100: { kcal: 156, protein: 2.5, fat: 0.3, carbs: 37 },
    amountCandidates: [g('small', '小', 100), g('regular', '普通', 150, true), g('large', '大', 220)],
  }),
  s({
    key: 'bread',
    label: 'パン',
    baseMacroPer100: { kcal: 248, protein: 8.8, fat: 4.2, carbs: 46 },
    amountCandidates: [g('one_slice', '1枚', 60, true), g('two_slice', '2枚', 120), g('one_roll', '1個', 80)],
  }),
  s({
    key: 'oatmeal',
    label: 'オートミール',
    baseMacroPer100: { kcal: 350, protein: 13, fat: 6.5, carbs: 69 },
    amountCandidates: [g('one_serv', '1食分', 30, true), g('tbsp', '大さじ', 10)],
  }),
  s({
    key: 'cereal',
    label: 'シリアル・グラノラ',
    baseMacroPer100: { kcal: 446, protein: 9, fat: 15.5, carbs: 71 },
    amountCandidates: [g('one_cup', '1杯', 50, true), g('tbsp', '大さじ', 15)],
  }),
  s({
    key: 'potato',
    label: 'いも',
    baseMacroPer100: { kcal: 76, protein: 1.9, fat: 0.1, carbs: 17 },
    amountCandidates: [g('half', '半分', 60), g('one', '1個', 100, true), g('one_big', '大1個', 180)],
  }),
];

// ---------------------------------------------------------------------------
// 2. lean_protein / 低脂P
// ---------------------------------------------------------------------------

const LEAN_PROTEIN: QuickLogSubcategory[] = [
  {
    key: 'chicken_breast',
    label: '鶏むね',
    detailUi: 'method',
    baseMacroPer100: { kcal: 116, protein: 23.3, fat: 1.9, carbs: 0 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('200g', '200g', 200), g('one_filet', '1枚', 250)],
  },
  {
    key: 'sasami',
    label: 'ささみ',
    detailUi: 'method',
    baseMacroPer100: { kcal: 105, protein: 23.9, fat: 0.8, carbs: 0 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('two', '2本', 80, true), g('three', '3本', 120), g('four', '4本', 160), g('100g', '100g', 100)],
  },
  {
    key: 'tuna_can',
    label: 'ツナ缶',
    detailUi: 'attribute',
    baseMacroPer100: { kcal: 70, protein: 16, fat: 0.7, carbs: 0.2 },
    attributes: ATTR_TUNA,
    defaultAttributeKey: 'water',
    amountCandidates: [g('half', '半缶', 35), g('one', '1缶', 70, true)],
  },
  s({
    key: 'salad_chicken',
    label: 'サラダチキン',
    baseMacroPer100: { kcal: 108, protein: 23, fat: 1.5, carbs: 0.5 },
    amountCandidates: [g('half', '半パック', 55), g('one', '1パック', 110, true), g('two', '2パック', 220)],
  }),
  {
    key: 'lean_fish',
    label: '白身魚・まぐろ赤身',
    detailUi: 'method',
    baseMacroPer100: { kcal: 110, protein: 22, fat: 1.5, carbs: 0 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('one_slice', '1切れ', 80, true), g('two_slice', '2切れ', 160), g('100g', '100g', 100)],
  },
  {
    key: 'seafood_lean',
    label: 'えび・いか・たこ',
    detailUi: 'method',
    baseMacroPer100: { kcal: 85, protein: 17, fat: 1, carbs: 0.5 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('one_dish', '1皿', 80, true), g('100g', '100g', 100), g('150g', '150g', 150)],
  },
  {
    key: 'beef_lean',
    label: '牛赤身',
    detailUi: 'method',
    baseMacroPer100: { kcal: 145, protein: 21, fat: 6.5, carbs: 0 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('200g', '200g', 200)],
  },
  {
    key: 'pork_lean',
    label: '豚ヒレ・もも',
    detailUi: 'method',
    baseMacroPer100: { kcal: 130, protein: 22, fat: 4, carbs: 0 },
    methods: methodsForLeanProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('200g', '200g', 200)],
  },
];

// ---------------------------------------------------------------------------
// 3. egg / 卵
// ---------------------------------------------------------------------------

const EGG: QuickLogSubcategory[] = [
  s({
    key: 'whole_egg',
    label: '全卵',
    baseMacroPer100: { kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 }, // per 1 piece (~50g)
    amountCandidates: [pc('one', '1個', 1, true), pc('two', '2個', 2), pc('three', '3個', 3)],
  }),
  s({
    key: 'boiled_egg',
    label: 'ゆで卵',
    baseMacroPer100: { kcal: 78, protein: 6.5, fat: 5.3, carbs: 0.2 },
    amountCandidates: [pc('one', '1個', 1, true), pc('two', '2個', 2)],
  }),
  s({
    key: 'fried_egg',
    label: '目玉焼き',
    baseMacroPer100: { kcal: 100, protein: 6.5, fat: 7.5, carbs: 0.2 },
    amountCandidates: [pc('one', '1個', 1, true), pc('two', '2個', 2)],
  }),
  s({
    key: 'egg_dish',
    label: '卵焼き・スクランブル',
    baseMacroPer100: { kcal: 110, protein: 7, fat: 8, carbs: 1.5 }, // per 1 piece worth
    amountCandidates: [pc('one', '1個分', 1, true), pc('two', '2個分', 2), pc('plate', '1皿', 2)],
  }),
];

// ---------------------------------------------------------------------------
// 4. fatty_protein / 脂ありP
// ---------------------------------------------------------------------------

const FATTY_PROTEIN: QuickLogSubcategory[] = [
  {
    key: 'beef',
    label: '牛肉',
    detailUi: 'part_method',
    baseMacroPer100: { kcal: 240, protein: 17, fat: 18, carbs: 0 }, // loin baseline
    parts: PART_BEEF,
    defaultPartKey: 'loin',
    methods: methodsForFattyProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('200g', '200g', 200)],
  },
  {
    key: 'pork',
    label: '豚肉',
    detailUi: 'part_method',
    baseMacroPer100: { kcal: 220, protein: 18, fat: 15, carbs: 0 }, // loin baseline
    parts: PART_PORK,
    defaultPartKey: 'loin',
    methods: methodsForFattyProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('200g', '200g', 200)],
  },
  {
    key: 'chicken_thigh',
    label: '鶏もも',
    detailUi: 'method',
    baseMacroPer100: { kcal: 200, protein: 17, fat: 14, carbs: 0 },
    methods: methodsForFattyProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('100g', '100g', 100, true), g('150g', '150g', 150), g('one_filet', '1枚', 250)],
  },
  {
    key: 'fatty_fish',
    label: '鮭・青魚',
    detailUi: 'method',
    baseMacroPer100: { kcal: 200, protein: 20, fat: 12, carbs: 0 },
    methods: methodsForFattyProtein(),
    defaultMethodKey: 'light',
    amountCandidates: [g('one_slice', '1切れ', 80, true), g('two_slice', '2切れ', 160), g('100g', '100g', 100)],
  },
  s({
    key: 'processed_meat',
    label: '加工肉',
    baseMacroPer100: { kcal: 290, protein: 13, fat: 24, carbs: 2 },
    amountCandidates: [g('two_slice', 'ハム2枚', 30), g('four_slice', 'ハム4枚', 60), g('one_sausage', 'ウインナー1本', 25), g('pack', '1パック', 100, true)],
  }),
];

// ---------------------------------------------------------------------------
// 5. dairy_soy / 乳・大豆
// ---------------------------------------------------------------------------

const DAIRY_SOY: QuickLogSubcategory[] = [
  {
    key: 'yogurt',
    label: 'ヨーグルト',
    detailUi: 'attribute',
    baseMacroPer100: { kcal: 62, protein: 3.6, fat: 3, carbs: 4.9 },
    attributes: ATTR_YOGURT,
    defaultAttributeKey: 'unsweetened',
    amountCandidates: [g('one', '1個', 100, true), g('150g', '150g', 150)],
  },
  s({
    key: 'milk',
    label: '牛乳',
    baseMacroPer100: { kcal: 67, protein: 3.3, fat: 3.8, carbs: 4.8 },
    amountCandidates: [ml('half', 'コップ半分', 100), ml('one', 'コップ1杯', 200, true), ml('big', '200ml', 200)],
  }),
  {
    key: 'soy_milk',
    label: '豆乳',
    detailUi: 'attribute',
    baseMacroPer100: { kcal: 46, protein: 3.6, fat: 2, carbs: 3.1 },
    attributes: ATTR_SOY,
    defaultAttributeKey: 'plain',
    amountCandidates: [ml('half', 'コップ半分', 100), ml('one', 'コップ1杯', 200, true), ml('big', '200ml', 200)],
  },
  s({
    key: 'tofu',
    label: '豆腐',
    baseMacroPer100: { kcal: 60, protein: 5, fat: 3.5, carbs: 2 },
    amountCandidates: [g('half_block', '半丁', 150, true), g('one_block', '1丁', 300), g('100g', '100g', 100)],
  }),
  s({
    key: 'natto',
    label: '納豆',
    baseMacroPer100: { kcal: 200, protein: 16.5, fat: 10, carbs: 12 },
    amountCandidates: [pc('one', '1パック', 1, true), pc('two', '2パック', 2)],
  }),
  s({
    key: 'cheese',
    label: 'チーズ',
    baseMacroPer100: { kcal: 339, protein: 22, fat: 26, carbs: 1.9 },
    amountCandidates: [g('one_slice', '1枚', 18), g('two_slice', '2枚', 36), g('20g', '20g', 20, true)],
  }),
];

// ---------------------------------------------------------------------------
// 6. veggies / 野菜
// ---------------------------------------------------------------------------

const VEGGIES: QuickLogSubcategory[] = [
  s({
    key: 'salad',
    label: 'サラダ',
    baseMacroPer100: { kcal: 25, protein: 1.4, fat: 0.3, carbs: 5 },
    amountCandidates: [g('small', '小', 70), g('regular', '普通', 140, true), g('large', '大', 210)],
  }),
  s({
    key: 'steamed_veg',
    label: '温野菜',
    baseMacroPer100: { kcal: 30, protein: 1.5, fat: 0.2, carbs: 6 },
    amountCandidates: [g('small', '小', 70), g('regular', '普通', 140, true), g('large', '大', 210)],
  }),
  s({
    key: 'veggie_side',
    label: '野菜副菜',
    baseMacroPer100: { kcal: 45, protein: 1.7, fat: 0.5, carbs: 8 },
    amountCandidates: [g('side', '小鉢', 70, true), g('plate', '1皿', 140)],
  }),
  s({
    key: 'stir_fry_veg',
    label: '炒め野菜',
    baseMacroPer100: { kcal: 60, protein: 1.6, fat: 3, carbs: 6 },
    amountCandidates: [g('small', '小', 80), g('regular', '普通', 160, true), g('large', '大', 240)],
  }),
  s({
    key: 'veggie_soup',
    label: '野菜スープ',
    baseMacroPer100: { kcal: 18, protein: 0.6, fat: 0.4, carbs: 3 },
    amountCandidates: [ml('one', '1杯', 300, true), ml('big', '大きめ', 450)],
  }),
  s({
    key: 'pickles',
    label: '漬物',
    baseMacroPer100: { kcal: 35, protein: 1.5, fat: 0.2, carbs: 7 },
    amountCandidates: [g('few', '少量', 15), g('side', '小皿', 30, true)],
  }),
];

// ---------------------------------------------------------------------------
// 7. fruit / 果物
// ---------------------------------------------------------------------------

const FRUIT: QuickLogSubcategory[] = [
  s({
    key: 'apple_pear',
    label: 'りんご・梨',
    baseMacroPer100: { kcal: 54, protein: 0.2, fat: 0.2, carbs: 14 },
    amountCandidates: [g('half', '半分', 150), g('one', '1個', 250, true)],
  }),
  s({
    key: 'banana',
    label: 'バナナ',
    baseMacroPer100: { kcal: 86, protein: 1.1, fat: 0.2, carbs: 22 },
    amountCandidates: [g('half', '半分', 50), g('one', '1本', 100, true)],
  }),
  s({
    key: 'berry_mix',
    label: 'ベリー・ミックス',
    baseMacroPer100: { kcal: 50, protein: 0.8, fat: 0.4, carbs: 12 },
    amountCandidates: [g('cup', '1カップ', 100, true), g('100g', '100g', 100)],
  }),
  s({
    key: 'citrus',
    label: '柑橘',
    baseMacroPer100: { kcal: 46, protein: 0.7, fat: 0.1, carbs: 12 },
    amountCandidates: [g('half', '半分', 50), g('one', '1個', 100, true)],
  }),
  s({
    key: 'cut_fruit',
    label: 'カットフルーツ',
    baseMacroPer100: { kcal: 60, protein: 0.6, fat: 0.2, carbs: 15 },
    amountCandidates: [g('half', '半パック', 50), g('one', '1パック', 100, true)],
  }),
];

// ---------------------------------------------------------------------------
// 8. added_fat / 追加脂質
// ---------------------------------------------------------------------------

const ADDED_FAT: QuickLogSubcategory[] = [
  s({
    key: 'oil_dressing',
    label: 'オイル・ドレッシング',
    baseMacroPer100: { kcal: 740, protein: 0.3, fat: 80, carbs: 3 },
    amountCandidates: [ml('tsp', '小さじ1', 5, true), ml('tbsp', '大さじ1', 15)],
  }),
  s({
    key: 'butter',
    label: 'バター・マーガリン',
    baseMacroPer100: { kcal: 745, protein: 0.6, fat: 81, carbs: 0.2 },
    amountCandidates: [g('5g', '5g', 5, true), g('10g', '10g', 10), g('one', '1個', 8)],
  }),
  s({
    key: 'mayo',
    label: 'マヨ・クリーミー系',
    baseMacroPer100: { kcal: 670, protein: 1.5, fat: 73, carbs: 4 },
    amountCandidates: [g('tsp', '小さじ1', 5, true), g('tbsp', '大さじ1', 15)],
  }),
];

// ---------------------------------------------------------------------------
// 9. snack_drink / 間食・甘飲
// ---------------------------------------------------------------------------

const SNACK_DRINK: QuickLogSubcategory[] = [
  s({
    key: 'chocolate_candy',
    label: 'チョコ・キャンディ',
    baseMacroPer100: { kcal: 550, protein: 6.5, fat: 33, carbs: 56 },
    amountCandidates: [g('one', '1個', 10), g('three', '3個', 30, true), g('bag', '1袋', 60)],
  }),
  s({
    key: 'baked_sweets',
    label: '焼き菓子',
    baseMacroPer100: { kcal: 440, protein: 6, fat: 20, carbs: 56 },
    amountCandidates: [g('one', '1個', 50, true), g('two', '2個', 100)],
  }),
  s({
    key: 'snack',
    label: 'スナック菓子',
    baseMacroPer100: { kcal: 530, protein: 6, fat: 30, carbs: 60 },
    amountCandidates: [g('half_bag', '半袋', 30), g('bag', '1袋', 60, true)],
  }),
  s({
    key: 'ice',
    label: 'アイス・冷菓',
    baseMacroPer100: { kcal: 200, protein: 3.5, fat: 9, carbs: 25 },
    amountCandidates: [g('half', '半分', 50), g('one', '1個', 100, true)],
  }),
  s({
    key: 'sweet_bread',
    label: '菓子パン',
    baseMacroPer100: { kcal: 300, protein: 6, fat: 10, carbs: 45 },
    amountCandidates: [g('half', '半分', 50), g('one', '1個', 100, true)],
  }),
  s({
    key: 'nuts',
    label: 'ナッツ・種',
    baseMacroPer100: { kcal: 600, protein: 20, fat: 50, carbs: 20 },
    amountCandidates: [g('handful', '1つかみ', 15), g('20g', '20g', 20, true)],
  }),
  s({
    key: 'sweet_drink',
    label: '甘い飲料',
    baseMacroPer100: { kcal: 45, protein: 0, fat: 0, carbs: 11 },
    amountCandidates: [ml('200', '200ml', 200, true), ml('350', '350ml', 350), ml('500', '500ml', 500)],
  }),
];

// ---------------------------------------------------------------------------
// Top-level master
// ---------------------------------------------------------------------------

export const quickLogMaster: QuickLogCategoryDef[] = [
  { key: 'staple', label: '主食', emoji: '🍚', subcategories: STAPLE },
  { key: 'lean_protein', label: '低脂P', emoji: '🐓', subcategories: LEAN_PROTEIN },
  { key: 'egg', label: '卵', emoji: '🥚', subcategories: EGG },
  { key: 'fatty_protein', label: '脂ありP', emoji: '🥩', subcategories: FATTY_PROTEIN },
  { key: 'dairy_soy', label: '乳・大豆', emoji: '🥛', subcategories: DAIRY_SOY },
  { key: 'veggies', label: '野菜', emoji: '🥦', subcategories: VEGGIES },
  { key: 'fruit', label: '果物', emoji: '🍎', subcategories: FRUIT },
  { key: 'added_fat', label: '追加脂質', emoji: '🧈', subcategories: ADDED_FAT },
  { key: 'snack_drink', label: '間食・甘飲', emoji: '🍩', subcategories: SNACK_DRINK },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getQuickLogCategory(categoryKey: string): QuickLogCategoryDef | undefined {
  return quickLogMaster.find((c) => c.key === categoryKey);
}

export function getQuickLogSubcategory(
  categoryKey: string,
  subcategoryKey: string
): QuickLogSubcategory | undefined {
  return getQuickLogCategory(categoryKey)?.subcategories.find((s) => s.key === subcategoryKey);
}

export function getDefaultAmountCandidate(sub: QuickLogSubcategory): AmountCandidate {
  return sub.amountCandidates.find((c) => c.isDefault) ?? sub.amountCandidates[0];
}
