/**
 * US 版 検索ベンチマークの失敗の凍結リスト (ラチェット)。初期化: 現時点の失敗を全て凍結。
 * 詳細は search-benchmark.us.test.ts の冒頭を参照。**手で足さない** — 足したくなったら退行している。
 */
export const US_KNOWN_FAILURES: string[] = [
  "whole wheat pasta", // zero
  "french fries", // l2-only
  "deli turkey", // top3
  "lean ground beef", // vocab-only
  "cream cheese", // l2-only
  "egg salad", // top3
  "general tso", // top3
  "oreo", // wrong
  "quest bar", // top3
  "ipa", // top3
  "shot", // top3
  "waffle", // top3
  "fried chicken breast", // top3
  "mediterranean bowl", // l2-only
  "mocha frappuccino", // top3
];
