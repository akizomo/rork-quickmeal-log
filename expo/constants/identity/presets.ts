/**
 * Preset — 名前で探される「ベース + Add-on」の組み合わせ (IA spec §1.5 判定3 / §5.6)
 *
 * 追加する前に必ず §1.5 の判定順を通すこと。プリセットは**最後から2番目**の手段で、
 * 次のすべてを満たすものだけが対象:
 *   1. 料理名として探される (「ガーリックトースト」「卵かけご飯」)
 *   2. 既存の Attribute / Style では表現できない (表現できるなら語彙で着地させる)
 *   3. ベースの許可 Add-on だけで表現できる (新しい Add-on やマクロ値を作らない)
 *   4. その Add-on が料理を決めている (Add-on 合計が 20kcal 未満なら対象外 — ふりかけ等)
 *
 * マクロ値は持たない。ベースと Add-on の既存値から resolveLog が計算する。
 * 整合性は presets.test.ts が機械的に検証する (許可 Add-on か / 実在するか / 検索で
 * 自分自身に着地するか / かな形タグがあるか)。
 *
 * 追加の根拠は「推測」ではなく検索ミスログ (`recordSearchMissEvent`) の実データに置く。
 * 初版は 2026-10-02 に約70語の候補を現状の検索に通し、層1が空 / 層2止まりで、
 * かつ上記を満たすものだけを採用した。
 *
 * 量は省略 = ベースの既定量。個数 (units) は「だいたい1人前」の目安で、シートで直せる。
 */

import type { Preset } from '@/types/identity';

export const JP_PRESETS: Preset[] = [
  // ── ごはん (rice) — 層1が全滅していた最大の穴。カテゴリのヒントにしか辿り着けなかった ──
  {
    id: 'tkg',
    label: '卵かけご飯',
    searchTags: ['たまごかけごはん', '卵かけごはん', 'たまごかけご飯', 'TKG'],
    identityId: 'rice',
    addons: [{ refId: 'egg', units: 1 }],
  },
  {
    id: 'natto_gohan',
    label: '納豆ご飯',
    searchTags: ['なっとうごはん', '納豆ごはん', 'なっとうご飯'],
    identityId: 'rice',
    addons: [{ refId: 'natto', units: 1 }],
  },
  {
    id: 'mentaiko_gohan',
    label: '明太子ご飯',
    searchTags: ['めんたいこごはん', '明太子ごはん', 'めんたいこご飯', 'たらこごはん', 'たらこご飯'],
    identityId: 'rice',
    addons: [{ refId: 'mentaiko', units: 1 }],
  },
  {
    id: 'salmon_flake_gohan',
    label: '鮭フレークご飯',
    searchTags: ['さけフレークごはん', '鮭フレークごはん', 'しゃけフレークごはん', 'さけフレークご飯'],
    identityId: 'rice',
    addons: [{ refId: 'salmon_flake', units: 1 }],
  },
  {
    id: 'butter_gohan',
    label: 'バターご飯',
    searchTags: ['バターごはん', 'バター醤油ご飯', 'バター醤油ごはん', 'バターしょうゆごはん'],
    identityId: 'rice',
    addons: [{ refId: 'butter_cream', units: 1 }],
  },

  // ── パン (bread) — 「トースト」は焼いても kcal が動かないので Style にしない ──
  {
    id: 'garlic_toast',
    label: 'ガーリックトースト',
    searchTags: ['ガーリックブレッド', 'ガーリックパン', 'ガーリックバゲット', 'ガーリックフランス', 'ガーリックフランスパン'],
    identityId: 'bread',
    attributeKey: 'baguette',
    addons: [{ refId: 'butter_cream', units: 1 }],
  },
  {
    id: 'butter_toast',
    label: 'バタートースト',
    identityId: 'bread',
    addons: [{ refId: 'butter_cream', units: 1 }],
  },
  {
    id: 'jam_toast',
    label: 'ジャムトースト',
    searchTags: ['いちごジャムトースト', '苺ジャムトースト'],
    identityId: 'bread',
    addons: [{ refId: 'jam', units: 1 }],
  },
  {
    id: 'honey_toast',
    label: 'はちみつトースト',
    searchTags: ['蜂蜜トースト', 'ハニートースト'],
    identityId: 'bread',
    addons: [{ refId: 'honey', units: 1 }],
  },
  {
    id: 'cheese_toast',
    label: 'チーズトースト',
    searchTags: ['とろけるチーズトースト'],
    identityId: 'bread',
    addons: [{ refId: 'cheese', units: 1 }],
  },
  {
    id: 'avocado_toast',
    label: 'アボカドトースト',
    identityId: 'bread',
    addons: [{ refId: 'avocado', units: 1 }],
  },
  {
    id: 'peanut_butter_toast',
    label: 'ピーナッツバタートースト',
    searchTags: ['ピーナツバタートースト', 'ピーナッツトースト', 'ピーナツトースト'],
    identityId: 'bread',
    addons: [{ refId: 'peanut_butter', units: 1 }],
  },
  {
    id: 'ham_cheese_toast',
    label: 'ハムチーズトースト',
    searchTags: ['チーズハムトースト'],
    identityId: 'bread',
    addons: [{ refId: 'ham', units: 1 }, { refId: 'cheese', units: 1 }],
  },
  {
    id: 'egg_toast',
    label: 'エッグトースト',
    searchTags: ['卵トースト', 'たまごトースト', '玉子トースト'],
    identityId: 'bread',
    addons: [{ refId: 'egg', units: 1 }],
  },

  // ── サラダ (salad_raw) — base が 25kcal/100g の空の器で、カロリーは全て Add-on 側にある ──
  {
    id: 'caesar_salad',
    label: 'シーザーサラダ',
    searchTags: ['シーザーズサラダ'],
    identityId: 'salad_raw',
    addons: [{ refId: 'cheese', units: 1 }, { refId: 'crouton', units: 2 }, { refId: 'dressing', units: 1 }],
  },
  {
    // フェタ/オリーブ/オリーブオイルが主役。フェタは「普通のチーズ」群に含める (spec §1.5 分割軸)。
    id: 'greek_salad',
    label: 'ギリシャサラダ',
    searchTags: ['ギリシャ風サラダ', 'グリークサラダ', 'フェタチーズサラダ'],
    identityId: 'salad_raw',
    addons: [{ refId: 'cheese', units: 1 }, { refId: 'oil', units: 1 }],
  },
  {
    id: 'cobb_salad',
    label: 'コブサラダ',
    identityId: 'salad_raw',
    addons: [
      { refId: 'egg', units: 1 },
      { refId: 'bacon_sausage', units: 2 },
      { refId: 'avocado', units: 1 },
      { refId: 'salad_chicken', units: 1 },
      { refId: 'cheese', units: 1 },
      { refId: 'dressing', units: 1 },
    ],
  },
  {
    id: 'tuna_salad',
    label: 'ツナサラダ',
    searchTags: ['ツナ缶サラダ', 'ツナマヨサラダ'],
    identityId: 'salad_raw',
    addons: [{ refId: 'canned_lean_fish', units: 2 }, { refId: 'mayo', units: 1 }],
  },
  {
    id: 'chicken_salad',
    label: 'チキンサラダ',
    searchTags: ['鶏サラダ', 'とりサラダ'],
    identityId: 'salad_raw',
    addons: [{ refId: 'salad_chicken', units: 2 }, { refId: 'dressing', units: 1 }],
  },
  {
    id: 'avocado_salad',
    label: 'アボカドサラダ',
    identityId: 'salad_raw',
    addons: [{ refId: 'avocado', units: 1 }, { refId: 'dressing', units: 1 }],
  },

  // ── ヨーグルト (yogurt) ──
  {
    id: 'yogurt_granola',
    label: 'ヨーグルトグラノーラ',
    searchTags: ['グラノーラヨーグルト'],
    identityId: 'yogurt',
    addons: [{ refId: 'granola_top', units: 1 }],
  },
  {
    id: 'honey_yogurt',
    label: 'はちみつヨーグルト',
    searchTags: ['蜂蜜ヨーグルト', 'ハニーヨーグルト'],
    identityId: 'yogurt',
    addons: [{ refId: 'honey', units: 1 }],
  },
  {
    id: 'fruit_yogurt',
    label: 'フルーツヨーグルト',
    identityId: 'yogurt',
    addons: [{ refId: 'berry_top', units: 1 }, { refId: 'banana_slice', units: 1 }],
  },

  // ── 麺・カレー (一皿料理タブ) ──
  {
    id: 'ajitama_ramen',
    label: '味玉ラーメン',
    searchTags: ['あじたまらーめん', '味玉らーめん', '味付け卵ラーメン', '味付け玉子ラーメン'],
    identityId: 'ramen_light',
    attributeKey: 'shoyu',
    addons: [{ refId: 'seasoned_egg', units: 1 }],
  },
  {
    id: 'chashu_men',
    label: 'チャーシュー麺',
    searchTags: ['チャーシューメン', 'ちゃーしゅーめん', 'チャーシューラーメン', '叉焼麺'],
    identityId: 'ramen_light',
    attributeKey: 'shoyu',
    addons: [{ refId: 'chashu', units: 3 }],
  },
  {
    id: 'cheese_curry',
    label: 'チーズカレー',
    identityId: 'curry_class',
    attributeKey: 'curry',
    addons: [{ refId: 'cheese', units: 1 }],
  },
];
