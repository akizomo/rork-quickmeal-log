/**
 * US 版 検索品質ベンチマーク — 新しい語の第1束 (2026-11-09)。
 *
 * 目的: 55.8% (規則固定後に書いた43語) だった汎化を、80% に近づける作業の出発点を、**偏りの少ない新しい語**で測り直す。
 *
 * 書き方 (汚染を避けるため):
 *   - 書いたのは **検索の規則・別名・語彙辞書を開く前**。DB の Identity 一覧 (id・名前・種類) だけを見て、期待値の着地先を付けた。
 *   - アメリカ人が実際に打つ形に寄せた: 複数形 / 語順の入れ替え / 量つき ("2 eggs") / 略語 / 一般的な誤字 / 商品名。
 *   - 期待値は「正しい着地先がどこか」で付けた。今の検索がどこに着地するかは見ていない。
 *   - DB に専用の食品が無いものは kind='gap' (同じバケットに着地すれば可)。
 *
 * 経過: この束で失敗を型に分けて直した (仕組み: 部分一致の文脈の数え方 / 綴り直し / 量・大きさの語の取り除き / バケットの一般名 /
 *   食材が打った語そのままを持つとき一皿料理の種類を下げる / 前置きの量 / 句読点・my)。**直したので、この束はチューニング用へ移した**
 *   (search-benchmark.us.corpus.test-data.ts が読み込む)。汎化の測定には使えない — 新しい束で測り直す。
 *   書いた380語のうち、チューニング用・ホールドアウトと同じ語は除いた (231語が重なっていた)。
 */
import { C, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const US_FRESH1_CORPUS: Item[] = [
  ...C('grains', 'base', [
    ['wheat bread', 'us_bread/whole_wheat'], ['garlic bread', 'us_bread'], ['slice of bread', 'us_bread'], ['jasmine rice', 'us_rice_cup/white'],
    ['basmati rice', 'us_rice_cup/white'], ['1 cup rice', 'us_rice_cup'], ['rice white', 'us_rice_cup/white'], ['penne', 'us_pasta_plain'],
    ['spaghetti noodles', 'us_pasta_plain'], ['steel cut oats', 'us_oatmeal'], ['quaker oats', 'us_oatmeal'], ['bowl of oatmeal', 'us_oatmeal'],
    ['cheerios', 'us_cereal'], ['corn flakes', 'us_cereal'], ['tortillas', 'us_tortilla'], ['whole wheat tortilla', 'us_tortilla/whole_wheat'],
    ['plain bagel', 'us_bagel/plain'], ['bagels', 'us_bagel'], ['mashed potato', 'us_potato/mashed'], ['baked potatoes', 'us_potato/baked'],
    ['fries', 'us_potato/fries'], ['whole grain pasta', 'us_pasta_plain/whole_grain'], ['multigrain bread', 'us_bread'],
  ]),
  ...C('grains', 'gap', [
    ['english muffin', 'bucket:staple'], ['pita', 'bucket:staple'], ['naan', 'bucket:staple'], ['sweet potato', 'bucket:staple'],
    ['tater tots', 'bucket:staple'], ['sweet potato fries', 'bucket:staple'], ['couscous', 'bucket:staple'], ['quinoa', 'bucket:staple'],
  ]),
  ...C('protein', 'base', [
    ['chicken breasts', 'us_chicken_breast'], ['grilled chicken breast', 'us_chicken_breast/grilled'], ['chicken breast grilled', 'us_chicken_breast/grilled'],
    ['turkey', 'us_turkey_breast'], ['sliced turkey', 'us_turkey_breast/deli'],
    ['tilapia fillet', 'us_white_fish/tilapia'], ['prawns', 'us_shrimp'], ['tuna in water', 'us_canned_tuna/in_water'], ['tuna packet', 'us_canned_tuna'], ['2 eggs', 'us_egg'],
    ['sunny side up', 'us_egg/fried'], ['hard boiled egg', 'us_egg/boiled'], ['egg white', 'us_egg_whites'],
    ['hamburger meat', 'us_ground_beef'], ['ribeye steak', 'us_steak/ribeye'], ['new york strip', 'us_steak'], ['pork chops', 'us_pork_chop/chop'], ['bacon strips', 'us_bacon_strip'],
    ['breakfast sausage', 'us_sausage'],
    ['lox', 'us_salmon/smoked'], ['salmon fillet', 'us_salmon'], ['roasted turkey breast', 'us_turkey_breast/roasted'],
  ]),
  ...C('protein', 'gap', [
    ['fish sticks', 'bucket:lean_protein'], ['crab', 'bucket:lean_protein'], ['lobster', 'bucket:lean_protein'],
    ['scallops', 'bucket:lean_protein'], ['lamb chops', 'bucket:fatty_protein'], ['hot dog meat', 'bucket:fatty_protein'], ['prosciutto', 'bucket:fatty_protein'],
  ]),
  ...C('dairy', 'base', [
    ['milk 2%', 'us_milk/2pct'], ['fat free milk', 'us_milk/skim'],
    ['glass of milk', 'us_milk'], ['cheddar cheese', 'us_cheese_slice/cheddar'], ['string cheese', 'us_cheese_slice'], ['shredded cheese', 'us_cheese_slice'],
    ['american cheese', 'us_cheese_slice/american'], ['yoghurt', 'us_greek_yogurt'], ['nonfat greek yogurt', 'us_greek_yogurt/nonfat'], ['firm tofu', 'us_tofu_us/firm'], ]),
  ...C('dairy', 'gap', [
    ['half and half', 'bucket:dairy_soy'], ['parmesan', 'bucket:dairy_soy'], ['sour cream', 'bucket:dairy_soy'], ['whipped cream', 'bucket:dairy_soy'],
    ['kefir', 'bucket:dairy_soy'], ['feta', 'bucket:dairy_soy'], ['protein powder', 'bucket:dairy_soy'], ['edamame', 'bucket:dairy_soy'],
  ]),
  ...C('produce', 'base', [
    ['broccoli florets', 'us_broccoli'], ['romaine lettuce', 'us_salad_greens/romaine'], ['frozen veggies', 'us_mixed_veg/frozen'], ['raspberries', 'us_berries'], ['clementine', 'us_orange'], ['mixed berries', 'us_berries/mixed'], ['a banana', 'us_banana'], ]),
  ...C('produce', 'gap', [
    ['refried beans', 'bucket:veggies'], ['lemon', 'bucket:fruit'], ['dried fruit', 'bucket:fruit'], ['raisins', 'bucket:fruit'], ['coconut', 'bucket:fruit'],
  ]),
  ...C('fats', 'base', [
    ['evoo', 'us_olive_oil'], ['salted butter', 'us_butter/regular'], ['mayonnaise', 'us_mayo_tbsp'], ['trail mix', 'us_nuts_mixed'], ['hummus', 'us_dip_spread/hummus'],
    ['guac', 'us_dip_spread/guacamole'], ['creamy peanut butter', 'us_peanut_butter'],
  ]),
  ...C('fats', 'gap', [
    ['ketchup', 'bucket:added_fat'], ['bbq sauce', 'bucket:added_fat'], ['soy sauce', 'bucket:added_fat'], ['caesar dressing', 'bucket:added_fat'],
    ['coconut oil', 'bucket:added_fat'], ['almond butter', 'bucket:added_fat'], ['salsa', 'bucket:added_fat'], ['honey', 'bucket:added_fat'], ['jam', 'bucket:added_fat'],
  ]),
  ...C('sandwich', 'base', [
    ['cheeseburgar', 'us_cheeseburger'],
    ['grilled cheese sandwich', 'us_grilled_cheese'],
    ['blt sandwich', 'us_blt'], ['hot dogs', 'us_hot_dog'], ['chicken wrap', 'us_wrap'],
    ['pb and j', 'us_pbj'], ['veggie sub', 'us_deli_sub/veggie'], ]),
  ...C('sandwich', 'gap', [
    ['tuna sandwich', 'bucket:burger_sandwich'], ]),
  ...C('pizza-pasta', 'base', [
    ['pizza slice', 'us_pizza_pepperoni'], ['pepperonni pizza', 'us_pizza_pepperoni/pepperoni'],
    ['slice of cheese pizza', 'us_pizza_cheese'], ['spaghetti with marinara', 'us_pasta_tomato'],
    ['chicken alfredo', 'us_pasta_alfredo'], ['macaroni and cheese', 'us_mac_cheese'], ['mac and cheeze', 'us_mac_cheese'], ['lasagne', 'us_lasagna'], ['bolognese', 'us_pasta_meat'],
  ]),
  ...C('pizza-pasta', 'gap', [
    ['ravioli', 'bucket:pizza_pasta'], ['gnocchi', 'bucket:pizza_pasta'], ['garlic knots', 'bucket:pizza_pasta'],
  ]),
  ...C('chicken', 'base', [
    ['chicken strips', 'us_tenders_nuggets'], ['popcorn chicken', 'us_tenders_nuggets'],
    ['hot wings', 'us_wings/buffalo'], ['wings', 'us_wings'],
    ['southern fried chicken', 'us_fried_chicken'],
  ]),
  ...C('chicken', 'gap', [['chicken drumstick', 'bucket:chicken'], ['chicken thighs', 'bucket:chicken']]),
  ...C('mexican', 'base', [
    ['burito', 'us_burrito'],
    ['crunchy taco', 'us_tacos/crunchy'], ['quesadillas', 'us_quesadilla'], ['cheese quesadilla', 'us_quesadilla'], ['loaded nachos', 'us_nachos'], ['enchilada', 'us_enchiladas'],
    ['chicken fajitas', 'us_fajitas'], ]),
  ...C('mexican', 'gap', [['tamales', 'bucket:mexican'], ['chimichanga', 'bucket:mexican'], ['taco salad', 'bucket:mexican'], ['queso', 'bucket:mexican'], ['tostada', 'bucket:mexican']]),
  ...C('plates', 'base', [
    ['turkey dinner', 'us_roast_plate/turkey'], ]),
  ...C('plates', 'gap', [['shrimp and grits', 'bucket:american_plate'], ['salisbury steak', 'bucket:american_plate'], ['cornbread', 'bucket:american_plate'], ['tv dinner', 'bucket:american_plate']]),
  ...C('soup', 'base', [
    ['cream of mushroom soup', 'us_soup_creamy/cream_of_x'],
    ]),
  ...C('soup', 'gap', [['french onion soup', 'bucket:soup_stew'], ['minestrone', 'bucket:soup_stew'], ['lentil soup', 'bucket:soup_stew'], ['split pea soup', 'bucket:soup_stew']]),
  ...C('bowl-salad', 'base', [
    ['chicken caesar salad', 'us_entree_salad/caesar'],
    ['buddha bowl', 'us_grain_bowl'],
  ]),
  ...C('bowl-salad', 'gap', [['chef salad', 'bucket:bowl_salad'], ['coleslaw', 'bucket:bowl_salad'], ['potato salad', 'bucket:bowl_salad'], ['pasta salad', 'bucket:bowl_salad']]),
  ...C('asian', 'base', [
    ['general tsos chicken', 'us_chinese_combo/general_tso'], ['chicken teriyaki', 'us_teriyaki_bowl/chicken'],
    ['butter chicken', 'us_curry_asian/indian'], ['green curry', 'us_curry_asian/thai'],
  ]),
  ...C('asian', 'gap', [['potstickers', 'bucket:asian_takeout'], ['sesame chicken', 'bucket:asian_takeout'], ['wonton soup', 'bucket:asian_takeout'], ['bibimbap', 'bucket:asian_takeout']]),
  ...C('breakfast', 'base', [
    ['scrambled eggs and bacon', 'us_eggs_bacon/bacon'], ['eggs and sausage', 'us_eggs_bacon/sausage'], ['sausage egg and cheese', 'us_breakfast_sandwich'],
    ['bacon egg and cheese', 'us_breakfast_sandwich'], ['avacado toast', 'us_avocado_toast'], ]),
  ...C('breakfast', 'gap', [['hash browns', 'bucket:breakfast'], ['omelet', 'bucket:breakfast'], ['yogurt parfait', 'bucket:breakfast']]),
  ...C('snack-drink', 'base', [
    ['doritos', 'us_chips/tortilla'],
    ['chocolate chip cookies', 'us_cookies/chocolate_chip'], ['oreos', 'us_cookies/oreo'], ['vanilla ice cream', 'us_ice_cream'], ['diet coke', 'us_soda/diet'], ['sprite', 'us_soda'], ['pepsi', 'us_soda'], ['saltines', 'us_crackers_snack'], ['monster', 'us_energy_drink'], ['protein shake', 'us_smoothie/protein'],
    ['unsweetened tea', 'us_sweet_tea/unsweet'], ['white claw', 'us_hard_seltzer'], ['muffin', 'us_pastry/muffin'],
    ['croissant', 'us_pastry/croissant'], ['cinnamon roll', 'us_pastry'], ['cheesecake', 'us_dessert/cheesecake'], ['apple pie', 'us_dessert/pie'],
    ['chocolate cake', 'us_dessert/cake'], ['glass of orange juice', 'us_juice/orange'], ['cup of coffee', 'us_coffee_drink'],
  ]),
  ...C('snack-drink', 'gap', [['gatorade', 'bucket:snack_drink'], ['candy', 'bucket:snack_drink'], ['chocolate bar', 'bucket:snack_drink'], ['gummy bears', 'bucket:snack_drink'],
    ['lemonade', 'bucket:snack_drink'], ['vodka soda', 'bucket:snack_drink'], ['fruit snacks', 'bucket:snack_drink'],
    ['cappuccino', 'bucket:snack_drink'], ['black coffee', 'bucket:snack_drink']]),
];
