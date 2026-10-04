/**
 * 検索ベンチマークの失敗の凍結リスト (ラチェット)。改善により縮小済み (増やしていない)。
 * 詳細は search-benchmark.test.ts の冒頭を参照。**手で足さない** — 足したくなったら退行している。
 */
export const KNOWN_FAILURES: string[] = [
  "おむすび", // zero
  "コーンフレーク", // zero
  "お餅", // vocab-only
  "スパゲッティ", // l2-only
  "ひき肉", // vocab-only
  "合いびき肉", // vocab-only
  "豚ロース", // l2-only
  "鶏肉", // vocab-only
  "ラム肉", // vocab-only
  "まぐろ", // top3
  "しらす", // vocab-only
  "温泉卵", // vocab-only
  "オムレツ", // vocab-only
  "冷奴", // zero
  "小松菜", // zero
  "おひたし", // vocab-only
  "メロン", // vocab-only
  "レーズン", // zero
  "もずく", // zero
  "わかめ", // zero
  "シュークリーム", // vocab-only
  "ドーナツ", // vocab-only
  "カフェラテ", // vocab-only
  "スムージー", // vocab-only
  "梅酒", // zero
  "グミ", // zero
  "ガム", // zero
  "エナジードリンク", // vocab-only
  "スポーツドリンク", // l2-only
  "豚丼", // vocab-only
  "うな重", // l2-only
  "豚骨ラーメン", // vocab-only
  "冷麺", // top3
  "巻き寿司", // zero
  "いなり寿司", // l2-only
  "手巻き寿司", // zero
  "とんかつ", // vocab-only
  "天ぷら", // top3
  "おでん", // vocab-only
  "ナポリタン", // zero
  "ジェノベーゼ", // zero
  "明太子パスタ", // l2-only
  "たらこスパゲッティ", // zero
  "ローストビーフ", // zero
  "焼売", // zero
  "チヂミ", // vocab-only
  "肉まん", // zero
  "天津飯", // vocab-only
  "タコライス", // vocab-only
  "みそ汁", // l2-only
  "たまごやき", // wrong
  "ハンバーク", // l2-only
  "ヨーグルド", // l2-only
  "スパゲッティー", // l2-only
];
