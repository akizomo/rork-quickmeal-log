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
    searchTags: ['ぎゅうどん', 'どんぶり'],
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
      { key: 'gyudon', label: '牛丼', isDefault: true, searchTags: ['ぎゅうどん'] },
      // 親子丼は卵が主菜のため egg を hidden（二重計上を避ける）
      { key: 'oyakodon', label: '親子丼', factor: { kcal: 0.94, protein: 1.12, fat: 0.82, carbs: 0.93 }, hiddenAddonIds: ['egg'], searchTags: ['おやこどん'] },
      // ねぎとろ丼は海鮮系 → rayu/kimchi は合わない
      { key: 'negitoro', label: 'ねぎとろ丼', factor: { kcal: 0.91, protein: 1, fat: 0.67, carbs: 0.97 }, defaultAddonIds: [] },
      // 中華丼は五目あんかけ → rayu は可・kimchi/egg は不自然
      { key: 'chuka', label: '中華丼', factor: { kcal: 0.91, protein: 0.88, fat: 0.89, carbs: 0.97 }, defaultAddonIds: ['rayu'], searchTags: ['ちゅうかどん'] },
      { key: 'mabo', label: '麻婆丼', factor: { kcal: 0.98, protein: 1, fat: 1.22, carbs: 0.93 }, searchTags: ['まーぼーどん'] },
    ],
    // cheese は親子丼/中華丼/麻婆丼に合わないので default から外し allowed のみに
    defaultAddonIds: ['egg', 'kimchi_top', 'rayu'],
    allowedAddonIds: ['egg', 'cheese', 'kimchi_top', 'rayu', 'mayo', 'katsu_add', 'gohan_omori'],
  },
  {
    id: 'kaisendon',
    label: '海鮮丼',
    searchTags: ['かいせんどん'],
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 580, protein: 28, fat: 10, carbs: 88 },
    referenceDescription: 'ご飯200g + 海鮮ネタ80g',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小盛', value: 70 }, { label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    allowedAddonIds: ['gohan_omori'],
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
    searchTags: ['かつどん', 'てんどん'],
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 850, protein: 27, fat: 29, carbs: 109 },
    referenceDescription: 'ご飯200g + カツ/天ぷら + 卵',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'katsudon', label: 'カツ丼', isDefault: true },
      { key: 'tendon', label: '天丼', factor: { kcal: 0.94, protein: 0.69, fat: 0.97, carbs: 1.09 } },
    ],
    allowedAddonIds: ['gohan_omori'],
  },
  {
    id: 'gapao_rice',
    label: 'ガパオライス・エスニックライス',
    primaryHome: { tab: 'dish', bucket: 'rice_dish' },
    defaultMacro: { kcal: 650, protein: 28, fat: 20, carbs: 78 },
    referenceDescription: 'ご飯200g + ガパオ炒め(肉100g+バジル)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'gapao', label: 'ガパオ', isDefault: true },
      { key: 'pad_krapow_pork', label: 'ガパオ(豚)', factor: { kcal: 0.97, protein: 0.96, fat: 0.95 } },
      { key: 'nasi_goreng', label: 'ナシゴレン', factor: { kcal: 1.03, fat: 1.1, carbs: 1.06 } },
    ],
    searchTags: ['タイ', 'エスニック', 'アジア', 'バジル'],
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
    searchTags: ['カレー', 'シチュー', 'カレーライス'],
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
      { key: 'green', label: 'グリーンカレー', factor: { kcal: 1.08, fat: 1.18, carbs: 0.97 } },
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
    defaultMacro: { kcal: 560, protein: 25, fat: 10, carbs: 100 },
    referenceDescription: '麺150g + スープ・基本具 (汁残し前提)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小さめ', value: 75 }, { label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'shoyu', label: '醤油', isDefault: true },
      { key: 'shio', label: '塩', factor: { kcal: 0.91 } },
    ],
    styles: [
      { key: 'no_soup', label: '汁残し', isDefault: true },
      { key: 'all_soup', label: '汁全飲み', factor: { kcal: 1.18, fat: 1.30 } },
    ],
    defaultAddonIds: RAMEN_ADDONS.slice(0, 4),
    allowedAddonIds: RAMEN_ADDONS,
  },
  {
    id: 'ramen_heavy',
    label: 'ラーメン (こってり)',
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 820, protein: 32, fat: 29, carbs: 99 },
    referenceDescription: '麺150g + こってりスープ・チャーシュー (汁残し前提)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小さめ', value: 75 }, { label: '普通', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'miso', label: '味噌', isDefault: true },
      // とんこつ・家系は背脂(seabura)が定番トッピング → default に追加
      {
        key: 'tonkotsu',
        label: 'とんこつ',
        factor: { kcal: 0.88, fat: 0.94 },
        defaultAddonIds: ['seasoned_egg', 'chashu', 'menma', 'nori_furikake', 'seabura'],
      },
      {
        key: 'iekei',
        label: '家系',
        factor: { kcal: 1.13, fat: 1.41 },
        defaultAddonIds: ['seasoned_egg', 'chashu', 'nori_furikake', 'seabura'],
      },
    ],
    styles: [
      { key: 'no_soup', label: '汁残し', isDefault: true },
      { key: 'all_soup', label: '汁全飲み', factor: { kcal: 1.24, fat: 1.34 } },
    ],
    defaultAddonIds: RAMEN_ADDONS.slice(0, 4),
    allowedAddonIds: RAMEN_ADDONS,
  },
  {
    id: 'ramen_jiro',
    label: '二郎系',
    searchTags: ['じろうけい', 'じろう'],
    primaryHome: { tab: 'dish', bucket: 'chinese_noodles' },
    defaultMacro: { kcal: 1500, protein: 55, fat: 75, carbs: 150 },
    referenceDescription: '麺300g + 大量野菜+豚 (1人前=小)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '麺少', value: 75 }, { label: '小', value: 100 }, { label: '大', value: 150 }] },
    defaultAddonIds: ['chashu', 'seabura'],
    allowedAddonIds: RAMEN_ADDONS,
  },
  {
    id: 'tsukemen',
    label: 'つけ麺・まぜそば',
    searchTags: ['つけめん'],
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
    searchTags: ['たんたんめん'],
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
    searchTags: ['やきそば'],
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
    searchTags: ['ひやしちゅうか', 'れいめん'],
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
    defaultMacro: { kcal: 430, protein: 12, fat: 2, carbs: 85 },
    referenceDescription: '麺250g (生1玉) + 出汁 (トッピングはアドオンで追加)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    attributes: [
      { key: 'kake', label: 'かけ', isDefault: true },
      { key: 'bukkake', label: 'ぶっかけ' },
      // きつね/月見は具を factor に織り込み済みなので、二重計上になる
      // トッピングを隠す (きつね=油揚げ, 月見=卵)。
      { key: 'kitsune', label: 'きつね', factor: { kcal: 1.16, protein: 1.13, fat: 1.33 }, hiddenAddonIds: ['kitsune_top'] },
      { key: 'tsukimi', label: '月見', factor: { kcal: 1.09, protein: 1.25, fat: 1.11 }, hiddenAddonIds: ['egg'] },
      { key: 'kamaage', label: '釜揚げ', factor: { kcal: 0.91, fat: 0.78 } },
    ],
    defaultAddonIds: ['egg', 'tempura_top', 'tororo'],
    allowedAddonIds: ['egg', 'tempura_top', 'kitsune_top', 'tororo'],
  },
  {
    id: 'soba',
    label: 'そば',
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 410, protein: 15, fat: 2.5, carbs: 79 },
    referenceDescription: '麺250g (生1玉) + つゆ (トッピングはアドオンで追加)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1人前', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    attributes: [
      { key: 'kake', label: 'かけ', isDefault: true },
      { key: 'zaru', label: 'ざる', factor: { kcal: 0.89 } },
      // 山かけ = とろろを factor に織り込み済みなので tororo トッピングを隠す
      { key: 'yamakake', label: '山かけ', factor: { kcal: 1.06, protein: 1.06 }, hiddenAddonIds: ['tororo'] },
    ],
    defaultAddonIds: ['egg', 'tempura_top', 'tororo'],
    allowedAddonIds: ['egg', 'tempura_top', 'kitsune_top', 'tororo'],
  },
  {
    id: 'tempura_noodle',
    label: '天ぷら麺',
    searchTags: ['てんぷら', 'てんそば', 'てんぷらうどん'],
    primaryHome: { tab: 'dish', bucket: 'japanese_noodles' },
    defaultMacro: { kcal: 665, protein: 22, fat: 17, carbs: 98 },
    referenceDescription: '麺250g + 天ぷら2-3個',
    amount: { unit: 'percent', default: 100, chips: [{ label: '1人前', value: 100 }, { label: '大盛', value: 150 }] },
    attributes: [
      { key: 'tempura_soba', label: '天そば', isDefault: true },
      { key: 'tempura_udon', label: '天ぷらうどん' },
      { key: 'nabe_yaki', label: '鍋焼きうどん', factor: { kcal: 1.10, protein: 1.20, fat: 1.15, carbs: 1.05 } },
    ],
  },
  {
    id: 'yaki_udon',
    label: '焼うどん',
    searchTags: ['やきうどん'],
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
    defaultMacro: { kcal: 400, protein: 10, fat: 1.5, carbs: 78 },
    referenceDescription: '麺100g (乾麺) + つゆ (トッピングはアドオンで追加)',
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
    searchTags: ['トマトパスタ', 'アラビアータ'],
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 680, protein: 22, fat: 19, carbs: 102 },
    referenceDescription: '麺250g (茹で) + トマトソース・基本具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
    allowedAddonIds: ['cheese', 'bacon_sausage', 'egg'],
  },
  {
    id: 'pasta_oil',
    label: 'オイル系パスタ',
    searchTags: ['ペペロンチーノ'],
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 700, protein: 20, fat: 28, carbs: 88 },
    referenceDescription: '麺250g + オイル+ガーリック・少量具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    defaultAddonIds: ['cheese'], // oil 重複は冗長なので allowed のみに
    allowedAddonIds: ['cheese', 'oil', 'bacon_sausage'],
  },
  {
    id: 'pasta_cream',
    label: 'クリーム系パスタ',
    searchTags: ['カルボナーラ', 'クリームパスタ'],
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 780, protein: 24, fat: 36, carbs: 86 },
    referenceDescription: '麺250g + クリームソース・チーズ',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
    allowedAddonIds: ['cheese', 'bacon_sausage', 'egg'],
  },
  {
    id: 'pasta_meat',
    label: 'ミート系パスタ',
    searchTags: ['ミートソース', 'ボロネーゼ'],
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 690, protein: 26, fat: 22, carbs: 96 },
    referenceDescription: '麺250g + ミートソース',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
    defaultAddonIds: ['cheese'],
    allowedAddonIds: ['cheese', 'bacon_sausage', 'egg'],
  },
  {
    id: 'pasta_japanese',
    label: '和風パスタ',
    searchTags: ['わふうぱすた', 'たらこぱすた', 'めんたいこぱすた'],
    primaryHome: { tab: 'dish', bucket: 'pasta' },
    defaultMacro: { kcal: 620, protein: 20, fat: 20, carbs: 88 },
    referenceDescription: '麺250g + 醤油・和風具',
    amount: { unit: 'percent', default: 100, chips: [{ label: '小', value: 50 }, { label: '1皿', value: 100 }, { label: '大盛', value: 150 }, { label: '特盛', value: 200 }] },
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
    searchTags: ['かいてんずし', 'すし', 'おすし'],
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 1040, protein: 56, fat: 32, carbs: 131 }, // 8皿分合計 (1皿=130kcal)
    referenceDescription: '1皿=2貫 (シャリ40g+ネタ20g/皿)',
    amount: { unit: 'plate', default: 8 },
  },
  {
    id: 'sushi_piece',
    label: 'セット寿司 (貫)',
    searchTags: ['せっとずし', 'にぎり'],
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 650, protein: 35, fat: 20, carbs: 82 }, // 10貫分合計 (1貫=65kcal)
    referenceDescription: '1貫=シャリ20g+ネタ10g',
    amount: { unit: 'piece', default: 10, unitLabel: '貫' },
  },
  {
    id: 'chirashi',
    label: 'ちらし寿司',
    searchTags: ['ちらしずし'],
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 600, protein: 28, fat: 14, carbs: 90 },
    referenceDescription: 'ご飯200g + 海鮮5切+錦糸卵',
    amount: { unit: 'percent', default: 100, chips: [{ label: '並', value: 100 }, { label: '大盛', value: 150 }] },
  },
  {
    id: 'maki',
    label: '巻き・いなり・手巻き',
    searchTags: ['まきずし', 'てまきずし', 'いなりずし'],
    primaryHome: { tab: 'dish', bucket: 'sushi' },
    defaultMacro: { kcal: 180, protein: 5, fat: 2, carbs: 38 },
    referenceDescription: '細巻=米80g+具/本',
    amount: { unit: 'piece', default: 1, unitLabel: '本' }, // 基準: 細巻=1本=180kcal
    attributes: [
      { key: 'maki_thin', label: '細巻', isDefault: true, searchTags: ['ほそまき'] },
      // 太巻きは「切」単位で売られる。factor は細巻1本に対する1切分の比率。
      // chips で「6切」「8切」を用意し、購入単位に合わせやすくする。
      {
        key: 'maki_thick',
        label: '太巻き',
        searchTags: ['ふとまき'],
        factor: { kcal: 0.44, carbs: 0.42 },
        amount: { unit: 'piece', default: 1, unitLabel: '切', chips: [{ label: '3切', value: 3 }, { label: '6切', value: 6 }, { label: '8切', value: 8 }] },
      },
      {
        key: 'inari',
        label: 'いなり',
        factor: { kcal: 0.67, fat: 1.0, carbs: 0.63 },
        amount: { unit: 'piece', default: 1, unitLabel: '個', chips: [{ label: '1個', value: 1 }, { label: '2個', value: 2 }, { label: '3個', value: 3 }] },
      },
      {
        key: 'temaki',
        label: '手巻き',
        factor: { kcal: 1.0, protein: 1.4, fat: 2.0, carbs: 0.79 },
        amount: { unit: 'piece', default: 1, unitLabel: '個', chips: [{ label: '1個', value: 1 }, { label: '2個', value: 2 }] },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bucket 7: サンドバーガー (sandwich) — 5 Identity (burger merged)
// ---------------------------------------------------------------------------

const BUCKET_SANDWICH: Identity[] = [
  {
    id: 'cold_sand',
    label: 'サンドイッチ',
    searchTags: ['さんどいっち', 'サンド', 'たまごサンド', 'ツナサンド', 'コンビニサンド'],
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 345, protein: 13, fat: 18, carbs: 30 },
    referenceDescription: 'パン2枚 + 具',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'egg', label: 'たまご', isDefault: true },
      { key: 'tuna', label: 'ツナ', factor: { kcal: 1.04, protein: 1.08, fat: 1.11 } },
      { key: 'ham_blt', label: 'ハム・BLT', factor: { kcal: 0.96, protein: 1.08, fat: 0.89, carbs: 1.03 } },
      // コンビニ実測 (セブン チキンカツ422/P17.2/F22/C39.8・ハムカツ369/P9.3/F18.3/C43.1、
      // 一般的なカツサンド160g 400/P16.4/F20.8/C38.9) の平均から逆算。
      { key: 'katsu', label: 'カツサンド', searchTags: ['かつさんど', 'コンビニカツサンド'], factor: { kcal: 1.16, protein: 1.1, fat: 1.13, carbs: 1.35 } },
    ],
    defaultAddonIds: ['cheese', 'bacon_sausage', 'avocado'],
  },
  {
    id: 'hot_sand',
    label: 'ホットサンド',
    searchTags: ['ほっとさんど', 'ホットサンド', 'グリルドチーズ', 'パニーニ'],
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 420, protein: 18, fat: 22, carbs: 36 },
    referenceDescription: 'パン2枚 + 具・チーズ・トースト',
    amount: { unit: 'piece', default: 1 },
    defaultAddonIds: ['cheese', 'bacon_sausage'],
  },
  {
    // チェーン定番帯。マック/モスの主力商品11点が 330-425kcal に密集しており、
    // base はその中心 (モスバーガー 372/15.2/17.0/40.0 相当) に置く。
    // 旧 base は 460kcal で、実際にはダブルチーズ(459)・チキンフィレオ(479)の帯に
    // あたり、素で「バーガー」を選ぶと恒常的に過大計上していた。
    // 「ダブル/ビッグマック」等のパティ増しは属性ではなく patty_add で表現する。
    id: 'burger',
    label: 'バーガー',
    searchTags: ['はんばーがー', 'ハンバーガー', 'マック', 'マクドナルド', 'モス', 'モスバーガー', 'ロッテリア', 'フレッシュネス', 'ファストフード'],
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 380, protein: 15, fat: 18, carbs: 40 },
    referenceDescription: 'バンズ+パティ+野菜 1個 (チェーン定番サイズ)',
    // 小=マックのハンバーガー(259)/チーズバーガー(310) 帯、大=ビッグマック(524) 帯。
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '小', value: 75 }, { label: '1個', value: 100 }, { label: '大', value: 125 }],
    },
    // factor はマクドナルド・モスバーガー公式栄養成分の実測値から逆算 (同種商品は平均)。
    attributes: [
      { key: 'beef', label: 'ビーフ', isDefault: true },
      // モスチーズバーガー 425/18.2/21.4/40.4
      { key: 'cheese', label: 'チーズ', factor: { kcal: 1.12, protein: 1.21, fat: 1.19, carbs: 1.01 } },
      // フィレオフィッシュ 338/15.1/14.2/37.4・モスフィッシュ 381/16.2/18.8/37.0
      { key: 'fish', label: 'フィッシュ', searchTags: ['フィレオフィッシュ', 'さかな'], factor: { kcal: 0.95, protein: 1.04, fat: 0.92, carbs: 0.93 } },
      // マックチキン 386/13.5/19.6/39.5・モスチキン 386/15.0/18.5/40.0
      { key: 'chicken', label: 'チキン', searchTags: ['とり', 'チキンフィレオ'], factor: { kcal: 1.02, protein: 0.95, fat: 1.06, carbs: 0.99 } },
      // てりやきは脂質が突出しタンパク質が低い (マックてりやき 485/P14.2/F31.3)。
      // 旧「こってり」ではこのPFCの偏りを表現できなかったため独立させる。
      { key: 'teriyaki', label: 'てりやき', searchTags: ['テリヤキ', '照り焼き'], factor: { kcal: 1.14, protein: 0.95, fat: 1.38, carbs: 0.98 } },
      // モスロースカツ 410/16.6/16.3/49.7・えびフィレオ 408/11.4/18.6/49.5
      { key: 'katsu', label: 'カツ・エビカツ', searchTags: ['かつばーがー', 'えびかつ'], factor: { kcal: 1.08, protein: 0.93, fat: 0.97, carbs: 1.24 } },
    ],
    defaultAddonIds: ['cheese', 'patty_add', 'bacon_sausage', 'avocado'],
  },
  {
    // 専門店・大型バーガー帯。ワッパー(672)・ぜいたくモスチーズ(685)・
    // グルメバーガー(757)・BBQステーキワッパー(811) はチェーン定番帯の約2倍あり、
    // ラーメンを ramen_light / ramen_heavy に分けているのと同じ理由で Identity を分ける。
    id: 'burger_big',
    label: 'バーガー (大きめ・専門店)',
    searchTags: ['ぐるめばーがー', 'グルメバーガー', 'ワッパー', 'バーガーキング', 'クラフトバーガー', 'ぜいたく'],
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 700, protein: 29, fat: 40, carbs: 51 },
    referenceDescription: 'ワッパー・ぜいたく系・専門店バーガー 1個',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1個', value: 100 }, { label: '大', value: 130 }],
    },
    attributes: [
      { key: 'standard', label: '定番', isDefault: true },
      // グルメ系アボカドチーズバーガー 約757kcal
      { key: 'gourmet', label: 'グルメ・専門店', factor: { kcal: 1.08 } },
      // BBQステーキワッパー 811/33.3/52.6/51.9
      { key: 'heavy', label: '特盛・BBQ系', factor: { kcal: 1.16, protein: 1.15, fat: 1.32, carbs: 1.02 } },
    ],
    defaultAddonIds: ['cheese', 'patty_add', 'bacon_sausage', 'avocado'],
  },
  {
    id: 'burrito_taco',
    label: 'ブリトー・タコス',
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    quickTapDisabled: true,
    defaultMacro: { kcal: 500, protein: 25, fat: 18, carbs: 55 },
    referenceDescription: 'トルティーヤ1枚 + 肉・野菜・チーズ',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'burrito', label: 'ブリトー', isDefault: true },
      {
        key: 'taco',
        label: 'タコス',
        // factor は「2個」基準 (500kcal×0.76=380kcal)。個数入力を実数に合わせるため
        // amount を上書き (Identity既定の piece=1個 だと「1個」表示なのに実際は2個分になっていた)。
        factor: { kcal: 0.76, protein: 0.88, fat: 0.83, carbs: 0.76 },
        amount: {
          unit: 'piece',
          default: 2,
          unitLabel: '個',
          chips: [
            { label: '1', value: 1 },
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 },
          ],
        },
      },
      { key: 'bowl', label: 'ブリトーボウル', factor: { kcal: 0.84, fat: 0.78, carbs: 0.8 } },
    ],
    searchTags: ['メキシコ', 'メキシカン', 'トルティーヤ', 'ラップ'],
  },
  {
    id: 'hot_dog_pita',
    label: 'ホットドッグ系',
    searchTags: ['ほっとどっぐ'],
    primaryHome: { tab: 'dish', bucket: 'sandwich' },
    defaultMacro: { kcal: 375, protein: 15, fat: 15, carbs: 40 },
    referenceDescription: 'パン1個 + 具',
    amount: { unit: 'piece', default: 1 },
    attributes: [
      { key: 'hot_dog', label: 'ホットドッグ', isDefault: true },
      { key: 'banh_mi', label: 'バインミー', factor: { kcal: 1.07, protein: 1.13 } },
      { key: 'pita', label: 'ピタサンド', factor: { kcal: 0.93 } },
      // 衣で揚げる衣物のため脂質特性が別物 (セブン アメリカンドッグ358/P10/F28.3/C17.1、
      // ビッグアメリカンドッグ324/P6/F17.3/C37.7 の平均から逆算)。パン系の他属性と違い
      // 高脂質・低たんぱくにシフトする。
      { key: 'corn_dog', label: 'アメリカンドッグ', searchTags: ['あめりかんどっぐ', 'コーンドッグ'], factor: { kcal: 0.91, protein: 0.53, fat: 1.52, carbs: 0.69 } },
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
    searchTags: ['ピザ', 'マルゲリータ'],
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 210, protein: 9, fat: 7, carbs: 26 }, // 2切=210kcal
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
    searchTags: ['にくピザ', 'ペパロニ'],
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 350, protein: 16, fat: 16, carbs: 36 }, // 2切=350kcal
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
    searchTags: ['ちーずピザ', 'クアトロフォルマッジ'],
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 440, protein: 22, fat: 24, carbs: 34 }, // 2切=440kcal
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
    searchTags: ['しーふーどピザ'],
    primaryHome: { tab: 'dish', bucket: 'pizza' },
    defaultMacro: { kcal: 300, protein: 16, fat: 12, carbs: 34 }, // 2切=300kcal
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

// misc_dish は「主食で分類されないもの」の受け皿になるため、識別しやすいよう
// テーマ順に並べる: 定食類 → 主菜単品 → 中華 → 鍋 → 生もの → 粉もの → 汁物。
const BUCKET_MISC_DISH: Identity[] = [
  {
    id: 'teishoku',
    label: '定食',
    searchTags: ['ていしょく'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 焼魚/焼肉/唐揚げ/トンカツ/生姜焼き/ハンバーグ: kcal 700-1003, F 18-40
    defaultMacro: { kcal: 850, protein: 32, fat: 30, carbs: 108 },
    referenceDescription: 'ご飯200g+主菜+副菜+味噌汁',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [
        { label: '軽め', value: 70 },
        { label: '1食', value: 100 },
        { label: 'しっかり', value: 150 },
      ],
    },
    attributes: [
      { key: 'yakizakana', label: '焼魚定食', isDefault: true, factor: { kcal: 0.82, protein: 1.0, fat: 0.6, carbs: 0.91 }, searchTags: ['やきざかな'] },
      { key: 'yakiniku', label: '焼肉定食', factor: { kcal: 1.06, protein: 1.09, fat: 1.07 }, searchTags: ['やきにく'] },
      { key: 'karaage', label: '唐揚げ定食', factor: { kcal: 1.05, protein: 1.06, fat: 1.13, carbs: 0.97 }, searchTags: ['からあげ'] },
      { key: 'tonkatsu', label: 'トンカツ定食', factor: { kcal: 1.18, protein: 1.09, fat: 1.33, carbs: 1.02 }, searchTags: ['とんかつ'] },
      { key: 'shogayaki', label: '生姜焼き定食', factor: { kcal: 0.96, protein: 1.06, fat: 0.90, carbs: 0.96 }, searchTags: ['しょうがやき'] },
      { key: 'hamburg', label: 'ハンバーグ定食', factor: { kcal: 1.0, protein: 1.0, fat: 1.07, carbs: 0.91 } },
    ],
    allowedAddonIds: ['gohan_omori'],
  },
  {
    id: 'bento',
    label: '弁当',
    searchTags: ['べんとう'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 700, protein: 23, fat: 20, carbs: 98 },
    referenceDescription: 'ご飯+主菜+副菜 (お弁当箱1食)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [
        { label: '軽め', value: 70 },
        { label: '1食', value: 100 },
        { label: 'しっかり', value: 150 },
      ],
    },
    // 主菜タイプで Attribute 分け (旧 コンビニ/手作り/幕の内/駅弁 はPFC収束しないので廃止)
    attributes: [
      { key: 'noriben', label: 'のり弁', isDefault: true, factor: { kcal: 0.79, protein: 0.61, fat: 0.6, carbs: 0.94 }, searchTags: ['のりべん'] }, // ~550kcal
      { key: 'sake', label: '鮭弁', factor: { kcal: 0.93, protein: 0.96, fat: 0.85, carbs: 0.96 }, searchTags: ['さけべん', 'しゃけべん'] }, // ~650
      { key: 'karaage', label: '唐揚げ弁当', factor: { kcal: 1.21, protein: 1.22, fat: 1.4, carbs: 1.0 }, searchTags: ['からあげべんとう'] }, // ~850
      { key: 'tonkatsu', label: 'とんかつ弁当', factor: { kcal: 1.29, protein: 1.13, fat: 1.5, carbs: 1.07 } }, // ~900
      { key: 'yakiniku', label: '焼肉弁当', factor: { kcal: 1.21, protein: 1.3, fat: 1.4, carbs: 0.92 }, searchTags: ['やきにくべんとう'] }, // ~850
      { key: 'chuka', label: '中華弁当', factor: { kcal: 1.07, protein: 1.04, fat: 1.0, carbs: 1.04 }, searchTags: ['ちゅうかべんとう'] }, // ~750
      { key: 'makunouchi', label: '幕の内弁当', factor: { kcal: 1.0, protein: 1.04, fat: 1.0, carbs: 0.98 }, searchTags: ['まくのうち'] }, // ~700 (balance)
      { key: 'salad_bowl', label: 'サラダボウル系', factor: { kcal: 0.64, protein: 1.04, fat: 0.85, carbs: 0.46 } }, // ~450 (高P低C)
    ],
  },
  {
    id: 'fried_main',
    label: '揚げもの単品',
    searchTags: ['からあげ', 'あげもの'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 唐揚げ/とんかつ/エビフライ/コロッケ/フライドポテト: kcal 200-500, F 12-30
    defaultMacro: { kcal: 350, protein: 18, fat: 20, carbs: 18 },
    referenceDescription: '1個=衣+主菜',
    amount: { unit: 'piece', default: 3 },
    // 種類ごとに定番の調味料が異なる (唐揚げ=レモン/マヨ, とんかつ=ソース,
    // エビフライ/魚介=タルタル 等)。allowedAddonIds 既定の4種から出し分ける。
    attributes: [
      // 唐揚げはむね/もも(手羽含む)で脂質が大きく異なるため部位別に分離。
      // 食材タブの鶏むね(揚げ)・鶏もも(揚げ)からの振替もここに着地する。
      // amount は振替元の g 表記をそのまま引き継げるよう g 単位で上書き
      // (Identity 既定は piece=3個)。数値は日本食品標準成分表ベースの目安 (100gあたり)。
      {
        key: 'karaage_momo',
        label: '唐揚げ(もも)',
        isDefault: true,
        searchTags: ['からあげ'],
        factor: { kcal: 0.857, protein: 1.111, fat: 0.95, carbs: 0.556 }, // ≒300kcal/P20/F19/C10 per 100g
        defaultAddonIds: ['lemon_squeeze', 'mayo'],
        amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
        // 外食・コンビニ等、生肉のgが分からない場面向けの個数入力 (1個≒30g相当)
        altAmount: { unit: 'piece', default: 3, unitLabel: '個', gramsPerUnit: 30 },
      },
      {
        key: 'karaage_mune',
        label: '唐揚げ(むね)',
        searchTags: ['からあげ'],
        factor: { kcal: 0.629, protein: 1.444, fat: 0.4, carbs: 0.5 }, // ≒220kcal/P26/F8/C9 per 100g
        defaultAddonIds: ['lemon_squeeze', 'mayo'],
        amount: { unit: 'g', default: 100, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
        altAmount: { unit: 'piece', default: 3, unitLabel: '個', gramsPerUnit: 30 },
      },
      { key: 'tonkatsu', label: 'ロースかつ', factor: { kcal: 1.43, protein: 1.22, fat: 1.5 }, defaultAddonIds: ['sauce', 'mayo'] },
      { key: 'tonkatsu_hire', label: 'ヒレかつ', factor: { kcal: 1.1, protein: 1.45, fat: 0.7, carbs: 1.0 }, defaultAddonIds: ['sauce', 'mayo'] },
      { key: 'menchi', label: 'メンチカツ', factor: { kcal: 0.8, protein: 0.5, fat: 0.85 }, defaultAddonIds: ['sauce', 'mayo'] },
      { key: 'ebi_fry', label: 'エビフライ', factor: { kcal: 0.8, protein: 0.83, fat: 0.75 }, defaultAddonIds: ['tartar', 'lemon_squeeze'] },
      { key: 'fish_fry', label: '魚介揚げ', searchTags: ['ぎょかいあげ'], factor: { kcal: 0.8, protein: 0.83, fat: 0.75 }, defaultAddonIds: ['tartar', 'lemon_squeeze'] },
      { key: 'korokke', label: 'コロッケ', factor: { kcal: 0.57, protein: 0.22, fat: 0.6 }, defaultAddonIds: ['sauce'] },
      { key: 'tempura', label: '天ぷら盛', searchTags: ['てんぷら'], factor: { kcal: 0.8, protein: 0.28, fat: 0.9, carbs: 1.22 }, defaultAddonIds: ['lemon_squeeze'] },
      {
        key: 'fries',
        label: 'フライドポテト',
        // ポテトは個数で数えるものではないため S/M/L のサイズチップにする
        // (Identity 既定の piece=3個 は上書き)。数値は目安 (M=120g≒336kcal)。
        factor: { kcal: 0.96, protein: 0.24, fat: 0.81, carbs: 2.47 },
        defaultAddonIds: ['mayo'],
        amount: { unit: 'g', default: 120, step: 10, chips: [{ label: 'S', value: 70 }, { label: 'M', value: 120 }, { label: 'L', value: 160 }] },
      },
    ],
    defaultAddonIds: ['sauce', 'mayo', 'tartar', 'lemon_squeeze'],
    allowedAddonIds: ['sauce', 'mayo', 'tartar', 'lemon_squeeze'],
  },
  {
    id: 'yakitori',
    label: '焼鳥・串もの',
    searchTags: ['やきとり', 'くしもの', 'くしやき'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 350, protein: 32, fat: 16, carbs: 8 }, // 5本=350kcal
    referenceDescription: '1本=鶏もも30g+タレ',
    amount: { unit: 'piece', default: 5, unitLabel: '本' },
  },
  {
    id: 'meat_solo',
    label: 'ハンバーグ・ステーキ',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 420, protein: 27, fat: 28, carbs: 12 },
    referenceDescription: '主菜のみ (ご飯/副菜なし)',
    amount: { unit: 'g', default: 150, step: 10, chips: [{ label: '100', value: 100 }, { label: '150', value: 150 }, { label: '200', value: 200 }] },
    attributes: [
      { key: 'hamburg', label: 'ハンバーグ', isDefault: true, factor: { kcal: 0.9, fat: 0.79, carbs: 1.5 } },
      { key: 'steak', label: 'ステーキ', factor: { kcal: 1.0, protein: 1.19, fat: 1.07, carbs: 0.17 } },
    ],
  },
  {
    id: 'tenshin',
    label: '中華点心',
    searchTags: ['ちゅうかてんしん', 'ぎょうざ'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 250, protein: 10, fat: 10, carbs: 28 },
    referenceDescription: '餃子=5個 / 春巻=1本≒140kcal / 小籠包=5個',
    amount: { unit: 'piece', default: 5 },
    attributes: [
      { key: 'gyoza', label: '餃子(焼き)', isDefault: true, searchTags: ['ぎょうざ', 'やきぎょうざ'] },
      { key: 'gyoza_water', label: '水餃子', factor: { kcal: 0.82, fat: 0.58 }, searchTags: ['すいぎょうざ'] },
      { key: 'shumai', label: 'シューマイ', factor: { kcal: 0.88, fat: 0.83 } },
      // 春巻きは1本が大きい。2本デフォルトに設定 (factor は5個換算済み → 2本で280kcal≒1本140kcal)。
      {
        key: 'harumaki',
        label: '春巻',
        searchTags: ['はるまき'],
        factor: { kcal: 1.12, fat: 1.17 },
        amount: { unit: 'piece', default: 2, unitLabel: '本', chips: [{ label: '1本', value: 1 }, { label: '2本', value: 2 }, { label: '3本', value: 3 }] },
      },
      { key: 'xiaolongbao', label: '小籠包', factor: { kcal: 1.0, fat: 0.75, carbs: 1.14 }, searchTags: ['しょうろんぽう'] },
    ],
    defaultAddonIds: ['rayu'],
  },
  {
    id: 'chuka_okazu',
    label: '中華おかず',
    searchTags: ['ちゅうかおかず'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    // 中華の主菜おかず (炒め・麻婆・あん・揚げ) を1バケットに集約。種類でPFCが
    // 大きく変わるため即記録は無効化。数値は「公式PFC比 (文科省食品成分DB 八訂) ×
    // チェーン店1人前kcal (大阪王将/バーミヤン/日高屋)」ハイブリッド。
    // percent 単位で 100% = 外食1人前 (料理ごとにグラムは異なる)。
    quickTapDisabled: true,
    // 基準は麻婆豆腐 (大阪王将 542kcal/1人前、PFC比は文科省 麻婆豆腐)。
    defaultMacro: { kcal: 542, protein: 27, fat: 38, carbs: 22 },
    referenceDescription: '主菜のみ (ご飯なし)。100% = 外食1人前',
    amount: { unit: 'percent', default: 100, chips: [{ label: '軽め', value: 70 }, { label: '1人前', value: 100 }, { label: 'しっかり', value: 150 }] },
    attributes: [
      { key: 'mapo_tofu', label: '麻婆豆腐', isDefault: true, searchTags: ['まーぼーどうふ', 'まぼどうふ'] },
      { key: 'mapo_nasu', label: '麻婆茄子', searchTags: ['まーぼーなす', 'まぼなす'], factor: { kcal: 0.895, protein: 0.556, fat: 0.974, carbs: 1.045 } }, // ≒485kcal/P15/F37/C23
      // 炒め物系 (旧 stir_fry_meat を統合)。レバニラ=日高屋482kcal 基準。
      { key: 'reba_nira', label: 'レバニラ', factor: { kcal: 0.889, protein: 0.889, fat: 0.782, carbs: 1.591 } }, // ≒482kcal/P24/F30/C35
      { key: 'pork_vegetable', label: '豚肉野菜炒め', searchTags: ['やさいいため'], factor: { kcal: 0.952, protein: 0.667, fat: 1.079, carbs: 0.818 } }, // ≒516kcal/P18/F41/C18
      { key: 'twice_cooked_pork', label: '回鍋肉', searchTags: ['ほいこーろー'], factor: { kcal: 0.738, protein: 0.519, fat: 0.842, carbs: 0.636 } }, // ≒400kcal/P14/F32/C14
      { key: 'chinjao', label: '青椒肉絲', searchTags: ['ちんじゃおろーすー'], factor: { kcal: 0.823, protein: 0.852, fat: 0.789, carbs: 0.955 } }, // ≒446kcal/P23/F30/C21
      { key: 'happosai', label: '八宝菜', searchTags: ['はっぽうさい'], factor: { kcal: 0.627, protein: 0.667, fat: 0.553, carbs: 0.864 } }, // ≒340kcal/P18/F21/C19
      { key: 'yurinchi', label: '油淋鶏', searchTags: ['ゆーりんちー'], factor: { kcal: 1.087, protein: 1.222, fat: 1.079, carbs: 1.0 } }, // ≒589kcal/P33/F41/C22
      { key: 'subuta', label: '酢豚', searchTags: ['すぶた'], factor: { kcal: 1.194, protein: 1.111, fat: 0.816, carbs: 2.818 } }, // ≒647kcal/P30/F31/C62 (甘酢でC高)
      { key: 'ebi_chili', label: 'エビチリ', factor: { kcal: 1.103, protein: 1.185, fat: 0.789, carbs: 2.273 } }, // ≒598kcal/P32/F30/C50
      { key: 'ebi_mayo', label: 'エビマヨ', factor: { kcal: 1.122, protein: 0.926, fat: 1.158, carbs: 1.273 } }, // ≒608kcal/P25/F44/C28 (マヨでF高)
    ],
    allowedAddonIds: ['rayu'],
  },
  {
    id: 'nabe',
    label: '鍋もの',
    searchTags: ['なべもの', 'なべ'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    // こってり系(すき焼き/しゃぶしゃぶ)とあっさり系(寄せ鍋/水炊き/豆乳鍋)を統合。
    // 基準はすき焼き (旧 nabe_heavy)。おでんは具のばらつきが大きすぎるため除外
    // (食材タブから個別記録推奨)。
    quickTapDisabled: true,
    defaultMacro: { kcal: 700, protein: 33, fat: 35, carbs: 41 },
    referenceDescription: '肉150g+野菜+つゆ (1人前)',
    amount: { unit: 'percent', default: 100, chips: [{ label: '軽め', value: 70 }, { label: '1人前', value: 100 }, { label: 'しっかり', value: 150 }] },
    attributes: [
      { key: 'sukiyaki', label: 'すき焼き', isDefault: true, searchTags: ['すきやき'] },
      { key: 'shabu', label: 'しゃぶしゃぶ', factor: { kcal: 0.93, fat: 0.86 } },
      // 旧 nabe_light (寄せ鍋=450kcal 基準) を新基準(700kcal)に対する factor に換算。
      { key: 'yose', label: '寄せ鍋', searchTags: ['よせなべ'], factor: { kcal: 0.643, protein: 0.848, fat: 0.4, carbs: 1.024 } },
      { key: 'mizutaki', label: '水炊き', searchTags: ['みずたき'], factor: { kcal: 0.611, protein: 0.848, fat: 0.4, carbs: 1.024 } },
      { key: 'tonyu_nabe', label: '豆乳鍋', searchTags: ['とうにゅうなべ'], factor: { kcal: 0.675, protein: 0.848, fat: 0.4, carbs: 1.024 } },
    ],
  },
  {
    id: 'sashimi',
    label: '刺身盛り',
    searchTags: ['さしみ', 'おさしみ'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute 魚種で kcal/F が大きく振れる
    defaultMacro: { kcal: 250, protein: 30, fat: 8, carbs: 4 }, // 5切=250kcal
    referenceDescription: '1切=魚30g',
    amount: { unit: 'piece', default: 5, unitLabel: '切' },
    attributes: [
      { key: 'mixed', label: '盛り合わせ', isDefault: true }, // 平均値
      { key: 'maguro_lean', label: 'まぐろ赤身', factor: { kcal: 0.9, fat: 0.5 } },
      { key: 'maguro_chu', label: 'まぐろ中トロ', factor: { kcal: 1.6, fat: 4.0 } },
      { key: 'salmon', label: 'サーモン', factor: { kcal: 1.5, fat: 3.0 } },
      { key: 'buri_hamachi', label: 'ハマチ・ぶり', factor: { kcal: 1.4, fat: 2.5 } },
      { key: 'white_fish', label: '白身魚', searchTags: ['しろみざかな'], factor: { kcal: 0.7, fat: 0.3 } },
      { key: 'ika_tako', label: 'イカ・タコ', factor: { kcal: 0.6, fat: 0.2 } },
    ],
  },
  {
    id: 'fresh_roll',
    label: '生春巻き',
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    defaultMacro: { kcal: 130, protein: 7, fat: 3, carbs: 20 },
    referenceDescription: '1本=ライスペーパー+エビ/鶏+野菜',
    amount: { unit: 'piece', default: 2, unitLabel: '本' },
    searchTags: ['ベトナム', 'エスニック', 'ライスペーパー', 'ヘルシー'],
  },
  {
    id: 'okonomi',
    label: '粉もの',
    searchTags: ['こなもの', 'おこのみやき', 'たこやき'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    quickTapDisabled: true, // Attribute お好み焼き/広島/もんじゃ/たこ焼き: kcal 420-852
    defaultMacro: { kcal: 580, protein: 20, fat: 24, carbs: 70 },
    referenceDescription: '1枚=生地+具+卵 (お好み焼き相当)',
    amount: { unit: 'piece', default: 1, unitLabel: '枚', step: 0.5, chips: [{ label: '半分', value: 0.5 }, { label: '1枚', value: 1 }, { label: '2枚', value: 2 }] },
    attributes: [
      // お好み焼き・広島: sauce/mayo/削り節が定番。卵は具に入ることが多いが追加もあり。
      { key: 'okonomiyaki', label: 'お好み焼き', isDefault: true, searchTags: ['おこのみやき'] },
      { key: 'hiroshima', label: '広島お好み焼き', searchTags: ['ひろしまおこのみやき'], factor: { kcal: 1.47, protein: 1.6, fat: 1.33, carbs: 1.54 } },
      { key: 'monjayaki', label: 'もんじゃ', factor: { kcal: 0.72, protein: 0.9, fat: 0.63, carbs: 0.74 } },
      // たこ焼きは sauce(ソース)が定番。mayo は任意、cheese/卵は一般的でない。
      {
        key: 'takoyaki',
        label: 'たこ焼き',
        searchTags: ['たこやき'],
        factor: { kcal: 0.72, protein: 0.6, fat: 0.75, carbs: 0.71 },
        defaultAddonIds: ['sauce'],
        allowedAddonIds: ['sauce', 'mayo', 'katsuobushi'],
      },
    ],
    defaultAddonIds: ['sauce', 'mayo', 'katsuobushi', 'egg'],
    allowedAddonIds: ['sauce', 'mayo', 'katsuobushi', 'egg', 'cheese'],
  },
  // ---- v1.2: 汁物 (旧 veggies bucket から移送)。v1.9 で 4 Identity → 1 に統合 ----
  {
    id: 'soup',
    label: '汁物・スープ',
    searchTags: ['しるもの', 'みそしる'],
    primaryHome: { tab: 'dish', bucket: 'misc_dish' },
    // 和風(味噌汁/豚汁)と洋風(コンソメ/クリーム)を統合。基準は味噌汁(具薄)。
    quickTapDisabled: true,
    defaultMacro: { kcal: 40, protein: 2.5, fat: 1, carbs: 4 },
    referenceDescription: '1杯=200ml相当',
    amount: { unit: 'piece', default: 1, unitLabel: '杯', chips: [{ label: '1杯', value: 1 }, { label: '大', value: 2 }] },
    attributes: [
      { key: 'miso_light', label: '味噌汁・お吸い物', isDefault: true, searchTags: ['みそしる', 'おすいもの'] },
      { key: 'miso_rich', label: '味噌汁(具沢山)', factor: { kcal: 2.0, protein: 2.0, fat: 3.0, carbs: 2.0 }, searchTags: ['みそしる'] },
      { key: 'tonjiru', label: '豚汁・けんちん汁', factor: { kcal: 4.125, protein: 3.2, fat: 8.0, carbs: 3.75 }, searchTags: ['とんじる', 'ぶたじる', 'けんちんじる'] },
      {
        key: 'western',
        label: '洋風スープ',
        searchTags: ['ようふうすーぷ'],
        factor: { kcal: 1.25, protein: 0.8, fat: 1.4, carbs: 2.0 },
        defaultAddonIds: ['cheese', 'crouton'],
        allowedAddonIds: ['cheese', 'crouton', 'corn_top'],
      },
      {
        key: 'creamy',
        label: 'クリームスープ',
        factor: { kcal: 3.5, protein: 1.2, fat: 6.0, carbs: 4.5 },
        defaultAddonIds: ['crouton', 'cheese'],
        allowedAddonIds: ['crouton', 'cheese', 'corn_top'],
      },
    ],
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
