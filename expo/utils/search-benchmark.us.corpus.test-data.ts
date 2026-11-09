/**
 * US 版 検索品質ベンチマークの語彙 (チューニング用)。日本語は search-benchmark.corpus.test-data.ts。
 *
 * 期待値の書式は日本語版と同じ (Item / C は日本語版から借りる):
 *   'us_milk'              … Identity 一致
 *   'us_milk/whole'        … Identity + 種類。種類を持つ Identity で既定の種類を期待するときは Identity 着地も正解
 *   'us_pizza_*'           … Identity id の前方一致
 *   'bucket:veggies'       … (kind='gap') DB に専用の Identity が無い食品。同じバケットの Identity に着地すれば可
 *
 * ⚠ 正解ラベルは「正しい着地先がどこか」で付けた。**今の検索がどこに着地するかを見て付けていない。**
 *   DB に無いが近い Identity に寄せるのが妥当な食品 (carrots → 野菜 など) は、その着地先を書く。
 *   寄せ先が無い食品 (hummus など) は kind='gap'。
 *   食品の中身 (DB) を 2026-11-07 に一度見てから書いているため、初版は DB にある種類名 (cheddar / ribeye …)
 *   に寄っている。実ユーザーの未ヒット語が集まったら、そちらを正本にして足す。
 */
import { C, type Item } from './search-benchmark.corpus.test-data';
import { US_FRESH1_CORPUS } from './search-benchmark.us.fresh1.test-data';
import { US_FRESH2_CORPUS } from './search-benchmark.us.fresh2.test-data';
import { US_FRESH3_CORPUS } from './search-benchmark.us.fresh3.test-data';
import { US_HOLDOUT_CORPUS } from './search-benchmark.us.holdout.test-data';
import { US_MOVED_FROM_HOLDOUT } from './search-benchmark.us.moved.test-data';

// prettier-ignore
const US_TUNING_BASE: Item[] = [
  ...C('grains', 'base', [
    ['bread', 'us_bread'], ['white bread', 'us_bread/white'], ['whole wheat bread', 'us_bread/whole_wheat'], ['sourdough', 'us_bread/sourdough'],
    ['rye bread', 'us_bread/rye'], ['toast', 'us_bread'], ['bagel', 'us_bagel'], ['everything bagel', 'us_bagel/everything'],
    ['rice', 'us_rice_cup'], ['white rice', 'us_rice_cup/white'], ['brown rice', 'us_rice_cup/brown'], ['pasta', 'us_pasta_plain'],
    ['whole wheat pasta', 'us_pasta_plain/whole_grain'], ['spaghetti', ['us_pasta_plain', 'us_pasta_tomato']],
    ['potato', 'us_potato'], ['baked potato', 'us_potato/baked'], ['mashed potatoes', 'us_potato/mashed'], ['french fries', 'us_potato/fries'],
    ['oatmeal', 'us_oatmeal'], ['overnight oats', 'us_oatmeal'], ['flour tortilla', 'us_tortilla/flour'], ['corn tortilla', 'us_tortilla/corn'],
    ['tortilla', 'us_tortilla'], ['cereal', 'us_cereal'], ['granola', 'us_cereal/granola'], ['high fiber cereal', 'us_cereal/high_fiber'],
  ]),
  ...C('protein', 'base', [
    ['chicken breast', 'us_chicken_breast'], ['grilled chicken', 'us_chicken_breast/grilled'], ['turkey breast', 'us_turkey_breast'],
    ['deli turkey', 'us_turkey_breast/deli'], ['cod', 'us_white_fish/cod'], ['tilapia', 'us_white_fish/tilapia'], ['shrimp', 'us_shrimp'],
    ['fried shrimp', 'us_shrimp/fried'], ['canned tuna', 'us_canned_tuna'], ['tuna in oil', 'us_canned_tuna/in_oil'],
    ['egg', 'us_egg'], ['scrambled eggs', 'us_egg/scrambled'], ['fried egg', 'us_egg/fried'], ['boiled egg', 'us_egg/boiled'],
    ['poached egg', 'us_egg/poached'], ['egg whites', 'us_egg_whites'], ['ground beef', 'us_ground_beef'], ['lean ground beef', 'us_ground_beef/lean'],
    ['steak', 'us_steak'], ['ribeye', 'us_steak/ribeye'], ['sirloin', 'us_steak/sirloin'], ['filet mignon', 'us_steak/filet'],
    ['pork chop', 'us_pork_chop'], ['pork tenderloin', 'us_pork_chop/tenderloin'], ['bacon', 'us_bacon_strip'], ['turkey bacon', 'us_bacon_strip/turkey_bacon'],
    ['sausage', 'us_sausage'], ['italian sausage', 'us_sausage/italian'], ['salmon', 'us_salmon'], ['smoked salmon', 'us_salmon/smoked'],
    ['chicken thigh', ['us_chicken_breast', 'us_ground_beef']], ['ground turkey', ['us_turkey_breast', 'us_ground_beef']],
  ]),
  ...C('dairy', 'base', [
    ['milk', 'us_milk'], ['whole milk', 'us_milk/whole'], ['skim milk', 'us_milk/skim'], ['2% milk', 'us_milk/2pct'],
    ['almond milk', 'us_plant_milk/almond'], ['oat milk', 'us_plant_milk/oat'], ['soy milk', 'us_plant_milk/soy'],
    ['cheese', 'us_cheese_slice'], ['swiss cheese', 'us_cheese_slice/swiss'], ['mozzarella', 'us_cheese_slice/mozzarella'],
    ['greek yogurt', 'us_greek_yogurt'], ['yogurt', ['us_greek_yogurt']], ['cottage cheese', 'us_cottage_cheese'],
    ['tofu', 'us_tofu_us'], ['silken tofu', 'us_tofu_us/silken'], ['cream cheese', ['us_cheese_slice']],
  ]),
  ...C('produce', 'base', [
    ['broccoli', 'us_broccoli'], ['steamed broccoli', 'us_broccoli/steamed'], ['spinach', 'us_salad_greens/spinach'], ['romaine', 'us_salad_greens/romaine'],
    ['salad', ['us_salad_greens', 'us_entree_salad']], ['black beans', 'us_beans_legumes/black_beans'], ['chickpeas', 'us_beans_legumes/chickpeas'],
    ['lentils', 'us_beans_legumes/lentils'], ['corn', 'us_corn'], ['corn on the cob', 'us_corn/on_cob'], ['mixed vegetables', 'us_mixed_veg'],
    ['banana', 'us_banana'], ['apple', 'us_apple'], ['strawberries', 'us_berries/strawberry'], ['blueberries', 'us_berries/blueberry'],
    ['orange', 'us_orange'], ['grapes', 'us_grapes'], ['watermelon', 'us_melon/watermelon'], ['cantaloupe', 'us_melon/cantaloupe'],
  ]),
  // 専用の Identity は無いが、PFC が近い Identity が同じバケットにある食品 (語彙・別名で寄せる対象)
  ...C('produce', 'gap', [
    ['carrots', 'bucket:veggies'], ['kale', 'bucket:veggies'], ['cucumber', 'bucket:veggies'], ['onion', 'bucket:veggies'],
    ['celery', 'bucket:veggies'], ['tomato', 'bucket:veggies'], ['bell pepper', 'bucket:veggies'], ['cauliflower', 'bucket:veggies'],
    ['green beans', 'bucket:veggies'], ['asparagus', 'bucket:veggies'], ['mushrooms', 'bucket:veggies'], ['zucchini', 'bucket:veggies'],
    ['pineapple', 'bucket:fruit'], ['mango', 'bucket:fruit'], ['peach', 'bucket:fruit'], ['pear', 'bucket:fruit'], ['cherries', 'bucket:fruit'],
    ['kiwi', 'bucket:fruit'], ['grapefruit', 'bucket:fruit'], ['avocado', 'bucket:added_fat'],
  ]),
  ...C('fats', 'base', [
    ['butter', 'us_butter'], ['olive oil', 'us_olive_oil'], ['mayo', 'us_mayo_tbsp'], ['ranch', 'us_ranch_tbsp'], ['peanut butter', 'us_peanut_butter'],
    ['almonds', 'us_nuts_mixed/almonds'], ['cashews', 'us_nuts_mixed/cashews'], ['walnuts', 'us_nuts_mixed/walnuts'], ['mixed nuts', 'us_nuts_mixed'],
  ]),
  ...C('sandwich', 'base', [
    ['hamburger', 'us_hamburger'], ['cheeseburger', 'us_cheeseburger'], ['double cheeseburger', 'us_cheeseburger/double'],
    ['bacon cheeseburger', 'us_cheeseburger/bacon'], ['chicken sandwich', 'us_chicken_sandwich'], ['crispy chicken sandwich', 'us_chicken_sandwich/crispy'],
    ['grilled chicken sandwich', 'us_chicken_sandwich/grilled'], ['turkey sub', 'us_deli_sub/turkey'], ['italian sub', 'us_deli_sub/italian'],
    ['sub sandwich', 'us_deli_sub'], ['hoagie', 'us_deli_sub'], ['grilled cheese', 'us_grilled_cheese'], ['blt', 'us_blt'], ['hot dog', 'us_hot_dog'],
    ['corn dog', 'us_hot_dog/corn_dog'], ['chili dog', 'us_hot_dog/chili_cheese'], ['wrap', 'us_wrap'], ['pb&j', 'us_pbj'],
    ['peanut butter and jelly', 'us_pbj'], ['ham sandwich', 'us_deli_sub/ham'], ['turkey sandwich', 'us_deli_sub/turkey'],
  ]),
  ...C('sandwich', 'gap', [
    ['veggie burger', 'bucket:burger_sandwich'], ['philly cheesesteak', 'bucket:burger_sandwich'], ['reuben', 'bucket:burger_sandwich'],
    ['sloppy joe', 'bucket:burger_sandwich'], ['club sandwich', 'bucket:burger_sandwich'], ['pulled pork sandwich', 'bucket:burger_sandwich'],
  ]),
  ...C('pizza-pasta', 'base', [
    ['pizza', ['us_pizza_pepperoni', 'us_pizza_cheese']], ['pepperoni pizza', 'us_pizza_pepperoni/pepperoni'], ['cheese pizza', ['us_pizza_cheese', 'us_pizza_pepperoni/cheese']],
    ['supreme pizza', 'us_pizza_pepperoni/supreme'], ['veggie pizza', 'us_pizza_pepperoni/veggie'], ['spaghetti and meatballs', 'us_pasta_meat'],
    ['meat sauce pasta', 'us_pasta_meat'], ['marinara', 'us_pasta_tomato'], ['fettuccine alfredo', 'us_pasta_alfredo'], ['alfredo', 'us_pasta_alfredo'],
    ['mac and cheese', 'us_mac_cheese'], ['lasagna', 'us_lasagna'],
  ]),
  ...C('pizza-pasta', 'gap', [['baked ziti', 'bucket:pizza_pasta'], ['calzone', 'bucket:pizza_pasta'], ['stuffed shells', 'bucket:pizza_pasta']]),
  ...C('chicken', 'base', [
    ['fried chicken', 'us_fried_chicken'], ['spicy fried chicken', 'us_fried_chicken/spicy'], ['chicken nuggets', 'us_tenders_nuggets'],
    ['chicken tenders', 'us_tenders_nuggets'], ['chicken fingers', 'us_tenders_nuggets'], ['chicken wings', 'us_wings'], ['buffalo wings', 'us_wings/buffalo'],
    ['bbq wings', 'us_wings/bbq'], ['rotisserie chicken', 'us_rotisserie_grilled'], ['chicken and waffles', 'us_chicken_and_waffles'],
  ]),
  ...C('mexican', 'base', [
    ['burrito', 'us_burrito'], ['chicken burrito', 'us_burrito/chicken'], ['beef burrito', 'us_burrito/beef'], ['carnitas burrito', 'us_burrito/carnitas'],
    ['veggie burrito', 'us_burrito/veggie'], ['tacos', 'us_tacos'], ['street tacos', 'us_tacos/street'], ['crunchy tacos', 'us_tacos/crunchy'],
    ['quesadilla', 'us_quesadilla'], ['nachos', 'us_nachos'], ['burrito bowl', 'us_burrito_bowl'], ['enchiladas', 'us_enchiladas'], ['fajitas', 'us_fajitas'],
  ]),
  ...C('plates', 'base', [
    ['steak and potatoes', 'us_steak_potato'], ['meatloaf', 'us_meatloaf_mash'], ['bbq ribs', 'us_bbq_plate/ribs'], ['pulled pork', 'us_bbq_plate/pulled_pork'],
    ['brisket', 'us_bbq_plate/brisket'], ['pot roast', 'us_roast_plate/pot_roast'], ['roast turkey dinner', 'us_roast_plate/turkey'],
    ['chicken pot pie', 'us_pot_pie'], ['casserole', 'us_casserole'], ['fish and chips', ['us_seafood_plate/fried', 'us_seafood_plate']],
  ]),
  ...C('soup', 'base', [
    ['chili', 'us_chili'], ['turkey chili', 'us_chili/turkey'], ['veggie chili', 'us_chili/veggie'], ['chicken noodle soup', 'us_soup_light/chicken_noodle'],
    ['tomato soup', 'us_soup_light/tomato'], ['vegetable soup', 'us_soup_light/vegetable'], ['clam chowder', 'us_soup_creamy/clam_chowder'],
    ['broccoli cheddar soup', 'us_soup_creamy/broccoli_cheddar'], ['beef stew', 'us_stew_gumbo/beef_stew'], ['gumbo', 'us_stew_gumbo/gumbo'],
    ['jambalaya', 'us_stew_gumbo/jambalaya'],
  ]),
  ...C('bowl-salad', 'base', [
    ['caesar salad', 'us_entree_salad/caesar'], ['cobb salad', 'us_entree_salad/cobb'], ['greek salad', 'us_entree_salad/greek'],
    ['chicken salad', 'us_protein_salad/chicken'], ['tuna salad', 'us_protein_salad/tuna'], ['egg salad', 'us_protein_salad/egg'],
    ['grain bowl', 'us_grain_bowl'], ['poke bowl', 'us_poke_bowl'], ['quinoa bowl', 'us_grain_bowl'],
  ]),
  ...C('asian', 'base', [
    ['orange chicken', 'us_chinese_combo/orange_chicken'], ['general tso', 'us_chinese_combo/general_tso'], ['kung pao chicken', 'us_chinese_combo/kung_pao'],
    ['lo mein', 'us_lo_mein_fried_rice/lo_mein'], ['fried rice', 'us_lo_mein_fried_rice/fried_rice'], ['teriyaki chicken', 'us_teriyaki_bowl/chicken'],
    ['teriyaki salmon', 'us_teriyaki_bowl/salmon'], ['pad thai', 'us_pad_thai'], ['california roll', 'us_sushi_roll/california'],
    ['spicy tuna roll', 'us_sushi_roll/spicy_tuna'], ['sushi', 'us_sushi_roll'], ['ramen', 'us_ramen_pho/ramen'], ['pho', 'us_ramen_pho/pho'],
    ['thai curry', 'us_curry_asian/thai'], ['indian curry', 'us_curry_asian/indian'], ['chicken tikka masala', 'us_curry_asian/indian'],
  ]),
  ...C('asian', 'gap', [
    ['beef and broccoli', 'bucket:asian_takeout'], ['dumplings', 'bucket:asian_takeout'], ['egg rolls', 'bucket:asian_takeout'],
    ['chow mein', 'bucket:asian_takeout'], ['sweet and sour chicken', 'bucket:asian_takeout'],
  ]),
  ...C('breakfast', 'base', [
    ['pancakes', 'us_pancakes_waffles/pancakes'], ['waffles', 'us_pancakes_waffles/waffles'], ['french toast', 'us_pancakes_waffles/french_toast'],
    ['eggs and bacon', 'us_eggs_bacon/bacon'], ['sausage and eggs', 'us_eggs_bacon/sausage'], ['breakfast sandwich', 'us_breakfast_sandwich'],
    ['egg and cheese biscuit', 'us_breakfast_sandwich/biscuit'], ['bagel sandwich', 'us_breakfast_sandwich/bagel'], ['breakfast burrito', 'us_breakfast_burrito'],
    ['avocado toast', 'us_avocado_toast'], ['biscuits and gravy', 'us_biscuits_gravy'], ['omelette', ['us_egg', 'us_eggs_bacon']],
  ]),
  ...C('snack-drink', 'base', [
    ['potato chips', 'us_chips/potato'], ['tortilla chips', 'us_chips/tortilla'], ['cookies', 'us_cookies'], ['chocolate chip cookie', 'us_cookies/chocolate_chip'],
    ['oreo', 'us_cookies/oreo'], ['ice cream', 'us_ice_cream'], ['soda', 'us_soda'], ['diet soda', 'us_soda/diet'], ['protein bar', 'us_protein_bar'],
    ['quest bar', 'us_protein_bar/quest'], ['ritz crackers', 'us_crackers_snack/ritz'], ['latte', 'us_coffee_drink/latte'], ['frappuccino', 'us_coffee_drink/frappuccino'],
    ['iced coffee', 'us_coffee_drink/iced_coffee'], ['energy drink', 'us_energy_drink'], ['sugar free energy drink', 'us_energy_drink/sugar_free'],
    ['smoothie', 'us_smoothie'], ['green smoothie', 'us_smoothie/green'], ['protein smoothie', 'us_smoothie/protein'], ['sweet tea', 'us_sweet_tea/sweet'],
    ['beer', 'us_beer'], ['light beer', 'us_beer/light'], ['ipa', 'us_beer/ipa'], ['red wine', 'us_wine/red'], ['white wine', 'us_wine/white'],
    ['rosé', 'us_wine/rosé'], ['margarita', 'us_cocktail/margarita'], ['gin and tonic', 'us_cocktail/gin_tonic'], ['shot', 'us_cocktail/shot'],
    ['hard seltzer', 'us_hard_seltzer'],
  ]),
  ...C('snack-drink', 'gap', [
    ['donut', 'bucket:snack_drink'], ['brownie', 'bucket:snack_drink'], ['cake', 'bucket:snack_drink'], ['pretzels', 'bucket:snack_drink'],
    ['popcorn', 'bucket:snack_drink'], ['candy bar', 'bucket:snack_drink'], ['milkshake', 'bucket:snack_drink'], ['orange juice', 'bucket:snack_drink'],
    ['cupcake', 'bucket:snack_drink'], ['granola bar', 'bucket:snack_drink'],
  ]),
  // 表記ゆれ・複数形・語順・綴り違い (規則で解けるもの)
  ...C('variants', 'variant', [
    ['eggs', 'us_egg'], ['apples', 'us_apple'], ['bananas', 'us_banana'], ['burgers', ['us_hamburger', 'us_cheeseburger']], ['pancake', 'us_pancakes_waffles/pancakes'],
    ['waffle', 'us_pancakes_waffles/waffles'], ['cookie', 'us_cookies'], ['burritos', 'us_burrito'], ['taco', 'us_tacos'], ['mac n cheese', 'us_mac_cheese'],
    ['mac & cheese', 'us_mac_cheese'], ['pbj', 'us_pbj'], ['chicken grilled', 'us_chicken_breast/grilled'], ['cheese pizza slice', ['us_pizza_cheese', 'us_pizza_pepperoni/cheese']],
    ['chiken breast', 'us_chicken_breast'], ['spagetti', ['us_pasta_plain', 'us_pasta_tomato']], ['hamburgar', 'us_hamburger'], ['brocoli', 'us_broccoli'],
    ['cheeseburgr', 'us_cheeseburger'], ['quesadila', 'us_quesadilla'], ['Chicken Wings', 'us_wings'], ['  pizza ', ['us_pizza_pepperoni', 'us_pizza_cheese']],
  ]),
  // 商品名 (別機能の範囲。参考として別に測る)
  ...C('chain', 'chain', [
    ['big mac', 'us_cheeseburger/double'], ['whopper', 'us_cheeseburger'], ['mcnuggets', 'us_tenders_nuggets'], ['egg mcmuffin', 'us_breakfast_sandwich/english_muffin'],
    ['chipotle bowl', 'us_burrito_bowl'], ['footlong', 'us_deli_sub'], ['starbucks latte', 'us_coffee_drink/latte'], ['pumpkin spice latte', 'us_coffee_drink/latte'],
    ['red bull', 'us_energy_drink'], ['coke', 'us_soda'], ['waffle fries', 'us_potato/fries'], ['panda express orange chicken', 'us_chinese_combo/orange_chicken'],
    ['chick-fil-a sandwich', 'us_chicken_sandwich'], ['domino\'s pizza', 'us_pizza_pepperoni'], ['blizzard', 'us_ice_cream'], ['mcflurry', 'us_ice_cream'],
  ]),
  // 検索語として成立しない入力は何も出さない
  ...C('noise', 'variant', [['xyzzy', []], ['qwerty', []], ['zzzz', []], ['asdfgh', []]]),
  // ホールドアウトから移した語 (別名表と重なったため。経緯は moved ファイル)
  ...US_MOVED_FROM_HOLDOUT,
];

/**
 * 2026-11-09: 新しい語の第1束 (search-benchmark.us.fresh1.test-data.ts)。規則を見る前に書き、失敗の型を直したあとに
 * チューニング用へ移した。**汎化の測定には使えない**。ホールドアウトや既存のチューニング用と同じ語は除く
 * (私が思い付く語は、前に書いた語と重なりやすい — 380語のうち231語が重なった)。
 */
const FRESH1_TAKEN = new Set([...US_TUNING_BASE, ...US_HOLDOUT_CORPUS].map((i) => i.q));
const FRESH1_NEW = US_FRESH1_CORPUS.filter((i) => !FRESH1_TAKEN.has(i.q));
/** 2026-11-09: 第2束 (第1束の失敗を直したあとに書いて測り、失敗の型を直したあとチューニング用へ移した)。 */
const FRESH2_TAKEN = new Set([...FRESH1_TAKEN, ...FRESH1_NEW.map((i) => i.q)]);
const FRESH2_NEW = US_FRESH2_CORPUS.filter((i) => !FRESH2_TAKEN.has(i.q));
/** 2026-11-09: 第3束 (第2束を直したあとに書き、見ずに測った。失敗の型を直したあとチューニング用へ移した)。 */
const FRESH3_TAKEN = new Set([...FRESH2_TAKEN, ...FRESH2_NEW.map((i) => i.q)]);
export const US_TUNING_CORPUS: Item[] = [...US_TUNING_BASE, ...FRESH1_NEW, ...FRESH2_NEW, ...US_FRESH3_CORPUS.filter((i) => !FRESH3_TAKEN.has(i.q))];

/** 「打鍵途中」の測定 (正解が上位3に出る文字数)。日本語版 PREFIX_TARGETS の US 版。 */
export const US_PREFIX_TARGETS: [string, string[]][] = [
  ['chicken breast', ['us_chicken_breast']], ['cheeseburger', ['us_cheeseburger']], ['pancakes', ['us_pancakes_waffles/pancakes']],
  ['broccoli', ['us_broccoli']], ['burrito', ['us_burrito']], ['hamburger', ['us_hamburger']], ['smoothie', ['us_smoothie']],
  ['quesadilla', ['us_quesadilla']], ['spaghetti', ['us_pasta_plain', 'us_pasta_tomato']], ['strawberries', ['us_berries/strawberry']],
];
