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

import { Identity } from '@/types/identity';

// ---------------------------------------------------------------------------
// Bucket 1: ごはんパン麺 (staple) — 13 Identity
// ---------------------------------------------------------------------------

const BUCKET_STAPLE: Identity[] = [
  {
    id: 'rice',
    label: 'ごはん',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 234, protein: 3.8, fat: 0.5, carbs: 56 },
    amount: {
      unit: 'g',
      default: 150,
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
        migration: { bucketKey: 'rice_dish', identityKey: 'gyudon_class', confirmMessage: '丼として記録します' },
      },
      {
        key: 'curry_pour',
        label: 'カレーかけ',
        migration: { bucketKey: 'curry', identityKey: 'curry_class', confirmMessage: 'カレーライスとして記録します' },
      },
      {
        key: 'nabe_yaki',
        label: '雑炊・鍋焼き',
        migration: { bucketKey: 'misc_dish', identityKey: 'nabe_light', confirmMessage: '雑炊として記録します' },
      },
    ],
    defaultAddonIds: ['natto', 'egg', 'kimchi_top', 'salmon_flake', 'mentaiko', 'nori_furikake'],
    allowedAddonIds: [
      'natto', 'egg', 'kimchi_top', 'salmon_flake', 'mentaiko', 'nori_furikake',
      'butter_cream', 'shirasu', 'katsuobushi',
    ], // cheese / rayu は白米には不自然なので除外
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
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 140, protein: 2.4, fat: 0.3, carbs: 33 },
    amount: {
      unit: 'g',
      default: 200,
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
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    quickTapDisabled: true, // Attribute span too wide (食パン 158 → ナン 320, F 2.5 → 11)
    defaultMacro: { kcal: 158, protein: 5.3, fat: 2.5, carbs: 28 },
    amount: {
      unit: 'g',
      default: 60,
      chips: [
        { label: '1枚', value: 60 },
        { label: '2枚', value: 120 },
        { label: 'ナン', value: 120 },
      ],
    },
    attributes: [
      { key: 'plain', label: '食パン', isDefault: true },
      { key: 'whole', label: '全粒・ライ麦', factor: { fat: 1.2 } },
      { key: 'bagel', label: 'ベーグル', factor: { kcal: 1.5, protein: 1.7, carbs: 1.6 } },
      { key: 'naan', label: 'ナン', factor: { kcal: 1.7, protein: 1.5, fat: 1.4, carbs: 1.5 } },
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
    amount: { unit: 'g', default: 30, chips: [{ label: '30', value: 30 }, { label: '50', value: 50 }] },
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
    amount: { unit: 'g', default: 40, chips: [{ label: '30', value: 30 }, { label: '40', value: 40 }, { label: '50', value: 50 }] },
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
    label: '餅',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 117, protein: 2, fat: 0.3, carbs: 25 },
    amount: { unit: 'piece', default: 1 },
    defaultAddonIds: ['kinako', 'honey', 'nori_furikake'],
    allowedAddonIds: ['kinako', 'honey', 'nori_furikake', 'butter_cream'],
  },
  {
    id: 'potato',
    label: 'じゃがいも・里芋',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 76, protein: 1.9, fat: 0.1, carbs: 17 },
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 70 }, { label: '1個', value: 100 }, { label: '大', value: 180 }] },
    styles: [
      { key: 'plain', label: '蒸し・茹で', isDefault: true },
      { key: 'baked', label: '焼き', factor: { kcal: 1.11, carbs: 1.17 } },
      {
        key: 'fried',
        label: '揚げ',
        migration: { bucketKey: 'misc_dish', identityKey: 'fried_main', attributeKey: 'fries', confirmMessage: 'フライドポテトとして記録します' },
      },
      {
        key: 'salad_mayo',
        label: 'サラダ化(マヨ)',
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
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 70 }, { label: '100', value: 100 }, { label: '大', value: 200 }] },
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
  },
  {
    id: 'noodle_udon',
    label: 'うどん・蕎麦',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 210, protein: 5.2, fat: 0.8, carbs: 43 }, // 茹でうどん 200g
    amount: {
      unit: 'g',
      default: 200,
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
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 284, protein: 10.2, fat: 1.4, carbs: 59 }, // 乾燥パスタ 80g
    amount: {
      unit: 'g',
      default: 80,
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
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 203, protein: 6.4, fat: 0.6, carbs: 42 }, // 茹で中華麺 120g
    amount: {
      unit: 'g',
      default: 120,
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
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 105, protein: 23, fat: 1.5, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'no_skin', label: '皮なし', isDefault: true },
      { key: 'with_skin', label: '皮あり', factor: { kcal: 1.4, fat: 6.5 } },
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
          attributeKey: 'karaage',
          confirmMessage: '唐揚げとして記録します',
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
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: default 80g→100g 化 (modal-set 1食量を chicken_lean/red_meat と揃える)
    defaultMacro: { kcal: 75, protein: 16, fat: 0.7, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '1切', value: 80 }, { label: '1食', value: 100 }, { label: '2切', value: 160 }] },
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      { key: 'light', label: 'あっさり', factor: { kcal: 1.1 } },
      { key: 'oil', label: '油あり', factor: { kcal: 1.3, fat: 4 } },
      {
        key: 'breaded_fried',
        label: '衣付揚げ',
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
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: default 80g→100g 化 (modal-set 1食量を chicken_lean/red_meat と揃える)
    defaultMacro: { kcal: 88, protein: 17.5, fat: 0.8, carbs: 1 },
    amount: { unit: 'g', default: 100, chips: [{ label: '80', value: 80 }, { label: '1食', value: 100 }, { label: '150', value: 150 }] },
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      { key: 'light', label: 'あっさり' },
      { key: 'oil', label: '油あり', factor: { kcal: 1.3, fat: 4 } },
      {
        key: 'breaded_fried',
        label: '衣付揚げ',
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
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // v1.2: Attribute 部位分岐追加。default は もも・ヒレ (純赤身、modal-set median 寄り)。
    // 旧 default 135/21/5 (牛もも基準) → 新 130/22/4 (牛豚もも・ヒレ平均)。
    defaultMacro: { kcal: 130, protein: 22, fat: 4, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
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
    label: '缶詰魚 (水煮)',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 50, protein: 11, fat: 0.5, carbs: 0.1 },
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
      defaultLabel: 'ツナ追加',
    },
    defaultAddonIds: ['mayo'], // ツナマヨ定番
    allowedAddonIds: ['mayo'],
  },
  {
    id: 'protein_drink',
    label: 'プロテイン (ドリンク)',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    // 基準: ザバス ミルクプロテイン脂肪0 (200ml) ≒ 100kcal/P15/F0/C10
    // 自販機・コンビニで最量販の主力製品を 1食=100% の基準にする。
    defaultMacro: { kcal: 100, protein: 15, fat: 0, carbs: 10 },
    // 量はザバスのたんぱく質量バリエーションを基準に選ぶ (基準=P15 200ml)。
    // P20≒135%, P30≒200% で全マクロを比例スケール。
    amount: { unit: 'percent', default: 100, chips: [{ label: 'P15', value: 100 }, { label: 'P20', value: 135 }, { label: 'P30', value: 200 }] },
    attributes: [
      { key: 'commercial_drink', label: 'ドリンク市販', isDefault: true },
      { key: 'powder_water', label: 'パウダー水割り', factor: { kcal: 1.15, protein: 1.33, carbs: 0.3 } },
      { key: 'powder_milk', label: 'パウダー牛乳割り', factor: { kcal: 2.4, protein: 1.7, carbs: 1.3 } },
    ],
    searchableFrom: ['snack_drink', 'dairy_soy'],
    searchTags: ['プロテイン', 'シェイク', 'ドリンク', 'ホエイ', 'ソイ', 'ザバス'],
  },
  {
    id: 'jerky',
    label: 'ジャーキー類',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 85, protein: 15, fat: 2, carbs: 3.5 },
    amount: { unit: 'g', default: 30, chips: [{ label: '20', value: 20 }, { label: '30', value: 30 }, { label: '50', value: 50 }] },
    searchTags: ['ビーフジャーキー', 'さきいか', 'あたりめ'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 3: 卵 (egg) — 1 Identity
// ---------------------------------------------------------------------------

const BUCKET_EGG: Identity[] = [
  {
    id: 'egg',
    label: '卵',
    primaryHome: { tab: 'ingredient', bucket: 'egg' },
    defaultMacro: { kcal: 75, protein: 6.2, fat: 5.2, carbs: 0.2 },
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
      defaultLabel: '卵を追加',
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
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 200, protein: 17, fat: 14, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '1枚', value: 250 }] },
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
          attributeKey: 'karaage',
          confirmMessage: '唐揚げとして記録します',
        },
      },
    ],
  },
  {
    id: 'beef_pork',
    label: '牛・豚 (普通脂)',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 230, protein: 17.5, fat: 16.5, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'beef', label: '牛', isDefault: true },
      { key: 'pork', label: '豚', factor: { kcal: 0.96, protein: 1.03, fat: 0.91 } },
    ],
    styles: [
      { key: 'light', label: 'あっさり', isDefault: true },
      { key: 'oil', label: '油あり', factor: { kcal: 1.18, fat: 1.5 } },
      {
        key: 'breaded_fried_pork',
        label: '衣付揚げ (とんかつ)',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'tonkatsu',
          confirmMessage: 'とんかつとして記録します',
        },
      },
      {
        key: 'breaded_fried_beef',
        label: '衣付揚げ (メンチ)',
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
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    quickTapDisabled: true, // Attribute バラ/サーロイン/ホルモン/タン: kcal 220-470, F 17-46
    defaultMacro: { kcal: 380, protein: 16, fat: 35, carbs: 0 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'bara', label: 'バラ', isDefault: true },
      { key: 'sirloin', label: 'サーロイン', factor: { kcal: 0.84, fat: 0.8 } },
      { key: 'horumon', label: 'ホルモン', factor: { kcal: 0.58, protein: 0.94, fat: 0.49 } },
      { key: 'tan', label: 'タン', factor: { kcal: 0.71, protein: 1.31, fat: 0.57 } },
    ],
  },
  {
    id: 'fatty_fish',
    label: '脂魚',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    quickTapDisabled: true, // Attribute 鮭/サバ/ぶり/さんま/いわし/うなぎ: kcal 130-290, F 9-24
    defaultMacro: { kcal: 200, protein: 20, fat: 12, carbs: 0 },
    amount: { unit: 'g', default: 80, chips: [{ label: '1切', value: 80 }, { label: '100', value: 100 }, { label: '2切', value: 160 }] },
    attributes: [
      { key: 'salmon', label: '鮭', isDefault: true },
      { key: 'saba', label: 'サバ', factor: { kcal: 1.0, fat: 1.17 } },
      { key: 'buri', label: 'ぶり', factor: { kcal: 1.1, fat: 1.25 } },
      { key: 'sanma', label: 'さんま', factor: { kcal: 1.45, fat: 2.0 } },
      { key: 'iwashi', label: 'いわし', factor: { kcal: 0.81, fat: 0.83 } },
      { key: 'unagi', label: 'うなぎ蒲焼', factor: { kcal: 1.45, fat: 1.75, carbs: 999 } /* C handled separately */ },
    ],
    styles: [
      { key: 'raw', label: '生・刺身', isDefault: true },
      { key: 'grilled', label: '焼き', factor: { kcal: 1.1 } },
    ],
  },
  {
    id: 'canned_fatty_fish',
    label: '缶詰魚 (脂魚)',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 280, protein: 28, fat: 16, carbs: 0.5 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '半缶', value: 0.5 }, { label: '1缶', value: 1 }] },
    attributes: [
      { key: 'water', label: '水煮', isDefault: true },
      { key: 'miso', label: '味噌煮', factor: { kcal: 1.15, carbs: 7 } },
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
    amount: { unit: 'piece', default: 2, unitLabel: '枚', chips: [{ label: '2枚', value: 2 }, { label: '4枚', value: 4 }] },
    asAddon: {
      unit: 'piece',
      unitAmount: 2,
      addedMacro: { kcal: 40, protein: 5, fat: 2.5, carbs: 1 },
      defaultLabel: 'ハム追加',
    },
  },
  {
    id: 'bacon_sausage',
    label: 'ベーコン・ソーセージ',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 100, protein: 5, fat: 9, carbs: 0.5 },
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
      defaultLabel: 'ベーコン追加',
    },
  },
  {
    id: 'liver',
    label: 'レバー',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 130, protein: 20, fat: 3.5, carbs: 2.5 },
    amount: { unit: 'g', default: 100, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }] },
  },
  {
    id: 'protein_bar',
    label: 'プロテインバー',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 160, protein: 15, fat: 5, carbs: 15 },
    amount: { unit: 'piece', default: 1, unitLabel: '本', chips: [{ label: '1本', value: 1 }, { label: '2本', value: 2 }] },
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
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 134, protein: 6.6, fat: 7.6, carbs: 9.6 },
    amount: { unit: 'ml', default: 200, chips: [{ label: 'コップ', value: 100 }, { label: '200', value: 200 }, { label: '500', value: 500 }] },
    attributes: [
      { key: 'plain', label: '普通', isDefault: true },
      { key: 'low_fat', label: '低脂肪', factor: { kcal: 0.69, fat: 0.26, carbs: 1.15 } },
    ],
    asAddon: {
      unit: 'ml',
      unitAmount: 50,
      addedMacro: { kcal: 30, protein: 1.6, fat: 1.9, carbs: 2.4 },
      defaultLabel: 'ミルク追加',
    },
    defaultAddonIds: ['honey'], // ホットミルク+はちみつ
    allowedAddonIds: ['honey', 'granola_top'],
  },
  {
    id: 'yogurt',
    label: 'ヨーグルト',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 62, protein: 3.6, fat: 3, carbs: 4.9 },
    // 飲むヨーグルトは Attribute=drink で吸収するため chip 削除 (単位齟齬解消)
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 80 }, { label: '1パック', value: 100 }, { label: '大', value: 150 }] },
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
    id: 'soy_milk',
    label: '豆乳',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 92, protein: 7.2, fat: 4, carbs: 6.2 },
    amount: { unit: 'ml', default: 200, chips: [{ label: 'コップ', value: 100 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'plain', label: '無調整', isDefault: true },
      { key: 'adjusted', label: '調整', factor: { kcal: 1.2, fat: 1.15, carbs: 1.23 } },
    ],
    defaultAddonIds: ['honey', 'kinako'],
    allowedAddonIds: ['honey', 'kinako', 'granola_top'],
  },
  {
    id: 'cheese',
    label: 'チーズ',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 80, protein: 5, fat: 6, carbs: 1 },
    amount: { unit: 'g', default: 20, chips: [{ label: 'スライス1枚', value: 18 }, { label: '30', value: 30 }, { label: '50', value: 50 }] },
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
      defaultLabel: 'チーズ追加',
    },
  },
  {
    id: 'cheese_low_fat',
    label: 'チーズ (低脂)',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 32, protein: 4, fat: 1.4, carbs: 1 },
    amount: { unit: 'g', default: 30, chips: [{ label: '30', value: 30 }, { label: '50', value: 50 }, { label: '100', value: 100 }] },
  },
  {
    id: 'tofu',
    label: '豆腐',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 83, protein: 7.5, fat: 4.5, carbs: 3 },
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
      { key: 'thick', label: '厚揚げ', factor: { kcal: 2.33, protein: 3, fat: 1.86, carbs: 999 /* C 1g */ } },
      { key: 'ganmodoki', label: 'がんもどき', factor: { kcal: 1.6, protein: 2.0, fat: 1.5 } },
    ],
    searchTags: ['油揚げ', '厚揚げ', 'がんもどき'],
  },
  {
    id: 'natto',
    label: '納豆',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 80, protein: 6.6, fat: 4, carbs: 5 },
    amount: { unit: 'piece', default: 1, unitLabel: 'パック' },
    asAddon: {
      unit: 'piece',
      unitAmount: 1,
      addedMacro: { kcal: 80, protein: 6.6, fat: 4, carbs: 5 },
      defaultLabel: '納豆を追加',
    },
  },
  {
    id: 'edamame_soy',
    label: '大豆・枝豆',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 65, protein: 6, fat: 3, carbs: 4 },
    amount: { unit: 'g', default: 50, chips: [{ label: '小皿', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'edamame', label: '枝豆', isDefault: true },
      { key: 'soybeans_boiled', label: '大豆水煮', factor: { kcal: 1.08, protein: 1.17, fat: 1.5, carbs: 0.75 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bucket 6: 野菜・汁物 (veggies) — 9 Identity
// ---------------------------------------------------------------------------

const BUCKET_VEGGIES: Identity[] = [
  {
    id: 'salad_raw',
    label: 'サラダ・生野菜',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 25, protein: 1.4, fat: 0.3, carbs: 5 },
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 50 }, { label: '普通', value: 100 }, { label: '大', value: 150 }] },
    defaultAddonIds: ['avocado', 'canned_lean_fish', 'nuts', 'dressing', 'salad_chicken', 'crouton'],
    allowedAddonIds: [
      'avocado', 'canned_lean_fish', 'nuts', 'dressing', 'salad_chicken',
      'crouton', 'corn_top', 'cheese', 'bacon_sausage', 'shirasu', 'mayo', 'oil',
    ],
  },
  {
    id: 'veg_cooked',
    label: '温野菜',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 35, protein: 1.5, fat: 0.3, carbs: 7 },
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 50 }, { label: '普通', value: 100 }, { label: '大', value: 150 }] },
    styles: [
      { key: 'steamed', label: '蒸し・茹で', isDefault: true },
      { key: 'stir_fry', label: '炒め', factor: { kcal: 1.7, fat: 10 } },
      {
        key: 'breaded_fried',
        label: '衣付揚げ',
        migration: {
          bucketKey: 'misc_dish',
          identityKey: 'fried_main',
          attributeKey: 'tempura',
          confirmMessage: '天ぷらとして記録します',
        },
      },
    ],
    defaultAddonIds: ['mayo'], // 鰹節はユーザー指摘で除外
    allowedAddonIds: ['mayo', 'dressing'],
  },
  {
    id: 'side_seasoned',
    label: '副菜 (煮物・和え)',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 55, protein: 1.7, fat: 2.5, carbs: 6.5 },
    amount: { unit: 'g', default: 50, chips: [{ label: '小鉢', value: 50 }, { label: '1皿', value: 100 }] },
  },
  {
    id: 'side_creamy',
    label: '副菜 (クリーミー)',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 130, protein: 1.5, fat: 8, carbs: 12 },
    amount: { unit: 'g', default: 100, chips: [{ label: '小', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'potato_salad', label: 'ポテトサラダ', isDefault: true },
      { key: 'macaroni', label: 'マカロニサラダ', factor: { kcal: 1.12, protein: 2.31, carbs: 1.25 } },
      { key: 'coleslaw', label: 'コールスロー', factor: { kcal: 0.38, protein: 0.54, fat: 0.44, carbs: 0.33 } },
    ],
  },
  {
    id: 'pickles',
    label: '漬物',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 14, protein: 0.5, fat: 0.1, carbs: 2 },
    amount: { unit: 'g', default: 30, chips: [{ label: '少', value: 15 }, { label: '小皿', value: 30 }] },
    attributes: [
      { key: 'kimchi', label: 'キムチ', isDefault: true },
      { key: 'asazuke', label: '浅漬け', factor: { kcal: 0.86 } },
      { key: 'ume', label: '梅干し', factor: { kcal: 0.21, carbs: 0.3 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 30,
      addedMacro: { kcal: 14, protein: 0.5, fat: 0.1, carbs: 2 },
      defaultLabel: 'キムチを追加',
    },
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
    amount: { unit: 'piece', default: 1 },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 45, protein: 0.5, fat: 0.1, carbs: 11 },
      defaultLabel: 'バナナ追加',
    },
  },
  {
    id: 'apple_pear',
    label: 'りんご・梨',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 135, protein: 0.5, fat: 0.5, carbs: 35 },
    amount: { unit: 'piece', default: 1 },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 27, protein: 0.1, fat: 0.1, carbs: 7 },
      defaultLabel: 'りんご追加',
    },
  },
  {
    id: 'citrus',
    label: '柑橘',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 50, protein: 0.8, fat: 0.1, carbs: 13 },
    amount: { unit: 'piece', default: 1 },
  },
  {
    id: 'ichigo',
    label: 'いちご',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 44, protein: 1.2, fat: 0.1, carbs: 11 }, // 10粒分
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
    searchTags: ['ストロベリー'],
  },
  {
    id: 'berry',
    label: 'ベリー・ぶどう',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 28, protein: 0.5, fat: 0.2, carbs: 7 },
    amount: { unit: 'g', default: 50, chips: [{ label: '50', value: 50 }, { label: '100', value: 100 }] },
    attributes: [
      { key: 'blueberry', label: 'ブルーベリー', isDefault: true },
      { key: 'grape', label: 'ぶどう', factor: { kcal: 1.07, carbs: 1.14 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 25, protein: 0.4, fat: 0.2, carbs: 6 },
      defaultLabel: 'ベリー追加',
    },
  },
  {
    id: 'fruit_other',
    label: 'カットフルーツ・他',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 60, protein: 0.7, fat: 0.2, carbs: 15 },
    amount: { unit: 'piece', default: 1 },
    searchTags: ['キウイ', '桃', 'パイナップル', 'マンゴー', '柿', 'すいか'],
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
    amount: { unit: 'ml', default: 15, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 15 }] },
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
      defaultLabel: '油を追加',
    },
  },
  {
    id: 'butter_cream',
    label: 'バター・生クリーム',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 75, protein: 0.1, fat: 8.1, carbs: 0 },
    amount: { unit: 'g', default: 10, chips: [{ label: '5', value: 5 }, { label: '10', value: 10 }, { label: '大さじ', value: 15 }] },
    attributes: [
      { key: 'butter', label: 'バター', isDefault: true },
      { key: 'margarine', label: 'マーガリン', factor: { kcal: 0.95 } },
      { key: 'cream', label: '生クリーム', factor: { kcal: 0.8, fat: 0.79 } },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 10,
      addedMacro: { kcal: 75, protein: 0.1, fat: 8.1, carbs: 0 },
      defaultLabel: 'バター追加',
    },
  },
  {
    id: 'mayo',
    label: 'マヨネーズ',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 80, protein: 0.2, fat: 8.8, carbs: 0.5 },
    amount: { unit: 'ml', default: 12, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 12 }] },
    asAddon: {
      unit: 'ml',
      unitAmount: 12,
      addedMacro: { kcal: 80, protein: 0.2, fat: 8.8, carbs: 0.5 },
      defaultLabel: 'マヨを追加',
    },
  },
  {
    id: 'dressing',
    label: 'ドレッシング',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 60, protein: 0.1, fat: 5, carbs: 2 },
    amount: { unit: 'ml', default: 15, chips: [{ label: '小さじ', value: 5 }, { label: '大さじ', value: 15 }] },
    attributes: [
      { key: 'oily', label: '油あり', isDefault: true },
      { key: 'no_oil', label: 'ノンオイル', factor: { kcal: 0.25, fat: 0, carbs: 1.5 } },
    ],
    asAddon: {
      unit: 'ml',
      unitAmount: 15,
      addedMacro: { kcal: 60, protein: 0.1, fat: 5, carbs: 2 },
      defaultLabel: 'ドレッシング追加',
    },
  },
  {
    id: 'avocado',
    label: 'アボカド',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 90, protein: 1, fat: 9, carbs: 0.5 },
    amount: { unit: 'piece', default: 0.5, chips: [{ label: '1/4個', value: 0.25 }, { label: '半個', value: 0.5 }, { label: '1個', value: 1 }] },
    asAddon: {
      unit: 'g',
      unitAmount: 50,
      addedMacro: { kcal: 90, protein: 1, fat: 9, carbs: 0.5 },
      defaultLabel: 'アボカド追加',
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
    amount: { unit: 'g', default: 30, chips: [{ label: '一掴み', value: 15 }, { label: '30', value: 30 }, { label: '50', value: 50 }] },
    attributes: [
      { key: 'plain', label: '素焼', isDefault: true },
      { key: 'salted', label: '塩入' },
      { key: 'roasted', label: 'ロースト' },
    ],
    asAddon: {
      unit: 'g',
      unitAmount: 15,
      addedMacro: { kcal: 90, protein: 3, fat: 8, carbs: 2 },
      defaultLabel: 'ナッツ追加',
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
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // 基準は板チョコ (明治ミルクチョコ等) 1枚=50g。
    defaultMacro: { kcal: 138, protein: 1.7, fat: 8.3, carbs: 14 },
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
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1個', value: 1 }, { label: '大', value: 1.5 }] },
    searchTags: ['大福', 'どら焼き', '羊羹', 'せんべい', '大学いも', '焼き芋'],
  },
  {
    id: 'dango',
    label: '団子',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // 基準: みたらし団子 1本(3個串/団子~60g + たれ) ≒ 120kcal/P2/F0.4/C27
    defaultMacro: { kcal: 120, protein: 2, fat: 0.4, carbs: 27 },
    referenceDescription: '串団子1本(団子3個)が目安。トッピングで選択',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1本', value: 1 }, { label: '2本', value: 2 }, { label: '3本', value: 3 }] },
    attributes: [
      { key: 'mitarashi', label: 'みたらし', isDefault: true },
      { key: 'anko', label: 'あんこ', factor: { kcal: 1.25, protein: 1.5, fat: 1.2, carbs: 1.18 } },
      { key: 'kinako', label: 'きなこ', factor: { kcal: 1.08, protein: 1.8, fat: 2.5, carbs: 0.95 } },
      { key: 'zunda', label: 'ずんだ', factor: { kcal: 1.1, protein: 1.8, fat: 1.5, carbs: 1.05 } },
      { key: 'shoyu', label: '醤油・焼き', factor: { kcal: 0.83, protein: 1, fat: 0.5, carbs: 0.85 } },
    ],
    searchTags: ['団子', 'みたらし', 'あんこ', '串団子', '三色団子', 'だんご'],
  },
  {
    id: 'cake',
    label: 'ケーキ・洋菓子',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 230, protein: 4, fat: 12, carbs: 28 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1切', value: 1 }] },
    searchTags: ['ショート', 'チーズケーキ', 'シュー', 'プリン', 'ゼリー', 'ティラミス'],
  },
  {
    id: 'ice',
    label: 'アイス',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 215, protein: 4, fat: 10, carbs: 27 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '小', value: 0.5 }, { label: '1個', value: 1 }] },
  },
  {
    id: 'cookie',
    label: 'クッキー・焼菓子',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 130, protein: 1.8, fat: 5.5, carbs: 17 },
    referenceDescription: 'クッキー・ビスケット・マフィン等。1枚≈10g',
    amount: { unit: 'g', default: 30, chips: [{ label: '3枚', value: 30 }, { label: '大袋', value: 60 }] },
  },
  {
    id: 'snack',
    label: 'スナック菓子',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 320, protein: 4, fat: 18, carbs: 36 },
    referenceDescription: 'ポテチ・コーンスナック等。1袋(ポテチ普通サイズ)≈60g',
    amount: { unit: 'g', default: 60, chips: [{ label: '半袋', value: 30 }, { label: '1袋', value: 60 }] },
  },
  {
    id: 'sweet_bread',
    label: '菓子パン',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 305, protein: 6, fat: 8, carbs: 51 },
    amount: { unit: 'piece', default: 1, chips: [{ label: '半分', value: 0.5 }, { label: '1個', value: 1 }] },
  },
  {
    id: 'dried_fruit',
    label: 'ドライフルーツ',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 90, protein: 1, fat: 0.2, carbs: 22 },
    referenceDescription: 'レーズン・ドライマンゴー等。ひとつかみ≈30g',
    amount: { unit: 'g', default: 30, chips: [{ label: 'ひとつかみ', value: 30 }, { label: '小袋', value: 50 }] },
    searchableFrom: ['fruit'],
    searchTags: ['ドライフルーツ', 'ドライ'],
  },
  {
    id: 'sweet_drink',
    label: 'ジュース',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 140, protein: 0, fat: 0, carbs: 35 },
    referenceDescription: 'コーラ・サイダー・果汁ジュース・スポーツドリンクなど、サラッと甘い飲み物',
    amount: { unit: 'ml', default: 350, chips: [{ label: 'コップ1杯', value: 200 }, { label: '缶1本', value: 350 }, { label: '1本(500)', value: 500 }] },
    searchTags: ['ジュース', 'コーラ', 'サイダー', 'スポドリ', '炭酸', '果汁'],
  },
  {
    id: 'sweet_drink_rich',
    label: 'フラペ・タピオカ系',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 280, protein: 5, fat: 10, carbs: 50 },
    referenceDescription: 'フラペチーノ・タピオカミルクティーなど、生クリームやトッピングでこってり甘い飲み物',
    amount: { unit: 'ml', default: 350, chips: [{ label: 'S/Short', value: 240 }, { label: 'M/Tall', value: 350 }, { label: 'L/Grande', value: 470 }] },
    searchTags: ['フラペチーノ', 'タピオカ', 'ミルクティー', 'シェイク', 'スタバ'],
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
