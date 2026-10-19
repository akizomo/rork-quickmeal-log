import { aggregateDailyActivity, toDateKey, type DailyBucket } from './daily-activity';

/** 端末の現地時間で y/m/d 0:00 から1日分のバケットを作る (HKStatisticsCollection と同じ形) */
function dayBucket(y: number, m: number, d: number, value: number): DailyBucket {
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { value, startDate: start.toISOString(), endDate: end.toISOString() };
}

describe('aggregateDailyActivity', () => {
  it('1日バケットはその日 (startDate の日付) に入る。翌日 0:00 の endDate で1日ずれない', () => {
    const steps = [dayBucket(2026, 10, 18, 6000), dayBucket(2026, 10, 19, 1234)];
    const energy = [dayBucket(2026, 10, 18, 300), dayBucket(2026, 10, 19, 50)];
    const result = aggregateDailyActivity(steps, energy);
    const byDate = Object.fromEntries(result.map((r) => [r.date, r]));
    expect(byDate['2026-10-18']).toEqual({ date: '2026-10-18', steps: 6000, activeKcal: 300 });
    expect(byDate['2026-10-19']).toEqual({ date: '2026-10-19', steps: 1234, activeKcal: 50 });
    // 翌日 (endDate の日付) には何も入らない
    expect(byDate['2026-10-20']).toBeUndefined();
  });

  it('同じ期間 (同じ startDate) が複数ソースから来たら合算せず多い方を取る', () => {
    const steps = [dayBucket(2026, 10, 18, 6000), dayBucket(2026, 10, 18, 5800)];
    const [day] = aggregateDailyActivity(steps, []);
    expect(day).toEqual({ date: '2026-10-18', steps: 6000, activeKcal: 0 });
  });

  it('同じ日の別期間 (startDate が違う) は合算する', () => {
    const morning = { value: 2000, startDate: new Date(2026, 9, 18, 0, 0).toISOString(), endDate: new Date(2026, 9, 18, 12, 0).toISOString() };
    const afternoon = { value: 3000, startDate: new Date(2026, 9, 18, 12, 0).toISOString(), endDate: new Date(2026, 9, 19, 0, 0).toISOString() };
    const [day] = aggregateDailyActivity([morning, afternoon], []);
    expect(day.steps).toBe(5000);
    expect(day.date).toBe('2026-10-18');
  });
});

describe('toDateKey', () => {
  it('端末の現地時間で日付を返す', () => {
    expect(toDateKey(new Date(2026, 9, 18, 23, 59).toISOString())).toBe('2026-10-18');
    expect(toDateKey(new Date(2026, 9, 19, 0, 0).toISOString())).toBe('2026-10-19');
  });
});
