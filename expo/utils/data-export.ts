/**
 * data-export.ts — 記録を CSV にする純ロジック (PRD §6.9)。
 *
 * 他の AI や表計算に渡す用途。列名は英語の固定名にして、言語設定で変わらないようにする。
 * 副作用なし。共有は呼び出し側 (app/data-export.tsx) が OS の共有シートで行う。
 */

import type {
  BodyFatEntry,
  DailyActivitySummary,
  ExerciseLog,
  FoodLog,
  WeightEntry,
} from '@/types/nutrition';

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

const FOOD_HEADER = [
  'date', 'time', 'meal', 'food', 'variant', 'amount', 'toppings',
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

/** 食事ログ: 1行 = 1回の記録。日付 → 時刻の昇順 */
export function buildFoodCsv(logs: FoodLog[], period: ExportPeriod, now: Date): string {
  const from = periodRange(period, now);
  const rows = logs
    .filter((l) => inRange(l.date, from))
    .sort((a, b) => (a.date === b.date ? a.timestamp.localeCompare(b.timestamp) : a.date.localeCompare(b.date)));
  const lines = [csvLine(FOOD_HEADER)];
  for (const l of rows) {
    const toppings = (l.toppings ?? []).map((x) => x.label).concat(l.additions ?? []).join(' / ');
    lines.push(
      csvLine([
        l.date,
        localTime(l.timestamp),
        l.mealSlot ?? '',
        l.categoryLabel,
        l.subTypeLabel ?? '',
        l.amountLabel ?? l.portionLabel ?? '',
        toppings,
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
): string {
  return format === 'food' ? buildFoodCsv(src.logs, period, now) : buildDailyCsv(src, period, now);
}

/** 期間内のデータ行数 (ヘッダ除く)。0 なら共有ボタンを無効にする */
export function countRows(csv: string): number {
  return Math.max(0, csv.split('\n').length - 1);
}
