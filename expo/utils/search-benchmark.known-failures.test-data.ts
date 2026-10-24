/**
 * 検索ベンチマークの失敗の凍結リスト (ラチェット)。改善により縮小済み (増やしていない)。
 * 詳細は search-benchmark.test.ts の冒頭を参照。**手で足さない** — 足したくなったら退行している。
 */
export const KNOWN_FAILURES: string[] = [
  "おむすび", // zero
  "鶏肉", // vocab-only
  "しらす", // vocab-only
  "メロン", // vocab-only
  "グミ", // zero
  "ガム", // zero
  "うな重", // l2-only
  "豚骨ラーメン", // vocab-only
  "冷麺", // top3
  "天ぷら", // top3
  "焼売", // zero
  "チヂミ", // vocab-only
  "天津飯", // vocab-only
  "タコライス", // vocab-only
  "みそ汁", // l2-only
  "ハンバーク", // l2-only
  "ヨーグルド", // l2-only
];
