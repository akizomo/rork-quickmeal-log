/**
 * head-nouns.ts — 主辞辞書 (SEARCH_SPEC v0.4 §5.4.5, 検索の層2)
 *
 * 「日本語の複合語は末尾が主辞」という規則性を使い、DB に文字列として存在しない
 * クエリでもバケットへ着地させる。例: ハムカツ→(カツ)→揚げもの単品。
 *
 * 文字列の末尾一致だけでは形態素境界を越えた誤爆が起きる (グラタン→牛タン等、
 * SEARCH_SPEC §5.2.2)。そのため主辞は「ここに明示登録された語」に限定する —
 * 一覧に無い語は主辞として認識しない。
 *
 * targets は複数候補を許す (§5.4.5 「主辞が複数バケットにまたがる場合は候補を
 * 最大4件返してよい」)。例えば「焼き」はたい焼き(snack_drink)にも生姜焼き
 * (misc_dish)にも通じるため、単一の答えを決め打ちしない。
 */

import type { BucketKey } from '@/types/identity';

export interface HeadNounTarget {
  bucket: BucketKey;
  /** 特定 Identity まで絞れる場合のみ指定。省略時はバケット単位の着地。 */
  identity?: string;
}

export interface HeadNounEntry {
  /** 主辞の表記ゆれ (正規化済み: ひらがな・長音符なし)。 */
  heads: string[];
  targets: HeadNounTarget[];
}

// 注意: normalize() は文字種変換 (NFKC・カタカナ→ひらがな・長音符除去) のみで
// 漢字→読みの変換は行わない (identity-normalize.ts 参照)。そのため「たい焼き」
// 「筑前煮」のように主辞が漢字表記のまま入力されるクエリを拾うには、ひらがな形
// だけでなく漢字形も heads に併記する必要がある。

export const HEAD_NOUNS: HeadNounEntry[] = [
  // ── 調理法 ──────────────────────────────────────────────
  { heads: ['やき', '焼き', '焼'], targets: [{ bucket: 'misc_dish' }, { bucket: 'snack_drink' }] },
  { heads: ['あげ', '揚げ', 'からあげ', '唐揚げ'], targets: [{ bucket: 'misc_dish', identity: 'fried_main' }] },
  { heads: ['いため', '炒め', 'いためもの', '炒め物'], targets: [{ bucket: 'misc_dish', identity: 'chuka_okazu' }, { bucket: 'veggies' }] },
  { heads: ['に', '煮', 'にこみ', '煮込み'], targets: [{ bucket: 'veggies', identity: 'side_seasoned' }] },
  { heads: ['むし', '蒸し'], targets: [{ bucket: 'veggies' }] },
  { heads: ['あえ', '和え', 'あえもの', '和え物'], targets: [{ bucket: 'veggies', identity: 'side_seasoned' }] },
  { heads: ['づけ', 'つけ', '漬け'], targets: [{ bucket: 'veggies', identity: 'pickles' }] },

  // ── 料理形式 ──────────────────────────────────────────────
  { heads: ['どん', '丼', 'どんぶり'], targets: [{ bucket: 'rice_dish' }] },
  { heads: ['ていしょく', '定食'], targets: [{ bucket: 'misc_dish', identity: 'teishoku' }] },
  { heads: ['べんとう', '弁当', 'べん', '弁'], targets: [{ bucket: 'misc_dish', identity: 'bento' }] },
  { heads: ['なべ', '鍋'], targets: [{ bucket: 'misc_dish', identity: 'nabe' }] },
  { heads: ['じる', 'しる', '汁'], targets: [{ bucket: 'misc_dish', identity: 'soup' }] },
  { heads: ['すぷ'], targets: [{ bucket: 'misc_dish', identity: 'soup' }] },
  { heads: ['さらだ'], targets: [{ bucket: 'veggies', identity: 'salad_raw' }] },
  { heads: ['かれ'], targets: [{ bucket: 'curry' }] },
  { heads: ['しちゅ'], targets: [{ bucket: 'curry', identity: 'curry_class' }] },

  // ── 主食 ──────────────────────────────────────────────
  { heads: ['ごはん', 'ご飯', 'めし', '飯', 'らいす'], targets: [{ bucket: 'staple' }, { bucket: 'rice_dish' }] },
  { heads: ['めん', '麺'], targets: [{ bucket: 'staple' }] },
  { heads: ['うどん'], targets: [{ bucket: 'japanese_noodles' }, { bucket: 'staple' }] },
  { heads: ['そば', '蕎麦'], targets: [{ bucket: 'japanese_noodles' }, { bucket: 'staple' }] },
  { heads: ['ぱすた'], targets: [{ bucket: 'pasta' }, { bucket: 'staple' }] },
  { heads: ['ぱん'], targets: [{ bucket: 'staple' }] },
  { heads: ['らめん'], targets: [{ bucket: 'chinese_noodles' }] },

  // ── 惣菜 ──────────────────────────────────────────────
  { heads: ['かつ'], targets: [{ bucket: 'misc_dish', identity: 'fried_main' }] },
  { heads: ['ふらい'], targets: [{ bucket: 'misc_dish', identity: 'fried_main' }] },
  { heads: ['てんぷら', '天ぷら'], targets: [{ bucket: 'misc_dish', identity: 'fried_main' }, { bucket: 'japanese_noodles' }] },
  { heads: ['ころっけ'], targets: [{ bucket: 'misc_dish', identity: 'fried_main' }] },

  // ── 菓子 ──────────────────────────────────────────────
  { heads: ['けき'], targets: [{ bucket: 'snack_drink', identity: 'cake' }] },
  { heads: ['ぷりん'], targets: [{ bucket: 'snack_drink', identity: 'pudding' }] },
  { heads: ['あいす'], targets: [{ bucket: 'snack_drink', identity: 'ice' }] },
  { heads: ['だんご', '団子'], targets: [{ bucket: 'staple', identity: 'mochi' }] },
  { heads: ['もち', '餅'], targets: [{ bucket: 'staple', identity: 'mochi' }] },
  { heads: ['まんじゅう', '饅頭'], targets: [{ bucket: 'snack_drink', identity: 'wagashi' }] },
  { heads: ['ぱい'], targets: [{ bucket: 'snack_drink', identity: 'cake' }] },

  // ── 食材 ──────────────────────────────────────────────
  { heads: ['たまご', '卵', 'ゆで'], targets: [{ bucket: 'egg' }] },
  { heads: ['にく', '肉'], targets: [{ bucket: 'fatty_protein' }, { bucket: 'lean_protein' }] },
  { heads: ['ざかな', 'さかな', '魚'], targets: [{ bucket: 'lean_protein' }, { bucket: 'fatty_protein' }] },
  { heads: ['とうふ', '豆腐'], targets: [{ bucket: 'dairy_soy', identity: 'tofu' }] },
  { heads: ['ちず'], targets: [{ bucket: 'dairy_soy', identity: 'cheese' }] },
];
