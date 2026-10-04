/**
 * 検索品質ベンチマークの語彙 (チューニング用)。
 *
 * 期待値の書式:
 *   'rice'          … Identity 一致 (Preset は除く)。その Identity の**既定の種類**は 'rice/white' とも等価
 *   'rice/brown'    … Identity + 種類
 *   'egg[boiled]'   … Identity + スタイル
 *   'pasta_*'       … Identity id の前方一致
 *   'preset:tkg'    … Preset
 *   'bucket:curry'  … (kind='gap' 用) 語彙/カテゴリヒントでそのバケットに誘導できれば可
 *
 * 正解ラベルは DB を見て人手で付けた (自動生成ではない)。「ごま油」のように種類差がマクロに
 * 影響しないものは Identity も正解にしてある。ラベルの誤りに気づいたらここを直す。
 * チェーン・ブランド名 (kind='chain') は別機能の範囲なので、現状は計測のみ。
 */

export type Kind = 'base' | 'variant' | 'chain' | 'gap';
export type Item = { q: string; e: string[]; cat: string; kind?: Kind; note?: string };

export const C = (cat: string, kind: Kind, rows: [string, string | string[], string?][]): Item[] =>
  rows.map(([q, e, note]) => ({ q, e: Array.isArray(e) ? e : [e], cat, kind, note }));

export const KARAAGE = ['fried_main/karaage_momo', 'fried_main/karaage_mune'];
export const RAMEN = ['ramen_light', 'ramen_heavy'];
export const PASTA = ['noodle_pasta', 'pasta_*'];

// prettier-ignore
export const TUNING_CORPUS: Item[] = [
  ...C('主食', 'base', [
    ['ごはん', 'rice'], ['ご飯', 'rice'], ['白米', ['rice/white', 'rice']], ['玄米', 'rice/brown'], ['雑穀米', 'rice/mixed'],
    ['おにぎり', 'onigiri'], ['おむすび', 'onigiri'], ['鮭おにぎり', 'onigiri/salmon'], ['ツナマヨおにぎり', 'onigiri/tuna_mayo'], ['梅おにぎり', 'onigiri/plain_ume'],
    ['おかゆ', 'okayu'], ['雑炊', ['okayu', 'rice[nabe_yaki]']], ['食パン', 'bread/plain'], ['トースト', 'bread'], ['フランスパン', 'bread/baguette'],
    ['ベーグル', 'bread/bagel'], ['ナン', 'bread/naan'], ['クロワッサン', 'bread_rich/croissant'], ['デニッシュ', 'bread_rich/danish'], ['オートミール', 'oatmeal'],
    ['グラノーラ', 'cereal/granola'], ['コーンフレーク', 'cereal'], ['シリアル', 'cereal'], ['餅', 'mochi'], ['お餅', 'mochi'],
    ['団子', 'mochi/dango'], ['みたらし団子', ['mochi/dango', 'wagashi']], ['じゃがいも', 'potato'], ['里芋', 'potato'], ['さつまいも', 'sweet_potato'],
    ['焼き芋', ['sweet_potato[baked]', 'sweet_potato']], ['うどん', ['udon', 'noodle_udon/udon']], ['そば', ['soba', 'noodle_udon/soba']], ['パスタ', PASTA], ['スパゲッティ', PASTA],
    ['中華麺', 'noodle_ramen'], ['マッシュポテト', 'potato[mashed]'], ['かぼちゃ', 'potato'], ['長芋', 'potato'],
  ]),
  ...C('肉魚卵大豆', 'base', [
    ['鶏むね肉', 'chicken_lean'], ['鶏胸肉', 'chicken_lean'], ['ささみ', 'chicken_lean'], ['サラダチキン', 'salad_chicken'], ['鶏もも肉', 'chicken_thigh'],
    ['手羽先', 'chicken_thigh'], ['手羽元', 'chicken_thigh'], ['鶏皮', 'chicken_thigh'], ['豚肉', ['red_meat', 'beef_pork', 'beef_pork_fatty']], ['豚バラ', 'beef_pork_fatty/bara'],
    ['牛肉', ['red_meat', 'beef_pork', 'beef_pork_fatty']], ['牛タン', 'beef_pork_fatty/tan'], ['ホルモン', 'beef_pork_fatty/horumon'], ['サーロイン', 'beef_pork_fatty/sirloin'], ['ステーキ', 'meat_solo/steak'],
    ['ひき肉', ['beef_pork', 'red_meat', 'beef_pork_fatty']], ['合いびき肉', ['beef_pork', 'red_meat', 'beef_pork_fatty']], ['豚ロース', ['beef_pork/pork', 'red_meat/shoulder_loin']], ['鶏肉', ['chicken_lean', 'chicken_thigh']], ['ラム肉', ['red_meat', 'beef_pork', 'beef_pork_fatty']],
    ['鮭', 'fatty_fish/salmon'], ['サーモン', ['fatty_fish/salmon', 'sashimi/salmon']], ['サバ', 'fatty_fish/saba'], ['さばの味噌煮', ['fatty_fish[nizuke]', 'fatty_fish/saba', 'canned_fatty_fish/miso']], ['ぶり', 'fatty_fish/buri'],
    ['ぶり大根', ['fatty_fish[nizuke]', 'fatty_fish/buri']], ['焼き魚', ['fatty_fish[grilled]', 'white_fish', 'teishoku/yakizakana']], ['刺身', 'sashimi'], ['まぐろ', ['white_fish/tuna_red', 'sashimi/maguro_lean']], ['ツナ', 'canned_lean_fish'],
    ['ツナ缶', 'canned_lean_fish'], ['サバ缶', 'canned_fatty_fish'], ['タラ', 'white_fish'], ['エビ', 'seafood_lean'], ['イカ', 'seafood_lean'],
    ['タコ', 'seafood_lean'], ['ホタテ', 'seafood_lean'], ['うなぎ', 'fatty_fish/unagi'], ['しらす', 'white_fish', 'shirasu は Add-on 専用で Identity ではない。単独記録は白身魚で近似'], ['卵', 'egg'],
    ['たまご', 'egg'], ['ゆで卵', ['egg[boiled]', 'egg']], ['目玉焼き', 'egg[fried]'], ['卵焼き', 'egg[omelet]'], ['スクランブルエッグ', 'egg[omelet]'],
    ['温泉卵', 'egg'], ['オムレツ', 'egg[omelet]'], ['茶碗蒸し', 'egg[chawan]'], ['豆腐', 'tofu'], ['冷奴', 'tofu'],
    ['厚揚げ', 'aburaage/thick'], ['油揚げ', 'aburaage/thin'], ['納豆', 'natto'], ['枝豆', 'edamame_soy/edamame'], ['ハム', 'ham'],
    ['ベーコン', 'bacon_sausage/bacon'], ['ウインナー', 'bacon_sausage/wiener'], ['ソーセージ', 'bacon_sausage/sausage'], ['プロテイン', 'protein_drink'], ['プロテインバー', 'protein_bar'],
    ['ビーフジャーキー', 'jerky'], ['レバー', 'liver'],
  ]),
  ...C('野菜果物', 'base', [
    ['サラダ', 'salad_raw'], ['キャベツ', ['salad_raw', 'veg_cooked']], ['レタス', 'salad_raw'], ['トマト', ['salad_raw', 'veg_cooked']], ['ミニトマト', ['salad_raw', 'veg_cooked']],
    ['きゅうり', ['salad_raw', 'veg_cooked']], ['ブロッコリー', 'veg_dense/broccoli'], ['ほうれん草', 'veg_dense/spinach'], ['小松菜', ['veg_dense', 'veg_cooked']], ['もやし', 'veg_cooked'],
    ['にんじん', 'veg_cooked'], ['玉ねぎ', 'veg_cooked'], ['なす', 'veg_cooked'], ['ピーマン', 'veg_cooked'], ['白菜', 'veg_cooked'],
    ['大根', 'veg_cooked'], ['ごぼう', 'veg_cooked'], ['きのこ', 'veg_dense/mushroom'], ['しめじ', 'veg_dense/mushroom'], ['えのき', 'veg_dense/mushroom'],
    ['野菜炒め', ['veg_cooked[stir_fry]', 'chuka_okazu/pork_vegetable']], ['温野菜', 'veg_cooked'], ['ポテトサラダ', ['side_creamy/potato_salad', 'potato[salad_mayo]']], ['マカロニサラダ', 'side_creamy/macaroni'], ['コールスロー', 'side_creamy/coleslaw'],
    ['ひじき', 'side_seasoned'], ['きんぴらごぼう', 'side_seasoned'], ['おひたし', 'side_seasoned'], ['煮物', 'side_seasoned'], ['切り干し大根', 'side_seasoned'],
    ['キムチ', 'pickles/kimchi'], ['漬物', 'pickles'], ['梅干し', 'pickles/ume'], ['味噌汁', ['soup/miso_light', 'soup/miso_rich', 'soup']], ['豚汁', 'soup/tonjiru'],
    ['コーンスープ', ['soup/creamy', 'soup']], ['ミネストローネ', ['soup/western', 'veggie_soup']], ['野菜スープ', 'veggie_soup'], ['とうもろこし', 'corn'], ['コーン', 'corn'],
    ['バナナ', 'banana'], ['りんご', 'apple_pear'], ['みかん', 'citrus'], ['オレンジ', 'citrus'], ['いちご', 'ichigo'],
    ['ぶどう', 'berry/grape'], ['ブルーベリー', 'berry/blueberry'], ['キウイ', 'fruit_other'], ['桃', 'fruit_other'], ['スイカ', 'fruit_other'],
    ['メロン', 'fruit_other'], ['パイナップル', 'fruit_other'], ['梨', 'apple_pear'], ['柿', 'fruit_other'], ['アボカド', 'avocado'],
    ['ドライフルーツ', 'dried_fruit'], ['レーズン', 'dried_fruit'], ['もずく', ['side_seasoned', 'veg_cooked']], ['わかめ', ['side_seasoned', 'veg_cooked', 'soup']], ['オクラ', 'veg_cooked'],
  ]),
  ...C('乳製品・油', 'base', [
    ['牛乳', 'milk'], ['低脂肪乳', 'milk/low_fat'], ['ヨーグルト', 'yogurt'], ['ギリシャヨーグルト', 'yogurt/greek'], ['飲むヨーグルト', 'yogurt/drink'],
    ['チーズ', 'cheese'], ['スライスチーズ', 'cheese/slice'], ['モッツァレラ', 'cheese/mozza'], ['カッテージチーズ', 'cheese_low_fat'], ['豆乳', 'soy_milk'],
    ['バター', 'butter_cream/butter'], ['マーガリン', 'butter_cream/margarine'], ['生クリーム', 'butter_cream/cream'], ['マヨネーズ', 'mayo'], ['マヨ', 'mayo'],
    ['ドレッシング', 'dressing'], ['オリーブオイル', 'oil/olive'], ['ごま油', ['oil/sesame', 'oil']], ['ナッツ', 'nuts'], ['アーモンド', 'nuts'],
    ['くるみ', 'nuts'], ['ピーナッツ', 'nuts'], ['ミックスナッツ', 'nuts'],
  ]),
  ...C('おやつ・飲み物・酒', 'base', [
    ['チョコ', 'chocolate'], ['チョコレート', 'chocolate'], ['ケーキ', 'cake'], ['ショートケーキ', 'cake'], ['チーズケーキ', 'cake'],
    ['シュークリーム', 'cake'], ['プリン', 'pudding/custard'], ['ゼリー', 'pudding/jelly'], ['アイス', 'ice'], ['アイスクリーム', 'ice'],
    ['ソフトクリーム', 'ice'], ['クッキー', 'cookie'], ['ビスケット', 'cookie'], ['ポテトチップス', 'snack'], ['ポテチ', 'snack'],
    ['せんべい', 'wagashi'], ['大福', 'wagashi'], ['どら焼き', 'wagashi'], ['和菓子', 'wagashi'], ['ドーナツ', ['sweet_bread', 'cake']],
    ['メロンパン', 'sweet_bread'], ['あんぱん', 'sweet_bread'], ['ポップコーン', 'popcorn'], ['ジュース', 'sweet_drink'], ['オレンジジュース', 'sweet_drink'],
    ['コーラ', 'sweet_drink'], ['カフェラテ', ['sweet_drink_rich', 'milk', 'sweet_drink']], ['タピオカ', 'sweet_drink_rich'], ['フラペチーノ', 'sweet_drink_rich'], ['スムージー', ['sweet_drink', 'sweet_drink_rich']],
    ['ビール', 'alcohol/beer'], ['発泡酒', 'alcohol/beer'], ['ハイボール', 'alcohol/chuhai'], ['チューハイ', 'alcohol/chuhai'], ['レモンサワー', 'alcohol/chuhai'],
    ['日本酒', 'alcohol/sake'], ['ワイン', 'alcohol/wine'], ['焼酎', 'alcohol/spirits'], ['ウイスキー', 'alcohol/spirits'], ['梅酒', 'alcohol'],
    ['羊羹', 'wagashi'], ['グミ', ['snack', 'wagashi', 'chocolate']], ['ガム', ['snack']], ['エナジードリンク', 'sweet_drink'], ['スポーツドリンク', 'sweet_drink'],
  ]),
  ...C('和食', 'base', [
    ['牛丼', 'gyudon_class/gyudon'], ['親子丼', 'gyudon_class/oyakodon'], ['中華丼', 'gyudon_class/chuka'], ['ねぎとろ丼', 'gyudon_class/negitoro'], ['海鮮丼', 'kaisendon'],
    ['カツ丼', 'katsudon_tendon/katsudon'], ['天丼', 'katsudon_tendon/tendon'], ['豚丼', 'gyudon_class'], ['うな重', ['fatty_fish/unagi']], ['チャーハン', 'fried_rice_omurice/chahan'],
    ['オムライス', 'fried_rice_omurice/omurice'], ['カレー', ['curry_class/curry', 'curry_class']], ['カレーライス', 'curry_class/curry'], ['カツカレー', 'katsu_curry'], ['キーマカレー', 'curry_class/keema'],
    ['シチュー', 'curry_class/stew'], ['ハヤシライス', 'curry_class/hashed'], ['ラーメン', RAMEN], ['醤油ラーメン', 'ramen_light/shoyu'], ['味噌ラーメン', 'ramen_heavy/miso'],
    ['豚骨ラーメン', 'ramen_heavy/tonkotsu'], ['とんこつラーメン', 'ramen_heavy/tonkotsu'], ['塩ラーメン', 'ramen_light/shio'], ['家系ラーメン', 'ramen_heavy/iekei'], ['二郎', 'ramen_jiro'],
    ['つけ麺', 'tsukemen/tsukemen'], ['担々麺', 'tantanmen'], ['焼きそば', 'fried_noodles'], ['冷やし中華', 'cold_noodles/hiyashi_chuka'], ['冷麺', 'cold_noodles/reimen'],
    ['きつねうどん', 'udon/kitsune'], ['月見うどん', 'udon/tsukimi'], ['ざるそば', 'soba/zaru'], ['天ぷらそば', 'tempura_noodle/tempura_soba'], ['鍋焼きうどん', 'tempura_noodle/nabe_yaki'],
    ['焼うどん', 'yaki_udon'], ['そうめん', 'somen'], ['寿司', ['sushi_plate', 'sushi_piece']], ['回転寿司', 'sushi_plate'], ['ちらし寿司', 'chirashi'],
    ['巻き寿司', 'maki'], ['いなり寿司', 'maki/inari'], ['手巻き寿司', 'maki/temaki'], ['定食', 'teishoku'], ['焼き魚定食', 'teishoku/yakizakana'],
    ['唐揚げ定食', 'teishoku/karaage'], ['生姜焼き定食', 'teishoku/shogayaki'], ['生姜焼き', ['teishoku/shogayaki', 'beef_pork']], ['弁当', 'bento'], ['のり弁', 'bento/noriben'],
    ['幕の内弁当', 'bento/makunouchi'], ['唐揚げ', KARAAGE], ['とんかつ', 'fried_main/tonkatsu'], ['ヒレカツ', 'fried_main/tonkatsu_hire'], ['メンチカツ', 'fried_main/menchi'],
    ['エビフライ', 'fried_main/ebi_fry'], ['コロッケ', 'fried_main/korokke'], ['天ぷら', 'fried_main/tempura'], ['フライドポテト', 'fried_main/fries'], ['焼き鳥', 'yakitori'],
    ['ハンバーグ', 'meat_solo/hamburg'], ['肉じゃが', 'washoku_okazu/nikujaga'], ['肉豆腐', 'washoku_okazu/niku_dofu'], ['筑前煮', 'side_seasoned'], ['すき焼き', 'nabe/sukiyaki'],
    ['しゃぶしゃぶ', 'nabe/shabu'], ['鍋', 'nabe'], ['おでん', ['nabe', 'side_seasoned']], ['刺身盛り合わせ', 'sashimi/mixed'], ['お好み焼き', 'okonomi/okonomiyaki'],
    ['たこ焼き', 'okonomi/takoyaki'], ['もんじゃ焼き', 'okonomi/monjayaki'], ['焼肉', ['teishoku/yakiniku', 'bento/yakiniku', 'beef_pork_fatty', 'red_meat', 'beef_pork']], ['卵かけご飯', 'preset:tkg'], ['納豆ご飯', 'preset:natto_gohan'],
  ]),
  ...C('洋食', 'base', [
    ['ナポリタン', 'pasta_tomato'], ['ミートソース', 'pasta_meat'], ['ボロネーゼ', 'pasta_meat'], ['カルボナーラ', 'pasta_cream'], ['ペペロンチーノ', 'pasta_oil'],
    ['ジェノベーゼ', ['pasta_oil', 'pasta_cream']], ['明太子パスタ', 'pasta_japanese'], ['たらこスパゲッティ', 'pasta_japanese'], ['ピザ', 'pizza_*'], ['マルゲリータ', 'pizza_simple/margherita'],
    ['ペパロニピザ', 'pizza_meat/pepperoni'], ['サンドイッチ', 'cold_sand'], ['たまごサンド', 'cold_sand/egg'], ['カツサンド', 'cold_sand/katsu'], ['BLT', 'cold_sand/ham_blt'],
    ['ホットサンド', 'hot_sand'], ['ハンバーガー', ['burger', 'burger_big']], ['チーズバーガー', 'burger/cheese'], ['てりやきバーガー', 'burger/teriyaki'], ['フィッシュバーガー', 'burger/fish'],
    ['ホットドッグ', 'hot_dog_pita/hot_dog'], ['アメリカンドッグ', 'hot_dog_pita/corn_dog'], ['ブリトー', 'burrito_taco/burrito'], ['タコス', 'burrito_taco/taco'], ['ビーフシチュー', 'curry_class/stew'],
    ['クリームシチュー', 'curry_class/stew'], ['サラダボウル', ['bento/salad_bowl', 'salad_raw']], ['ガーリックトースト', 'preset:garlic_toast'], ['シーザーサラダ', 'preset:caesar_salad'], ['ローストビーフ', ['red_meat', 'beef_pork', 'meat_solo']],
  ]),
  ...C('中華・エスニック', 'base', [
    ['餃子', 'tenshin/gyoza'], ['水餃子', 'tenshin/gyoza_water'], ['シュウマイ', 'tenshin/shumai'], ['焼売', 'tenshin/shumai'], ['春巻き', 'tenshin/harumaki'],
    ['小籠包', 'tenshin/xiaolongbao'], ['麻婆豆腐', 'chuka_okazu/mapo_tofu'], ['麻婆茄子', 'chuka_okazu/mapo_nasu'], ['回鍋肉', 'chuka_okazu/twice_cooked_pork'], ['ホイコーロー', 'chuka_okazu/twice_cooked_pork'],
    ['青椒肉絲', 'chuka_okazu/chinjao'], ['チンジャオロース', 'chuka_okazu/chinjao'], ['酢豚', 'chuka_okazu/subuta'], ['エビチリ', 'chuka_okazu/ebi_chili'], ['エビマヨ', 'chuka_okazu/ebi_mayo'],
    ['八宝菜', 'chuka_okazu/happosai'], ['油淋鶏', 'chuka_okazu/yurinchi'], ['レバニラ', 'chuka_okazu/reba_nira'], ['ビビンバ', 'bibimbap'], ['石焼ビビンバ', 'bibimbap/stone'],
    ['ガパオライス', 'gapao_rice/gapao'], ['ナシゴレン', 'gapao_rice/nasi_goreng'], ['グリーンカレー', 'soup_curry/green'], ['スープカレー', 'soup_curry/soup'], ['バターチキンカレー', 'butter_chicken'],
    ['生春巻き', 'fresh_roll'], ['チヂミ', ['okonomi']], ['肉まん', ['tenshin']], ['天津飯', ['fried_rice_omurice', 'gyudon_class/chuka']], ['タコライス', ['gapao_rice', 'burrito_taco/bowl']],
  ]),
  ...C('チェーン・コンビニ', 'chain', [
    ['ファミチキ', [...KARAAGE, 'chicken_thigh']], ['からあげクン', KARAAGE], ['ビッグマック', ['burger', 'burger_big']], ['マックポテト', 'fried_main/fries'], ['てりやきマックバーガー', 'burger/teriyaki'],
    ['フィレオフィッシュ', 'burger/fish'], ['ナゲット', [...KARAAGE, 'fried_main']], ['チキンナゲット', [...KARAAGE, 'fried_main']], ['ケンタッキー', [...KARAAGE, 'chicken_thigh']], ['フライドチキン', [...KARAAGE, 'chicken_thigh']],
    ['吉野家', 'gyudon_class/gyudon'], ['すき家', 'gyudon_class/gyudon'], ['牛めし', 'gyudon_class/gyudon'], ['カップラーメン', [...RAMEN, 'noodle_ramen']], ['カップヌードル', [...RAMEN, 'noodle_ramen']],
    ['スタバ', 'sweet_drink_rich'], ['菓子パン', 'sweet_bread'], ['コンビニ弁当', 'bento'], ['サラダチキンバー', 'salad_chicken'], ['冷凍パスタ', PASTA],
  ]),
  ...C('入力ゆれ', 'variant', [
    ['からあげ', KARAAGE], ['カラアゲ', KARAAGE], ['karaage', KARAAGE], ['ぎゅうどん', 'gyudon_class/gyudon'], ['gyudon', 'gyudon_class/gyudon'],
    ['おやこどん', 'gyudon_class/oyakodon'], ['みそしる', ['soup/miso_light', 'soup']], ['お味噌汁', ['soup/miso_light', 'soup']], ['みそ汁', ['soup/miso_light', 'soup']], ['たまごやき', 'egg[omelet]'],
    ['ハンバーク', 'meat_solo/hamburg', '誤字'], ['ブロッコリ', 'veg_dense/broccoli', '長音なし'], ['ヨーグルド', 'yogurt', '誤字'], ['コロツケ', 'fried_main/korokke', '誤字'], ['スパゲティ', PASTA],
    ['スパゲッティー', PASTA], ['ｶﾚｰ', ['curry_class/curry', 'curry_class'], '半角'], ['ﾗｰﾒﾝ', RAMEN, '半角'], ['ＢＬＴ', 'cold_sand/ham_blt', '全角'], ['ramen', RAMEN],
    ['natto', 'natto'], ['tamago', 'egg'], ['gohan', 'rice'], ['banana', 'banana'], ['yoguruto', 'yogurt'],
    ['ぎょうざ', 'tenshin/gyoza'], ['ギョーザ', 'tenshin/gyoza'], ['とうふ', 'tofu'], ['なっとう', 'natto'], ['ぶろっこりー', 'veg_dense/broccoli'],
    ['はんばーぐ', 'meat_solo/hamburg'], ['さしみ', 'sashimi'], ['やきとり', 'yakitori'], ['ハンバーガ', ['burger', 'burger_big'], '長音なし'], ['チョコレイト', 'chocolate', '表記ゆれ'],
    ['てりやきバーガ', 'burger/teriyaki'], ['からあげ定食', 'teishoku/karaage'], ['味噌ラーメン大盛り', 'ramen_heavy/miso', '修飾語つき'], ['セブンのサラダチキン', 'salad_chicken', '店名つき'], ['朝ごはん', 'rice', '時間帯語 + 主食。ごはんが出るのは妥当'],
  ]),
  ...C('取り違えの調査で移した語', 'base', [
    ['ロース', ['beef_pork', 'red_meat', 'fried_main/tonkatsu'], '曖昧語 (豚か牛か、ロースかつか)。どれも妥当'],
    ['かれい', ['white_fish', 'curry_class'], '鰈 / カレー (長音の畳み込みで同じキー)。打った形そのままを優先'],
    ['たい', ['white_fish', 'gapao_rice'], '鯛 / タイ料理。ひらがなでは鯛が自然だが両方妥当'],
    ['とろけるチーズ', ['cheese/slice', 'cheese']], ['チキンカレー', ['curry_class/curry', 'curry_class', 'butter_chicken']],
    ['かけそば', 'soba/kake'], ['ハンバーグ定食', 'teishoku/hamburg'], ['ライス', ['rice', 'rice/white']], ['マカロニ', ['noodle_pasta', 'side_creamy/macaroni'], '麺としてもサラダとしても妥当だが麺が第一'],
    ['ブレッド', 'bread'], ['杏仁豆腐', 'pudding/jelly'], ['カシスオレンジ', 'alcohol'], ['マーボー豆腐', 'chuka_okazu/mapo_tofu'],
  ]),
  ...C('DBに無い料理', 'gap', [
    ['グラタン', ['bucket:misc_dish', 'bucket:pasta']], ['ドリア', ['bucket:rice_dish', 'bucket:misc_dish']], ['フォー', ['bucket:japanese_noodles', 'bucket:chinese_noodles']], ['パッタイ', ['bucket:chinese_noodles']], ['トッポギ', ['bucket:misc_dish', 'bucket:snack_drink']],
    ['サムゲタン', ['bucket:misc_dish']], ['チリコンカン', ['bucket:misc_dish', 'bucket:curry']], ['ロコモコ', ['bucket:rice_dish']], ['カオマンガイ', ['bucket:rice_dish']], ['ケバブ', ['bucket:sandwich', 'bucket:misc_dish', 'bucket:fatty_protein']],
    ['ラザニア', ['bucket:pasta']], ['パエリア', ['bucket:rice_dish']], ['リゾット', ['bucket:rice_dish', 'bucket:pasta']], ['クラムチャウダー', ['bucket:misc_dish', 'soup/creamy']], ['ポトフ', ['bucket:misc_dish', 'soup/western']],
    ['ロールキャベツ', ['bucket:misc_dish']], ['茶碗蒸し定食', ['bucket:misc_dish']], ['お茶漬け', ['rice', 'okayu', 'bucket:staple']], ['冷やしうどん', ['udon', 'noodle_udon/udon']], ['焼きおにぎり', ['onigiri']],
    ['ガレット', ['bucket:snack_drink', 'bucket:misc_dish']], ['パンケーキ', ['bucket:snack_drink']], ['フレンチトースト', ['bucket:snack_drink']], ['ワッフル', ['bucket:snack_drink']], ['かき氷', ['bucket:snack_drink']],
    ['ちゃんぽん', ['bucket:chinese_noodles']], ['皿うどん', ['bucket:chinese_noodles']], ['もつ鍋', ['nabe']], ['ちゃんこ鍋', ['nabe']], ['湯豆腐', ['tofu', 'nabe']],
  ]),
];

// ── 打鍵途中: 何文字目で正解が上位3に出るか (ひらがなは IME 変換前の入力そのもの) ──
// prettier-ignore
export const PREFIX_TARGETS: [string, string[]][] = [
  ['からあげ', KARAAGE], ['ぎゅうどん', ['gyudon_class/gyudon']], ['ごはん', ['rice']], ['なっとう', ['natto']], ['たまご', ['egg']],
  ['ばなな', ['banana']], ['よーぐると', ['yogurt']], ['ぎょうざ', ['tenshin/gyoza']], ['らーめん', RAMEN], ['かれー', ['curry_class/curry', 'curry_class']],
  ['おにぎり', ['onigiri']], ['さらだちきん', ['salad_chicken']], ['とうふ', ['tofu']], ['みそしる', ['soup/miso_light', 'soup']], ['ぶろっこりー', ['veg_dense/broccoli']],
  ['しょくぱん', ['bread/plain']], ['ぱすた', PASTA], ['はんばーぐ', ['meat_solo/hamburg']], ['ぷろていん', ['protein_drink']], ['ちょこ', ['chocolate']],
  ['びーる', ['alcohol/beer']], ['おやこどん', ['gyudon_class/oyakodon']], ['さしみ', ['sashimi']], ['とんかつ', ['fried_main/tonkatsu']], ['やきとり', ['yakitori']],
  ['ぎゅうにゅう', ['milk']], ['ちーず', ['cheese']], ['あぼかど', ['avocado']], ['さけ', ['fatty_fish/salmon']], ['ささみ', ['chicken_lean']],
];

