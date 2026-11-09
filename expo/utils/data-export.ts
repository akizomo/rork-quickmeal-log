/**
 * data-export.ts — 記録を CSV にする純ロジック (PRD §6.9)。
 *
 * 他の AI や表計算に渡す用途。列名は英語の固定名にして、言語設定で変わらないようにする。
 * 副作用なし。共有は呼び出し側 (app/data-export.tsx) が OS の共有シートで行う。
 */

import { getIdentity } from '@/constants/identity';
import type { AppLocale } from '@/types/locale';
import type {
  BodyFatEntry,
  DailyActivitySummary,
  ExerciseLog,
  FoodLog,
  WeightEntry,
} from '@/types/nutrition';
import { migrateAmountValueForUnit } from './amount-migration';
import { getEffectiveAmountSpec } from './identity-attribute';
import { getLogDisplayInfo } from './log-display';

export type ExportFormat = 'food' | 'daily';
/** 日数 / すべて / 日付を指定した範囲 (YYYY-MM-DD、両端を含む。週次ふり返りの「この週」で使う) */
export type ExportPeriod = 7 | 30 | 90 | 'all' | { from: string; to: string };

export interface ExportSource {
  logs: FoodLog[];
  weights: WeightEntry[];
  bodyFatEntries: BodyFatEntry[];
  exerciseLogs: ExerciseLog[];
  dailyActivities: DailyActivitySummary[];
}

// AI が読んで意味が取れる列だけにする。「普通」「1人前」のようなラベルは単独では量が分からないので、
// 数値 (amount_value) と単位 (amount_unit) を必ず別の列に出す。
//   amount_unit: g / ml  (重さ・容量。これが取れる食品だけ)
//                count   (個・本・枚・切・皿などの数え物。単位名は amount_label の「2本」などに出る)
//                percent_of_one_standard_serving (標準の1人前を 100 とした割合。丼・定食・麺など。g のデータは無い)
//                x_one_standard_serving (標準の1人前の何倍か。古い記録)
//   どの単位でも kcal / protein_g / fat_g / carbs_g は常に実数で、量の絶対的な目安になる
//   input: standard_amount_tap (標準量をタップ=量は実測ではない) / adjusted (量を選んだ) /
//          manual_numbers (kcal・PFC を数値で直接入力) / my_food (保存した My食品)
const FOOD_HEADER = [
  'date', 'time', 'meal', 'food', 'category', 'detail',
  'amount_value', 'amount_unit', 'amount_label', 'add_ons', 'input',
  'kcal', 'protein_g', 'fat_g', 'carbs_g',
];
const DAILY_HEADER = [
  'date', 'kcal', 'protein_g', 'fat_g', 'carbs_g', 'meals_logged',
  'weight_kg', 'body_fat_pct', 'exercise_net_kcal', 'exercise_min', 'steps',
];

/** CSV の1セル。カンマ・引用符・改行を含むときだけ "" で囲む (RFC 4180) */
export function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvLine(cells: (string | number | undefined | null)[]): string {
  return cells.map(csvCell).join(',');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function localTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 期間の範囲 (YYYY-MM-DD)。日数は当日を含めて N 日。'all' は両端なし */
export function periodRange(period: ExportPeriod, now: Date): { from: string | null; to: string | null } {
  if (period === 'all') return { from: null, to: null };
  if (typeof period === 'object') return period;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - (period - 1));
  return { from: ymd(d), to: null };
}

/** 期間の開始日。'all' は null */
export function periodStart(period: ExportPeriod, now: Date): string | null {
  return periodRange(period, now).from;
}

type Range = { from: string | null; to: string | null };

function inRange(date: string, r: Range): boolean {
  return (r.from === null || date >= r.from) && (r.to === null || date <= r.to);
}

/** 量を (数値, 単位) で返す。ラベル ("普通" など) だけでは AI に量が伝わらないため */
function amountParts(log: FoodLog): { value: number | ''; unit: string } {
  const identity = log.identityId ? getIdentity(log.identityId) : undefined;
  if (identity) {
    const spec = getEffectiveAmountSpec(identity, log.attrKey);
    const value = migrateAmountValueForUnit(log.amountValue ?? spec.default, log.amountUnit, spec.unit);
    if (spec.unit === 'g' || spec.unit === 'ml') return { value: round1(value), unit: spec.unit };
    if (spec.unit === 'percent') return { value: round1(value), unit: 'percent_of_one_standard_serving' };
    return { value: round1(value), unit: 'count' };
  }
  // Identity を持たない古い記録
  if (log.amountValue != null && log.amountUnit) {
    return { value: round1(log.amountValue), unit: log.amountUnit === 'piece' ? 'count' : log.amountUnit };
  }
  const multiplier = log.portionValue ?? log.amountMultiplier;
  if (multiplier != null) return { value: multiplier, unit: 'x_one_standard_serving' };
  return { value: '', unit: '' };
}

/** どう入力された記録か。標準量のタップは「量が実測ではない」ことが AI の解釈に効く */
function inputKind(log: FoodLog): string {
  if (log.macroManual) return 'manual_numbers';
  if (log.myFood) return 'my_food';
  if (log.wasShortTap) return 'standard_amount_tap';
  return 'adjusted';
}

/** 食事ログ: 1行 = 1回の記録。日付 → 時刻の昇順 */
export function buildFoodCsv(
  logs: FoodLog[],
  period: ExportPeriod,
  now: Date,
  uiLanguage: AppLocale = 'ja',
): string {
  const from = periodRange(period, now);
  const rows = logs
    .filter((l) => inRange(l.date, from))
    .sort((a, b) => (a.date === b.date ? a.timestamp.localeCompare(b.timestamp) : a.date.localeCompare(b.date)));
  const lines = [csvLine(FOOD_HEADER)];
  for (const l of rows) {
    const info = getLogDisplayInfo(l, uiLanguage);
    const identity = l.identityId ? getIdentity(l.identityId) : undefined;
    // 食品名はいつも具体的な名前 (Identity)。バケット名 (「ごはんパン麺」) は category に出す
    const food = identity?.label ?? l.subTypeLabel ?? l.categoryLabel;
    const category = info.bucketHint ?? (l.wasShortTap ? info.title : l.categoryLabel);
    const amount = amountParts(l);
    const addOns = (info.addonsText ?? '').replace(/^\+ /, '');
    lines.push(
      csvLine([
        l.date,
        localTime(l.timestamp),
        l.mealSlot ?? '',
        food,
        category === food ? '' : category,
        info.subtitle ?? '',
        amount.value,
        amount.unit,
        info.amountText,
        addOns,
        inputKind(l),
        Math.round(l.macro.kcal),
        round1(l.macro.protein),
        round1(l.macro.fat),
        round1(l.macro.carbs),
      ]),
    );
  }
  return lines.join('\n');
}

/** 日別まとめ: 1行 = 1日。記録・体重・運動・歩数のいずれかがある日だけ。日付の昇順 */
export function buildDailyCsv(src: ExportSource, period: ExportPeriod, now: Date): string {
  const from = periodRange(period, now);
  const days = new Map<string, {
    kcal: number; p: number; f: number; c: number; meals: number;
    weight?: { v: number; at: string };
    bodyFat?: { v: number; at: string };
    exNet: number; exMin: number; hasEx: boolean; steps?: number;
  }>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) {
      d = { kcal: 0, p: 0, f: 0, c: 0, meals: 0, exNet: 0, exMin: 0, hasEx: false };
      days.set(date, d);
    }
    return d;
  };

  for (const l of src.logs) {
    if (!inRange(l.date, from)) continue;
    const d = day(l.date);
    d.kcal += l.macro.kcal; d.p += l.macro.protein; d.f += l.macro.fat; d.c += l.macro.carbs;
    d.meals += 1;
  }
  // 同日に複数あるときは、最後に記録したものを採る
  for (const w of src.weights) {
    if (!inRange(w.date, from)) continue;
    const d = day(w.date);
    if (!d.weight || w.createdAt >= d.weight.at) d.weight = { v: w.weightKg, at: w.createdAt };
  }
  for (const b of src.bodyFatEntries) {
    if (!inRange(b.date, from)) continue;
    const d = day(b.date);
    if (!d.bodyFat || b.createdAt >= d.bodyFat.at) d.bodyFat = { v: b.bodyFatPct, at: b.createdAt };
  }
  for (const e of src.exerciseLogs) {
    if (!inRange(e.date, from)) continue;
    const d = day(e.date);
    d.exNet += e.netKcal; d.exMin += e.minutes; d.hasEx = true;
  }
  for (const a of src.dailyActivities) {
    if (!inRange(a.date, from)) continue;
    day(a.date).steps = a.steps;
  }

  const lines = [csvLine(DAILY_HEADER)];
  for (const date of [...days.keys()].sort()) {
    const d = days.get(date)!;
    lines.push(
      csvLine([
        date,
        d.meals > 0 ? Math.round(d.kcal) : '',
        d.meals > 0 ? round1(d.p) : '',
        d.meals > 0 ? round1(d.f) : '',
        d.meals > 0 ? round1(d.c) : '',
        d.meals,
        d.weight ? round1(d.weight.v) : '',
        d.bodyFat ? round1(d.bodyFat.v) : '',
        d.hasEx ? Math.round(d.exNet) : '',
        d.hasEx ? Math.round(d.exMin) : '',
        d.steps ?? '',
      ]),
    );
  }
  return lines.join('\n');
}

export function buildExportCsv(
  format: ExportFormat,
  src: ExportSource,
  period: ExportPeriod,
  now: Date,
  uiLanguage: AppLocale = 'ja',
): string {
  return format === 'food'
    ? buildFoodCsv(src.logs, period, now, uiLanguage)
    : buildDailyCsv(src, period, now);
}

/** 期間内のデータ行数 (ヘッダ除く)。0 なら共有ボタンを無効にする */
export function countRows(csv: string): number {
  return Math.max(0, csv.split('\n').length - 1);
}
