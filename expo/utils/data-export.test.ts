import type { ExerciseLog, FoodLog, WeightEntry } from '@/types/nutrition';
import {
  buildDailyCsv,
  buildFoodCsv,
  countRows,
  csvCell,
  periodRange,
  periodStart,
  type ExportSource,
} from './data-export';

const NOW = new Date(2026, 10, 8, 12, 0, 0); // 2026-11-08 (local)

function ts(date: string, hh: number, mm: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0).toISOString();
}

function food(over: Partial<FoodLog> & { date: string; timestamp: string }): FoodLog {
  return {
    id: over.id ?? `${over.date}-${over.timestamp}`,
    mode: 'ingredient',
    categoryKey: 'rice',
    categoryLabel: 'ごはん',
    macro: { kcal: 252, protein: 3.76, fat: 0.5, carbs: 55.7 },
    ...over,
  } as FoodLog;
}

describe('csvCell', () => {
  it('quotes cells with comma, quote or newline', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('x\ny')).toBe('"x\ny"');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(0)).toBe('0');
  });
});

describe('periodStart', () => {
  it('counts today as day 1', () => {
    expect(periodStart(7, NOW)).toBe('2026-11-02');
    expect(periodStart(30, NOW)).toBe('2026-10-10');
    expect(periodStart('all', NOW)).toBeNull();
  });
});

describe('periodRange', () => {
  it('fixed range includes both ends', () => {
    const logs = [
      food({ date: '2026-11-01', timestamp: ts('2026-11-01', 9, 0) }),
      food({ date: '2026-11-02', timestamp: ts('2026-11-02', 9, 0) }),
      food({ date: '2026-11-08', timestamp: ts('2026-11-08', 9, 0) }),
    ];
    expect(periodRange({ from: '2026-11-02', to: '2026-11-08' }, NOW)).toEqual({ from: '2026-11-02', to: '2026-11-08' });
    expect(countRows(buildFoodCsv(logs, { from: '2026-11-02', to: '2026-11-07' }, NOW))).toBe(1);
    expect(countRows(buildFoodCsv(logs, { from: '2026-11-02', to: '2026-11-08' }, NOW))).toBe(2);
  });
});

describe('buildFoodCsv', () => {
  const logs: FoodLog[] = [
    food({ date: '2026-11-08', timestamp: ts('2026-11-08', 19, 30), mealSlot: 'dinner', categoryLabel: 'カレー, 辛口', toppings: [{ id: 't', label: '卵', macroDelta: { kcal: 0, protein: 0, fat: 0, carbs: 0 } }] }),
    food({ date: '2026-11-08', timestamp: ts('2026-11-08', 8, 5), mealSlot: 'breakfast', amountLabel: '150g' }),
    food({ date: '2026-10-01', timestamp: ts('2026-10-01', 12, 0) }),
  ];

  it('sorts ascending, filters by period, escapes and rounds', () => {
    const lines = buildFoodCsv(logs, 30, NOW).split('\n');
    expect(lines[0]).toBe('date,time,meal,food,variant,amount,toppings,kcal,protein_g,fat_g,carbs_g');
    expect(lines).toHaveLength(3); // header + 2 (the 2026-10-01 log is out of range)
    expect(lines[1]).toBe('2026-11-08,08:05,breakfast,ごはん,,150g,,252,3.8,0.5,55.7');
    expect(lines[2]).toBe('2026-11-08,19:30,dinner,"カレー, 辛口",,,卵,252,3.8,0.5,55.7');
  });

  it("'all' includes everything", () => {
    expect(countRows(buildFoodCsv(logs, 'all', NOW))).toBe(3);
  });

  it('header only when empty', () => {
    expect(countRows(buildFoodCsv([], 'all', NOW))).toBe(0);
  });
});

describe('buildDailyCsv', () => {
  const weights: WeightEntry[] = [
    { id: 'w1', date: '2026-11-08', weightKg: 60.04, createdAt: '2026-11-08T01:00:00Z' },
    { id: 'w2', date: '2026-11-08', weightKg: 59.86, createdAt: '2026-11-08T09:00:00Z' },
  ];
  const exerciseLogs: ExerciseLog[] = [
    { id: 'e1', date: '2026-11-07', timestamp: ts('2026-11-07', 7, 0), exerciseType: 'run', exerciseLabel: 'ラン', minutes: 30, grossKcal: 300, netKcal: 250 },
    { id: 'e2', date: '2026-11-07', timestamp: ts('2026-11-07', 20, 0), exerciseType: 'walk', exerciseLabel: '歩く', minutes: 20, grossKcal: 80, netKcal: 60 },
  ];
  const src: ExportSource = {
    logs: [
      food({ date: '2026-11-08', timestamp: ts('2026-11-08', 8, 0) }),
      food({ date: '2026-11-08', timestamp: ts('2026-11-08', 12, 0) }),
    ],
    weights,
    bodyFatEntries: [],
    exerciseLogs,
    dailyActivities: [{ date: '2026-11-07', steps: 8123, activeKcal: 300, source: 'health', syncedAt: '2026-11-07T23:00:00Z' }],
  };

  it('merges per day ascending, last weight wins, blanks where no data', () => {
    const lines = buildDailyCsv(src, 7, NOW).split('\n');
    expect(lines[0]).toBe('date,kcal,protein_g,fat_g,carbs_g,meals_logged,weight_kg,body_fat_pct,exercise_net_kcal,exercise_min,steps');
    expect(lines[1]).toBe('2026-11-07,,,,,0,,,310,50,8123');
    expect(lines[2]).toBe('2026-11-08,504,7.5,1,111.4,2,59.9,,,,');
  });
});
