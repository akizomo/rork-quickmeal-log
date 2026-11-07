/**
 * US 版 検索品質ベンチマークの語彙 (ホールドアウト用)。日本語は search-benchmark.holdout.test-data.ts。
 *
 * **この語彙は改善のチューニングに使わない。** チューニング用 (search-benchmark.us.corpus.test-data.ts) の
 * 失敗を直した結果が「その語だけに効いた」のか「同種の語にも効いた」のかを見分けるための別の語。
 *
 * 経緯 (2026-11-07):
 *   - 初版 192語は、初回測定の前にラベルを固定した。
 *   - 検索の ② で別名表 (search-aliases.us.ts) を書いたとき、ホールドアウトの語を知ったうえで書いたため
 *     107語が別名表と重なった。日本語版の運用ルールに従い、それらは search-benchmark.us.moved.test-data.ts
 *     (チューニング用) へ移した。残り85語は別名表に入っていない。
 *   - 移した分を補う新しい語を、別名表を書いたあとに考えて追加した (ラベルは測定の前に固定)。
 *     **この補充分の語は別名表に入れない。** 失敗しても、その語のために別名を足さない (足したらチューニング用へ移す)。
 *
 *   - 2026-11-07 検索の語彙辞書 (vocabulary.us.ts) を書いたあと、辞書と重なった 47語をチューニング用へ移し、
 *     辞書に入れていない新しい語で補充した (ラベルは測定の前に固定)。**この補充分の語は辞書・別名表に入れない。**
 *
 * 運用ルール:
 *   - 改善の最中は失敗の中身を見ない (集計値だけ見る)。見て直した時点でその語はチューニング用に移す
 *   - 移すときはここから消してコミットメッセージに理由を書く。新しいホールドアウトは別の語で補充する
 *   - ラベルが誤っていたら直してよいが、直す理由と日付をここに書く
 */
import { C, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const US_HOLDOUT_CORPUS: Item[] = [
  ...C("grains", "base", [
    ["plain bagel", "us_bagel/plain"], ["whole grain bagel", "us_bagel/whole_grain"], ["sourdough toast", "us_bread/sourdough"], ["instant oatmeal", "us_oatmeal"], ["granola cereal", "us_cereal/granola"], ["baked potatoes", "us_potato/baked"], ["whole grain pasta", "us_pasta_plain/whole_grain"], ["wheat bread", "us_bread/whole_wheat"], ["pumpernickel bread", "us_bread/rye"], ["multigrain toast", "us_bread"], ["cinnamon raisin bagel", "us_bagel"], ["spaghetti noodles", ["us_pasta_plain","us_pasta_tomato"]], ["whole wheat tortilla", "us_tortilla/whole_wheat"], ["mashed potato", "us_potato/mashed"], ["baked sweet potato", "us_potato"], ["cooked quinoa", "us_rice_cup"], ["steel cut oatmeal", "us_oatmeal"], ["cornflakes cereal", "us_cereal"], ["brown rice cooked", "us_rice_cup/brown"], ["wheat toast", "us_bread/whole_wheat"],
  ]),
  ...C("protein", "base", [
    ["baked chicken breast", "us_chicken_breast"], ["roasted turkey", "us_turkey_breast/roasted"], ["wild salmon", "us_salmon/wild"], ["atlantic salmon", "us_salmon/atlantic"], ["steamed shrimp", "us_shrimp/steamed"], ["tuna packed in water", "us_canned_tuna/in_water"], ["egg white", "us_egg_whites"], ["hard boiled eggs", "us_egg/boiled"], ["sirloin steak", "us_steak/sirloin"], ["chicken sausage", "us_sausage/chicken"], ["thick cut bacon", "us_bacon_strip/thick_cut"], ["extra lean ground beef", "us_ground_beef/extra_lean"], ["grilled turkey breast", "us_turkey_breast"], ["pan seared salmon", "us_salmon"], ["baked cod", "us_white_fish/cod"], ["boneless skinless chicken breast", "us_chicken_breast"], ["jumbo shrimp", "us_shrimp"], ["two eggs", "us_egg"], ["pork sausage links", "us_sausage/pork"], ["lean beef", "us_ground_beef/lean"], ["canned tuna in water", "us_canned_tuna/in_water"], ["crispy bacon", "us_bacon_strip"], ["ribeye steak", "us_steak/ribeye"], ["filet", "us_steak/filet"], ["fried egg sunny side", "us_egg/fried"],
  ]),
  ...C("dairy", "base", [
    ["american cheese", "us_cheese_slice/american"], ["nonfat greek yogurt", "us_greek_yogurt/nonfat"], ["low fat cottage cheese", "us_cottage_cheese/lowfat"], ["firm tofu", "us_tofu_us/firm"], ["unsweetened almond milk", "us_plant_milk/almond"], ["mozzarella cheese", "us_cheese_slice/mozzarella"], ["sliced swiss", "us_cheese_slice/swiss"], ["plain greek yogurt", "us_greek_yogurt"], ["whole milk greek yogurt", "us_greek_yogurt/whole"], ["extra firm tofu", "us_tofu_us/extra_firm"], ["unsweetened soy milk", "us_plant_milk/soy"], ["almond milk unsweetened", "us_plant_milk/almond"], ["4% cottage cheese", "us_cottage_cheese/4pct"],
  ]),
  ...C("produce", "base", [
    ["romaine lettuce", "us_salad_greens/romaine"], ["mixed greens", "us_salad_greens/mixed"], ["pinto beans", "us_beans_legumes/pinto"], ["sweet corn", "us_corn"], ["frozen vegetables", "us_mixed_veg/frozen"], ["stir fry vegetables", "us_mixed_veg/stir_fry"], ["raw broccoli", "us_broccoli/raw"], ["roasted broccoli", "us_broccoli/roasted"], ["strawberry", "us_berries/strawberry"], ["granny smith apple", "us_apple"], ["black bean", "us_beans_legumes/black_beans"], ["steamed spinach", "us_salad_greens/spinach"], ["broccoli florets", "us_broccoli"], ["canned black beans", "us_beans_legumes/black_beans"], ["cooked lentils", "us_beans_legumes/lentils"], ["sliced banana", "us_banana"], ["red apple", "us_apple"], ["fresh strawberries", "us_berries/strawberry"], ["seedless grapes", "us_grapes"], ["navel orange", "us_orange"], ["fresh blueberries", "us_berries/blueberry"], ["honeydew melon", "us_melon/honeydew"], ["corn kernels", "us_corn"], ["mixed salad greens", "us_salad_greens/mixed"],
  ]),
  ...C("fats", "base", [
    ["unsalted butter", "us_butter/unsalted"], ["light mayo", "us_mayo_tbsp/light"], ["natural peanut butter", "us_peanut_butter"], ["powdered peanut butter", "us_peanut_butter/powdered"], ["cashew nuts", "us_nuts_mixed/cashews"], ["walnut", "us_nuts_mixed/walnuts"], ["light ranch", "us_ranch_tbsp/light"], ["salted butter", "us_butter"], ["avocado oil", "us_olive_oil"], ["sliced almonds", "us_nuts_mixed/almonds"], ["ranch dressing", "us_ranch_tbsp"], ["mayonnaise", "us_mayo_tbsp"], ["creamy peanut butter", "us_peanut_butter"], ["unsalted butter stick", "us_butter/unsalted"],
  ]),
  ...C("sandwich", "base", [
    ["single patty cheeseburger", "us_cheeseburger/single"], ["veggie sub", "us_deli_sub/veggie"], ["bacon lettuce tomato", "us_blt"], ["chili cheese dog", "us_hot_dog/chili_cheese"], ["italian hoagie", "us_deli_sub/italian"], ["plain hot dog", "us_hot_dog/plain"], ["bacon double cheeseburger", ["us_cheeseburger/bacon","us_cheeseburger/double"]], ["turkey and swiss sandwich", "us_deli_sub/turkey"], ["italian sandwich", "us_deli_sub/italian"], ["vegetable sub", "us_deli_sub/veggie"], ["hot dog with chili", "us_hot_dog/chili_cheese"], ["grilled chicken wrap", "us_wrap"], ["chicken sandwich grilled", "us_chicken_sandwich/grilled"], ["jelly sandwich", "us_pbj"], ["cheese toastie", "us_grilled_cheese"],
  ]),
  ...C("pizza-pasta", "base", [
    ["penne with marinara", "us_pasta_tomato"], ["pepperoni slice", "us_pizza_pepperoni/pepperoni"], ["sausage and pepperoni pizza", "us_pizza_pepperoni"], ["rigatoni with meat sauce", "us_pasta_meat"], ["tomato basil pasta", "us_pasta_tomato"], ["lasagna slice", "us_lasagna"], ["alfredo pasta", "us_pasta_alfredo"],
  ]),
  ...C("chicken", "base", [
    ["bbq chicken wings", "us_wings/bbq"], ["original fried chicken", "us_fried_chicken/original"], ["grilled rotisserie chicken", "us_rotisserie_grilled"], ["crispy chicken tenders", "us_tenders_nuggets"], ["honey bbq wings", "us_wings/bbq"], ["lemon pepper wings", "us_wings"], ["fried chicken drumsticks", "us_fried_chicken"], ["southern fried chicken", "us_fried_chicken"], ["whole rotisserie chicken", "us_rotisserie_grilled"], ["chicken and waffle", "us_chicken_and_waffles"],
  ]),
  ...C("mexican", "base", [
    ["chicken fajitas", "us_fajitas"], ["beef enchiladas", "us_enchiladas"], ["chicken tacos", "us_tacos"], ["carnitas tacos", "us_tacos"], ["veggie quesadilla", "us_quesadilla"], ["beef nachos", "us_nachos"], ["shrimp fajitas", "us_fajitas"], ["cheese enchiladas", "us_enchiladas"], ["burrito bowl with chicken", "us_burrito_bowl"], ["bean and rice burrito", ["us_burrito/veggie","us_burrito"]],
  ]),
  ...C("plates", "base", [
    ["smoked brisket", "us_bbq_plate/brisket"], ["pork pot pie", "us_pot_pie"], ["grilled fish plate", ["us_seafood_plate/grilled","us_seafood_plate"]], ["grilled steak with potatoes", "us_steak_potato"], ["bbq brisket plate", "us_bbq_plate/brisket"], ["pulled pork plate", "us_bbq_plate/pulled_pork"], ["roast beef with gravy", "us_roast_plate"], ["pot pie", "us_pot_pie"], ["bbq plate", "us_bbq_plate"],
  ]),
  ...C("soup", "base", [
    ["cream of mushroom soup", "us_soup_creamy/cream_of_x"], ["cajun gumbo", "us_stew_gumbo/gumbo"], ["cream of chicken soup", "us_soup_creamy/cream_of_x"], ["vegetarian chili", "us_chili/veggie"], ["white chicken chili", "us_chili"], ["cream of tomato soup", ["us_soup_light/tomato","us_soup_creamy"]], ["seafood gumbo", "us_stew_gumbo/gumbo"], ["beef and vegetable stew", "us_stew_gumbo/beef_stew"], ["creamy broccoli soup", "us_soup_creamy/broccoli_cheddar"], ["tomato basil soup", "us_soup_light/tomato"],
  ]),
  ...C("asian", "base", [
    ["dragon roll", "us_sushi_roll/dragon"], ["beef fried rice", "us_lo_mein_fried_rice/fried_rice"], ["teriyaki chicken bowl", "us_teriyaki_bowl/chicken"], ["volcano roll", "us_sushi_roll"], ["shrimp pad thai", "us_pad_thai"], ["spicy ramen", "us_ramen_pho/ramen"], ["thai green curry chicken", "us_curry_asian/thai"], ["orange chicken and rice", "us_chinese_combo/orange_chicken"], ["kung pao chicken combo", "us_chinese_combo/kung_pao"],
  ]),
  ...C("snack-drink", "base", [
    ["vanilla ice cream", "us_ice_cream"], ["low fat ice cream", "us_ice_cream/low_fat"], ["rose wine", "us_wine/rosé"], ["wheat crackers", "us_crackers_snack/wheat"], ["sea salt potato chips", "us_chips/potato"], ["nacho cheese doritos", "us_chips"], ["double chocolate cookies", "us_cookies"], ["chocolate ice cream", "us_ice_cream"], ["diet pepsi", "us_soda/diet"], ["iced mocha", "us_coffee_drink"], ["caramel latte", "us_coffee_drink/latte"], ["sugar free red bull", "us_energy_drink/sugar_free"], ["berry smoothie", "us_smoothie/fruit_blend"], ["craft beer", "us_beer"], ["rose", "us_wine/rosé"], ["bourbon on the rocks", "us_cocktail"], ["margarita on the rocks", "us_cocktail/margarita"], ["gin tonic", "us_cocktail/gin_tonic"], ["cheese crackers", "us_crackers_snack"],
  ]),
  ...C("variants", "variant", [
    ["cheesburger", "us_cheeseburger"], ["speghetti", ["us_pasta_plain","us_pasta_tomato"]], ["sausages", "us_sausage"], ["strawberries and cream", "us_berries/strawberry"], ["Hamburgers", "us_hamburger"], ["mashed potatos", "us_potato/mashed"], ["pancackes", "us_pancakes_waffles/pancakes"], ["cheeseburgers", "us_cheeseburger"], ["stawberries", "us_berries/strawberry"], ["quesidilla", "us_quesadilla"],
  ]),
  ...C("noise", "variant", [
    ["qqqq", []], ["hjkl", []], ["blorp", []], ["xcvb", []], ["ggggg", []],
  ]),
  ...C("produce", "gap", [
    ["sauteed mushrooms", "bucket:veggies"], ["roasted carrots", "bucket:veggies"], ["pineapple chunks", "bucket:fruit"], ["mango slices", "bucket:fruit"], ["kiwi fruit", "bucket:fruit"], ["dried cranberries", "bucket:fruit"],
  ]),
  ...C("sandwich", "gap", [
    ["cuban sandwich", "bucket:burger_sandwich"],
  ]),
  ...C("plates", "gap", [
    ["lamb chops dinner", "bucket:american_plate"],
  ]),
  ...C("bowl-salad", "base", [
    ["greek salad with chicken", "us_entree_salad/greek"], ["southwest salad", "us_entree_salad"], ["chicken cobb salad", "us_entree_salad/cobb"], ["rice and bean bowl", "us_grain_bowl"], ["tuna fish salad", "us_protein_salad/tuna"], ["salmon poke", "us_poke_bowl"],
  ]),
  ...C("asian", "gap", [
    ["pork gyoza", "bucket:asian_takeout"],
  ]),
  ...C("breakfast", "base", [
    ["blueberry waffles", "us_pancakes_waffles/waffles"], ["stuffed french toast", "us_pancakes_waffles/french_toast"], ["egg and bacon plate", "us_eggs_bacon/bacon"], ["sausage egg and cheese croissant", "us_breakfast_sandwich"], ["sausage breakfast burrito", "us_breakfast_burrito"], ["avocado toast with egg", "us_avocado_toast"],
  ]),
  ...C("snack-drink", "gap", [
    ["chocolate truffles", "bucket:snack_drink"],
  ]),
  ...C("chain", "chain", [
    ["five guys fries", "us_potato/fries"], ["chipotle chicken burrito", "us_burrito/chicken"], ["starbucks mocha", "us_coffee_drink/latte"], ["dunkin latte", "us_coffee_drink/latte"], ["olive garden salad", "us_entree_salad"], ["panera chicken salad", "us_protein_salad/chicken"], ["subway tuna sub", "us_deli_sub"], ["dominos pepperoni pizza", "us_pizza_pepperoni/pepperoni"],
  ]),
  // ---- 2026-11-07 補充2 (語彙辞書を書いたあとに考えた語。辞書・別名表に入れない) ----
  ...C('sandwich', 'gap', [
    ['pimento cheese sandwich', 'bucket:burger_sandwich'], ['fluffernutter', 'bucket:burger_sandwich'], ['chopped cheese', 'bucket:burger_sandwich'],
    ['loose meat sandwich', 'bucket:burger_sandwich'], ['hot pocket', 'bucket:burger_sandwich'],
  ]),
  ...C('sandwich', 'base', [['turkey avocado wrap', 'us_wrap'], ['meatball parm sub', 'us_deli_sub'], ['chicken salad croissant', ['us_protein_salad/chicken', 'us_deli_sub']]]),
  ...C('pizza-pasta', 'gap', [['fusilli', 'bucket:pizza_pasta'], ['farfalle', 'bucket:pizza_pasta'], ['bucatini', 'bucket:pizza_pasta'], ['shrimp scampi pasta', 'bucket:pizza_pasta'], ['baked rigatoni', 'bucket:pizza_pasta']]),
  ...C('chicken', 'gap', [['hot honey chicken', 'bucket:chicken'], ['chicken pesto', 'bucket:chicken'], ['chicken bites', 'bucket:chicken'], ['sweet chili chicken', 'bucket:chicken']]),
  ...C('mexican', 'gap', [['pupusa', 'bucket:mexican'], ['arepa', 'bucket:mexican'], ['carne guisada', 'bucket:mexican'], ['street corn', 'bucket:mexican'], ['sopaipilla', 'bucket:mexican']]),
  ...C('plates', 'gap', [['pork belly dinner', 'bucket:american_plate'], ['cod dinner', 'bucket:american_plate'], ['steak frites', 'bucket:american_plate'], ['bacon wrapped scallops', 'bucket:american_plate'], ['turkey meatloaf', 'bucket:american_plate']]),
  ...C('soup', 'gap', [['avgolemono', 'bucket:soup_stew'], ['cabbage soup', 'bucket:soup_stew'], ['butternut squash soup', 'bucket:soup_stew'], ['white bean soup', 'bucket:soup_stew'], ['kale and sausage soup', 'bucket:soup_stew']]),
  ...C('bowl-salad', 'gap', [['spicy tuna bowl', 'bucket:bowl_salad'], ['burrata salad', 'bucket:bowl_salad'], ['pear gorgonzola salad', 'bucket:bowl_salad'], ['lentil bowl', 'bucket:bowl_salad'], ['cottage cheese bowl', 'bucket:bowl_salad']]),
  ...C('asian', 'gap', [['mapo tofu', 'bucket:asian_takeout'], ['garlic noodles', 'bucket:asian_takeout'], ['basil chicken', 'bucket:asian_takeout'], ['szechuan beef', 'bucket:asian_takeout'], ['cold sesame noodles', 'bucket:asian_takeout'], ['tofu stir fry', 'bucket:asian_takeout']]),
  ...C('breakfast', 'gap', [['eggs florentine', 'bucket:breakfast'], ['breakfast quesadilla', 'bucket:breakfast'], ['protein oatmeal', 'bucket:breakfast'], ['apple pancakes', 'bucket:breakfast'], ['sausage gravy skillet', 'bucket:breakfast']]),
  ...C('snack-drink', 'gap', [
    ['lemon bar', 'bucket:snack_drink'], ['rice pudding', 'bucket:snack_drink'], ['oatmeal raisin cookie', 'bucket:snack_drink'], ['strawberry shortcake', 'bucket:snack_drink'], ['angel food cake', 'bucket:snack_drink'],
    ['slushie', 'bucket:snack_drink'], ['shirley temple', 'bucket:snack_drink'], ['dole whip', 'bucket:snack_drink'], ['cotton candy', 'bucket:snack_drink'], ['beef stick', 'bucket:fatty_protein'],
  ]),
  ...C('produce', 'gap', [['butter lettuce', 'bucket:veggies'], ['spaghetti squash', 'bucket:veggies'], ['watermelon radish', 'bucket:veggies'], ['starfruit', 'bucket:fruit'], ['passion fruit', 'bucket:fruit'], ['sliced peaches', 'bucket:fruit']]),

  // ---- 2026-11-07 補充3 (規則・辞書・別名表を固定したあとに書いた語。ラベルは測定の前に固定。固定後の一発測定用) ----
  ...C('mexican', 'base', [
    ['steak quesadilla', 'us_quesadilla'], ['chicken enchiladas', 'us_enchiladas'], ['pork tacos', 'us_tacos'], ['shrimp tacos', 'us_tacos'], ['fish burrito', 'us_burrito'],
  ]),
  ...C('sandwich', 'base', [['cheeseburger deluxe', 'us_cheeseburger'], ['junior cheeseburger', 'us_cheeseburger'], ['mushroom swiss burger', 'us_cheeseburger'], ['spicy chicken sandwich', 'us_chicken_sandwich']]),
  ...C('pizza-pasta', 'base', [['sausage pizza slice', 'us_pizza_pepperoni'], ['ham and pineapple pizza', 'us_pizza_pepperoni'], ['whole wheat spaghetti', 'us_pasta_plain/whole_grain'], ['gluten free pasta', 'us_pasta_plain']]),
  ...C('bowl-salad', 'base', [['greek chicken salad', 'us_entree_salad/greek'], ['steak caesar salad', 'us_entree_salad/caesar'], ['shrimp caesar salad', 'us_entree_salad/caesar'], ['teriyaki salmon bowl', 'us_teriyaki_bowl/salmon']]),
  ...C('protein', 'base', [['grilled shrimp', 'us_shrimp'], ['garlic shrimp', 'us_shrimp'], ['baked salmon', 'us_salmon'], ['blackened salmon', 'us_salmon']]),
  ...C('dairy', 'base', [['organic whole milk', 'us_milk/whole'], ['chocolate soy milk', 'us_plant_milk/soy'], ['vanilla almond milk', 'us_plant_milk/almond'], ['vanilla greek yogurt', 'us_greek_yogurt'], ['strawberry yogurt', 'us_greek_yogurt']]),
  ...C('grains', 'base', [['blueberry bagel', 'us_bagel'], ['cooked white rice', 'us_rice_cup/white'], ['steamed brown rice', 'us_rice_cup/brown'], ['sweet corn on the cob', 'us_corn/on_cob'], ['creamed corn', 'us_corn']]),
  ...C('snack-drink', 'base', [
    ['strawberry ice cream', 'us_ice_cream'], ['mint chocolate chip ice cream', 'us_ice_cream'], ['diet dr pepper', 'us_soda/diet'], ['cherry coke', 'us_soda'], ['ipa beer', 'us_beer/ipa'], ['light lager', 'us_beer/light'],
    ['vodka tonic', 'us_cocktail'], ['oat milk latte', 'us_coffee_drink/latte'], ['iced vanilla latte', 'us_coffee_drink/latte'], ['iced caramel coffee', 'us_coffee_drink/iced_coffee'],
  ]),
  ...C('soup', 'base', [['chicken noodle soup bowl', 'us_soup_light/chicken_noodle'], ['bbq pulled pork plate', 'us_bbq_plate/pulled_pork']]),
];
