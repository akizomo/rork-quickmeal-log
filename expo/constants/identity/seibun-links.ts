/**
 * seibun-links.ts — DB の食品 (Identity / 種類) と、日本食品標準成分表 (八訂) 増補2023年の
 * 食品番号の対応表。マクロ値を**一次出典と機械で突き合わせる**ための物差し (seibun-verification.test.ts)。
 *
 * 出典: 文部科学省「日本食品標準成分表（八訂）増補2023年」第2章 (データ) Excel。
 *   取得: https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html (令和8年3月27日付正誤表を反映した版)
 *   同梱する抜粋: constants/reference/seibun-2023.json (この表が指す食品だけ。再生成は scripts/seibun-sync.ts)
 *   値は可食部 100g あたり。炭水化物は「炭水化物」(差引き法の利用可能炭水化物 + 食物繊維等)。
 *
 * 照合の種類 (weight):
 *   'known'   … 100g (または ml×密度) あたりで直接比べる。DB の g/ml 基準の食品。
 *   'assumed' … 「1個・1枚・1本」の重さを仮定して比べる。重さは一次出典が無い目安なので、
 *               kcal の絶対値ではなく**組成 (P/F/C のエネルギー比)** だけを検査し、仮定した重さから
 *               逆算した「1個あたり g」を人が見て妥当か判断する (レポート: seibun-verification の出力)。
 *
 * 追加するとき: food は成分表の食品名の**一部** (食品番号の取り違え防止にテストが照合する)。
 * 調理済みの食品 (焼き・ゆで・から揚げ・とんかつ) は、DB が調理後の値なら調理済みの番号を選ぶ。
 */
export interface SeibunLink {
  /** 'identity' または 'identity/attribute' (既定のスタイル・既定量での baseMacro を比べる) */
  key: string;
  /** 成分表の食品番号 (5桁) */
  foodNo: string;
  /** 成分表の食品名に含まれる文字列 (番号の取り違えを防ぐ) */
  food: string;
  /** DB の量の1単位あたりの重さ (g)。g 基準は省略 (=1)。ml 基準は密度、個数基準は1個の重さ */
  gramsPerUnit?: number;
  weight?: 'known' | 'assumed';
  /**
   * 調理で加わるもの (焼き油・たれ・ソース) の、DB の既定量1食ぶんのマクロ。成分表の素材の値に
   * 上乗せして比べる。例: ステーキ 150g の焼き油 5g → { fat: 5 }。省略可。
   */
  extra?: { kcal?: number; protein?: number; fat?: number; carbs?: number };
  /** 出典の値が味付け・付け合わせを含む等で、比べない項目 (理由を note に書くこと) */
  ignore?: ('kcal' | 'protein' | 'fat' | 'carbs')[];
  note?: string;
}

const K = (key: string, foodNo: string, food: string, gramsPerUnit?: number, note?: string, extra?: SeibunLink['extra']): SeibunLink => ({ key, foodNo, food, gramsPerUnit, weight: 'known', note, extra });
const A = (key: string, foodNo: string, food: string, gramsPerUnit: number, note?: string): SeibunLink => ({ key, foodNo, food, gramsPerUnit, weight: 'assumed', note });

export const SEIBUN_LINKS: SeibunLink[] = [
  // ---- 主食 ----
  K('rice/white', '01088', 'うるち米'),
  K('rice/brown', '01085', '玄米'),
  K('noodle_udon/udon', '01039', 'うどん ゆで'),
  K('noodle_udon/soba', '01128', 'そば ゆで'),
  K('noodle_pasta/regular', '01063', 'スパゲッティ 乾', undefined, 'DB の量は乾麺の重さ (80g)'),
  K('noodle_ramen', '01048', '中華めん ゆで'),
  K('bread/plain', '01026', '食パン'),
  K('bread/baguette', '01031', 'フランスパン'),
  K('oatmeal', '01004', 'オートミール'),
  K('potato', '02018', '皮なし 蒸し', undefined, '調理後 (蒸し) の値。かぼちゃ・里芋も同じ群'),
  K('sweet_potato', '02006', 'さつまいも 塊根 皮なし 生'),
  // ---- 肉・魚・卵 ----
  K('chicken_lean/no_skin', '11220', 'むね 皮なし 生'),
  K('chicken_lean/with_skin', '11219', 'むね 皮つき 生'),
  K('chicken_thigh/with_skin', '11221', 'もも 皮つき 生'),
  K('beef_pork/beef', '11072', 'サーロイン 皮下脂肪なし 生'),
  K('beef_pork/pork', '11123', 'ロース 脂身つき 生'),
  K('beef_pork/minced', '11163', 'ぶた ［ひき肉］ 生', undefined, '合いびき (牛:豚) と豚ひき肉を1つの種類で扱う。基準は豚ひき肉、牛ひき肉 (11089) は 251kcal で同じ群'),
  K('chicken_thigh/minced', '11230', 'ひき肉 生'),
  K('beef_pork_fatty/bara', '11129', 'ばら 脂身つき 生'),
  K('red_meat/momo_hire', '11085', 'ヒレ 赤肉 生'),
  K('red_meat/shoulder_loin', '11073', 'サーロイン 赤肉 生'),
  K('fatty_fish/salmon', '10131', 'ぎんざけ 養殖 焼き'),
  K('fatty_fish/saba', '10156', 'まさば 焼き'),
  K('fatty_fish/buri', '10242', 'ぶり 成魚 焼き'),
  K('fatty_fish/sanma', '10174', 'さんま 皮つき 焼き'),
  K('fatty_fish/iwashi', '10049', 'まいわし 焼き'),
  K('white_fish/white', '10205', 'まだら 生'),
  K('egg/whole', '12004', '鶏卵 全卵 生', 50, 'M玉の可食部 約50g (通例値)'),
  A('ham', '11176', 'ロースハム', 10),
  A('bacon_sausage/bacon', '11183', 'ばらベーコン', 20),
  A('bacon_sausage/sausage', '11189', 'フランクフルト', 25),
  A('bacon_sausage/wiener', '11186', 'ウインナーソーセージ', 14, '1本 ≒ 14g (吉野家公式 2本=86kcal からの逆算とも一致)'),
  // ---- 乳・豆 ----
  K('milk/plain', '13003', '普通牛乳', 1.03, '密度 1.03 g/ml'),
  K('milk/low_fat', '13005', '加工乳 低脂肪', 1.03),
  K('yogurt/unsweetened', '13025', '全脂無糖'),
  K('cheese/slice', '13040', 'プロセスチーズ'),
  K('cheese/mozza', '13056', 'モッツァレラ'),
  K('cheese/cream', '13035', 'ナチュラルチーズ クリーム'),
  K('cheese/parmesan', '13038', 'パルメザン'),
  K('tofu/silken', '04033', '絹ごし豆腐', 300, '1丁 300g'),
  K('tofu/firm', '04032', '木綿豆腐', 300, '1丁 300g'),
  A('natto', '04046', '糸引き納豆', 45, '1パック 40〜50g'),
  // ---- 油・調味・ナッツ・菓子 ----
  K('butter_cream/butter', '14017', '有塩バター'),
  K('oil', '14001', 'オリーブ油', 0.8, '大さじ1=15ml=12g (油の目安)。種類は廃止したが、ごま油 (14002) も同じ値'),
  K('mayo', '17042', '全卵型', 1.0),
  K('nuts/plain', '05001', 'アーモンド 乾'),
  K('chocolate/plain', '15116', 'ミルクチョコレート'),
  A('pudding/custard', '15086', 'カスタードプリン', 100),
  // ---- 野菜・果物 ----
  K('veg_dense/broccoli', '06263', 'ブロッコリー 花序 生'),
  K('veg_dense/spinach', '06267', 'ほうれんそう 葉 通年平均 生'),
  A('banana', '07107', 'バナナ 生', 100, '1本 正味100g'),
  A('ichigo', '07012', 'いちご 生', 1.5, '1粒 15g (10粒表示。DBの単位は「粒」の10個ぶん)'),
  // ---- 酒 ----
  K('alcohol/beer', '16006', 'ビール 淡色', 1.0),
  K('alcohol/sake', '16001', '清酒 普通酒', 1.0),
  K('alcohol/wine', '16010', 'ぶどう酒 白', 1.0),
  // ---- 揚げもの・一皿 (調理済みの成分表食品) ----
  K('fried_main/karaage_momo', '11289', 'もも 皮つき から揚げ'),
  A('fried_main/menchi', '18022', 'メンチカツ', 100),
  A('fried_main/korokke', '18018', 'ポテトコロッケ', 90),
  A('fried_main/ebi_fry', '18020', 'えびフライ', 40),
  A('fried_main/tonkatsu', '11276', 'ロース 脂身つき とんかつ', 117),
  A('fried_main/tonkatsu_hire', '11279', 'ヒレ 赤肉 とんかつ', 100),
  A('fried_main/nugget', '11292', 'チキンナゲット', 22, '1個 約18-22g'),
  A('tenshin/gyoza', '18002', 'ぎょうざ', 24),
  A('tenshin/shumai', '18012', 'しゅうまい', 23),
  A('tenshin/harumaki', '18056', '春巻き', 63, '出典の値が内部で食い違う (kcal 221 に対し脂質 19.3g)。組成は照合しない'),
  A('tenshin/nikuman', '15035', '肉まん', 95),
  A('tenshin/anman', '15166', 'あんまん つぶしあん', 100),
  K('meat_solo/hamburg', '18050', '合いびきハンバーグ', undefined, 'デミグラスソース大さじ3 (≒40kcal) を上乗せ', { kcal: 40, carbs: 6, fat: 2 }),
  K('meat_solo/steak', '11071', 'サーロイン 脂身つき 生', undefined, '焼く前の重さ。焼き油 5g を上乗せ', { fat: 5 }),
  K('meat_solo/steak_lean', '11085', 'ヒレ 赤肉 生', undefined, '焼く前の重さ。焼き油 5g を上乗せ', { fat: 5 }),
  K('meat_solo/pork_steak', '11123', 'ロース 脂身つき 生', undefined, '焼く前の重さ。焼き油 5g + たれ (糖質 8g) を上乗せ', { fat: 5, carbs: 8 }),
  K('meat_solo/chicken_steak', '11221', 'もも 皮つき 生', undefined, '焼く前の重さ。焼き油 5g + たれ (糖質 2g) を上乗せ', { fat: 5, carbs: 2 }),
  K('meat_solo/shogayaki', '11123', 'ロース 脂身つき 生', undefined, '焼く前の重さ。焼き油 5g + たれ (糖質 8g) を上乗せ', { fat: 5, carbs: 8 }),
  A('okonomi/okonomiyaki', '18053', 'お好み焼き', 300),
  // ---- US (同じ食品は成分表 = 国内の別系統として使う) ----
  K('us_egg/scrambled', '12004', '鶏卵 全卵 生', 50, '成分表の鶏卵を、USDA の large egg (50g) の国内系統の確認に使う'),
];
