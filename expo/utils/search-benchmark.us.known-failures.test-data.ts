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
  "general tso", // top3
  "quest bar", // top3
  "ipa", // top3
  "shot", // top3
  "waffle", // top3
  "fried chicken breast", // top3
  "mediterranean bowl", // l2-only
  "tuna packet", // top3
  "edamame", // gap-misleading
  "salsa", // gap-silent
  "garlic knots", // gap-silent
  "cornbread", // gap-misleading
  "coleslaw", // gap-misleading
  "pasta with alfredo sauce", // top3
  "scrambled egg whites", // l2-only
  "ground beef 90/10", // top3
  "turkey breast slices", // wrong
  "extra firm tofu cubes", // top3
  "romaine hearts", // top3
  "half an avocado", // gap-misleading
  "walnut halves", // top3
  "two slices of cheese pizza", // top3
  "mushroom pizza", // vocab-only
  "baked mac and cheese", // top3
  "meat lasagna", // l2-only
  "pasta with red sauce", // top3
  "honey baked ham", // top3
  "corn dog nuggets", // gap-silent
  "clam chowder bread bowl", // l2-only
  "vegetable beef soup", // l1-low
  "cajun jambalaya", // top3
  "tikka masala", // top3
  "french toast sticks", // top3
  "egg and cheese bagel", // l1-low
  "wheat thins", // top3
  "cheese danish", // top3
  "chocolate brownie", // top3
  "cranberry juice", // top3
  "peanut butter banana toast", // wrong
  "chicken and rice", // l1-low
  "turkey meatballs", // wrong
  "sheet pan chicken and vegetables", // l1-low
  "air fryer chicken wings", // l2-only
  "instant pot chili", // l2-only
  "egg muffin cups", // top3
  "lunchables", // gap-silent
  "chicken nuggets and fries", // top3
  "quinoa salad", // l2-only
  "turkey burger", // top3
  "egg white omelet", // l2-only
  "protein pancakes", // l2-only
  "green juice", // top3
  "california burrito", // l2-only
  "apple pie a la mode", // top3
  "chicken parmesan", // wrong
  "shrimp scampi", // wrong
  "steakhouse salad", // l2-only
  "bibimbap bowl", // l2-only
  "burrito bowl chicken", // top3
  "sausage mcmuffin", // top3
  "white claw mango", // wrong
];
