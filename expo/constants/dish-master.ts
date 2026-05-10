import {
  ChineseNoodlesPrimaryType,
  DishPortionOption,
  DishTopCategoryKey,
  Macro,
  PizzaType,
  RamenStyle,
  SetMealType,
  StandardPortionFactor,
  SushiCountMode,
} from '@/types/nutrition';

export interface DishTopping {
  id: string;
  label: string;
  macroDelta: Macro;
}

export const DISH_TOPPINGS: Record<string, DishTopping> = {
  egg: { id: 'egg', label: '卵', macroDelta: { kcal: 80, protein: 6.5, fat: 5.5, carbs: 0.5 } },
  cheese: { id: 'cheese', label: 'チーズ', macroDelta: { kcal: 90, protein: 5, fat: 7, carbs: 1 } },
  kimchi: { id: 'kimchi', label: 'キムチ', macroDelta: { kcal: 20, protein: 1, fat: 0.2, carbs: 3.5 } },
  katsu: { id: 'katsu', label: 'カツ', macroDelta: { kcal: 260, protein: 14, fat: 16, carbs: 15 } },
  seasonedEgg: { id: 'seasonedEgg', label: '味玉', macroDelta: { kcal: 85, protein: 6.5, fat: 6, carbs: 1 } },
  chashu: { id: 'chashu', label: 'チャーシュー', macroDelta: { kcal: 120, protein: 8, fat: 9, carbs: 1 } },
  extraNoodles: { id: 'extraNoodles', label: '替え玉', macroDelta: { kcal: 150, protein: 5, fat: 1, carbs: 31 } },
  onsenEgg: { id: 'onsenEgg', label: '温玉', macroDelta: { kcal: 70, protein: 6, fat: 5, carbs: 0.3 } },
  kitsune: { id: 'kitsune', label: 'きつね', macroDelta: { kcal: 110, protein: 5, fat: 7, carbs: 8 } },
  tempura: { id: 'tempura', label: '天ぷら', macroDelta: { kcal: 140, protein: 4, fat: 9, carbs: 11 } },
  baconExtra: { id: 'baconExtra', label: 'ベーコン追加', macroDelta: { kcal: 70, protein: 4, fat: 6, carbs: 0.5 } },
  extraCheesePizza: { id: 'extraCheesePizza', label: '追加チーズ', macroDelta: { kcal: 110, protein: 6, fat: 8, carbs: 2 } },
};

const PO = {
  riceDish: [
    { factor: 0.5, primaryLabel: '小盛', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '1人前', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大盛', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: '特盛', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  curry: [
    { factor: 0.5, primaryLabel: '小盛', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '1皿', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大盛', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: '特盛', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  noodlesStandard: [
    { factor: 0.75, primaryLabel: '小さめ', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: 'ふつう', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大盛', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: '特盛', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  jiro: [
    { factor: 0.75, primaryLabel: '麺少なめ', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '小', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大', secondaryLabel: 'しっかり' },
  ] as DishPortionOption[],
  japanese: [
    { factor: 0.5, primaryLabel: '小さめ', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '1人前', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大盛', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: '特盛', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  pasta: [
    { factor: 0.5, primaryLabel: '小さめ', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '1皿', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '大盛', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: 'しっかり1皿', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  sandwich: [
    { factor: 0.5, primaryLabel: 'ハーフ', secondaryLabel: '軽め' },
    { factor: 1, primaryLabel: '1個', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: '1.5個分', secondaryLabel: 'しっかり' },
    { factor: 2, primaryLabel: '2個分', secondaryLabel: 'かなりしっかり' },
  ] as DishPortionOption[],
  setMeal: [
    { factor: 0.5, primaryLabel: '軽め', secondaryLabel: '少なめ' },
    { factor: 1, primaryLabel: '1食', secondaryLabel: '標準' },
    { factor: 1.5, primaryLabel: 'しっかり', secondaryLabel: '多め' },
    { factor: 2, primaryLabel: 'かなりしっかり', secondaryLabel: '多め' },
  ] as DishPortionOption[],
};

export interface DishSubcategory {
  key: string;
  label: string;
  baseMacroAt1x: Macro;
  portionOptions: DishPortionOption[];
  allowedToppingIds: string[];
}

export type DishQuickEntryKind =
  | 'instant_save'
  | 'chinese_noodles'
  | 'sushi_count'
  | 'pizza_slices'
  | 'set_meal_select';

export interface InstantSaveConfig {
  kind: 'instant_save';
  defaultSubcategoryKey: string;
  defaultPortionFactor: StandardPortionFactor;
}

export interface RamenStyleDef {
  key: RamenStyle;
  label: string;
  baseMacroAt1x: Macro;
  portionOptions: DishPortionOption[];
  allowedToppingIds: string[];
}

export interface ChineseNoodlePrimaryDef {
  key: ChineseNoodlesPrimaryType;
  label: string;
  baseMacroAt1x?: Macro;
  portionOptions?: DishPortionOption[];
  allowedToppingIds?: string[];
  ramenStyles?: RamenStyleDef[];
}

export interface ChineseNoodlesConfig {
  kind: 'chinese_noodles';
  primaryOptions: ChineseNoodlePrimaryDef[];
}

export interface SushiModeDef {
  key: SushiCountMode;
  label: string;
  unitLabel: string;
  presetCounts: number[];
  min: number;
  max: number;
  macroPerUnit: Macro;
  /** Step between valid counts. Defaults to 1 when absent. */
  step?: number;
}

export interface SushiConfig {
  kind: 'sushi_count';
  defaultMode: SushiCountMode;
  modes: SushiModeDef[];
}

export interface PizzaTypeDef {
  key: PizzaType;
  label: string;
  macroPerSlice: Macro;
}

export interface PizzaConfig {
  kind: 'pizza_slices';
  pizzaTypes: PizzaTypeDef[];
  presetSlices: number[];
  minSlices: number;
  maxSlices: number;
  /** Step between valid slice counts. Defaults to 1 when absent. */
  step?: number;
}

export interface SetMealOptionDef {
  key: SetMealType;
  label: string;
  baseMacroAt1x: Macro;
  portionOptions: DishPortionOption[];
}

export interface SetMealConfig {
  kind: 'set_meal_select';
  options: SetMealOptionDef[];
}

export type DishQuickEntryConfig =
  | InstantSaveConfig
  | ChineseNoodlesConfig
  | SushiConfig
  | PizzaConfig
  | SetMealConfig;

export interface DishTopCategoryDef {
  key: DishTopCategoryKey;
  label: string;
  shortLabel: string;
  emoji: string;
  quickEntry: DishQuickEntryConfig;
  subcategories: DishSubcategory[];
}

const M = (kcal: number, protein: number, fat: number, carbs: number): Macro => ({ kcal, protein, fat, carbs });

export const DISH_TOP_CATEGORIES: DishTopCategoryDef[] = [
  {
    key: 'rice_dish',
    label: 'ごはんもの',
    shortLabel: 'ごはん',
    emoji: '🥣',
    quickEntry: { kind: 'instant_save', defaultSubcategoryKey: 'rice_default', defaultPortionFactor: 1 },
    subcategories: [
      { key: 'gyudon', label: '牛丼', baseMacroAt1x: M(700, 25, 22, 95), portionOptions: PO.riceDish, allowedToppingIds: ['egg', 'cheese', 'kimchi'] },
      { key: 'oyakodon', label: '親子丼', baseMacroAt1x: M(620, 28, 18, 82), portionOptions: PO.riceDish, allowedToppingIds: ['egg', 'cheese'] },
      { key: 'kaisendon', label: '海鮮丼', baseMacroAt1x: M(560, 28, 8, 90), portionOptions: PO.riceDish, allowedToppingIds: [] },
      { key: 'fried_rice', label: 'チャーハン', baseMacroAt1x: M(680, 18, 24, 92), portionOptions: PO.riceDish, allowedToppingIds: ['egg', 'cheese', 'kimchi'] },
      { key: 'omurice', label: 'オムライス', baseMacroAt1x: M(770, 22, 28, 96), portionOptions: PO.riceDish, allowedToppingIds: ['cheese'] },
      { key: 'rice_default', label: 'ごはんもの（代表値）', baseMacroAt1x: M(650, 24, 20, 90), portionOptions: PO.riceDish, allowedToppingIds: ['egg', 'cheese', 'kimchi'] },
    ],
  },
  {
    key: 'curry',
    label: 'カレー',
    shortLabel: 'カレー',
    emoji: '🍛',
    quickEntry: { kind: 'instant_save', defaultSubcategoryKey: 'curry_default', defaultPortionFactor: 1 },
    subcategories: [
      { key: 'curry_rice', label: 'カレーライス', baseMacroAt1x: M(720, 18, 24, 104), portionOptions: PO.curry, allowedToppingIds: ['cheese', 'egg', 'katsu'] },
      { key: 'keema_curry', label: 'キーマカレー', baseMacroAt1x: M(670, 24, 20, 94), portionOptions: PO.curry, allowedToppingIds: ['cheese', 'egg'] },
      { key: 'dry_curry', label: 'ドライカレー', baseMacroAt1x: M(700, 22, 22, 100), portionOptions: PO.curry, allowedToppingIds: ['cheese', 'egg'] },
      { key: 'katsu_curry', label: 'カツカレー', baseMacroAt1x: M(980, 29, 38, 126), portionOptions: PO.curry, allowedToppingIds: ['cheese', 'egg'] },
      { key: 'curry_default', label: 'カレー（代表値）', baseMacroAt1x: M(720, 21, 23, 103), portionOptions: PO.curry, allowedToppingIds: ['cheese', 'egg', 'katsu'] },
    ],
  },
  {
    key: 'chinese_noodles',
    label: '中華麺',
    shortLabel: '中華麺',
    emoji: '🍜',
    quickEntry: {
      kind: 'chinese_noodles',
      primaryOptions: [
        {
          key: 'ramen',
          label: 'ラーメン',
          ramenStyles: [
            { key: 'ramen_light', label: '中華そば・あっさり', baseMacroAt1x: M(650, 25, 14, 96), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg', 'chashu', 'extraNoodles'] },
            { key: 'ramen_iekei', label: '豚骨・家系', baseMacroAt1x: M(1150, 35, 55, 90), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg', 'chashu', 'extraNoodles'] },
            { key: 'ramen_miso', label: '味噌・辛味噌', baseMacroAt1x: M(950, 28, 32, 108), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg', 'chashu', 'extraNoodles'] },
            { key: 'ramen_jiro', label: '二郎系', baseMacroAt1x: M(1500, 55, 75, 150), portionOptions: PO.jiro, allowedToppingIds: ['chashu'] },
          ],
        },
        { key: 'tsukemen', label: 'つけ麺', baseMacroAt1x: M(900, 32, 28, 126), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg', 'chashu'] },
        { key: 'soupless', label: '汁なし・まぜそば', baseMacroAt1x: M(950, 32, 38, 115), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg', 'chashu'] },
        { key: 'fried_noodles', label: '焼きそば系', baseMacroAt1x: M(820, 24, 30, 112), portionOptions: PO.noodlesStandard, allowedToppingIds: ['egg'] },
        { key: 'hiyashi_chuka', label: '冷やし中華', baseMacroAt1x: M(720, 24, 18, 104), portionOptions: PO.noodlesStandard, allowedToppingIds: ['seasonedEgg'] },
      ],
    },
    subcategories: [],
  },
  {
    key: 'japanese_noodles',
    label: '和麺',
    shortLabel: '和麺',
    emoji: '🍲',
    quickEntry: { kind: 'instant_save', defaultSubcategoryKey: 'jp_default', defaultPortionFactor: 1 },
    subcategories: [
      { key: 'udon', label: 'うどん', baseMacroAt1x: M(480, 14, 7, 90), portionOptions: PO.japanese, allowedToppingIds: ['onsenEgg', 'kitsune', 'tempura'] },
      { key: 'soba', label: 'そば', baseMacroAt1x: M(470, 18, 6, 88), portionOptions: PO.japanese, allowedToppingIds: ['onsenEgg', 'tempura'] },
      { key: 'somen', label: 'そうめん', baseMacroAt1x: M(430, 12, 4, 86), portionOptions: PO.japanese, allowedToppingIds: [] },
      { key: 'yaki_udon', label: '焼うどん', baseMacroAt1x: M(560, 18, 16, 86), portionOptions: PO.japanese, allowedToppingIds: ['onsenEgg'] },
      { key: 'jp_default', label: '和麺（代表値）', baseMacroAt1x: M(485, 15, 7, 88), portionOptions: PO.japanese, allowedToppingIds: ['onsenEgg', 'kitsune', 'tempura'] },
    ],
  },
  {
    key: 'pasta',
    label: 'パスタ',
    shortLabel: 'パスタ',
    emoji: '🍝',
    quickEntry: { kind: 'instant_save', defaultSubcategoryKey: 'pasta_default', defaultPortionFactor: 1 },
    subcategories: [
      { key: 'tomato_pasta', label: 'トマト系', baseMacroAt1x: M(650, 22, 18, 95), portionOptions: PO.pasta, allowedToppingIds: [] },
      { key: 'oil_pasta', label: 'オイル系', baseMacroAt1x: M(700, 20, 28, 88), portionOptions: PO.pasta, allowedToppingIds: [] },
      { key: 'cream_pasta', label: 'クリーム系', baseMacroAt1x: M(780, 24, 36, 86), portionOptions: PO.pasta, allowedToppingIds: [] },
      { key: 'meat_pasta', label: 'ミートソース', baseMacroAt1x: M(690, 26, 22, 96), portionOptions: PO.pasta, allowedToppingIds: [] },
      { key: 'japanese_pasta', label: '和風パスタ', baseMacroAt1x: M(620, 20, 20, 88), portionOptions: PO.pasta, allowedToppingIds: [] },
      { key: 'pasta_default', label: 'パスタ（代表値）', baseMacroAt1x: M(680, 22, 25, 91), portionOptions: PO.pasta, allowedToppingIds: [] },
    ],
  },
  {
    key: 'sushi',
    label: '寿司',
    shortLabel: '寿司',
    emoji: '🍣',
    quickEntry: {
      kind: 'sushi_count',
      defaultMode: 'plate',
      modes: [
        { key: 'plate', label: '回転寿司（皿）', unitLabel: '皿', presetCounts: [4, 6, 8, 10, 12, 15], min: 1, max: 30, macroPerUnit: M(130, 7, 4, 16.4) },
        { key: 'piece', label: 'セット寿司（貫）', unitLabel: '貫', presetCounts: [6, 8, 10, 12, 16, 20], min: 1, max: 40, macroPerUnit: M(65, 3.5, 2, 8.2) },
      ],
    },
    subcategories: [],
  },
  {
    key: 'sandwich',
    label: 'サンド',
    shortLabel: 'サンド',
    emoji: '🥪',
    quickEntry: { kind: 'instant_save', defaultSubcategoryKey: 'sand_default', defaultPortionFactor: 1 },
    subcategories: [
      { key: 'egg_sand', label: 'たまごサンド', baseMacroAt1x: M(340, 13, 18, 30), portionOptions: PO.sandwich, allowedToppingIds: ['cheese', 'baconExtra'] },
      { key: 'tuna_sand', label: 'ツナサンド', baseMacroAt1x: M(360, 14, 20, 30), portionOptions: PO.sandwich, allowedToppingIds: ['cheese'] },
      { key: 'ham_blt_sand', label: 'ハム・BLT系', baseMacroAt1x: M(330, 14, 16, 31), portionOptions: PO.sandwich, allowedToppingIds: ['cheese', 'baconExtra'] },
      { key: 'hot_sand', label: 'ホットサンド', baseMacroAt1x: M(420, 18, 22, 36), portionOptions: PO.sandwich, allowedToppingIds: ['cheese', 'baconExtra'] },
      { key: 'burger', label: 'バーガー', baseMacroAt1x: M(460, 22, 24, 39), portionOptions: PO.sandwich, allowedToppingIds: ['cheese', 'baconExtra'] },
      { key: 'sand_default', label: 'サンド（代表値）', baseMacroAt1x: M(360, 16, 19, 32), portionOptions: PO.sandwich, allowedToppingIds: ['cheese', 'baconExtra'] },
    ],
  },
  {
    key: 'pizza',
    label: 'ピザ',
    shortLabel: 'ピザ',
    emoji: '🍕',
    quickEntry: {
      kind: 'pizza_slices',
      presetSlices: [1, 2, 3, 4, 6, 8],
      minSlices: 1,
      maxSlices: 12,
      pizzaTypes: [
        { key: 'light', label: '薄め', macroPerSlice: M(95, 4, 3, 12) },
        { key: 'regular', label: 'ふつう', macroPerSlice: M(150, 6, 6, 18) },
        { key: 'heavy', label: 'こってり', macroPerSlice: M(240, 10, 12, 22) },
      ],
    },
    subcategories: [],
  },
  {
    key: 'set_meal',
    label: '定食・弁当',
    shortLabel: '定食弁当',
    emoji: '🍱',
    quickEntry: {
      kind: 'set_meal_select',
      options: [
        { key: 'teishoku', label: '定食', baseMacroAt1x: M(820, 32, 30, 102), portionOptions: PO.setMeal },
        { key: 'bento', label: '弁当', baseMacroAt1x: M(700, 24, 22, 94), portionOptions: PO.setMeal },
        { key: 'convenience_bento', label: 'コンビニ弁当', baseMacroAt1x: M(650, 20, 18, 92), portionOptions: PO.setMeal },
      ],
    },
    subcategories: [],
  },
];

export function getDishTopCategory(key: string): DishTopCategoryDef | undefined {
  return DISH_TOP_CATEGORIES.find((c) => c.key === key);
}

export function findSubcategory(catKey: string, subKey: string): DishSubcategory | undefined {
  return getDishTopCategory(catKey)?.subcategories.find((s) => s.key === subKey);
}

export function multiplyMacroSimple(m: Macro, f: number): Macro {
  return {
    kcal: Math.round(m.kcal * f * 10) / 10,
    protein: Math.round(m.protein * f * 10) / 10,
    fat: Math.round(m.fat * f * 10) / 10,
    carbs: Math.round(m.carbs * f * 10) / 10,
  };
}
