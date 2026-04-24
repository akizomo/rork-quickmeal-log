import type { FoodLog, Macro } from '@/types/nutrition';

import { addMacro, createEmptyMacro, formatDateKey, roundMacro } from '@/utils/nutrition';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CalendarCell {
  date: Date;
  dateKey: string;
  inMonth: boolean;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function diffInDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sumForDate(logs: FoodLog[], dateKey: string): Macro {
  return logs
    .filter((log) => log.date === dateKey)
    .reduce((acc, item) => addMacro(acc, item.macro), createEmptyMacro());
}

export function logsForDate(logs: FoodLog[], dateKey: string): FoodLog[] {
  return logs.filter((log) => log.date === dateKey);
}

export function getDailyMacros(logs: FoodLog[], range: DateRange): Map<string, Macro> {
  const map = new Map<string, Macro>();
  const dayCount = diffInDays(range.end, range.start) + 1;
  for (let i = 0; i < dayCount; i += 1) {
    const date = addDays(range.start, i);
    const key = formatDateKey(date);
    map.set(key, createEmptyMacro());
  }
  for (const log of logs) {
    if (!map.has(log.date)) continue;
    map.set(log.date, addMacro(map.get(log.date)!, log.macro));
  }
  return map;
}

// Week range — Monday start, Sunday end (matches §6.6 reminder context "週1")
export function getWeekRange(anchor: Date): DateRange {
  const start = startOfDay(anchor);
  const dow = start.getDay();
  // Convert Sun(0)..Sat(6) to Mon(0)..Sun(6)
  const offsetFromMonday = (dow + 6) % 7;
  start.setDate(start.getDate() - offsetFromMonday);
  const end = addDays(start, 6);
  return { start, end };
}

export function getMonthRange(anchor: Date): DateRange {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: startOfDay(start), end: startOfDay(end) };
}

// Returns 42 cells (6 weeks × 7 days), Sunday-start grid for calendar UI
export function getMonthCalendarCells(anchor: Date): CalendarCell[] {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startDow = monthStart.getDay(); // Sun=0
  const gridStart = addDays(monthStart, -startDow);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    cells.push({
      date,
      dateKey: formatDateKey(date),
      inMonth: date >= monthStart && date <= monthEnd,
    });
  }
  return cells;
}

export function averageMacros(macros: Macro[]): Macro {
  if (macros.length === 0) return createEmptyMacro();
  const total = macros.reduce((acc, m) => addMacro(acc, m), createEmptyMacro());
  return {
    kcal: roundMacro(total.kcal / macros.length),
    protein: roundMacro(total.protein / macros.length),
    fat: roundMacro(total.fat / macros.length),
    carbs: roundMacro(total.carbs / macros.length),
  };
}

// Average over only days that have at least one log (>=1 kcal)
export function averageLoggedDays(dailyMap: Map<string, Macro>): Macro {
  const logged = Array.from(dailyMap.values()).filter((m) => m.kcal > 0);
  return averageMacros(logged);
}

export function countLoggedDays(dailyMap: Map<string, Macro>): number {
  return Array.from(dailyMap.values()).filter((m) => m.kcal > 0).length;
}

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function formatDayLabel(date: Date, today: Date = new Date()): string {
  if (isSameDay(date, today)) return '今日';
  if (isSameDay(date, addDays(today, -1))) return '昨日';
  const dow = WEEKDAY_JP[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()} (${dow})`;
}

export function formatShortDay(date: Date): string {
  const dow = WEEKDAY_JP[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()} (${dow})`;
}

export function formatWeekRangeLabel(range: DateRange): string {
  const sameMonth = range.start.getMonth() === range.end.getMonth();
  const startLabel = `${range.start.getMonth() + 1}/${range.start.getDate()}`;
  const endLabel = sameMonth
    ? `${range.end.getDate()}`
    : `${range.end.getMonth() + 1}/${range.end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(anchor: Date): string {
  return `${anchor.getFullYear()}年 ${anchor.getMonth() + 1}月`;
}

// Earliest date a user can navigate to. Falls back to oldest log date or today.
export function getHistoryStartDate(
  onboardingCompletedAtISO: string | null | undefined,
  logs: FoodLog[]
): Date {
  if (onboardingCompletedAtISO) {
    const d = new Date(onboardingCompletedAtISO);
    if (!Number.isNaN(d.getTime())) return startOfDay(d);
  }
  if (logs.length > 0) {
    const oldestKey = logs.reduce<string>((min, log) => (log.date < min ? log.date : min), logs[0].date);
    return startOfDay(new Date(oldestKey));
  }
  return startOfDay(new Date());
}
