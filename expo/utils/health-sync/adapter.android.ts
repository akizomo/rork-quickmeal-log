import {
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
  type Permission,
} from 'react-native-health-connect';

import { getExerciseLabel, normalizeAndroidExerciseType } from './mapping';
import type {
  HealthBodyFatSample,
  HealthDailyActivitySample,
  HealthSyncAdapter,
  HealthSyncResult,
  HealthSyncStatus,
  HealthWeightSample,
  HealthWorkoutSample,
} from './types';

/**
 * Android Health Connect adapter (Phase 1).
 *
 * Weight / BodyFat を読み取り、共通 HealthSyncResult に正規化する。
 * 歩数 / アクティブエネルギー / 運動セッションは Phase 2 で追加する。
 */

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  try {
    const ok = await initialize();
    initialized = ok;
    return ok;
  } catch (err) {
    console.log('[health-sync/android] initialize failed', err);
    return false;
  }
}

async function hasAllPermissions(): Promise<boolean> {
  try {
    const granted = await getGrantedPermissions();
    return REQUIRED_PERMISSIONS.every((req) =>
      granted.some((g) => 'recordType' in g && g.recordType === req.recordType && g.accessType === req.accessType)
    );
  } catch (err) {
    console.log('[health-sync/android] getGrantedPermissions failed', err);
    return false;
  }
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchWeights(rangeDays: number): Promise<HealthWeightSample[]> {
  const startTime = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const result = await readRecords('Weight', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: false,
    });
    return result.records.map((r) => {
      const time = r.time;
      const id = r.metadata?.id ?? `weight-${time}-${r.weight.inKilograms}`;
      return {
        date: toDateKey(time),
        recordedAt: time,
        weightKg: Math.round(r.weight.inKilograms * 10) / 10,
        healthSyncId: id,
      };
    });
  } catch (err) {
    console.log('[health-sync/android] fetchWeights failed', err);
    return [];
  }
}

async function fetchBodyFat(rangeDays: number): Promise<HealthBodyFatSample[]> {
  const startTime = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const result = await readRecords('BodyFat', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: false,
    });
    return result.records.map((r) => {
      const time = r.time;
      const id = r.metadata?.id ?? `bodyfat-${time}-${r.percentage}`;
      return {
        date: toDateKey(time),
        recordedAt: time,
        bodyFatPct: Math.round(r.percentage * 10) / 10,
        healthSyncId: id,
      };
    });
  } catch (err) {
    console.log('[health-sync/android] fetchBodyFat failed', err);
    return [];
  }
}

async function fetchDailyActivity(rangeDays: number): Promise<HealthDailyActivitySample[]> {
  const startTime = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const map = new Map<string, { steps: number; activeKcal: number }>();
  try {
    const stepsResult = await readRecords('Steps', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: false,
    });
    for (const r of stepsResult.records) {
      const date = toDateKey(r.startTime);
      const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
      cur.steps += r.count;
      map.set(date, cur);
    }
  } catch (err) {
    console.log('[health-sync/android] fetchSteps failed', err);
  }
  try {
    const energyResult = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: false,
    });
    for (const r of energyResult.records) {
      const date = toDateKey(r.startTime);
      const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
      cur.activeKcal += r.energy.inKilocalories;
      map.set(date, cur);
    }
  } catch (err) {
    console.log('[health-sync/android] fetchActiveCalories failed', err);
  }
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    steps: Math.round(v.steps),
    activeKcal: Math.round(v.activeKcal),
  }));
}

async function fetchWorkouts(rangeDays: number): Promise<HealthWorkoutSample[]> {
  const startTime = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const result = await readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'after', startTime },
      ascendingOrder: false,
    });
    return result.records.map((r) => {
      const startedAt = r.startTime;
      const endedAt = r.endTime;
      const minutes = Math.max(
        0,
        Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      );
      const exerciseTypeKey = normalizeAndroidExerciseType(r.exerciseType);
      const id = r.metadata?.id ?? `workout-${startedAt}-${r.exerciseType}`;
      return {
        date: toDateKey(startedAt),
        startedAt,
        endedAt,
        rawType: String(r.exerciseType),
        exerciseTypeKey,
        exerciseLabel: getExerciseLabel(exerciseTypeKey),
        minutes,
        // Health Connect の ExerciseSession には kcal は無いため、後段で MET×体重で再計算
        grossKcal: 0,
        healthSyncId: id,
      };
    });
  } catch (err) {
    console.log('[health-sync/android] fetchWorkouts failed', err);
    return [];
  }
}

export const healthAdapter: HealthSyncAdapter = {
  isSupported() {
    return true;
  },
  async requestPermissions() {
    const ready = await ensureInitialized();
    if (!ready) return false;
    try {
      await requestPermission(REQUIRED_PERMISSIONS);
      return await hasAllPermissions();
    } catch (err) {
      console.log('[health-sync/android] requestPermission failed', err);
      return false;
    }
  },
  async fetch(rangeDays: number): Promise<HealthSyncResult> {
    const ready = await ensureInitialized();
    if (!ready) return emptyResult();
    const granted = await hasAllPermissions();
    if (!granted) return emptyResult();
    const [weights, bodyFats, dailyActivities, workouts] = await Promise.all([
      fetchWeights(rangeDays),
      fetchBodyFat(rangeDays),
      fetchDailyActivity(rangeDays),
      fetchWorkouts(rangeDays),
    ]);
    return {
      weights,
      bodyFats,
      workouts,
      dailyActivities,
      syncedAt: new Date().toISOString(),
    };
  },
  async getStatus(): Promise<HealthSyncStatus> {
    const ready = await ensureInitialized();
    if (!ready) return 'unsupported';
    const granted = await hasAllPermissions();
    return granted ? 'authorized' : 'unauthorized';
  },
};

function emptyResult(): HealthSyncResult {
  return {
    weights: [],
    bodyFats: [],
    workouts: [],
    dailyActivities: [],
    syncedAt: new Date().toISOString(),
  };
}
