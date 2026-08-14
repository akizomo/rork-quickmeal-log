/**
 * US-locale Add-on pool.
 *
 * Spec: docs/US-food-db-design.md §7
 *
 * Two-layer model (same as JP addons.ts):
 *   - US_PURE_ADDONS: standalone Addon objects (sauces, condiments, toppings)
 *   - US_IDENTITY_ADDON_REFS: US ingredient Identity IDs that also act as add-ons
 *     (macro lives on the Identity's `asAddon` field in us-ingredients.ts)
 *
 * ID convention: `us_` prefix for all US-specific IDs to avoid collision with JP IDs.
 */

import { Addon } from '@/types/identity';

// ---------------------------------------------------------------------------
// Pure Add-ons — US sauce/condiment culture
// ---------------------------------------------------------------------------

export const US_PURE_ADDONS: Addon[] = [
  // ---- Sauces & dressings ----
  {
    id: 'us_ranch',
    label: 'Ranch Dressing',
    unit: 'ml',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 130, protein: 1, fat: 14, carbs: 2 },
    allowedIdentityIds: [
      'us_entree_salad', 'us_wings', 'us_pizza_pepperoni', 'us_pizza_cheese',
      'us_tenders_nuggets', 'us_wrap', 'us_protein_salad',
    ],
  },
  {
    id: 'us_bbq_sauce',
    label: 'BBQ Sauce',
    unit: 'ml',
    unitAmount: 36,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 60, protein: 0, fat: 0, carbs: 14 },
    allowedIdentityIds: [
      'us_wings', 'us_bbq_plate', 'us_tenders_nuggets', 'us_cheeseburger', 'us_hamburger',
      'us_fried_chicken', 'us_rotisserie_grilled',
    ],
  },
  {
    id: 'us_buffalo_sauce',
    label: 'Buffalo Sauce',
    unit: 'ml',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 40, protein: 0, fat: 4, carbs: 1 },
    allowedIdentityIds: ['us_wings', 'us_tenders_nuggets', 'us_chicken_sandwich', 'us_wrap'],
  },
  {
    id: 'us_honey_mustard',
    label: 'Honey Mustard',
    unit: 'ml',
    unitAmount: 15,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 50, protein: 0, fat: 3, carbs: 5 },
    allowedIdentityIds: ['us_tenders_nuggets', 'us_chicken_sandwich', 'us_deli_sub', 'us_wrap'],
  },
  {
    id: 'us_ketchup',
    label: 'Ketchup',
    unit: 'g',
    unitAmount: 17,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 15, protein: 0, fat: 0, carbs: 4 },
    allowedIdentityIds: [
      'us_cheeseburger', 'us_hamburger', 'us_hot_dog', 'us_tenders_nuggets',
      'us_eggs_bacon', 'us_seafood_plate', 'us_fried_chicken',
    ],
  },
  {
    id: 'us_mustard',
    label: 'Mustard',
    unit: 'g',
    unitAmount: 5,
    unitLabel: '1 tsp',
    addedMacro: { kcal: 3, protein: 0, fat: 0, carbs: 0 },
    allowedIdentityIds: ['us_cheeseburger', 'us_hamburger', 'us_hot_dog', 'us_deli_sub'],
  },

  // ---- Mexican condiments ----
  {
    id: 'us_guacamole',
    label: 'Guacamole',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 50, protein: 1, fat: 4.5, carbs: 3 },
    allowedIdentityIds: [
      'us_burrito', 'us_burrito_bowl', 'us_tacos', 'us_quesadilla',
      'us_nachos', 'us_cheeseburger', 'us_chicken_sandwich', 'us_breakfast_burrito',
    ],
  },
  {
    id: 'us_sour_cream',
    label: 'Sour Cream',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 60, protein: 1, fat: 6, carbs: 1 },
    allowedIdentityIds: [
      'us_burrito', 'us_burrito_bowl', 'us_tacos', 'us_quesadilla',
      'us_nachos', 'us_enchiladas', 'us_chili', 'us_steak_potato',
      'us_soup_creamy', 'us_breakfast_burrito',
    ],
  },
  {
    id: 'us_salsa',
    label: 'Salsa',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 10, protein: 0, fat: 0, carbs: 2 },
    allowedIdentityIds: [
      'us_burrito', 'us_burrito_bowl', 'us_tacos', 'us_quesadilla',
      'us_nachos', 'us_eggs_bacon', 'us_breakfast_burrito', 'us_breakfast_sandwich',
    ],
  },
  {
    id: 'us_queso',
    label: 'Queso / Cheese Dip',
    unit: 'g',
    unitAmount: 60,
    unitLabel: '¼ cup',
    addedMacro: { kcal: 110, protein: 4, fat: 9, carbs: 4 },
    allowedIdentityIds: ['us_nachos', 'us_burrito_bowl', 'us_tacos', 'us_enchiladas'],
  },

  // ---- Gravy & dairy spreads ----
  {
    id: 'us_gravy',
    label: 'Gravy',
    unit: 'ml',
    unitAmount: 60,
    unitLabel: '¼ cup',
    addedMacro: { kcal: 40, protein: 1, fat: 2, carbs: 4 },
    allowedIdentityIds: [
      'us_meatloaf_mash', 'us_biscuits_gravy', 'us_roast_plate',
      'us_fried_chicken', 'us_steak_potato',
    ],
  },
  {
    id: 'us_cream_cheese',
    label: 'Cream Cheese',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 50, protein: 1, fat: 5, carbs: 1 },
    allowedIdentityIds: ['us_breakfast_sandwich', 'us_avocado_toast'],
  },
  {
    id: 'us_tartar_sauce',
    label: 'Tartar Sauce',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 70, protein: 0.4, fat: 7, carbs: 2 },
    allowedIdentityIds: ['us_seafood_plate'],
  },
  {
    id: 'us_cocktail_sauce',
    label: 'Cocktail Sauce',
    unit: 'g',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 30, protein: 0, fat: 0, carbs: 7 },
    allowedIdentityIds: ['us_seafood_plate'],
  },

  // ---- Sweet toppings ----
  {
    id: 'us_maple_syrup',
    label: 'Maple Syrup',
    unit: 'g',
    unitAmount: 20,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 50, protein: 0, fat: 0, carbs: 13 },
    allowedIdentityIds: [
      'us_pancakes_waffles', 'us_eggs_bacon', 'us_oatmeal',
      'us_chicken_and_waffles', 'us_breakfast_sandwich',
    ],
  },
  {
    id: 'us_whipped_cream',
    label: 'Whipped Cream',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 25, protein: 0, fat: 2, carbs: 2 },
    allowedIdentityIds: ['us_pancakes_waffles', 'us_oatmeal'],
  },
  {
    id: 'us_jam',
    label: 'Jam / Jelly',
    unit: 'g',
    unitAmount: 18,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 50, protein: 0, fat: 0, carbs: 13 },
    allowedIdentityIds: ['us_avocado_toast', 'us_oatmeal'],
  },
  {
    id: 'us_honey',
    label: 'Honey',
    unit: 'g',
    unitAmount: 21,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 60, protein: 0, fat: 0, carbs: 16 },
    allowedIdentityIds: ['us_avocado_toast', 'us_oatmeal', 'us_tenders_nuggets'],
  },
  {
    id: 'us_peanut_butter_packet',
    label: 'Peanut Butter',
    unit: 'g',
    unitAmount: 15,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 95, protein: 3.5, fat: 8, carbs: 3 },
    allowedIdentityIds: ['us_oatmeal', 'us_avocado_toast'],
  },
  {
    id: 'us_butter_pat',
    label: 'Butter',
    unit: 'g',
    unitAmount: 14,
    unitLabel: '1 pat (tbsp)',
    addedMacro: { kcal: 100, protein: 0, fat: 11, carbs: 0 },
    allowedIdentityIds: [
      'us_pancakes_waffles', 'us_eggs_bacon', 'us_avocado_toast',
      'us_biscuits_gravy', 'us_steak_potato',
    ],
  },

  // ---- Salad / soup toppings ----
  {
    id: 'us_croutons',
    label: 'Croutons',
    unit: 'g',
    unitAmount: 5,
    unitLabel: '5g',
    addedMacro: { kcal: 25, protein: 0.7, fat: 1, carbs: 4 },
    allowedIdentityIds: ['us_entree_salad', 'us_protein_salad', 'us_soup_creamy', 'us_soup_light'],
  },
  {
    id: 'us_berry_top',
    label: 'Mixed Berries',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '50g',
    addedMacro: { kcal: 25, protein: 0.4, fat: 0.2, carbs: 6 },
    allowedIdentityIds: ['us_oatmeal', 'us_pancakes_waffles'],
  },
  {
    id: 'us_banana_slice',
    label: 'Banana',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '½ banana',
    addedMacro: { kcal: 45, protein: 0.5, fat: 0.1, carbs: 11 },
    allowedIdentityIds: ['us_oatmeal', 'us_pancakes_waffles'],
  },

  // ---- Protein boosters ----
  {
    id: 'us_extra_meat_scoop',
    label: 'Extra Protein Scoop',
    unit: 'g',
    unitAmount: 85,
    unitLabel: '3 oz',
    addedMacro: { kcal: 150, protein: 18, fat: 8, carbs: 1 },
    allowedIdentityIds: ['us_burrito_bowl', 'us_tacos', 'us_nachos', 'us_grain_bowl'],
  },
  {
    id: 'us_blue_cheese',
    label: 'Blue Cheese Dip',
    unit: 'ml',
    unitAmount: 30,
    unitLabel: '2 tbsp',
    addedMacro: { kcal: 140, protein: 1, fat: 14, carbs: 2 },
    allowedIdentityIds: ['us_wings'],
  },
  {
    id: 'us_crackers',
    label: 'Crackers',
    unit: 'g',
    unitAmount: 16,
    unitLabel: '~6 crackers',
    addedMacro: { kcal: 70, protein: 1, fat: 2, carbs: 12 },
    allowedIdentityIds: ['us_chili', 'us_soup_light', 'us_soup_creamy'],
  },

  // ---- Extra cheese / avocado (non-Identity pure versions) ----
  {
    id: 'us_extra_cheese',
    label: 'Extra Cheese',
    unit: 'g',
    unitAmount: 28,
    unitLabel: '1 slice / 1 oz',
    addedMacro: { kcal: 100, protein: 6, fat: 8, carbs: 1 },
    allowedIdentityIds: [
      'us_cheeseburger', 'us_hamburger', 'us_breakfast_sandwich', 'us_breakfast_burrito',
      'us_eggs_bacon', 'us_entree_salad', 'us_chili', 'us_pasta_tomato',
      'us_pizza_pepperoni', 'us_burrito', 'us_burrito_bowl',
    ],
  },
  {
    id: 'us_avocado_slice',
    label: 'Avocado',
    unit: 'g',
    unitAmount: 50,
    unitLabel: '¼ avocado',
    addedMacro: { kcal: 80, protein: 1, fat: 7, carbs: 4 },
    allowedIdentityIds: [
      'us_cheeseburger', 'us_chicken_sandwich', 'us_deli_sub', 'us_wrap',
      'us_entree_salad', 'us_eggs_bacon', 'us_breakfast_sandwich',
    ],
  },
  {
    id: 'us_mayo_packet',
    label: 'Mayo',
    unit: 'g',
    unitAmount: 14,
    unitLabel: '1 tbsp',
    addedMacro: { kcal: 90, protein: 0, fat: 10, carbs: 0 },
    allowedIdentityIds: [
      'us_cheeseburger', 'us_hamburger', 'us_chicken_sandwich',
      'us_deli_sub', 'us_blt', 'us_wrap',
    ],
  },
];

// ---------------------------------------------------------------------------
// Identity-level Add-on refs (US ingredient Identity IDs with asAddon)
// Populated when us-ingredients.ts is implemented.
// ---------------------------------------------------------------------------

export const US_IDENTITY_ADDON_REFS: string[] = [
  'us_egg',
  'us_cheese_slice',
  'us_bacon_strip',
  'us_avocado',
  'us_butter',
  'us_nuts_mixed',
  'us_grilled_chicken',
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const US_PURE_ADDONS_BY_ID: Record<string, Addon> = US_PURE_ADDONS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, Addon>
);
