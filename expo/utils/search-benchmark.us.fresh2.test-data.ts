/**
 * US 版 検索品質ベンチマーク — 新しい語の第2束 (2026-11-09、第1束・ホールドアウトの失敗を直したあと)。
 *
 * これは**ホールドアウト扱い**: 規則・別名・語彙辞書は、この束の語を見ずに直した。失敗の中身を見て直したら、
 * チューニング用へ移して第3束を書く (search-benchmark.us.moved.test-data.ts と同じ手順)。
 *
 * 第1束と書き方を変えた (第1束は「食品名 + 言い方の崩し」中心だった):
 *   アメリカ人が実際に食事を記録するときの形 — 量つき ("3 slices bacon") / with・and・on でつなぐ ("oatmeal with blueberries") /
 *   味違い ("chocolate ice cream") / 調理・注文の言い方 ("loaded baked potato") / ブランドの種類 ("bud light")。
 *
 * 期待値は DB の Identity 一覧 (id・名前・種類) だけを見て、「正しい着地先がどこか」で付けた。今の検索の出力は見ていない。
 * 既存の語 (チューニング用・ホールドアウト・別名表・語彙辞書にある語) は、読み込み側で除いて数える
 * (どこかに書いてある語は、汎化の測定にならない)。
 */
import { C, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const US_FRESH2_CORPUS: Item[] = [
  ...C('grains', 'base', [
    ['oatmeal with blueberries', 'us_oatmeal'], ['bowl of cereal', 'us_cereal'], ['cereal with milk', 'us_cereal'], ['toasted bagel with cream cheese', 'us_bagel'],
    ['half a bagel', 'us_bagel'], ['two slices of toast', 'us_bread'], ['garlic mashed potatoes', 'us_potato/mashed'], ['loaded baked potato', 'us_potato/baked'],
    ['steamed white rice', 'us_rice_cup/white'], ['brown rice bowl', 'us_rice_cup/brown'], ['whole wheat toast', 'us_bread/whole_wheat'], ['sourdough toast', 'us_bread/sourdough'],
    ['rye toast', 'us_bread/rye'], ['spaghetti with meat sauce', 'us_pasta_meat'], ['pasta with alfredo sauce', 'us_pasta_alfredo'], ['pasta marinara', 'us_pasta_tomato'],
    ['instant oatmeal packet', 'us_oatmeal'], ['overnight oats with berries', 'us_oatmeal/overnight'], ['flour tortillas', 'us_tortilla/flour'], ['everything bagel with butter', 'us_bagel/everything'],
  ]),
  ...C('grains', 'gap', [['cheesy grits', 'bucket:staple'], ['stuffing', 'bucket:staple'], ['dinner roll', 'bucket:staple'], ['pita bread', 'bucket:staple']]),
  ...C('protein', 'base', [
    ['3 slices bacon', 'us_bacon_strip'], ['two scrambled eggs', 'us_egg/scrambled'], ['scrambled egg whites', 'us_egg_whites'], ['boiled eggs', 'us_egg/boiled'], ['poached eggs', 'us_egg/poached'],
    ['baked salmon', 'us_salmon'], ['sliced chicken breast', 'us_chicken_breast'], ['tuna fish', 'us_canned_tuna'], ['sirloin steak', 'us_steak/sirloin'],
    ['pork tenderloin medallions', 'us_pork_chop/tenderloin'], ['smoked sausage', 'us_sausage'], ['tilapia', 'us_white_fish/tilapia'], ['cod fillet', 'us_white_fish/cod'],
    ['ground beef 90/10', 'us_ground_beef/lean'], ['80/20 ground beef', 'us_ground_beef/regular'], ['grilled chicken breast strips', 'us_chicken_breast/grilled'],
    ['sunny side up eggs', 'us_egg/fried'], ['fried eggs', 'us_egg/fried'], ['turkey breast slices', 'us_turkey_breast/deli'], ['wild caught salmon', 'us_salmon/wild'],
  ]),
  ...C('protein', 'gap', [['shrimp cocktail', 'bucket:lean_protein'], ['seared ahi tuna', 'bucket:lean_protein'], ['crab legs', 'bucket:lean_protein'], ['pork belly', 'bucket:fatty_protein']]),
  ...C('dairy', 'base', [
    ['glass of whole milk', 'us_milk/whole'], ['cup of skim milk', 'us_milk/skim'], ['fat free greek yogurt', 'us_greek_yogurt/nonfat'], ['vanilla greek yogurt', 'us_greek_yogurt'],
    ['cheddar cheese slices', 'us_cheese_slice/cheddar'], ['chocolate milk', 'us_milk'], ['greek yogurt with honey', 'us_greek_yogurt'], ['greek yogurt with berries', 'us_greek_yogurt'],
    ['vanilla almond milk', 'us_plant_milk/almond'], ['extra firm tofu cubes', 'us_tofu_us/extra_firm'], ['cottage cheese with pineapple', 'us_cottage_cheese'],
    ['plain greek yogurt', 'us_greek_yogurt'], ['1% milk', 'us_milk/2pct'], ['swiss cheese slice', 'us_cheese_slice/swiss'],
  ]),
  ...C('dairy', 'gap', [['tofu scramble', 'bucket:dairy_soy'], ['protein shake powder', 'bucket:dairy_soy'], ['whipped topping', 'bucket:dairy_soy']]),
  ...C('produce', 'base', [
    ['banana slices', 'us_banana'], ['sliced apple', 'us_apple'], ['red grapes', 'us_grapes'], ['cup of strawberries', 'us_berries/strawberry'], ['steamed broccoli florets', 'us_broccoli/steamed'],
    ['roasted broccoli', 'us_broccoli/roasted'], ['mixed greens', 'us_salad_greens/mixed'], ['pinto beans', 'us_beans_legumes/pinto'], ['sweet corn', 'us_corn'], ['corn cob', 'us_corn/on_cob'],
    ['frozen mixed vegetables', 'us_mixed_veg/frozen'], ['stir fry vegetables', 'us_mixed_veg/stir_fry'], ['watermelon slices', 'us_melon/watermelon'], ['honeydew melon', 'us_melon/honeydew'],
    ['mandarin orange', 'us_orange'], ['navel orange', 'us_orange'], ['fresh pineapple chunks', 'us_fruit_other/pineapple'], ['peaches', 'us_fruit_other/peach'], ['pears', 'us_fruit_other/pear'],
    ['cherries', 'us_fruit_other/cherries'], ['kiwi fruit', 'us_fruit_other/kiwi'], ['romaine hearts', 'us_salad_greens/romaine'],
  ]),
  ...C('produce', 'gap', [['baby carrots', 'bucket:veggies'], ['half an avocado', 'bucket:fruit'], ['sweet potato wedges', 'bucket:staple'], ['cherry tomatoes', 'bucket:veggies'], ['celery sticks', 'bucket:veggies'], ['brussels sprouts', 'bucket:veggies']]),
  ...C('fats', 'base', [
    ['tbsp olive oil', 'us_olive_oil'], ['2 tbsp peanut butter', 'us_peanut_butter'], ['handful of almonds', 'us_nuts_mixed/almonds'], ['mixed nuts', 'us_nuts_mixed/mixed'], ['cashew nuts', 'us_nuts_mixed/cashews'],
    ['walnut halves', 'us_nuts_mixed/walnuts'], ['ranch dressing', 'us_ranch_tbsp'], ['light mayo', 'us_mayo_tbsp/light'], ['guacamole dip', 'us_dip_spread/guacamole'], ['unsalted butter', 'us_butter/unsalted'],
  ]),
  ...C('fats', 'gap', [['italian dressing', 'bucket:added_fat'], ['sriracha mayo', 'bucket:added_fat'], ['tahini', 'bucket:added_fat'], ['maple syrup', 'bucket:added_fat'], ['olive oil spray', 'bucket:added_fat']]),
  ...C('sandwich', 'base', [
    ['turkey and cheese sandwich', 'us_deli_sub/turkey'], ['ham and cheese sandwich', 'us_deli_sub/ham'], ['italian hoagie', 'us_deli_sub/italian'], ['grilled chicken sandwich', 'us_chicken_sandwich/grilled'],
    ['blt', 'us_blt'], ['hot dog with chili', 'us_hot_dog/chili_cheese'], ['peanut butter jelly sandwich', 'us_pbj'], ['veggie wrap', 'us_wrap'], ['turkey wrap', 'us_wrap'], ['buffalo chicken wrap', 'us_wrap'],
    ['double cheeseburger no bun', 'us_cheeseburger/double'], ['single cheeseburger', 'us_cheeseburger/single'], ['plain hamburger', 'us_hamburger'], ['crispy chicken sandwich', 'us_chicken_sandwich/crispy'],
  ]),
  ...C('sandwich', 'gap', [['chicken salad sandwich', 'bucket:burger_sandwich'], ['egg salad sandwich', 'bucket:burger_sandwich'], ['gyro', 'bucket:burger_sandwich'], ['pulled pork slider', 'bucket:burger_sandwich']]),
  ...C('pizza-pasta', 'base', [
    ['slice of pepperoni pizza', 'us_pizza_pepperoni/pepperoni'], ['two slices of cheese pizza', 'us_pizza_cheese'], ['sausage pizza', 'us_pizza_pepperoni'], ['hawaiian pizza', 'us_pizza_pepperoni'],
    ['bbq chicken pizza', 'us_pizza_pepperoni'], ['mushroom pizza', 'us_pizza_pepperoni/veggie'], ['baked mac and cheese', 'us_mac_cheese'], ['creamy alfredo pasta', 'us_pasta_alfredo'],
    ['meat lasagna', 'us_lasagna'], ['pasta with red sauce', 'us_pasta_tomato'], ['penne alfredo', 'us_pasta_alfredo'], ['leftover pizza', 'us_pizza_pepperoni'],
  ]),
  ...C('pizza-pasta', 'gap', [['chicken parm', 'bucket:pizza_pasta'], ['stuffed shells', 'bucket:pizza_pasta'], ['pizza rolls', 'bucket:pizza_pasta']]),
  ...C('chicken', 'base', [
    ['hot honey chicken tenders', 'us_tenders_nuggets'], ['boneless wings', 'us_wings'], ['garlic parmesan wings', 'us_wings'], ['fried chicken thigh', 'us_fried_chicken'],
    ['spicy fried chicken', 'us_fried_chicken/spicy'], ['original recipe chicken', 'us_fried_chicken/original'], ['roasted chicken', 'us_rotisserie_grilled'], ['chicken nuggets 10 piece', 'us_tenders_nuggets'],
  ]),
  ...C('mexican', 'base', [
    ['steak burrito', 'us_burrito'], ['chicken tacos', 'us_tacos'], ['beef nachos', 'us_nachos'], ['chicken quesadilla', 'us_quesadilla'], ['chicken enchiladas', 'us_enchiladas'], ['steak fajitas', 'us_fajitas'],
    ['veggie burrito', 'us_burrito/veggie'], ['crunchy beef tacos', 'us_tacos/crunchy'], ['burrito bowl with rice and beans', 'us_burrito_bowl'],
  ]),
  ...C('plates', 'base', [
    ['pot roast and potatoes', 'us_roast_plate/pot_roast'], ['roast turkey dinner', 'us_roast_plate/turkey'], ['honey baked ham', 'us_roast_plate/ham'], ['steak dinner', 'us_steak_potato'],
    ['smoked brisket plate', 'us_bbq_plate/brisket'], ['pulled pork plate', 'us_bbq_plate/pulled_pork'], ['tuna casserole', 'us_casserole'], ['chicken pot pie slice', 'us_pot_pie'],
  ]),
  ...C('plates', 'gap', [['shepherds pie', 'bucket:american_plate'], ['chicken fried steak', 'bucket:american_plate'], ['corn dog nuggets', 'bucket:american_plate']]),
  ...C('soup', 'base', [
    ['tomato basil soup', 'us_soup_light/tomato'], ['beef chili', 'us_chili/con_carne'], ['clam chowder bread bowl', 'us_soup_creamy/clam_chowder'], ['vegetable beef soup', 'us_soup_light/vegetable'],
    ['cream of chicken soup', 'us_soup_creamy/cream_of_x'], ['beef stew with potatoes', 'us_stew_gumbo/beef_stew'], ['cajun jambalaya', 'us_stew_gumbo/jambalaya'], ['chili with beans', 'us_chili'],
  ]),
  ...C('soup', 'gap', [['chicken tortilla soup', 'bucket:soup_stew'], ['loaded potato soup', 'bucket:soup_stew'], ['egg drop soup', 'bucket:soup_stew']]),
  ...C('bowl-salad', 'base', [
    ['chicken caesar', 'us_entree_salad/caesar'], ['greek salad with feta', 'us_entree_salad/greek'], ['tuna salad scoop', 'us_protein_salad/tuna'], ['chicken salad plate', 'us_protein_salad/chicken'],
    ['salmon poke bowl', 'us_poke_bowl'], ['tuna poke', 'us_poke_bowl'], ['quinoa bowl', 'us_grain_bowl'], ['cobb salad with ranch', 'us_entree_salad/cobb'],
  ]),
  ...C('asian', 'base', [
    ['chicken fried rice', 'us_lo_mein_fried_rice/fried_rice'], ['shrimp fried rice', 'us_lo_mein_fried_rice/fried_rice'], ['beef lo mein', 'us_lo_mein_fried_rice/lo_mein'], ['chicken lo mein', 'us_lo_mein_fried_rice/lo_mein'],
    ['kung pao shrimp', 'us_chinese_combo/kung_pao'], ['orange chicken and rice', 'us_chinese_combo/orange_chicken'], ['teriyaki chicken bowl', 'us_teriyaki_bowl/chicken'], ['beef teriyaki', 'us_teriyaki_bowl/beef'],
    ['salmon teriyaki', 'us_teriyaki_bowl/salmon'], ['shrimp pad thai', 'us_pad_thai'], ['chicken pad thai', 'us_pad_thai'], ['rainbow roll', 'us_sushi_roll'], ['philadelphia roll', 'us_sushi_roll'],
    ['dragon roll', 'us_sushi_roll/dragon'], ['beef pho', 'us_ramen_pho/pho'], ['tonkotsu ramen', 'us_ramen_pho/ramen'], ['red curry', 'us_curry_asian/thai'], ['chicken curry', 'us_curry_asian'],
    ['tikka masala', 'us_curry_asian/indian'],
  ]),
  ...C('asian', 'gap', [['palak paneer', 'bucket:asian_takeout'], ['crab rangoon', 'bucket:asian_takeout'], ['miso soup', 'bucket:asian_takeout'], ['edamame', 'bucket:asian_takeout'], ['gyoza', 'bucket:asian_takeout']]),
  ...C('breakfast', 'base', [
    ['pancakes with syrup', 'us_pancakes_waffles/pancakes'], ['chocolate chip pancakes', 'us_pancakes_waffles/pancakes'], ['belgian waffle', 'us_pancakes_waffles/waffles'], ['waffles with strawberries', 'us_pancakes_waffles/waffles'],
    ['french toast sticks', 'us_pancakes_waffles/french_toast'], ['egg and cheese bagel', 'us_breakfast_sandwich/bagel'], ['sausage biscuit', 'us_breakfast_sandwich/biscuit'], ['avocado toast with egg', 'us_avocado_toast'],
    ['breakfast burrito with sausage', 'us_breakfast_burrito'], ['english muffin breakfast sandwich', 'us_breakfast_sandwich/english_muffin'],
  ]),
  ...C('breakfast', 'gap', [['breakfast bowl', 'bucket:breakfast'], ['cinnamon toast', 'bucket:breakfast'], ['granola with yogurt', 'bucket:breakfast']]),
  ...C('snack-drink', 'base', [
    ['chocolate chip cookie', 'us_cookies/chocolate_chip'], ['ice cream cone', 'us_ice_cream'], ['chocolate ice cream', 'us_ice_cream'], ['diet pepsi', 'us_soda/diet'], ['zero sugar coke', 'us_soda/diet'],
    ['protein bar chocolate', 'us_protein_bar'], ['club crackers', 'us_crackers_snack'], ['wheat thins', 'us_crackers_snack/wheat'], ['vanilla latte', 'us_coffee_drink/latte'], ['fruit smoothie', 'us_smoothie/fruit_blend'],
    ['banana protein smoothie', 'us_smoothie/protein'], ['sweet iced tea', 'us_sweet_tea/sweet'], ['half and half tea', 'us_sweet_tea/half_half'], ['craft beer', 'us_beer'], ['bud light', 'us_beer/light'],
    ['pinot noir', 'us_wine/red'], ['chardonnay', 'us_wine/white'], ['rum and coke', 'us_cocktail'], ['tequila shot', 'us_cocktail/shot'], ['hard seltzer', 'us_hard_seltzer'], ['glazed donut', 'us_pastry/donut'],
    ['blueberry muffin', 'us_pastry/muffin'], ['chocolate croissant', 'us_pastry/croissant'], ['cheese danish', 'us_pastry/danish'], ['chocolate brownie', 'us_dessert/brownie'], ['new york cheesecake', 'us_dessert/cheesecake'],
    ['pumpkin pie', 'us_dessert/pie'], ['carrot cake', 'us_dessert/cake'], ['apple juice', 'us_juice/apple'], ['cranberry juice', 'us_juice/cranberry'], ['cup of black coffee', 'us_coffee_drink'],
  ]),
  ...C('snack-drink', 'gap', [['bubble tea', 'bucket:snack_drink'], ['frozen yogurt', 'bucket:snack_drink'], ['prosecco', 'bucket:snack_drink'], ['kombucha', 'bucket:snack_drink'], ['popsicle', 'bucket:snack_drink'],
    ['trail mix bar', 'bucket:snack_drink'], ['fruit roll up', 'bucket:snack_drink'], ['sparkling water', 'bucket:snack_drink']]),
];
