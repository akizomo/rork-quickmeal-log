import type { ExerciseLog } from '@/types/nutrition';
import {
  isDeletedHealthWorkout,
  pruneDeletedHealthWorkouts,
  toDeletedHealthWorkout,
} from './deleted-workouts';

const healthLog: ExerciseLog = {
  id: 'ex-h-1',
  date: '2026-10-26',
  timestamp: '2026-10-26T07:00:00.000Z',
  exerciseType: 'running',
  exerciseLabel: 'ランニング',
  minutes: 30,
  grossKcal: 300,
  netKcal: 250,
  source: 'health',
  healthSyncId: 'hk-abc',
};

describe('toDeletedHealthWorkout', () => {
  it('ヘルス由来のログから印を作る', () => {
    expect(toDeletedHealthWorkout(healthLog)).toEqual({
      healthSyncId: 'hk-abc',
      date: '2026-10-26',
      exerciseType: 'running',
      timestamp: '2026-10-26T07:00:00.000Z',
      minutes: 30,
    });
  });

  it('手動ログは同期で戻らないので印を作らない', () => {
    expect(toDeletedHealthWorkout({ ...healthLog, source: 'manual', healthSyncId: undefined })).toBeNull();
    expect(toDeletedHealthWorkout({ ...healthLog, source: undefined, healthSyncId: undefined })).toBeNull();
  });
});

describe('isDeletedHealthWorkout', () => {
  const deleted = [toDeletedHealthWorkout(healthLog)!];

  it('同じ healthSyncId のワークアウトは削除済みとみなす', () => {
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'hk-abc',
        exerciseTypeKey: 'running',
        startedAt: '2026-10-26T07:00:00.000Z',
        minutes: 30,
      })
    ).toBe(true);
  });

  it('ID が変わっても、種別・開始・長さが同じなら同じワークアウトとみなす', () => {
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'workout-2026-10-26T07:00:00.000Z-Running-30',
        exerciseTypeKey: 'running',
        startedAt: '2026-10-26T07:00:00.400Z',
        minutes: 30,
      })
    ).toBe(true);
  });

  it('ヘルス側で時間を直したワークアウトは、ID が変わっていれば取り込む', () => {
    // 長さを直した
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'hk-fixed-1',
        exerciseTypeKey: 'running',
        startedAt: '2026-10-26T07:00:00.000Z',
        minutes: 45,
      })
    ).toBe(false);
    // 開始をずらした
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'hk-fixed-2',
        exerciseTypeKey: 'running',
        startedAt: '2026-10-26T07:10:00.000Z',
        minutes: 30,
      })
    ).toBe(false);
  });

  it('別種別・離れた時刻のワークアウトは取り込む', () => {
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'hk-other',
        exerciseTypeKey: 'cycling',
        startedAt: '2026-10-26T07:00:00.000Z',
        minutes: 30,
      })
    ).toBe(false);
    expect(
      isDeletedHealthWorkout(deleted, {
        healthSyncId: 'hk-later',
        exerciseTypeKey: 'running',
        startedAt: '2026-10-26T18:00:00.000Z',
        minutes: 30,
      })
    ).toBe(false);
  });
});

describe('pruneDeletedHealthWorkouts', () => {
  it('30日より古い印を落とし、新しい印は残す', () => {
    const recent = toDeletedHealthWorkout(healthLog)!;
    const old = { ...recent, healthSyncId: 'hk-old', timestamp: '2026-09-01T07:00:00.000Z' };
    expect(pruneDeletedHealthWorkouts([recent, old], new Date('2026-10-27T00:00:00.000Z'))).toEqual([recent]);
  });

  it('何も落とさなければ同じ配列を返す', () => {
    const list = [toDeletedHealthWorkout(healthLog)!];
    expect(pruneDeletedHealthWorkouts(list, new Date('2026-10-27T00:00:00.000Z'))).toBe(list);
  });
});
