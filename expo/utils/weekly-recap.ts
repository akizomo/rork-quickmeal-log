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

/** PFC 傾向を「特筆すべき」と判定する最小乖離率。これ未満は insight を出さない。 */
const INSIGHT_THRESHOLD_RATIO = 0.15;

/** 軸ごとの kcal/g 換算係数。「高◯◯食材」の密度判定に使う。 */
const AXIS_KCAL_PER_GRAM: Record<MacroAxis, number> = { protein: 4, fat: 9, carbs: 4 };

/**
 * 軸ごとの「高◯◯食材」判定閾値 (defaultMacro のうちその軸が占めるkcal比率)。
 * 例: protein 0.25 = カロリーの25%以上がたんぱく質由来なら高たんぱく食材とみなす。
 */
const AXIS_DENSITY_THRESHOLD: Record<MacroAxis, number> = { protein: 0.25, fat: 0.35, carbs: 0.45 };

/**
 * 軸ごとの「低◯◯食材」判定閾値 (direction='more' の代替案提示に使う)。
 * 例: fat 0.20 = カロリーの20%未満が脂質由来なら低脂質の代替候補とみなす。
 */
const AXIS_LOW_DENSITY_THRESHOLD: Record<MacroAxis, number> = { protein: 0.10, fat: 0.20, carbs: 0.25 };

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
function pickNutritionNote(allNotes: NutritionNote[], identityId: string, weekKey: string): NutritionNote | null {
  // 2系統以上の出典で照合できた (alsoSources を持つ) ノートだけを出す。
  // 単一出典のノートは、照合が済むまでコードに残しつつ、ユーザーには見せない (§10.14 追補 2026-09-29)。
  const notes = allNotes.filter((n) => (n.alsoSources?.length ?? 0) > 0);
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
}

export interface WeeklyMacroBoost {
  axis: MacroAxis;
  /** 'less' = その軸を増やせる高密度候補、'more' = その軸が少ない低密度代替候補。 */
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
  avgActual: number;
  avgTarget: number;
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
  | { kind: 'macroSources'; axis: MacroAxis; sources: WeeklyMacroSource[] }
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
   * PFC のうち最も乖離が大きかった1軸のみ (乖離率 15%未満なら null)。
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
    ? computeMacroInsight(loggedDays, profile, targetForKey, base)
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
  const macroBoost = computeMacroBoost(logs, macroInsight, weekKey, weekIndex);

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
  const sources = computeMacroSources(logs, range, SOURCE_AXIS_ROTATION[weekIndex % SOURCE_AXIS_ROTATION.length]);
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
    discoveries: selectDiscoveries(candidates),
  };
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
function computeMacroSources(logs: FoodLog[], range: DateRange, axis: MacroAxis): WeeklyDiscovery | null {
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
  return { kind: 'macroSources', axis, sources };
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
      .filter((c): c is { identity: Identity; count: number } => !!c.identity && match(c.identity))
      .sort((a, b) => b.count - a.count)
      .map(({ identity }) => ({ identityId: identity.id, label: identity.label, fromHistory: true }));

  if (direction === 'less') {
    const isDense = (identity: Identity) => densityFor(axis, identity.defaultMacro) >= AXIS_DENSITY_THRESHOLD[axis];
    const fromHistory = historyMatching(isDense);

    // 履歴に十分あれば履歴だけを週ごとにローテーション (毎週同じ3品にしない)。
    // 足りなければ履歴 + カタログ補完。補完側も密度上位の中でローテーションする。
    let candidates: WeeklyMacroBoostCandidate[];
    if (fromHistory.length > MAX_BOOST_CANDIDATES) {
      candidates = rotate(fromHistory, MAX_BOOST_CANDIDATES, weekIndex);
    } else {
      const seenIds = new Set(fromHistory.map((c) => c.identityId));
      const catalogPool = ALL_IDENTITIES
        .filter((identity) => !seenIds.has(identity.id) && isDense(identity))
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
        ? pickNutritionNote(identity.nutritionNotes, identity.id, weekKey)
        : null;
      if (identity && picked) {
        note = { identityId: identity.id, identityLabel: identity.label, note: picked };
        break;
      }
    }
    return { axis, direction, candidates, note };
  }

  // direction === 'more': 低密度食材を記録履歴から提示 (カタログ補完なし)
  const candidates = rotate(
    historyMatching((identity) => densityFor(axis, identity.defaultMacro) < AXIS_LOW_DENSITY_THRESHOLD[axis]),
    MAX_BOOST_CANDIDATES,
    weekIndex,
  );

  if (candidates.length === 0) return null;

  return { axis, direction, candidates, note: null };
}

/**
 * 記録日の実測 P/F/C 平均と、各日の目標kcal比率でスケールした目標 P/F/C 平均を比較し、
 * 最も乖離が大きい1軸だけを返す (nutrition-ui の todayAdjustedPfc と同じスケール方式)。
 */
function computeMacroInsight(
  loggedDays: [string, { protein: number; fat: number; carbs: number }][],
  profile: UserProfile,
  targetForKey: (key: string) => number,
  base: number,
): WeeklyMacroInsight | null {
  const axes: MacroAxis[] = ['protein', 'fat', 'carbs'];
  const targetBase: Record<MacroAxis, number> = {
    protein: profile.targetProtein,
    fat: profile.targetFat,
    carbs: profile.targetCarbs,
  };

  let best: WeeklyMacroInsight | null = null;
  let bestAbsDiff = 0;

  for (const axis of axes) {
    const avgActual = loggedDays.reduce((sum, [, m]) => sum + m[axis], 0) / loggedDays.length;
    const avgTarget = loggedDays.reduce((sum, [key]) => {
      const ratio = targetForKey(key) / base;
      return sum + targetBase[axis] * ratio;
    }, 0) / loggedDays.length;

    if (avgTarget <= 0) continue;
    const diffRatio = (avgActual - avgTarget) / avgTarget;
    const absDiff = Math.abs(diffRatio);
    if (absDiff > bestAbsDiff) {
      bestAbsDiff = absDiff;
      best = {
        axis,
        direction: diffRatio > 0 ? 'more' : 'less',
        avgActual: Math.round(avgActual),
        avgTarget: Math.round(avgTarget),
      };
    }
  }

  return bestAbsDiff >= INSIGHT_THRESHOLD_RATIO ? best : null;
}
