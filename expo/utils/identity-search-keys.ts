/**
 * identity-search-keys.ts — 検索の照合キーを作る純粋関数群 (SEARCH_SPEC §5.1 の拡張)
 *
 * `normalize()` (NFKC + カタカナ→ひらがな + 長音符除去) の**後段**に重ねる。normalize() 自体は
 * 語彙辞書 (head-nouns / dish-vocabulary) や英語タグの前方一致にも使われているので触らない。
 *
 * ここでやること:
 *   1. fold … 表記ゆれの畳み込み (送り仮名 / 長音 / 小書き)。クエリ側・target 側の**両方**に掛ける
 *   2. stripNoise … 量・店の修飾語を落とす (「味噌ラーメン大盛り」「セブンのサラダチキン」)
 *   3. stripHonorific … 「お味噌汁」の「お」
 *   4. labelParts … 「サラダ・生野菜」「ラーメン (あっさり)」を検索単位に分ける
 *
 * なぜ両側に掛けるか: 片側だけだと「ぎょうざ」(IME 入力) と「ギョーザ」(ラベル) のように、どちらの
 * 表記を持つ target に対しても同じ形に揃わない。同じ関数を通した結果同士を比べる。
 */

import { normalize, romajiVariant } from '@/utils/identity-normalize';

// 送り仮名: 焼き鳥/焼鳥、巻き寿司/巻寿司、揚げ物/揚物、浅漬け/浅漬、大盛り/大盛。
const OKURIGANA: Array<[RegExp, string]> = [
  [/([焼巻炊切割])き/g, '$1'],
  [/揚げ/g, '揚'],
  [/漬け/g, '漬'],
  [/盛り/g, '盛'],
];

// 長音: 「お段 + う」「え段 + い」「ゅ + う」は長音符「ー」を除去した形 (normalize) と揃える。
// 例: ぎょうざ / ギョーザ → ぎょざ、けいき / ケーキ → けき、とうふ / トーフ → とふ
const LONG_O = /([おこそとのほもよろごぞどぼぽょゅ])う/g;
const LONG_E = /([えけせてねへめれげぜでべぺ])い/g;

// 小書き: コロッケ / コロツケ (IME で「っ」を「つ」と打つ誤りが多い)、ジュース / ジユース。
const SMALL_TO_LARGE: Record<string, string> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
};

/** normalize() 済みの文字列を表記ゆれの無い照合キーにする。 */
export function fold(normalized: string): string {
  let s = normalized;
  for (const [re, to] of OKURIGANA) s = s.replace(re, to);
  s = s.replace(LONG_O, '$1').replace(LONG_E, '$1');
  return s.replace(/[ぁぃぅぇぉっゃゅょゎ]/g, (c) => SMALL_TO_LARGE[c]);
}

/** normalize + fold。target 側・クエリ側の共通入口。 */
export function toKey(raw: string): string {
  return fold(normalize(raw));
}

// ---------------------------------------------------------------------------
// クエリ側の前処理
// ---------------------------------------------------------------------------

// 量 (サイズ) の修飾語。量は記録シートで指定するので、検索語としてはノイズ。
const SIZE_SUFFIX = /(大盛り?|特盛り?|並盛り?|小盛り?|ミニ|ハーフ|半人前|半分|[SMLsml]サイズ|[0-9]+人前|おおもり|とくもり)$/;
// 店・調達元の修飾語 (チェーン名そのものは別機能の範囲。ここは一般語のみ)。
// 「スーパー」は「スーパードライ」を壊すので入れない。
const STORE_PREFIX = /^(セブンイレブン|セブン|ファミリーマート|ファミマ|ローソン|コンビニ|手作り|自家製|市販)(の|で買った)?/;

/** 量・店の修飾語を落とした生のクエリ。変化が無ければ入力をそのまま返す。 */
export function stripNoise(raw: string): string {
  const s = raw.normalize('NFKC').trim();
  const stripped = s.replace(STORE_PREFIX, '').replace(SIZE_SUFFIX, '').trim();
  return stripped.length > 0 ? stripped : s;
}

/**
 * 「お味噌汁」→「味噌汁」。残りが3文字以上のときだけ。
 * 短いと「ごはん」→「はん」→ ハンバーグ前方一致のような無関係な一致を生む。
 */
export function stripHonorific(normalized: string): string | null {
  const m = normalized.match(/^[おご](.{3,})$/);
  return m ? m[1] : null;
}

export interface QueryVariant {
  /** fold 済みの照合キー。 */
  key: string;
  /** この変種で一致した場合に引くスコア (変換を重ねるほど確度が下がるため)。 */
  penalty: number;
}

/**
 * クエリから照合キーの候補を作る (重複は除く)。
 *   base → ノイズ除去 → ローマ字 → 「お」除去。ローマ字は ascii を含むクエリのみ。
 */
export function queryVariants(raw: string): QueryVariant[] {
  const out: QueryVariant[] = [];
  const seen = new Set<string>();
  const add = (k: string, penalty: number) => {
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ key: k, penalty });
  };

  const base = toKey(raw);
  if (!base) return out;
  add(base, 0);

  const cleaned = stripNoise(raw);
  if (cleaned !== raw.normalize('NFKC').trim()) add(toKey(cleaned), 0);

  const romaji = fold(romajiVariant(cleaned));
  add(romaji, 0);

  for (const v of [...out]) {
    const h = stripHonorific(v.key);
    if (h) add(h, 0.1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ラベル側の分解
// ---------------------------------------------------------------------------

/**
 * 末尾の「系」は分類名の接尾辞 (カレー・シチュー系 / チーズ系ピザ) なので外す。ただし
 * 「家系」「肉系」のように本体が1文字だけ残る語は、「系」自体が名前の一部なので外さない。
 */
function stripGenreSuffix(s: string): string {
  return s.length >= 3 && s.endsWith('系') ? s.slice(0, -1).trim() : s;
}

/**
 * ラベルを検索単位に分ける。括弧の中身は落とし、区切り (・ / ／ 、 ,) で割り、末尾の「系」を外す。
 *   'サラダ・生野菜'           → ['サラダ・生野菜', 'サラダ', '生野菜']
 *   'ラーメン (あっさり)'      → ['ラーメン', 'ラーメン (あっさり)']  ※先頭は括弧なし全体
 *   'カレー・シチュー系'       → ['カレー・シチュー', 'カレー', 'シチュー']
 * 先頭が「全体」、以降が「部分」。重複は除く。
 */
export function labelParts(label: string): string[] {
  const noParen = label.replace(/[(（][^)）]*[)）]/g, '').trim();
  const whole = stripGenreSuffix(noParen);
  const parts = noParen
    .split(/[・/／、,]/)
    .map((p) => stripGenreSuffix(p.trim()))
    .filter(Boolean);
  const out: string[] = [];
  for (const p of [whole, ...parts]) if (p && !out.includes(p)) out.push(p);
  return out;
}

// ---------------------------------------------------------------------------
// 複合語・修飾語の言語規則 (identity-search.ts の照合が参照する)
// ---------------------------------------------------------------------------

/** 「・」でつながった全体ラベル (サラダ・生野菜) ではなく、分割後の1語だけ。複合語の部品に使う。 */
export const SINGLE_WORD = /^[^・/／、,]+$/;

/** 量だけの残り (「6枚切り」「2個」「100g」) は既知扱い。検索語としては意味を持たない修飾。 */
export const QUANTITY = /^[0-9]+(枚切り?|個|人前|g|グラム|ml|杯|本|切れ|皿|玉|つ)?$/;

/** 食材名の前に付く一般の修飾 (大きさ・状態)。fold 済みの形。 */
export const MODIFIERS = new Set(['みに', 'ぷち', 'なま', 'れいとう', 'とくせい', 'てづくり']);

/** 食材名の後に付く部位・状態の接尾辞 (手羽**元** / 豚バラ**肉** / 魚**類** / チーズ**入り**)。 */
export const SUFFIXES = new Set(['元', '先', '肉', '類', '入り', '入', '風', '用', '抜き', '抜']);
