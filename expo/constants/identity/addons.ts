/**
 * Add-on pool — both pure Add-on IDs (調味・補強系) and references to
 * Identity-flavored cross-bucket add-ons.
 *
 * Spec: docs/IA-identity-spec.md §5
 *
 * - PURE_ADDONS: standalone Addon objects (mentaiko, shirasu, jam, etc.)
 *   that do NOT correspond to any base Identity.
 * - The "Identity流用 Add-on" half (egg/cheese/avocado/natto/etc.) is
 *   defined inline on those Identities via `asAddon`. This file only
 *   re-exports the IDs of cross-bucket capable Identities for convenience.
 */

import { Addon } from '@/types/identity';

// ---------------------------------------------------------------------------
// Pure Add-ons (Identity化しない補強・調味系)
// ---------------------------------------------------------------------------

export const PURE_ADDONS: Addon[] = [
  // ---- Rice / breakfast toppings ----
  {
    id: 'mentaiko',
    label: '明太子・たらこ',
    unit: 'g',
    unitAmount: 18,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 25, protein: 5, fat: 1.5, carbs: 0.3 },
    allowedIdentityIds: ['rice'],
  },
  {
    id: 'shirasu',
    label: 'しらす',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '15g',
    addedMacro: { kcal: 25, protein: 4, fat: 0.5, carbs: 0.1 },
    allowedIdentityIds: ['rice', 'salad_raw'],
  },
  {
    id: 'salmon_flake',
    label: '鮭フレーク',
    unit: 'g',
    unitAmount: 10,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 30, protein: 4.5, fat: 1.5, carbs: 0.2 },
    allowedIdentityIds: ['rice', 'oatmeal'],
  },
  {
    id: 'katsuobushi',
    label: '削り節',
    unit: 'g',
    unitAmount: 5,
    unitLabel: '5g',
    addedMacro: { kcal: 18, protein: 3.5, fat: 0.3, carbs: 0 },
    // 温野菜は外す (ユーザー指摘)。冷奴・お好み焼き・焼うどん等で活用
    allowedIdentityIds: ['rice', 'side_seasoned', 'okonomi', 'tofu', 'yaki_udon'],
  },
  {
    id: 'kinako',
    label: 'きな粉',
    unit: 'g',
    unitAmount: 7,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 30, protein: 2.5, fat: 1.8, carbs: 1.5 },
    allowedIdentityIds: ['mochi', 'soy_milk', 'oatmeal', 'yogurt'],
  },
  {
    id: 'mitarashi_tare',
    label: 'みたらしのたれ',
    unit: 'g',
    unitAmount: 25,
    unitLabel: '串1本分',
    // 砂糖・醤油・片栗粉のたれ ~25g
    addedMacro: { kcal: 35, protein: 0.3, fat: 0, carbs: 8.5 },
    allowedIdentityIds: ['mochi'],
  },
  {
    id: 'anko',
    label: 'あんこ',
    unit: 'g',
    unitAmount: 40,
    unitLabel: '串1本分',
    // つぶあん ~40g (100gあたり 244kcal 換算)
    addedMacro: { kcal: 98, protein: 2.4, fat: 0.2, carbs: 21 },
    allowedIdentityIds: ['mochi'],
  },
  {
    id: 'nori_furikake',
    label: '海苔・ふりかけ',
    unit: 'g',
    unitAmount: 5,
    unitLabel: '5g',
    addedMacro: { kcal: 15, protein: 1, fat: 0.3, carbs: 2 },
    allowedIdentityIds: ['rice', 'ramen_light', 'ramen_heavy', 'ramen_jiro', 'tsukemen', 'tantanmen'],
  },

  // ---- Bread / breakfast spreads ----
  {
    id: 'jam',
    label: 'ジャム',
    unit: 'g',
    unitAmount: 18,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 50, protein: 0, fat: 0, carbs: 13 },
    allowedIdentityIds: ['bread', 'oatmeal', 'yogurt'],
  },
  {
    id: 'honey',
    label: 'はちみつ',
    unit: 'g',
    unitAmount: 21,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 60, protein: 0, fat: 0, carbs: 16 },
    allowedIdentityIds: ['bread', 'oatmeal', 'yogurt', 'milk'],
  },
  {
    id: 'peanut_butter',
    label: 'ピーナッツバター',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 95, protein: 3.5, fat: 8, carbs: 3 },
    allowedIdentityIds: ['bread', 'oatmeal'],
  },
  {
    id: 'maple_syrup',
    label: 'メープルシロップ',
    unit: 'g',
    unitAmount: 20,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 50, protein: 0, fat: 0, carbs: 13 },
    allowedIdentityIds: ['bread', 'oatmeal'],
  },
  {
    id: 'granola_top',
    label: 'グラノーラ追加',
    unit: 'g',
    unitAmount: 25,
    unitLabel: '大さじ2',
    addedMacro: { kcal: 120, protein: 2, fat: 5, carbs: 18 },
    allowedIdentityIds: ['yogurt', 'oatmeal', 'milk'],
  },

  // ---- Sauces / fried-food companions ----
  {
    id: 'sauce',
    label: 'ソース (中濃/とんかつ)',
    unit: 'ml',
    unitAmount: 18,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 22, protein: 0.2, fat: 0, carbs: 5.5 },
    allowedIdentityIds: ['fried_main', 'okonomi', 'fried_noodles', 'yaki_udon'],
  },
  {
    id: 'lemon_squeeze',
    label: 'レモン (絞り)',
    unit: 'ml',
    unitAmount: 5,
    unitLabel: '1切',
    addedMacro: { kcal: 1, protein: 0, fat: 0, carbs: 0.4 }, // PFC低だが慣用上必要
    allowedIdentityIds: ['fried_main'],
  },
  {
    id: 'tartar',
    label: 'タルタル',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 70, protein: 0.4, fat: 7, carbs: 2 },
    allowedIdentityIds: ['fried_main', 'white_fish', 'seafood_lean'],
  },
  {
    id: 'menma',
    label: 'メンマ',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '30g',
    addedMacro: { kcal: 6, protein: 0.3, fat: 0.1, carbs: 1.5 }, // PFC低だがラーメンの慣用追加
    allowedIdentityIds: ['ramen_light', 'ramen_heavy', 'ramen_jiro', 'tsukemen', 'tantanmen'],
  },
  {
    id: 'seabura',
    label: '背脂',
    unit: 'g',
    unitAmount: 12,
    unitLabel: '大さじ1',
    addedMacro: { kcal: 50, protein: 0, fat: 5.5, carbs: 0 },
    allowedIdentityIds: ['ramen_light', 'ramen_heavy', 'ramen_jiro', 'tsukemen', 'tantanmen'],
  },
  {
    id: 'rayu',
    label: 'ラー油',
    unit: 'ml',
    unitAmount: 5,
    unitLabel: '小さじ1',
    addedMacro: { kcal: 35, protein: 0, fat: 4, carbs: 0 },
    allowedIdentityIds: ['ramen_light', 'ramen_heavy', 'tsukemen', 'tantanmen', 'gyudon_class', 'tenshin'],
  },
  {
    id: 'tororo',
    label: 'とろろ',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '50g',
    addedMacro: { kcal: 30, protein: 2, fat: 0.2, carbs: 6.4 },
    allowedIdentityIds: ['soba', 'udon', 'gyudon_class'],
  },

  // ---- Salad-only items ----
  {
    id: 'crouton',
    label: 'クルトン',
    unit: 'g',
    unitAmount: 5,
    unitLabel: '5g',
    addedMacro: { kcal: 25, protein: 0.7, fat: 1, carbs: 4 },
    allowedIdentityIds: ['salad_raw'],
  },
  {
    id: 'corn_top',
    label: 'コーン',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '30g',
    addedMacro: { kcal: 30, protein: 1, fat: 0.5, carbs: 7 },
    allowedIdentityIds: ['salad_raw', 'soup_creamy', 'ramen_heavy'], // 味噌コーンラーメン
  },

  // ---- Ramen / noodle toppings (cross-bucket capable Identities not used here) ----
  {
    id: 'seasoned_egg',
    label: '味玉',
    unit: 'piece',
    unitAmount: 1,
    unitLabel: '1個',
    addedMacro: { kcal: 85, protein: 6.5, fat: 6, carbs: 1 },
    allowedIdentityIds: ['ramen_light', 'ramen_heavy', 'tsukemen', 'tantanmen', 'fried_noodles', 'cold_noodles'],
  },
  {
    id: 'chashu',
    label: 'チャーシュー',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '1人前',
    addedMacro: { kcal: 120, protein: 8, fat: 9, carbs: 1 },
    allowedIdentityIds: ['ramen_light', 'ramen_heavy', 'ramen_jiro', 'tsukemen', 'tantanmen'],
  },
  {
    id: 'tempura_top',
    label: '天ぷら追加',
    unit: 'piece',
    unitAmount: 1,
    unitLabel: '1個',
    addedMacro: { kcal: 140, protein: 4, fat: 9, carbs: 11 },
    allowedIdentityIds: ['udon', 'soba', 'tempura_noodle', 'gyudon_class'],
  },
  {
    id: 'kitsune_top',
    label: 'きつね (油揚げ)',
    unit: 'piece',
    unitAmount: 1,
    unitLabel: '1枚',
    addedMacro: { kcal: 110, protein: 5, fat: 7, carbs: 8 },
    allowedIdentityIds: ['udon', 'soba'],
  },

  // ---- Curry / donburi extras ----
  {
    id: 'katsu_add',
    label: 'カツ追加',
    unit: 'piece',
    unitAmount: 1,
    unitLabel: '1枚',
    addedMacro: { kcal: 250, protein: 14, fat: 16, carbs: 14 },
    allowedIdentityIds: ['curry_class', 'gyudon_class', 'udon'],
  },
  {
    id: 'karaage_add',
    label: '唐揚げ追加',
    unit: 'piece',
    unitAmount: 2,
    unitLabel: '2個',
    addedMacro: { kcal: 180, protein: 11, fat: 10, carbs: 7 },
    allowedIdentityIds: ['gyudon_class', 'curry_class'],
  },

  // ---- Yogurt / oatmeal sweet toppings ----
  {
    id: 'berry_top',
    label: 'ベリー追加',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '50g',
    addedMacro: { kcal: 25, protein: 0.4, fat: 0.2, carbs: 6 },
    allowedIdentityIds: ['yogurt', 'oatmeal', 'cereal'],
  },
  {
    id: 'banana_slice',
    label: 'バナナ追加',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '1/2本',
    addedMacro: { kcal: 45, protein: 0.5, fat: 0.1, carbs: 11 },
    allowedIdentityIds: ['oatmeal', 'yogurt', 'cereal'],
  },

  // ---- Cross-bucket convenience: kimchi as a pure addon ref ----
  {
    id: 'kimchi_top',
    label: 'キムチ',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '30g',
    addedMacro: { kcal: 14, protein: 0.5, fat: 0.1, carbs: 2 },
    allowedIdentityIds: [
      'rice', 'gyudon_class', 'curry_class',
      'ramen_light', 'ramen_heavy', 'fried_noodles', 'cold_noodles',
      'beef_pork', 'beef_pork_fatty',
    ],
  },
];

// ---------------------------------------------------------------------------
// Identity流用 Add-on の ID 一覧 (asAddon を持つ Identity)
// ---------------------------------------------------------------------------

export const IDENTITY_ADDON_REFS: string[] = [
  'egg',
  'cheese',
  'mayo',
  'butter_cream',
  'natto',
  'avocado',
  'nuts',
  'salad_chicken',
  'canned_lean_fish',
  'ham',
  'bacon_sausage',
  'oil',
  'dressing',
  'apple_pear',
  'banana',
  'berry',
  'milk',
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const PURE_ADDONS_BY_ID: Record<string, Addon> = PURE_ADDONS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, Addon>
);

/**
 * Look up an add-on ID. Returns either a pure Addon (with its own macro)
 * or 'identity' if the ID corresponds to an Identity-flavored Add-on
 * (whose macro lives on the Identity's `asAddon` field).
 */
export function resolveAddonRef(id: string): { type: 'addon'; data: Addon } | { type: 'identity'; identityId: string } | undefined {
  if (PURE_ADDONS_BY_ID[id]) {
    return { type: 'addon', data: PURE_ADDONS_BY_ID[id] };
  }
  if (IDENTITY_ADDON_REFS.includes(id)) {
    return { type: 'identity', identityId: id };
  }
  return undefined;
}
