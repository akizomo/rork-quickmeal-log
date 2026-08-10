/**
 * identity-normalize.ts — 検索クエリ/Identity表記の正規化パイプライン
 * (SEARCH_SPEC v0.4 §5.1 / §5.5)
 *
 * ステップ: NFKC正規化 (全角英数記号→半角、半角カナ→全角カナ) → 小文字化 →
 * カタカナ→ひらがな → 長音除去。
 *
 * ローマ字→ひらがな変換 (`romajiVariant`) は base の正規化とは別関数にしている。
 * base の結果を直接ローマ字変換すると、英語 searchTags (§5.4.2) とのプレフィックス
 * 一致が壊れる (例: "chick" と "chicken" をそれぞれローマ字変換すると、貪欲な最長一致
 * トークナイズが末尾の切れ方で分岐し、"chick" の変換結果が "chicken" の変換結果の
 * prefix にならなくなる)。そのため呼び出し側 (identity-search.ts) は base とローマ字
 * 変換版の両方をクエリ候補として保持し、target 側は常に base のみと比較する。
 *
 * 失敗時は止めない: 各ステップは例外を投げず、不正入力時は前段の結果をそのまま返す。
 */

const ROMAJI_TO_KANA: Record<string, string> = {
  // 母音
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  // か行
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  // さ行
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  sha: 'しゃ', sya: 'しゃ', shu: 'しゅ', syu: 'しゅ', sho: 'しょ', syo: 'しょ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ja: 'じゃ', zya: 'じゃ', ju: 'じゅ', zyu: 'じゅ', jo: 'じょ', zyo: 'じょ',
  // た行
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
  cha: 'ちゃ', tya: 'ちゃ', chu: 'ちゅ', tyu: 'ちゅ', cho: 'ちょ', tyo: 'ちょ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  // な行
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  // は行
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  // ま行
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  // や行
  ya: 'や', yu: 'ゆ', yo: 'よ',
  // ら行
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  // わ行
  wa: 'わ', wo: 'を',
};

/** 促音「っ」判定に使う子音セット (撥音 n は別ロジックで扱うため除外)。 */
const DOUBLING_CONSONANTS = new Set('bcdfghjkmpqrstvwyz'.split(''));
const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

/**
 * ローマ字 (ヘボン式/訓令式) の連続をひらがなへ変換する。最長一致 (3→2→1文字) で
 * 先頭から消費する。未対応文字はそのまま残す (§5.5.4)。
 */
function romajiRunToHiragana(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1];

    // 撥音「ん」: nn / 母音・y以外が後続するn / 末尾のn
    if (c === 'n' && (next === 'n' || next === undefined || (!VOWELS.has(next) && next !== 'y'))) {
      out += 'ん';
      i += next === 'n' ? 2 : 1;
      continue;
    }

    // 促音「っ」: 子音の連続 (kk, ss, tt, pp 等)
    if (c !== 'n' && DOUBLING_CONSONANTS.has(c) && next === c) {
      out += 'っ';
      i += 1;
      continue;
    }

    const three = input.slice(i, i + 3);
    const two = input.slice(i, i + 2);
    const one = input.slice(i, i + 1);
    if (ROMAJI_TO_KANA[three]) {
      out += ROMAJI_TO_KANA[three];
      i += 3;
    } else if (ROMAJI_TO_KANA[two]) {
      out += ROMAJI_TO_KANA[two];
      i += 2;
    } else if (ROMAJI_TO_KANA[one]) {
      out += ROMAJI_TO_KANA[one];
      i += 1;
    } else {
      out += c; // 未対応文字はそのまま残す
      i += 1;
    }
  }
  return out;
}

/** カタカナ (全角) → ひらがな */
function kanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function toNfkc(s: string): string {
  try {
    // 全角英数記号→半角、半角カナ→全角カナ (合成文字統一)
    return s.normalize('NFKC');
  } catch {
    return s; // 非対応環境でも落とさない
  }
}

/**
 * 検索用の基本正規化。ローマ字変換は行わない — 英語 searchTags の
 * 前方一致を保つため (詳細はファイル先頭コメント)。
 */
export function normalize(input: string): string {
  const s = toNfkc(input.trim()).toLowerCase();
  return kanaToHiragana(s).replace(/ー/g, '');
}

/**
 * ローマ字変換版のクエリ。ascii文字の連続だけをひらがなに変換し、既に
 * 日本語 (かな/漢字) の部分はそのまま保持する。ascii を含まないクエリは
 * base と同一になる。
 */
export function romajiVariant(input: string): string {
  const base = toNfkc(input.trim()).toLowerCase();
  const converted = kanaToHiragana(base).replace(/[a-z]+/g, (run) => romajiRunToHiragana(run));
  return converted.replace(/ー/g, '');
}
