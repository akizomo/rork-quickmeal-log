/**
 * US-locale Ingredient-tab Identity definitions.
 *
 * Spec: docs/US-food-db-design.md §4
 *
 * Same 9 bucket keys as JP (PFC axis is universal); content differs.
 * All IDs carry `us_` prefix to avoid collision with JP identity IDs.
 * Macros are USDA per-serving unless noted.
 *
 * `asAddon` entries are referenced in us-addons.ts US_IDENTITY_ADDON_REFS.
 */

import { Identity } from '@/types/identity';

// ---------------------------------------------------------------------------
// Bucket 1: Grains & Bread (staple)
// ---------------------------------------------------------------------------

const BUCKET_STAPLE: Identity[] = [
  {
    id: 'us_bread',
    label: 'Bread',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 160, protein: 5, fat: 2, carbs: 30 },
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1 slice', value: 1 },
        { label: '2 slices', value: 2 },
        { label: '4 slices', value: 4 },
      ],
    },
    attributes: [
      { key: 'white', label: 'White', isDefault: true },
      { key: 'whole_wheat', label: 'Whole Wheat', factor: { kcal: 1.0, protein: 1.2, carbs: 0.95 } },
      { key: 'sourdough', label: 'Sourdough', factor: { kcal: 1.05 } },
      { key: 'rye', label: 'Rye', factor: { kcal: 0.95, protein: 1.1 } },
    ],
    searchTags: ['bread', 'toast', 'slice', 'sandwich bread', 'white bread', 'wheat bread', 'sourdough'],
  },
  {
    id: 'us_rice_cup',
    label: 'Cooked Rice',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 206, protein: 4, fat: 0.4, carbs: 45 },
    amount: {
      unit: 'g',
      default: 186,
      step: 30,
      chips: [
        { label: '½ cup', value: 93 },
        { label: '1 cup', value: 186 },
        { label: '1½ cup', value: 279 },
      ],
    },
    attributes: [
      { key: 'white', label: 'White', isDefault: true },
      { key: 'brown', label: 'Brown', factor: { kcal: 1.04, protein: 1.1, fat: 2.5, carbs: 0.98 } },
    ],
    searchTags: ['rice', 'cooked rice', 'white rice', 'brown rice', 'steamed rice'],
  },
  {
    id: 'us_pasta_plain',
    label: 'Cooked Pasta',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 220, protein: 8, fat: 1, carbs: 43 },
    amount: {
      unit: 'g',
      default: 140,
      step: 30,
      chips: [
        { label: '1 cup', value: 140 },
        { label: '1½ cup', value: 210 },
        { label: '2 cups', value: 280 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'whole_grain', label: 'Whole Grain', factor: { kcal: 1.0, protein: 1.15, fat: 1.5, carbs: 0.92 } },
    ],
    searchTags: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'noodles', 'cooked pasta'],
  },
  {
    id: 'us_potato',
    label: 'Potato',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 161, protein: 4, fat: 0.2, carbs: 37 },
    amount: {
      unit: 'g',
      default: 173,
      step: 30,
      chips: [
        { label: 'Small', value: 130 },
        { label: 'Medium', value: 173 },
        { label: 'Large', value: 299 },
      ],
    },
    attributes: [
      { key: 'baked', label: 'Baked', isDefault: true },
      { key: 'mashed', label: 'Mashed', factor: { kcal: 1.2, fat: 4.0, carbs: 0.95 } },
      { key: 'fries', label: 'Fries', factor: { kcal: 1.5, fat: 8.0, carbs: 1.1 } },
    ],
    searchTags: ['potato', 'baked potato', 'mashed potato', 'sweet potato', 'fries'],
  },
  {
    id: 'us_oatmeal',
    label: 'Oatmeal',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 150, protein: 5, fat: 3, carbs: 27 },
    amount: {
      unit: 'g',
      default: 234,
      step: 30,
      chips: [
        { label: '1 cup cooked', value: 234 },
        { label: '1½ cup', value: 351 },
      ],
    },
    attributes: [
      { key: 'plain', label: 'Plain', isDefault: true },
      { key: 'overnight', label: 'Overnight oats', factor: { kcal: 1.0, fat: 1.5 } },
    ],
    defaultAddonIds: ['us_berry_top', 'us_banana_slice', 'us_maple_syrup', 'us_honey'],
    allowedAddonIds: ['us_berry_top', 'us_banana_slice', 'us_maple_syrup', 'us_honey',
      'us_peanut_butter_packet', 'us_whipped_cream', 'us_jam'],
    searchTags: ['oatmeal', 'oats', 'porridge', 'overnight oats', 'rolled oats'],
  },
  {
    id: 'us_tortilla',
    label: 'Tortilla',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 146, protein: 4, fat: 3, carbs: 26 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
      ],
    },
    attributes: [
      { key: 'flour', label: 'Flour', isDefault: true },
      { key: 'corn', label: 'Corn', factor: { kcal: 0.7, protein: 0.8, fat: 0.5, carbs: 0.75 } },
      { key: 'whole_wheat', label: 'Whole Wheat', factor: { kcal: 0.95, protein: 1.1 } },
    ],
    searchTags: ['tortilla', 'flour tortilla', 'corn tortilla', 'wrap'],
  },
  {
    id: 'us_bagel',
    label: 'Bagel',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 270, protein: 10, fat: 1.5, carbs: 53 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '½ bagel', value: 0.5 },
        { label: '1', value: 1 },
      ],
    },
    attributes: [
      { key: 'plain', label: 'Plain', isDefault: true },
      { key: 'everything', label: 'Everything', factor: { kcal: 1.05 } },
      { key: 'whole_grain', label: 'Whole Grain', factor: { kcal: 0.95, protein: 1.1 } },
    ],
    defaultAddonIds: ['us_cream_cheese'],
    allowedAddonIds: ['us_cream_cheese', 'us_butter_pat', 'us_jam', 'us_peanut_butter_packet'],
    searchTags: ['bagel', 'everything bagel', 'plain bagel'],
  },
  {
    id: 'us_cereal',
    label: 'Cereal',
    primaryHome: { tab: 'ingredient', bucket: 'staple' },
    defaultMacro: { kcal: 200, protein: 5, fat: 2, carbs: 43 },
    amount: {
      unit: 'g',
      default: 55,
      step: 15,
      chips: [
        { label: '1 cup', value: 55 },
        { label: '1½ cup', value: 82 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'granola', label: 'Granola', factor: { kcal: 1.8, fat: 3.0, carbs: 1.2 } },
      { key: 'high_fiber', label: 'High-fiber', factor: { kcal: 0.8, carbs: 0.7 } },
    ],
    searchTags: ['cereal', 'cornflakes', 'granola', 'muesli', 'breakfast cereal'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 2: Lean Meat & Fish (lean_protein)
// ---------------------------------------------------------------------------

const BUCKET_LEAN_PROTEIN: Identity[] = [
  {
    id: 'us_chicken_breast',
    label: 'Chicken Breast',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'grilled', label: 'Grilled / Baked', isDefault: true },
      { key: 'fried', label: 'Breaded & Fried', factor: { kcal: 1.7, protein: 0.8, fat: 5.0, carbs: 15 } },
    ],
    asAddon: { unit: 'g', unitAmount: 85, addedMacro: { kcal: 140, protein: 26, fat: 3, carbs: 0 }, defaultLabel: 'Grilled Chicken' },
    searchTags: ['chicken breast', 'grilled chicken', 'chicken', 'lean chicken'],
  },
  {
    id: 'us_turkey_breast',
    label: 'Turkey Breast',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 135, protein: 30, fat: 1.5, carbs: 0 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'roasted', label: 'Roasted', isDefault: true },
      { key: 'deli', label: 'Deli-sliced', factor: { kcal: 0.85, protein: 0.95, fat: 0.8 } },
    ],
    searchTags: ['turkey', 'turkey breast', 'roast turkey', 'deli turkey'],
  },
  {
    id: 'us_white_fish',
    label: 'White Fish',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 105, protein: 23, fat: 1, carbs: 0 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'cod', label: 'Cod', isDefault: true },
      { key: 'tilapia', label: 'Tilapia', factor: { kcal: 1.0, protein: 1.0 } },
      { key: 'fried', label: 'Fried', factor: { kcal: 2.0, fat: 8.0, carbs: 10 } },
    ],
    searchTags: ['white fish', 'cod', 'tilapia', 'fish fillet', 'baked fish'],
  },
  {
    id: 'us_shrimp',
    label: 'Shrimp',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 99, protein: 24, fat: 0.3, carbs: 0.2 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'steamed', label: 'Steamed / Grilled', isDefault: true },
      { key: 'fried', label: 'Fried / Breaded', factor: { kcal: 1.8, fat: 6.0, carbs: 8 } },
    ],
    searchTags: ['shrimp', 'prawn', 'grilled shrimp', 'fried shrimp'],
  },
  {
    id: 'us_canned_tuna',
    label: 'Canned Tuna',
    primaryHome: { tab: 'ingredient', bucket: 'lean_protein' },
    defaultMacro: { kcal: 109, protein: 25, fat: 1, carbs: 0 },
    amount: {
      unit: 'g',
      default: 113,
      chips: [
        { label: '3 oz (½ can)', value: 85 },
        { label: '4 oz (1 can)', value: 113 },
      ],
    },
    attributes: [
      { key: 'in_water', label: 'In Water', isDefault: true },
      { key: 'in_oil', label: 'In Oil', factor: { kcal: 1.6, fat: 5.0 } },
    ],
    searchTags: ['tuna', 'canned tuna', 'tuna fish', 'albacore'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 3: Eggs (egg)
// ---------------------------------------------------------------------------

const BUCKET_EGG: Identity[] = [
  {
    id: 'us_egg',
    label: 'Egg',
    primaryHome: { tab: 'ingredient', bucket: 'egg' },
    defaultMacro: { kcal: 72, protein: 6, fat: 5, carbs: 0.4 },
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    attributes: [
      { key: 'scrambled', label: 'Scrambled', isDefault: true },
      { key: 'fried', label: 'Fried', factor: { kcal: 1.25, fat: 1.8 } },
      { key: 'boiled', label: 'Hard-boiled', factor: { kcal: 0.97, fat: 0.95 } },
      { key: 'poached', label: 'Poached', factor: { kcal: 1.0, fat: 1.0 } },
    ],
    asAddon: { unit: 'piece', unitAmount: 1, addedMacro: { kcal: 90, protein: 6, fat: 7, carbs: 1 }, defaultLabel: 'Egg' },
    searchTags: ['egg', 'eggs', 'scrambled egg', 'fried egg', 'hard boiled', 'poached egg'],
  },
  {
    id: 'us_egg_whites',
    label: 'Egg Whites',
    primaryHome: { tab: 'ingredient', bucket: 'egg' },
    defaultMacro: { kcal: 52, protein: 11, fat: 0.2, carbs: 0.7 },
    amount: {
      unit: 'g',
      default: 120,
      chips: [
        { label: '3 whites (~¼c liquid)', value: 99 },
        { label: '4 whites', value: 132 },
      ],
    },
    attributes: [
      { key: 'liquid', label: 'Liquid / Carton', isDefault: true },
      { key: 'fresh', label: 'Fresh separated', factor: { kcal: 1.0 } },
    ],
    searchTags: ['egg whites', 'egg white', 'liquid eggs', 'whites only'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 4: Fatty Meat & Fish (fatty_protein)
// ---------------------------------------------------------------------------

const BUCKET_FATTY_PROTEIN: Identity[] = [
  {
    id: 'us_ground_beef',
    label: 'Ground Beef',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 250, protein: 22, fat: 17, carbs: 0 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'regular', label: '80/20', isDefault: true },
      { key: 'lean', label: '90/10', factor: { kcal: 0.75, fat: 0.5 } },
      { key: 'extra_lean', label: '95/5', factor: { kcal: 0.62, fat: 0.25 } },
    ],
    searchTags: ['ground beef', 'beef', 'hamburger meat', 'mince'],
  },
  {
    id: 'us_steak',
    label: 'Steak',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 271, protein: 26, fat: 18, carbs: 0 },
    amount: {
      unit: 'g',
      default: 170,
      step: 30,
      chips: [
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
        { label: '8 oz', value: 227 },
      ],
    },
    attributes: [
      { key: 'ribeye', label: 'Ribeye', isDefault: true },
      { key: 'sirloin', label: 'Sirloin', factor: { kcal: 0.85, fat: 0.65 } },
      { key: 'filet', label: 'Filet Mignon', factor: { kcal: 0.75, fat: 0.5 } },
    ],
    searchTags: ['steak', 'ribeye', 'sirloin', 'filet', 'beef steak'],
  },
  {
    id: 'us_pork_chop',
    label: 'Pork',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 242, protein: 27, fat: 14, carbs: 0 },
    amount: {
      unit: 'g',
      default: 150,
      step: 25,
      chips: [
        { label: '4 oz', value: 113 },
        { label: '5 oz', value: 142 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'chop', label: 'Pork Chop', isDefault: true },
      { key: 'tenderloin', label: 'Tenderloin', factor: { kcal: 0.7, fat: 0.45 } },
      { key: 'ribs', label: 'Ribs', factor: { kcal: 1.4, fat: 2.0 } },
    ],
    searchTags: ['pork', 'pork chop', 'pork tenderloin', 'ribs', 'pulled pork'],
  },
  {
    id: 'us_bacon_strip',
    label: 'Bacon',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 148, protein: 10, fat: 11.5, carbs: 0.4 },
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1 strip', value: 1 },
        { label: '2 strips', value: 2 },
        { label: '3 strips', value: 3 },
        { label: '4 strips', value: 4 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'turkey_bacon', label: 'Turkey Bacon', factor: { kcal: 0.75, fat: 0.5, protein: 0.85 } },
      { key: 'thick_cut', label: 'Thick-cut', factor: { kcal: 1.5, fat: 1.5, protein: 1.4 } },
    ],
    asAddon: { unit: 'piece', unitAmount: 2, addedMacro: { kcal: 90, protein: 6, fat: 7, carbs: 0 }, defaultLabel: 'Bacon' },
    searchTags: ['bacon', 'bacon strip', 'breakfast bacon', 'turkey bacon'],
  },
  {
    id: 'us_sausage',
    label: 'Sausage',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 290, protein: 17, fat: 24, carbs: 2 },
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1 link/patty', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
      ],
    },
    attributes: [
      { key: 'pork', label: 'Pork Sausage', isDefault: true },
      { key: 'italian', label: 'Italian Sausage', factor: { kcal: 1.0, protein: 1.0 } },
      { key: 'chicken', label: 'Chicken Sausage', factor: { kcal: 0.6, fat: 0.4 } },
    ],
    asAddon: { unit: 'piece', unitAmount: 1, addedMacro: { kcal: 145, protein: 8, fat: 12, carbs: 1 }, defaultLabel: 'Sausage Patty' },
    searchTags: ['sausage', 'pork sausage', 'italian sausage', 'breakfast sausage', 'sausage link'],
  },
  {
    id: 'us_salmon',
    label: 'Salmon',
    primaryHome: { tab: 'ingredient', bucket: 'fatty_protein' },
    defaultMacro: { kcal: 208, protein: 28, fat: 10, carbs: 0 },
    amount: {
      unit: 'g',
      default: 150,
      step: 25,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '4 oz', value: 113 },
        { label: '6 oz', value: 170 },
      ],
    },
    attributes: [
      { key: 'atlantic', label: 'Atlantic', isDefault: true },
      { key: 'wild', label: 'Wild-caught', factor: { kcal: 0.85, fat: 0.65 } },
      { key: 'smoked', label: 'Smoked (lox)', factor: { kcal: 0.6, fat: 0.5 } },
    ],
    searchTags: ['salmon', 'atlantic salmon', 'wild salmon', 'smoked salmon', 'lox'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 5: Dairy & Soy (dairy_soy)
// ---------------------------------------------------------------------------

const BUCKET_DAIRY_SOY: Identity[] = [
  {
    id: 'us_milk',
    label: 'Milk',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 122, protein: 8, fat: 4.8, carbs: 12 },
    amount: {
      unit: 'ml',
      default: 240,
      step: 60,
      chips: [
        { label: '8 fl oz', value: 240 },
        { label: '12 fl oz', value: 355 },
        { label: '16 fl oz', value: 480 },
      ],
    },
    attributes: [
      { key: 'whole', label: 'Whole', isDefault: true },
      { key: '2pct', label: '2%', factor: { kcal: 0.82, fat: 0.5 } },
      { key: 'skim', label: 'Skim', factor: { kcal: 0.68, fat: 0.1 } },
    ],
    searchTags: ['milk', 'whole milk', '2% milk', 'skim milk', 'dairy milk'],
  },
  {
    id: 'us_cheese_slice',
    label: 'Cheese',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 113, protein: 7, fat: 9, carbs: 0.4 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1 slice (1oz)', value: 1 },
        { label: '2 slices', value: 2 },
        { label: '¼ cup shredded', value: 0.7 },
      ],
    },
    attributes: [
      { key: 'cheddar', label: 'Cheddar', isDefault: true },
      { key: 'american', label: 'American', factor: { kcal: 0.95, fat: 0.95 } },
      { key: 'mozzarella', label: 'Mozzarella', factor: { kcal: 0.85, fat: 0.75 } },
      { key: 'swiss', label: 'Swiss', factor: { kcal: 1.05, protein: 1.1 } },
    ],
    asAddon: { unit: 'piece', unitAmount: 1, addedMacro: { kcal: 100, protein: 6, fat: 8, carbs: 1 }, defaultLabel: 'Cheese (1 slice)' },
    searchTags: ['cheese', 'cheddar', 'american cheese', 'mozzarella', 'swiss', 'shredded cheese'],
  },
  {
    id: 'us_greek_yogurt',
    label: 'Greek Yogurt',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 100, protein: 17, fat: 0.7, carbs: 6 },
    amount: {
      unit: 'g',
      default: 170,
      chips: [
        { label: '6 oz', value: 170 },
        { label: '8 oz', value: 227 },
      ],
    },
    attributes: [
      { key: 'nonfat', label: 'Nonfat', isDefault: true },
      { key: '2pct', label: '2%', factor: { kcal: 1.3, fat: 6.0 } },
      { key: 'whole', label: 'Whole Milk', factor: { kcal: 1.6, fat: 12.0 } },
    ],
    searchTags: ['greek yogurt', 'yogurt', 'nonfat greek yogurt', 'protein yogurt'],
  },
  {
    id: 'us_cottage_cheese',
    label: 'Cottage Cheese',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 206, protein: 25, fat: 9, carbs: 8 },
    amount: {
      unit: 'g',
      default: 226,
      chips: [
        { label: '½ cup', value: 113 },
        { label: '1 cup', value: 226 },
      ],
    },
    attributes: [
      { key: '4pct', label: '4% Milkfat', isDefault: true },
      { key: 'lowfat', label: 'Lowfat (2%)', factor: { kcal: 0.75, fat: 0.4 } },
    ],
    searchTags: ['cottage cheese', 'cottage', 'protein cottage cheese'],
  },
  {
    id: 'us_tofu_us',
    label: 'Tofu',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 76, protein: 8, fat: 4.3, carbs: 2 },
    amount: {
      unit: 'g',
      default: 140,
      step: 30,
      chips: [
        { label: '3 oz', value: 85 },
        { label: '5 oz', value: 140 },
        { label: '7 oz', value: 200 },
      ],
    },
    attributes: [
      { key: 'firm', label: 'Firm', isDefault: true },
      { key: 'silken', label: 'Silken', factor: { kcal: 0.7, protein: 0.75, fat: 0.6 } },
      { key: 'extra_firm', label: 'Extra Firm', factor: { kcal: 1.1, protein: 1.1, fat: 1.05 } },
    ],
    searchTags: ['tofu', 'firm tofu', 'silken tofu', 'soy'],
  },
  {
    id: 'us_plant_milk',
    label: 'Plant Milk',
    primaryHome: { tab: 'ingredient', bucket: 'dairy_soy' },
    defaultMacro: { kcal: 60, protein: 2, fat: 2.5, carbs: 8 },
    amount: {
      unit: 'ml',
      default: 240,
      step: 60,
      chips: [
        { label: '8 fl oz', value: 240 },
        { label: '12 fl oz', value: 355 },
      ],
    },
    attributes: [
      { key: 'oat', label: 'Oat Milk', isDefault: true },
      { key: 'almond', label: 'Almond Milk', factor: { kcal: 0.6, protein: 0.6, carbs: 0.5 } },
      { key: 'soy', label: 'Soy Milk', factor: { kcal: 1.35, protein: 3.5, fat: 1.6 } },
    ],
    searchTags: ['plant milk', 'oat milk', 'almond milk', 'soy milk', 'dairy-free milk'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 6: Vegetables (veggies)
// ---------------------------------------------------------------------------

const BUCKET_VEGGIES: Identity[] = [
  {
    id: 'us_salad_greens',
    label: 'Salad Greens',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 20, protein: 2, fat: 0.3, carbs: 3 },
    amount: {
      unit: 'g',
      default: 85,
      step: 20,
      chips: [
        { label: '2 cups', value: 60 },
        { label: '3 cups', value: 90 },
        { label: '4 cups', value: 120 },
      ],
    },
    attributes: [
      { key: 'mixed', label: 'Mixed Greens', isDefault: true },
      { key: 'romaine', label: 'Romaine', factor: { kcal: 1.0, protein: 1.0 } },
      { key: 'spinach', label: 'Spinach', factor: { kcal: 0.85, protein: 1.1 } },
    ],
    searchTags: ['salad greens', 'mixed greens', 'romaine', 'spinach', 'lettuce', 'spring mix'],
  },
  {
    id: 'us_broccoli',
    label: 'Broccoli',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 31, protein: 3, fat: 0.3, carbs: 6 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '1 cup', value: 91 },
        { label: '2 cups', value: 182 },
      ],
    },
    attributes: [
      { key: 'raw', label: 'Raw', isDefault: true },
      { key: 'steamed', label: 'Steamed', factor: { kcal: 1.0 } },
      { key: 'roasted', label: 'Roasted', factor: { kcal: 1.3, fat: 3.0 } },
    ],
    searchTags: ['broccoli', 'steamed broccoli', 'roasted broccoli'],
  },
  {
    id: 'us_beans_legumes',
    label: 'Beans / Legumes',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 225, protein: 15, fat: 1, carbs: 40 },
    amount: {
      unit: 'g',
      default: 172,
      chips: [
        { label: '½ cup', value: 86 },
        { label: '1 cup', value: 172 },
      ],
    },
    attributes: [
      { key: 'black_beans', label: 'Black Beans', isDefault: true },
      { key: 'chickpeas', label: 'Chickpeas', factor: { kcal: 1.13, protein: 0.97, fat: 2.5, carbs: 1.05 } },
      { key: 'lentils', label: 'Lentils', factor: { kcal: 1.0, protein: 1.1, carbs: 0.98 } },
      { key: 'pinto', label: 'Pinto Beans', factor: { kcal: 0.98, protein: 0.97 } },
    ],
    searchTags: ['beans', 'black beans', 'chickpeas', 'lentils', 'pinto beans', 'legumes'],
  },
  {
    id: 'us_corn',
    label: 'Corn',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 132, protein: 5, fat: 1.8, carbs: 29 },
    amount: {
      unit: 'g',
      default: 154,
      chips: [
        { label: '1 cup', value: 154 },
        { label: '1 ear', value: 90 },
      ],
    },
    attributes: [
      { key: 'cooked', label: 'Cooked', isDefault: true },
      { key: 'on_cob', label: 'On the Cob', factor: { kcal: 0.58, protein: 0.6, carbs: 0.58 } },
    ],
    searchTags: ['corn', 'sweet corn', 'corn on the cob', 'kernel corn'],
  },
  {
    id: 'us_mixed_veg',
    label: 'Mixed Vegetables',
    primaryHome: { tab: 'ingredient', bucket: 'veggies' },
    defaultMacro: { kcal: 59, protein: 4, fat: 0.2, carbs: 12 },
    amount: {
      unit: 'g',
      default: 182,
      chips: [
        { label: '1 cup', value: 182 },
        { label: '1½ cup', value: 273 },
      ],
    },
    attributes: [
      { key: 'frozen', label: 'Frozen Mixed', isDefault: true },
      { key: 'stir_fry', label: 'Stir-fry Blend', factor: { kcal: 1.0, fat: 1.5 } },
    ],
    searchTags: ['mixed vegetables', 'mixed veg', 'frozen vegetables', 'stir fry veg'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 7: Fruit (fruit)
// ---------------------------------------------------------------------------

const BUCKET_FRUIT: Identity[] = [
  {
    id: 'us_banana',
    label: 'Banana',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 105, protein: 1.3, fat: 0.4, carbs: 27 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '½', value: 0.5 },
        { label: '1 medium', value: 1 },
        { label: '1 large', value: 1.3 },
      ],
    },
    searchTags: ['banana', 'bananas'],
  },
  {
    id: 'us_apple',
    label: 'Apple',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 95, protein: 0.5, fat: 0.3, carbs: 25 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1 small', value: 0.7 },
        { label: '1 medium', value: 1 },
        { label: '1 large', value: 1.3 },
      ],
    },
    searchTags: ['apple', 'apples', 'fuji', 'gala', 'honeycrisp'],
  },
  {
    id: 'us_berries',
    label: 'Berries',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 50, protein: 0.7, fat: 0.3, carbs: 12 },
    amount: {
      unit: 'g',
      default: 100,
      step: 25,
      chips: [
        { label: '½ cup', value: 75 },
        { label: '1 cup', value: 150 },
      ],
    },
    attributes: [
      { key: 'mixed', label: 'Mixed Berries', isDefault: true },
      { key: 'strawberry', label: 'Strawberries', factor: { kcal: 0.64, carbs: 0.75 } },
      { key: 'blueberry', label: 'Blueberries', factor: { kcal: 1.14, carbs: 1.17 } },
    ],
    searchTags: ['berries', 'strawberry', 'blueberry', 'mixed berries', 'raspberries'],
  },
  {
    id: 'us_orange',
    label: 'Orange',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 62, protein: 1.2, fat: 0.2, carbs: 15 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1 small', value: 0.75 },
        { label: '1 medium', value: 1 },
        { label: '1 large', value: 1.3 },
      ],
    },
    searchTags: ['orange', 'clementine', 'mandarin', 'tangerine'],
  },
  {
    id: 'us_grapes',
    label: 'Grapes',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 62, protein: 0.6, fat: 0.2, carbs: 16 },
    amount: {
      unit: 'g',
      default: 92,
      step: 30,
      chips: [
        { label: '~15 grapes', value: 92 },
        { label: '~30 grapes', value: 184 },
      ],
    },
    searchTags: ['grapes', 'red grapes', 'green grapes'],
  },
  {
    id: 'us_melon',
    label: 'Melon',
    primaryHome: { tab: 'ingredient', bucket: 'fruit' },
    defaultMacro: { kcal: 46, protein: 1.1, fat: 0.2, carbs: 11 },
    amount: {
      unit: 'g',
      default: 160,
      step: 30,
      chips: [
        { label: '1 cup', value: 160 },
        { label: '2 cups', value: 320 },
      ],
    },
    attributes: [
      { key: 'watermelon', label: 'Watermelon', isDefault: true },
      { key: 'cantaloupe', label: 'Cantaloupe', factor: { kcal: 1.13, protein: 1.27, carbs: 1.0 } },
      { key: 'honeydew', label: 'Honeydew', factor: { kcal: 1.28, carbs: 1.27 } },
    ],
    searchTags: ['melon', 'watermelon', 'cantaloupe', 'honeydew'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 8: Fats & Sauces (added_fat)
// ---------------------------------------------------------------------------

const BUCKET_ADDED_FAT: Identity[] = [
  {
    id: 'us_butter',
    label: 'Butter',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 102, protein: 0.1, fat: 11.5, carbs: 0 },
    amount: {
      unit: 'g',
      default: 14,
      step: 7,
      chips: [
        { label: '1 tsp', value: 5 },
        { label: '1 tbsp', value: 14 },
        { label: '2 tbsp', value: 28 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'unsalted', label: 'Unsalted', factor: { kcal: 1.0 } },
      { key: 'kerrygold', label: 'Grass-fed', factor: { kcal: 1.0 } },
    ],
    asAddon: { unit: 'g', unitAmount: 14, addedMacro: { kcal: 100, protein: 0, fat: 11, carbs: 0 }, defaultLabel: 'Butter (1 tbsp)' },
    searchTags: ['butter', 'grass-fed butter', 'unsalted butter'],
  },
  {
    id: 'us_olive_oil',
    label: 'Olive Oil',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 119, protein: 0, fat: 13.5, carbs: 0 },
    amount: {
      unit: 'ml',
      default: 14,
      step: 7,
      chips: [
        { label: '1 tsp', value: 5 },
        { label: '1 tbsp', value: 14 },
        { label: '2 tbsp', value: 28 },
      ],
    },
    searchTags: ['olive oil', 'EVOO', 'extra virgin olive oil', 'oil'],
  },
  {
    id: 'us_mayo_tbsp',
    label: 'Mayo',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 94, protein: 0.1, fat: 10, carbs: 0.4 },
    amount: {
      unit: 'g',
      default: 14,
      step: 7,
      chips: [
        { label: '1 tbsp', value: 14 },
        { label: '2 tbsp', value: 28 },
        { label: '3 tbsp', value: 42 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'light', label: 'Light Mayo', factor: { kcal: 0.4, fat: 0.35 } },
    ],
    searchTags: ['mayo', 'mayonnaise', 'light mayo'],
  },
  {
    id: 'us_ranch_tbsp',
    label: 'Ranch Dressing',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 65, protein: 0.3, fat: 7, carbs: 1 },
    amount: {
      unit: 'ml',
      default: 15,
      step: 15,
      chips: [
        { label: '1 tbsp', value: 15 },
        { label: '2 tbsp', value: 30 },
        { label: '3 tbsp', value: 45 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'light', label: 'Light', factor: { kcal: 0.5, fat: 0.4 } },
    ],
    searchTags: ['ranch', 'ranch dressing', 'ranch dip', 'creamy dressing'],
  },
  {
    id: 'us_peanut_butter',
    label: 'Peanut Butter',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 190, protein: 7, fat: 16, carbs: 7 },
    amount: {
      unit: 'g',
      default: 32,
      step: 16,
      chips: [
        { label: '1 tbsp', value: 16 },
        { label: '2 tbsp', value: 32 },
        { label: '3 tbsp', value: 48 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'powdered', label: 'Powdered PB', factor: { kcal: 0.3, fat: 0.12, carbs: 0.8 } },
    ],
    searchTags: ['peanut butter', 'PB', 'natural peanut butter', 'almond butter'],
  },
  {
    id: 'us_nuts_mixed',
    label: 'Nuts',
    primaryHome: { tab: 'ingredient', bucket: 'added_fat' },
    defaultMacro: { kcal: 172, protein: 5, fat: 15, carbs: 6 },
    amount: {
      unit: 'g',
      default: 28,
      step: 14,
      chips: [
        { label: '1 oz', value: 28 },
        { label: '1.5 oz', value: 42 },
      ],
    },
    attributes: [
      { key: 'mixed', label: 'Mixed Nuts', isDefault: true },
      { key: 'almonds', label: 'Almonds', factor: { kcal: 1.0, protein: 1.2, fat: 1.0 } },
      { key: 'cashews', label: 'Cashews', factor: { kcal: 0.95, protein: 0.95, carbs: 1.5 } },
      { key: 'walnuts', label: 'Walnuts', factor: { kcal: 1.1, fat: 1.1, carbs: 0.65 } },
    ],
    asAddon: { unit: 'g', unitAmount: 28, addedMacro: { kcal: 90, protein: 3, fat: 8, carbs: 3 }, defaultLabel: 'Nuts (1 oz)' },
    searchTags: ['nuts', 'almonds', 'walnuts', 'cashews', 'mixed nuts', 'trail mix'],
  },
];

// ---------------------------------------------------------------------------
// Bucket 9: Snacks & Drinks (snack_drink)  [quickTapDisabled on bucket]
// ---------------------------------------------------------------------------

const BUCKET_SNACK_DRINK: Identity[] = [
  {
    id: 'us_chips',
    label: 'Chips',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 155, protein: 2, fat: 10, carbs: 15 },
    amount: {
      unit: 'g',
      default: 28,
      step: 14,
      chips: [
        { label: '1 oz (sm bag)', value: 28 },
        { label: '2 oz', value: 56 },
      ],
    },
    attributes: [
      { key: 'potato', label: 'Potato Chips', isDefault: true },
      { key: 'tortilla', label: 'Tortilla Chips', factor: { kcal: 0.9, fat: 0.75, carbs: 1.07 } },
      { key: 'baked', label: 'Baked', factor: { kcal: 0.6, fat: 0.28, carbs: 1.07 } },
    ],
    searchTags: ['chips', 'potato chips', 'tortilla chips', 'Lays', 'Doritos', 'Fritos'],
  },
  {
    id: 'us_cookies',
    label: 'Cookies',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 210, protein: 2.5, fat: 10, carbs: 30 },
    amount: {
      unit: 'piece',
      default: 2,
      chips: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
      ],
    },
    attributes: [
      { key: 'chocolate_chip', label: 'Chocolate Chip', isDefault: true },
      { key: 'oreo', label: 'Sandwich Cookie', factor: { kcal: 0.85, fat: 0.85, carbs: 1.0 } },
    ],
    searchTags: ['cookies', 'chocolate chip cookies', 'Oreos', 'biscuit'],
  },
  {
    id: 'us_ice_cream',
    label: 'Ice Cream',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 267, protein: 4.5, fat: 14, carbs: 32 },
    amount: {
      unit: 'g',
      default: 132,
      chips: [
        { label: '½ cup', value: 66 },
        { label: '1 cup', value: 132 },
        { label: '1.5 cup', value: 198 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'low_fat', label: 'Low-fat / Light', factor: { kcal: 0.65, fat: 0.35 } },
    ],
    searchTags: ['ice cream', 'frozen yogurt', 'gelato', 'soft serve'],
  },
  {
    id: 'us_soda',
    label: 'Soda / Soft Drink',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 155, protein: 0, fat: 0, carbs: 40 },
    amount: {
      unit: 'ml',
      default: 355,
      chips: [
        { label: '12 fl oz can', value: 355 },
        { label: '20 fl oz', value: 591 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'diet', label: 'Diet / Zero', factor: { kcal: 0, protein: 0, fat: 0, carbs: 0 } },
    ],
    searchTags: ['soda', 'cola', 'Coke', 'Pepsi', 'soft drink', 'pop'],
  },
  {
    id: 'us_protein_bar',
    label: 'Protein Bar',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 220, protein: 20, fat: 7, carbs: 24 },
    amount: {
      unit: 'piece',
      default: 1,
      chips: [
        { label: '1 bar', value: 1 },
        { label: '½ bar', value: 0.5 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Standard', isDefault: true },
      { key: 'quest', label: 'Quest-style (high fiber)', factor: { kcal: 0.88, protein: 1.0, carbs: 0.67 } },
    ],
    searchTags: ['protein bar', 'Quest bar', 'Kind bar', 'RXBAR', 'energy bar'],
  },
  {
    id: 'us_crackers_snack',
    label: 'Crackers',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 153, protein: 3, fat: 5, carbs: 25 },
    amount: {
      unit: 'g',
      default: 30,
      step: 15,
      chips: [
        { label: '~10 crackers', value: 30 },
        { label: '~20 crackers', value: 60 },
      ],
    },
    attributes: [
      { key: 'ritz', label: 'Butter Crackers', isDefault: true },
      { key: 'wheat', label: 'Wheat Crackers', factor: { kcal: 1.0, protein: 1.2, fat: 0.95 } },
    ],
    searchTags: ['crackers', 'Ritz', 'saltines', 'graham crackers', 'Wheat Thins'],
  },
  {
    id: 'us_coffee_drink',
    label: 'Specialty Coffee',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 250, protein: 10, fat: 6, carbs: 40 },
    amount: {
      unit: 'ml',
      default: 473,
      chips: [
        { label: 'Medium (16oz)', value: 473 },
        { label: 'Large (20oz)', value: 591 },
      ],
    },
    attributes: [
      { key: 'latte', label: 'Latte', isDefault: true },
      { key: 'frappuccino', label: 'Frappuccino', factor: { kcal: 1.3, fat: 1.6, carbs: 1.4 } },
      { key: 'iced_coffee', label: 'Iced Coffee', factor: { kcal: 0.3, protein: 0.4, fat: 0.35, carbs: 0.35 } },
    ],
    searchTags: ['coffee', 'latte', 'frappuccino', 'iced latte', 'specialty coffee', 'Starbucks'],
  },
  {
    id: 'us_energy_drink',
    label: 'Energy Drink',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 110, protein: 0, fat: 0, carbs: 27 },
    amount: {
      unit: 'ml',
      default: 473,
      chips: [
        { label: '12 oz', value: 355 },
        { label: '16 oz', value: 473 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular', isDefault: true },
      { key: 'sugar_free', label: 'Sugar-free / Zero', factor: { kcal: 0.09, carbs: 0.04 } },
    ],
    searchTags: ['energy drink', 'Red Bull', 'Monster', 'Celsius', 'Bang', 'G Fuel'],
  },
  {
    id: 'us_smoothie',
    label: 'Smoothie',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 330, protein: 8, fat: 5, carbs: 64 },
    amount: {
      unit: 'ml',
      default: 473,
      chips: [
        { label: 'Small (16oz)', value: 473 },
        { label: 'Large (24oz)', value: 710 },
      ],
    },
    attributes: [
      { key: 'fruit_blend', label: 'Fruit Blend', isDefault: true },
      { key: 'protein', label: 'Protein Smoothie', factor: { kcal: 1.1, protein: 2.5, fat: 1.2 } },
      { key: 'green', label: 'Green Smoothie', factor: { kcal: 0.7, protein: 1.1, carbs: 0.75 } },
    ],
    searchTags: ['smoothie', 'protein smoothie', 'fruit smoothie', 'Jamba Juice', 'green smoothie'],
  },
  {
    id: 'us_sweet_tea',
    label: 'Sweet Tea',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 91, protein: 0.2, fat: 0, carbs: 23 },
    amount: {
      unit: 'ml',
      default: 355,
      chips: [
        { label: '12 oz', value: 355 },
        { label: '20 oz', value: 591 },
        { label: '32 oz', value: 946 },
      ],
    },
    attributes: [
      { key: 'sweet', label: 'Sweet', isDefault: true },
      { key: 'half_half', label: 'Half & Half (Arnold Palmer)', factor: { kcal: 0.5, carbs: 0.5 } },
      { key: 'unsweet', label: 'Unsweetened', factor: { kcal: 0.02, carbs: 0.0 } },
    ],
    searchTags: ['sweet tea', 'iced tea', 'Southern sweet tea', 'unsweet tea'],
  },
  // ── Alcohol cluster (§4.1) ─────────────────────────────────────────────
  {
    id: 'us_beer',
    label: 'Beer',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    // kcal is the independent anchor (§4.1 / §8.6); 4P+9F+4C ≠ kcal for alcohol.
    defaultMacro: { kcal: 153, protein: 2, fat: 0, carbs: 13 },
    amount: {
      unit: 'ml',
      default: 355,
      chips: [
        { label: '12 oz can/bottle', value: 355 },
        { label: '16 oz pint', value: 473 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular (~5% ABV)', isDefault: true },
      { key: 'light', label: 'Light Beer', factor: { kcal: 0.65, protein: 0.75, carbs: 0.54 } },
      { key: 'ipa', label: 'IPA (~7% ABV)', factor: { kcal: 1.25, protein: 1.2, carbs: 1.2 } },
    ],
    searchTags: ['beer', 'lager', 'IPA', 'light beer', 'craft beer', 'ale'],
  },
  {
    id: 'us_wine',
    label: 'Wine',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 125, protein: 0.1, fat: 0, carbs: 4 },
    amount: {
      unit: 'ml',
      default: 148,
      chips: [
        { label: '5 oz glass', value: 148 },
        { label: '9 oz pour', value: 266 },
      ],
    },
    attributes: [
      { key: 'red', label: 'Red Wine', isDefault: true },
      { key: 'white', label: 'White Wine', factor: { kcal: 0.99, carbs: 0.975 } },
      { key: 'rosé', label: 'Rosé', factor: { kcal: 0.96, carbs: 0.875 } },
      { key: 'sweet', label: 'Sweet / Dessert', factor: { kcal: 1.5, carbs: 4.5 } },
    ],
    searchTags: ['wine', 'red wine', 'white wine', 'rosé', 'pinot', 'cabernet'],
  },
  {
    id: 'us_cocktail',
    label: 'Cocktail',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 220, protein: 0, fat: 0, carbs: 22 },
    amount: {
      unit: 'ml',
      default: 200,
      chips: [
        { label: '1 cocktail', value: 200 },
        { label: '1.5× strong pour', value: 300 },
      ],
    },
    attributes: [
      { key: 'margarita', label: 'Margarita', isDefault: true },
      { key: 'gin_tonic', label: 'Gin & Tonic', factor: { kcal: 0.59, carbs: 0.36 } },
      { key: 'whiskey_soda', label: 'Whiskey & Soda', factor: { kcal: 0.5, carbs: 0.0 } },
      { key: 'shot', label: 'Shot (1.5oz spirits)', factor: { kcal: 0.44, carbs: 0.0 } },
    ],
    searchTags: ['cocktail', 'margarita', 'gin tonic', 'whiskey', 'vodka', 'mojito', 'shot'],
  },
  {
    id: 'us_hard_seltzer',
    label: 'Hard Seltzer',
    primaryHome: { tab: 'ingredient', bucket: 'snack_drink' },
    defaultMacro: { kcal: 100, protein: 0, fat: 0, carbs: 2 },
    amount: {
      unit: 'ml',
      default: 355,
      chips: [
        { label: '12 oz can', value: 355 },
        { label: '16 oz', value: 473 },
      ],
    },
    attributes: [
      { key: 'regular', label: 'Regular (~5% ABV)', isDefault: true },
      { key: 'flavored', label: 'Flavored', factor: { kcal: 1.0, carbs: 1.5 } },
    ],
    searchTags: ['hard seltzer', 'White Claw', 'Truly', 'Bud Light seltzer', 'seltzer'],
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const US_INGREDIENT_IDENTITIES: Identity[] = [
  ...BUCKET_STAPLE,
  ...BUCKET_LEAN_PROTEIN,
  ...BUCKET_EGG,
  ...BUCKET_FATTY_PROTEIN,
  ...BUCKET_DAIRY_SOY,
  ...BUCKET_VEGGIES,
  ...BUCKET_FRUIT,
  ...BUCKET_ADDED_FAT,
  ...BUCKET_SNACK_DRINK,
];

export const US_INGREDIENT_IDENTITIES_BY_BUCKET = Object.fromEntries(
  US_INGREDIENT_IDENTITIES.reduce<Map<string, Identity[]>>((map, id) => {
    const key = id.primaryHome.bucket;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(id);
    return map;
  }, new Map()),
) as Partial<Record<string, Identity[]>>;
