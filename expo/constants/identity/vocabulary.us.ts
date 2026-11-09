/**
 * vocabulary.us.ts — US 版の語彙辞書 (日本語版は dish-vocabulary.ts / head-nouns.ts)。
 *
 * 検索で Identity に着地しなかった語を、「このカテゴリかも」としてバケットへ案内するための辞書。
 * DB に専用の Identity が無い食品 (sloppy joe / gnocchi / bibimbap) に、行き先を作る。
 * 「DB 拡張ではなく語彙拡張で解く」(SEARCH_SPEC §1.3) の英語版。PFC が収束する前提なので、Identity までは
 * 特定せずバケット単位で足りる (一部だけ identity を指定)。
 *
 * 2つの辞書:
 *   US_DISH_VOCABULARY … 単独の料理名・食品名 (複数語も可) → バケット。打った語に含まれる最長の語が当たる
 *   US_HEAD_NOUNS      … 語尾/語頭の主辞 (sandwich / soup / bowl …) → バケット。2語以上のクエリだけ
 *
 * 語は「その軸で普通に出てくる名前」を、DB を見ずに料理の種類ごとに挙げた。**検索ベンチマークの語から
 * 逆算して足さない** (足したらその語はチューニング用へ移す)。複数形・大文字小文字・つなぎ語は検索側で畳み込む。
 * 寄せ先のバケットは utils/search-vocabulary.us.test.ts が実在を検査する。
 */
import type { BucketKey } from '@/types/identity';

export interface UsVocabTarget {
  bucket: BucketKey;
  /** 特定の Identity まで絞れる場合のみ。 */
  identity?: string;
}

export interface UsHeadNounEntry {
  heads: string[];
  targets: UsVocabTarget[];
}

type Row = [phrases: string, target: BucketKey | UsVocabTarget];

const rows = (...defs: Row[]): Array<{ phrase: string; target: UsVocabTarget }> =>
  defs.flatMap(([phrases, target]) =>
    phrases
      .split(/\s*,\s*/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((phrase) => ({ phrase, target: typeof target === 'string' ? { bucket: target } : target })),
  );

// prettier-ignore
export const US_DISH_VOCABULARY = rows(
  // ---- ハンドヘルド・サンドイッチ ----
  ['sloppy joe, philly cheesesteak, cheesesteak, reuben, rachel, monte cristo, cuban, banh mi, patty melt, tuna melt, french dip, italian beef, po boy, muffuletta, gyro, shawarma, croque monsieur, lobster roll, crab roll, slider, sliders, panini, club, chicken salad sandwich, pulled pork sandwich, cheese steak, hot dog, corn dog, pretzel dog, bratwurst, brat, chili dog, falafel, tuna sandwich, egg sandwich, bologna sandwich, blt, hot ham and cheese', 'burger_sandwich'],
  // ---- ピザ・パスタ ----
  ['gnocchi, tortellini, ravioli, manicotti, cannelloni, linguine, fettuccine, penne, rigatoni, rotini, ziti, orzo, spaghetti, carbonara, bolognese, pesto, primavera, puttanesca, arrabbiata, orecchiette, cacio e pepe, calzone, stromboli, pizza rolls, pizza bagel, flatbread, lasagne, baked ziti, stuffed shells, mac and cheese, mac n cheese, macaroni salad, pasta salad, fettucine, vodka sauce, aglio e olio, shells and cheese, fra diavolo, chicken parm, chicken parmesan, eggplant parm, eggplant parmesan', 'pizza_pasta'],
  // ---- 鶏 ----
  ['drumsticks, drumstick, wings, tenders, nuggets, popcorn chicken, hot chicken, nashville hot chicken, chicken piccata, chicken marsala, chicken cordon bleu, buffalo chicken, bbq chicken, lemon pepper chicken, chicken fried, chicken thighs, chicken legs, rotisserie, fried chicken, chicken strips, boneless wings, korean fried chicken, jerk chicken, chicken kebab, chicken skewers', 'chicken'],
  // ---- メキシカン ----
  ['baja fresh, qdoba, moes southwest grill, del taco, taco time, taco cabana, chile relleno, chiles rellenos, tamale, tamales, elote, esquites, chimichanga, taquito, taquitos, flautas, tostada, tostadas, sope, gordita, carnitas, carne asada, al pastor, barbacoa, birria, chalupa, crunchwrap, ceviche, empanada, empanadas, refried beans, rice and beans, huevos rancheros, chilaquiles, queso, queso fundido, pico de gallo, salsa, burrito bowl, taco salad, nachos, fajitas, quesadilla, enchiladas, taco, burrito', 'mexican'],
  // ---- アメリカの皿 ----
  ['shrimp and grits, grits and shrimp, fried catfish, lamb chops, lamb chop, short ribs, short rib, roast chicken, crab legs, lobster tail, surf and turf, prime rib, ny strip, new york strip, porterhouse, t bone, chicken fried steak, country fried steak, liver and onions, corned beef and cabbage, baked ham, glazed ham, thanksgiving, meat and three, swedish meatballs, salisbury steak, shepherds pie, stuffed cabbage, pork roast, roast beef, pot roast, beef tips, pork chops, ribs, baby back ribs, spare ribs, pulled pork, brisket, burnt ends, smoked sausage, jambalaya plate, crab cakes, fish fry, fried shrimp, shrimp scampi, salmon dinner, grilled salmon, mahi mahi, blackened fish, lobster, lobster dinner, clam bake, fish and chips, steak dinner, turkey dinner, roast turkey, stuffed pork chop, cornish hen, duck breast, veal parmesan, osso buco, rack of lamb, filet mignon, meatloaf', 'american_plate'],
  // ---- スープ・シチュー ----
  ['bisque, chowder, minestrone, pozole, gazpacho, broth, bone broth, consomme, stew, gumbo, jambalaya, goulash, bouillabaisse, matzo ball soup, wonton soup, hot and sour soup, egg drop soup, lentil soup, split pea, split pea soup, french onion, french onion soup, potato soup, corn chowder, tortilla soup, borscht, cioppino, menudo, lobster bisque, cream of mushroom, cream of chicken, cream of broccoli, albondigas, ribollita, pasta fagioli, tom kha, caldo, chicken and dumplings, beef barley soup, pot au feu', 'soup_stew'],
  // ---- ボウル・サラダ ----
  ['poke, buddha bowl, grain bowl, power bowl, acai bowl, nicoise, waldorf, caprese, wedge salad, chopped salad, kale salad, caesar, cobb, greek salad, garden salad, house salad, side salad, shrimp salad, antipasto salad, chef salad, spinach salad, arugula salad, beet salad, quinoa salad, bean salad, three bean salad, cucumber salad, fattoush, tabbouleh, seaweed salad, rice bowl, protein bowl, harvest bowl, mediterranean bowl, salad bar', 'bowl_salad'],
  // ---- アジアのテイクアウト ----
  ['dumplings, dumpling, potstickers, potsticker, gyoza, egg rolls, egg roll, spring rolls, spring roll, crab rangoon, wonton, wontons, bao, bao buns, bibimbap, bulgogi, kimchi, kimchi fried rice, japchae, tteokbokki, katsu, katsu curry, tempura, teriyaki, yakitori, okonomiyaki, udon, soba, pad see ew, drunken noodles, tom yum, massaman, larb, satay, banh xeo, laksa, dim sum, hot pot, chop suey, egg foo young, moo shu, mongolian beef, beef and broccoli, sweet and sour, hibachi, nigiri, maki, edamame, samosa, biryani, tandoori, saag paneer, palak paneer, dal, korma, vindaloo, tikka masala, butter chicken, pho, ramen, chow mein, lo mein, fried rice, sushi, sashimi, pad thai, kung pao, general tso, orange chicken, sesame chicken, honey walnut shrimp, szechuan, chinese food, thai food, indian food, korean bbq, japanese curry, miso soup, gyudon, onigiri, banchan, spam musubi, musubi, chicken katsu, tonkatsu, shumai, har gow, char siu, peking duck, lettuce wraps', 'asian_takeout'],
  // ---- 朝食 ----
  ['eggs benedict, frittata, quiche, omelet, omelette, scramble, hash, hash browns, home fries, corned beef hash, shakshuka, french toast, crepe, crepes, blintz, biscuit, biscuits, scone, scones, muffin, muffins, croissant, danish, donut, doughnut, donuts, bagel and lox, lox, parfait, yogurt parfait, granola and yogurt, overnight oats, cream of wheat, farina, cinnamon roll, cinnamon rolls, sticky bun, pop tart, pop tarts, steak and eggs, breakfast casserole, breakfast sausage, breakfast plate, breakfast platter, big breakfast, brunch, eggs and toast, hash browns and eggs, bacon and eggs, ham and eggs, sausage and eggs, pancake stack, short stack, belgian waffle, avocado toast, smoothie bowl', 'breakfast'],

  // ---- 果物 ----
  ['pineapple, mango, plum, pomegranate, papaya, apricot, figs, fig, dates, coconut, guava, persimmon, lychee, dragon fruit, kiwi, cherries, cherry, peach, peaches, pear, pears, nectarine, tangerine, clementine, mandarin, grapefruit, lemon, lime, cantaloupe, honeydew, raspberries, blackberries, cranberries, fruit salad, fruit cup, dried fruit, raisins, prunes, applesauce, fruit', 'fruit'],
  // ---- 野菜 ----
  ['carrot, carrots, cucumber, celery, onion, onions, red onion, tomato, tomatoes, bell pepper, peppers, jalapeno, cauliflower, asparagus, mushroom, mushrooms, zucchini, squash, butternut squash, eggplant, brussels sprouts, cabbage, kale, lettuce, arugula, peas, snow peas, green beans, beets, radish, turnip, parsnip, leek, fennel, okra, bok choy, sprouts, jicama, artichoke, pickles, pickle, sauerkraut, olives, coleslaw, vegetables, veggies, sweet potato fries, collard greens, swiss chard, garlic, ginger, scallion, green onion, cilantro, parsley', 'veggies'],
  // ---- たんぱく質 (魚介・肉) ----
  ['crab, lobster meat, scallops, oysters, clams, mussels, squid, calamari, octopus, haddock, halibut, trout, catfish, swordfish, sea bass, snapper, perch, flounder, sole, anchovies, sardines, fish fillet, fish sticks, seafood, shrimp cocktail, tuna steak', 'lean_protein'],
  ['ham, salami, prosciutto, pepperoni, lamb, duck, veal, bison, venison, liver, kielbasa, chorizo, pork belly, spam, corned beef, pastrami, bologna, sausage links, deli meat, cold cuts, jerky, beef jerky, bacon bits, pork rinds', 'fatty_protein'],
  // ---- 主食・パン ----
  ['stuffing, grits, cheese grits, hushpuppies, pita, pita bread, naan, dinner roll, ciabatta, focaccia, baguette, cornbread, polenta, couscous, barley, farro, bulgur, matzo, hamburger bun, hot dog bun, bun, buns, english muffin, texas toast, garlic bread, breadsticks, garlic knots, crackers, rice cakes, ramen noodles, noodles', 'staple'],
  // ---- 乳・大豆 ----
  ['ricotta, mascarpone, queso fresco, paneer, kefir, tempeh, soy milk, oat milk, almond milk, whipped cream, sour cream, cream cheese, cottage cheese, string cheese, parmesan, brie, feta, goat cheese, gouda, provolone, swiss, cheddar, mozzarella, yogurt, greek yogurt, buttermilk, half and half, heavy cream, creamer, tofu, whipped topping, cool whip, protein powder, whey, whey protein, casein, collagen powder', 'dairy_soy'],
  // ---- 油脂・ソース ----
  ['guacamole, hummus, aioli, tahini, ghee, lard, shortening, cooking spray, vinaigrette, gravy, nutella, honey, maple syrup, syrup, agave, jam, jelly, ketchup, mustard, bbq sauce, hot sauce, soy sauce, tartar sauce, marinara, alfredo sauce, buffalo sauce, salad dressing, olive oil, avocado, almond butter, peanut butter, tzatziki, chimichurri, teriyaki sauce, sriracha, relish, whipped butter', 'added_fat'],
  // ---- 間食・飲み物・デザート ----
  ['cupcake, cupcakes, cake, cheesecake, pound cake, coffee cake, banana bread, zucchini bread, pie, apple pie, pumpkin pie, pecan pie, key lime pie, cobbler, crisp, tart, brownie, brownies, blondie, cookie dough, candy, candy bar, gummy, gummy bears, gummy worms, jelly beans, licorice, marshmallow, lollipop, truffle, truffles, fudge, caramel, toffee, taffy, popcorn, pretzel, pretzels, funnel cake, churros, churro, tiramisu, flan, pudding, jello, custard, mousse, ice cream, frozen yogurt, froyo, sorbet, gelato, sundae, popsicle, milkshake, shake, float, orange juice, apple juice, cranberry juice, juice, lemonade, apple cider, cider, hot cocoa, cocoa, hot chocolate, eggnog, kombucha, coconut water, sports drink, protein shake, tea, chai, latte, cappuccino, mocha, espresso, boba, bubble tea, soda, root beer, ginger ale, sparkling water, energy drink, beer, wine, cocktail, margarita, mojito, whiskey, vodka, rum, tequila, gin, bourbon, sangria, mimosa, champagne, hard cider, twinkie, oreo, oreos, poptart, granola bar, fruit snacks, rice krispies treat, trail mix, chips, nachos chips', 'snack_drink'],
);

// prettier-ignore
export const US_HEAD_NOUNS: UsHeadNounEntry[] = [
  { heads: ['sandwich', 'burger', 'sub', 'hoagie', 'grinder', 'melt', 'panini', 'slider', 'wrap'], targets: [{ bucket: 'burger_sandwich' }] },
  { heads: ['pizza', 'pasta', 'noodle', 'lasagna'], targets: [{ bucket: 'pizza_pasta' }, { bucket: 'asian_takeout' }] },
  { heads: ['chicken', 'wing', 'tender', 'nugget', 'drumstick'], targets: [{ bucket: 'chicken' }] },
  { heads: ['taco', 'burrito', 'quesadilla', 'enchilada', 'fajita', 'nacho', 'tamale', 'tostada'], targets: [{ bucket: 'mexican' }] },
  { heads: ['dinner', 'plate', 'platter', 'entree', 'steak', 'roast', 'chop', 'rib'], targets: [{ bucket: 'american_plate' }] },
  { heads: ['soup', 'stew', 'chowder', 'bisque', 'chili', 'broth', 'gumbo'], targets: [{ bucket: 'soup_stew' }] },
  { heads: ['salad', 'bowl'], targets: [{ bucket: 'bowl_salad' }] },
  { heads: ['curry', 'dumpling', 'stir fry', 'sushi', 'ramen', 'pho', 'teriyaki', 'roll', 'rice'], targets: [{ bucket: 'asian_takeout' }] },
  { heads: ['breakfast', 'brunch', 'pancake', 'waffle', 'omelet', 'omelette', 'scramble', 'toast', 'bagel', 'muffin'], targets: [{ bucket: 'breakfast' }] },
  { heads: ['cake', 'cookie', 'pie', 'bar', 'candy', 'chocolate', 'juice', 'soda', 'drink', 'shake', 'smoothie', 'tea', 'coffee', 'beer', 'wine', 'cocktail', 'dessert', 'snack', 'chip', 'pudding', 'brownie', 'tart'], targets: [{ bucket: 'snack_drink' }] },
  { heads: ['fruit', 'berry', 'melon'], targets: [{ bucket: 'fruit' }] },
  { heads: ['vegetable', 'veggie', 'greens'], targets: [{ bucket: 'veggies' }] },
  { heads: ['cheese', 'yogurt', 'milk', 'tofu'], targets: [{ bucket: 'dairy_soy' }] },
  { heads: ['bread', 'bun', 'cereal', 'grain'], targets: [{ bucket: 'staple' }] },
  { heads: ['fish', 'seafood'], targets: [{ bucket: 'lean_protein' }] },
  { heads: ['pork', 'beef', 'ham', 'sausage', 'bacon', 'meat'], targets: [{ bucket: 'fatty_protein' }] },
  { heads: ['sauce', 'dressing', 'dip', 'spread', 'syrup'], targets: [{ bucket: 'added_fat' }] },
];
