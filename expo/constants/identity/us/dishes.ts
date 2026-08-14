/**
 * US-locale dish Identity definitions (en-US dish tab — 57 Identities, 9 buckets).
 *
 * Spec: docs/US-food-db-design.md §3 / §3.10
 *
 * defaultMacro: calibrated from chain nutrition data + USDA (§3.10).
 * Identity IDs carry `us_` prefix to guarantee no collision with JP IDs.
 * Attribute factors are relative to the Identity's own defaultMacro (1.0 = no change).
 */

import { Identity } from '@/types/identity';

// ---------------------------------------------------------------------------
// Bucket 1: Burgers & Sandwiches  `burger_sandwich` — 9 Identities
// ---------------------------------------------------------------------------

const BUCKET_BURGER_SANDWICH: Identity[] = [
  {
    id: 'us_cheeseburger',
    label: 'Cheeseburger',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 520, protein: 30, fat: 28, carbs: 40 },
    referenceDescription: "1 burger with bun (McDonald's QPC basis)",
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
      ],
    },
    attributes: [
      { key: 'single', label: 'Single', isDefault: true },
      { key: 'double', label: 'Double', factor: { kcal: 1.38, protein: 1.57, fat: 1.57, carbs: 1.1 } },
      { key: 'bacon', label: 'Bacon', factor: { kcal: 1.17, protein: 1.1, fat: 1.32, carbs: 1.05 } },
    ],
    defaultAddonIds: ['us_ketchup', 'us_mustard'],
    allowedAddonIds: ['us_ketchup', 'us_mustard', 'us_mayo_packet', 'us_extra_cheese', 'us_avocado_slice'],
    searchTags: ['burger', 'cheeseburger', 'hamburger', 'mcdonalds', 'fast food'],
  },
  {
    id: 'us_hamburger',
    label: 'Hamburger',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 430, protein: 25, fat: 19, carbs: 42 },
    referenceDescription: '1 plain burger with bun',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }, { label: '2', value: 2 }] },
    searchTags: ['burger', 'hamburger', 'plain burger'],
  },
  {
    id: 'us_chicken_sandwich',
    label: 'Chicken Sandwich',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 540, protein: 30, fat: 25, carbs: 46 },
    referenceDescription: '1 sandwich (Chick-fil-A / Popeyes basis)',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }] },
    attributes: [
      { key: 'crispy', label: 'Crispy', isDefault: true },
      { key: 'grilled', label: 'Grilled', factor: { kcal: 0.70, protein: 1.07, fat: 0.44, carbs: 0.91 } },
    ],
    searchTags: ['chicken sandwich', 'chick fil a', 'popeyes', 'crispy chicken'],
  },
  {
    id: 'us_deli_sub',
    label: 'Deli Sub / Hoagie',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 400, protein: 22, fat: 14, carbs: 46 },
    referenceDescription: '1 6-inch sub (Subway basis)',
    amount: { unit: 'piece', default: 1, chips: [{ label: '6"', value: 1 }, { label: '12"', value: 2 }] },
    attributes: [
      { key: 'turkey', label: 'Turkey', isDefault: true },
      { key: 'ham', label: 'Ham', factor: { kcal: 0.98, protein: 1.0, fat: 1.0, carbs: 1.0 } },
      { key: 'italian', label: 'Italian / Meatball', factor: { kcal: 1.25, protein: 1.14, fat: 1.5, carbs: 1.17 } },
      { key: 'veggie', label: 'Veggie', factor: { kcal: 0.75, protein: 0.68, fat: 0.71, carbs: 0.89 } },
    ],
    searchTags: ['sub', 'hoagie', 'hero', 'subway', 'deli sandwich'],
  },
  {
    id: 'us_grilled_cheese',
    label: 'Grilled Cheese',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 400, protein: 15, fat: 25, carbs: 33 },
    referenceDescription: '1 sandwich (2 slices bread + cheese + butter)',
    amount: { unit: 'piece', default: 1 },
    searchTags: ['grilled cheese', 'cheese sandwich'],
  },
  {
    id: 'us_blt',
    label: 'BLT',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 480, protein: 17, fat: 30, carbs: 35 },
    referenceDescription: '1 sandwich (bacon, lettuce, tomato)',
    amount: { unit: 'piece', default: 1 },
    searchTags: ['blt', 'bacon lettuce tomato'],
  },
  {
    id: 'us_hot_dog',
    label: 'Hot Dog',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 290, protein: 11, fat: 17, carbs: 24 },
    referenceDescription: '1 hot dog with bun',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }, { label: '2', value: 2 }] },
    attributes: [
      { key: 'plain', label: 'Plain', isDefault: true },
      { key: 'chili_cheese', label: 'Chili Cheese', factor: { kcal: 1.55, protein: 1.73, fat: 1.65, carbs: 1.42 } },
      { key: 'corn_dog', label: 'Corn Dog', factor: { kcal: 1.21, protein: 1.0, fat: 1.12, carbs: 1.42 } },
    ],
    searchTags: ['hot dog', 'frank', 'sausage', 'corn dog'],
  },
  {
    id: 'us_wrap',
    label: 'Wrap',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 510, protein: 28, fat: 24, carbs: 45 },
    referenceDescription: '1 wrap (chicken caesar / buffalo basis)',
    amount: { unit: 'piece', default: 1 },
    searchTags: ['wrap', 'chicken wrap', 'caesar wrap', 'buffalo wrap', 'tortilla wrap'],
  },
  {
    id: 'us_pbj',
    label: 'PB&J',
    primaryHome: { tab: 'dish', bucket: 'burger_sandwich' },
    defaultMacro: { kcal: 380, protein: 12, fat: 16, carbs: 48 },
    referenceDescription: '1 sandwich (2 slices bread + peanut butter + jelly)',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }, { label: '2', value: 2 }] },
    searchTags: ['pbj', 'peanut butter jelly', 'peanut butter and jelly', 'sandwich'],
    searchableFrom: ['breakfast'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 2: Pizza & Pasta  `pizza_pasta` — 7 Identities
// ---------------------------------------------------------------------------

const BUCKET_PIZZA_PASTA: Identity[] = [
  {
    id: 'us_pizza_pepperoni',
    label: 'Pizza',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 480, protein: 20, fat: 22, carbs: 50 },
    referenceDescription: '2 slices (Domino\'s basis)',
    amount: {
      unit: 'slice',
      default: 2,
      chips: [
        { label: '1 slice', value: 1 },
        { label: '2 slices', value: 2 },
        { label: '3 slices', value: 3 },
        { label: '4 slices', value: 4 },
      ],
    },
    attributes: [
      { key: 'pepperoni', label: 'Pepperoni', isDefault: true },
      { key: 'cheese', label: 'Cheese', factor: { kcal: 0.90, protein: 0.90, fat: 0.77, carbs: 1.0 } },
      { key: 'supreme', label: 'Supreme / Meat', factor: { kcal: 1.12, protein: 1.15, fat: 1.23, carbs: 1.0 } },
      { key: 'veggie', label: 'Veggie', factor: { kcal: 0.85, protein: 0.85, fat: 0.73, carbs: 1.04 } },
    ],
    searchTags: ['pizza', 'pepperoni pizza', 'cheese pizza', 'dominos', 'papa johns'],
  },
  {
    id: 'us_pizza_cheese',
    label: 'Cheese Pizza',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 430, protein: 18, fat: 17, carbs: 50 },
    referenceDescription: '2 slices, plain cheese',
    amount: {
      unit: 'slice',
      default: 2,
      chips: [{ label: '1 slice', value: 1 }, { label: '2 slices', value: 2 }, { label: '3 slices', value: 3 }],
    },
    searchTags: ['pizza', 'cheese pizza', 'plain pizza'],
  },
  {
    id: 'us_pasta_tomato',
    label: 'Pasta — Tomato / Marinara',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 600, protein: 20, fat: 18, carbs: 90 },
    referenceDescription: '1 plate (Olive Garden basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: '1 plate', value: 100 }, { label: 'Extra', value: 150 }],
    },
    searchTags: ['pasta', 'spaghetti', 'marinara', 'tomato sauce', 'pasta pomodoro'],
  },
  {
    id: 'us_pasta_alfredo',
    label: 'Pasta — Alfredo / Cream',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 900, protein: 22, fat: 62, carbs: 66 },
    referenceDescription: '1 plate (Olive Garden Fettuccine Alfredo)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: '1 plate', value: 100 }],
    },
    searchTags: ['pasta', 'alfredo', 'cream sauce', 'fettuccine', 'carbonara'],
  },
  {
    id: 'us_pasta_meat',
    label: 'Pasta — Meat Sauce',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 800, protein: 35, fat: 43, carbs: 69 },
    referenceDescription: '1 plate (Olive Garden basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: '1 plate', value: 100 }],
    },
    searchTags: ['pasta', 'meat sauce', 'bolognese', 'meatballs', 'spaghetti and meatballs'],
  },
  {
    id: 'us_mac_cheese',
    label: 'Mac & Cheese',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 560, protein: 20, fat: 30, carbs: 52 },
    referenceDescription: '1 restaurant serving',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: '1 bowl', value: 100 }, { label: 'Large', value: 150 }],
    },
    searchTags: ['mac and cheese', 'mac cheese', 'macaroni', 'kraft'],
  },
  {
    id: 'us_lasagna',
    label: 'Lasagna',
    primaryHome: { tab: 'dish', bucket: 'pizza_pasta' },
    defaultMacro: { kcal: 520, protein: 29, fat: 28, carbs: 36 },
    referenceDescription: '1 serving / 1 piece (Olive Garden basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 piece', value: 100 }, { label: 'Extra', value: 150 }],
    },
    searchTags: ['lasagna', 'baked ziti', 'pasta bake'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 3: Chicken  `chicken` — 5 Identities
// ---------------------------------------------------------------------------

const BUCKET_CHICKEN: Identity[] = [
  {
    id: 'us_fried_chicken',
    label: 'Fried Chicken',
    primaryHome: { tab: 'dish', bucket: 'chicken' },
    defaultMacro: { kcal: 550, protein: 45, fat: 35, carbs: 18 },
    referenceDescription: '2 pieces (breast + thigh, Popeyes basis)',
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1 pc', value: 1 },
        { label: '2 pc', value: 2 },
        { label: '3 pc', value: 3 },
      ],
    },
    attributes: [
      { key: 'original', label: 'Original', isDefault: true },
      { key: 'spicy', label: 'Spicy', factor: { kcal: 1.04, protein: 1.0, fat: 1.06, carbs: 1.11 } },
    ],
    searchTags: ['fried chicken', 'kfc', 'popeyes', 'church\'s chicken', 'southern fried'],
  },
  {
    id: 'us_tenders_nuggets',
    label: 'Chicken Tenders / Nuggets',
    primaryHome: { tab: 'dish', bucket: 'chicken' },
    defaultMacro: { kcal: 400, protein: 30, fat: 20, carbs: 22 },
    referenceDescription: '4 tenders / 8 nuggets (Chick-fil-A basis)',
    amount: {
      unit: 'piece',
      default: 4,
      chips: [
        { label: '4', value: 4 },
        { label: '6', value: 6 },
        { label: '8', value: 8 },
        { label: '12', value: 12 },
      ],
    },
    searchTags: ['chicken tenders', 'nuggets', 'chicken strips', 'mcnuggets', 'chick fil a', 'raising canes'],
  },
  {
    id: 'us_wings',
    label: 'Chicken Wings',
    primaryHome: { tab: 'dish', bucket: 'chicken' },
    defaultMacro: { kcal: 500, protein: 40, fat: 35, carbs: 6 },
    referenceDescription: '6 wings (Buffalo Wild Wings basis)',
    amount: {
      unit: 'piece',
      default: 6,
      chips: [
        { label: '6', value: 6 },
        { label: '10', value: 10 },
        { label: '15', value: 15 },
      ],
    },
    attributes: [
      { key: 'buffalo', label: 'Buffalo', isDefault: true },
      { key: 'bbq', label: 'BBQ', factor: { kcal: 1.12, protein: 1.0, fat: 0.97, carbs: 2.17 } },
      { key: 'plain', label: 'Plain / Dry Rub', factor: { kcal: 0.90, protein: 1.0, fat: 0.94, carbs: 0.33 } },
    ],
    defaultAddonIds: ['us_ranch', 'us_blue_cheese'],
    allowedAddonIds: ['us_ranch', 'us_blue_cheese', 'us_buffalo_sauce'],
    searchTags: ['wings', 'chicken wings', 'buffalo wings', 'bww', 'wingstop'],
  },
  {
    id: 'us_rotisserie_grilled',
    label: 'Rotisserie / Grilled Chicken',
    primaryHome: { tab: 'dish', bucket: 'chicken' },
    defaultMacro: { kcal: 350, protein: 40, fat: 20, carbs: 2 },
    referenceDescription: '¼ rotisserie chicken',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '½ portion', value: 50 }, { label: '¼ bird', value: 100 }, { label: '½ bird', value: 200 }],
    },
    searchTags: ['rotisserie chicken', 'grilled chicken', 'costco chicken', 'whole chicken'],
  },
  {
    id: 'us_chicken_and_waffles',
    label: 'Chicken & Waffles',
    primaryHome: { tab: 'dish', bucket: 'chicken' },
    defaultMacro: { kcal: 800, protein: 35, fat: 38, carbs: 80 },
    referenceDescription: '1 plate (fried chicken + waffle + syrup)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    searchTags: ['chicken and waffles', 'chicken waffles'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 4: Mexican & Tex-Mex  `mexican` — 7 Identities  (quickTapDisabled)
// ---------------------------------------------------------------------------

const BUCKET_MEXICAN: Identity[] = [
  {
    id: 'us_burrito',
    label: 'Burrito',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 1000, protein: 45, fat: 38, carbs: 110 },
    referenceDescription: '1 burrito (Chipotle chicken burrito basis)',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }] },
    attributes: [
      { key: 'chicken', label: 'Chicken', isDefault: true },
      { key: 'beef', label: 'Beef / Steak', factor: { kcal: 1.05, protein: 1.07, fat: 1.13, carbs: 1.0 } },
      { key: 'carnitas', label: 'Carnitas / Pork', factor: { kcal: 1.03, protein: 1.04, fat: 1.08, carbs: 1.0 } },
      { key: 'veggie', label: 'Veggie', factor: { kcal: 0.75, protein: 0.64, fat: 0.63, carbs: 0.95 } },
    ],
    defaultAddonIds: ['us_guacamole', 'us_sour_cream', 'us_salsa'],
    allowedAddonIds: ['us_guacamole', 'us_sour_cream', 'us_salsa', 'us_queso', 'us_extra_cheese'],
    searchTags: ['burrito', 'chipotle', 'qdoba', 'mission burrito'],
  },
  {
    id: 'us_tacos',
    label: 'Tacos',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 510, protein: 24, fat: 30, carbs: 36 },
    referenceDescription: '3 tacos (Taco Bell / street taco basis)',
    amount: {
      unit: 'piece',
      default: 3,
      chips: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    attributes: [
      { key: 'crunchy', label: 'Crunchy / Hard Shell', isDefault: true },
      { key: 'street', label: 'Street / Soft', factor: { kcal: 0.92, protein: 1.0, fat: 0.87, carbs: 0.97 } },
    ],
    searchTags: ['tacos', 'taco bell', 'street tacos', 'fish tacos'],
  },
  {
    id: 'us_quesadilla',
    label: 'Quesadilla',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 600, protein: 28, fat: 33, carbs: 46 },
    referenceDescription: '1 quesadilla (large / restaurant)',
    amount: { unit: 'piece', default: 1, chips: [{ label: 'Half', value: 1 }, { label: 'Whole', value: 2 }] },
    defaultAddonIds: ['us_sour_cream', 'us_salsa'],
    allowedAddonIds: ['us_sour_cream', 'us_salsa', 'us_guacamole'],
    searchTags: ['quesadilla', 'cheese quesadilla', 'chicken quesadilla'],
  },
  {
    id: 'us_nachos',
    label: 'Nachos',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 720, protein: 26, fat: 42, carbs: 58 },
    referenceDescription: '1 plate (loaded nachos)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: 'Full', value: 100 }],
    },
    defaultAddonIds: ['us_sour_cream', 'us_guacamole', 'us_salsa'],
    allowedAddonIds: ['us_sour_cream', 'us_guacamole', 'us_salsa', 'us_queso'],
    searchTags: ['nachos', 'loaded nachos', 'tortilla chips'],
  },
  {
    id: 'us_burrito_bowl',
    label: 'Burrito Bowl',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 700, protein: 40, fat: 25, carbs: 75 },
    referenceDescription: '1 bowl (Chipotle chicken bowl basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 bowl', value: 100 }],
    },
    defaultAddonIds: ['us_guacamole', 'us_sour_cream', 'us_salsa'],
    allowedAddonIds: ['us_guacamole', 'us_sour_cream', 'us_salsa', 'us_queso', 'us_extra_cheese'],
    searchTags: ['burrito bowl', 'chipotle bowl', 'rice bowl', 'mexican bowl'],
  },
  {
    id: 'us_enchiladas',
    label: 'Enchiladas',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 600, protein: 26, fat: 32, carbs: 50 },
    referenceDescription: '2 enchiladas with sauce + cheese',
    amount: {
      unit: 'piece',
      default: 2,
      chips: [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }],
    },
    searchTags: ['enchiladas', 'chicken enchiladas', 'beef enchiladas'],
  },
  {
    id: 'us_fajitas',
    label: 'Fajitas',
    primaryHome: { tab: 'dish', bucket: 'mexican' },
    defaultMacro: { kcal: 650, protein: 40, fat: 30, carbs: 50 },
    referenceDescription: '1 plate (chicken fajitas + tortillas)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    searchTags: ['fajitas', 'chicken fajitas', 'steak fajitas', 'sizzling fajitas'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 5: American Plates  `american_plate` — 7 Identities  (quickTapDisabled)
// ---------------------------------------------------------------------------

const BUCKET_AMERICAN_PLATE: Identity[] = [
  {
    id: 'us_steak_potato',
    label: 'Steak & Potato',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 750, protein: 50, fat: 38, carbs: 50 },
    referenceDescription: '8 oz sirloin + baked potato',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Small', value: 75 }, { label: 'Regular', value: 100 }, { label: 'Large', value: 150 }],
    },
    searchTags: ['steak', 'steak and potato', 'sirloin', 'ribeye', 'filet', 'baked potato'],
  },
  {
    id: 'us_meatloaf_mash',
    label: 'Meatloaf & Mashed Potatoes',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 700, protein: 35, fat: 38, carbs: 52 },
    referenceDescription: '1 plate (meatloaf + mashed potatoes)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    searchTags: ['meatloaf', 'mashed potatoes', 'comfort food', 'american dinner'],
  },
  {
    id: 'us_bbq_plate',
    label: 'BBQ Plate',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 850, protein: 45, fat: 45, carbs: 62 },
    referenceDescription: '1 plate (protein + 2 sides)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'pulled_pork', label: 'Pulled Pork', isDefault: true },
      { key: 'ribs', label: 'Ribs', factor: { kcal: 1.12, protein: 1.07, fat: 1.22, carbs: 0.97 } },
      { key: 'brisket', label: 'Brisket', factor: { kcal: 1.06, protein: 1.16, fat: 1.11, carbs: 0.95 } },
    ],
    searchTags: ['bbq', 'barbecue', 'pulled pork', 'ribs', 'brisket', 'smoked meat'],
  },
  {
    id: 'us_roast_plate',
    label: 'Roast Dinner',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 650, protein: 45, fat: 30, carbs: 45 },
    referenceDescription: '1 plate (roast + sides)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'turkey', label: 'Turkey', isDefault: true },
      { key: 'ham', label: 'Ham', factor: { kcal: 1.0, protein: 1.0, fat: 1.0, carbs: 1.0 } },
      { key: 'pot_roast', label: 'Pot Roast', factor: { kcal: 1.08, protein: 1.04, fat: 1.17, carbs: 1.0 } },
    ],
    searchTags: ['roast', 'turkey dinner', 'ham dinner', 'pot roast', 'sunday roast'],
  },
  {
    id: 'us_pot_pie',
    label: 'Chicken Pot Pie',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 550, protein: 20, fat: 33, carbs: 42 },
    referenceDescription: '1 individual pot pie',
    amount: { unit: 'piece', default: 1 },
    searchTags: ['pot pie', 'chicken pot pie', 'marie callender'],
  },
  {
    id: 'us_casserole',
    label: 'Casserole',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 600, protein: 28, fat: 32, carbs: 48 },
    referenceDescription: '1 serving (green bean / tuna / hotdish)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 serving', value: 100 }, { label: 'Extra', value: 150 }],
    },
    searchTags: ['casserole', 'hotdish', 'tuna casserole', 'green bean casserole'],
  },
  {
    id: 'us_seafood_plate',
    label: 'Seafood Plate',
    primaryHome: { tab: 'dish', bucket: 'american_plate' },
    defaultMacro: { kcal: 650, protein: 30, fat: 35, carbs: 55 },
    referenceDescription: '1 plate (fish & chips basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'fried', label: 'Fried (Fish & Chips)', isDefault: true },
      { key: 'grilled', label: 'Grilled (Salmon)', factor: { kcal: 0.69, protein: 1.13, fat: 0.57, carbs: 0.36 } },
    ],
    searchTags: ['fish and chips', 'seafood', 'fried shrimp', 'salmon', 'cod', 'halibut'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 6: Soups, Stews & Chili  `soup_stew` — 4 Identities
// ---------------------------------------------------------------------------

const BUCKET_SOUP_STEW: Identity[] = [
  {
    id: 'us_chili',
    label: 'Chili',
    primaryHome: { tab: 'dish', bucket: 'soup_stew' },
    defaultMacro: { kcal: 350, protein: 25, fat: 15, carbs: 30 },
    referenceDescription: '1 bowl (~300 ml)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Cup', value: 60 }, { label: 'Bowl', value: 100 }, { label: 'Large', value: 150 }],
    },
    attributes: [
      { key: 'con_carne', label: 'Beef Chili', isDefault: true },
      { key: 'turkey', label: 'Turkey Chili', factor: { kcal: 0.94, protein: 1.08, fat: 0.80, carbs: 1.03 } },
      { key: 'veggie', label: 'Veggie Chili', factor: { kcal: 0.74, protein: 0.72, fat: 0.47, carbs: 1.0 } },
    ],
    defaultAddonIds: ['us_sour_cream', 'us_extra_cheese'],
    allowedAddonIds: ['us_sour_cream', 'us_extra_cheese', 'us_crackers'],
    searchTags: ['chili', 'beef chili', 'chili con carne', 'wendy chili'],
  },
  {
    id: 'us_soup_light',
    label: 'Soup — Light',
    primaryHome: { tab: 'dish', bucket: 'soup_stew' },
    defaultMacro: { kcal: 160, protein: 8, fat: 5, carbs: 20 },
    referenceDescription: '1 bowl (chicken noodle / vegetable / tomato)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Cup', value: 60 }, { label: 'Bowl', value: 100 }],
    },
    attributes: [
      { key: 'chicken_noodle', label: 'Chicken Noodle', isDefault: true },
      { key: 'vegetable', label: 'Vegetable', factor: { kcal: 0.75, protein: 0.63, fat: 0.60, carbs: 0.80 } },
      { key: 'tomato', label: 'Tomato', factor: { kcal: 0.94, protein: 0.75, fat: 1.20, carbs: 0.90 } },
    ],
    searchTags: ['soup', 'chicken noodle soup', 'vegetable soup', 'tomato soup', 'campbell'],
  },
  {
    id: 'us_soup_creamy',
    label: 'Soup — Creamy',
    primaryHome: { tab: 'dish', bucket: 'soup_stew' },
    defaultMacro: { kcal: 350, protein: 10, fat: 22, carbs: 28 },
    referenceDescription: '1 bowl (clam chowder / broccoli cheddar)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Cup', value: 60 }, { label: 'Bowl', value: 100 }],
    },
    attributes: [
      { key: 'clam_chowder', label: 'Clam Chowder', isDefault: true },
      { key: 'broccoli_cheddar', label: 'Broccoli Cheddar', factor: { kcal: 1.0, protein: 1.2, fat: 1.0, carbs: 0.93 } },
      { key: 'cream_of_x', label: 'Cream of Mushroom', factor: { kcal: 0.83, protein: 0.90, fat: 0.91, carbs: 0.75 } },
    ],
    searchTags: ['soup', 'clam chowder', 'broccoli cheddar', 'cream soup', 'panera soup'],
  },
  {
    id: 'us_stew_gumbo',
    label: 'Stew / Gumbo',
    primaryHome: { tab: 'dish', bucket: 'soup_stew' },
    defaultMacro: { kcal: 400, protein: 25, fat: 18, carbs: 35 },
    referenceDescription: '1 bowl (beef stew / gumbo / jambalaya)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Bowl', value: 100 }],
    },
    attributes: [
      { key: 'beef_stew', label: 'Beef Stew', isDefault: true },
      { key: 'gumbo', label: 'Gumbo', factor: { kcal: 0.93, protein: 1.0, fat: 0.89, carbs: 0.89 } },
      { key: 'jambalaya', label: 'Jambalaya', factor: { kcal: 0.95, protein: 1.0, fat: 0.78, carbs: 1.06 } },
    ],
    searchTags: ['stew', 'beef stew', 'gumbo', 'jambalaya', 'brunswick stew'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 7: Bowls & Salads  `bowl_salad` — 4 Identities
// ---------------------------------------------------------------------------

const BUCKET_BOWL_SALAD: Identity[] = [
  {
    id: 'us_entree_salad',
    label: 'Entrée Salad',
    primaryHome: { tab: 'dish', bucket: 'bowl_salad' },
    defaultMacro: { kcal: 500, protein: 30, fat: 32, carbs: 24 },
    referenceDescription: '1 full salad with dressing (Cobb / Caesar / Greek)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Half', value: 50 }, { label: 'Full', value: 100 }],
    },
    attributes: [
      { key: 'cobb', label: 'Cobb', isDefault: true },
      { key: 'caesar', label: 'Caesar', factor: { kcal: 0.82, protein: 0.90, fat: 0.91, carbs: 0.50 } },
      { key: 'greek', label: 'Greek', factor: { kcal: 0.76, protein: 0.67, fat: 0.78, carbs: 0.88 } },
    ],
    defaultAddonIds: ['us_ranch', 'us_croutons'],
    allowedAddonIds: ['us_ranch', 'us_croutons', 'us_extra_cheese', 'us_avocado_slice'],
    searchTags: ['salad', 'cobb salad', 'caesar salad', 'greek salad', 'chopped salad'],
  },
  {
    id: 'us_grain_bowl',
    label: 'Grain Bowl',
    primaryHome: { tab: 'dish', bucket: 'bowl_salad' },
    defaultMacro: { kcal: 600, protein: 25, fat: 25, carbs: 68 },
    referenceDescription: '1 bowl (quinoa / farro / Buddha bowl)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 bowl', value: 100 }],
    },
    searchTags: ['grain bowl', 'quinoa bowl', 'buddha bowl', 'power bowl', 'sweetgreen'],
  },
  {
    id: 'us_poke_bowl',
    label: 'Poké Bowl',
    primaryHome: { tab: 'dish', bucket: 'bowl_salad' },
    defaultMacro: { kcal: 600, protein: 35, fat: 18, carbs: 75 },
    referenceDescription: '1 regular bowl (rice + protein + toppings)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: 'Mini', value: 70 }, { label: 'Regular', value: 100 }, { label: 'Large', value: 140 }],
    },
    searchTags: ['poke', 'poke bowl', 'hawaiian bowl', 'ahi tuna'],
  },
  {
    id: 'us_protein_salad',
    label: 'Protein Salad',
    primaryHome: { tab: 'dish', bucket: 'bowl_salad' },
    defaultMacro: { kcal: 400, protein: 30, fat: 24, carbs: 16 },
    referenceDescription: '1 plate (chicken / tuna / egg salad over greens)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'chicken', label: 'Grilled Chicken', isDefault: true },
      { key: 'tuna', label: 'Tuna', factor: { kcal: 0.90, protein: 1.0, fat: 0.75, carbs: 1.0 } },
      { key: 'egg', label: 'Hard Boiled Egg', factor: { kcal: 0.80, protein: 0.87, fat: 0.92, carbs: 0.81 } },
    ],
    searchTags: ['protein salad', 'chicken salad', 'tuna salad', 'egg salad'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 8: Asian Takeout  `asian_takeout` — 7 Identities  (quickTapDisabled)
// ---------------------------------------------------------------------------

const BUCKET_ASIAN_TAKEOUT: Identity[] = [
  {
    id: 'us_chinese_combo',
    label: 'Chinese Combo Plate',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 890, protein: 26, fat: 40, carbs: 107 },
    referenceDescription: '1 combo (Orange Chicken + Fried Rice, Panda Express basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'orange_chicken', label: 'Orange Chicken', isDefault: true },
      { key: 'general_tso', label: 'General Tso\'s', factor: { kcal: 1.0, protein: 1.0, fat: 1.0, carbs: 1.0 } },
      { key: 'kung_pao', label: 'Kung Pao', factor: { kcal: 0.96, protein: 1.12, fat: 1.05, carbs: 0.91 } },
    ],
    searchTags: ['chinese food', 'chinese takeout', 'panda express', 'orange chicken', 'general tso'],
  },
  {
    id: 'us_lo_mein_fried_rice',
    label: 'Lo Mein / Fried Rice',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 650, protein: 18, fat: 22, carbs: 95 },
    referenceDescription: '1 plate (Panda Express chow mein / fried rice basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'lo_mein', label: 'Lo Mein / Chow Mein', isDefault: true },
      { key: 'fried_rice', label: 'Fried Rice', factor: { kcal: 1.0, protein: 1.0, fat: 0.95, carbs: 1.0 } },
    ],
    searchTags: ['lo mein', 'chow mein', 'fried rice', 'noodles', 'chinese noodles'],
  },
  {
    id: 'us_teriyaki_bowl',
    label: 'Teriyaki Bowl',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 650, protein: 38, fat: 15, carbs: 90 },
    referenceDescription: '1 bowl (chicken/beef teriyaki + rice)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 bowl', value: 100 }],
    },
    attributes: [
      { key: 'chicken', label: 'Chicken', isDefault: true },
      { key: 'beef', label: 'Beef', factor: { kcal: 1.08, protein: 1.05, fat: 1.33, carbs: 1.0 } },
      { key: 'salmon', label: 'Salmon', factor: { kcal: 1.02, protein: 1.05, fat: 1.53, carbs: 1.0 } },
    ],
    searchTags: ['teriyaki', 'teriyaki bowl', 'chicken teriyaki', 'yoshinoya', 'japanese'],
  },
  {
    id: 'us_pad_thai',
    label: 'Pad Thai',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 750, protein: 28, fat: 25, carbs: 100 },
    referenceDescription: '1 plate (restaurant)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    searchTags: ['pad thai', 'thai food', 'thai noodles', 'thai restaurant'],
  },
  {
    id: 'us_sushi_roll',
    label: 'Sushi Roll',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 500, protein: 18, fat: 14, carbs: 78 },
    referenceDescription: '8 pieces / 1 roll (California / spicy tuna)',
    amount: {
      unit: 'slice',
      default: 8,
      chips: [
        { label: '1 roll (8)', value: 8 },
        { label: '1.5 rolls', value: 12 },
        { label: '2 rolls', value: 16 },
      ],
    },
    attributes: [
      { key: 'california', label: 'California Roll', isDefault: true },
      { key: 'spicy_tuna', label: 'Spicy Tuna', factor: { kcal: 1.0, protein: 1.28, fat: 1.0, carbs: 0.92 } },
      { key: 'dragon', label: 'Dragon / Specialty', factor: { kcal: 1.3, protein: 1.11, fat: 1.71, carbs: 1.28 } },
    ],
    searchTags: ['sushi', 'sushi roll', 'california roll', 'spicy tuna', 'maki'],
  },
  {
    id: 'us_ramen_pho',
    label: 'Ramen / Pho',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 550, protein: 28, fat: 18, carbs: 70 },
    referenceDescription: '1 bowl',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 bowl', value: 100 }],
    },
    attributes: [
      { key: 'ramen', label: 'Ramen', isDefault: true },
      { key: 'pho', label: 'Pho', factor: { kcal: 0.93, protein: 1.11, fat: 0.72, carbs: 0.96 } },
    ],
    searchTags: ['ramen', 'pho', 'noodle soup', 'broth', 'vietnamese', 'japanese noodles'],
  },
  {
    id: 'us_curry_asian',
    label: 'Asian Curry',
    primaryHome: { tab: 'dish', bucket: 'asian_takeout' },
    defaultMacro: { kcal: 650, protein: 25, fat: 28, carbs: 75 },
    referenceDescription: '1 plate (curry + rice)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'thai', label: 'Thai Green / Red', isDefault: true },
      { key: 'indian', label: 'Indian (Tikka Masala)', factor: { kcal: 0.92, protein: 1.08, fat: 0.86, carbs: 0.93 } },
    ],
    searchTags: ['curry', 'thai curry', 'indian curry', 'tikka masala', 'green curry', 'red curry'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 9: Breakfast  `breakfast` — 7 Identities  (quickTapDisabled)
// ---------------------------------------------------------------------------

const BUCKET_BREAKFAST: Identity[] = [
  {
    id: 'us_eggs_bacon',
    label: 'Eggs & Bacon',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 500, protein: 26, fat: 32, carbs: 28 },
    referenceDescription: '2 eggs + 3 strips bacon + toast',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 plate', value: 100 }],
    },
    attributes: [
      { key: 'bacon', label: 'With Bacon', isDefault: true },
      { key: 'sausage', label: 'With Sausage', factor: { kcal: 1.06, protein: 1.08, fat: 1.09, carbs: 0.96 } },
    ],
    defaultAddonIds: ['us_maple_syrup'],
    allowedAddonIds: ['us_maple_syrup', 'us_extra_cheese', 'us_butter_pat'],
    searchTags: ['eggs', 'bacon', 'eggs and bacon', 'breakfast plate', 'scrambled eggs'],
  },
  {
    id: 'us_pancakes_waffles',
    label: 'Pancakes / Waffles',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 600, protein: 14, fat: 22, carbs: 88 },
    referenceDescription: '3 pancakes + syrup (IHOP basis)',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '2 pcs', value: 70 }, { label: '3 pcs', value: 100 }, { label: '4 pcs', value: 133 }],
    },
    attributes: [
      { key: 'pancakes', label: 'Pancakes', isDefault: true },
      { key: 'waffles', label: 'Waffles', factor: { kcal: 1.03, protein: 1.07, fat: 1.05, carbs: 1.0 } },
      { key: 'french_toast', label: 'French Toast', factor: { kcal: 0.95, protein: 1.0, fat: 1.05, carbs: 0.88 } },
    ],
    defaultAddonIds: ['us_maple_syrup', 'us_butter_pat'],
    allowedAddonIds: ['us_maple_syrup', 'us_butter_pat', 'us_whipped_cream'],
    searchTags: ['pancakes', 'waffles', 'french toast', 'ihop', 'denny\'s', 'breakfast'],
  },
  {
    id: 'us_breakfast_sandwich',
    label: 'Breakfast Sandwich',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 470, protein: 21, fat: 30, carbs: 28 },
    referenceDescription: '1 sandwich (Sausage Egg McMuffin basis)',
    amount: { unit: 'piece', default: 1, chips: [{ label: '1', value: 1 }, { label: '2', value: 2 }] },
    attributes: [
      { key: 'biscuit', label: 'Biscuit', isDefault: true },
      { key: 'english_muffin', label: 'English Muffin', factor: { kcal: 0.90, protein: 1.0, fat: 0.90, carbs: 0.86 } },
      { key: 'bagel', label: 'Bagel', factor: { kcal: 1.17, protein: 1.14, fat: 1.07, carbs: 1.39 } },
    ],
    searchTags: ['breakfast sandwich', 'egg sandwich', 'mcmuffin', 'biscuit sandwich', 'egg muffin'],
  },
  {
    id: 'us_breakfast_burrito',
    label: 'Breakfast Burrito',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 600, protein: 24, fat: 32, carbs: 52 },
    referenceDescription: '1 loaded breakfast burrito',
    amount: { unit: 'piece', default: 1 },
    searchTags: ['breakfast burrito', 'egg burrito', 'morning burrito'],
  },
  {
    id: 'us_oatmeal',
    label: 'Oatmeal',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 300, protein: 10, fat: 8, carbs: 50 },
    referenceDescription: '1 bowl with toppings',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 bowl', value: 100 }],
    },
    defaultAddonIds: ['us_maple_syrup', 'us_berry_top', 'us_banana_slice'],
    allowedAddonIds: ['us_maple_syrup', 'us_berry_top', 'us_banana_slice', 'us_peanut_butter_packet'],
    searchTags: ['oatmeal', 'oats', 'porridge', 'overnight oats'],
    searchableFrom: ['bowl_salad'],
  },
  {
    id: 'us_avocado_toast',
    label: 'Avocado Toast',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 350, protein: 10, fat: 20, carbs: 34 },
    referenceDescription: '2 slices toast + ½ avocado',
    amount: { unit: 'piece', default: 2, chips: [{ label: '1 slice', value: 1 }, { label: '2 slices', value: 2 }] },
    searchTags: ['avocado toast', 'avo toast', 'avocado', 'toast'],
  },
  {
    id: 'us_biscuits_gravy',
    label: 'Biscuits & Gravy',
    primaryHome: { tab: 'dish', bucket: 'breakfast' },
    defaultMacro: { kcal: 600, protein: 14, fat: 38, carbs: 52 },
    referenceDescription: '2 biscuits + sausage gravy',
    amount: {
      unit: 'percent',
      default: 100,
      chips: [{ label: '1 biscuit', value: 50 }, { label: '2 biscuits', value: 100 }],
    },
    searchTags: ['biscuits and gravy', 'biscuits gravy', 'sausage gravy', 'southern breakfast'],
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const US_DISH_IDENTITIES: Identity[] = [
  ...BUCKET_BURGER_SANDWICH,
  ...BUCKET_PIZZA_PASTA,
  ...BUCKET_CHICKEN,
  ...BUCKET_MEXICAN,
  ...BUCKET_AMERICAN_PLATE,
  ...BUCKET_SOUP_STEW,
  ...BUCKET_BOWL_SALAD,
  ...BUCKET_ASIAN_TAKEOUT,
  ...BUCKET_BREAKFAST,
];

type USDishBucketKey =
  | 'burger_sandwich'
  | 'pizza_pasta'
  | 'chicken'
  | 'mexican'
  | 'american_plate'
  | 'soup_stew'
  | 'bowl_salad'
  | 'asian_takeout'
  | 'breakfast';

export const US_DISH_IDENTITIES_BY_BUCKET: Record<USDishBucketKey, Identity[]> = {
  burger_sandwich: BUCKET_BURGER_SANDWICH,
  pizza_pasta:     BUCKET_PIZZA_PASTA,
  chicken:         BUCKET_CHICKEN,
  mexican:         BUCKET_MEXICAN,
  american_plate:  BUCKET_AMERICAN_PLATE,
  soup_stew:       BUCKET_SOUP_STEW,
  bowl_salad:      BUCKET_BOWL_SALAD,
  asian_takeout:   BUCKET_ASIAN_TAKEOUT,
  breakfast:       BUCKET_BREAKFAST,
};
