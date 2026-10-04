/**
 * identity-search.ts — ファジー検索エンジン (SEARCH_SPEC v0.4 §F2-0 / §F5)
 *
 * 検索単位: Identity ではなく「記録可能な状態」= SearchEntry
 *   (Identity + 任意の Attribute + 任意の Style)。
 * ユーザーが探す名前 (例: ポテトサラダ) の多くは Attribute 層にあるため、
 * Identity ラベルだけを対象にすると大半が検索から見えなくなる (v0.3 までの盲点)。
 *
 * スコア/階層:
 *   confident (層1・無言で1位表示): 完全一致(4) / 前方一致(3) / 部分一致(2)
 *   maybe     (層2・「もしかして」に隔離): bigram類似度 ≥ 40% (1〜2)
 *
 * 正規化 (`utils/identity-normalize.ts`): NFKC + カタカナ→ひらがな + 長音符除去 +
 * 小文字化。クエリはさらにローマ字→ひらがな変換版 (`romajiVariant`) も候補に持ち、
 * 両方で target とスコアリングして良い方を採用する (target 側はローマ字変換しない —
 * 理由は identity-normalize.ts のコメント参照)。
 */

import { ALL_IDENTITIES, ALL_US_IDENTITIES, JP_PRESETS, getAddonLabel, getBucketDef } from '@/constants/identity';
import { DISH_VOCABULARY } from '@/constants/identity/dish-vocabulary';
import { HEAD_NOUNS, type HeadNounTarget } from '@/constants/identity/head-nouns';
import { normalize, romajiVariant } from '@/utils/identity-normalize';
import {
  labelParts,
  MODIFIERS,
  QUANTITY,
  queryVariants,
  SINGLE_WORD,
  SUFFIXES,
  toKey,
  type QueryVariant,
} from '@/utils/identity-search-keys';
import type { AttributeOption, BucketKey, Identity, Preset, StyleOption } from '@/types/identity';
import type { AppLocale } from '@/types/locale';
import type { QuickLogHistoryMap } from '@/types/quick-log';

export interface SearchEntry {
  identity: Identity;
  attribute?: AttributeOption;
  style?: StyleOption;
  /**
   * 「ベース + Add-on」の組み合わせ (IA spec §1.5 判定3)。ある場合 identity/attribute/style は
   * プリセットが指すベース側の値で、選ぶと Add-on・量が選択済みで開く。
   */
  preset?: Preset;
}

export interface SearchEntryResult {
  entry: SearchEntry;
  score: number;
  tier: 'confident' | 'maybe';
  /** 一致の方式 (exact / prefix / substring / contains / bigram)。層の調整とベンチマーク用。 */
  method: MatchMethod;
}

export interface SearchEntriesResult {
  confident: SearchEntryResult[];
  maybe: SearchEntryResult[];
}

const MAX_RESULTS = 8;
const MAX_MAYBE_RESULTS = 4;
/** 同一 Identity から検索結果に出す上限。唐揚げ系(最大8件)等の氾濫を防ぐ (SEARCH_SPEC §F2-0)。 */
const PER_IDENTITY_CAP = 4;

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/**
 * 非対称な類似度 (クエリ側の bigram 数でのみ割る)。短いクエリのスコアが
 * 不当に高くなる欠点があるが、層4 (このカテゴリかも、§F5a) は「何も出さない
 * よりは緩く出す」が設計意図の最終フォールバックなので、ここでは維持する。
 */
function bigramSimilarity(q: string, target: string): number {
  if (q.length < 2 || target.length < 2) return 0;
  const qSet = bigrams(q);
  const tSet = bigrams(target);
  let matches = 0;
  qSet.forEach((b) => { if (tSet.has(b)) matches++; });
  return matches / qSet.size;
}

/**
 * Dice係数 (対称)。SearchEntry の層2「もしかして」専用 (§5.2.1)。
 * 非対称版は短いクエリが長い無関係な語に埋没して部分一致してしまう
 * (フォー→クアトロ・フォルマッジ等、§1.4 原因③) ため、層2 は分母を
 * 両方の bigram 数の和にして緩和する。
 */
function diceSimilarity(q: string, target: string): number {
  if (q.length < 2 || target.length < 2) return 0;
  const qSet = bigrams(q);
  const tSet = bigrams(target);
  let matches = 0;
  qSet.forEach((b) => { if (tSet.has(b)) matches++; });
  return (2 * matches) / (qSet.size + tSet.size);
}

type MatchMethod = 'exact' | 'prefix' | 'substring' | 'contains' | 'bigram';

const METHOD_RANK: Record<MatchMethod, number> = {
  exact: 0,
  prefix: 1,
  substring: 2,
  contains: 3,
  bigram: 4,
};

function scoreAgainst(q: string, target: string): { score: number; method: MatchMethod } | null {
  if (!target) return null;
  if (target === q) return { score: 4, method: 'exact' };
  if (target.startsWith(q)) return { score: 3, method: 'prefix' };
  // 「途中一致」は q が短いと無関係語への誤爆が起きる (例: 「フォー」→「ふぉ」
  // (2文字) が「クアトロ・フォルマッジ」に部分一致してしまう)。3文字未満は
  // 部分一致の対象外とし、bigram (もしかして) 側に委ねる。
  if (q.length >= 3 && target.includes(q)) return { score: 2, method: 'substring' };
  // 対称な Dice係数を使う (§5.2.1)。非対称版は「スコーン→とうもろこし」のような
  // 無関係語が層2「もしかして」に紛れ込む主因だった。
  // target が短い (bigram が1個しかない) と、その1個が一致しただけで Dice が
  // 不当に高くなる (例: 「グラタン」→「タン」、「たい焼き」→「焼き」)。
  // target 側にも substring と同じ最小3文字を課して同種の誤爆を防ぐ。
  if (target.length >= 3) {
    const sim = diceSimilarity(q, target);
    if (sim >= 0.4) return { score: 1 + sim, method: 'bigram' }; // 1.0 ~ 2.0
  }
  return null;
}

// ---------------------------------------------------------------------------
// インデックス構築 (起動時1回 × ロケール数)
// ---------------------------------------------------------------------------

/**
 * 文脈依存ラベル (SEARCH_SPEC §F2-0): 「普通」等、単独では意味をなさない
 * Attribute ラベル。3つ以上の Identity に同一ラベルで出現するものを修飾語と
 * みなし、単独では検索対象にしない (Identity名との複合形でのみ拾う)。
 * ロケール別に構築して JP/US の語彙が干渉しないようにする。
 */
function buildGenericAttributeLabels(identities: Identity[]): Set<string> {
  const counts = new Map<string, number>();
  for (const identity of identities) {
    for (const attr of identity.attributes ?? []) {
      counts.set(attr.label, (counts.get(attr.label) ?? 0) + 1);
    }
  }
  const generic = new Set<string>();
  counts.forEach((n, label) => { if (n >= 3) generic.add(label); });
  return generic;
}

// ---------------------------------------------------------------------------
// 索引 — 起動時に1回、エントリごとの照合対象 (fold 済みキー + bigram) を作る
// ---------------------------------------------------------------------------

type TargetKind = 'name' | 'part' | 'tag' | 'compound';

interface Target {
  /** fold 済みの照合キー。 */
  s: string;
  /** 畳み込み前 (normalize のみ) の形。 */
  plain: string;
  kind: TargetKind;
  /** bigram 集合。複合語 (compound) と3文字未満は持たない (層2 のノイズを増やさないため)。 */
  bg: Set<string> | null;
}

interface IndexedEntry {
  entry: SearchEntry;
  targets: Target[];
}

function fromKey(s: string, kind: TargetKind, plain: string = s): Target | null {
  if (!s) return null;
  return { s, plain, kind, bg: kind !== 'compound' && s.length >= 3 ? bigrams(s) : null };
}

function targetsOf(raws: Array<[string, TargetKind]>): Target[] {
  const seen = new Set<string>();
  const out: Target[] = [];
  for (const [raw, kind] of raws) {
    const t = fromKey(toKey(raw), kind, normalize(raw));
    if (!t || seen.has(t.s)) continue;
    seen.add(t.s);
    out.push(t);
  }
  return out;
}

/**
 * バケット別の主辞 (寿司 / 丼 / 麺 / パン …)。主辞辞書 (head-nouns.ts) のうち、そのバケットを
 * 指すもの。Identity のラベルに主辞が入っていなくても (「巻き・いなり・手巻き」に「寿司」は無い)、
 * 「いなり寿司」「巻き寿司」と打たれるので、複合語のベース名に足す。
 */
const HEADS_BY_BUCKET: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const entry of HEAD_NOUNS) {
    for (const target of entry.targets) {
      const list = m.get(target.bucket) ?? [];
      for (const head of entry.heads) {
        const k = toKey(head);
        if (k.length >= 2 && !list.includes(k)) list.push(k);
      }
      m.set(target.bucket, list);
    }
  }
  return m;
})();

/** 複合語の「ベース側」の名前: Identity のラベルの部分 (両順序で使える)。 */
function compoundHeads(identity: Identity): string[] {
  const names = labelParts(identity.label).filter((p) => SINGLE_WORD.test(p)).map(toKey);
  return [...new Set(names)].filter((n) => n.length >= 1 && n.length <= 10);
}

/**
 * 複合語の「ベース側」のうち、修飾語 + 主辞 の1方向だけに使うもの: 検索タグ + 主辞辞書の語。
 *
 * 主辞辞書の語 (寿司・丼・麺・定食…) は、バケット内の全 Identity に配ると広すぎる — ハンバーグ属性に
 * 「定食」を配ると、定食ではない meat_solo にも「ハンバーグ定食」が完全一致してしまう。
 * そのため「その Identity が自分の名前の中にその主辞を既に持っている」場合だけ配る
 * (巻き寿司 ← 「巻き・いなり・手巻き」は寿司バケットの語を名前に持たないので、寿司バケットの
 * Identity にだけ配る、という意味ではなく、**同じ語を名前に含む Identity 自身**に限る)。
 * 名前に持たないが主辞が必須の Identity (maki → 寿司) は、タグ側に主辞を足す (データ)。
 */
function tailHeadsOf(identity: Identity): string[] {
  const names = (identity.searchTags ?? []).map(toKey);
  const own = [
    toKey(identity.label),
    ...labelParts(identity.label).map(toKey),
    ...(identity.attributes ?? []).flatMap((a) => labelParts(a.label).map(toKey)),
  ];
  for (const head of HEADS_BY_BUCKET.get(identity.primaryHome.bucket) ?? []) {
    if (own.some((n) => n.includes(head))) names.push(head);
  }
  return [...new Set(names)].filter((n) => n.length >= 1 && n.length <= 10);
}

/**
 * 属性名 × ベース名 の複合語を作る (醤油 × ラーメン → 醤油ラーメン / ラーメン醤油)。
 *
 * 「打った語がラベルの一部か」しか見ない照合では、DB に「ラーメン」と属性「醤油」が別々にあっても
 * 「醤油ラーメン」に着地できない (打った語のほうが長いと一致しない)。ユーザーは属性だけの語
 * (「醤油」「クリーム」)ではなく、ベース名と組にして打つ。
 */
function compoundsFor(attrNames: string[], headNames: string[], tailHeads: string[] = []): string[] {
  const out = new Set<string>();
  const redundant = (a: string, h: string) => !a || !h || a === h || a.includes(h) || h.includes(a);
  for (const a of attrNames) {
    // ラベルの部分: 属性が修飾語の醤油ラーメン、Identity の語が修飾語の牛タン・豚バラ のどちらもある。
    for (const h of headNames) {
      if (redundant(a, h)) continue;
      out.add(a + h);
      out.add(h + a);
    }
    // 検索タグ・主辞辞書の語 (寿司・丼・麺…)は「修飾語 + 主辞」の1方向だけ。タグは別名の寄せ集めで、
    // 逆順 (トースト + ナン) は不自然なうえ、前方一致に拾われて無関係な属性を呼び出す。
    for (const h of tailHeads) {
      if (redundant(a, h)) continue;
      out.add(a + h);
    }
  }
  return [...out];
}


function identityTargets(identity: Identity, jp: boolean): Target[] {
  const raws: Array<[string, TargetKind]> = [[identity.label, 'name']];
  if (jp) for (const p of labelParts(identity.label)) raws.push([p, 'part']);
  for (const t of identity.searchTags ?? []) raws.push([t, 'tag']);
  const targets = targetsOf(raws);
  if (!jp) return targets;

  // 部分 × そのバケットの主辞 (巻き × 寿司 → 巻き寿司)
  const seen = new Set(targets.map((t) => t.s));
  const parts = labelParts(identity.label)
    .filter((p) => SINGLE_WORD.test(p))
    .map(toKey)
    .filter((n) => n.length >= 1 && n.length <= 10);
  for (const c of compoundsFor(parts, [], tailHeadsOf(identity))) {
    if (seen.has(c)) continue;
    seen.add(c);
    const t = fromKey(c, 'compound');
    if (t) targets.push(t);
  }
  return targets;
}

function styleTargets(style: StyleOption, jp: boolean): Target[] {
  const raws: Array<[string, TargetKind]> = [[style.label, 'name']];
  if (jp) for (const p of labelParts(style.label)) raws.push([p, 'part']);
  for (const t of style.searchTags ?? []) raws.push([t, 'tag']);
  return targetsOf(raws);
}

function attributeTargets(
  identity: Identity,
  attribute: AttributeOption,
  opts: { jp: boolean; generic: boolean; contextBound: (k: string) => boolean; heads: string[]; tailHeads: string[] },
): Target[] {
  const tags = (attribute.searchTags ?? []).map((t) => [t, 'tag'] as [string, TargetKind]);
  if (!opts.jp) {
    // 英語 (US): 従来どおり。複合語・部分への分解はしない。
    return targetsOf(
      opts.generic
        ? [[`${identity.label}${attribute.label}`, 'name'], ...tags]
        : [[attribute.label, 'name'], ...tags],
    );
  }

  const raws: Array<[string, TargetKind]> = [];
  if (opts.generic) {
    raws.push([`${identity.label}${attribute.label}`, 'compound']);
  } else {
    // 単独で検索できるのは「その属性が主役の名前」だけ。他の Identity が同名の名詞を持つ
    // (「たまご」「ツナ」「チーズ」「鮭」は別の食材そのもの) 場合は、単独で打たれたときに
    // そちらへ着地すべきなので、この属性は複合語 (たまごサンド) 経由でのみ辿り着けるようにする。
    const bare: Array<[string, TargetKind]> = [[attribute.label, 'name']];
    for (const p of labelParts(attribute.label)) bare.push([p, 'part']);
    for (const [raw, kind] of bare) if (!opts.contextBound(toKey(raw))) raws.push([raw, kind]);
  }
  raws.push(...tags);

  const attrNames = [
    ...labelParts(attribute.label).map(toKey),
    ...(attribute.searchTags ?? []).map(toKey),
  ].filter((n) => n.length >= 1 && n.length <= 10);
  // 「バラ（牛）」の括弧内は、ベース側 (牛・豚) のうちどれかを絞る修飾。ベース名を総当たりすると
  // バラ（牛）と バラ（豚）の両方が「豚バラ」に完全一致してしまうので、括弧内の語だけを相手にする。
  const qualifier = attribute.label.match(/[(（]([^)）]{1,2})[)）]/)?.[1];
  const heads = qualifier ? [toKey(qualifier)] : opts.heads;
  const compounds = compoundsFor([...new Set(attrNames)], heads, qualifier ? [] : opts.tailHeads);

  const seen = new Set<string>();
  const out: Target[] = [];
  for (const t of targetsOf(raws)) { seen.add(t.s); out.push(t); }
  for (const c of compounds) {
    if (seen.has(c)) continue;
    seen.add(c);
    const t = fromKey(c, 'compound');
    if (t) out.push(t);
  }
  return out;
}

function buildIndex(identities: Identity[], genericLabels: Set<string>, presets: Preset[], jp: boolean): IndexedEntry[] {
  // 名詞の持ち主: Identity 層の label / 部分 / searchTags → それを名乗る Identity の id 集合。
  const owners = new Map<string, Set<string>>();
  // 誘導元 → 誘導先: 属性/スタイルの migration で別の Identity へ移る Identity (牛・豚 → 揚げもの単品)。
  // 誘導元は誘導先の語を別名として持っている (beef_pork の「メンチカツ」) が、それは「他の食材の名詞」
  // ではなく誘導先そのものを指す。
  const redirectsTo = new Map<string, Set<string>>();
  if (jp) {
    for (const i of identities) {
      for (const opt of [...(i.attributes ?? []), ...(i.styles ?? [])]) {
        const to = opt.migration?.identityKey;
        if (!to || to === i.id) continue;
        let set = redirectsTo.get(i.id);
        if (!set) { set = new Set(); redirectsTo.set(i.id, set); }
        set.add(to);
      }
    }
    for (const i of identities) {
      for (const raw of [...labelParts(i.label), ...(i.searchTags ?? [])]) {
        const k = toKey(raw);
        if (!k) continue;
        let set = owners.get(k);
        if (!set) { set = new Set(); owners.set(k, set); }
        set.add(i.id);
      }
    }
  }

  const out: IndexedEntry[] = [];
  for (const identity of identities) {
    out.push({ entry: { identity }, targets: identityTargets(identity, jp) });

    const heads = jp ? compoundHeads(identity) : [];
    const tailHeads = jp ? tailHeadsOf(identity) : [];
    const contextBound = (k: string) => {
      const o = owners.get(k);
      if (!o) return false;
      for (const id of o) {
        if (id === identity.id) continue;
        if (redirectsTo.get(id)?.has(identity.id)) continue; // 誘導元の別名は他人の名詞ではない
        return true;
      }
      return false;
    };
    for (const attribute of identity.attributes ?? []) {
      out.push({
        entry: { identity, attribute },
        targets: attributeTargets(identity, attribute, { jp, generic: genericLabels.has(attribute.label), contextBound, heads, tailHeads }),
      });
    }
    for (const style of identity.styles ?? []) {
      out.push({ entry: { identity, style }, targets: styleTargets(style, jp) });
    }
  }

  for (const preset of presets) {
    const identity = identities.find((i) => i.id === preset.identityId);
    if (!identity) throw new Error(`Preset "${preset.id}": unknown identity "${preset.identityId}"`);
    out.push({
      entry: {
        identity,
        attribute: identity.attributes?.find((a) => a.key === preset.attributeKey),
        style: identity.styles?.find((st) => st.key === preset.styleKey),
        preset,
      },
      targets: targetsOf([[preset.label, 'name'], ...(preset.searchTags ?? []).map((t) => [t, 'tag'] as [string, TargetKind])]),
    });
  }
  return out;
}

const JP_GENERIC_LABELS = buildGenericAttributeLabels(ALL_IDENTITIES);
const JP_INDEX: IndexedEntry[] = buildIndex(ALL_IDENTITIES, JP_GENERIC_LABELS, JP_PRESETS, true);
const US_GENERIC_LABELS = buildGenericAttributeLabels(ALL_US_IDENTITIES);
const US_INDEX: IndexedEntry[] = buildIndex(ALL_US_IDENTITIES, US_GENERIC_LABELS, [], false);

// ---------------------------------------------------------------------------
// 照合
// ---------------------------------------------------------------------------

interface Hit {
  score: number;
  method: MatchMethod;
  tier: 'confident' | 'maybe';
}

interface QueryKey extends QueryVariant {
  bg: Set<string>;
}

const KANJI2 = /^[\u4e00-\u9fff]{2}$/;
const KANJI = /[\u4e00-\u9fff]/;

let knownCache: Set<string> | null = null;
let headCache: Set<string> | null = null;

/** 検索で意味を持つ既知の語 (Identity / 種類 / スタイルの名前・部分・タグ + 料理名辞書 + 主辞)。遅延構築。 */
function knownTokens(): Set<string> {
  if (knownCache) return knownCache;
  const set = new Set<string>();
  for (const { targets } of JP_INDEX) {
    for (const t of targets) if (t.kind !== 'compound' && t.s.length >= 2) set.add(t.s);
  }
  for (const { key } of DISH_VOCABULARY_INDEX) if (key.length >= 2) set.add(key);
  for (const { head } of HEAD_NOUNS_INDEX) if (head.length >= 2) set.add(head);
  knownCache = set;
  return set;
}

/** 主辞辞書の語 (ぱん / めん / どん / けき …)。2文字のかなは、これらのときだけ語尾一致を許す。 */
function headNounSet(): Set<string> {
  if (headCache) return headCache;
  headCache = new Set(HEAD_NOUNS_INDEX.map((h) => h.head));
  return headCache;
}

function diceSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let m = 0;
  a.forEach((x) => { if (b.has(x)) m++; });
  return (2 * m) / (a.size + b.size);
}

/**
 * 1つの照合キーと1つの target の比較。
 *   exact 4 > prefix 3 > substring 2 > contains (1.5〜1.95) > bigram (1〜2, 常に maybe)
 *
 * contains = 「target がクエリの中に含まれる」。ユーザーは修飾語つきで打つ
 * (「ビーフカレー」「クリームコロッケ」「6枚切り食パン」) が、DB のラベルは修飾語なしの
 * 名詞なので、打った語のほうが長い。判定は被覆率 (target の長さ / クエリの長さ) で:
 *   - 0.5 以上 → 層1 (自信を持って出す)
 *   - 未満     → 層2「もしかして」
 * 語尾 (主辞) に一致する場合は加点する — 日本語の複合語は主辞が末尾 (チョコ**ケーキ**) なので。
 * 1〜2文字の target は誤爆が多いため、漢字2文字 (寿司・冷麺) か語尾一致のときだけ許可する。
 */
function scoreTarget(q: QueryKey, t: Target, allowContains: boolean, identityLevel: boolean): Hit | null {
  if (t.s === q.key) return { score: 4, method: 'exact', tier: 'confident' };
  // 複合語は機械的に作った文字列。前方一致は、ある程度打ち進めた (4文字以上) ときだけ。
  if (t.s.startsWith(q.key) && (t.kind !== 'compound' || q.key.length >= 4)) {
    return { score: 3, method: 'prefix', tier: 'confident' };
  }
  // 「途中一致」は q が短いと無関係語への誤爆が起きる (例: 「フォー」→「ふぉ」(2文字) が
  // 「クアトロ・フォルマッジ」に部分一致してしまう)。3文字未満は対象外。
  // 2文字の漢字語 (寿司・冷麺・餃子) は語として十分に特定的なので例外的に許可する。
  // 複合語 (温野菜炒め) は機械的に作った文字列なので、部分一致の相手にはしない — 「野菜炒め」と
  // 打った人に「温野菜」を層1で返してしまう。複合語は完全・前方一致 (= その語を打った) にだけ使う。
  if (t.kind !== 'compound' && (q.key.length >= 3 || KANJI2.test(q.key)) && t.s.includes(q.key)) {
    return { score: 2, method: 'substring', tier: 'confident' };
  }

  if (allowContains && t.s.length < q.key.length && q.key.includes(t.s)) {
    const head = q.key.endsWith(t.s);
    // 2文字は漢字2字 (寿司・冷麺) か主辞辞書の語 (ぱん・めん) の語尾一致だけ。「とふ」「たい」のような
    // 一般のかな2文字は無関係な語に埋もれて誤爆する (ポトフ→豆腐、パッタイ→鯛)。
    const eligible =
      t.s.length >= 3 || (t.s.length === 2 && head && (KANJI2.test(t.s) || headNounSet().has(t.s)));
    if (eligible) {
      const coverage = t.s.length / q.key.length;
      // 層1に出す条件:
      //   (a) 語の大半 (65%以上) を占める … 位置を問わない (低脂肪**乳** / **手羽**元 / **もんじゃ**焼き)
      //   (b) 語尾 (主辞) に一致し、半分以上を占め、残りが既知の修飾 … ビーフ**カレー** / クリーム**コロッケ**
      //       日本語の複合語は主辞が末尾にある。残りが未知なら別の語の一部かもしれない (シュー**クリーム**)。
      // どちらでもなければ層2。先頭側だけの一致 (ロースト**ビーフ**→ロースト) は修飾語に過ぎない。
      //   (c) 食材そのもの (Identity 層) の語尾一致で、3割以上を占める … ショート**ケーキ** / オレンジ**ジュース**
      //       分類名 (ケーキ・ジュース・ラーメン) の前に付く修飾語は無数にあり、未知でも分類は確かに合っている。
      //       漢字を含む語 (団子・寿司・麺) は意味が透明なので、属性ラベルにも同じ扱いをする (みたらし**団子**)。
      //       かな・カタカナの属性ラベル (クリーム) には許さない — 前に何が付くかで別の物になる (シュー**クリーム**)。
      let tier: 'confident' | 'maybe' = 'maybe';
      if (coverage >= 0.65) {
        tier = 'confident';
      } else if ((identityLevel || KANJI.test(t.s)) && head && coverage >= 0.3) {
        tier = 'confident';
      } else if (q.key.startsWith(t.s) && SUFFIXES.has(q.key.slice(t.s.length))) {
        tier = 'confident';
      } else if (head && coverage >= 0.5) {
        const rest = q.key.slice(0, q.key.length - t.s.length);
        if (knownTokens().has(rest) || QUANTITY.test(rest) || MODIFIERS.has(rest)) tier = 'confident';
      }
      return { score: 1.4 + 0.4 * coverage + (head ? 0.15 : 0), method: 'contains', tier };
    }
  }

  // 対称な Dice係数 (§5.2.1)。target が短い (bigram が1個しかない) と、その1個が一致しただけで
  // Dice が不当に高くなる (例: 「グラタン」→「タン」) ため target 側にも最小3文字を課す。
  if (t.bg && t.s.length >= 3) {
    const sim = diceSets(q.bg, t.bg);
    if (sim >= 0.4) return { score: 1 + sim, method: 'bigram', tier: 'maybe' };
  }
  return null;
}

/** 同一 Identity からの件数を PER_IDENTITY_CAP で打ち切る (スコア順は維持)。 */
function capPerIdentity(results: SearchEntryResult[], cap: number): SearchEntryResult[] {
  const counts = new Map<string, number>();
  const out: SearchEntryResult[] = [];
  for (const r of results) {
    // Preset はベース Identity の枠を食わない (「パン」が4件で埋まっても
    // ガーリックトーストが消えない / その逆も起きない)。
    const id = r.entry.preset ? `preset:${r.entry.preset.id}` : r.entry.identity.id;
    const n = counts.get(id) ?? 0;
    if (n >= cap) continue;
    counts.set(id, n + 1);
    out.push(r);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ランキング: ユーザー選択頻度 (SEARCH_SPEC v0.4 §5.3, 検索の層内順位づけ)
// ---------------------------------------------------------------------------

/**
 * finalScore = matchScore × (1 + userFreqWeight × log(1 + userSelectCount))
 *
 * §5.3 の式のうち global 項は割愛している — この app はローカル専用でユーザー
 * 横断の集計 (Analytics バックエンド) を持たないため、globalSelectCount を
 * 埋めるデータ源が存在しない。捏造するより明示的に省略する方が誠実と判断した。
 *
 * 頻度はスコアの「並び順」にのみ影響させ、層 (confident/maybe) の判定には
 * 使わない — bigram一致 (層2) が選択頻度だけで層1相当に格上げされると、
 * 「確信度で分離する」という設計原則 (§F5) が崩れるため。
 */
const USER_FREQ_WEIGHT = 0.5;

function frequencyMultiplier(userSelectCount: number): number {
  return 1 + USER_FREQ_WEIGHT * Math.log(1 + userSelectCount);
}

/** SearchEntry を一意に識別するキー (Identity + Attribute + Style)。 */
function entryFrequencyKey(entry: SearchEntry): string {
  // Preset は通常のログ (ベース Identity + appliedAddons) として記録されるため履歴上は
  // ベースと区別できず、頻度学習の対象外にする (ベースの頻度を横取りしない)。
  if (entry.preset) return `preset:${entry.preset.id}`;
  return `${entry.identity.id}|${entry.attribute?.key ?? ''}|${entry.style?.key ?? ''}`;
}

/**
 * quickLogHistory (⭐️タブ/自動学習と共有するユーザー選択履歴) から
 * (Identity, Attribute, Style) 単位の選択回数を集計する。
 * `QuickLogSelection.subcategoryKey` は Identity-first IA 由来のエントリでは
 * 常に record Identity の id と一致する (identity-log-bridge.ts の
 * `subTypeKey: recordIdentity.id` を参照)。
 */
function buildUserFrequencyMap(history: QuickLogHistoryMap | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!history) return map;
  for (const list of Object.values(history)) {
    for (const sel of list) {
      const key = `${sel.subcategoryKey}|${sel.attrKey ?? ''}|${sel.styleKey ?? ''}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

export interface SearchOptions {
  /**
   * ⭐️タブ/自動学習と共有するユーザー選択履歴 (settings.quickLogHistory)。
   * 渡すと同一マッチ層内でユーザーの選択頻度に応じて並び替える (§5.3 P4)。
   * 省略時はマッチスコアのみで並ぶ (頻度学習なし)。
   */
  history?: QuickLogHistoryMap;
  /** 検索対象を切り替えるロケール。'en-US' の場合 US Identity セットを使う。デフォルト 'ja'。 */
  locale?: AppLocale;
}

/**
 * ファジー検索。confident (層1) / maybe (層2「もしかして」) に分けて返す。
 * それぞれ finalScore 降順・ラベル昇順、同一 Identity 上限 PER_IDENTITY_CAP 件で
 * 絞り込み済み。finalScore = matchScore × 頻度倍率 (§5.3) — 層の判定自体は
 * マッチスコアの時点で確定しており、頻度は同じ層の中の並び順にのみ影響する。
 */
export function searchEntriesFuzzy(query: string, opts?: SearchOptions): SearchEntriesResult {
  const variants: QueryKey[] = queryVariants(query).map((v) => ({ ...v, bg: bigrams(v.key) }));
  if (variants.length === 0) return { confident: [], maybe: [] };

  const isUS = opts?.locale === 'en-US';
  const index = isUS ? US_INDEX : JP_INDEX;
  const sortLocale = isUS ? 'en' : 'ja';

  const results: SearchEntryResult[] = [];

  for (const { entry, targets } of index) {
    const identityLevel = !entry.preset && !entry.attribute && !entry.style;
    let best: (Hit & { net: number }) | null = null;
    for (const q of variants) {
      for (const t of targets) {
        const h = scoreTarget(q, t, !isUS, identityLevel);
        if (!h) continue;
        // 名前 (ラベル/部分/複合語) 経由の一致は、同じ強さのタグ経由の一致に勝つ。タグは別名の
        // 寄せ集めで、他の Identity の属性名を借りていることがある (メンチカツ / そば / まぐろ)。
        // スタイルの「部分」も同様に弱く扱う — スタイルは調理法・状態の修飾 (「生・刺身」) で、
        // 素材名の別名ではない。分割した部分が素材そのもの (刺身盛り) と同点になっても素材を先にする。
        const weak = t.kind === 'tag' || (t.kind === 'part' && !!entry.style && !entry.attribute);
        // 畳み込み前の形でも完全一致なら加点。畳み込みで同じキーになる別の語 (かれい=鰈 / カレー) は、
        // 打った形そのままの方を先にする。
        const exactPlain = h.method === 'exact' && t.plain === q.plain ? 0.1 : 0;
        const net = h.score - q.penalty - (weak ? 0.05 : 0) + exactPlain;
        // 層1に値する根拠が1つでもあれば、層2の根拠 (bigram は最大 2.0 点) がそれより高得点でも
        // 層1として扱う。点数だけで選ぶと、含まれる語 (1.5〜1.95) より bigram が勝ち、層2に落ちる。
        const better =
          !best ||
          (h.tier === 'confident' && best.tier !== 'confident') ||
          (h.tier === best.tier &&
            (net > best.net || (net === best.net && METHOD_RANK[h.method] < METHOD_RANK[best.method])));
        if (better) {
          best = { ...h, net };
        }
      }
    }
    if (!best) continue;
    // Preset の途中一致は通常エントリより 0.1 下げる。「ごはん」と打ったときに、タグ
    // (たまごかけごはん…) へ途中一致した Preset がごはん本体・おにぎり等を押しのけない
    // ため。完全一致・前方一致 (= 料理名そのものを打った) は割り引かない。
    // 前方一致 (料理名の前半を打っただけ。とろけるチーズ→とろけるチーズトースト) の Preset は、
    // 食材そのものの推測一致 (contains, 約1.7) より下に置く。
    const score =
      entry.preset && best.method === 'substring' ? best.net - 0.1
      : entry.preset && best.method === 'prefix' ? best.net - 1.5
      : best.net;
    results.push({ entry, score, tier: best.tier, method: best.method });
  }

  const freqMap = buildUserFrequencyMap(opts?.history);

  // 同点の並び (五十音順で決まっていた頃は「サラダ」→「オイル」、「ホルモン」→食材本体 が先頭に来た):
  //  - 同じ Identity の中では、より具体的な属性/スタイルを先に。Identity 自身の検索語が属性名と
  //    同じ (ホルモン / サバ / 団子) とき、打った人の第一希望はその属性。
  //  - 別の Identity どうしなら、食材そのもの (Identity 層) を先に。属性ラベルは文脈依存
  //    (サンドイッチの「たまご」) のことが多く、素の名詞を打った人は食材そのものを探している。
  //  - Preset は料理名を打った結果なので最優先。
  const isSpecific = (r: SearchEntryResult) => !r.entry.preset && !!(r.entry.attribute || r.entry.style);
  const bestSpecific = new Map<string, number>();
  for (const r of results) {
    if (!isSpecific(r)) continue;
    const cur = bestSpecific.get(r.entry.identity.id);
    if (cur === undefined || r.score > cur) bestSpecific.set(r.entry.identity.id, r.score);
  }
  const nudge = (r: SearchEntryResult) => {
    // Preset の優遇は、料理名そのもの (完全一致) を打ったときだけ。名前の一部 (とろけるチーズ) を
    // 打っただけの前方一致で、食材そのものより先に出さない。
    if (r.entry.preset) return r.method === 'exact' ? 0.03 : 0;
    if (isSpecific(r)) return 0.01;
    const sibling = bestSpecific.get(r.entry.identity.id);
    return sibling !== undefined && sibling >= r.score ? 0 : 0.02;
  };
  const finalScore = (r: SearchEntryResult) =>
    (r.score + nudge(r)) * frequencyMultiplier(freqMap.get(entryFrequencyKey(r.entry)) ?? 0);
  const label = (r: SearchEntryResult) =>
    r.entry.preset?.label ?? r.entry.attribute?.label ?? r.entry.style?.label ?? r.entry.identity.label;
  results.sort((a, b) => finalScore(b) - finalScore(a) || label(a).localeCompare(label(b), sortLocale));

  // 「含まれる語」(ビーフカレー→カレー) は、確実な一致 (完全・前方・部分) が他に無いときの代替。
  // 確実な一致があるのに推測の一致を層1に並べると、取り違えが増える
  // (「ロース」「たい」「ライス」のような短い語が、確実な一致の隣に別物を連れてくる)。
  // 推測の一致は層2「もしかして」へ回す。
  // Preset は完全一致だけを「確実」に数える。料理名の前半を打っただけの前方一致 (とろけるチーズ→
  // とろけるチーズトースト) で、食材そのものの推測一致を層2へ追いやらない。
  const hasSolid = results.some(
    (r) => r.tier === 'confident' && r.method !== 'contains' && (!r.entry.preset || r.method === 'exact'),
  );
  const demote = (r: SearchEntryResult) => hasSolid && r.method === 'contains';
  const confident = results.filter((r) => r.tier === 'confident' && !demote(r));
  const maybe = results.filter((r) => r.tier === 'maybe' || demote(r));

  return {
    confident: capPerIdentity(confident, PER_IDENTITY_CAP).slice(0, MAX_RESULTS),
    maybe: capPerIdentity(maybe, PER_IDENTITY_CAP).slice(0, MAX_MAYBE_RESULTS),
  };
}

// ---------------------------------------------------------------------------
// 層2/3: 主辞辞書・料理名辞書 (SEARCH_SPEC v0.4 §5.4.5 / §5.4.6)
// ---------------------------------------------------------------------------

export interface VocabularyMatch {
  bucket: BucketKey;
  /** 特定 Identity まで絞れる場合のみ (主辞辞書の一部エントリ)。 */
  identity?: string;
  source: 'dish_vocabulary' | 'head_noun';
}

/** DISH_VOCABULARY のキーを正規化してインデックス化 (起動時1回)。 */
const DISH_VOCABULARY_INDEX: Array<{ key: string; bucket: BucketKey }> = Object.entries(
  DISH_VOCABULARY
).map(([key, bucket]) => ({ key: toKey(key), bucket }));

/**
 * 層3: 料理名辞書との照合。主辞を持たない単一語 (グラタン/ケバブ等) を拾う。
 * bigram は使わない — 層3は「知っている語」への確定的な着地であるべきで、
 * 層2 (bigramベースの「もしかして」) と役割が混ざらないようにする。
 */
function matchDishVocabulary(queryVariants: string[]): BucketKey | null {
  let best: { score: number; method: MatchMethod; bucket: BucketKey } | null = null;
  for (const { key, bucket } of DISH_VOCABULARY_INDEX) {
    for (const q of queryVariants) {
      const m = scoreAgainst(q, key);
      if (!m || m.method === 'bigram') continue;
      if (!best || m.score > best.score) {
        best = { ...m, bucket };
      }
    }
  }
  return best?.bucket ?? null;
}

/** HEAD_NOUNS の heads を正規化してインデックス化 (起動時1回)。手書きの表記ゆれ
 * (長音符の有無など) が normalize() の挙動と食い違うのを防ぐ。 */
const HEAD_NOUNS_INDEX: Array<{ head: string; targets: HeadNounTarget[] }> = HEAD_NOUNS.flatMap(
  (entry) => entry.heads.map((head) => ({ head: toKey(head), targets: entry.targets }))
);

/**
 * 層2: 主辞辞書との照合 (SEARCH_SPEC §5.2.2)。
 * クエリが登録済み主辞で終わり、かつ残りが1文字以上ある場合のみマッチとする —
 * 文字列の単純な末尾一致は形態素境界を越えた誤爆を招く (グラタン→牛タン等)。
 */
function matchHeadNouns(queryVariants: string[]): HeadNounTarget[] {
  const seen = new Set<string>();
  const out: HeadNounTarget[] = [];
  for (const { head, targets } of HEAD_NOUNS_INDEX) {
    const hit = queryVariants.some((q) => q.length > head.length && q.endsWith(head));
    if (!hit) continue;
    for (const target of targets) {
      const key = `${target.bucket}:${target.identity ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(target);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

/**
 * 層2/3 まとめて照合する。層3 (料理名辞書) を優先する — 「たい焼き」のように
 * 単一語として辞書に確定登録されている方が、末尾主辞 (「焼き」) だけから推測
 * するより具体的で信頼できるため。
 */
export function getVocabularyMatches(query: string, locale?: AppLocale): VocabularyMatch[] {
  // 主辞辞書・料理名辞書は JP 専用。en-US は英語の Identity ラベルで直接マッチするため不要。
  if (locale === 'en-US') return [];
  const keys = queryVariants(query).map((v) => v.key);
  if (keys.length === 0) return [];

  const dishHit = matchDishVocabulary(keys);
  if (dishHit) return [{ bucket: dishHit, source: 'dish_vocabulary' }];

  return matchHeadNouns(keys).map((t) => ({ ...t, source: 'head_noun' as const }));
}

// ---------------------------------------------------------------------------
// 層4フォールバック: カテゴリヒントチップ
// ---------------------------------------------------------------------------

/**
 * クエリに含まれるキーワードから「このカテゴリだと思われる」バケット候補を
 * 最大4件返す。層1〜3のヒット有無に関わらず常に計算し、検索シート側で常時
 * 表示する (SEARCH_SPEC v0.4 §F5: 誤ヒットがカテゴリへの逃げ道を塞ぐ構造の解消)。
 *
 * データソースは DISH_VOCABULARY (旧 CATEGORY_KEYWORD_MAP を統合・置換、§5.4.6)。
 */
export function getCategoryHints(query: string, locale?: AppLocale): BucketKey[] {
  // カテゴリヒントは JP 料理名辞書ベース。en-US は将来 US dish vocabulary で対応予定。
  if (locale === 'en-US') return [];
  const keys = queryVariants(query).map((v) => v.key);
  if (keys.length === 0) return [];

  const seen = new Set<BucketKey>();
  const hits: BucketKey[] = [];

  for (const { key, bucket } of DISH_VOCABULARY_INDEX) {
    if (seen.has(bucket)) continue;
    const match = keys.some(
      (q) => q.includes(key) || key.includes(q) || bigramSimilarity(q, key) >= 0.4
    );
    if (match) {
      seen.add(bucket);
      hits.push(bucket);
    }
    if (hits.length >= 4) break;
  }

  return hits;
}

/** 検索結果1件の表示用ラベルとサブラベル (Identity + バケット)。 */
export function describeSearchEntry(entry: SearchEntry): {
  label: string;
  identityLabel: string | null;
  bucketEmoji: string | null;
  bucketLabel: string | null;
} {
  const bucket = getBucketDef(entry.identity.primaryHome.bucket);
  if (entry.preset) {
    // サブラベルに組み立ての中身を出す (「フランスパン + バター」)。検索結果の段階で
    // 何が入った状態で開くのかが分かり、選ぶ前に意図と合っているか判断できる。
    const baseName =
      entry.attribute && !entry.attribute.isDefault ? entry.attribute.label : entry.identity.label;
    const parts = [baseName, ...entry.preset.addons.map((a) => getAddonLabel(a.refId))];
    // 行が長くなりすぎるので3要素までに丸める (コブサラダは6種類のせ)。全部入りは開いた先で見える。
    const shown = parts.slice(0, 3).join(' + ') + (parts.length > 3 ? ' …' : '');
    return {
      label: entry.preset.label,
      identityLabel: shown,
      bucketEmoji: bucket?.emoji ?? null,
      bucketLabel: bucket?.label ?? null,
    };
  }
  const label = entry.attribute?.label ?? entry.style?.label ?? entry.identity.label;
  const isSubEntry = !!entry.attribute || !!entry.style;
  return {
    label,
    identityLabel: isSubEntry ? entry.identity.label : null,
    bucketEmoji: bucket?.emoji ?? null,
    bucketLabel: bucket?.label ?? null,
  };
}
