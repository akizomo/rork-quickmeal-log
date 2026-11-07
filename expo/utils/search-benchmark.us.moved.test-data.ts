/**
 * ホールドアウトからチューニング用へ移した語 (US)。ラベルは移すときに変えていない。
 *
 * 1) 2026-11-07 検索の ② (英語の別名表 search-aliases.us.ts): 別名表を書くとき、ホールドアウトの語を
 *    知っていたため同じ語が別名表に入った (192語中 107語)。
 * 2) 2026-11-07 検索の語彙辞書 (constants/identity/vocabulary.us.ts): 辞書は料理の種類ごとに網羅的に書いたが、
 *    ホールドアウトの語と重なったものが 47語あった。
 * どちらも日本語版の運用ルール「見て直した時点でその語はチューニング用に移す」に従い、ここへ移した。
 * ホールドアウトは、別の新しい語で補充した。
 */
import { C, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const US_MOVED_FROM_HOLDOUT: Item[] = [
  ...C("grains", "base", [
    ["jasmine rice", ["us_rice_cup/white","us_rice_cup"]], ["penne", "us_pasta_plain"], ["basmati rice", ["us_rice_cup/white","us_rice_cup"]], ["sweet potato fries", "us_potato/fries"],
  ]),
  ...C("protein", "base", [
    ["pork ribs", "us_pork_chop/ribs"], ["fried chicken breast", "us_chicken_breast/fried"], ["over easy eggs", "us_egg/fried"],
  ]),
  ...C("dairy", "base", [
    ["1% milk", "us_milk"], ["cheddar", "us_cheese_slice/cheddar"],
  ]),
  ...C("produce", "base", [
    ["baby spinach", "us_salad_greens/spinach"], ["garbanzo beans", "us_beans_legumes/chickpeas"], ["mandarin", "us_orange"], ["honeydew", "us_melon/honeydew"],
  ]),
  ...C("produce", "gap", [
    ["lettuce", "bucket:veggies"], ["spinach salad", "bucket:veggies"], ["squash", "bucket:veggies"], ["eggplant", "bucket:veggies"], ["brussels sprouts", "bucket:veggies"], ["cabbage", "bucket:veggies"], ["peas", "bucket:veggies"], ["beets", "bucket:veggies"], ["raspberries", "bucket:fruit"], ["blackberries", "bucket:fruit"], ["plum", "bucket:fruit"], ["pomegranate", "bucket:fruit"], ["lemon", "bucket:fruit"], ["red onion", "bucket:veggies"], ["pickles", "bucket:veggies"], ["sauerkraut", "bucket:veggies"], ["raisins", "bucket:fruit"],
  ]),
  ...C("fats", "base", [
    ["extra virgin olive oil", "us_olive_oil"],
  ]),
  ...C("sandwich", "base", [
    ["ham sub", "us_deli_sub/ham"], ["grilled cheese sandwich", "us_grilled_cheese"], ["chicken caesar wrap", "us_wrap"], ["peanut butter jelly sandwich", "us_pbj"], ["turkey club", "us_deli_sub/turkey"],
  ]),
  ...C("pizza-pasta", "base", [
    ["slice of pizza", ["us_pizza_pepperoni","us_pizza_cheese"]], ["meat lovers pizza", "us_pizza_pepperoni/supreme"], ["spaghetti with meatballs", "us_pasta_meat"], ["creamy pasta", "us_pasta_alfredo"], ["macaroni and cheese", "us_mac_cheese"], ["pasta with meat sauce", "us_pasta_meat"],
  ]),
  ...C("chicken", "base", [
    ["popcorn chicken", "us_tenders_nuggets"], ["chicken strips", "us_tenders_nuggets"], ["hot wings", "us_wings/buffalo"],
  ]),
  ...C("mexican", "base", [
    ["steak burrito", "us_burrito/beef"], ["pork carnitas burrito", "us_burrito/carnitas"], ["bean burrito", ["us_burrito/veggie","us_burrito"]], ["chicken quesadilla", "us_quesadilla"], ["loaded nachos", "us_nachos"], ["soft tacos", "us_tacos"],
  ]),
  ...C("plates", "base", [
    ["steak dinner", "us_steak_potato"], ["meat loaf", "us_meatloaf_mash"], ["baby back ribs", "us_bbq_plate/ribs"], ["turkey dinner", "us_roast_plate/turkey"],
  ]),
  ...C("soup", "base", [
    ["beef chili", "us_chili/con_carne"], ["chili con carne", "us_chili/con_carne"], ["new england clam chowder", "us_soup_creamy/clam_chowder"], ["minestrone", "us_soup_light/vegetable"], ["chicken soup", "us_soup_light/chicken_noodle"],
  ]),
  ...C("bowl-salad", "base", [
    ["chicken caesar salad", "us_entree_salad/caesar"], ["chef salad", "us_entree_salad"], ["ahi poke bowl", "us_poke_bowl"], ["tuna salad plate", "us_protein_salad/tuna"], ["harvest bowl", "us_grain_bowl"], ["mediterranean bowl", "us_grain_bowl"],
  ]),
  ...C("asian", "base", [
    ["sesame chicken", ["us_chinese_combo","us_chinese_combo/orange_chicken"]], ["shrimp fried rice", "us_lo_mein_fried_rice/fried_rice"], ["teriyaki beef", "us_teriyaki_bowl/beef"], ["ramen noodle soup", "us_ramen_pho/ramen"], ["beef pho", "us_ramen_pho/pho"], ["green curry", "us_curry_asian/thai"], ["red curry", "us_curry_asian/thai"], ["chicken curry", "us_curry_asian"], ["vegetable lo mein", "us_lo_mein_fried_rice/lo_mein"],
  ]),
  ...C("asian", "gap", [
    ["kung pao shrimp", "bucket:asian_takeout"], ["mongolian beef", "bucket:asian_takeout"], ["potstickers", "bucket:asian_takeout"], ["spring rolls", "bucket:asian_takeout"], ["crab rangoon", "bucket:asian_takeout"], ["bibimbap", "bucket:asian_takeout"], ["bao buns", "bucket:asian_takeout"],
  ]),
  ...C("breakfast", "base", [
    ["buttermilk pancakes", "us_pancakes_waffles/pancakes"], ["belgian waffle", "us_pancakes_waffles/waffles"], ["eggs and sausage", "us_eggs_bacon/sausage"], ["bacon egg and cheese", "us_breakfast_sandwich"], ["sausage biscuit", "us_breakfast_sandwich/biscuit"], ["breakfast wrap", "us_breakfast_burrito"], ["avocado on toast", "us_avocado_toast"], ["gravy and biscuits", "us_biscuits_gravy"], ["english muffin sandwich", "us_breakfast_sandwich/english_muffin"], ["pancake stack", "us_pancakes_waffles/pancakes"],
  ]),
  ...C("snack-drink", "base", [
    ["kettle chips", "us_chips/potato"], ["baked chips", "us_chips/baked"], ["pepsi", "us_soda"], ["zero sugar soda", "us_soda/diet"], ["cold brew", "us_coffee_drink/iced_coffee"], ["iced latte", "us_coffee_drink/latte"], ["mocha frappuccino", "us_coffee_drink/frappuccino"], ["monster", "us_energy_drink"], ["fruit smoothie", "us_smoothie/fruit_blend"], ["unsweetened tea", "us_sweet_tea/unsweet"], ["lager", "us_beer"], ["chardonnay", "us_wine/white"], ["merlot", "us_wine/red"], ["moscato", "us_wine/sweet"], ["tequila shot", "us_cocktail/shot"], ["jack and coke", "us_cocktail/whiskey_soda"], ["spiked seltzer", "us_hard_seltzer"], ["pinot noir", "us_wine/red"],
  ]),
  ...C("snack-drink", "gap", [
    ["cinnamon roll", "bucket:snack_drink"], ["frozen yogurt", "bucket:snack_drink"], ["pop tarts", "bucket:snack_drink"], ["pumpkin pie", "bucket:snack_drink"], ["gummy bears", "bucket:snack_drink"], ["jelly beans", "bucket:snack_drink"], ["apple juice", "bucket:snack_drink"], ["gummy worms", "bucket:snack_drink"], ["apple cider", "bucket:snack_drink"], ["banana bread", "bucket:snack_drink"], ["hot cocoa", "bucket:snack_drink"],
  ]),
  ...C("variants", "variant", [
    ["sandwiches", ["us_deli_sub","us_chicken_sandwich"]], ["tacoes", "us_tacos"], ["MAC AND CHEESE", "us_mac_cheese"], ["Greek Yogurt", "us_greek_yogurt"], ["lasagne", "us_lasagna"],
  ]),
  ...C("chain", "chain", [
    ["quarter pounder", "us_cheeseburger"], ["chick fil a nuggets", "us_tenders_nuggets"], ["subway sandwich", "us_deli_sub"], ["starbucks frappuccino", "us_coffee_drink/frappuccino"], ["taco bell burrito", "us_burrito"], ["kfc chicken", "us_fried_chicken"], ["in n out burger", "us_cheeseburger"], ["mcchicken", "us_chicken_sandwich"],
  ]),
  ...C("fats", "gap", [
    ["honey", "bucket:added_fat"], ["maple syrup", "bucket:added_fat"], ["guacamole", "bucket:added_fat"], ["hummus", "bucket:added_fat"],
  ]),
  ...C("sandwich", "gap", [
    ["banh mi", "bucket:burger_sandwich"], ["monte cristo", "bucket:burger_sandwich"],
  ]),
  ...C("pizza-pasta", "gap", [
    ["gnocchi", "bucket:pizza_pasta"], ["tortellini", "bucket:pizza_pasta"], ["pizza rolls", "bucket:pizza_pasta"], ["pasta salad", "bucket:pizza_pasta"],
  ]),
  ...C("mexican", "gap", [
    ["chile relleno", "bucket:mexican"], ["elote", "bucket:mexican"], ["pozole", "bucket:soup_stew"],
  ]),
  ...C("plates", "gap", [
    ["salmon dinner", "bucket:american_plate"], ["shrimp and grits", "bucket:american_plate"],
  ]),
  ...C("soup", "gap", [
    ["lobster bisque", "bucket:soup_stew"], ["french onion soup", "bucket:soup_stew"],
  ]),
  ...C("breakfast", "gap", [
    ["hash browns and eggs", "bucket:breakfast"], ["yogurt parfait", "bucket:breakfast"], ["granola and yogurt", "bucket:breakfast"],
  ]),
];
