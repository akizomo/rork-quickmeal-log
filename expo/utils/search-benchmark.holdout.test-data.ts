/**
 * 検索品質ベンチマークの語彙 (ホールドアウト用)。
 *
 * **この語彙は改善のチューニングに使わない。** チューニング用 (search-benchmark.corpus.test-data.ts) の失敗を
 * 直した結果が「その語だけに効いた」のか「同種の語にも効いた」のかを見分けるための、
 * 2026-10-02 のベースライン計測 **より前に**正解ラベルを固定した別の語である。
 *
 * 運用ルール:
 *   - 改善の最中は失敗の中身を見ない (集計値だけ見る)。見て直した時点でその語はチューニング用に移す
 *   - 移すときはここから消してコミットメッセージに理由を書く。新しいホールドアウトは別の語で補充する
 *   - ラベルが誤っていたら直してよいが、直す理由と日付をここに書く
 *
 * 書式は search-benchmark.corpus.test-data.ts と同じ。
 */
import { C, KARAAGE, PASTA, RAMEN, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const HOLDOUT_CORPUS: Item[] = [
  ...C('主食', 'base', [
    ['赤飯', 'rice'], ['白ごはん', ['rice/white', 'rice']], ['6枚切り食パン', 'bread/plain'], ['ライ麦パン', 'bread/whole'],
    ['ロールパン', ['bread', 'bread_rich']], ['ポテト', ['potato', 'fried_main/fries']], ['ペンネ', 'noodle_pasta'], ['オートミール粥', ['oatmeal', 'okayu']],
    ['ごま団子', ['mochi/dango', 'wagashi']], ['パン', 'bread'], ['ご飯茶碗', 'rice'],
  ]),
  ...C('肉魚卵大豆', 'base', [
    ['胸肉', 'chicken_lean'], ['むね肉', 'chicken_lean'], ['鶏ささみ', 'chicken_lean'], ['豚ヒレ', 'red_meat'], ['牛もも', 'red_meat'],
    ['牛バラ', 'beef_pork_fatty/bara_beef'], ['カルビ', ['beef_pork_fatty/bara_beef', 'beef_pork_fatty']], ['いわし', 'fatty_fish/iwashi'], ['さんま', 'fatty_fish/sanma'],
    ['ひらめ', 'white_fish'], ['えび', 'seafood_lean'], ['ほたて', 'seafood_lean'],
    ['あさり', 'seafood_lean'], ['かに', 'seafood_lean'], ['生卵', 'egg'], ['卵白', 'egg/white'], ['卵黄', 'egg/yolk'],
    ['玉子焼き', 'egg[omelet]'], ['だし巻き卵', 'egg[omelet]'], ['木綿豆腐', 'tofu/firm'], ['絹豆腐', 'tofu/silken'], ['高野豆腐', 'tofu/koya'],
    ['がんもどき', 'aburaage/ganmodoki'], ['大豆', 'edamame_soy'], ['大豆水煮', 'edamame_soy/soybeans_boiled'], ['さば缶', 'canned_fatty_fish'], ['サバ味噌缶', 'canned_fatty_fish/miso'],
    ['ウィンナー', 'bacon_sausage/wiener'], ['ロースハム', 'ham'], ['プロテインシェイク', 'protein_drink'], ['ホエイプロテイン', 'protein_drink'], ['ささ身', 'chicken_lean'],
  ]),
  ...C('野菜果物', 'base', [
    ['サニーレタス', 'salad_raw'], ['ベビーリーフ', 'salad_raw'], ['カット野菜', ['salad_raw', 'veg_cooked']], ['グリーンサラダ', 'salad_raw'], ['生野菜', 'salad_raw'],
    ['ほうれんそう', 'veg_dense/spinach'], ['アスパラ', 'veg_dense/asparagus'], ['カリフラワー', 'veg_dense/cauliflower'], ['しいたけ', 'veg_dense/mushroom'], ['まいたけ', 'veg_dense/mushroom'],
    ['エリンギ', 'veg_dense/mushroom'], ['芽キャベツ', 'veg_dense/brussels_sprouts'], ['ひじき煮', 'side_seasoned'], ['ナムル', 'side_seasoned'], ['かぼちゃの煮物', ['side_seasoned', 'potato']],
    ['たくあん', 'pickles'], ['ぬか漬け', 'pickles'], ['白菜漬け', ['pickles', 'pickles/asazuke']], ['らっきょう', 'pickles'], ['けんちん汁', 'soup/tonjiru'],
    ['オニオンスープ', ['soup/western', 'veggie_soup']], ['ポタージュ', 'soup/creamy'], ['わかめスープ', ['soup', 'veggie_soup']], ['グレープフルーツ', 'citrus'], ['レモン', 'citrus'],
    ['マンゴー', 'fruit_other'], ['ラズベリー', 'berry'], ['洋梨', 'apple_pear'], ['アップル', 'apple_pear'], ['いちじく', ['berry', 'fruit_other']],
    ['プチトマト', ['salad_raw', 'veg_cooked']], ['長ねぎ', 'veg_cooked'], ['れんこん', 'veg_cooked'], ['ズッキーニ', 'veg_cooked'], ['かぶ', 'veg_cooked'],
  ]),
  ...C('乳製品・油', 'base', [
    ['ミルク', 'milk'], ['低脂肪牛乳', 'milk/low_fat'], ['無糖ヨーグルト', 'yogurt/unsweetened'], ['プレーンヨーグルト', 'yogurt/unsweetened'], ['フルーツヨーグルト', 'preset:fruit_yogurt'],
    ['クリームチーズ', 'cheese/cream'], ['パルメザンチーズ', 'cheese/parmesan'], ['粉チーズ', 'cheese/parmesan'], ['無調整豆乳', 'soy_milk/plain'],
    ['調整豆乳', 'soy_milk/adjusted'], ['サラダ油', 'oil'], ['ココナッツオイル', 'oil/coconut'], ['MCTオイル', 'oil/mct'], ['ノンオイルドレッシング', 'dressing/no_oil'],
  ]),
  ...C('おやつ・飲み物・酒', 'base', [
    ['板チョコ', 'chocolate'], ['ハイカカオ', 'chocolate/high_cacao'], ['ミルクチョコ', 'chocolate'], ['モンブラン', 'cake'], ['ティラミス', 'cake'],
    ['エクレア', 'cake'], ['カステラ', ['cake', 'wagashi']], ['マカロン', ['cookie', 'cake']], ['カスタードプリン', 'pudding/custard'],     ['ジェラート', 'ice'], ['アイスバー', 'ice'], ['ガリガリ君', 'ice'], ['マドレーヌ', ['cookie', 'cake']], ['フィナンシェ', ['cookie', 'cake']],
    ['おかき', 'wagashi'], ['あられ', 'wagashi'], ['ようかん', 'wagashi'], ['たい焼き', 'wagashi'], ['おはぎ', ['wagashi', 'mochi']],
    ['じゃがりこ', 'snack'], ['ポッキー', ['snack', 'chocolate', 'cookie']], ['アーモンドチョコ', ['chocolate', 'nuts']], ['クリームパン', 'sweet_bread'], ['カレーパン', ['sweet_bread', 'fried_main']],
    ['チョココロネ', 'sweet_bread'], ['サイダー', 'sweet_drink'], ['アップルジュース', 'sweet_drink'], ['ココア', ['sweet_drink', 'sweet_drink_rich', 'milk']], ['ミルクティー', ['sweet_drink', 'sweet_drink_rich', 'milk']],
    ['カフェオレ', ['sweet_drink', 'sweet_drink_rich', 'milk']], ['抹茶ラテ', ['sweet_drink', 'sweet_drink_rich', 'milk']], ['タピオカミルクティー', 'sweet_drink_rich'], ['生ビール', 'alcohol/beer'], ['赤ワイン', 'alcohol/wine'],
    ['白ワイン', 'alcohol/wine'], ['ジン', 'alcohol/spirits'], ['ウォッカ', 'alcohol/spirits'], ['ストロングゼロ', 'alcohol/chuhai'],     ['マッコリ', 'alcohol'], ['甘酒', ['sweet_drink', 'alcohol']], ['クレープ', ['cake', 'sweet_bread']], ['ホットケーキ', ['cake', 'sweet_bread']],
  ]),
  ...C('和食', 'base', [
    ['ビーフカレー', ['curry_class/curry', 'curry_class']], ['ポークカレー', ['curry_class/curry', 'curry_class']], ['ドライカレー', 'curry_class/dry'], ['ハヤシ', 'curry_class/hashed'],
    ['ホワイトシチュー', 'curry_class/stew'], ['担担麺', 'tantanmen'], ['つけめん', 'tsukemen/tsukemen'], ['まぜそば', 'tsukemen/mazesoba'], ['汁なし担々麺', 'tantanmen'],
    ['かけうどん', 'udon/kake'], ['ぶっかけうどん', 'udon/bukkake'], ['釜揚げうどん', 'udon/kamaage'], ['山かけそば', 'soba/yamakake'],
    ['とろろそば', 'soba/yamakake'], ['天そば', 'tempura_noodle/tempura_soba'], ['握り寿司', 'sushi_piece'], ['かっぱ巻き', 'maki/maki_thin'], ['鉄火巻き', 'maki/maki_thin'],
    ['いなり', 'maki/inari'], ['ちらし', 'chirashi'], ['ばら寿司', 'chirashi'], ['焼肉定食', 'teishoku/yakiniku'],     ['とんかつ定食', 'teishoku/tonkatsu'], ['しゃけ弁当', 'bento/sake'], ['唐揚げ弁当', 'bento/karaage'], ['のり弁当', 'bento/noriben'], ['から揚げ', KARAAGE],
    ['鶏の唐揚げ', KARAAGE], ['ひれかつ', 'fried_main/tonkatsu_hire'], ['アジフライ', 'fried_main/fish_fry'], ['カキフライ', ['fried_main/fish_fry', 'seafood_lean']], ['海老フライ', 'fried_main/ebi_fry'],
    ['クリームコロッケ', 'fried_main/korokke'], ['ポテトコロッケ', 'fried_main/korokke'], ['かき揚げ', 'fried_main/tempura'], ['チーズハンバーグ', 'meat_solo/hamburg'], ['煮込みハンバーグ', 'meat_solo/hamburg'],
    ['サイコロステーキ', 'meat_solo/steak'], ['つくね', 'yakitori'], ['ねぎま', 'yakitori'], ['焼鳥', 'yakitori'], ['すきやき', 'nabe/sukiyaki'],
    ['水炊き', 'nabe/mizutaki'], ['寄せ鍋', 'nabe/yose'], ['豆乳鍋', 'nabe/tonyu_nabe'], ['キムチ鍋', 'nabe'], ['たこ焼', 'okonomi/takoyaki'],
    ['もんじゃ', 'okonomi/monjayaki'], ['広島焼き', 'okonomi/hiroshima'], ['サーモン刺身', 'sashimi/salmon'], ['わかめの味噌汁', ['soup/miso_light', 'soup']],
  ]),
  ...C('洋食', 'base', [
    ['ミートスパゲッティ', 'pasta_meat'], ['アラビアータ', ['pasta_tomato', 'pasta_oil']], ['ペスカトーレ', ['pasta_tomato', 'pasta_oil']], ['アーリオオーリオ', 'pasta_oil'], ['クリームパスタ', 'pasta_cream'],
    ['和風パスタ', 'pasta_japanese'], ['きのこパスタ', ['pasta_japanese', 'pasta_oil']], ['ボンゴレ', ['pasta_oil', 'pasta_tomato']], ['ハムサンド', 'cold_sand/ham_blt'], ['ツナサンド', 'cold_sand/tuna'],
    ['クラブハウスサンド', ['cold_sand', 'hot_sand']], ['ダブルチーズバーガー', 'burger/cheese'], ['チキンバーガー', 'burger/chicken'], ['チーズピザ', 'pizza_cheese'], ['シーフードピザ', 'pizza_seafood'],
    ['クアトロフォルマッジ', 'pizza_cheese/quattro'], ['マルゲリータピザ', 'pizza_simple/margherita'], ['バターチキン', 'butter_chicken'], ['ガパオ', 'gapao_rice/gapao'], ['タイカレー', 'soup_curry/green'],
  ]),
  ...C('中華・エスニック', 'base', [
    ['焼き餃子', 'tenshin/gyoza'], ['春巻', 'tenshin/harumaki'], ['マーボーナス', 'chuka_okazu/mapo_nasu'], ['海老チリ', 'chuka_okazu/ebi_chili'],
    ['ニラレバ', 'chuka_okazu/reba_nira'], ['ビビンバ丼', 'bibimbap'], ['シューマイ', 'tenshin/shumai'],
  ]),
  ...C('入力ゆれ', 'variant', [
    ['はんばぐ', 'meat_solo/hamburg', '誤字'],
    ['ぎゅうにく', ['red_meat', 'beef_pork', 'beef_pork_fatty']], ['とりむね', 'chicken_lean'], ['トリ胸', 'chicken_lean', '混在表記'], ['ｷｬﾍﾞﾂ', ['salad_raw', 'veg_cooked'], '半角'], ['ＣＯＣＯＡ', ['sweet_drink', 'sweet_drink_rich', 'milk'], '全角'],
    ['pasta', PASTA], ['curry', ['curry_class/curry', 'curry_class']], ['sushi', ['sushi_plate', 'sushi_piece']],     ['karaage teishoku', 'teishoku/karaage'], ['ちーずばーがー', 'burger/cheese'], ['おにぎらず', 'onigiri', '造語'], ['やさい', [], 'ノイズ(曖昧すぎる)'], ['あああ', [], 'ノイズ'],
  ]),
  ...C('DBに無い料理', 'gap', [
    ['ピラフ', ['rice', 'bucket:rice_dish']], ['ミートローフ', ['bucket:misc_dish']], ['ビーフストロガノフ', ['bucket:curry', 'bucket:misc_dish']], ['スコーン', ['bucket:snack_drink']], ['ベイクドチーズケーキ', ['cake', 'bucket:snack_drink']],
    ['エビグラタン', ['bucket:misc_dish', 'bucket:pasta']], ['ホットサンドイッチ', ['hot_sand', 'bucket:sandwich']], ['ビーフンの炒め物', ['bucket:chinese_noodles', 'bucket:misc_dish']], ['チャプチェ', ['bucket:misc_dish', 'bucket:chinese_noodles']], ['サムギョプサル', ['bucket:misc_dish', 'bucket:fatty_protein']],
    ['トムヤムクン', ['bucket:misc_dish', 'soup']], ['タンドリーチキン', ['bucket:misc_dish', 'bucket:fatty_protein', 'chicken_thigh']], ['カオソーイ', ['bucket:curry', 'bucket:chinese_noodles']], ['豚の角煮', ['washoku_okazu', 'beef_pork_fatty', 'bucket:misc_dish']], ['ぶり照り', ['fatty_fish', 'bucket:misc_dish']],
  ]),

  // ── 2026-10-04 補充: 取り違えの中身を見たため13語をチューニング用へ移し、結果を見ていない新しい語で補った ──
  ...C('主食', 'base', [
    ['玄米ごはん', ['rice/brown', 'rice']], ['雑穀ごはん', ['rice/mixed', 'rice']], ['鮭おむすび', 'onigiri/salmon'], ['梅干しおにぎり', ['onigiri/plain_ume', 'onigiri']], ['ツナおにぎり', 'onigiri/tuna_mayo'],
    ['全粒粉パン', 'bread/whole'], ['クロワッサンサンド', ['bread_rich/croissant', 'cold_sand']], ['冷凍うどん', ['udon', 'noodle_udon/udon']], ['バターロール', ['bread', 'bread_rich']],
  ]),
  ...C('肉魚卵大豆', 'base', [
    ['ブリ', 'fatty_fish/buri'], ['サバの塩焼き', ['fatty_fish[grilled]', 'fatty_fish/saba']], ['鮭の塩焼き', ['fatty_fish[grilled]', 'fatty_fish/salmon']], ['カレイの煮付け', ['white_fish[nizuke]', 'white_fish']],
    ['牛ステーキ', 'meat_solo/steak'], ['豚ロース肉', ['beef_pork/pork', 'red_meat']], ['鶏のささみ', 'chicken_lean'], ['ゆでたまご', ['egg[boiled]', 'egg']], ['生たまご', 'egg'],
    ['炒り卵', 'egg[omelet]'], ['厚焼き玉子', 'egg[omelet]'], ['冷凍餃子', 'tenshin/gyoza'], ['豆腐ハンバーグ', ['meat_solo/hamburg', 'tofu']],
  ]),
  ...C('野菜果物', 'base', [
    ['大根おろし', 'veg_cooked'], ['ほうれん草のおひたし', ['side_seasoned', 'veg_dense/spinach']], ['きんぴら', 'side_seasoned'], ['かぼちゃ煮', ['side_seasoned', 'potato']], ['ひじきの煮物', 'side_seasoned'],
    ['もやし炒め', ['veg_cooked[stir_fry]', 'veg_cooked']], ['トマトサラダ', ['salad_raw', 'veg_cooked']], ['しじみ汁', ['soup', 'soup/miso_light']], ['あおさの味噌汁', ['soup/miso_light', 'soup']],
    ['トマトスープ', ['soup/western', 'veggie_soup']], ['バナナ半分', 'banana'], ['リンゴ', 'apple_pear'], ['ミカン', 'citrus'],
  ]),
  ...C('乳製品・菓子・飲み物・酒', 'base', [
    ['カマンベールチーズ', ['cheese', 'cheese/slice']], ['ブルーチーズ', 'cheese'], ['豆乳飲料', 'soy_milk'], ['生チョコ', 'chocolate'], ['チョコクッキー', ['cookie', 'chocolate']],
    ['バニラアイス', 'ice'], ['抹茶アイス', 'ice'], ['コーヒー牛乳', ['sweet_drink', 'sweet_drink_rich', 'milk']], ['ビールジョッキ', 'alcohol/beer'], ['芋焼酎', 'alcohol/spirits'],
    ['レモンハイ', 'alcohol/chuhai'], ['日本酒一合', 'alcohol/sake'], ['最中', 'wagashi'], ['きんつば', 'wagashi'], ['草餅', ['mochi', 'wagashi']],
  ]),
  ...C('料理', 'base', [
    ['牛丼大盛り', 'gyudon_class/gyudon'], ['カレーライス大盛り', ['curry_class/curry', 'curry_class']], ['ポークカツカレー', 'katsu_curry'], ['野菜カレー', ['curry_class/curry', 'curry_class']], ['醤油ラーメン大盛り', 'ramen_light/shoyu'],
    ['背脂ラーメン', RAMEN], ['きつねそば', ['soba/kake', 'soba']], ['ナポリタンスパゲッティ', 'pasta_tomato'], ['明太子スパゲッティ', 'pasta_japanese'], ['カルボナーラスパゲッティ', 'pasta_cream'],
    ['サーモン握り', 'sushi_piece'], ['まぐろ握り', 'sushi_piece'], ['納豆巻き', ['maki/maki_thin', 'maki']], ['ひれかつ定食', ['teishoku/tonkatsu']], ['鮭定食', ['teishoku/yakizakana']],
    ['ハムカツ', ['fried_main', 'fried_main/tonkatsu']], ['鶏肉の唐揚げ', KARAAGE], ['豚カツ', 'fried_main/tonkatsu'], ['冷しゃぶ', ['nabe/shabu', 'nabe']], ['豚キムチ', ['chuka_okazu/pork_vegetable', 'pickles/kimchi']],
    ['ゴーヤチャンプルー', ['chuka_okazu/pork_vegetable', 'veg_cooked']], ['親子丼大盛り', 'gyudon_class/oyakodon'], ['ざるそば大盛り', 'soba/zaru'],
  ]),
];
