/**
 * US 版 検索カバレッジの外部基準 (日本版は search-coverage.baseline.test-data.ts)。
 *
 * 自分たちの DB の外から「アメリカで日常的に食べられる食べ物」を並べ、検索がその名前を知って
 * いるかを測る。DB に合わせて語を選ばない (DB に無いものを足せないと、物差しにならない)。
 *
 * 軸 (src):
 *   usda   … USDA の食事調査 (WWEIA / What We Eat in America) の食品カテゴリごとの、日常的な食品
 *   home   … 家庭料理・定番の一皿・サンドイッチ・朝食
 *   chain  … 主要チェーンの定番 (商品名も含む。ユーザーは商品名で打つため一般名に直さない)
 *   drink  … 飲料・酒・間食・菓子
 *
 * ⚠ **この一覧は NHANES/WWEIA の摂取量から機械的に抽出したものではない。** 作成者 (Claude) の知識から、
 *   上の軸ごとに網羅的に挙げたもの。網羅性の保証ではなく、「内製語彙では見えなかった穴を別の角度から
 *   洗う」ための第2の物差し。英語のテスターの未ヒット語が集まったら、そちらを正本にして足していく。
 *   語を足すときは、DB を見ずに「その軸で普通に出てくる名前」を足すこと。
 *   (初版の 2026-11-07 は、US の DB 一覧を一度見たあとに書いている。その影響で、DB にある名前に
 *    寄っている可能性がある。次の補充は DB を見ない状態で行い、初版との差を数字で比べる。)
 *
 * 区切りは「,」と改行 (英語は語の中に空白が入るため、日本版の空白区切りは使えない)。
 */
export interface BaselineTerm {
  q: string;
  src: 'usda' | 'home' | 'chain' | 'drink';
  group: string;
}

const T = (src: BaselineTerm['src'], group: string, terms: string): BaselineTerm[] =>
  terms.split(/\s*[,\n]\s*/).map((s) => s.trim()).filter(Boolean).map((q) => ({ q, src, group }));

// prettier-ignore
export const US_COVERAGE_BASELINE: BaselineTerm[] = [
  // ---- usda: 乳製品・卵 ----
  ...T('usda', 'dairy', `milk, whole milk, skim milk, 2% milk, chocolate milk, almond milk, oat milk, soy milk, buttermilk, half and half,
    heavy cream, cream cheese, sour cream, yogurt, greek yogurt, vanilla yogurt, kefir, cottage cheese, cheddar cheese, mozzarella,
    swiss cheese, american cheese, parmesan, string cheese, brie, feta, goat cheese, ricotta, cheese slice, shredded cheese, cheese stick`),
  ...T('usda', 'eggs', `egg, boiled egg, hard boiled egg, fried egg, scrambled eggs, poached egg, omelette, egg whites, deviled eggs,
    egg salad, frittata, quiche`),
  // ---- usda: 肉・魚 ----
  ...T('usda', 'meat', `ground beef, hamburger patty, steak, ribeye, sirloin, filet mignon, flank steak, roast beef, pot roast, beef jerky,
    pork chop, pork loin, pork tenderloin, bacon, ham, sausage, italian sausage, bratwurst, ribs, baby back ribs, pulled pork, brisket,
    lamb chop, chicken breast, chicken thigh, chicken drumstick, chicken wings, ground turkey, turkey breast, deli turkey, deli meat,
    roast turkey, duck, hot dog, meatballs, pepperoni, salami, corned beef, turkey bacon`),
  ...T('usda', 'seafood', `salmon, tuna, canned tuna, tilapia, cod, shrimp, crab, crab cakes, lobster, lobster roll, scallops, oysters, clams,
    sardines, mahi mahi, catfish, fish sticks, fish fillet, smoked salmon, calamari, fish and chips`),
  // ---- usda: 穀類・パン ----
  ...T('usda', 'grains', `bread, white bread, whole wheat bread, sourdough bread, rye bread, bagel, english muffin, croissant, biscuit,
    dinner roll, tortilla, flour tortilla, corn tortilla, pita bread, naan, rice, white rice, brown rice, wild rice, pasta, spaghetti,
    penne, macaroni, egg noodles, ramen noodles, couscous, quinoa, oatmeal, cereal, granola, corn flakes, cheerios, grits, cornbread,
    toast, saltine crackers, rice cakes, buns, hamburger bun, hot dog bun`),
  // ---- usda: 野菜・いも ----
  ...T('usda', 'vegetables', `broccoli, carrots, spinach, kale, lettuce, romaine, mixed greens, tomato, cucumber, onion, bell pepper, celery,
    cauliflower, cabbage, brussels sprouts, asparagus, green beans, peas, corn, zucchini, mushrooms, eggplant, squash, butternut squash,
    sweet potato, potato, baked potato, mashed potatoes, french fries, hash browns, tater tots, avocado, beets, artichoke, sauerkraut,
    pickles, coleslaw, edamame, salsa, guacamole, hummus`),
  // ---- usda: 豆・ナッツ ----
  ...T('usda', 'legumes-nuts', `black beans, kidney beans, pinto beans, chickpeas, lentils, baked beans, refried beans, peanuts, peanut butter,
    almonds, walnuts, cashews, pistachios, pecans, trail mix, sunflower seeds, chia seeds, almond butter, nutella`),
  // ---- usda: 果物 ----
  ...T('usda', 'fruit', `apple, banana, orange, grapes, strawberries, blueberries, raspberries, blackberries, watermelon, cantaloupe, pineapple,
    mango, peach, pear, cherries, kiwi, grapefruit, lemon, plum, applesauce, raisins, dried cranberries, fruit salad, dates, clementine,
    pomegranate`),
  // ---- usda: 油脂・ソース ----
  ...T('usda', 'fats-sauces', `butter, margarine, olive oil, vegetable oil, coconut oil, mayo, mayonnaise, ketchup, mustard, ranch, ranch dressing,
    italian dressing, caesar dressing, blue cheese dressing, bbq sauce, hot sauce, soy sauce, gravy, salad dressing, honey, maple syrup,
    jam, jelly, whipped cream, tartar sauce, marinara sauce, alfredo sauce, buffalo sauce`),

  // ---- home: 一皿・主菜 ----
  ...T('home', 'pasta-italian', `spaghetti and meatballs, mac and cheese, mac n cheese, lasagna, chicken parmesan, baked ziti, stuffed shells,
    fettuccine alfredo, spaghetti bolognese, pasta primavera, garlic bread, breadsticks, meatball sub, eggplant parmesan`),
  ...T('home', 'comfort', `meatloaf, pot roast, chicken pot pie, shepherd's pie, casserole, tuna casserole, green bean casserole, stuffed peppers,
    mashed potatoes and gravy, pork chops and applesauce, salisbury steak, chicken and dumplings, biscuits and gravy, thanksgiving dinner,
    turkey dinner, bbq ribs, bbq plate, loaded baked potato, sloppy joe, tater tot casserole`),
  ...T('home', 'soups-stews', `chili, chili con carne, beef stew, chicken noodle soup, tomato soup, clam chowder, split pea soup, minestrone,
    broccoli cheddar soup, french onion soup, gumbo, jambalaya, vegetable soup, lentil soup, potato soup`),
  ...T('home', 'salads', `caesar salad, cobb salad, greek salad, garden salad, house salad, taco salad, chef salad, chicken salad, tuna salad,
    egg salad, potato salad, macaroni salad, pasta salad, spinach salad, wedge salad, fruit salad`),
  ...T('home', 'mexican', `burrito, tacos, quesadilla, fajitas, enchiladas, nachos, tamales, chimichanga, taquitos, burrito bowl, chips and salsa,
    chips and guacamole, carne asada, carnitas, fish tacos, breakfast tacos, tostada`),
  ...T('home', 'asian', `pad thai, stir fry, chicken stir fry, fried rice, lo mein, chow mein, egg rolls, spring rolls, dumplings, potstickers,
    general tso chicken, orange chicken, kung pao chicken, beef and broccoli, sweet and sour chicken, sesame chicken, teriyaki chicken,
    sushi, california roll, spicy tuna roll, sashimi, ramen, pho, chicken curry, tikka masala, butter chicken, bibimbap, teriyaki bowl,
    poke bowl, miso soup, edamame`),
  ...T('home', 'mediterranean', `falafel, gyro, shawarma, kebab, hummus plate, tabbouleh, greek yogurt dip, baba ganoush, pita and hummus`),
  ...T('home', 'pizza', `pizza, cheese pizza, pepperoni pizza, sausage pizza, veggie pizza, supreme pizza, deep dish pizza, thin crust pizza,
    hawaiian pizza, calzone, stromboli, pizza slice`),
  ...T('home', 'sandwiches', `hamburger, cheeseburger, bacon cheeseburger, double cheeseburger, veggie burger, turkey burger, chicken sandwich,
    fried chicken sandwich, pulled pork sandwich, philly cheesesteak, reuben, club sandwich, blt, ham and cheese, turkey sandwich,
    tuna sandwich, grilled cheese, sub sandwich, hoagie, po boy, french dip, hot dog, corn dog, chili dog, wrap, chicken wrap,
    pb&j, peanut butter and jelly, egg sandwich, meatball sandwich`),
  ...T('home', 'chicken', `grilled chicken, fried chicken, chicken tenders, chicken nuggets, buffalo wings, boneless wings, popcorn chicken,
    rotisserie chicken, chicken and waffles, chicken fried steak, bbq chicken, baked chicken, chicken fingers, chicken legs`),
  ...T('home', 'breakfast', `pancakes, waffles, french toast, oatmeal, eggs benedict, breakfast burrito, breakfast sandwich, avocado toast,
    hash, home fries, bacon and eggs, ham and eggs, sausage and eggs, yogurt parfait, acai bowl, smoothie bowl, cinnamon roll, muffin,
    blueberry muffin, bagel with cream cheese, english muffin sandwich, scrambled eggs and toast, breakfast plate, grits and eggs`),
  ...T('home', 'sides-apps', `onion rings, mozzarella sticks, jalapeno poppers, fried pickles, loaded fries, cheese fries, mashed potatoes,
    mac and cheese side, corn on the cob, green bean side, baked beans side, cornbread muffin, garlic knots, side salad, caesar side salad,
    spinach artichoke dip, buffalo cauliflower, nachos with cheese`),
  ...T('home', 'bowls', `burrito bowl, poke bowl, buddha bowl, grain bowl, rice bowl, chicken bowl, salad bowl, power bowl, protein bowl`),

  // ---- chain: 商品名・チェーンの定番 ----
  ...T('chain', 'burger', `big mac, quarter pounder, mcdouble, double quarter pounder, mcnuggets, mcchicken, filet-o-fish, egg mcmuffin, sausage mcmuffin,
    hash brown, whopper, whopper jr, baconator, in-n-out burger, animal style fries, five guys burger, shake shack burger, smashburger,
    culver's butterburger, whataburger, jack in the box tacos, sonic cheeseburger`),
  ...T('chain', 'chicken', `chick-fil-a sandwich, chick-fil-a nuggets, waffle fries, popeyes chicken sandwich, popeyes tenders, kfc original recipe,
    kfc bucket, raising cane's chicken fingers, wingstop wings, buffalo wild wings, zaxby's, bojangles chicken biscuit`),
  ...T('chain', 'mexican', `chipotle burrito bowl, chipotle chicken bowl, chipotle burrito, chipotle chips, crunchwrap supreme, doritos locos taco,
    taco bell burrito, taco bell chalupa, qdoba bowl, del taco, baja fresh`),
  ...T('chain', 'sandwich', `subway footlong, subway turkey sub, subway italian bmt, jimmy john's, jersey mike's sub, panera sandwich,
    panera broccoli cheddar soup, panera mac and cheese, arby's roast beef, quiznos, potbelly`),
  ...T('chain', 'pizza', `domino's pizza, papa john's pizza, pizza hut pan pizza, little caesars hot n ready, marco's pizza`),
  ...T('chain', 'asian', `panda express orange chicken, panda express chow mein, panda express bowl, p.f. chang's, benihana, sweetgreen salad,
    cava bowl, chipotle-style bowl`),
  ...T('chain', 'sitdown', `applebee's, chili's baby back ribs, olive garden breadsticks, olive garden pasta, texas roadhouse steak, outback steak,
    bloomin onion, red lobster biscuit, ihop pancakes, denny's grand slam, cracker barrel breakfast, waffle house hashbrowns,
    cheesecake factory slice, tgi fridays`),
  ...T('chain', 'coffee-sweets', `starbucks latte, starbucks frappuccino, pumpkin spice latte, caramel macchiato, dunkin donut, dunkin iced coffee,
    krispy kreme donut, cinnabon, auntie anne's pretzel, dairy queen blizzard, mcflurry, wendy's frosty, baskin robbins, jamba juice,
    smoothie king, dutch bros`),

  // ---- drink: 飲料・酒 ----
  ...T('drink', 'coffee-tea', `coffee, black coffee, latte, cappuccino, mocha, frappuccino, iced coffee, cold brew, espresso, americano,
    tea, iced tea, sweet tea, green tea, chai latte, matcha latte, hot chocolate`),
  ...T('drink', 'juice-soda', `orange juice, apple juice, cranberry juice, lemonade, soda, coke, pepsi, sprite, diet coke, root beer, ginger ale,
    mountain dew, dr pepper, gatorade, powerade, energy drink, red bull, monster energy, protein shake, smoothie, milkshake, sports drink,
    water, sparkling water, seltzer, kombucha, coconut water, vitamin water`),
  ...T('drink', 'alcohol', `beer, light beer, ipa, lager, stout, wine, red wine, white wine, rose wine, champagne, prosecco, margarita, mojito,
    whiskey, bourbon, vodka, gin and tonic, old fashioned, hard seltzer, white claw, bloody mary, mimosa, sangria, tequila shot,
    rum and coke, moscow mule, piña colada, cosmopolitan, long island iced tea, hard cider`),
  ...T('drink', 'sweets', `cookies, chocolate chip cookies, oreos, brownie, cake, chocolate cake, cupcake, cheesecake, pie, apple pie, pumpkin pie,
    donut, doughnut, danish, scone, ice cream, frozen yogurt, popsicle, pudding, jello, candy, chocolate, candy bar, m&ms, snickers,
    reese's cups, gummy bears, jelly beans, marshmallow, pop tarts, granola bar, protein bar, rice krispies treat, churros, fudge,
    caramel, sorbet, gelato, ice cream sandwich, ice cream cone, sundae, banana split`),
  ...T('drink', 'snacks', `chips, potato chips, tortilla chips, doritos, pringles, cheetos, popcorn, pretzels, cheese puffs, goldfish crackers,
    ritz crackers, beef jerky, fruit snacks, trail mix bar, nut butter packet, string cheese snack, apple slices, baby carrots,
    veggie sticks, hummus and pretzels, cheese and crackers, rice cake, seaweed snack, pork rinds`),
];
