/**
 * weekly-recap.ts — 週次振り返り (C レーン) の純ロジック。
 *
 * 直近の「完了した週」(月〜日) を対象に、記録日数と平均摂取/目標カロリーを
 * 事実ベースで返す。中立トーン (PRD §9.1) を守るため:
 *   - 達成率・達成/未達成の評価語は一切持たない (数値の並記のみ)
 *   - 記録が1日も無い週は null (「0日記録」は評価的に響くため出さない)
 *   - 進行中の今週は対象外 (完了週のみ)
 *
 * 発見プール方式 (PRD v1.8 §6.7.5): 固定の数値だけでは毎週同じ内容になるため、
 * 「いつもの自分との差」「はじめて/ひさしぶり」の候補をスコア付きで集め、
 * 枠 (DISCOVERY_CARD_BUDGET) に収まる分だけ選んで `discoveries` に入れる。
 * 選抜は記録データだけから決定的に求める (同じ週なら何度開いても同じ内容)。
 *
 * 詳細は docs/ROADMAP.md §3.0「次の一手」実行順3 (週次振り返りの報酬化)。
 */

import type { DailyActivitySummary, ExerciseLog, FoodLog, Macro, UserProfile } from '@/types/nutrition';
import { addDays, diffInDays, formatWeekRangeLabel, getDailyMacros, getWeekRange, startOfDay, type DateRange } from '@/utils/history';
import { formatDateKey } from '@/utils/nutrition';
import { adjustedTargetKcal } from '@/utils/goals';
import { ALL_IDENTITIES, getIdentity } from '@/constants/identity';
import type { Identity, NutritionNote } from '@/types/identity';
import type { AppLocale } from '@/types/locale';
import ja from '@/locales/ja.json';
import enUS from '@/locales/en-US.json';

// monthlyStats.weekDays is Sun-first; rotate to Mon-first to match getWeekRange's Monday start.
const WEEKDAY_MON_FIRST: Record<AppLocale, string[]> = {
  ja: [...ja.monthlyStats.weekDays.slice(1), ja.monthlyStats.weekDays[0]],
  'en-US': [...enUS.monthlyStats.weekDays.slice(1), enUS.monthlyStats.weekDays[0]],
};

/** PFC の割合 (エネルギー比) が目標の割合から何割ずれたら「特筆すべき」とするか。これ未満は insight を出さない。 */
const INSIGHT_THRESHOLD_RATIO = 0.15;

/** 軸ごとの kcal/g 換算係数。「高◯◯食材」の密度判定に使う。 */
const AXIS_KCAL_PER_GRAM: Record<MacroAxis, number> = { protein: 4, fat: 9, carbs: 4 };

/**
 * 軸ごとの「高◯◯食材」判定閾値 (defaultMacro のうちその軸が占めるkcal比率)。
 * 例: protein 0.25 = カロリーの25%以上がたんぱく質由来なら高たんぱく食材とみなす。
 */
const AXIS_DENSITY_THRESHOLD: Record<MacroAxis, number> = { protein: 0.25, fat: 0.35, carbs: 0.45 };

/**
 * 「増やしたいときは」の候補に求める、1食 (defaultMacro) あたりの最小グラム数。
 * 密度 (カロリー比) だけで選ぶと、海藻 (炭水化物2.5g) のように比率は高くても量としては
 * ほとんど足しにならない食材が候補に入るため。たんぱく質は卵1個 (6.2g)・豆腐・納豆が入る値にしている。
 */
const BOOST_MIN_GRAMS: Record<MacroAxis, number> = { protein: 6, fat: 5, carbs: 15 };

/**
 * アドバイスに出してよい食材 (許可リスト)。**一般に体に良い、少なくとも悪くないと言える食材だけ**を勧める
 * (PRD §6.7.5「アドバイスの候補」)。食べた事実はどの食材でも映すが、勧めるのはここに載る食材だけ。
 *
 * 基準: 食事バランスガイド (農水省・厚労省) の主食・主菜・副菜・牛乳乳製品・果物にあたり、
 * ハーバード Healthy Eating Plate / WHO の健康的な食事で「控える」側に入らない、加工の少ない食材。
 * - 料理 (dish) は入れない。作り方や店で中身が大きく変わり、勧める根拠を持てないため
 * - 入れないもの: お菓子・甘い飲み物・お酒 / 調味料・油脂そのもの (オイル・バター・マヨネーズ・ドレッシング) /
 *   加工肉 (ハム・ベーコン・ソーセージ・ジャーキー、WHO の定義) / 脂の多い肉 (牛・豚の普通脂・高脂) /
 *   揚げたもの (油揚げ) / 食塩の多いもの (漬物・練り物) / マヨネーズ和え (クリーミー系) /
 *   バターや砂糖の多いパン (リッチ)・甘いものを含む区分 (餅・団子、シリアル) / 中華麺 (ラーメンの文脈になるため) /
 *   補助食品 (プロテイン・プロテインバー。食品から勧める) / レバー (ビタミンAが多く、妊娠中は控える目安があるため)
 */
const ADVICE_RECOMMENDABLE_IDS = new Set([
  // 主食
  'rice', 'onigiri', 'okayu', 'bread', 'oatmeal', 'potato', 'sweet_potato', 'noodle_udon', 'noodle_pasta',
  // 主菜
  'chicken_lean', 'salad_chicken', 'white_fish', 'seafood_lean', 'red_meat', 'canned_lean_fish',
  'egg', 'chicken_thigh', 'fatty_fish', 'canned_fatty_fish',
  // 牛乳・乳製品 / 大豆
  'milk', 'yogurt', 'cheese', 'cheese_low_fat', 'soy_milk', 'tofu', 'natto', 'edamame_soy',
  // 副菜
  'salad_raw', 'veg_cooked', 'veg_dense', 'corn', 'seaweed', 'side_seasoned', 'veggie_soup',
  // 果物
  'banana', 'apple_pear', 'citrus', 'ichigo', 'berry', 'fruit_other',
  // 脂質を含む食材 (油脂そのものではないもの)
  'avocado', 'nuts',
]);

function isAdviceEligible(identity: Identity): boolean {
  return ADVICE_RECOMMENDABLE_IDS.has(identity.id);
}

/**
 * 「多めの週」に出す置き換え表 (PRD §6.7.5「置き換えの規則」)。
 * 「その栄養素が少ない別のもの」ではなく、**同じ役割のまま中身がよりよいもの**に限る
 * (ごはん→玄米、うどん→そば、脂の多い肉→赤身、脂質の多い麺料理→脂質の少ない麺料理)。
 * 先週の記録に from があるときだけ、to を出す。勧める根拠を持てない組み合わせは入れない。
 * to は許可リスト (ADVICE_RECOMMENDABLE_IDS) とは別に、この表で直接決める (麺料理など料理も含むため)。
 */
interface SwapRule {
  axis: 'fat' | 'carbs';
  from: string;
  /** 省略 = 種類を問わない。指定時は、記録の種類 (attrKey。未指定なら既定の種類) がこれと一致するときだけ。 */
  fromAttr?: string;
  to: string;
  toAttr?: string;
}

/** 脂質が多め (1食15g以上) の麺料理。置き換え先は脂質の少ない麺料理 (そば・うどん)。 */
const RICH_NOODLE_IDS = [
  'ramen_heavy', 'tantanmen', 'fried_noodles', 'tsukemen', 'ramen_jiro', 'yaki_udon', 'tempura_noodle',
  'pasta_tomato', 'pasta_japanese', 'pasta_meat', 'pasta_oil', 'pasta_cream',
];
const LIGHT_NOODLE_IDS = ['soba', 'udon'];

const SWAP_RULES: SwapRule[] = [
  // 脂質: 同じ役割で、脂の少ないもの
  { axis: 'fat', from: 'beef_pork_fatty', to: 'red_meat' },
  { axis: 'fat', from: 'beef_pork', to: 'red_meat' },
  { axis: 'fat', from: 'bacon_sausage', to: 'red_meat' },
  { axis: 'fat', from: 'chicken_thigh', to: 'chicken_lean' },
  { axis: 'fat', from: 'cheese', to: 'cheese_low_fat' },
  { axis: 'fat', from: 'aburaage', to: 'tofu' },
  { axis: 'fat', from: 'side_creamy', to: 'side_seasoned' },
  { axis: 'fat', from: 'bread_rich', to: 'bread' },
  ...RICH_NOODLE_IDS.flatMap((from) => LIGHT_NOODLE_IDS.map((to): SwapRule => ({ axis: 'fat', from, to }))),
  // 炭水化物: 同じ主食で、精製の少ないもの・量の少ないもの
  { axis: 'carbs', from: 'rice', fromAttr: 'white', to: 'rice', toAttr: 'brown' },
  { axis: 'carbs', from: 'bread', fromAttr: 'plain', to: 'bread', toAttr: 'whole' },
  { axis: 'carbs', from: 'noodle_udon', fromAttr: 'udon', to: 'noodle_udon', toAttr: 'soba' },
  { axis: 'carbs', from: 'udon', to: 'soba' },
  { axis: 'carbs', from: 'noodle_pasta', fromAttr: 'regular', to: 'noodle_pasta', toAttr: 'whole' },
  { axis: 'carbs', from: 'cereal', to: 'oatmeal' },
  { axis: 'carbs', from: 'sweet_bread', to: 'bread' },
  { axis: 'carbs', from: 'sweet_drink', to: 'fruit_other' },
];

function attrOf(identity: Identity, key: string | undefined) {
  return key ? identity.attributes?.find((a) => a.key === key) : undefined;
}

/** 記録の種類。未指定なら既定の種類 (白米・食パンなど)。 */
function effectiveAttrKey(identity: Identity, attrKey: string | undefined): string | undefined {
  return attrKey ?? identity.attributes?.find((a) => a.isDefault)?.key;
}

/** 先週の記録から、置き換え表に当てはまるものを、よく食べた順に候補にする。 */
function computeSwapCandidates(
  weekLogs: FoodLog[],
  axis: 'fat' | 'carbs',
  weekIndex: number,
): WeeklyMacroBoostCandidate[] {
  const counts = new Map<string, number>();
  for (const log of weekLogs) {
    if (!log.identityId) continue;
    const identity = getIdentity(log.identityId);
    if (!identity) continue;
    const key = `${log.identityId}|${effectiveAttrKey(identity, log.attrKey) ?? ''}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const picked: { count: number; candidate: WeeklyMacroBoostCandidate }[] = [];
  const seenTo = new Set<string>();
  for (const rule of SWAP_RULES) {
    if (rule.axis !== axis) continue;
    const fromIdentity = getIdentity(rule.from);
    const toIdentity = getIdentity(rule.to);
    if (!fromIdentity || !toIdentity) continue;
    const count = rule.fromAttr
      ? counts.get(`${rule.from}|${rule.fromAttr}`) ?? 0
      : [...counts.entries()].filter(([k]) => k.startsWith(`${rule.from}|`)).reduce((n, [, c]) => n + c, 0);
    if (count === 0) continue;
    const toKey = `${rule.to}|${rule.toAttr ?? ''}`;
    if (seenTo.has(toKey)) continue;
    seenTo.add(toKey);

    const fromAttr = attrOf(fromIdentity, rule.fromAttr);
    const toAttr = attrOf(toIdentity, rule.toAttr);
    const factor = toAttr?.factor?.[axis] ?? 1;
    picked.push({
      count,
      candidate: {
        identityId: rule.to,
        label: toAttr ? `${toIdentity.label}（${toAttr.label}）` : toIdentity.label,
        fromHistory: true,
        replaces: fromAttr ? `${fromIdentity.label}（${fromAttr.label}）` : fromIdentity.label,
        axisGrams: Math.round(toIdentity.defaultMacro[axis] * factor * 10) / 10,
        attrKey: rule.toAttr,
      },
    });
  }
  picked.sort((a, b) => b.count - a.count);
  return rotate(picked.map((p) => p.candidate), MAX_BOOST_CANDIDATES, weekIndex);
}

/** macroBoost で提示する候補の最大数。 */
const MAX_BOOST_CANDIDATES = 3;

/** カタログ補完でローテーションする候補の母数 (密度上位)。広げすぎると馴染みの薄い食材ばかりになる。 */
const CATALOG_ROTATION_POOL = 9;

/** 「いつも」の基準にする、対象週より前の週数。 */
const BASELINE_WEEKS = 4;

/** 基準平均を出すのに必要な最小記録日数。これ未満の基準は「いつも」と呼べない。 */
const BASELINE_MIN_DAYS = 7;

/** 平均kcalを「いつもより多め/少なめ」と言える最小乖離率。 */
const VS_USUAL_THRESHOLD_RATIO = 0.1;

/** 「ひさしぶり」とみなす、直前の記録からの最小空白日数。 */
const COMEBACK_MIN_GAP_DAYS = 28;

/** 「いちばん多く」を出す最小回数。2回程度では「よく食べた」と言えない。 */
const TOP_FOOD_MIN_COUNT = 3;

/** macroSources に並べる件数。 */
const MAX_SOURCES = 3;

/** macroSources を出すのに必要な、週内の対象栄養素の最小合計 (g)。 */
const SOURCES_MIN_TOTAL_GRAMS = 1;

/** macroSources の対象栄養素を週ごとに回す順序。 */
const SOURCE_AXIS_ROTATION: MacroAxis[] = ['protein', 'fat', 'carbs'];

/** 食材リスト系の発見に並べる最大件数。 */
const MAX_FOOD_ITEMS = 3;

/** 発見スライドの枠 (カード枚数)。固定部と合わせて全体 6〜7 枚に収める。 */
const DISCOVERY_CARD_BUDGET = 3;

/** これ未満のスコアの候補は「休ませる」。他に出せる発見が1つも無い週だけ使う。 */
const REST_SCORE = 0.2;

/** PFC の連続週数を遡る上限。1週目 / 3週目 / それ以外、を区別できれば足りる。 */
const MAX_STREAK_LOOKBACK = 4;

/**
 * 1食材が複数の豆知識を持つとき、どれを出すかを weekKey から決定的に選ぶ。
 *
 * 週次リカップは同じ週なら何度開いても同じ内容であるべきなので乱数は使わない。
 * weekKey と identityId を混ぜてハッシュするため、食材ごとに別の周期で回る
 * (同じ週に複数食材が揃って1番目のノートを出す、といった偏りを避ける)。
 */
function pickNutritionNote(
  allNotes: NutritionNote[],
  identityId: string,
  weekKey: string,
  topic?: MacroAxis,
  attrKey?: string,
): NutritionNote | null {
  // 2系統以上の出典で照合できた (alsoSources を持つ) ノートだけを出す。
  // 単一出典のノートは、照合が済むまでコードに残しつつ、ユーザーには見せない (§10.14 追補 2026-09-29)。
  // topic を指定したときは、その栄養素の話のノートに絞る (「もと」カード用、PRD §6.7.5「各カードの役割」)。
  // attrKey を指定したときは、別の種類の話 (例: 玄米を勧めるときの白米の話) を除く。
  const notes = allNotes.filter(
    (n) => (n.alsoSources?.length ?? 0) > 0
      && (!topic || (n.topics ?? []).includes(topic))
      && (!attrKey || !n.attr || n.attr === attrKey),
  );
  if (notes.length === 0) return null;
  const seed = `${weekKey}:${identityId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return notes[Math.abs(hash) % notes.length] ?? null;
}

export type MacroAxis = 'protein' | 'fat' | 'carbs';

export interface WeeklyFoodFact {
  identityId: string;
  identityLabel: string;
  /** Identity.nutritionNotes から週ごとに選ばれた1件。出典は UI に表示する (§10.14 追補-1)。 */
  note: NutritionNote;
}

export interface WeeklyMacroBoostCandidate {
  identityId: string;
  label: string;
  /** 記録履歴にあるか (自分のレパートリーか、未経験の選択肢か)。UIの見せ方を変える余地のため公開する。 */
  fromHistory: boolean;
  /** 置き換え候補のとき、先週食べていた置き換え元の表示名 (例: 「ごはん（白米）」)。 */
  replaces?: string;
  /** 置き換え候補のとき、候補の1食あたりの対象栄養素のグラム数 (種類による補正込み)。 */
  axisGrams?: number;
  /** 置き換え候補の種類 (例: 玄米 = 'brown')。豆知識を種類に合わせて選ぶのに使う。 */
  attrKey?: string;
}

export interface WeeklyMacroBoost {
  axis: MacroAxis;
  /** 'less' = その軸を増やせる高密度候補、'more' = 先週食べていたものの置き換え候補 (SWAP_RULES)。 */
  direction: 'less' | 'more';
  /**
   * その軸の密度が高い (less) / 低い (more) Identity を最大 MAX_BOOST_CANDIDATES 件。
   * 'less' は記録履歴優先 + 全カタログ補完。'more' は記録履歴のみ (カタログ補完なし)。
   */
  candidates: WeeklyMacroBoostCandidate[];
  /**
   * 候補のうち最初に組成事実 (nutritionNote) を持つものを添える。豆知識は単独スライドにせず、
   * 「なぜこの食材が候補なのか」を支える形でアドバイスに従属させる (無ければ null)。
   */
  note: WeeklyFoodFact | null;
}

export interface WeeklyMacroInsight {
  axis: MacroAxis;
  /** 「多め/少なめ」の2値のみ。良し悪しの評価語は持たない。 */
  direction: 'more' | 'less';
  /** P/F/C のエネルギーのうち、この栄養素が占めた割合 (記録日の合計から。0〜100 の整数)。 */
  actualSharePct: number;
  /** 目標の P/F/C のエネルギーのうち、この栄養素が占める割合 (0〜100 の整数)。 */
  targetSharePct: number;
}

export interface WeeklyRecapDay {
  dateKey: string;
  /** 月曜始まりの曜日ラベル。 */
  weekdayLabel: string;
  /** その日の記録があれば true。false の日は kcal/targetKcal を「未記録」として扱う (0 ではなく欠測)。 */
  logged: boolean;
  kcal: number;
  targetKcal: number;
}

export interface WeeklyFoodItem {
  identityId: string;
  label: string;
}

/**
 * 発見スライド1件。表示順は DISCOVERY_ORDER で固定 (スコア順ではなく物語の流れ優先)。
 * macro だけはインサイト+アドバイスで最大2枚ぶんの枠を使う。
 */
export type WeeklyDiscovery =
  // note: 掲載食材のうち最初に豆知識を持つ1件 (無ければ null)。食べたものについて語るので読まれやすい (PRD §6.7.5)。
  | { kind: 'topFood'; item: WeeklyFoodItem; count: number; note: WeeklyFoodFact | null }
  | { kind: 'newFoods'; items: WeeklyFoodItem[]; note: WeeklyFoodFact | null }
  | { kind: 'comebackFoods'; items: (WeeklyFoodItem & { weeksSince: number })[]; note: WeeklyFoodFact | null }
  // note: 並んだ食材のうち、その栄養素の話 (topics) の豆知識を持つ最初の1件 (無ければ null)。
  | { kind: 'macroSources'; axis: MacroAxis; sources: WeeklyMacroSource[]; note: WeeklyFoodFact | null }
  | {
      kind: 'macro';
      insight: WeeklyMacroInsight;
      /** 同じ軸・方向が何週続いているか (この週を含む)。3 のとき UI は「3週続けて」と言う。 */
      streakWeeks: number;
      boost: WeeklyMacroBoost | null;
    };

export interface WeeklyMacroSource {
  /** Identity を持たない旧形式ログはカテゴリ名でまとめるため任意。 */
  identityId?: string;
  label: string;
  /** その週の対象栄養素の合計に占める割合 (0〜100 の整数)。 */
  sharePct: number;
}

export type WeeklyDiscoveryKind = WeeklyDiscovery['kind'];

const DISCOVERY_ORDER: WeeklyDiscoveryKind[] = ['topFood', 'newFoods', 'comebackFoods', 'macroSources', 'macro'];

export interface WeeklyRecap {
  /** 対象週の月曜日 (dateKey)。dismiss 済み判定のキーにも使う。 */
  weekKey: string;
  /** 表示用の日付範囲ラベル (例: "7/27 – 8/2")。 */
  weekRangeLabel: string;
  /** 記録がある日数 (0 は呼び出し前に弾かれるので 1〜7)。 */
  daysLogged: number;
  /** 記録日の摂取カロリー合計。ストーリー冒頭のヒーロー数字に使う。 */
  totalKcal: number;
  /** 記録日の平均摂取カロリー。 */
  avgKcal: number;
  /** 記録日の平均目標カロリー (運動による当日拡大を反映)。プロフィール未設定なら 0。 */
  avgTargetKcal: number;
  /** 月〜日の7日分。ストーリー画面のバーチャートに使う。 */
  days: WeeklyRecapDay[];
  /**
   * PFC の割合 (エネルギー比) が目標の割合から最もずれた1軸のみ (ずれが 15%未満なら null)。
   * 量 (g) ではなく割合で比べるので、記録が少ない週でも「全体が少ない」を PFC の話にしない。
   * 3軸まとめて出すと成績表のように見えるため、あえて1つに絞る。
   * プロフィール未設定 (targetCalories <= 0) なら常に null。
   */
  macroInsight: WeeklyMacroInsight | null;
  /**
   * 観点C + 観点A (組成事実、observation.note に従属)。
   * direction='less': 全履歴からその軸の密度が高い Identity を提示 (+ カタログ補完)。
   * direction='more': 食事記録履歴からその軸の密度が低い代替候補を提示 (カタログ補完なし)。
   * 豆知識 (note) は less 方向のみ添付。
   */
  macroBoost: WeeklyMacroBoost | null;
  /** その前の週の記録日数。0日なら null (「0日」は評価的に響くため出さない)。 */
  prevWeekDaysLogged: number | null;
  /** 前 BASELINE_WEEKS 週の記録日の平均kcal。記録日が BASELINE_MIN_DAYS 未満なら null。 */
  baselineAvgKcal: number | null;
  /** 平均kcalが基準から ±VS_USUAL_THRESHOLD_RATIO 以上ずれた週だけ方向を持つ。 */
  kcalVsUsual: 'more' | 'less' | null;
  /** 選抜済みの発見スライド (表示順)。 */
  discoveries: WeeklyDiscovery[];
}

interface WeekCore {
  range: DateRange;
  weekKey: string;
  entries: [string, Macro][];
  loggedDays: [string, Macro][];
  targetForKey: (key: string) => number;
  macroInsight: WeeklyMacroInsight | null;
}

/** 1週ぶんの集計の土台。対象週と、比較用の過去週の両方で使う。 */
function computeWeekCore(
  logs: FoodLog[],
  profile: UserProfile,
  exerciseLogs: ExerciseLog[],
  dailyActivities: DailyActivitySummary[] | undefined,
  anchor: Date,
): WeekCore {
  const range = getWeekRange(anchor);
  const weekKey = formatDateKey(range.start);
  const entries = [...getDailyMacros(logs, range).entries()]; // getWeekRange は月曜始まりなので既に月〜日の順
  const loggedDays = entries.filter(([, m]) => m.kcal > 0);

  const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
  const targetForKey = (key: string): number => {
    if (base <= 0) return 0;
    const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
    return adjustedTargetKcal(base, exerciseLogs, key, { rawActiveKcal });
  };

  const macroInsight = base > 0 && loggedDays.length > 0
    ? computeMacroInsight(loggedDays, profile)
    : null;

  return { range, weekKey, entries, loggedDays, targetForKey, macroInsight };
}

/**
 * `now` から見て直近の完了週 (今週の1つ前、月〜日) の recap を計算する。
 * 記録日が1日も無ければ null。
 */
export function computeWeeklyRecap(
  logs: FoodLog[],
  profile: UserProfile,
  exerciseLogs: ExerciseLog[],
  dailyActivities: DailyActivitySummary[] | undefined,
  now: Date,
  uiLanguage: AppLocale = 'ja',
): WeeklyRecap | null {
  const today = startOfDay(now);
  const weekAnchor = (weeksAgo: number) => addDays(today, -7 * weeksAgo);
  const core = (weeksAgo: number) => computeWeekCore(logs, profile, exerciseLogs, dailyActivities, weekAnchor(weeksAgo));

  const current = core(1);
  const { range, weekKey, entries, loggedDays, targetForKey, macroInsight } = current;
  if (loggedDays.length === 0) return null;

  const totalKcal = Math.round(loggedDays.reduce((sum, [, m]) => sum + m.kcal, 0));
  const avgKcal = Math.round(totalKcal / loggedDays.length);

  const avgTargetKcal = profile.targetCalories > 0
    ? Math.round(
        loggedDays.reduce((sum, [key]) => sum + targetForKey(key), 0) / loggedDays.length,
      )
    : 0;

  const days: WeeklyRecapDay[] = entries.map(([key, m], i) => ({
    dateKey: key,
    weekdayLabel: WEEKDAY_MON_FIRST[uiLanguage][i] ?? '',
    logged: m.kcal > 0,
    kcal: Math.round(m.kcal),
    targetKcal: Math.round(targetForKey(key)),
  }));

  const weekIndex = weekIndexOf(range.start);
  const macroBoost = computeMacroBoost(logs, macroInsight, weekKey, weekIndex, range);

  // ── いつもとの差 (固定カードの補足) ──
  const pastWeeks = Array.from({ length: BASELINE_WEEKS }, (_, i) => core(i + 2));
  const prevDays = pastWeeks[0]?.loggedDays.length ?? 0;
  const baselineDays = pastWeeks.flatMap((w) => w.loggedDays);
  const baselineAvgKcal = baselineDays.length >= BASELINE_MIN_DAYS
    ? Math.round(baselineDays.reduce((sum, [, m]) => sum + m.kcal, 0) / baselineDays.length)
    : null;
  let kcalVsUsual: 'more' | 'less' | null = null;
  if (baselineAvgKcal && baselineAvgKcal > 0) {
    const ratio = (avgKcal - baselineAvgKcal) / baselineAvgKcal;
    if (Math.abs(ratio) >= VS_USUAL_THRESHOLD_RATIO) kcalVsUsual = ratio > 0 ? 'more' : 'less';
  }

  // ── 発見プール ──
  const candidates: ScoredDiscovery[] = [
    ...computeFoodDiscoveries(logs, range, pastWeeks[0]?.range ?? null, weekKey),
  ];
  const sources = computeMacroSources(logs, range, SOURCE_AXIS_ROTATION[weekIndex % SOURCE_AXIS_ROTATION.length], weekKey);
  if (sources) {
    // 常に出せるので、他に強い発見がある週には譲る (穴埋め役)。
    candidates.push({ discovery: sources, score: 0.5, cost: 1 });
  }
  if (macroInsight) {
    let streakWeeks = 1;
    for (let k = 2; k <= MAX_STREAK_LOOKBACK + 1; k++) {
      const prev = core(k).macroInsight;
      if (!prev || prev.axis !== macroInsight.axis || prev.direction !== macroInsight.direction) break;
      streakWeeks += 1;
    }
    candidates.push({
      discovery: { kind: 'macro', insight: macroInsight, streakWeeks, boost: macroBoost },
      // 1週目は新しい情報。3週目は「3週続けて」と一度だけ言う (VOICE.md の例文)。
      // それ以外の連続週は、同じことを繰り返さないよう休ませる。
      score: streakWeeks === 1 ? 0.7 : streakWeeks === 3 ? 0.75 : 0.05,
      cost: macroBoost ? 2 : 1,
    });
  }

  return {
    weekKey,
    weekRangeLabel: formatWeekRangeLabel(range),
    daysLogged: loggedDays.length,
    totalKcal,
    avgKcal,
    avgTargetKcal,
    days,
    macroInsight,
    macroBoost,
    prevWeekDaysLogged: prevDays > 0 ? prevDays : null,
    baselineAvgKcal,
    kcalVsUsual,
    discoveries: dedupeNotes(selectDiscoveries(candidates)),
  };
}

/** 同じ週に同じ文面の豆知識を2度出さない (表示順で先に出たほうを残す)。料理どうしで文面を共有するノートがあるため。 */
function dedupeNotes(discoveries: WeeklyDiscovery[]): WeeklyDiscovery[] {
  const seen = new Set<string>();
  return discoveries.map((d) => {
    if (!('note' in d) || !d.note) return d;
    if (seen.has(d.note.note.text)) return { ...d, note: null };
    seen.add(d.note.note.text);
    return d;
  });
}

export interface ScoredDiscovery {
  discovery: WeeklyDiscovery;
  /** 0〜1。「いつもとの差」「新しさ」が大きいほど高い。 */
  score: number;
  /** 使うカード枚数。 */
  cost: number;
}

/**
 * スコアの高い順に枠へ詰め、表示は DISCOVERY_ORDER の順に並べ直す。
 * REST_SCORE 未満の候補は、それ以上の候補が1つも無い週だけ使う。
 */
export function selectDiscoveries(candidates: ScoredDiscovery[]): WeeklyDiscovery[] {
  const strong = candidates.filter((c) => c.score >= REST_SCORE);
  const pool = (strong.length > 0 ? strong : candidates).slice().sort((a, b) => b.score - a.score);
  const picked: WeeklyDiscovery[] = [];
  let used = 0;
  for (const c of pool) {
    if (used + c.cost > DISCOVERY_CARD_BUDGET) continue;
    picked.push(c.discovery);
    used += c.cost;
  }
  return picked.sort((a, b) => DISCOVERY_ORDER.indexOf(a.kind) - DISCOVERY_ORDER.indexOf(b.kind));
}

/** 週の通し番号 (ローテーション用)。タイムゾーン/DST に左右されないよう暦日から求める。 */
function weekIndexOf(weekStart: Date): number {
  const days = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()) / 86_400_000;
  return Math.floor(days / 7);
}

/** list から weekIndex に応じて n 件を循環的に取り出す。n 件以下ならそのまま。 */
function rotate<T>(list: T[], n: number, weekIndex: number): T[] {
  if (list.length <= n) return list;
  const start = (weekIndex * n) % list.length;
  return Array.from({ length: n }, (_, i) => list[(start + i) % list.length]);
}

/** topFood / newFoods / comebackFoods の候補。Identity を持たない旧形式ログは対象外。 */
function computeFoodDiscoveries(
  logs: FoodLog[],
  range: DateRange,
  prevRange: DateRange | null,
  weekKey: string,
): ScoredDiscovery[] {
  const startKey = formatDateKey(range.start);
  const endKey = formatDateKey(range.end);

  const firstInWeek = new Map<string, string>();
  const countInWeek = new Map<string, number>();
  const lastBefore = new Map<string, string>();
  let hasPriorHistory = false;

  for (const log of logs) {
    if (log.date < startKey) hasPriorHistory = true;
    if (!log.identityId) continue;
    const id = log.identityId;
    if (log.date < startKey) {
      const prev = lastBefore.get(id);
      if (!prev || log.date > prev) lastBefore.set(id, log.date);
    } else if (log.date <= endKey) {
      countInWeek.set(id, (countInWeek.get(id) ?? 0) + 1);
      const first = firstInWeek.get(id);
      if (!first || log.date < first) firstInWeek.set(id, log.date);
    }
  }

  const toItem = (id: string): WeeklyFoodItem | null => {
    const identity = getIdentity(id);
    return identity ? { identityId: id, label: identity.label } : null;
  };

  /** 掲載食材のうち最初に豆知識を持つもの。食材ごとの選択は週で決定的。 */
  const firstNote = (ids: string[]): WeeklyFoodFact | null => {
    for (const id of ids) {
      const identity = getIdentity(id);
      const picked = identity?.nutritionNotes ? pickNutritionNote(identity.nutritionNotes, id, weekKey) : null;
      if (identity && picked) return { identityId: id, identityLabel: identity.label, note: picked };
    }
    return null;
  };

  const out: ScoredDiscovery[] = [];

  // いちばん多く (同数なら週内で先に出た方)
  const top = [...countInWeek.entries()]
    .filter(([, n]) => n >= TOP_FOOD_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || firstInWeek.get(a[0])!.localeCompare(firstInWeek.get(b[0])!))[0];
  const topItem = top ? toItem(top[0]) : null;
  if (top && topItem) {
    const prevTop = prevRange ? topIdentityIn(logs, prevRange) : null;
    out.push({
      discovery: { kind: 'topFood', item: topItem, count: top[1], note: firstNote([top[0]]) },
      // 前週と同じ食材なら「いつも通り」なので発見としては弱い。
      score: prevTop === top[0] ? 0.1 : 0.6,
      cost: 1,
    });
  }

  // はじめて (初週は全部が初登場になるので、それ以前の記録があるユーザーのみ)
  if (hasPriorHistory) {
    const items = [...firstInWeek.entries()]
      .filter(([id]) => !lastBefore.has(id))
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id]) => toItem(id))
      .filter((x): x is WeeklyFoodItem => x !== null)
      .slice(0, MAX_FOOD_ITEMS);
    if (items.length > 0) {
      out.push({ discovery: { kind: 'newFoods', items, note: firstNote(items.map((i) => i.identityId)) }, score: 0.9, cost: 1 });
    }
  }

  // ひさしぶり (空白の長い順)
  const comebacks = [...firstInWeek.entries()]
    .map(([id, first]) => {
      const last = lastBefore.get(id);
      if (!last) return null;
      const gap = diffInDays(new Date(`${first}T00:00:00`), new Date(`${last}T00:00:00`));
      if (gap < COMEBACK_MIN_GAP_DAYS) return null;
      const item = toItem(id);
      return item ? { ...item, weeksSince: Math.floor(gap / 7), gap } : null;
    })
    .filter((x): x is WeeklyFoodItem & { weeksSince: number; gap: number } => x !== null)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, MAX_FOOD_ITEMS)
    .map(({ gap: _gap, ...rest }) => rest);
  if (comebacks.length > 0) {
    out.push({ discovery: { kind: 'comebackFoods', items: comebacks, note: firstNote(comebacks.map((i) => i.identityId)) }, score: 0.8, cost: 1 });
  }

  return out;
}

/**
 * 週内の対象栄養素が、どの食べものから来ていたかの内訳 (上位 MAX_SOURCES 件)。
 * 記録ごとの macro (トッピング込み) を Identity 別に合算する。多い/少ないの評価はしない。
 * 内訳が2件未満 (1品しか記録が無い) なら、内訳と呼べないので null。
 */
function computeMacroSources(logs: FoodLog[], range: DateRange, axis: MacroAxis, weekKey: string): WeeklyDiscovery | null {
  const startKey = formatDateKey(range.start);
  const endKey = formatDateKey(range.end);
  const byKey = new Map<string, { identityId?: string; label: string; grams: number }>();
  let total = 0;
  for (const log of logs) {
    if (log.date < startKey || log.date > endKey) continue;
    const grams = log.macro[axis];
    if (!(grams > 0)) continue;
    total += grams;
    const identity = log.identityId ? getIdentity(log.identityId) : undefined;
    const key = identity ? identity.id : `cat:${log.categoryLabel}`;
    const entry = byKey.get(key) ?? { identityId: identity?.id, label: identity ? identity.label : log.categoryLabel, grams: 0 };
    entry.grams += grams;
    byKey.set(key, entry);
  }
  if (total < SOURCES_MIN_TOTAL_GRAMS || byKey.size < 2) return null;
  const sources = [...byKey.values()]
    .sort((a, b) => b.grams - a.grams || a.label.localeCompare(b.label))
    .slice(0, MAX_SOURCES)
    .map((e): WeeklyMacroSource => ({ identityId: e.identityId, label: e.label, sharePct: Math.round((e.grams / total) * 100) }));
  // 豆知識は、割合の大きい食材から順に「この栄養素の話」を持つものを探す。
  // 並んでいない食材の話 (例: 魚が無い週の n-3) はしない。不足を言うことになるため (PRD §6.7.5)。
  let note: WeeklyFoodFact | null = null;
  for (const src of sources) {
    const identity = src.identityId ? getIdentity(src.identityId) : undefined;
    const picked = identity?.nutritionNotes ? pickNutritionNote(identity.nutritionNotes, identity.id, weekKey, axis) : null;
    if (identity && picked) {
      note = { identityId: identity.id, identityLabel: identity.label, note: picked };
      break;
    }
  }
  return { kind: 'macroSources', axis, sources, note };
}

function topIdentityIn(logs: FoodLog[], range: DateRange): string | null {
  const startKey = formatDateKey(range.start);
  const endKey = formatDateKey(range.end);
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.identityId || log.date < startKey || log.date > endKey) continue;
    counts.set(log.identityId, (counts.get(log.identityId) ?? 0) + 1);
  }
  const top = [...counts.entries()].filter(([, n]) => n >= TOP_FOOD_MIN_COUNT).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

function densityFor(axis: MacroAxis, macro: { kcal: number; protein: number; fat: number; carbs: number }): number {
  if (macro.kcal <= 0) return 0;
  return (macro[axis] * AXIS_KCAL_PER_GRAM[axis]) / macro.kcal;
}

/**
 * 観点C: macroInsight の direction に応じて食材候補を提示する。
 * - 'less': その軸の密度が高い Identity (記録履歴優先 + 全カタログ補完)。
 *   最有力候補に nutritionNote があれば観点A として note に添える。
 * - 'more': その軸の密度が低い代替候補 (記録履歴のみ。カタログ補完はしない)。
 *   note は 'more' では添付しない。
 */
function computeMacroBoost(
  allLogs: FoodLog[],
  insight: WeeklyMacroInsight | null,
  weekKey: string,
  weekIndex: number,
  range: DateRange,
): WeeklyMacroBoost | null {
  if (!insight) return null;
  const { axis, direction } = insight;

  const freq = new Map<string, number>();
  for (const log of allLogs) {
    if (!log.identityId) continue;
    freq.set(log.identityId, (freq.get(log.identityId) ?? 0) + 1);
  }

  /** 記録履歴のうち条件を満たす Identity を回数順に。 */
  const historyMatching = (match: (identity: Identity) => boolean): WeeklyMacroBoostCandidate[] =>
    [...freq.entries()]
      .map(([identityId, count]) => ({ identity: getIdentity(identityId), count }))
      .filter((c): c is { identity: Identity; count: number } => !!c.identity && isAdviceEligible(c.identity) && match(c.identity))
      .sort((a, b) => b.count - a.count)
      .map(({ identity }) => ({ identityId: identity.id, label: identity.label, fromHistory: true }));

  if (direction === 'less') {
    const isDense = (identity: Identity) =>
      densityFor(axis, identity.defaultMacro) >= AXIS_DENSITY_THRESHOLD[axis]
      && identity.defaultMacro[axis] >= BOOST_MIN_GRAMS[axis];
    const fromHistory = historyMatching(isDense);

    // 履歴に十分あれば履歴だけを週ごとにローテーション (毎週同じ3品にしない)。
    // 足りなければ履歴 + カタログ補完。補完側も密度上位の中でローテーションする。
    let candidates: WeeklyMacroBoostCandidate[];
    if (fromHistory.length > MAX_BOOST_CANDIDATES) {
      candidates = rotate(fromHistory, MAX_BOOST_CANDIDATES, weekIndex);
    } else {
      const seenIds = new Set(fromHistory.map((c) => c.identityId));
      const catalogPool = ALL_IDENTITIES
        .filter((identity) => !seenIds.has(identity.id) && isAdviceEligible(identity) && isDense(identity))
        .sort((a, b) => densityFor(axis, b.defaultMacro) - densityFor(axis, a.defaultMacro))
        .slice(0, CATALOG_ROTATION_POOL)
        .map((identity): WeeklyMacroBoostCandidate => ({ identityId: identity.id, label: identity.label, fromHistory: false }));
      candidates = [...fromHistory, ...rotate(catalogPool, MAX_BOOST_CANDIDATES - fromHistory.length, weekIndex)];
    }

    if (candidates.length === 0) return null;

    let note: WeeklyFoodFact | null = null;
    for (const c of candidates) {
      const identity = getIdentity(c.identityId);
      const picked = identity?.nutritionNotes
        // 「なぜこの食材が候補か」を支える話だけを出す (その栄養素の話に絞る。PRD §6.7.5「各カードの役割」)
        ? pickNutritionNote(identity.nutritionNotes, identity.id, weekKey, axis)
        : null;
      if (identity && picked) {
        note = { identityId: identity.id, identityLabel: identity.label, note: picked };
        break;
      }
    }
    return { axis, direction, candidates, note };
  }

  // direction === 'more': 先週食べていたものの置き換え候補 (SWAP_RULES)。
  // たんぱく質が多めの週は、置き換えを勧める根拠が弱いので出さない。
  if (axis === 'protein') return null;
  const startKey = formatDateKey(range.start);
  const endKey = formatDateKey(range.end);
  const weekLogs = allLogs.filter((log) => log.date >= startKey && log.date <= endKey);
  const candidates = computeSwapCandidates(weekLogs, axis, weekIndex);
  if (candidates.length === 0) return null;

  // 豆知識は、候補 (置き換え後) のうちその栄養素の話を持つ最初の1件。種類が違う話 (玄米を勧めるときの白米の話) は除く。
  let note: WeeklyFoodFact | null = null;
  for (const c of candidates) {
    const identity = getIdentity(c.identityId);
    const picked = identity?.nutritionNotes ? pickNutritionNote(identity.nutritionNotes, identity.id, weekKey, axis, c.attrKey) : null;
    if (identity && picked) {
      note = { identityId: identity.id, identityLabel: identity.label, note: picked };
      break;
    }
  }
  return { axis, direction, candidates, note };
}

/**
 * P/F/C の「割合」(エネルギー比) を目標の割合と比べ、ずれがいちばん大きい1軸だけを返す。
 *
 * グラムの絶対量では比べない。量で比べると、記録が目標の7割しかない週 (つけ忘れ・少食) は
 * 3軸そろって「少なめ」になり、配分ではなく全体量の話を PFC の話として伝えてしまうため。
 * 量はカロリーのカード、配分はこのカード、と役割を分ける (PRD §6.7.5「各カードの役割」)。
 * 割合は目標側・実測側とも P/F/C のエネルギーの合計を分母にする (kcal の丸めや酒類の影響を受けない)。
 */
function computeMacroInsight(
  loggedDays: [string, { protein: number; fat: number; carbs: number }][],
  profile: UserProfile,
): WeeklyMacroInsight | null {
  const axes: MacroAxis[] = ['protein', 'fat', 'carbs'];
  const targetGrams: Record<MacroAxis, number> = {
    protein: profile.targetProtein,
    fat: profile.targetFat,
    carbs: profile.targetCarbs,
  };
  const actualGrams: Record<MacroAxis, number> = { protein: 0, fat: 0, carbs: 0 };
  for (const [, m] of loggedDays) for (const axis of axes) actualGrams[axis] += m[axis];

  const energyShares = (grams: Record<MacroAxis, number>): Record<MacroAxis, number> | null => {
    const total = axes.reduce((sum, axis) => sum + grams[axis] * AXIS_KCAL_PER_GRAM[axis], 0);
    if (total <= 0) return null;
    return {
      protein: (grams.protein * AXIS_KCAL_PER_GRAM.protein) / total,
      fat: (grams.fat * AXIS_KCAL_PER_GRAM.fat) / total,
      carbs: (grams.carbs * AXIS_KCAL_PER_GRAM.carbs) / total,
    };
  };
  const actual = energyShares(actualGrams);
  const target = energyShares(targetGrams);
  if (!actual || !target) return null;

  let best: WeeklyMacroInsight | null = null;
  let bestAbsDiff = 0;

  for (const axis of axes) {
    if (target[axis] <= 0) continue;
    const diffRatio = (actual[axis] - target[axis]) / target[axis];
    const absDiff = Math.abs(diffRatio);
    if (absDiff > bestAbsDiff) {
      bestAbsDiff = absDiff;
      best = {
        axis,
        direction: diffRatio > 0 ? 'more' : 'less',
        actualSharePct: Math.round(actual[axis] * 100),
        targetSharePct: Math.round(target[axis] * 100),
      };
    }
  }

  return bestAbsDiff >= INSIGHT_THRESHOLD_RATIO ? best : null;
}
