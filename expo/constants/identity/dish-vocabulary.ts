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

  // ── 拡充 (2026-08-11, デスクリサーチベース。§5.4.6 目安200〜300語に対応) ──
  // 主辞辞書 (head-nouns.ts) で拾える語尾 (焼き/揚げ/丼/汁/鍋/カツ/ライス/麺/
  // うどん/そば/煮/和え/漬け/たまご/にく/魚/とうふ/ちーず 等) を持つ語はここでは
  // 登録しない (二重管理を避ける)。単一語として登録が必須なものに絞る。

  // 西洋料理
  'むさか': 'misc_dish',
  'こんふぃ': 'fatty_protein',
  'てりーぬ': 'misc_dish',
  'きっしゅ': 'egg',
  'ふりったーた': 'egg',
  'かるつぉーね': 'pizza',
  'ふぉかっちゃ': 'staple',
  'ちゃばた': 'staple',
  'ぶりおっしゅ': 'staple',
  'くろっくむっしゅ': 'sandwich',
  'くろっくまだむ': 'sandwich',
  'たるたるすてーき': 'fatty_protein',
  'かるぱっちょ': 'misc_dish',
  'せびーちぇ': 'misc_dish',
  'ぱて': 'fatty_protein',
  'りえっと': 'fatty_protein',
  'むにえる': 'lean_protein',
  'あくあぱっつぁ': 'lean_protein',
  'ぶいやべーす': 'misc_dish',
  'ぱんなこった': 'snack_drink',
  'くれーむぶりゅれ': 'snack_drink',
  'ぷろふぃっとろーる': 'snack_drink',
  'じぇらーと': 'snack_drink',
  'しゃーべっと': 'snack_drink',
  'そるべ': 'snack_drink',
  'びーふうぇりんとん': 'misc_dish',

  // 中東・地中海
  'ふむす': 'veggies',
  'ふぁらふぇる': 'veggies',
  'たぶれ': 'veggies',
  'しゃわるま': 'fatty_protein',
  'ばくらば': 'snack_drink',

  // 東南アジア・南アジア
  'かおまんがい': 'rice_dish',
  'かおぱっと': 'rice_dish',
  'とむやむくん': 'misc_dish',
  'そむたむ': 'veggies',
  'らくさ': 'chinese_noodles',
  'ばいんせお': 'misc_dish',
  'さて': 'fatty_protein',
  'みーごれん': 'chinese_noodles',
  'ろてぃ': 'staple',
  'どーさ': 'staple',
  'さもさ': 'misc_dish',
  'ぱこら': 'veggies',

  // 韓国
  'さむぎょぷさる': 'fatty_protein',
  'ぷるこぎ': 'fatty_protein',
  'とっぽぎ': 'snack_drink',
  'きむぱぷ': 'rice_dish',
  'ほっとく': 'snack_drink',
  'すんどぅぶ': 'misc_dish',
  'けらんちむ': 'egg',
  'さむげたん': 'misc_dish',

  // 中華
  'ぱいこーめん': 'chinese_noodles',
  'じゃーじゃーめん': 'chinese_noodles',
  'ざーさい': 'veggies',
  'ぴーたん': 'egg',
  'ちゃーしゅー': 'fatty_protein',
  'ゆーてぃあお': 'staple',

  // 朝食・パン
  'ぱんけーき': 'snack_drink',
  'ふれんちとーすと': 'snack_drink',
  'みゅーずり': 'staple',
  'べーぐるさんど': 'sandwich',
  'えっぐべねでぃくと': 'egg',
  'すくらんぶるえっぐ': 'egg',
  'はっしゅどぽてと': 'staple',

  // 飲み物 (加糖・乳飲料等。無糖茶・水はPRD方針によりログ対象外のため未収録)
  'れもねーど': 'snack_drink',
  'すむーじー': 'snack_drink',
  'えなじーどりんく': 'snack_drink',
  'さわー': 'snack_drink',
  'ちゅーはい': 'snack_drink',
  'はいぼーる': 'snack_drink',
  'かくてる': 'snack_drink',
  'わいん': 'snack_drink',
  'にほんしゅ': 'snack_drink',
  'しょうちゅう': 'snack_drink',

  // 肉料理
  'ろーすとちきん': 'fatty_protein',
  'ぐりるちきん': 'lean_protein',
  'ちきんすてーき': 'lean_protein',
  'らむちょっぷ': 'fatty_protein',
  'すぺありぶ': 'fatty_protein',
  'ぷるどぽーく': 'fatty_protein',
  'こんびーふ': 'fatty_protein',

  // 野菜・サラダ
  'こぶさらだ': 'veggies',
  'おひたし': 'veggies',
  'なます': 'veggies',
  'ぴくるす': 'veggies',

  // 和菓子・スイーツ
  'あんみつ': 'snack_drink',
  'みつまめ': 'snack_drink',
  'ぜんざい': 'snack_drink',
  'くずもち': 'snack_drink',
  'こんぺいとう': 'snack_drink',

  // 主食・粉もの
  'ぴらふ': 'rice_dish',
  'けちゃっぷらいす': 'rice_dish',
  'たきこみごはん': 'rice_dish',
  'えきべん': 'rice_dish',
  'おにぎらず': 'staple',
  'にょっき': 'pasta',
  'らびおり': 'pasta',
  'ぱすたさらだ': 'pasta',

  // 寿司
  'ばってら': 'sushi',
  'おしずし': 'sushi',
  'ぐんかん': 'sushi',
  'なれずし': 'sushi',

  // サンド・バーガー
  'くらぶはうすさんど': 'sandwich',
  'てりやきばーがー': 'sandwich',
  'ふぃっしゅばーがー': 'sandwich',
  'けさでぃーや': 'sandwich',
  'ぐりるどちーず': 'sandwich',
};
