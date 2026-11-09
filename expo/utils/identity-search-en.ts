/**
 * identity-search-en.ts — 英語 (US) の検索の「語」単位の照合。
 *
 * 背景 (2026-11-07、docs/ROADMAP.md「US の食事データ・検索を日本版と同じ水準に」②):
 *   日本語の検索は、複合語 (醤油 + ラーメン)・語尾の主辞・被覆率つきの「含まれる語」などで、
 *   修飾語つきの入力 (ビーフカレー) を層1に着地させている。英語はこれらが全部オフで、
 *   「whole wheat bread」のように **種類の名前 (Whole Wheat) + Identity の名前 (Bread)** で打たれると、
 *   文字列として長すぎて一致せず、bigram の「もしかして」に落ちていた (ホールドアウトの失敗の過半)。
 *
 * ここでやること (すべて英語専用。日本語の検索には触れない):
 *   1. 語に分ける … 小文字化・記号除去・`&`→and・複数形の畳み込み・つなぎ語 (and / with / of …) の除去
 *   2. 語の集合で照合する (語順に依存しない):
 *        完全一致   … 打った語の集合 = 名前の語の集合
 *        複合       … 名前の語 ⊂ 打った語 で、余りの語が「その食品の文脈」(Identity 名・種類名・量/状態の語) だけ
 *        部分       … 打った語 ⊂ 名前 + 文脈 (wheat bread → Whole Wheat + Bread)
 *   3. 綴り違い … 辞書に無い6文字以上の語は、辞書の語と編集距離1のとき (候補が1つだけなら) 直す
 *
 * 余りの語を「文脈」に限るのが取り違えを防ぐ要: 「chicken sandwich」は chicken_breast の複合ではない
 * (sandwich は chicken_breast の文脈に無い) ので、chicken_sandwich にだけ着地する。
 */
import type { AttributeOption, Identity, StyleOption } from '@/types/identity';

// ---------------------------------------------------------------------------
// 語に分ける
// ---------------------------------------------------------------------------

/** 打っても意味を足さないつなぎ語。`n` は「mac n cheese」。 */
const STOP = new Set(['and', 'n', 'with', 'the', 'a', 'an', 'of', 'in', 'on', 'for', 'my', 'some', 'w', 'to']);

/** 複数形を1つの形に畳む。正しい単数形である必要はない (両側に同じ関数を掛けて比べる)。 */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'; // berries → berry
  if (w.endsWith('ie') && w.length > 4) return w.slice(0, -2) + 'y'; // cookie → cooky (cookies と揃える)
  if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2); // potatoes / sandwiches
  if (/(ss|us|is)$/.test(w)) return w; // hummus / asparagus / swiss
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

/** 同じ意味の語を1つに寄せる (索引側・打った語の両方に掛ける)。 */
const CANON: Record<string, string> = {
  unsweetened: 'unsweet', vegetarian: 'veggie', vegan: 'veggie', meatless: 'veggie', veggies: 'veggie', vegetables: 'vegetable',
  nonfat: 'nonfat', skinny: 'light', lite: 'light', decaf: 'decaf',
};
/** 離して書かれる語 (low fat / non fat / fat free / whole wheat のうち、1語として持っているもの) を1語に。 */
const MERGE: [string, string, string][] = [['low', 'fat', 'lowfat'], ['non', 'fat', 'nonfat'], ['fat', 'free', 'nonfat'], ['sugar', 'free', 'sugarfree'], ['half', 'half', 'halfhalf']];
const mergeTokens = (ts: string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < ts.length; i++) {
    const m = MERGE.find(([a, b]) => ts[i] === a && ts[i + 1] === b);
    if (m) { out.push(m[2]); i++; } else out.push(ts[i]);
  }
  return out;
};

/** 文字列 → 語の配列 (つなぎ語を除き、畳み込み済み)。 */
export function enTokens(raw: string): string[] {
  const s = raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // é → e
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '') // domino's → dominos
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
  if (!s) return [];
  return mergeTokens(
    s
      .split(' ')
      .filter((w) => w && !STOP.has(w))
      .map((w) => CANON[w] ?? w)
      .map(stem),
  );
}

const toSet = (raw: string): Set<string> => new Set(enTokens(raw));

// ---------------------------------------------------------------------------
// 文脈の語 (余りとして許す語)
// ---------------------------------------------------------------------------

/**
 * どの食品に付いても取り違えにならない語: 量・大きさ・鮮度・温度・店名。
 * 調理法 (fried / baked …) と味 (spicy …) は入れない — rice と fried rice のようにマクロが変わる。
 * それらはその食品の「種類」(attributes) として持っているときだけ文脈になる。
 */
const NEUTRAL = new Set(
  [
    // 量・単位
    'slice', 'piece', 'cup', 'bowl', 'serving', 'plate', 'portion', 'glass', 'can', 'bottle', 'handful', 'scoop', 'tbsp', 'tsp',
    'oz', 'lb', 'pc', 'order', 'side', 'large', 'small', 'medium', 'big', 'mini', 'extra', 'double', 'triple',
    // 状態
    'fresh', 'cooked', 'plain', 'regular', 'homemade', 'organic', 'natural', 'hot', 'cold', 'instant', 'frozen', 'leftover',
    'baby', 'two', 'three', 'four', 'half', 'creamy', 'chunky', 'smooth',
    // 下ごしらえ・状態の描写 (どの食品でも、食品そのものを変えない)
    'canned', 'boneless', 'skinless', 'seasoned', 'marinated', 'seared', 'braised', 'sea', 'salt', 'salted', 'unsalted', 'unsweet', 'steel', 'thick', 'thin', 'fluffy', 'pan', 'slow', 'wild', 'cut',
    // 味付け・盛り (どの食品でも食品そのものを変えない): garlic mashed potatoes / loaded baked potato / cheesy grits
    'garlic', 'herb', 'cajun', 'cheesy', 'loaded', 'buttered', 'spiced', 'buttery', 'savory',
    // 「〜風・〜の」(chipotle style bowl / restaurant style / homestyle)
    'style', 'inspired', 'type', 'like',
    // 切り方・形 (strips / cubes / halves / hearts / medallions / florets / wedges / chunks / links / sticks)
    'strip', 'cube', 'heart', 'medallion', 'floret', 'wedge', 'chunk', 'link', 'stick', 'bite', 'round', 'patty', 'crumble', 'sliced', 'chopped', 'diced', 'shredded', 'pure', 'classic', 'original', 'traditional', 'simple',
    // 揚げない調理法 (マクロをほぼ変えない。fried / breaded / battered / crispy は変えるので入れない)
    'grilled', 'baked', 'roasted', 'steamed', 'boiled', 'broiled', 'seared', 'sauteed', 'poached', 'smoked', 'toasted',
    // 色 (品種の描写。white / brown / black は別の食品の名前の一部なので入れない)
    'red', 'green', 'yellow', 'golden',
    // 味 (マクロをほぼ変えない甘み・風味・辛さ)
    'spicy', 'mild', 'vanilla', 'chocolate', 'caramel', 'mocha', 'mint', 'cinnamon',
    // 店・ブランド (商品名そのものは別名表で寄せる)
    'mcdonalds', 'mcdonald', 'starbucks', 'dunkin', 'subway', 'chipotle', 'wendys', 'wendy', 'dominos', 'domino', 'kfc',
    'popeyes', 'panda', 'express', 'chickfila', 'applebees', 'chilis', 'costco', 'trader', 'joes',
  ].map(stem),
);

/**
 * 一皿料理 (タコス・ブリトー・ナチョス・ファヒータ・チャーハン…) の「具」の語。具が違ってもその一皿の既定値の近くに
 * 収まる (PFC 収束) ので、一皿料理の Identity / 種類だけは余りの語として許す。食材の Identity には許さない
 * (chicken breast に beef を足した語は別の食品)。
 */
const FILLING = new Set(
  [
    'chicken', 'beef', 'steak', 'pork', 'shrimp', 'cheese', 'bean', 'veggie', 'vegetable', 'turkey', 'fish', 'egg', 'bacon', 'sausage', 'mushroom', 'ham', 'tuna', 'salmon', 'tofu', 'spinach', 'rice', 'loaded', 'supreme', 'deluxe', 'combo',
    // 具・ソース (ham and pineapple pizza / turkey and swiss sandwich / roast beef with gravy / penne with marinara)
    'swiss', 'cheddar', 'mozzarella', 'parmesan', 'provolone', 'avocado', 'pineapple', 'gravy', 'marinara', 'carnitas', 'jalapeno', 'onion', 'pepper', 'tomato', 'lettuce', 'pickle',
    'salami', 'pepperoni', 'bbq', 'buffalo', 'ranch', 'honey', 'broccoli', 'corn', 'potato', 'roast', 'meatball', 'sauce', 'mayo', 'mustard', 'lemon', 'garlic', 'pesto', 'alfredo',
    'stuffed', 'crusted', 'breaded', 'crispy', 'seasoned', 'marinated', 'glazed',
  ].map(stem),
);

/**
 * 味・フレーバーの語。ヨーグルト・アイス・ベーグル・スムージー・ワッフル・牛乳・炭酸・クッキーなど、**味違いのある食品**では
 * 余りの語として許す (strawberry yogurt = ヨーグルト / blueberry waffles = ワッフル)。それ以外の食品には許さない
 * (strawberry chicken は別の食品)。許す食品は flavorable (identity-search.ts)。
 */
export const FLAVOR_WORDS = [
  'strawberry', 'blueberry', 'raspberry', 'cherry', 'berry', 'peach', 'banana', 'apple', 'lemon', 'lime', 'orange', 'grape', 'mango', 'pineapple',
  'coconut', 'peanut', 'maple', 'honey', 'raisin', 'pumpkin', 'almond', 'hazelnut', 'pecan', 'chip', 'syrup', 'whipped', 'glazed', 'frosted', 'iced',
];
/** チーズ・クリーム・チョコ・バターを味・具として許す食品だけに足す語 (cheese danish / cream cheese bagel)。bacon egg and cheese を壊さないよう、全部の食品には許さない。 */
export const FLAVOR_DAIRY = ['cheese', 'cream', 'chocolate', 'butter'];

const FLAVOR_SET = new Set(FLAVOR_WORDS.map(stem));

const NUMERIC = /^\d+%?$/; // 1% / 2% / 12 (oz)

const isNeutral = (t: string) => NEUTRAL.has(t) || NUMERIC.test(t);

// ---------------------------------------------------------------------------
// 索引
// ---------------------------------------------------------------------------

export interface EnPhrase {
  tokens: Set<string>;
  /** name = ラベル全体 / part = ラベルを / ( ) で分けた一部 (Stew / Gumbo の Gumbo) / tag = 別名・タグ */
  kind: 'name' | 'part' | 'tag';
}

export interface EnEntryInfo {
  level: 'identity' | 'attribute' | 'style';
  phrases: EnPhrase[];
  /** 余りとして許す語 (Identity の名前の語・種類名の語・タグ)。 */
  ctx: Set<string>;
  /** 一皿料理か (具の語を余りとして許す)。 */
  dish: boolean;
  /** ctx のうち Identity の名前の語の数。被覆の細かい差を出すのに使う。 */
  identityTokenCount: number;
  /**
   * 味の語 (FLAVOR_WORDS)。余りとして**許す**だけで、種類を指す根拠 (文脈) には数えない。文脈に数えると、
   * pineapple juice が「juice + 文脈 pineapple」の種類 (apple) の複合 (4.08) に着地する。
   */
  flavors: Set<string>;
}

/** 'Deli Sub / Hoagie' / 'Pasta — Tomato / Marinara' / 'Cream Cheese (block)' を名前の単位に分ける。 */
function labelPhrases(label: string): string[] {
  const out = [label];
  for (const part of label.split(/[/()]/)) {
    const p = part.replace(/[—–-]/g, ' ').trim();
    if (p) out.push(p);
  }
  // 括弧の中身は、1つの名前としても持つ (Lean (90/10) の「90/10」を ground beef 90/10 と打てるように)
  for (const m of label.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1].replace(/[/]/g, ' ').trim();
    if (inner) out.push(inner);
  }
  return out;
}

/** `labelParts` を true にすると、先頭 (ラベル全体) を name、残り (分けた一部) を part にする。 */
function addPhrases(into: EnPhrase[], raws: string[], kind: EnPhrase['kind'], labelParts = false) {
  raws.forEach((raw, i) => {
    const tokens = toSet(raw);
    if (tokens.size === 0) return;
    if (into.some((p) => p.tokens.size === tokens.size && [...tokens].every((t) => p.tokens.has(t)))) return;
    into.push({ tokens, kind: labelParts && i > 0 ? 'part' : kind });
  });
}

function addTokens(into: Set<string>, raws: string[]) {
  for (const raw of raws) for (const t of enTokens(raw)) into.add(t);
}

export function buildEnEntryInfo(
  identity: Identity,
  part: { attribute?: AttributeOption; style?: StyleOption },
  extraTags: string[],
  dish = false,
  /** その食品のバケットの一般名 (sandwich / soup / salad …)。打たれても食品を変えないので文脈に入れる。 */
  bucketNouns: string[] = [],
  /** この食品全体の別名 (全ての種類・スタイル分)。steel cut oatmeal の steel / cut は、別名 "steel cut oats" 由来の文脈。 */
  identityAliases: string[] = [],
  /** 味違いのある食品か (FLAVOR_WORDS を余りとして許す)。 */
  flavorable = false,
  /** その食品だけに許す味・具の語 (FLAVOR_DAIRY など)。 */
  extraFlavors: string[] = [],
): EnEntryInfo {
  const identityNames = labelPhrases(identity.label);
  const phrases: EnPhrase[] = [];
  const ctx = new Set<string>();
  addTokens(ctx, identityNames);
  const identityTokenCount = ctx.size;
  addTokens(ctx, identity.searchTags ?? []);
  addTokens(ctx, bucketNouns);
  addTokens(ctx, identityAliases);
  const flavors = new Set<string>([...(flavorable ? FLAVOR_WORDS : []), ...extraFlavors].map(stem));

  const own = part.attribute ?? part.style;
  if (!own) {
    addPhrases(phrases, identityNames, 'name', true);
    addPhrases(phrases, [...(identity.searchTags ?? []), ...extraTags], 'tag');
    // 食品の他の種類の語は、Identity 自身を打つときの余りとして許す (grilled chicken → chicken_breast)
    for (const a of identity.attributes ?? []) addTokens(ctx, labelPhrases(a.label));
    return { level: 'identity', phrases, ctx, dish, identityTokenCount, flavors };
  }
  addPhrases(phrases, labelPhrases(own.label), 'name', true);
  addPhrases(phrases, [...(own.searchTags ?? []), ...extraTags], 'tag');
  return { level: part.attribute ? 'attribute' : 'style', phrases, ctx, dish, identityTokenCount, flavors };
}

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

export interface EnQuery {
  tokens: Set<string>;
  /** 綴り違いを直した語があるか (あれば得点を少し下げる)。 */
  corrected: boolean;
  /** 量・容器の語や店名を取り除いた形か。 */
  stripped?: boolean;
  /** この形で当たったときの追加の下げ幅 (店名を取り除いた形)。 */
  penalty?: number;
}

/** 距離1 (挿入・削除・置換・隣の入れ替え)。 */
export function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0;
    while (i < la && a[i] === b[i]) i++;
    if (i === la) return true;
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // 置換
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // 入れ替え
  }
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
}

/**
 * @param shortFix 4〜5文字の語の綴り直しも行うか。**最初は false**(6文字以上だけ)。短い語は、辞書に無いだけの
 *   ブランド名・別の言い方 (onion rings の rings) を別の語に直してしまうことがあるので、打った語のままでは
 *   何も層1に出なかったときの最後の手段にする (identity-search.ts)。
 */
export function makeEnQuery(raw: string, vocab: Set<string>, shortFix = false): EnQuery | null {
  const toks = enTokens(raw);
  if (toks.length === 0) return null;
  let corrected = false;
  const fixed = toks.map((t) => {
    if (vocab.has(t) || t.length < (shortFix ? 4 : 6) || NUMERIC.test(t)) return t;
    // 候補が複数あるとき (cheeze → cheese / cheez) は、置換・入れ替え (同じ長さ) → 1文字足す → 1文字削る の順に
    // 近いものを選ぶ。同じ近さの候補が複数残るときだけ直さない。
    // 短い語 (4〜5文字: shrmp / ceral) も直す。辞書にある語はそのまま (直さない) なので、別の語に化ける危険は
    // 「辞書に無い語が、辞書のちょうど1語と距離1」の場合に限られる。
    // 4〜5文字の語は、先頭の文字が同じ候補だけ (sonic → tonic / dried → fried のような別の語への化けを防ぐ)。
    const cands = [...vocab].filter((v) => v.length >= 4 && withinOne(t, v) && (t.length >= 6 || v[0] === t[0]));
    const rank = (v: string) => (v.length === t.length ? 0 : v.length > t.length ? 1 : 2);
    const best = Math.min(...cands.map(rank));
    const top = cands.filter((v) => rank(v) === best);
    if (cands.length > 0 && top.length === 1) { corrected = true; return top[0]; }
    return t;
  });
  return { tokens: new Set(fixed), corrected };
}

/**
 * 量・容器の語 (slice / cup / glass / packet …) と数字を取り除いた形 (glass of orange juice → orange juice)。
 * 元の形で打った語そのまま一致する食品を優先するため、元の形の照合と並べて使う (小さく下げる)。
 * bowl / plate / bar / stick のように食品名の一部になる語は取り除かない。
 */
const NOISE_CANDIDATES = [
  // 量・容器
  'slice', 'piece', 'cup', 'serving', 'portion', 'glass', 'bottle', 'handful', 'scoop', 'tbsp', 'tsp', 'oz', 'lb', 'pc', 'packet', 'pack', 'bag', 'box', 'can', 'order', 'bowl', 'plate',
  // 大きさ・出どころ (食品を変えない)
  'large', 'small', 'medium', 'big', 'mini', 'extra', 'jumbo', 'homemade', 'fresh', 'organic', 'natural', 'leftover', 'store', 'bought',
  // 個数・分量の言い方 (two slices of / half a / a couple of)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'dozen', 'half', 'quarter', 'couple', 'few', 'little',
  // 調理器具・場面・産地の語 (air fryer chicken wings / instant pot chili / kids meal / texas chili / chicago deep dish pizza)。食品を指さない
  'air', 'fryer', 'instant', 'crockpot', 'cooker', 'sheet', 'microwave', 'microwaved', 'kid', 'meal', 'deep', 'dish', 'texas', 'chicago', 'york', 'carolina', 'kansas', 'city', 'louisiana',
  'southern', 'california', 'ready', 'frozen', 'restaurant', 'takeout', 'delivery', 'leftovers', 'cafeteria', 'school', 'lunch', 'breakfast', 'dinner', 'snack', 'dessert',
].map(stem);

/**
 * 取り除いてよい語 = 上の候補のうち、**どの食品・種類の名前にも使われていない語**。
 * (bowl は Burrito Bowl / Poke Bowl の名前の一部、fresh は Egg Whites の種類名なので、自動で除かれる。)
 */
export function noiseWordsOf(nameTokens: Set<string>): Set<string> {
  return new Set(NOISE_CANDIDATES.filter((t) => !nameTokens.has(t)));
}

const sameTokens = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((t) => b.has(t));

/**
 * 照合に使う語の形を、元の形から順に返す:
 *   1. 打った語のまま (6文字以上の語の綴り直しだけ)
 *   2. 4〜5文字の語の綴り直しも入れた形 (shrmp → shrimp)。**元の形と並べて使う** — 置き換えると、辞書に無いだけの
 *      語 (onion rings の rings) を別の語に直して、元の形で当たっていた結果を失う
 *   3. それぞれから、量・大きさの語と数字を取り除いた形 (glass of orange juice → orange juice)
 * 同じ語の集合になる形は1つにまとめる。
 */
export function makeEnQueries(raw: string, vocab: Set<string>, noise: Set<string>): EnQuery[] {
  const base = makeEnQuery(raw, vocab, false);
  if (!base) return [];
  const list: EnQuery[] = [base];
  const short = makeEnQuery(raw, vocab, true);
  if (short && !sameTokens(short.tokens, base.tokens)) list.push(short);
  for (const q of [...list]) {
    const rest = [...q.tokens].filter((t) => !noise.has(t) && !/^\d+$/.test(t));
    if (rest.length === 0 || rest.length === q.tokens.size) continue;
    const s = new Set(rest);
    if (!list.some((x) => sameTokens(x.tokens, s) && x.corrected === q.corrected)) list.push({ tokens: s, corrected: q.corrected, stripped: true });
  }
  return list;
}

/** 前置きの量の言い方 ("bowl of rice" / "slice of pizza" / "2 cups of milk")。食品名の一部の語 (bowl) でも、"of" が付けば量。 */
const MEASURE_LEAD = /^(?:\d+(?:\.\d+)?\s+)?(?:bowl|plate|cup|glass|slice|piece|serving|handful|scoop|bottle|can|pack|packet|bag|box|order|side|portion|pinch|spoonful|tablespoon|teaspoon|pint|quart)s?\s+of\s+(?=\S)/i;
export const stripMeasureLead = (raw: string): string => raw.replace(MEASURE_LEAD, '');

/**
 * 文字列照合 (identity-search.ts の queryVariants) にも渡す、量・大きさの語を取り除いた文字列。
 * **取り除く語があったときだけ**返す (つなぎ語 and / with だけが違う形は作らない — gin and tonic が gin tonic になる)。
 * 量の語のすぐ後ろの "of" は一緒に落とす (glass of milk → milk)。
 */
/**
 * 店名・ブランド名 (five guys fries / olive garden salad / panera chicken salad)。商品名そのものは別名表で寄せ、
 * ここは「その店の○○」の店名を取り除くだけ。**食品名の語を含む店名** (olive garden / taco bell / burger king) は
 * 単語では中立にできないので、句として取り除く。
 */
const CHAIN_PHRASES = [
  'five guys', 'in n out', 'olive garden', 'panera bread', 'panera', 'taco bell', 'burger king', 'shake shack', 'whataburger', 'sonic', 'arbys', 'jimmy johns',
  'jersey mikes', 'firehouse subs', 'potbelly', 'qdoba', 'moes', 'cava', 'sweetgreen', 'dennys', 'ihop', 'waffle house', 'cracker barrel', 'outback', 'texas roadhouse',
  'red lobster', 'cheesecake factory', 'buffalo wild wings', 'wingstop', 'papa johns', 'pizza hut', 'little caesars', 'dairy queen', 'culvers', 'p f changs', 'pf changs',
  'red robin', 'hooters', 'krispy kreme', 'tim hortons', 'chick fil a', 'chickfila', 'popeyes', 'kfc', 'mcdonalds', 'wendys', 'subway', 'chipotle', 'starbucks', 'dunkin', 'dominos',
  'applebees', 'chilis', 'costco', 'trader joes', 'whole foods', 'walmart', 'target', 'kroger', 'safeway',
];
const CHAIN_RE = new RegExp(`\\b(?:${CHAIN_PHRASES.map((c) => c.replace(/ /g, '[\\s\\-\']*').replace(/'/g, "'?")).join('|')})'?s?\\b`, 'gi');

/** 店名を取り除いた文字列。取り除くものがあったときだけ返す。 */
export function stripChainsRaw(raw: string): string | null {
  const out = raw.replace(CHAIN_RE, ' ').replace(/\s+/g, ' ').trim();
  return out && out !== raw.trim() ? out : null;
}

/**
 * 文字列照合 (identity-search.ts の queryVariants) にも渡す、量・大きさの語を取り除いた文字列。
 * **取り除く語があったときだけ**返す (つなぎ語 and / with だけが違う形は作らない — gin and tonic が gin tonic になる)。
 * 量の語のすぐ後ろの "of" は一緒に落とす (glass of milk → milk)。
 */
export function stripNoiseRaw(raw: string, noise: Set<string>): string | null {
  const words = raw.trim().split(/\s+/);
  const kept: string[] = [];
  let dropped = false;
  for (let i = 0; i < words.length; i++) {
    const ts = enTokens(words[i]);
    const isNoise = ts.length > 0 && ts.every((t) => noise.has(t) || /^\d+$/.test(t));
    if (isNoise) {
      dropped = true;
      if (words[i + 1]?.toLowerCase() === 'of') i++;
      continue;
    }
    kept.push(words[i]);
  }
  const out = kept.join(' ').trim();
  return dropped && out ? out : null;
}

// ---------------------------------------------------------------------------
// 照合
// ---------------------------------------------------------------------------

export interface EnHit {
  score: number;
  method: 'exact' | 'prefix' | 'substring';
  /** compound = 名前の語が全部入力に含まれる複合 / partial = 入力が名前の一部 (oat ⊂ overnight oats) / exact。 */
  kind: 'exact' | 'compound' | 'partial';
  /** 名前経由か、タグ経由か (タグ経由は同じ強さの名前経由に譲る)。 */
  viaTag: boolean;
}

const eq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((t) => b.has(t));
const subset = (a: Set<string>, b: Set<string>) => [...a].every((t) => b.has(t));

/**
 * 名前の語 ⊂ 打った語 のとき、余りの語が全部「許せる語」か。許せる語は次のどれか:
 *   - その食品の文脈 (Identity 名・種類名・タグ)
 *   - どの食品にも付く量・状態・店名の語 (NEUTRAL)
 *   - **辞書のどこにも無い語** (pan seared / jumbo / boneless skinless / sea salt)。食品名ではない描写の語なので、
 *     名前の部分が一致していれば取り違えにならない。逆に、辞書にある別の食品の語 (chicken sandwich の
 *     sandwich) は、その食品の文脈でない限り許さない — ここが取り違えを防ぐ線。
 */
function remainderOk(q: Set<string>, p: Set<string>, info: EnEntryInfo, vocab: Set<string>): 0 | 1 | 2 {
  let viaFilling = false;
  for (const t of q) {
    if (p.has(t) || info.ctx.has(t) || info.flavors.has(t) || isNeutral(t) || !vocab.has(t)) continue;
    if (info.dish && FILLING.has(t)) { viaFilling = true; continue; }
    return 0;
  }
  return viaFilling ? 2 : 1;
}

export function scoreEnglish(query: EnQuery, info: EnEntryInfo, vocab: Set<string>): EnHit | null {
  const q = query.tokens;
  const typo = (query.corrected ? 0.3 : 0) + (query.penalty ?? 0);
  let best: EnHit | null = null;
  const consider = (h: EnHit) => {
    if (!best || h.score > best.score || (h.score === best.score && !h.viaTag && best.viaTag)) best = h;
  };

  for (const ph of info.phrases) {
    const p = ph.tokens;
    const viaTag = ph.kind === 'tag';
    if (eq(q, p)) {
      consider({ score: 4 - typo, method: 'exact', kind: 'exact', viaTag });
    } else if (q.size > p.size && subset(p, q) && remainderOk(q, p, info, vocab) > 0) {
      // 具の語だけで通った複合 (grilled cheese sandwich が「グリルチキンサンドの grilled」に当たる) は強く置かない。
      const filling = remainderOk(q, p, info, vocab) === 2;
      // 複合: 種類名 + Identity 名 (whole wheat + bread) / Identity 名 + 種類名 / 名前 + 量・状態の語。
      // 種類 (属性・スタイル) の複合は、その種類そのものを打った語なので、Identity のタグにある同じ綴り
      // (boiled egg が egg のタグにある 3.95 / 完全一致+表記一致 4.05) より上に置く。Identity 側の複合はその下。
      // ただし種類の複合は、余りの語に「その食品の文脈の語」が1つ以上あるときだけ。量・状態・未知の語だけが付いた
      // もの (bacon slices → 「バーガーのベーコン」種類) は、種類の名前が偶然一致しただけなので Identity の複合より下に置く。
      const hasCtx = info.level === 'identity' || [...q].some((t) => !p.has(t) && info.ctx.has(t));
      let base = info.level === 'identity' ? 2.9 : hasCtx ? 4.08 : 2.8;
      if (filling) base = Math.min(base, 3.4);
      consider({ score: base - typo, method: info.level === 'identity' ? 'substring' : hasCtx ? 'prefix' : 'substring', kind: 'compound', viaTag });
    } else if (q.size < p.size + info.ctx.size && q.size >= 1 && info.level !== 'identity') {
      // 部分: 打った語が 名前 + 文脈 に収まり、名前の語を半分以上含む (wheat bread → Whole Wheat + Bread)
      let inP = 0;
      let ok = true;
      for (const t of q) {
        if (p.has(t)) inP++;
        else if (!info.ctx.has(t) && !info.flavors.has(t) && !isNeutral(t) && !(info.dish && FILLING.has(t)) && vocab.has(t)) { ok = false; break; }
      }
      // 量・大きさなど中立な語を除いて1語しか残らないもの (half an avocado の avocado) は、複数語の名前 (Avocado Toast) の
      // 「一部」ではなく、その1語そのものを打った語。部分一致として扱わない (文脈の語が付いているときを除く)。
      const hasCtxWord = [...q].some((t) => !p.has(t) && info.ctx.has(t));
      const coreSize = [...q].filter((t) => !isNeutral(t) && !FLAVOR_SET.has(t)).length;
      if (ok && inP >= 1 && inP * 2 >= p.size && inP < p.size && q.size >= 2 && (coreSize >= 2 || hasCtxWord)) {
        // 名前の一部 + 文脈の語 (boiled egg → 「Hard-boiled」の種類 + 卵) は、その種類を指す複合なので強く置く。
        // 文脈の語を含まない (名前の一部だけ) ものは弱く。
        // 量・容器 (glass / slice / packet) や辞書に無い語は文脈ではない。数えると、`glass of milk` が
        // 「オーツミルク (Oat + Milk) の部分」(3.6) になって、牛乳そのもの (2.9) に勝つ。
        const withCtx = hasCtxWord;
        consider({ score: (withCtx ? 3.6 : 2.6) - typo, method: 'substring', kind: 'partial', viaTag });
      }
    }
  }
  return best;
}

/** 索引に出てくる全ての語 (綴り直しの辞書)。 */
export function vocabularyOf(infos: EnEntryInfo[]): Set<string> {
  const v = new Set<string>();
  for (const info of infos) {
    for (const ph of info.phrases) for (const t of ph.tokens) v.add(t);
    for (const t of info.ctx) v.add(t);
  }
  return v;
}
