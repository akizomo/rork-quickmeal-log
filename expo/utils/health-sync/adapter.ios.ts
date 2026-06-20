import AppleHealthKit, {
  type HealthInputOptions,
  type HealthKitPermissions,
  type HealthValue,
} from 'react-native-health';

import { normalizeIosWorkoutType, getExerciseLabel } from './mapping';
import type {
  HealthBodyFatSample,
  HealthDailyActivitySample,
  HealthDiagnostics,
  HealthSyncAdapter,
  HealthSyncResult,
  HealthSyncStatus,
  HealthWeightSample,
  HealthWorkoutSample,
} from './types';

/**
 * iOS HealthKit adapter (Phase 1).
 *
 * BodyMass / BodyFatPercentage を読み取り、共通 HealthSyncResult に正規化する。
 * 歩数 / アクティブエネルギー / ワークアウトは Phase 2 で追加する。
 */

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

let initialized = false;
/** 進行中の初期化 Promise を保持して並列呼び出しでの二重実行を防ぐ */
let initInFlight: Promise<boolean> | null = null;

function initHealthKit(): Promise<boolean> {
  if (initialized) return Promise.resolve(true);
  if (initInFlight) return initInFlight;
  initInFlight = new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        if (__DEV__) console.log('[health-sync/ios] init error', error);
        initialized = false;
        resolve(false);
        return;
      }
      initialized = true;
      resolve(true);
    });
  }).finally(() => {
    initInFlight = null;
  });
  return initInFlight;
}

function getWeightSamples(rangeDays: number): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const options: HealthInputOptions = {
      unit: 'gram' as HealthInputOptions['unit'],
      startDate,
      ascending: false,
      limit: 100,
    };
    AppleHealthKit.getWeightSamples(options, (err, results) => {
      if (err) {
        if (__DEV__) console.log('[health-sync/ios] getWeightSamples error', err);
        resolve([]);
        return;
      }
      resolve(results ?? []);
    });
  });
}

function getBodyFatSamples(rangeDays: number): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const options: HealthInputOptions = {
      unit: 'percent' as HealthInputOptions['unit'],
      startDate,
      ascending: false,
      limit: 100,
    };
    AppleHealthKit.getBodyFatPercentageSamples(options, (err, results) => {
      if (err) {
        if (__DEV__) console.log('[health-sync/ios] getBodyFatPercentageSamples error', err);
        resolve([]);
        return;
      }
      resolve(results ?? []);
    });
  });
}

function getDailyStepSamples(rangeDays: number): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const options: HealthInputOptions = {
      unit: 'count' as HealthInputOptions['unit'],
      startDate,
      ascending: false,
    };
    AppleHealthKit.getDailyStepCountSamples(options, (err, results) => {
      if (err) {
        if (__DEV__) console.log('[health-sync/ios] getDailyStepCountSamples error', err);
        resolve([]);
        return;
      }
      resolve(results ?? []);
    });
  });
}

function getActiveEnergySamples(rangeDays: number): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const options: HealthInputOptions = {
      unit: 'kilocalorie' as HealthInputOptions['unit'],
      startDate,
      ascending: false,
    };
    AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
      if (err) {
        if (__DEV__) console.log('[health-sync/ios] getActiveEnergyBurned error', err);
        resolve([]);
        return;
      }
      resolve(results ?? []);
    });
  });
}

interface IosWorkoutSample {
  id?: string;
  activityName?: string;
  calories?: number;
  duration?: number;
  start?: string;
  end?: string;
}

function getWorkoutSamples(rangeDays: number): Promise<IosWorkoutSample[]> {
  return new Promise((resolve) => {
    const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const options: HealthInputOptions = {
      startDate,
      ascending: false,
    };
    AppleHealthKit.getAnchoredWorkouts(options, (err, results) => {
      if (err) {
        if (__DEV__) console.log('[health-sync/ios] getAnchoredWorkouts error', err);
        resolve([]);
        return;
      }
      resolve((results?.data as IosWorkoutSample[]) ?? []);
    });
  });
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildHealthSyncId(metric: string, sample: HealthValue): string {
  return sample.id ?? `${metric}-${sample.startDate}-${sample.value}`;
}

function normalizeWeight(samples: HealthValue[]): HealthWeightSample[] {
  return samples.map((s) => ({
    date: toDateKey(s.endDate ?? s.startDate),
    recordedAt: s.endDate ?? s.startDate,
    weightKg: Math.round((s.value / 1000) * 10) / 10, // grams → kg, 1 decimal
    healthSyncId: buildHealthSyncId('weight', s),
  }));
}

function normalizeBodyFat(samples: HealthValue[]): HealthBodyFatSample[] {
  return samples.map((s) => ({
    date: toDateKey(s.endDate ?? s.startDate),
    recordedAt: s.endDate ?? s.startDate,
    // HealthKit returns 0.0–1.0 for percent; convert to %.
    bodyFatPct: Math.round(s.value * 100 * 10) / 10,
    healthSyncId: buildHealthSyncId('bodyfat', s),
  }));
}

/**
 * 歩数 / アクティブエネのサンプルを日付別に集約して DailyActivitySummary 配列にする。
 *
 * getDailyStepCountSamples は HKStatisticsOptionCumulativeSum (ソース間重複排除済み) を
 * 使うため通常は1日1サンプル。ただし DST 境界等で複数サンプルが同日に返る場合があるため
 * 安全のため集約する。歩数は「同日の複数サンプルの合計」を使用する (正当な細分化)。
 * ただし Apple Watch + iPhone の両方が "day total" として返ってきた場合の二重計上を
 * 防ぐため、同一 value の重複サンプルは排除する。
 */
function aggregateDailyActivity(
  stepSamples: HealthValue[],
  energySamples: HealthValue[]
): HealthDailyActivitySample[] {
  // 歩数: (date, startDate) をキーにしてウィンドウを識別する。
  //   - 同じ startDate = 同じ統計期間 → 複数ソース (iPhone/Watch) の重複とみなし MAX を取る
  //   - 異なる startDate = 異なる時間帯 (午前/午後など) → 正当な細分化なので合算する
  const stepWindowMap = new Map<string, number>();
  for (const s of stepSamples) {
    const date = toDateKey(s.endDate ?? s.startDate);
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
    const date = toDateKey(s.endDate ?? s.startDate);
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

function normalizeWorkouts(samples: IosWorkoutSample[]): HealthWorkoutSample[] {
  return samples
    .filter((s) => s.start && s.end && Number.isFinite(s.duration))
    .map((s) => {
      const exerciseTypeKey = normalizeIosWorkoutType(s.activityName);
      const label = getExerciseLabel(exerciseTypeKey);
      // duration は秒。 minutes に変換。
      const minutes = Math.max(0, Math.round((s.duration ?? 0) / 60));
      const grossKcal = Math.max(0, Math.round(s.calories ?? 0));
      const startedAt = s.start!;
      const endedAt = s.end!;
      const healthSyncId =
        s.id ?? `workout-${startedAt}-${s.activityName ?? 'unknown'}-${minutes}`;
      return {
        date: toDateKey(startedAt),
        startedAt,
        endedAt,
        rawType: s.activityName ?? 'Other',
        exerciseTypeKey,
        exerciseLabel: label,
        minutes,
        grossKcal,
        healthSyncId,
      };
    });
}

export const healthAdapter: HealthSyncAdapter = {
  isSupported() {
    return true;
  },
  async requestPermissions() {
    return initHealthKit();
  },
  async fetch(rangeDays: number): Promise<HealthSyncResult> {
    if (!initialized) {
      const granted = await initHealthKit();
      if (!granted) {
        return emptyResult();
      }
    }
    const [weightSamples, bodyFatSamples, stepSamples, energySamples, workoutSamples] =
      await Promise.all([
        getWeightSamples(rangeDays),
        getBodyFatSamples(rangeDays),
        getDailyStepSamples(rangeDays),
        getActiveEnergySamples(rangeDays),
        getWorkoutSamples(rangeDays),
      ]);
    return {
      weights: normalizeWeight(weightSamples),
      bodyFats: normalizeBodyFat(bodyFatSamples),
      workouts: normalizeWorkouts(workoutSamples),
      dailyActivities: aggregateDailyActivity(stepSamples, energySamples),
      syncedAt: new Date().toISOString(),
    };
  },
  async getStatus(): Promise<HealthSyncStatus> {
    // Permission の正確な状態は initHealthKit 後でないと判定できない。
    // Phase 1 では「初期化済みなら authorized、未初期化なら unknown」とする。
    return initialized ? 'authorized' : 'unknown';
  },
  async getDiagnostics(): Promise<HealthDiagnostics> {
    const initOk = await initHealthKit();
    return {
      platform: 'ios',
      rawSdkStatus: null,
      sdkStatusLabel: 'n/a (iOS HealthKit)',
      initialized: initOk,
      grantedPermissions: [],
      status: initialized ? 'authorized' : 'unknown',
    };
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
