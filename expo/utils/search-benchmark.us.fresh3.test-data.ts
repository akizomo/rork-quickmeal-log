/**
 * US 版 検索品質ベンチマーク — 新しい語の第3束 (2026-11-09、第2束の失敗を直したあと)。
 *
 * **これが「直したあとの汎化」を測る束**。規則・別名・語彙辞書は、この束の語を見ずに直した。
 * 第1束・第2束は見て直したので、すでにチューニング用 (search-benchmark.us.corpus.test-data.ts) に移してある。
 * この束の失敗の中身を見て直したら、同じ手順でチューニング用へ移し、第4束を書く。
 *
 * 書き方: 第1・2束と別の角度を狙った — 言い方の型ではなく、**食品の種類を広く**: 家庭料理・外食・コンビニ・スーパーの商品・
 * 子ども向け・健康志向・アメリカの地方料理・祝日の料理・缶詰やレトルト。期待値は DB の Identity 一覧だけを見て付けた。
 * 既存の語 (チューニング用・ホールドアウト・別名表・語彙辞書) は、読み込み側で除いて数える。
 */
import { C, type Item } from './search-benchmark.corpus.test-data';

// prettier-ignore
export const US_FRESH3_CORPUS: Item[] = [
  ...C('home', 'base', [
    ['scrambled eggs and toast', 'us_eggs_bacon'], ['oatmeal with banana and peanut butter', 'us_oatmeal'], ['peanut butter banana toast', 'us_bread'], ['avocado and egg toast', 'us_avocado_toast'],
    ['chicken and rice', 'us_rice_cup'], ['grilled cheese and tomato soup', 'us_grilled_cheese'], ['mac and cheese with broccoli', 'us_mac_cheese'], ['baked potato with cheese and broccoli', 'us_potato/baked'],
    ['turkey meatballs', 'us_ground_beef'], ['taco tuesday tacos', 'us_tacos'], ['sheet pan chicken and vegetables', 'us_chicken_breast'], ['slow cooker pulled pork', 'us_bbq_plate/pulled_pork'],
    ['air fryer chicken wings', 'us_wings'], ['instant pot chili', 'us_chili'], ['crockpot beef stew', 'us_stew_gumbo/beef_stew'], ['homemade pizza', 'us_pizza_pepperoni'],
    ['homemade chicken noodle soup', 'us_soup_light/chicken_noodle'], ['egg muffin cups', 'us_egg'], ['cauliflower rice', 'us_mixed_veg'], ['zucchini noodles', 'us_mixed_veg'],
  ]),
  ...C('home', 'gap', [['tuna melt', 'bucket:burger_sandwich'], ['deviled eggs', 'bucket:egg'], ['sweet potato casserole', 'bucket:american_plate'], ['green bean casserole', 'bucket:american_plate'], ['cranberry sauce', 'bucket:added_fat']]),
  ...C('store', 'base', [
    ['lean cuisine', 'us_casserole'], ['hot pockets', 'us_pizza_pepperoni'], ['frozen pizza', 'us_pizza_pepperoni'], ['frozen burrito', 'us_burrito'], ['microwave mac and cheese', 'us_mac_cheese'],
    ['canned chili', 'us_chili'], ['canned soup', 'us_soup_light'], ['ramen noodles cup', 'us_ramen_pho/ramen'], ['rotisserie chicken from costco', 'us_rotisserie_grilled'],
    ['deli turkey sandwich', 'us_deli_sub/turkey'], ['store bought hummus', 'us_dip_spread/hummus'], ['string cheese stick', 'us_cheese_slice'], ['greek yogurt cup', 'us_greek_yogurt'],
    ['protein shake ready to drink', 'us_smoothie/protein'], ['premier protein shake', 'us_smoothie/protein'], ['clif bar', 'us_protein_bar'], ['rx bar', 'us_protein_bar'], ['kind bar', 'us_protein_bar'],
  ]),
  ...C('store', 'gap', [['pop tarts', 'bucket:snack_drink'], ['lunchables', 'bucket:snack_drink'], ['tv dinner meal', 'bucket:american_plate'], ['instant ramen', 'bucket:asian_takeout'], ['beef jerky', 'bucket:fatty_protein'], ['jerky', 'bucket:fatty_protein']]),
  ...C('kids', 'base', [
    ['chicken nuggets and fries', 'us_tenders_nuggets'], ['peanut butter and jelly sandwich', 'us_pbj'], ['mac and cheese kids meal', 'us_mac_cheese'], ['cheese quesadilla for kids', 'us_quesadilla'], ['applesauce', 'us_apple'],
    ['goldfish crackers', 'us_crackers_snack'], ['string cheese and apple slices', 'us_cheese_slice'], ['chocolate milk', 'us_milk'], ['juice box', 'us_juice'], ['pb and j', 'us_pbj'], ['cheese pizza slice', 'us_pizza_cheese'],
  ]),
  ...C('health', 'base', [
    ['grilled chicken salad', 'us_protein_salad/chicken'], ['quinoa salad', 'us_grain_bowl'], ['salmon and asparagus', 'us_salmon'], ['turkey burger', 'us_hamburger'], ['veggie burger', 'us_hamburger'], ['lettuce wrap burger', 'us_hamburger'],
    ['egg white omelet', 'us_egg_whites'], ['low carb wrap', 'us_wrap'], ['protein pancakes', 'us_pancakes_waffles/pancakes'], ['cottage cheese and fruit', 'us_cottage_cheese'], ['chia pudding', 'us_oatmeal'],
    ['smoothie bowl', 'us_smoothie'], ['acai bowl', 'us_smoothie'], ['green juice', 'us_juice'], ['protein oatmeal', 'us_oatmeal'], ['keto wrap', 'us_wrap'], ['cauliflower pizza', 'us_pizza_pepperoni'],
  ]),
  ...C('regional', 'base', [
    ['chicago deep dish pizza', 'us_pizza_pepperoni'], ['new york slice', 'us_pizza_cheese'], ['buffalo chicken wings', 'us_wings/buffalo'], ['philly cheesesteak sandwich', 'us_deli_sub'], ['texas chili', 'us_chili/con_carne'],
    ['new england clam chowder', 'us_soup_creamy/clam_chowder'], ['louisiana gumbo', 'us_stew_gumbo/gumbo'], ['carolina pulled pork', 'us_bbq_plate/pulled_pork'], ['kansas city bbq ribs', 'us_bbq_plate/ribs'],
    ['southern fried chicken', 'us_fried_chicken'], ['biscuits and gravy breakfast', 'us_breakfast_sandwich'], ['california burrito', 'us_burrito'], ['breakfast tacos', 'us_tacos'], ['tex mex nachos', 'us_nachos'],
  ]),
  ...C('holiday', 'base', [
    ['thanksgiving turkey dinner', 'us_roast_plate/turkey'], ['christmas ham dinner', 'us_roast_plate/ham'], ['pumpkin pie slice', 'us_dessert/pie'], ['apple pie a la mode', 'us_dessert/pie'],
    ['birthday cake', 'us_dessert/cake'], ['cupcake', 'us_dessert/cake'], ['sugar cookies', 'us_cookies'], ['eggnog', 'us_milk'], ['hot cocoa', 'us_coffee_drink'], ['mashed potatoes and gravy', 'us_potato/mashed'],
  ]),
  ...C('eating-out', 'base', [
    ['chicken parmesan', 'us_pasta_tomato'], ['shrimp scampi', 'us_pasta_alfredo'], ['steakhouse salad', 'us_entree_salad'], ['burger and fries', 'us_cheeseburger'], ['fish tacos', 'us_tacos'], ['carne asada burrito', 'us_burrito/beef'],
    ['chicken tikka masala with naan', 'us_curry_asian/indian'], ['pad see ew', 'us_pad_thai'], ['sushi combo', 'us_sushi_roll'], ['bibimbap bowl', 'us_grain_bowl'], ['burrito bowl chicken', 'us_burrito_bowl'],
    ['subway turkey sub', 'us_deli_sub/turkey'], ['six inch italian sub', 'us_deli_sub/italian'], ['footlong veggie sub', 'us_deli_sub/veggie'], ['chick fil a nuggets', 'us_tenders_nuggets'],
    ['big mac', 'us_cheeseburger/double'], ['whopper', 'us_cheeseburger'], ['mcchicken', 'us_chicken_sandwich'], ['egg mcmuffin', 'us_breakfast_sandwich/english_muffin'], ['sausage mcmuffin', 'us_breakfast_sandwich/english_muffin'],
  ]),
  ...C('drinks', 'base', [
    ['iced vanilla latte', 'us_coffee_drink/latte'], ['caramel frappuccino', 'us_coffee_drink/frappuccino'], ['oat milk latte', 'us_coffee_drink/latte'], ['dunkin iced coffee', 'us_coffee_drink/iced_coffee'], ['pumpkin spice latte', 'us_coffee_drink/latte'],
    ['arnold palmer', 'us_sweet_tea/half_half'], ['sweet tea', 'us_sweet_tea/sweet'], ['unsweetened iced tea', 'us_sweet_tea/unsweet'], ['mountain dew', 'us_soda/regular'], ['dr pepper', 'us_soda/regular'], ['ginger ale', 'us_soda/regular'],
    ['coke zero', 'us_soda/diet'], ['sparkling water', 'us_soda/diet'], ['gatorade', 'us_energy_drink'], ['celsius energy drink', 'us_energy_drink'], ['margarita on the rocks', 'us_cocktail/margarita'],
    ['gin and tonic', 'us_cocktail/gin_tonic'], ['glass of red wine', 'us_wine/red'], ['pint of beer', 'us_beer'], ['michelob ultra', 'us_beer/light'], ['white claw mango', 'us_hard_seltzer/flavored'],
  ]),
];
