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
  return s
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);
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
    'baby', 'two', 'three', 'four', 'half', 'sliced', 'chopped', 'diced', 'shredded', 'pure', 'classic', 'original', 'traditional', 'simple',
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
  ['chicken', 'beef', 'steak', 'pork', 'shrimp', 'cheese', 'bean', 'veggie', 'vegetable', 'turkey', 'fish', 'egg', 'bacon', 'sausage', 'mushroom', 'ham', 'tuna', 'salmon', 'tofu', 'spinach', 'rice', 'loaded', 'supreme', 'deluxe', 'combo'].map(stem),
);

const NUMERIC = /^\d+%?$/; // 1% / 2% / 12 (oz)

const isNeutral = (t: string) => NEUTRAL.has(t) || NUMERIC.test(t);

// ---------------------------------------------------------------------------
// 索引
// ---------------------------------------------------------------------------

export interface EnPhrase {
  tokens: Set<string>;
  kind: 'name' | 'tag';
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
}

/** 'Deli Sub / Hoagie' / 'Pasta — Tomato / Marinara' / 'Cream Cheese (block)' を名前の単位に分ける。 */
function labelPhrases(label: string): string[] {
  const out = [label];
  for (const part of label.split(/[/()]/)) {
    const p = part.replace(/[—–-]/g, ' ').trim();
    if (p) out.push(p);
  }
  return out;
}

function addPhrases(into: EnPhrase[], raws: string[], kind: EnPhrase['kind']) {
  for (const raw of raws) {
    const tokens = toSet(raw);
    if (tokens.size === 0) continue;
    if (into.some((p) => p.tokens.size === tokens.size && [...tokens].every((t) => p.tokens.has(t)))) continue;
    into.push({ tokens, kind });
  }
}

function addTokens(into: Set<string>, raws: string[]) {
  for (const raw of raws) for (const t of enTokens(raw)) into.add(t);
}

export function buildEnEntryInfo(
  identity: Identity,
  part: { attribute?: AttributeOption; style?: StyleOption },
  extraTags: string[],
  dish = false,
): EnEntryInfo {
  const identityNames = labelPhrases(identity.label);
  const phrases: EnPhrase[] = [];
  const ctx = new Set<string>();
  addTokens(ctx, identityNames);
  const identityTokenCount = ctx.size;
  addTokens(ctx, identity.searchTags ?? []);

  const own = part.attribute ?? part.style;
  if (!own) {
    addPhrases(phrases, identityNames, 'name');
    addPhrases(phrases, [...(identity.searchTags ?? []), ...extraTags], 'tag');
    // 食品の他の種類の語は、Identity 自身を打つときの余りとして許す (grilled chicken → chicken_breast)
    for (const a of identity.attributes ?? []) addTokens(ctx, labelPhrases(a.label));
    return { level: 'identity', phrases, ctx, dish, identityTokenCount };
  }
  addPhrases(phrases, labelPhrases(own.label), 'name');
  addPhrases(phrases, [...(own.searchTags ?? []), ...extraTags], 'tag');
  return { level: part.attribute ? 'attribute' : 'style', phrases, ctx, dish, identityTokenCount };
}

// ---------------------------------------------------------------------------
// クエリ
// ---------------------------------------------------------------------------

export interface EnQuery {
  tokens: Set<string>;
  /** 綴り違いを直した語があるか (あれば得点を少し下げる)。 */
  corrected: boolean;
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

export function makeEnQuery(raw: string, vocab: Set<string>): EnQuery | null {
  const toks = enTokens(raw);
  if (toks.length === 0) return null;
  let corrected = false;
  const fixed = toks.map((t) => {
    if (vocab.has(t) || t.length < 6 || NUMERIC.test(t)) return t;
    const cands = [...vocab].filter((v) => v.length >= 5 && withinOne(t, v));
    if (cands.length === 1) { corrected = true; return cands[0]; }
    return t;
  });
  return { tokens: new Set(fixed), corrected };
}

// ---------------------------------------------------------------------------
// 照合
// ---------------------------------------------------------------------------

export interface EnHit {
  score: number;
  method: 'exact' | 'prefix' | 'substring';
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
    if (p.has(t) || info.ctx.has(t) || isNeutral(t) || !vocab.has(t)) continue;
    if (info.dish && FILLING.has(t)) { viaFilling = true; continue; }
    return 0;
  }
  return viaFilling ? 2 : 1;
}

export function scoreEnglish(query: EnQuery, info: EnEntryInfo, vocab: Set<string>): EnHit | null {
  const q = query.tokens;
  const typo = query.corrected ? 0.3 : 0;
  let best: EnHit | null = null;
  const consider = (h: EnHit) => {
    if (!best || h.score > best.score || (h.score === best.score && !h.viaTag && best.viaTag)) best = h;
  };

  for (const ph of info.phrases) {
    const p = ph.tokens;
    const viaTag = ph.kind === 'tag';
    if (eq(q, p)) {
      consider({ score: 4 - typo, method: 'exact', viaTag });
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
      consider({ score: base - typo, method: info.level === 'identity' ? 'substring' : hasCtx ? 'prefix' : 'substring', viaTag });
    } else if (q.size < p.size + info.ctx.size && q.size >= 1 && info.level !== 'identity') {
      // 部分: 打った語が 名前 + 文脈 に収まり、名前の語を半分以上含む (wheat bread → Whole Wheat + Bread)
      let inP = 0;
      let ok = true;
      for (const t of q) {
        if (p.has(t)) inP++;
        else if (!info.ctx.has(t) && !isNeutral(t) && !(info.dish && FILLING.has(t)) && vocab.has(t)) { ok = false; break; }
      }
      if (ok && inP >= 1 && inP * 2 >= p.size && inP < p.size && q.size >= 2) {
        // 名前の一部 + 文脈の語 (boiled egg → 「Hard-boiled」の種類 + 卵) は、その種類を指す複合なので強く置く。
        // 文脈の語を含まない (名前の一部だけ) ものは弱く。
        const withCtx = [...q].some((t) => !p.has(t));
        consider({ score: (withCtx ? 3.6 : 2.6) - typo, method: 'substring', viaTag });
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
