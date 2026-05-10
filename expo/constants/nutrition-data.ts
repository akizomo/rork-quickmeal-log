import { AdditionPreset, AppSettings, BodyFatEntry, DishSize, IngredientSubtypeDef, PortionDisplay, PortionStepKey, QuickCategory, SubTypePreset, UserProfile, WeightEntry } from '@/types/nutrition';

export const ingredientCategories: QuickCategory[] = [
  { key: 'staple', label: 'ごはんパン麺', emoji: '🍚', baseMacro: { kcal: 240, protein: 4, fat: 0.5, carbs: 53 } },
  { key: 'lean_protein', label: '低脂P', emoji: '🐓', baseMacro: { kcal: 120, protein: 22, fat: 3, carbs: 0 } },
  { key: 'egg', label: '卵', emoji: '🥚', baseMacro: { kcal: 80, protein: 6, fat: 5.5, carbs: 0 } },
  { key: 'fatty_protein', label: '脂ありP', emoji: '🥩', baseMacro: { kcal: 220, protein: 18, fat: 15, carbs: 0 } },
  { key: 'dairy_soy', label: '乳・大豆', emoji: '🥛', baseMacro: { kcal: 60, protein: 4, fat: 2.5, carbs: 5 } },
  { key: 'veggies', label: '野菜', emoji: '🥦', baseMacro: { kcal: 40, protein: 2, fat: 0.3, carbs: 7 } },
  { key: 'fruit', label: '果物', emoji: '🍎', baseMacro: { kcal: 80, protein: 0.5, fat: 0.2, carbs: 20 } },
  { key: 'added_fat', label: '追加脂質', emoji: '🧈', baseMacro: { kcal: 90, protein: 0, fat: 10, carbs: 0 } },
  { key: 'snack_drink', label: '間食・甘飲', emoji: '🍩', baseMacro: { kcal: 150, protein: 2, fat: 6, carbs: 22 } },
];

export const dishCategories: QuickCategory[] = [
  { key: 'rice_dish', label: 'ごはんもの', emoji: '🥣', baseMacro: { kcal: 650, protein: 24, fat: 20, carbs: 90 } },
  { key: 'curry', label: 'カレー', emoji: '🍛', baseMacro: { kcal: 720, protein: 21, fat: 23, carbs: 103 } },
  { key: 'chinese_noodles', label: '中華麺', emoji: '🍜', baseMacro: { kcal: 650, protein: 25, fat: 14, carbs: 96 } },
  { key: 'japanese_noodles', label: '和麺', emoji: '🍲', baseMacro: { kcal: 485, protein: 15, fat: 7, carbs: 88 } },
  { key: 'pasta', label: 'パスタ', emoji: '🍝', baseMacro: { kcal: 680, protein: 22, fat: 25, carbs: 91 } },
  { key: 'sushi', label: '寿司', emoji: '🍣', baseMacro: { kcal: 130, protein: 7, fat: 4, carbs: 16.4 } },
  { key: 'sandwich', label: 'サンド', emoji: '🥪', baseMacro: { kcal: 360, protein: 16, fat: 19, carbs: 32 } },
  { key: 'pizza', label: 'ピザ', emoji: '🍕', baseMacro: { kcal: 150, protein: 6, fat: 6, carbs: 18 } },
  { key: 'set_meal', label: '定食・弁当', emoji: '🍱', baseMacro: { kcal: 820, protein: 32, fat: 30, carbs: 102 } },
];

const TOPPING_RICE = [
  { key: 'egg_top', label: '卵', macroDelta: { kcal: 80, protein: 6, fat: 5.5, carbs: 0 } },
  { key: 'natto_top', label: '納豆', macroDelta: { kcal: 100, protein: 8, fat: 5, carbs: 6 } },
  { key: 'furikake', label: 'ふりかけ', macroDelta: { kcal: 15, protein: 1, fat: 0.3, carbs: 2 } },
  { key: 'mentaiko', label: '明太子', macroDelta: { kcal: 40, protein: 5, fat: 2, carbs: 0 } },
  { key: 'butter_top', label: 'バター', macroDelta: { kcal: 70, protein: 0, fat: 8, carbs: 0 } },
];

const TOPPING_BREAD = [
  { key: 'butter_top', label: 'バター', macroDelta: { kcal: 70, protein: 0, fat: 8, carbs: 0 } },
  { key: 'jam_top', label: 'ジャム', macroDelta: { kcal: 50, protein: 0, fat: 0, carbs: 13 } },
  { key: 'honey_top', label: 'はちみつ', macroDelta: { kcal: 45, protein: 0, fat: 0, carbs: 12 } },
  { key: 'cheese_top', label: 'チーズ', macroDelta: { kcal: 80, protein: 5, fat: 6, carbs: 1 } },
  { key: 'ham_top', label: 'ハム', macroDelta: { kcal: 40, protein: 4, fat: 2, carbs: 0 } },
];

const TOPPING_YOGURT = [
  { key: 'honey_top', label: 'はちみつ', macroDelta: { kcal: 45, protein: 0, fat: 0, carbs: 12 } },
  { key: 'granola_top', label: 'グラノーラ', macroDelta: { kcal: 120, protein: 2, fat: 5, carbs: 18 } },
  { key: 'fruit_top', label: 'フルーツ', macroDelta: { kcal: 40, protein: 0.5, fat: 0.2, carbs: 10 } },
  { key: 'nuts_top', label: 'ナッツ', macroDelta: { kcal: 90, protein: 3, fat: 8, carbs: 2 } },
];

const TOPPING_SALAD = [
  { key: 'dressing_top', label: 'ドレッシング', macroDelta: { kcal: 60, protein: 0, fat: 6, carbs: 2 } },
  { key: 'cheese_top', label: 'チーズ', macroDelta: { kcal: 80, protein: 5, fat: 6, carbs: 1 } },
  { key: 'nuts_top', label: 'ナッツ', macroDelta: { kcal: 90, protein: 3, fat: 8, carbs: 2 } },
  { key: 'boiled_egg_top', label: 'ゆで卵', macroDelta: { kcal: 80, protein: 6.5, fat: 5.5, carbs: 0 } },
  { key: 'avocado_top', label: 'アボカド', macroDelta: { kcal: 160, protein: 2, fat: 15, carbs: 6 } },
];

const TOPPING_OATMEAL = [
  { key: 'milk_top', label: '牛乳', macroDelta: { kcal: 60, protein: 3, fat: 3.5, carbs: 5 } },
  { key: 'banana_top', label: 'バナナ', macroDelta: { kcal: 45, protein: 0.5, fat: 0.1, carbs: 11 } },
  { key: 'honey_top', label: 'はちみつ', macroDelta: { kcal: 30, protein: 0, fat: 0, carbs: 8 } },
  { key: 'nuts_top', label: 'ナッツ', macroDelta: { kcal: 90, protein: 3, fat: 8, carbs: 2 } },
  { key: 'berry_top', label: 'ベリー', macroDelta: { kcal: 25, protein: 0.4, fat: 0.2, carbs: 6 } },
];

const d = (primaryLabel: string, secondaryLabel: string, helperLabel?: string): PortionDisplay => ({
  primaryLabel,
  secondaryLabel,
  ...(helperLabel ? { helperLabel } : {}),
});

const steps = (
  half: PortionDisplay,
  one: PortionDisplay,
  oneHalf: PortionDisplay,
  two: PortionDisplay
): Record<PortionStepKey, PortionDisplay> => ({
  '0.5': half,
  '1': one,
  '1.5': oneHalf,
  '2': two,
});

export const ingredientSubtypeDefs: Record<string, IngredientSubtypeDef[]> = {
  staple: [
    {
      key: 'rice',
      label: 'ごはん',
      baselineLabel: '茶碗1杯',
      baseMacro: { kcal: 234, protein: 3.8, fat: 0.5, carbs: 55 },
      portionDisplays: steps(
        d('半膳', '約75g', '少なめ'),
        d('茶碗1杯', '約150g', '標準'),
        d('茶碗1.5杯', '約225g', 'やや多め'),
        d('茶碗2杯', '約300g', '多め')
      ),
      toppings: TOPPING_RICE,
    },
    {
      key: 'bread',
      label: 'パン',
      baselineLabel: '食パン1枚（6枚切り目安）',
      baseMacro: { kcal: 149, protein: 5.3, fat: 2.5, carbs: 27.8 },
      portionDisplays: steps(
        d('半枚', '約30g', '少なめ'),
        d('1枚', '約60g', '標準'),
        d('1.5枚', '約90g', 'やや多め'),
        d('2枚', '約120g', '多め')
      ),
      toppings: TOPPING_BREAD,
    },
    {
      key: 'oatmeal',
      label: 'オートミール',
      baselineLabel: '1食分 約30g',
      baseMacro: { kcal: 105, protein: 4, fat: 2, carbs: 20.7 },
      portionDisplays: steps(
        d('軽め1食', '約15g', '少なめ'),
        d('1食分', '約30g', '標準'),
        d('しっかり1食', '約45g', 'やや多め'),
        d('大きめ1食', '約60g', '多め')
      ),
      toppings: TOPPING_OATMEAL,
    },
    {
      key: 'cereal_granola',
      label: 'シリアル・グラノラ',
      baselineLabel: '1食分 約50g',
      baseMacro: { kcal: 223, protein: 4.5, fat: 7.8, carbs: 35.5 },
      portionDisplays: steps(
        d('軽め1食', '約25g', '少なめ'),
        d('1食分', '約50g', '標準'),
        d('大きめ1食', '約75g', 'やや多め'),
        d('しっかり1食', '約100g', '多め')
      ),
      toppings: TOPPING_OATMEAL,
    },
    {
      key: 'potato',
      label: 'いも',
      baselineLabel: '小1個 約100g',
      baseMacro: { kcal: 76, protein: 1.9, fat: 0.1, carbs: 17.3 },
      portionDisplays: steps(
        d('ひと口分', '約50g', '少なめ'),
        d('小1個分', '約100g', '標準'),
        d('1.5個分', '約150g', 'やや多め'),
        d('しっかり1個', '約200g', '多め')
      ),
    },
  ],
  egg: [
    {
      key: 'whole_egg',
      label: '全卵',
      baselineLabel: '1個 約50g',
      baseMacro: { kcal: 80, protein: 6, fat: 5.5, carbs: 0 },
      portionDisplays: steps(
        d('半個', '約25g', '少なめ'),
        d('1個', '約50g', '標準'),
        d('1.5個', '約75g', 'やや多め'),
        d('2個', '約100g', '多め')
      ),
    },
    {
      key: 'boiled_egg',
      label: 'ゆで卵',
      baselineLabel: '1個 約50g',
      baseMacro: { kcal: 80, protein: 6.5, fat: 5.5, carbs: 0 },
      portionDisplays: steps(
        d('半個', '約25g', '少なめ'),
        d('1個', '約50g', '標準'),
        d('1.5個', '約75g', 'やや多め'),
        d('2個', '約100g', '多め')
      ),
    },
    {
      key: 'fried_egg',
      label: '目玉焼き',
      baselineLabel: '1個',
      baseMacro: { kcal: 100, protein: 6, fat: 8, carbs: 0 },
      portionDisplays: steps(
        d('半個', '約25g', '少なめ'),
        d('1個', '約50g', '標準'),
        d('1.5個', '約75g', 'やや多め'),
        d('2個', '約100g', '多め')
      ),
    },
    {
      key: 'rolled_egg',
      label: '卵焼き',
      baselineLabel: '2切れ',
      baseMacro: { kcal: 120, protein: 8, fat: 8, carbs: 2 },
      portionDisplays: steps(
        d('1切れ', '約30g', '少なめ'),
        d('2切れ', '約60g', '標準'),
        d('3切れ', '約90g', 'やや多め'),
        d('4切れ', '約120g', '多め')
      ),
    },
  ],
  dairy_soy: [
    {
      key: 'yogurt',
      label: 'ヨーグルト',
      baselineLabel: '1カップ 約100〜120g',
      baseMacro: { kcal: 74, protein: 4.3, fat: 3.6, carbs: 5.9 },
      portionDisplays: steps(
        d('半カップ', '約50〜60g', '少なめ'),
        d('1カップ', '約100〜120g', '標準'),
        d('1.5カップ', '約150〜180g', 'やや多め'),
        d('2カップ', '約200〜240g', '多め')
      ),
      toppings: TOPPING_YOGURT,
    },
    {
      key: 'milk',
      label: '牛乳',
      baselineLabel: 'コップ1杯 約200ml',
      baseMacro: { kcal: 134, protein: 6.6, fat: 7.6, carbs: 9.6 },
      portionDisplays: steps(
        d('コップ半分', '約100ml', '少なめ'),
        d('コップ1杯', '約200ml', '標準'),
        d('コップ1.5杯', '約300ml', 'やや多め'),
        d('コップ2杯', '約400ml', '多め')
      ),
    },
    {
      key: 'soy_milk',
      label: '豆乳',
      baselineLabel: 'コップ1杯 約200ml',
      baseMacro: { kcal: 92, protein: 7, fat: 4, carbs: 6 },
      portionDisplays: steps(
        d('コップ半分', '約100ml', '少なめ'),
        d('コップ1杯', '約200ml', '標準'),
        d('コップ1.5杯', '約300ml', 'やや多め'),
        d('コップ2杯', '約400ml', '多め')
      ),
    },
    {
      key: 'tofu',
      label: '豆腐',
      baselineLabel: '1/2丁 約150g',
      baseMacro: { kcal: 90, protein: 7.5, fat: 5.3, carbs: 3 },
      portionDisplays: steps(
        d('1/4丁', '約75g', '少なめ'),
        d('1/2丁', '約150g', '標準'),
        d('3/4丁', '約225g', 'やや多め'),
        d('1丁', '約300g', '多め')
      ),
    },
    {
      key: 'natto',
      label: '納豆',
      baselineLabel: '1パック 約50g',
      baseMacro: { kcal: 100, protein: 8, fat: 5, carbs: 6 },
      portionDisplays: steps(
        d('半パック', '約25g', '少なめ'),
        d('1パック', '約50g', '標準'),
        d('1.5パック', '約75g', 'やや多め'),
        d('2パック', '約100g', '多め')
      ),
    },
    {
      key: 'cheese',
      label: 'チーズ',
      baselineLabel: '1人分 約20g',
      baseMacro: { kcal: 68, protein: 4.4, fat: 5.3, carbs: 0.4 },
      portionDisplays: steps(
        d('ひと口分', '約10g', '少なめ'),
        d('1人分', '約20g', '標準'),
        d('やや多め', '約30g', 'やや多め'),
        d('しっかり', '約40g', '多め')
      ),
    },
  ],
  veggies: [
    {
      key: 'salad',
      label: 'サラダ',
      baselineLabel: '1皿 約140g',
      baseMacro: { kcal: 35, protein: 2, fat: 0.4, carbs: 7 },
      portionDisplays: steps(
        d('小皿', '約70g', '少なめ'),
        d('1食分', '約140g', '標準'),
        d('大きめ1食', '約210g', 'やや多め'),
        d('しっかり1食', '約280g', '多め')
      ),
      toppings: TOPPING_SALAD,
    },
    {
      key: 'cooked_veg',
      label: '温野菜',
      baselineLabel: '1食分 約140g',
      baseMacro: { kcal: 40, protein: 2, fat: 0.3, carbs: 8 },
      portionDisplays: steps(
        d('小皿', '約70g', '少なめ'),
        d('1食分', '約140g', '標準'),
        d('大きめ1食', '約210g', 'やや多め'),
        d('しっかり1食', '約280g', '多め')
      ),
    },
    {
      key: 'side_veg',
      label: '野菜副菜',
      baselineLabel: '1小鉢分 約70g',
      baseMacro: { kcal: 30, protein: 1.2, fat: 0.3, carbs: 6 },
      portionDisplays: steps(
        d('少なめ', '約35g', '少なめ'),
        d('1小鉢分', '約70g', '標準'),
        d('やや多め', '約105g', 'やや多め'),
        d('2小鉢分', '約140g', '多め')
      ),
    },
    {
      key: 'stirfry_veg',
      label: '炒め野菜',
      baselineLabel: '1皿分 約160g',
      baseMacro: { kcal: 90, protein: 2.5, fat: 5, carbs: 9 },
      portionDisplays: steps(
        d('小皿', '約80g', '少なめ'),
        d('1皿分', '約160g', '標準'),
        d('大きめ1皿', '約240g', 'やや多め'),
        d('しっかり1皿', '約320g', '多め')
      ),
    },
    {
      key: 'veg_soup',
      label: '野菜スープ',
      baselineLabel: '1カップ 約300ml',
      baseMacro: { kcal: 45, protein: 1.5, fat: 1, carbs: 8 },
      portionDisplays: steps(
        d('小カップ', '約150ml', '少なめ'),
        d('1カップ', '約300ml', '標準'),
        d('大きめ1杯', '約450ml', 'やや多め'),
        d('2杯分', '約600ml', '多め')
      ),
    },
    {
      key: 'pickle',
      label: '漬物',
      baselineLabel: '小鉢1つ 約30g',
      baseMacro: { kcal: 20, protein: 1, fat: 0, carbs: 4 },
      portionDisplays: steps(
        d('少なめ', '約15g', '少なめ'),
        d('小鉢1つ', '約30g', '標準'),
        d('やや多め', '約45g', 'やや多め'),
        d('多め', '約60g', '多め')
      ),
    },
  ],
  lean_protein: [
    {
      key: 'chicken_breast',
      label: '鶏むね・ささみ',
      baselineLabel: '手のひら1枚 約100g',
      baseMacro: { kcal: 120, protein: 22, fat: 3, carbs: 0 },
      portionDisplays: steps(
        d('小さめ', '約50g', '少なめ'),
        d('手のひら1枚', '約100g', '標準'),
        d('手のひら1.5枚', '約150g', 'やや多め'),
        d('手のひら2枚', '約200g', '多め')
      ),
    },
    {
      key: 'tuna',
      label: 'ツナ・サラダチキン',
      baselineLabel: '1パック 約100g',
      baseMacro: { kcal: 120, protein: 24, fat: 1.5, carbs: 1 },
      portionDisplays: steps(
        d('半パック', '約50g', '少なめ'),
        d('1パック', '約100g', '標準'),
        d('1.5パック', '約150g', 'やや多め'),
        d('2パック', '約200g', '多め')
      ),
    },
    {
      key: 'white_fish',
      label: '白身魚・赤身魚',
      baselineLabel: '標準1切れ 約80g',
      baseMacro: { kcal: 110, protein: 18, fat: 2, carbs: 0 },
      portionDisplays: steps(
        d('小さめ1切れ', '約50g', '少なめ'),
        d('標準1切れ', '約80g', '標準'),
        d('大きめ1切れ', '約120g', 'やや多め'),
        d('2切れ', '約160g', '多め')
      ),
    },
    {
      key: 'shrimp',
      label: 'えび・いか・たこ',
      baselineLabel: '1食分 約80g',
      baseMacro: { kcal: 75, protein: 15.5, fat: 0.8, carbs: 1 },
      portionDisplays: steps(
        d('少なめ', '約40g', '少なめ'),
        d('1食分', '約80g', '標準'),
        d('やや多め', '約120g', 'やや多め'),
        d('しっかり', '約160g', '多め')
      ),
    },
  ],
  fatty_protein: [
    {
      key: 'beef',
      label: '牛肉',
      baselineLabel: '手のひら1枚 約100g',
      baseMacro: { kcal: 230, protein: 17, fat: 17, carbs: 0 },
      portionDisplays: steps(
        d('小さめ', '約50g', '少なめ'),
        d('手のひら1枚', '約100g', '標準'),
        d('手のひら1.5枚', '約150g', 'やや多め'),
        d('手のひら2枚', '約200g', '多め')
      ),
    },
    {
      key: 'pork',
      label: '豚肉',
      baselineLabel: '手のひら1枚 約100g',
      baseMacro: { kcal: 220, protein: 18, fat: 15, carbs: 0 },
      portionDisplays: steps(
        d('小さめ', '約50g', '少なめ'),
        d('手のひら1枚', '約100g', '標準'),
        d('手のひら1.5枚', '約150g', 'やや多め'),
        d('手のひら2枚', '約200g', '多め')
      ),
    },
    {
      key: 'chicken_thigh',
      label: '鶏もも',
      baselineLabel: '手のひら1枚 約100g',
      baseMacro: { kcal: 200, protein: 17, fat: 14, carbs: 0 },
      portionDisplays: steps(
        d('小さめ', '約50g', '少なめ'),
        d('手のひら1枚', '約100g', '標準'),
        d('手のひら1.5枚', '約150g', 'やや多め'),
        d('手のひら2枚', '約200g', '多め')
      ),
    },
    {
      key: 'salmon',
      label: '鮭・青魚',
      baselineLabel: '1切れ 約100g',
      baseMacro: { kcal: 200, protein: 20, fat: 12, carbs: 0 },
      portionDisplays: steps(
        d('小さめ', '約50g', '少なめ'),
        d('1切れ', '約100g', '標準'),
        d('1切れ半', '約150g', 'やや多め'),
        d('2切れ', '約200g', '多め')
      ),
    },
    {
      key: 'processed_meat',
      label: '加工肉',
      baselineLabel: 'ハム2枚・ウインナー2本 約50g',
      baseMacro: { kcal: 145, protein: 6.5, fat: 12, carbs: 1 },
      portionDisplays: steps(
        d('少なめ', '約25g', '少なめ'),
        d('ハム2枚/ウインナー2本', '約50g', '標準'),
        d('やや多め', '約75g', 'やや多め'),
        d('しっかり', '約100g', '多め')
      ),
    },
  ],
  fruit: [
    {
      key: 'apple',
      label: 'りんご・梨',
      baselineLabel: '標準1/2個 約150g',
      baseMacro: { kcal: 80, protein: 0.3, fat: 0.2, carbs: 20 },
      portionDisplays: steps(
        d('1/4個', '約75g', '少なめ'),
        d('1/2個', '約150g', '標準'),
        d('3/4個', '約225g', 'やや多め'),
        d('1個', '約300g', '多め')
      ),
    },
    {
      key: 'banana',
      label: 'バナナ',
      baselineLabel: '1本 約100g',
      baseMacro: { kcal: 90, protein: 1, fat: 0.2, carbs: 22 },
      portionDisplays: steps(
        d('半分', '約50g', '少なめ'),
        d('1本', '約100g', '標準'),
        d('1.5本', '約150g', 'やや多め'),
        d('2本', '約200g', '多め')
      ),
    },
    {
      key: 'berries',
      label: 'ベリー・ミックス',
      baselineLabel: '1食分 約100g',
      baseMacro: { kcal: 60, protein: 1, fat: 0.5, carbs: 15 },
      portionDisplays: steps(
        d('ひとつかみ', '約50g', '少なめ'),
        d('1食分', '約100g', '標準'),
        d('やや多め', '約150g', 'やや多め'),
        d('たっぷり', '約200g', '多め')
      ),
    },
    {
      key: 'citrus',
      label: '柑橘',
      baselineLabel: '1個 約100g',
      baseMacro: { kcal: 50, protein: 1, fat: 0.1, carbs: 12 },
      portionDisplays: steps(
        d('半分', '約50g', '少なめ'),
        d('1個', '約100g', '標準'),
        d('1.5個', '約150g', 'やや多め'),
        d('2個', '約200g', '多め')
      ),
    },
    {
      key: 'cut_fruit',
      label: 'カットフルーツ',
      baselineLabel: '1パック 約100g',
      baseMacro: { kcal: 65, protein: 0.6, fat: 0.2, carbs: 16 },
      portionDisplays: steps(
        d('少なめ', '約50g', '少なめ'),
        d('1パック目安', '約100g', '標準'),
        d('大きめ1パック', '約150g', 'やや多め'),
        d('たっぷり', '約200g', '多め')
      ),
    },
  ],
  added_fat: [
    {
      key: 'oil',
      label: 'オイル・ドレッシング',
      baselineLabel: '小さじ2 約10ml',
      baseMacro: { kcal: 74, protein: 0, fat: 8, carbs: 0.3 },
      portionDisplays: steps(
        d('小さじ1', '約5ml', '少なめ'),
        d('小さじ2', '約10ml', '標準'),
        d('大さじ1', '約15ml', 'やや多め'),
        d('大さじ1強', '約20ml', '多め')
      ),
    },
    {
      key: 'butter',
      label: 'バター・マーガリン',
      baselineLabel: '小さじ2 約10g',
      baseMacro: { kcal: 75, protein: 0.1, fat: 8.2, carbs: 0.1 },
      portionDisplays: steps(
        d('小さじ1弱', '約5g', '少なめ'),
        d('小さじ2', '約10g', '標準'),
        d('大さじ1', '約15g', 'やや多め'),
        d('大さじ1強', '約20g', '多め')
      ),
    },
    {
      key: 'mayo',
      label: 'マヨ・クリーミー系',
      baselineLabel: '小さじ2 約10g',
      baseMacro: { kcal: 67, protein: 0.1, fat: 7.3, carbs: 0.3 },
      portionDisplays: steps(
        d('小さじ1', '約5g', '少なめ'),
        d('小さじ2', '約10g', '標準'),
        d('大さじ1', '約15g', 'やや多め'),
        d('大さじ1強', '約20g', '多め')
      ),
    },
  ],
  snack_drink: [
    {
      key: 'chocolate',
      label: 'チョコ・キャンディ',
      baselineLabel: '5〜6粒 約30g',
      baseMacro: { kcal: 165, protein: 2, fat: 10, carbs: 17 },
      portionDisplays: steps(
        d('2〜3粒', '約15g', '少なめ'),
        d('5〜6粒', '約30g', '標準'),
        d('小袋弱', '約45g', 'やや多め'),
        d('小袋1つ', '約60g', '多め')
      ),
    },
    {
      key: 'cookie',
      label: '焼き菓子',
      baselineLabel: '標準1個 約50g',
      baseMacro: { kcal: 220, protein: 3, fat: 10, carbs: 28 },
      portionDisplays: steps(
        d('ひと口サイズ', '約25g', '少なめ'),
        d('標準1個', '約50g', '標準'),
        d('大きめ1個', '約75g', 'やや多め'),
        d('2個分', '約100g', '多め')
      ),
    },
    {
      key: 'snack_chips',
      label: 'スナック菓子',
      baselineLabel: '2つかみ 約30g',
      baseMacro: { kcal: 160, protein: 2, fat: 9, carbs: 18 },
      portionDisplays: steps(
        d('ひとつかみ', '約15g', '少なめ'),
        d('2つかみ', '約30g', '標準'),
        d('小袋弱', '約45g', 'やや多め'),
        d('小袋1つ', '約60g', '多め')
      ),
    },
    {
      key: 'ice_cream',
      label: 'アイス・冷菓',
      baselineLabel: '標準1個 約100ml',
      baseMacro: { kcal: 180, protein: 3, fat: 9, carbs: 22 },
      portionDisplays: steps(
        d('ミニ', '約50ml', '少なめ'),
        d('標準1個', '約100ml', '標準'),
        d('大きめ1個', '約150ml', 'やや多め'),
        d('たっぷり1個', '約200ml', '多め')
      ),
    },
    {
      key: 'sweet_bread',
      label: '菓子パン',
      baselineLabel: '標準1個 約100g',
      baseMacro: { kcal: 300, protein: 6, fat: 10, carbs: 45 },
      portionDisplays: steps(
        d('半分', '約50g', '少なめ'),
        d('標準1個', '約100g', '標準'),
        d('大きめ1個', '約150g', 'やや多め'),
        d('2個分', '約200g', '多め')
      ),
    },
    {
      key: 'nuts',
      label: 'ナッツ・種',
      baselineLabel: '2つまみ 約20g',
      baseMacro: { kcal: 120, protein: 4, fat: 10, carbs: 4 },
      portionDisplays: steps(
        d('ひとつまみ', '約10g', '少なめ'),
        d('2つまみ', '約20g', '標準'),
        d('小さめ1袋', '約30g', 'やや多め'),
        d('しっかり1袋', '約40g', '多め')
      ),
    },
    {
      key: 'juice',
      label: '甘い飲料',
      baselineLabel: '200ml',
      baseMacro: { kcal: 90, protein: 0, fat: 0, carbs: 22 },
      portionDisplays: steps(
        d('コップ半分', '約100ml', '少なめ'),
        d('コップ1杯', '約200ml', '標準'),
        d('ペット半分', '約300ml', 'やや多め'),
        d('ペット1本', '約500ml', '多め')
      ),
    },
  ],
};

export const ingredientSubtypes: Record<string, SubTypePreset[]> = Object.fromEntries(
  Object.entries(ingredientSubtypeDefs).map(([key, list]) => [
    key,
    list.map((item) => ({ key: item.key, label: item.label })),
  ])
);

export const dishSubtypes: Record<string, SubTypePreset[]> = {
  ramen: [
    { key: 'shoyu', label: '醤油' },
    { key: 'shio', label: '塩', macroDelta: { kcal: -30, protein: 0, fat: -1, carbs: -2 } },
    { key: 'miso', label: '味噌', macroDelta: { kcal: 70, protein: 3, fat: 3, carbs: 6 } },
    { key: 'tonkotsu', label: '豚骨', macroDelta: { kcal: 120, protein: 4, fat: 8, carbs: 2 } },
    { key: 'abura_soba', label: '油そば', macroDelta: { kcal: 180, protein: 4, fat: 12, carbs: 10 } },
    { key: 'jiro', label: '二郎系', macroDelta: { kcal: 850, protein: 30, fat: 37, carbs: 80 } },
  ],
  curry: [
    { key: 'beef_curry', label: 'ビーフ' },
    { key: 'katsu_curry', label: 'カツ', macroDelta: { kcal: 220, protein: 8, fat: 14, carbs: 10 } },
    { key: 'soup_curry', label: 'スープ', macroDelta: { kcal: -80, protein: 2, fat: -4, carbs: -6 } },
  ],
  rice_dish: [
    { key: 'donburi', label: '丼もの' },
    { key: 'fried_rice', label: '炒飯', macroDelta: { kcal: 110, protein: 3, fat: 5, carbs: 10 } },
    { key: 'taco_rice', label: 'タコライス', macroDelta: { kcal: 90, protein: 5, fat: 3, carbs: 6 } },
  ],
};

export const additionPresets: AdditionPreset[] = [
  { key: 'egg_add', label: '卵追加', macro: { kcal: 70, protein: 6, fat: 5, carbs: 0 } },
  { key: 'meat_add', label: '肉増し', macro: { kcal: 120, protein: 12, fat: 7, carbs: 0 } },
  { key: 'cheese_add', label: 'チーズ', macro: { kcal: 80, protein: 5, fat: 6, carbs: 1 } },
  { key: 'fried_add', label: '揚げ物', macro: { kcal: 250, protein: 10, fat: 18, carbs: 15 } },
  { key: 'fat_add', label: '脂増し', macro: { kcal: 100, protein: 0, fat: 11, carbs: 0 } },
  { key: 'set_add', label: 'セット追加', macro: { kcal: 300, protein: 4, fat: 14, carbs: 38 } },
  { key: 'veg_add', label: '野菜増し', macro: { kcal: 20, protein: 1, fat: 0, carbs: 4 } },
];

export const sizeFactorMap: Record<DishSize, number> = {
  small: 0.8,
  regular: 1,
  large: 1.3,
  extra: 1.6,
};

const now = new Date().toISOString();

export const defaultProfile: UserProfile = {
  id: 'me',
  name: 'You',
  heightCm: null,
  currentWeightKg: null,
  targetWeightKg: null,
  goalType: 'balanced',
  targetCalories: 0,
  targetProtein: 0,
  targetFat: 0,
  targetCarbs: 0,
  ageYears: null,
  biologicalBasis: null,
  currentBodyFatPct: null,
  targetBodyFatPct: null,
  goalDirection: null,
  currentBodyStage: null,
  targetBodyStage: null,
  activityLevel: null,
  createdAt: now,
  updatedAt: now,
};

export const defaultWeightEntries: WeightEntry[] = [];

export const defaultBodyFatEntries: BodyFatEntry[] = [];

export const defaultSettings: AppSettings = {
  defaultTabByTime: {
    morning: 'ingredient',
    noon: 'dish',
    evening: 'dish',
  },
  hapticsEnabled: true,
  soundEnabled: false,
  introSeenVersion: 0,
  onboardingCompleted: false,
  onboardingStep: 0,
  mealStyleBySlot: {
    breakfast: 'unset',
    lunch: 'unset',
    dinner: 'unset',
    snack: 'unset',
  },
  favoriteItemIds: [],
  portionTendency: 'normal',
  trialStartedAtISO: null,
  subscriptionStatus: 'none',
};

export const amountOptions = [0.5, 1, 1.5, 2] as const;
export const portionSnapPoints = [0.5, 1, 1.5, 2] as const;
export const portionHintLabels: Record<string, string> = {
  '0.5': '少なめ',
  '1': 'ふつう',
  '1.5': 'やや多め',
  '2': '多め',
};
export const sizeOptions: DishSize[] = ['small', 'regular', 'large', 'extra'];
