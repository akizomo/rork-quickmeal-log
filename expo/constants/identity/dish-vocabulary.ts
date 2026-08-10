/**
 * dish-vocabulary.ts — 料理名辞書 (SEARCH_SPEC v0.4 §5.4.6, 検索の層3)
 *
 * 主辞を持たない単一語 (外来の料理名が中心) をバケットにマップする。
 * 「グラタン」「ケバブ」等は語彙的な推測が原理的に不可能なため、辞書を持つ以外に
 * 手段がない。Identity までは特定せずバケット単位で十分とする (PFC 収束の前提、
 * §5.4.6)。
 *
 * 旧 `identity-search.ts` の `CATEGORY_KEYWORD_MAP` (18バケット分の手薄なキーワード
 * リスト) はこの辞書に統合・置換した。単一語 → 単一バケットの Record 形式に
 * 寄せるため、複数バケットにまたがるキーワード (例: 「丼」「焼き」) は主辞辞書
 * (head-nouns.ts) 側で複数候補として扱う。
 */

import type { BucketKey } from '@/types/identity';

export const DISH_VOCABULARY: Record<string, BucketKey> = {
  // ── §1.4 実測「手がかりゼロ」だった料理名 ──────────────────────
  'ろーるきゃべつ': 'misc_dish',
  'ぐらたん': 'misc_dish',
  'どりあ': 'rice_dish',
  'ぽとふ': 'veggies',
  'みねすとろーね': 'veggies',
  'てんしんはん': 'rice_dish',
  'ふぉー': 'japanese_noodles',
  'ぱったい': 'japanese_noodles',
  'けばぶ': 'fatty_protein',
  'ぱえりあ': 'rice_dish',
  'りぞっと': 'rice_dish',
  'らざにあ': 'pasta',
  'どーなつ': 'snack_drink',
  'たいやき': 'snack_drink',
  'おしるこ': 'snack_drink',
  'ちぢみ': 'misc_dish',
  'なむる': 'veggies',
  'びりやに': 'rice_dish',
  'おでん': 'misc_dish',

  // ── 洋食・エスニック ──────────────────────
  'すこーん': 'snack_drink',
  'ぼるしち': 'veggies',
  'ぐやーしゅ': 'curry',
  'たんどりーちきん': 'fatty_protein',
  'ぱにーに': 'sandwich',
  'くれーぷ': 'snack_drink',
  'わっふる': 'snack_drink',
  'まかろん': 'snack_drink',
  'かぬれ': 'snack_drink',
  'えくれあ': 'snack_drink',
  'もんぶらん': 'snack_drink',
  'しふぉんけーき': 'snack_drink',
  'ばうむくーへん': 'snack_drink',
  'かすてら': 'snack_drink',

  // ── 和菓子 ──────────────────────
  'わらびもち': 'snack_drink',
  'もなか': 'snack_drink',

  // ── ドリンク ──────────────────────
  'らて': 'snack_drink',
  'かふぇらて': 'snack_drink',
  'えすぷれっそ': 'snack_drink',
  'かぷちーの': 'snack_drink',
  'らっしー': 'snack_drink',
  'ちゃい': 'snack_drink',

  // ── 中華・アジア (中華点心/おかず以外の単発料理名) ──────────────────────
  'わんたん': 'chinese_noodles',
  'ちんげんさい': 'veggies',

  // ── 旧 CATEGORY_KEYWORD_MAP から吸収 (18バケット分のキーワード) ──────────
  'シリアル': 'staple',
  'オートミール': 'staple',
  'ささみ': 'lean_protein',
  'むね': 'lean_protein',
  'もも': 'lean_protein',
  'サーモン': 'lean_protein',
  'マグロ': 'lean_protein',
  'ツナ': 'lean_protein',
  'えび': 'lean_protein',
  'タコ': 'lean_protein',
  'イカ': 'lean_protein',
  'タラ': 'lean_protein',
  'エッグ': 'egg',
  'オムレツ': 'egg',
  '豚バラ': 'fatty_protein',
  'サーロイン': 'fatty_protein',
  'ベーコン': 'fatty_protein',
  'ソーセージ': 'fatty_protein',
  'サバ': 'fatty_protein',
  'サンマ': 'fatty_protein',
  'イワシ': 'fatty_protein',
  'ミルク': 'dairy_soy',
  'ヨーグルト': 'dairy_soy',
  '豆乳': 'dairy_soy',
  'プロテイン': 'dairy_soy',
  'レタス': 'veggies',
  'トマト': 'veggies',
  'きゅうり': 'veggies',
  'きのこ': 'veggies',
  'フルーツ': 'fruit',
  'りんご': 'fruit',
  'バナナ': 'fruit',
  'みかん': 'fruit',
  'いちご': 'fruit',
  'ぶどう': 'fruit',
  'メロン': 'fruit',
  'バター': 'added_fat',
  'マヨネーズ': 'added_fat',
  'ドレッシング': 'added_fat',
  'オリーブ': 'added_fat',
  '醤油': 'added_fat',
  'みりん': 'added_fat',
  'スナック': 'snack_drink',
  'チョコ': 'snack_drink',
  'ジュース': 'snack_drink',
  'コーラ': 'snack_drink',
  'ビール': 'snack_drink',
  'お酒': 'snack_drink',
  'アルコール': 'snack_drink',
  'コーヒー': 'snack_drink',
  '担々麺': 'chinese_noodles',
  'つけ麺': 'chinese_noodles',
  '炒飯': 'chinese_noodles',
  'チャーハン': 'chinese_noodles',
  'そうめん': 'japanese_noodles',
  'スパゲティ': 'pasta',
  'ペペロンチーノ': 'pasta',
  'ボロネーゼ': 'pasta',
  'カルボナーラ': 'pasta',
  '寿司': 'sushi',
  'すし': 'sushi',
  '刺身': 'sushi',
  '海鮮': 'sushi',
  'サンド': 'sandwich',
  'バーガー': 'sandwich',
  'ハンバーガー': 'sandwich',
  'ホットドッグ': 'sandwich',
  'サブウェイ': 'sandwich',
  'ピザ': 'pizza',
  'ピッツァ': 'pizza',
  'コンビニ': 'misc_dish',
  '焼き魚': 'misc_dish',
};
