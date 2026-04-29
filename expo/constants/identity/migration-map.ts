/**
 * Legacy → Identity ID migration map (Phase 5).
 *
 * Maps the old `categoryKey/subTypeKey` pairs (from quick-log-master.ts and
 * dish-master.ts) to the new Identity-first IDs. Used at app boot to
 * opportunistically backfill `identityId` on existing FoodLog records WITHOUT
 * removing the legacy fields — display code still falls back to the old
 * categoryLabel / subTypeLabel for unmapped logs.
 *
 * Spec: docs/IA-identity-spec.md §6.3
 */

/** `${categoryKey}/${subTypeKey}` → new Identity ID. */
export const LEGACY_TO_IDENTITY_MAP: Record<string, string> = {
  // ---- Ingredient: staple ----
  'staple/rice': 'rice',
  'staple/bread': 'bread',
  'staple/oatmeal': 'oatmeal',
  'staple/cereal': 'cereal',
  'staple/potato': 'potato',

  // ---- Ingredient: lean_protein ----
  'lean_protein/chicken_breast': 'chicken_lean',
  'lean_protein/sasami': 'chicken_lean',
  'lean_protein/tuna_can': 'canned_lean_fish',
  'lean_protein/salad_chicken': 'salad_chicken',
  'lean_protein/lean_fish': 'white_fish',
  'lean_protein/seafood_lean': 'seafood_lean',
  'lean_protein/beef_lean': 'red_meat',
  'lean_protein/pork_lean': 'red_meat',

  // ---- Ingredient: egg (all four legacy entries collapse to single Identity) ----
  'egg/whole_egg': 'egg',
  'egg/boiled_egg': 'egg',
  'egg/fried_egg': 'egg',
  'egg/egg_dish': 'egg',

  // ---- Ingredient: fatty_protein ----
  'fatty_protein/beef': 'beef_pork',
  'fatty_protein/pork': 'beef_pork',
  'fatty_protein/chicken_thigh': 'chicken_thigh',
  'fatty_protein/fatty_fish': 'fatty_fish',
  'fatty_protein/processed_meat': 'bacon_sausage',

  // ---- Ingredient: dairy_soy ----
  'dairy_soy/yogurt': 'yogurt',
  'dairy_soy/milk': 'milk',
  'dairy_soy/soy_milk': 'soy_milk',
  'dairy_soy/tofu': 'tofu',
  'dairy_soy/natto': 'natto',
  'dairy_soy/cheese': 'cheese',

  // ---- Ingredient: veggies ----
  'veggies/salad': 'salad_raw',
  'veggies/steamed_veg': 'veg_cooked',
  'veggies/veggie_side': 'side_seasoned',
  'veggies/stir_fry_veg': 'veg_cooked',
  'veggies/veggie_soup': 'miso_soup',
  'veggies/pickles': 'pickles',

  // ---- Ingredient: fruit ----
  'fruit/apple_pear': 'apple_pear',
  'fruit/banana': 'banana',
  'fruit/berry_mix': 'berry',
  'fruit/citrus': 'citrus',
  'fruit/cut_fruit': 'fruit_other',

  // ---- Ingredient: added_fat ----
  'added_fat/oil_dressing': 'oil',
  'added_fat/butter': 'butter_cream',
  'added_fat/mayo': 'mayo',

  // ---- Ingredient: snack_drink ----
  'snack_drink/chocolate_candy': 'chocolate',
  'snack_drink/baked_sweets': 'cookie',
  'snack_drink/snack': 'snack',
  'snack_drink/ice': 'ice',
  'snack_drink/sweet_bread': 'sweet_bread',
  'snack_drink/nuts': 'nuts',
  'snack_drink/sweet_drink': 'sweet_drink',

  // ---- Dish: rice_dish ----
  'rice_dish/gyudon': 'gyudon_class',
  'rice_dish/oyakodon': 'gyudon_class',
  'rice_dish/kaisendon': 'kaisendon',
  'rice_dish/fried_rice': 'fried_rice_omurice',
  'rice_dish/omurice': 'fried_rice_omurice',
  'rice_dish/rice_default': 'gyudon_class',

  // ---- Dish: curry ----
  'curry/curry_rice': 'curry_class',
  'curry/keema_curry': 'curry_class',
  'curry/dry_curry': 'curry_class',
  'curry/katsu_curry': 'katsu_curry',
  'curry/curry_default': 'curry_class',

  // ---- Dish: chinese_noodles ----
  'chinese_noodles/ramen_light': 'ramen_light',
  'chinese_noodles/ramen_iekei': 'ramen_heavy',
  'chinese_noodles/ramen_miso': 'ramen_heavy',
  'chinese_noodles/ramen_jiro': 'ramen_jiro',
  'chinese_noodles/tsukemen': 'tsukemen',
  'chinese_noodles/soupless': 'tsukemen',
  'chinese_noodles/fried_noodles': 'fried_noodles',
  'chinese_noodles/hiyashi_chuka': 'cold_noodles',

  // ---- Dish: japanese_noodles ----
  'japanese_noodles/udon': 'udon',
  'japanese_noodles/soba': 'soba',
  'japanese_noodles/somen': 'somen',
  'japanese_noodles/yaki_udon': 'yaki_udon',
  'japanese_noodles/jp_default': 'udon',

  // ---- Dish: pasta ----
  'pasta/tomato_pasta': 'pasta_tomato',
  'pasta/oil_pasta': 'pasta_oil',
  'pasta/cream_pasta': 'pasta_cream',
  'pasta/meat_pasta': 'pasta_meat',
  'pasta/japanese_pasta': 'pasta_japanese',
  'pasta/pasta_default': 'pasta_tomato',

  // ---- Dish: sushi ----
  'sushi/plate': 'sushi_plate',
  'sushi/piece': 'sushi_piece',

  // ---- Dish: sandwich (all "cold" variants collapse to cold_sand) ----
  'sandwich/egg_sand': 'cold_sand',
  'sandwich/tuna_sand': 'cold_sand',
  'sandwich/ham_blt_sand': 'cold_sand',
  'sandwich/hot_sand': 'hot_sand',
  'sandwich/burger': 'burger',
  'sandwich/sand_default': 'cold_sand',

  // ---- Dish: pizza ----
  'pizza/light': 'pizza_light',
  'pizza/regular': 'pizza_regular',
  'pizza/heavy': 'pizza_heavy',

  // ---- Dish: set_meal → misc_dish/teishoku|bento ----
  'set_meal/teishoku': 'teishoku',
  'set_meal/bento': 'bento',
  'set_meal/convenience_bento': 'bento',
};

/**
 * Look up a legacy log's new Identity ID.
 * Returns undefined when the log doesn't have a known mapping (kept as-is).
 */
export function lookupLegacyIdentity(
  categoryKey: string | undefined,
  subTypeKey: string | undefined
): string | undefined {
  if (!categoryKey || !subTypeKey) return undefined;
  return LEGACY_TO_IDENTITY_MAP[`${categoryKey}/${subTypeKey}`];
}
