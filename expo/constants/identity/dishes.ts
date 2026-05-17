/**
 * Dish-tab Identity definitions (一皿料理タブ — 47 Identities across 9 buckets).
 *
 * Spec: docs/IA-identity-spec.md §2.2, §6
 *
 * Note: §8.1 decisions applied:
 *   - burger + burger_heavy → 統合 (Attribute=[普通/こってり])
 *   - hot_sand / cold_sand → 別維持
 *   - canned_lean_fish 油漬 migration is on the ingredient side
 */

import { Identity } from '@/types/identity';

// ---------------------------------------------------------------------------
// Bucket 1: どんぶり (rice_dish) — 5 Identity
// ---------------------------------------------------------------------------

const BUCKET_RICE_DISH: Identity[] = [
  {
    id: 'gyudon_class',
    label: '牛丼系',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 660, protein: 25, fat: 18, carbs: 88 },
    referenceDescription: 'ご飯200g + 主菜80g (1人前)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [
        { label: '小盛', value: 70 },
        { label: '並', value: 100 },
        { label: '大盛', value: 150 },
        { label: '特盛', value: 200 },
      ],
    },
    attributes: [
      { key: 'gyudon', label: '牛丼', isDefault: true },
      { key: 'oyakodon', label: '親子丼', factor: { kcal: 0.94, protein: 1.12, fat: 0.82, carbs: 0.93 } },
      { key: 'negitoro', label: 'ねぎとろ丼', factor: { kcal: 0.91, protein: 1, fat: 0.67, carbs: 0.97 } },
      { key: 'chuka', label: '中華丼', factor: { kcal: 0.91, protein: 0.88, fat: 0.89, carbs: 0.97 } },
      { key: 'mabo', label: '麻婆丼', factor: { kcal: 0.98, protein: 1, fat: 1.22, carbs: 0.93 } },
    ],
    // cheese は親子丼/中華丼/麻婆丼に合わないので default から外し allowed のみに
    defaultAddonIds: ['egg', 'kimchi_top', 'rayu'],
    allowedAddonIds: ['egg', 'cheese', 'kimchi_top', 'rayu', 'mayo', 'katsu_add'],
  },
  {
    id: 'kaisendon',
    label: '海鮮丼',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 580, protein: 28, fat: 10, carbs: 88 },
    referenceDescription: 'ご飯200g + 海鮮ネタ80g',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小盛', value: 70 }, { label: '並', value: 100 }, { label: '大盛', value: 150 }] },
  },
  {
    id: 'fried_rice_omurice',
    label: 'チャーハン・オムライス',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 720, protein: 20, fat: 26, carbs: 94 },
    referenceDescription: 'ご飯200g + 卵2個・具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 70 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'chahan', label: 'チャーハン', isDefault: true },
      { key: 'omurice', label: 'オムライス', factor: { kcal: 1.13, protein: 1.22, fat: 1.17, carbs: 1.04 } },
    ],
    defaultAddonIds: ['cheese', 'kimchi_top'],
    allowedAddonIds: ['cheese', 'kimchi_top', 'egg'],
  },
  {
    id: 'katsudon_tendon',
    label: 'カツ丼・天丼',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 850, protein: 27, fat: 29, carbs: 109 },
    referenceDescription: 'ご飯200g + カツ/天ぷら + 卵',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'katsudon', label: 'カツ丼', isDefault: true },
      { key: 'tendon', label: '天丼', factor: { kcal: 0.94, protein: 0.69, fat: 0.97, carbs: 1.09 } },
    ],
  },
  {
    id: 'bibimbap',
    label: 'ビビンバ',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 650, protein: 23, fat: 16, carbs: 95 },
    referenceDescription: 'ご飯200g + ナムル・肉80g',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'bibimbap', label: '普通', isDefault: true },
      { key: 'stone', label: '石焼', factor: { kcal: 1.08, fat: 1.13 } },
    ],
    defaultAddonIds: ['egg', 'kimchi_top'],
    allowedAddonIds: ['egg', 'kimchi_top', 'rayu'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 2: カレー (curry) — 4 Identity
// ---------------------------------------------------------------------------

const BUCKET_CURRY: Identity[] = [
  {
    id: 'curry_class',
    label: 'カレー・シチュー系',
    primaryHome: { tab: 'dish', bucket: 'curry' },
    defaultMacro: { kcal: 720, protein: 21, fat: 23, carbs: 100 },
    referenceDescription: 'ご飯200g + ルー・具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    attributes: [
      { key: 'curry', label: 'カレーライス', isDefault: true },
      { key: 'keema', label: 'キーマカレー', factor: { kcal: 0.93 } },
      { key: 'dry', label: 'ドライカレー', factor: { kcal: 0.97 } },
      { key: 'stew', label: 'シチュー', factor: { kcal: 0.97 } },
      { key: 'hashed', label: 'ハッシュドビーフ', factor: { kcal: 1.04 } },
    ],
    defaultAddonIds: ['katsu_add', 'cheese', 'egg', 'kimchi_top'],
    allowedAddonIds: ['katsu_add', 'cheese', 'egg', 'kimchi_top', 'karaage_add'],
  },
  {
    id: 'katsu_curry',
    label: 'カツカレー',
    primaryHome: { tab: 'dish', bucket: 'curry' },
    defaultMacro: { kcal: 980, protein: 29, fat: 38, carbs: 126 },
    referenceDescription: 'ご飯200g + カツ + ルー',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['cheese'],
    allowedAddonIds: ['cheese', 'egg'],
  },
  {
    id: 'butter_chicken',
    label: 'バターチキン',
    primaryHome: { tab: 'dish', bucket: 'curry' },
    defaultMacro: { kcal: 780, protein: 22, fat: 40, carbs: 72 },
    referenceDescription: 'ご飯200g + バターチキン (or ナンで代用可)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['cheese'],
    allowedAddonIds: ['cheese'],
  },
  {
    id: 'soup_curry',
    label: 'スープカレー・グリーン',
    primaryHome: { tab: 'dish', bucket: 'curry' },
    defaultMacro: { kcal: 600, protein: 22, fat: 22, carbs: 74 },
    referenceDescription: 'ご飯150g + スープカレー',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'soup', label: 'スープカレー', isDefault: true },
      { key: 'green', label: 'グリーンカレー' },
    ],
    defaultAddonIds: ['egg', 'cheese'],
    allowedAddonIds: ['egg', 'cheese'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 3: ラーメン中華麺 (chinese_noodles) — 7 Identity
// ---------------------------------------------------------------------------

// 油揚げ(きつね)はラーメンには合わないため除外。代わりにメンマと海苔を追加
const RAMEN_ADDONS = ['seasoned_egg', 'chashu', 'menma', 'nori_furikake', 'seabura', 'rayu'];

const BUCKET_CHINESE_NOODLES: Identity[] = [
  {
    id: 'ramen_light',
    label: 'ラーメン (あっさり)',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 660, protein: 25, fat: 13, carbs: 100 },
    referenceDescription: '麺150g + スープ・基本具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小さめ', value: 75 }, { label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'shoyu', label: '醤油', isDefault: true },
      { key: 'shio', label: '塩', factor: { kcal: 0.91 } },
    ],
    defaultAddonIds: RAMEN_ADDONS.slice(0, 4),
    allowedAddonIds: RAMEN_ADDONS,
  },
  {
    id: 'ramen_heavy',
    label: 'ラーメン (こってり)',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 1020, protein: 32, fat: 39, carbs: 99 },
    referenceDescription: '麺150g + こってりスープ・チャーシュー',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小さめ', value: 75 }, { label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'miso', label: '味噌', isDefault: true },
      { key: 'tonkotsu', label: 'とんこつ', factor: { kcal: 0.88, fat: 0.94 } },
      { key: 'iekei', label: '家系', factor: { kcal: 1.13, fat: 1.41 } },
    ],
    defaultAddonIds: RAMEN_ADDONS.slice(0, 4),
    allowedAddonIds: RAMEN_ADDONS,
  },
  {
    id: 'ramen_jiro',
    label: '二郎系',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 1500, protein: 55, fat: 75, carbs: 150 },
    referenceDescription: '麺300g + 大量野菜+豚 (1人前=小)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '麺少', value: 75 }, { label: '小', value: 100 }, { label: '大', value: 150 }] },
    defaultAddonIds: ['chashu', 'seabura'],
  },
  {
    id: 'tsukemen',
    label: 'つけ麺・まぜそば',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 925, protein: 32, fat: 33, carbs: 121 },
    referenceDescription: '麺200g + つけ汁',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小さめ', value: 75 }, { label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'tsukemen', label: 'つけ麺', isDefault: true },
      { key: 'mazesoba', label: 'まぜそば', factor: { kcal: 1.06, fat: 1.36 } },
    ],
    defaultAddonIds: ['seasoned_egg', 'chashu'],
  },
  {
    id: 'tantanmen',
    label: '担々麺',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 780, protein: 25, fat: 30, carbs: 90 },
    referenceDescription: '麺150g + 担々スープ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['seasoned_egg', 'chashu', 'menma', 'rayu'],
    allowedAddonIds: ['seasoned_egg', 'chashu', 'menma', 'rayu', 'seabura', 'nori_furikake'],
  },
  {
    id: 'fried_noodles',
    label: '焼そば',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 820, protein: 24, fat: 30, carbs: 112 },
    referenceDescription: '麺150g + 具炒め+ソース',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 75 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['sauce', 'egg'],
    allowedAddonIds: ['sauce', 'egg', 'katsuobushi'],
  },
  {
    id: 'cold_noodles',
    label: '冷やし中華・冷麺',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 660, protein: 23, fat: 13, carbs: 106 },
    referenceDescription: '麺150g + 具+冷スープ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 75 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'hiyashi_chuka', label: '冷やし中華', isDefault: true },
      { key: 'reimen', label: '韓国冷麺', factor: { kcal: 0.91 } },
    ],
    defaultAddonIds: ['egg', 'ham'],
    allowedAddonIds: ['egg', 'ham', 'rayu'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 4: うどん蕎麦 (japanese_noodles) — 5 Identity
// ---------------------------------------------------------------------------

const BUCKET_JAPANESE_NOODLES: Identity[] = [
  {
    id: 'udon',
    label: 'うどん',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 510, protein: 16, fat: 9, carbs: 92 },
    referenceDescription: '麺250g (生1玉) + 出汁',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    attributes: [
      { key: 'kake', label: 'かけ', isDefault: true },
      { key: 'bukkake', label: 'ぶっかけ' },
      { key: 'kitsune', label: 'きつね', factor: { kcal: 1.16, protein: 1.13, fat: 1.33 } },
      { key: 'tsukimi', label: '月見', factor: { kcal: 1.09, protein: 1.25, fat: 1.11 } },
      { key: 'kamaage', label: '釜揚げ' },
    ],
    defaultAddonIds: ['egg', 'tempura_top', 'tororo'],
    allowedAddonIds: ['egg', 'tempura_top', 'kitsune_top', 'tororo'],
  },
  {
    id: 'soba',
    label: 'そば',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 460, protein: 17, fat: 5, carbs: 87 },
    referenceDescription: '麺250g (生1玉) + つゆ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    attributes: [
      { key: 'kake', label: 'かけ', isDefault: true },
      { key: 'zaru', label: 'ざる', factor: { kcal: 0.89 } },
      { key: 'yamakake', label: '山かけ', factor: { kcal: 1.06, protein: 1.06 } },
    ],
    defaultAddonIds: ['egg', 'tempura_top', 'tororo'],
    allowedAddonIds: ['egg', 'tempura_top', 'kitsune_top', 'tororo'],
  },
  {
    id: 'tempura_noodle',
    label: '天ぷら麺',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 665, protein: 22, fat: 17, carbs: 98 },
    referenceDescription: '麺250g + 天ぷら2-3個',
    amount: { unit: 'percent', default: 100, chips: [{ label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'tempura_soba', label: '天そば', isDefault: true },
      { key: 'tempura_udon', label: '天ぷらうどん' },
      { key: 'nabe_yaki', label: '鍋焼きうどん' },
    ],
  },
  {
    id: 'yaki_udon',
    label: '焼うどん',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 560, protein: 18, fat: 16, carbs: 86 },
    referenceDescription: '麺250g + 具炒め',
    amount: { unit: 'percent', default: 100, chips: [{ label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['katsuobushi', 'sauce'],
    allowedAddonIds: ['katsuobushi', 'sauce', 'egg'],
  },
  {
    id: 'somen',
    label: 'そうめん',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 430, protein: 12, fat: 4, carbs: 86 },
    referenceDescription: '麺100g (乾麺) + つゆ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
  },
];

// ---------------------------------------------------------------------------
// Bucket 5: パスタ (pasta) — 5 Identity
// ---------------------------------------------------------------------------

const BUCKET_PASTA: Identity[] = [
  {
    id: 'pasta_tomato',
    label: 'トマト系パスタ',
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 680, protein: 22, fat: 19, carbs: 102 },
    referenceDescription: '麺250g (茹で) + トマトソース・基本具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: 'しっかり', value: 200 }] },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
    allowedAddonIds: ['cheese', 'bacon_sausage', 'egg'],
  },
  {
    id: 'pasta_oil',
    label: 'オイル系パスタ',
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 700, protein: 20, fat: 28, carbs: 88 },
    referenceDescription: '麺250g + オイル+ガーリック・少量具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['cheese'], // oil 重複は冗長なので allowed のみに
    allowedAddonIds: ['cheese', 'oil', 'bacon_sausage'],
  },
  {
    id: 'pasta_cream',
    label: 'クリーム系パスタ',
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 780, protein: 24, fat: 36, carbs: 86 },
    referenceDescription: '麺250g + クリームソース・チーズ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
  },
  {
    id: 'pasta_meat',
    label: 'ミート系パスタ',
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 690, protein: 26, fat: 22, carbs: 96 },
    referenceDescription: '麺250g + ミートソース',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['cheese'],
  },
  {
    id: 'pasta_japanese',
    label: '和風パスタ',
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 620, protein: 20, fat: 20, carbs: 88 },
    referenceDescription: '麺250g + 醤油・和風具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }] },
    defaultAddonIds: ['egg', 'nori_furikake'],
    allowedAddonIds: ['egg', 'nori_furikake', 'cheese'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 6: 寿司 (sushi) — 4 Identity
// ---------------------------------------------------------------------------

const BUCKET_SUSHI: Identity[] = [
  {
    id: 'sushi_plate',
    label: '回転寿司 (皿)',
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 1040, protein: 56, fat: 32, carbs: 131 }, // 8皿分合計 (1皿=130kcal)
    referenceDescription: '1皿=2貫 (シャリ40g+ネタ20g/皿)',
    amount: { unit: 'plate', default: 8 },
  },
  {
    id: 'sushi_piece',
    label: 'セット寿司 (貫)',
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 650, protein: 35, fat: 20, carbs: 82 }, // 10貫分合計 (1貫=65kcal)
    referenceDescription: '1貫=シャリ20g+ネタ10g',
    amount: { unit: 'piece', default: 10, unitLabel: '貫' },
  },
  {
    id: 'chirashi',
    label: 'ちらし寿司',
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 600, protein: 28, fat: 14, carbs: 90 },
    referenceDescription: 'ご飯200g + 海鮮5切+錦糸卵',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
  },
  {
    id: 'maki',
    label: '巻き・いなり・手巻き',
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 180, protein: 5, fat: 2, carbs: 38 },
    referenceDescription: '細巻=米80g+具/本',
    amount: { unit: 'piece', default: 1, unitLabel: '本' }, // 細巻=1本=180kcal、太巻き=1切=80kcal
    attributes: [
      { key: 'maki_thin', label: '細巻 (1本)', isDefault: true },
      { key: 'maki_thick', label: '太巻き (1切)', factor: { kcal: 0.44, carbs: 0.42 } },
      { key: 'inari', label: 'いなり', factor: { kcal: 0.67, fat: 1.0, carbs: 0.63 } },
      { key: 'temaki', label: '手巻き', factor: { kcal: 1.0, protein: 1.4, fat: 2.0, carbs: 0.79 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bucket 7: サンドバーガー (sandwich) — 5 Identity (burger merged)
// ---------------------------------------------------------------------------

const BUCKET_SANDWICH: Identity[] = [
  {
    id: 'cold_sand',
    label: '冷サンド',
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 345, protein: 13, fat: 18, carbs: 30 },
    referenceDescription: 'パン2枚 + 具',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'egg', label: 'たまご', isDefault: true },
      { key: 'tuna', label: 'ツナ', factor: { kcal: 1.04, protein: 1.08, fat: 1.11 } },
      { key: 'ham_blt', label: 'ハム・BLT', factor: { kcal: 0.96, protein: 1.08, fat: 0.89, carbs: 1.03 } },
    ],
    defaultAddonIds: ['cheese', 'bacon_sausage', 'avocado'],
  },
  {
    id: 'hot_sand',
    label: 'ホットサンド',
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 420, protein: 18, fat: 22, carbs: 36 },
    referenceDescription: 'パン2枚 + 具・チーズ・トースト',
    amount: { unit: 'piece', default: 1 },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
  },
  {
    id: 'burger',
    label: 'バーガー',
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    quickTapDisabled: true, // Attribute 普通/チーズ/こってり: kcal 460-600, F 24-32
    defaultMacro: { kcal: 460, protein: 22, fat: 24, carbs: 39 },
    referenceDescription: 'バンズ + パテ100g + 野菜',
    amount: { unit: 'piece', default: 1 },
    // Combined burger + burger_heavy via Attribute
    attributes: [
      { key: 'normal', label: '普通', isDefault: true },
      { key: 'cheese', label: 'チーズ', factor: { kcal: 1.15, protein: 1.14, fat: 1.17, carbs: 1.08 } },
      { key: 'heavy', label: 'こってり', factor: { kcal: 1.3, protein: 1.27, fat: 1.33, carbs: 1.08 } },
    ],
    defaultAddonIds: ['cheese', 'bacon_sausage', 'avocado'],
  },
  {
    id: 'hot_dog_pita',
    label: 'ホットドッグ・他',
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 375, protein: 15, fat: 15, carbs: 40 },
    referenceDescription: 'パン1個 + 具',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'hot_dog', label: 'ホットドッグ', isDefault: true },
      { key: 'banh_mi', label: 'バインミー', factor: { kcal: 1.07, protein: 1.13 } },
      { key: 'pita', label: 'ピタサンド', factor: { kcal: 0.93 } },
    ],
    defaultAddonIds: ['cheese'],
    allowedAddonIds: ['cheese', 'bacon_sausage'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 8: ピザ (pizza) — 4 Identity (種類別に分類)
// ---------------------------------------------------------------------------

const BUCKET_PIZZA: Identity[] = [
  {
    id: 'pizza_simple',
    label: 'マルゲリータ系',
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 105, protein: 4.5, fat: 3.5, carbs: 13 }, // per slice
    referenceDescription: '1切=生地30g+トマトソース+モッツァレラ',
    amount: { unit: 'slice', default: 2 },
    attributes: [
      { key: 'margherita', label: 'マルゲリータ', isDefault: true },
      { key: 'marinara', label: 'マリナーラ', factor: { kcal: 0.86, fat: 0.71 } },
    ],
    defaultAddonIds: ['cheese'],
  },
  {
    id: 'pizza_meat',
    label: '肉系ピザ',
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 175, protein: 8, fat: 8, carbs: 18 }, // per slice
    referenceDescription: '1切=生地30g+ソース+チーズ+肉具',
    amount: { unit: 'slice', default: 2 },
    attributes: [
      { key: 'pepperoni', label: 'ペペロニ', isDefault: true },
      { key: 'bbq', label: 'BBQ・テリヤキ', factor: { kcal: 1.1, carbs: 1.17 } },
      { key: 'ham', label: 'ハム・ベーコン', factor: { kcal: 0.95 } },
      { key: 'sausage', label: 'ソーセージ系', factor: { kcal: 1.05, fat: 1.13 } },
    ],
    defaultAddonIds: ['cheese', 'bacon_sausage'],
  },
  {
    id: 'pizza_cheese',
    label: 'チーズ系ピザ',
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 220, protein: 11, fat: 12, carbs: 17 }, // per slice
    referenceDescription: '1切=生地30g+チーズ多め',
    amount: { unit: 'slice', default: 2 },
    attributes: [
      { key: 'quattro', label: 'クアトロ・フォルマッジ', isDefault: true },
      { key: 'gorgonzola', label: 'ゴルゴンゾーラ', factor: { kcal: 1.05, fat: 1.08 } },
      { key: 'mozza_rich', label: 'モッツァレラ濃厚', factor: { kcal: 0.95 } },
    ],
    defaultAddonIds: ['cheese', 'honey'],
  },
  {
    id: 'pizza_seafood',
    label: 'シーフード系ピザ',
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 150, protein: 8, fat: 6, carbs: 17 }, // per slice
    referenceDescription: '1切=生地30g+ソース+海鮮',
    amount: { unit: 'slice', default: 2 },
    attributes: [
      { key: 'seafood', label: 'シーフードミックス', isDefault: true },
      { key: 'shrimp', label: '海老', factor: { kcal: 1.0 } },
      { key: 'anchovy', label: 'アンチョビ', factor: { kcal: 0.93 } },
    ],
    defaultAddonIds: ['cheese'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 9: 定食・単品・汁 (misc_dish) — 14 Identity (v1.2: 汁物4 Identity 追加)
// (Note: teishoku/bento are placed first as the most frequent daily entries.)
// (v1.2: miso_soup / tonjiru / soup_western / soup_creamy を veggies から移送。
//        「スープ=料理」観点で素材ベース食品から分離。本バケットは quickTapDisabled
//        なので汁物単独ログは長押しシートで Identity を選ぶ運用。)
// ---------------------------------------------------------------------------

const BUCKET_MISC_DISH: Identity[] = [
  {
    id: 'teishoku',
    label: '定食',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 焼魚/焼肉/唐揚げ/トンカツ/生姜焼き/ハンバーグ: kcal 700-1003, F 18-40
    defaultMacro: { kcal: 850, protein: 32, fat: 30, carbs: 108 },
    referenceDescription: 'ご飯200g+主菜+副菜+味噌汁',
    amount: {
      unit: 'percent',
      default: 100,
      unitLabel: '食',
      chips: [
        { label: '軽め', value: 70 },
        { label: '1食', value: 100 },
        { label: 'しっかり', value: 150 },
      ],
    },
    attributes: [
      { key: 'yakizakana', label: '焼魚定食', isDefault: true, factor: { kcal: 0.82, protein: 1.0, fat: 0.6, carbs: 0.91 } },
      { key: 'yakiniku', label: '焼肉定食', factor: { kcal: 1.06, protein: 1.09, fat: 1.07 } },
      { key: 'karaage', label: '唐揚げ定食' },
      { key: 'tonkatsu', label: 'トンカツ定食', factor: { kcal: 1.18, protein: 1.09, fat: 1.33, carbs: 1.02 } },
      { key: 'shogayaki', label: '生姜焼き定食' },
      { key: 'hamburg', label: 'ハンバーグ定食', factor: { kcal: 1.0, protein: 1.0, fat: 1.07, carbs: 0.91 } },
    ],
  },
  {
    id: 'bento',
    label: '弁当',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 700, protein: 23, fat: 20, carbs: 98 },
    referenceDescription: 'ご飯+主菜+副菜 (お弁当箱1食)',
    amount: {
      unit: 'percent',
      default: 100,
      unitLabel: '食',
      chips: [
        { label: '軽め', value: 70 },
        { label: '1食', value: 100 },
        { label: 'しっかり', value: 150 },
      ],
    },
    // 主菜タイプで Attribute 分け (旧 コンビニ/手作り/幕の内/駅弁 はPFC収束しないので廃止)
    attributes: [
      { key: 'noriben', label: 'のり弁', isDefault: true, factor: { kcal: 0.79, protein: 0.61, fat: 0.6, carbs: 0.94 } }, // ~550kcal
      { key: 'sake', label: '鮭弁', factor: { kcal: 0.93, protein: 0.96, fat: 0.85, carbs: 0.96 } }, // ~650
      { key: 'karaage', label: '唐揚げ弁当', factor: { kcal: 1.21, protein: 1.22, fat: 1.4, carbs: 1.0 } }, // ~850
      { key: 'tonkatsu', label: 'とんかつ弁当', factor: { kcal: 1.29, protein: 1.13, fat: 1.5, carbs: 1.07 } }, // ~900
      { key: 'yakiniku', label: '焼肉弁当', factor: { kcal: 1.21, protein: 1.3, fat: 1.4, carbs: 0.92 } }, // ~850
      { key: 'chuka', label: '中華弁当', factor: { kcal: 1.07, protein: 1.04, fat: 1.0, carbs: 1.04 } }, // ~750
      { key: 'makunouchi', label: '幕の内弁当', factor: { kcal: 1.0, protein: 1.04, fat: 1.0, carbs: 0.98 } }, // ~700 (balance)
      { key: 'salad_bowl', label: 'サラダボウル系', factor: { kcal: 0.64, protein: 1.04, fat: 0.85, carbs: 0.46 } }, // ~450 (高P低C)
    ],
  },
  {
    id: 'okonomi',
    label: '粉もの',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute お好み焼き/広島/もんじゃ/たこ焼き: kcal 420-852
    defaultMacro: { kcal: 580, protein: 20, fat: 24, carbs: 70 },
    referenceDescription: '1枚=生地+具+卵 (お好み焼き相当)',
    amount: { unit: 'piece', default: 1, unitLabel: '枚', step: 0.5, chips: [{ label: '半分', value: 50 }, { label: '1枚', value: 1 }, { label: '2枚', value: 2 }] },
    attributes: [
      { key: 'okonomiyaki', label: 'お好み焼き', isDefault: true },
      { key: 'hiroshima', label: '広島お好み焼き', factor: { kcal: 1.47, protein: 1.6, fat: 1.33, carbs: 1.54 } },
      { key: 'monjayaki', label: 'もんじゃ', factor: { kcal: 0.72, protein: 0.9, fat: 0.63, carbs: 0.74 } },
      { key: 'takoyaki', label: 'たこ焼き', factor: { kcal: 0.72, protein: 0.6, fat: 0.75, carbs: 0.71 } },
    ],
    defaultAddonIds: ['sauce', 'mayo', 'katsuobushi', 'egg'],
    allowedAddonIds: ['sauce', 'mayo', 'katsuobushi', 'egg', 'cheese'],
  },
  {
    id: 'tenshin',
    label: '中華点心',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 250, protein: 10, fat: 10, carbs: 28 },
    referenceDescription: '5個=皮+具',
    amount: { unit: 'piece', default: 5 },
    attributes: [
      { key: 'gyoza', label: '餃子(焼)', isDefault: true },
      { key: 'gyoza_water', label: '水餃子', factor: { kcal: 0.82, fat: 0.58 } },
      { key: 'shumai', label: 'シューマイ', factor: { kcal: 0.88, fat: 0.83 } },
      { key: 'harumaki', label: '春巻', factor: { kcal: 1.12, fat: 1.17 } },
      { key: 'xiaolongbao', label: '小籠包', factor: { kcal: 1.0, fat: 0.75, carbs: 1.14 } },
    ],
    defaultAddonIds: ['rayu'],
  },
  {
    id: 'fried_main',
    label: '揚げもの単品',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 唐揚げ/とんかつ/エビフライ/コロッケ/フライドポテト: kcal 200-500, F 12-30
    defaultMacro: { kcal: 350, protein: 18, fat: 20, carbs: 18 },
    referenceDescription: '1個=衣+主菜',
    amount: { unit: 'piece', default: 3 },
    attributes: [
      { key: 'karaage', label: '唐揚げ', isDefault: true, factor: { kcal: 1.29, protein: 1.56, fat: 1.25 } },
      { key: 'tonkatsu', label: 'とんかつ', factor: { kcal: 1.43, protein: 1.22, fat: 1.5 } },
      { key: 'menchi', label: 'メンチカツ', factor: { kcal: 0.8, protein: 0.5, fat: 0.85 } },
      { key: 'ebi_fry', label: 'エビフライ', factor: { kcal: 0.8, protein: 0.83, fat: 0.75 } },
      { key: 'fish_fry', label: '魚介揚げ', factor: { kcal: 0.8, protein: 0.83, fat: 0.75 } },
      { key: 'korokke', label: 'コロッケ', factor: { kcal: 0.57, protein: 0.22, fat: 0.6 } },
      { key: 'tempura', label: '天ぷら盛', factor: { kcal: 0.8, protein: 0.28, fat: 0.9, carbs: 1.22 } },
      { key: 'fries', label: 'フライドポテト', factor: { kcal: 0.91, protein: 0.21, fat: 0.75, carbs: 2.22 } }, // ~320kcal/serving
    ],
    defaultAddonIds: ['sauce', 'mayo', 'tartar', 'lemon_squeeze'],
  },
  {
    id: 'yakitori',
    label: '焼鳥・串もの',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 70, protein: 6.4, fat: 3.2, carbs: 1.6 }, // 1本あたり (5本=350kcal)
    referenceDescription: '1本=鶏もも30g+タレ',
    amount: { unit: 'piece', default: 5, unitLabel: '本' },
  },
  {
    id: 'meat_solo',
    label: '肉単品 (ハンバーグ・ステーキ)',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 420, protein: 27, fat: 28, carbs: 12 },
    referenceDescription: '主菜のみ (ご飯/副菜なし)',
    amount: { unit: 'g', default: 150, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'hamburg', label: 'ハンバーグ', isDefault: true, factor: { kcal: 0.9, fat: 0.79, carbs: 1.5 } },
      { key: 'steak', label: 'ステーキ', factor: { kcal: 1.0, protein: 1.19, fat: 1.07, carbs: 0.17 } },
    ],
  },
  {
    id: 'nabe_heavy',
    label: '鍋もの (こってり)',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 700, protein: 33, fat: 35, carbs: 41 },
    referenceDescription: '肉150g+野菜+つゆ (1人前)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '軽め', value: 70 }, { label: '1人前', value: 100 }, { label: 'しっかり', value: 150 }] },
    attributes: [
      { key: 'sukiyaki', label: 'すき焼き', isDefault: true },
      { key: 'shabu', label: 'しゃぶしゃぶ', factor: { kcal: 0.93, fat: 0.86 } },
    ],
  },
  {
    id: 'nabe_light',
    label: '鍋もの (あっさり)',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 450, protein: 28, fat: 14, carbs: 42 },
    referenceDescription: '肉100g+野菜+出汁 (1人前)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '軽め', value: 70 }, { label: '1人前', value: 100 }, { label: 'しっかり', value: 150 }] },
    // おでんは具のばらつきが大きすぎるため除外。食材タブから個別記録推奨
    attributes: [
      { key: 'yose', label: '寄せ鍋', isDefault: true },
      { key: 'mizutaki', label: '水炊き', factor: { kcal: 0.95 } },
      { key: 'tonyu_nabe', label: '豆乳鍋', factor: { kcal: 1.05 } },
    ],
  },
  {
    id: 'sashimi',
    label: '刺身盛り',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 魚種で kcal/F が大きく振れる
    defaultMacro: { kcal: 50, protein: 6, fat: 1.6, carbs: 0.8 }, // 1切あたり (5切=250)
    referenceDescription: '1切=魚10g',
    amount: { unit: 'piece', default: 5, unitLabel: '切' },
    attributes: [
      { key: 'mixed', label: '盛り合わせ', isDefault: true }, // 平均値
      { key: 'maguro_lean', label: 'まぐろ赤身', factor: { kcal: 0.9, fat: 0.5 } },
      { key: 'maguro_chu', label: 'まぐろ中トロ', factor: { kcal: 1.6, fat: 4.0 } },
      { key: 'salmon', label: 'サーモン', factor: { kcal: 1.5, fat: 3.0 } },
      { key: 'buri_hamachi', label: 'ハマチ・ぶり', factor: { kcal: 1.4, fat: 2.5 } },
      { key: 'white_fish', label: '白身魚', factor: { kcal: 0.7, fat: 0.3 } },
      { key: 'ika_tako', label: 'イカ・タコ', factor: { kcal: 0.6, fat: 0.2 } },
    ],
  },
  // ---- v1.2: 汁物 4 Identity (旧 veggies bucket から移送) ----
  {
    id: 'miso_soup',
    label: '味噌汁・お吸い物',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 40, protein: 2.5, fat: 1, carbs: 4 },
    referenceDescription: '1杯=200ml相当',
    amount: { unit: 'piece', default: 1, unitLabel: '杯', chips: [{ label: '1杯', value: 1 }, { label: '大', value: 150 }] },
    attributes: [
      { key: 'light', label: '具薄', isDefault: true },
      { key: 'rich', label: '具沢山', factor: { kcal: 2.0, protein: 2.0, fat: 3.0, carbs: 2.0 } },
    ],
  },
  {
    id: 'tonjiru',
    label: '豚汁・けんちん汁',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 165, protein: 8, fat: 8, carbs: 15 },
    referenceDescription: '1杯=200ml相当 (豚肉・根菜入り)',
    amount: { unit: 'piece', default: 1, unitLabel: '杯', chips: [{ label: '1杯', value: 1 }, { label: '大', value: 150 }] },
  },
  {
    id: 'soup_western',
    label: '洋風スープ (薄)',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 50, protein: 2, fat: 1.4, carbs: 8 },
    referenceDescription: 'コンソメ・ミネストローネ等',
    amount: { unit: 'ml', default: 200, chips: [{ label: '200', value: 200 }, { label: '大', value: 300 }] },
    defaultAddonIds: ['cheese', 'crouton'],
    allowedAddonIds: ['cheese', 'crouton', 'corn_top'],
  },
  {
    id: 'soup_creamy',
    label: 'クリームスープ',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 140, protein: 3, fat: 6, carbs: 18 },
    referenceDescription: 'コーン・ポタージュ等',
    amount: { unit: 'ml', default: 200, chips: [{ label: '200', value: 200 }, { label: '大', value: 300 }] },
    defaultAddonIds: ['crouton', 'cheese'],
    allowedAddonIds: ['crouton', 'cheese', 'corn_top'],
  },
];

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export const DISH_IDENTITIES: Identity[] = [
  ...BUCKET_RICE_DISH,
  ...BUCKET_CURRY,
  ...BUCKET_CHINESE_NOODLES,
  ...BUCKET_JAPANESE_NOODLES,
  ...BUCKET_PASTA,
  ...BUCKET_SUSHI,
  ...BUCKET_SANDWICH,
  ...BUCKET_PIZZA,
  ...BUCKET_MISC_DISH,
];

export const DISH_IDENTITIES_BY_BUCKET = {
  rice_dish: BUCKET_RICE_DISH,
  curry: BUCKET_CURRY,
  chinese_noodles: BUCKET_CHINESE_NOODLES,
  japanese_noodles: BUCKET_JAPANESE_NOODLES,
  pasta: BUCKET_PASTA,
  sushi: BUCKET_SUSHI,
  sandwich: BUCKET_SANDWICH,
  pizza: BUCKET_PIZZA,
  misc_dish: BUCKET_MISC_DISH,
} as const;
