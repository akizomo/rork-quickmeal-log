/**
 * dish-references.ts — %基準の料理 (丼・麺・カレー・定食・バーガー) の、チェーン公式の栄養成分による照合。
 *
 * 成分表には料理単位の値が無く、材料を積み上げても「1人前の量」の仮定が結果を決めてしまう。
 * そこで DB の「チェーンの定番サイズ」という主張を、**各チェーンが公表している1食の値**と直接比べる。
 * 1つの Identity / 種類に対して複数チェーンの値を集め、DB がその**範囲の近く**にあることを検査する
 * (特定の1社の値に合わせるのではなく、「定番」の帯に入っていること)。
 *
 * 値は取得日 (retrievedAt) 時点の公式の値。改定されるので、取得日と出典URLを必ず残す。
 * readFrom: 'table' = 公式PDFの表を自分で読んだ (列の対応を確認済み) / 'page' = 公式ページの値を検索結果の
 *   要約経由で得た (表を直接は読んでいない。信頼度が一段低い)。
 *
 * ご飯の量がチェーンと DB で違うとき (ココイチは300g、DB は200g) は adjustRiceG で成分表の
 * 炊飯の値 (01088) を増減して揃える。
 */
export interface DishPoint {
  chain: string;
  item: string;
  /** 1食あたり。P/F/C を取得できなかったもの (日高屋) は kcal だけ */
  kcal: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  url: string;
  readFrom: 'table' | 'page';
  /** 出典のご飯量を DB の想定に合わせる補正 (g)。-100 なら出典から炊飯 100g ぶんを引く */
  adjustRiceG?: number;
  note?: string;
}

export interface DishReference {
  /** 'identity' または 'identity/attribute' */
  key: string;
  points: DishPoint[];
}

const D = '2026-10-22'; // 取得日 (各点の retrievedAt は共通)
export const DISH_REFERENCE_RETRIEVED_AT = D;

const YOSHI = 'https://www.yoshinoya.com/pdf/allergy/';
const COCO = 'https://www.ichibanya.co.jp/menu/pdf/nutrition.pdf';
const SUKIYA = 'https://images.zensho.co.jp/materials/sukiya/allergen/nutrition.pdf'; // 2026年10月14日更新
const NAKAU = 'https://images.zensho.co.jp/materials/nakau/allergen/nutrition.pdf'; // 2026年10月14日更新
const MATSUYA = 'https://www.matsuyafoods.co.jp/matsuya/pdf/260623_nutritional_matsuya.pdf'; // 2026年6月23日
const MOS = 'https://www.mos.jp/menu/pdf/nutrition.pdf';
const mcd = (id: number) => `https://www.mcdonalds.co.jp/products/${id}/`;

export const DISH_REFERENCES: DishReference[] = [
  {
    key: 'gyudon_class/gyudon',
    points: [
      { chain: '吉野家', item: '牛丼 並盛', kcal: 633, protein: 19.6, fat: 23.6, carbs: 88.2, url: YOSHI, readFrom: 'table', note: '2026年10月8日現在の表' },
      { chain: '吉野家', item: '豚丼 並盛', kcal: 576, protein: 14.4, fat: 18.6, carbs: 88.1, url: YOSHI, readFrom: 'table', note: '豚丼は gyudon に寄せている (search-aliases)' },
      { chain: '松屋', item: '牛めし 並盛', kcal: 687, protein: 17.1, fat: 28.9, carbs: 85.5, url: MATSUYA, readFrom: 'table', note: '公式ページの値 (687/17.1/28.9/85.5) とも一致' },
      { chain: 'すき家', item: '牛丼 並盛', kcal: 695, protein: 21.7, fat: 23.4, carbs: 99.8, url: SUKIYA, readFrom: 'table' },
    ],
  },
  { key: 'gyudon_class/oyakodon', points: [
    { chain: 'なか卯', item: '親子丼 並盛', kcal: 673, protein: 30.0, fat: 16.5, carbs: 99.7, url: NAKAU, readFrom: 'table' },
  ] },
  { key: 'gyudon_class/unadon', points: [
    { chain: 'すき家', item: 'うな丼 並盛', kcal: 662, protein: 22.8, fat: 18.7, carbs: 100.2, url: SUKIYA, readFrom: 'table' },
    { chain: '松屋', item: 'うな丼', kcal: 674, protein: 26.6, fat: 18.7, carbs: 95.0, url: MATSUYA, readFrom: 'table' },
  ] },
  { key: 'katsudon_tendon/katsudon', points: [
    { chain: 'なか卯', item: 'カツ丼 並盛', kcal: 995, protein: 31.5, fat: 39.7, carbs: 124.7, url: NAKAU, readFrom: 'table' },
  ] },
  { key: 'katsudon_tendon/tendon', points: [
    { chain: 'なか卯', item: '海老天丼 並盛', kcal: 817, protein: 17.2, fat: 25.6, carbs: 130.7, url: NAKAU, readFrom: 'table' },
  ] },
  { key: 'udon/kake', points: [
    { chain: 'はなまるうどん', item: 'かけ (小=1玉)', kcal: 292, url: 'https://www.hanamaruudon.com/menu/02_6.html', readFrom: 'page', note: '公式の別ページでは 273kcal (一覧) とも載っていて食い違う。kcal のみ' },
    { chain: 'はなまるうどん', item: 'かけ (小=1玉・一覧ページ)', kcal: 273, url: 'https://www.hanamaruudon.com/sp/menu/', readFrom: 'page', note: 'kcal のみ' },
  ] },
  { key: 'udon/kitsune', points: [
    { chain: 'なか卯', item: 'きつねうどん 並', kcal: 505, protein: 23.5, fat: 17.8, carbs: 60.3, url: NAKAU, readFrom: 'table' },
  ] },
  { key: 'udon/tsukimi', points: [
    { chain: 'なか卯', item: '月見うどん 並', kcal: 413, protein: 19.1, fat: 11.4, carbs: 54.7, url: NAKAU, readFrom: 'table' },
  ] },
  { key: 'butter_chicken', points: [
    { chain: 'ココイチ', item: 'バターチキンカレー (ライス300g)', kcal: 919, protein: 27.4, fat: 33.0, carbs: 131.7, url: COCO, readFrom: 'table', adjustRiceG: -100 },
  ] },
  { key: 'hot_dog_pita/hot_dog', points: [
    { chain: 'モスバーガー', item: 'ホットドッグ', kcal: 358, protein: 11.6, fat: 23.4, carbs: 25.4, url: MOS, readFrom: 'table', note: '1社・1品。DB はバインミー・ピタ等も含む型' },
  ] },
  { key: 'bento/noriben', points: [
    { chain: 'ほっともっと', item: 'のり弁当 (3つの組のうち)', kcal: 697, protein: 21.3, fat: 23.5, carbs: 99.6, url: 'https://www.hottomotto.com/menu_list/view/13/1563', readFrom: 'page', note: 'ご飯量の区分は要約から不明。3組 (697/770/916) が載っている' },
    { chain: 'ほっともっと', item: 'のり弁当 (3つの組のうち)', kcal: 770, protein: 22.5, fat: 23.6, carbs: 116.9, url: 'https://www.hottomotto.com/menu_list/view/13/1563', readFrom: 'page' },
    { chain: 'セブン-イレブン', item: '海苔弁当', kcal: 885, protein: 21.1, fat: 27.0, carbs: 141.5, url: 'https://www.sej.co.jp/products/a/item/047838/', readFrom: 'page' },
    { chain: 'ローソン', item: 'だしご飯の海苔弁当', kcal: 836, fat: 33.6, carbs: 109.3, url: 'https://www.lawson.co.jp/sp/recommend/original/detail/1527643_2168.html', readFrom: 'page' },
  ] },
  { key: 'bento/karaage', points: [
    { chain: 'セブン-イレブン', item: '若鶏の唐揚げ弁当', kcal: 714, protein: 34.5, fat: 24.5, carbs: 91.2, url: 'https://www.sej.co.jp/products/a/item/042565/', readFrom: 'page' },
    { chain: 'ローソン', item: '鶏のから揚げ弁当', kcal: 732, fat: 31.9, carbs: 89.2, url: 'https://www.lawson.co.jp/sp/recommend/original/detail/1509141_2168.html', readFrom: 'page' },
    { chain: 'ファミリーマート', item: 'タルタルソースで食べるから揚げ&ハンバーグ弁当', kcal: 831, protein: 30.5, fat: 32.6, carbs: 105.6, url: 'https://www.family.co.jp/goods/obento/0616232.html', readFrom: 'page' },
  ] },
  { key: 'bento/makunouchi', points: [
    { chain: 'セブン-イレブン', item: 'お好みおかず弁当', kcal: 611, protein: 20.6, fat: 18.6, carbs: 92.7, url: 'https://www.sej.co.jp/products/a/item/042810/', readFrom: 'page' },
    { chain: 'ローソン', item: 'おかずいろいろ幕の内', kcal: 573, fat: 20.4, carbs: 82.9, url: 'https://www.lawson.co.jp/sp/recommend/original/detail/1521044_2168.html', readFrom: 'page' },
    { chain: 'ローソン', item: '和風幕の内弁当', kcal: 496, fat: 12.0, carbs: 81.6, url: 'https://www.lawson.co.jp/sp/recommend/original/detail/1528633_2168.html', readFrom: 'page' },
  ] },
  { key: 'burger/beef', points: [
    { chain: 'モスバーガー', item: 'モスバーガー', kcal: 372, protein: 15.2, fat: 17.0, carbs: 40.0, url: MOS, readFrom: 'table' },
    { chain: 'マクドナルド', item: 'ハンバーガー', kcal: 259, protein: 13.0, fat: 9.5, carbs: 30.3, url: mcd(1010), readFrom: 'page' },
  ] },
  { key: 'burger/cheese', points: [
    { chain: 'モスバーガー', item: 'モスチーズバーガー', kcal: 425, protein: 18.2, fat: 21.4, carbs: 40.4, url: MOS, readFrom: 'table' },
    { chain: 'マクドナルド', item: 'チーズバーガー', kcal: 310, protein: 15.9, fat: 13.5, carbs: 31.0, url: mcd(1020), readFrom: 'page' },
  ] },
  { key: 'burger/fish', points: [
    { chain: 'モスバーガー', item: 'フィッシュバーガー', kcal: 381, protein: 16.2, fat: 18.8, carbs: 37.0, url: MOS, readFrom: 'table' },
    { chain: 'マクドナルド', item: 'フィレオフィッシュ', kcal: 338, protein: 15.1, fat: 14.2, carbs: 37.4, url: mcd(1110), readFrom: 'page' },
  ] },
  { key: 'burger/chicken', points: [
    { chain: 'モスバーガー', item: 'チキンバーガー', kcal: 386, protein: 15.0, fat: 18.5, carbs: 40.0, url: MOS, readFrom: 'table' },
  ] },
  { key: 'burger/teriyaki', points: [
    { chain: 'モスバーガー', item: 'テリヤキバーガー', kcal: 385, protein: 14.3, fat: 18.2, carbs: 41.2, url: MOS, readFrom: 'table' },
    { chain: 'マクドナルド', item: 'てりやきマックバーガー', kcal: 485, protein: 14.2, fat: 31.3, carbs: 37.4, url: mcd(1070), readFrom: 'page' },
  ] },
  { key: 'burger_big/standard', points: [
    { chain: 'バーガーキング', item: 'ワッパー', kcal: 672, protein: 28.2, fat: 39.9, carbs: 50.8, url: 'https://www.burgerking.co.jp/images/org/pdf/2026/01/08/af889feb-3500-412c-abee-a7ce17e65986.pdf', readFrom: 'page', note: '製品重量283g。2026年1月8日付PDF' },
    { chain: 'モスバーガー', item: 'ダブルとびきりチーズ ～北海道チーズ～', kcal: 706, protein: 35.6, fat: 40.2, carbs: 50.4, url: MOS, readFrom: 'table' },
  ] },
  { key: 'curry_class/curry', points: [
    { chain: 'ココイチ', item: 'ポークカレー (ライス300g)', kcal: 701, protein: 11.0, fat: 18.3, carbs: 126.9, url: COCO, readFrom: 'table', adjustRiceG: -100 },
    { chain: 'ココイチ', item: 'ビーフカレー (ライス300g)', kcal: 823, protein: 17.3, fat: 29.6, carbs: 125.8, url: COCO, readFrom: 'table', adjustRiceG: -100 },
    { chain: 'すき家', item: 'カレー 並盛', kcal: 653, protein: 12.8, fat: 15.7, carbs: 115.2, url: SUKIYA, readFrom: 'table', note: 'ライス量の記載なし (補正なし)' },
    { chain: '松屋', item: '創業ビーフカレー', kcal: 769, protein: 17.9, fat: 28.8, carbs: 102.8, url: MATSUYA, readFrom: 'table', note: 'ライス量の記載なし (補正なし。松屋の並ライスは約205g=344kcal)' },
  ] },
  { key: 'curry_class/hashed', points: [
    { chain: 'ココイチ', item: 'ハヤシライス (ライス300g)', kcal: 845, protein: 16.4, fat: 30.1, carbs: 132.4, url: COCO, readFrom: 'table', adjustRiceG: -100 },
  ] },
  { key: 'katsu_curry', points: [
    { chain: 'ココイチ', item: 'ロースカツカレー (ライス300g)', kcal: 1116, protein: 27.1, fat: 48.7, carbs: 149.3, url: COCO, readFrom: 'table', adjustRiceG: -100 },
    { chain: 'ココイチ', item: 'チキンカツカレー (ライス300g)', kcal: 1115, protein: 32.3, fat: 43.7, carbs: 151.6, url: COCO, readFrom: 'table', adjustRiceG: -100 },
  ] },
  { key: 'ramen_heavy/miso', points: [
    { chain: '幸楽苑', item: '味噌らーめん', kcal: 800, protein: 31.4, fat: 26.4, carbs: 99.3, url: 'https://stores.kourakuen.co.jp/grandmenu/info.html?id=15147', readFrom: 'page' },
  ] },
  { key: 'ramen_light/shoyu', points: [
    { chain: '日高屋', item: '中華そば (スープ含む)', kcal: 636, url: 'https://hidakaya.hiday.co.jp/hits/ja/menu/1/detail/1.html', readFrom: 'page', note: 'スープを全部飲んだ値。DB は「汁残し前提」なので下側にずれて当然 (許容を広めに)' },
  ] },
  { key: 'teishoku/yakizakana', points: [
    { chain: '吉野家', item: '焼魚定食（鮭）', kcal: 478, protein: 17.8, fat: 8.2, carbs: 84.8, url: YOSHI, readFrom: 'table' },
    { chain: '吉野家', item: 'さんま定食', kcal: 507, protein: 23.1, fat: 8.5, carbs: 87.7, url: YOSHI, readFrom: 'table' },
    { chain: '吉野家', item: '焼魚牛小鉢定食', kcal: 622, protein: 24.4, fat: 19.6, carbs: 88.5, url: YOSHI, readFrom: 'table', note: '牛小鉢つき。上限側の参考' },
    { chain: '松屋', item: '炙り焼鮭定食', kcal: 698, protein: 25.7, fat: 24.0, carbs: 91.0, url: MATSUYA, readFrom: 'table' },
  ] },
  { key: 'teishoku/yakiniku', points: [
    { chain: '松屋', item: '牛焼肉定食', kcal: 806, protein: 23.3, fat: 41.3, carbs: 86.5, url: MATSUYA, readFrom: 'table' },
    { chain: '吉野家', item: '牛鉄板焼肉定食', kcal: 928, protein: 33.1, fat: 39.7, carbs: 111.4, url: YOSHI, readFrom: 'table' },
  ] },
  { key: 'teishoku/shogayaki', points: [
    { chain: 'やよい軒', item: 'しょうが焼定食', kcal: 717, protein: 26.2, fat: 37.1, carbs: 72.9, url: 'https://www.yayoiken.com/menu_list/view/33/672', readFrom: 'page' },
    { chain: '吉野家', item: '大判豚肩ロース焼き定食（旨ダレ生姜）並盛', kcal: 788, protein: 30.5, fat: 27.5, carbs: 104.2, url: YOSHI, readFrom: 'table' },
    { chain: '大戸屋', item: '豚肩ロース生姜焼き', kcal: 829, protein: 33.4, fat: 34.5, carbs: 86.1, url: 'https://www.ootoya.com/menu_list/info/nutrition/27284', readFrom: 'page', note: '店舗ごとに表が分かれ数値が異なる' },
  ] },
  { key: 'teishoku/karaage', points: [
    { chain: 'やよい軒', item: 'から揚げ定食', kcal: 844, protein: 39.7, fat: 43.4, carbs: 78.6, url: 'https://www.yayoiken.com/menu_list/view/1/675', readFrom: 'page' },
    { chain: '吉野家', item: 'から揚げお新香定食', kcal: 967, protein: 34.7, fat: 44.2, carbs: 110.5, url: YOSHI, readFrom: 'table' },
    { chain: '吉野家', item: 'から揚げ定食 並盛', kcal: 1141, protein: 42.8, fat: 57.9, carbs: 114.9, url: YOSHI, readFrom: 'table', note: '個数が多い。上限側の参考' },
  ] },
];
