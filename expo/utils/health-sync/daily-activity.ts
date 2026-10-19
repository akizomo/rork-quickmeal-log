/**
 * HealthKit の日別集計 (歩数 / アクティブエネルギー) を、アプリの日付キーごとにまとめる純粋関数。
 * ネイティブモジュールに依存しないので、adapter.ios.ts から切り出してテストできるようにしている。
 */
import type { HealthDailyActivitySample } from './types';

/** 日別集計の1件 (HKStatisticsCollection の1バケット)。startDate はその日の 0:00、endDate は翌日の 0:00 */
export interface DailyBucket {
  value: number;
  startDate: string;
  endDate?: string;
}

/** ISO 文字列を、端末の現地時間での YYYY-MM-DD にする */
export function toDateKey(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 歩数 / アクティブエネルギーの日別バケットを日付別に集約して DailyActivitySummary 配列にする。
 *
 * **日付は startDate で決める。** 1日バケットの endDate は「翌日の 0:00」なので、endDate で日付を
 * 決めると全日が1日後ろにずれる (2026-10-19 実機で「今日の歩数がヘルスケアと合わない」として発覚。
 * アプリの今日に、ヘルスケアの昨日の歩数が出ていた)。
 *
 * 歩数: (date, startDate) をキーにしてウィンドウを識別する。
 *   - 同じ startDate = 同じ統計期間 → 複数ソース (iPhone/Watch) の重複とみなし MAX を取る
 *   - 異なる startDate = 異なる時間帯 (DST 境界など) → 正当な細分化なので合算する
 */
export function aggregateDailyActivity(
  stepSamples: DailyBucket[],
  energySamples: DailyBucket[]
): HealthDailyActivitySample[] {
  const stepWindowMap = new Map<string, number>();
  for (const s of stepSamples) {
    const date = toDateKey(s.startDate);
    const windowKey = `${date}|${s.startDate}`;
    const prev = stepWindowMap.get(windowKey) ?? 0;
    stepWindowMap.set(windowKey, Math.max(prev, s.value));
  }
  const map = new Map<string, { steps: number; activeKcal: number }>();
  for (const [windowKey, value] of stepWindowMap) {
    const date = windowKey.split('|')[0];
    const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
    cur.steps += value;
    map.set(date, cur);
  }
  for (const s of energySamples) {
    const date = toDateKey(s.startDate);
    const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
    cur.activeKcal += s.value;
    map.set(date, cur);
  }
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    steps: Math.round(v.steps),
    activeKcal: Math.round(v.activeKcal),
  }));
}
