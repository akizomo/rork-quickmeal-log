/**
 * negligible-foods.ts — 「記録しなくていい」食べ物・飲み物の語彙。
 *
 * 検索でこれらの語を打ったとき、「見つかりませんでした」ではなく「ほぼ0kcalなので記録は
 * 不要」と案内する。**記録対象 (Identity) としては持たない**: お茶やブラックコーヒーを9ボタンや
 * 検索結果に並べても、選ぶ価値のある数字が無く、ノイズにしかならない (2026-10-22 の判断)。
 *
 * 判定は**完全一致のみ** (表記ゆれは検索側のキー畳み込みで吸収)。「コーヒー牛乳」「塩ラーメン」
 * のような別の食べ物を、部分一致で「記録不要」にしてしまわないため。
 *
 * 追加するとき: 「ふつうの量で、実際に記録する意味が無いほど小さい」ものだけ。迷ったら
 * 入れず、Identity (記録できる側) で扱うこと。カロリーが無いかどうかではなく、
 * **記録しない方が自然かどうか**で決める。
 */

/** zero = ほぼ0kcal / small = ふつうの量ならごくわずか / inDish = 料理の数字に含まれている */
export type NegligibleGroup = 'zero' | 'small' | 'inDish';

export interface NegligibleEntry {
  group: NegligibleGroup;
  terms: string[];
}

export const NEGLIGIBLE_JA: NegligibleEntry[] = [
  {
    group: 'zero',
    terms: [
      '水', 'お水', 'ミネラルウォーター', '炭酸水', '白湯', 'さゆ',
      'お茶', '緑茶', '煎茶', '麦茶', 'ウーロン茶', '烏龍茶', 'ほうじ茶', '玄米茶', '紅茶', 'ハーブティー', 'ルイボスティー', '番茶', '抹茶',
      'コーヒー', '珈琲', 'ブラックコーヒー', 'アイスコーヒー', 'ホットコーヒー', 'エスプレッソ',
      '青汁', 'ゼロコーラ', 'ダイエットコーラ', 'ゼロカロリー',
    ],
  },
  {
    group: 'small',
    terms: [
      // 糖類・調味料: ふつうの使い方なら数kcal〜数十kcal
      '砂糖', 'シュガー', '練乳', 'コンデンスミルク', 'メープルシロップ', 'ガムシロップ', 'コーヒーフレッシュ',
      'ソース', 'ウスターソース', 'とんかつソース', '中濃ソース', 'ケチャップ', '醤油', 'しょうゆ', 'ポン酢', 'めんつゆ', 'みりん', '料理酒', '酢', 'お酢', '塩', 'こしょう', '胡椒', 'わさび', 'からし', '辛子', 'だし', '出汁', '七味',
      // 薬味
      '大葉', 'しそ', 'みょうが', '茗荷', 'にんにく', '銀杏',
      // その他
      'ガム', 'ノンアルコールビール', 'ノンアルビール',
    ],
  },
  { group: 'inDish', terms: ['カレールー', 'ルー', 'カレー粉'] },
];

export const NEGLIGIBLE_EN: NegligibleEntry[] = [
  { group: 'zero', terms: ['water', 'sparkling water', 'seltzer', 'tea', 'green tea', 'black tea', 'herbal tea', 'iced tea', 'coffee', 'black coffee', 'iced coffee', 'espresso', 'diet soda', 'diet coke', 'zero sugar soda'] },
  { group: 'small', terms: ['sugar', 'honey', 'syrup', 'ketchup', 'mustard', 'hot sauce', 'soy sauce', 'vinegar', 'salt', 'pepper', 'garlic', 'ginger', 'chewing gum', 'gum'] },
];
