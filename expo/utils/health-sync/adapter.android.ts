import {
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

import { getExerciseLabel, normalizeAndroidExerciseType } from './mapping';
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
 * Android Health Connect adapter (Phase 1).
 *
 * Weight / BodyFat を読み取り、共通 HealthSyncResult に正規化する。
 * 歩数 / アクティブエネルギー / 運動セッションは Phase 2 で追加する。
 */

/** 同期ダイアログで要求する権限 (多いほどユーザーが選択できる) */
const REQUESTED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

/** 同期を「有効」と見なすために最低限必要な権限 */
const MINIMUM_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Weight' },
];

let initialized = false;
/** 進行中の初期化 Promise を保持して並列呼び出しでの二重実行を防ぐ */
let initInFlight: Promise<boolean> | null = null;
/** 直近の requestPermission() 結果サマリ (診断用) */
let lastRequestSummary = 'not requested yet';

/**
 * Health Connect プロバイダの状態を細かく返す。
 * - 'available': 利用可能 (initialize / requestPermission を呼んでよい)
 * - 'provider_missing': プロバイダ未インストール (Play Store 経由でインストール必要)
 * - 'provider_update_required': プロバイダのアップデート要
 * - 'unsupported': プラットフォーム自体が非対応 (Android < 8.0 等)
 *
 * v1.7+: `initialize()` / `requestPermission()` は SDK が利用不可のとき
 * Play Store へ自動遷移してしまうので、必ず先にこのチェックを通す。
 */
async function getProviderState(): Promise<
  'available' | 'provider_missing' | 'provider_update_required' | 'unsupported'
> {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'provider_update_required';
    }
    // SDK_UNAVAILABLE (=1) は OS が古いか、プロバイダが未インストールの可能性
    return 'provider_missing';
  } catch (err) {
    if (__DEV__) console.log('[health-sync/android] getSdkStatus failed', err);
    return 'unsupported';
  }
}

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    // SDK が利用可能でなければ initialize 自体を呼ばない (Play Store 遷移を防ぐ)
    const provider = await getProviderState();
    if (provider !== 'available') return false;
    try {
      const ok = await initialize();
      initialized = ok;
      return ok;
    } catch (err) {
      if (__DEV__) console.log('[health-sync/android] initialize failed', err);
      return false;
    }
  })().finally(() => {
    initInFlight = null;
  });
  return initInFlight;
}

/** 最低限の権限が揃っているか確認する (Weight のみ必須) */
async function hasMinimumPermissions(): Promise<boolean> {
  try {
    const granted = await getGrantedPermissions();
    return MINIMUM_PERMISSIONS.every((req) =>
      granted.some((g) => 'recordType' in g && g.recordType === req.recordType && g.accessType === req.accessType)
    );
  } catch (err) {
    if (__DEV__) console.log('[health-sync/android] getGrantedPermissions failed', err);
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
    if (__DEV__) console.log('[health-sync/android] fetchWeights failed', err);
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
    if (__DEV__) console.log('[health-sync/android] fetchBodyFat failed', err);
    return [];
  }
}

async function fetchDailyActivity(rangeDays: number): Promise<HealthDailyActivitySample[]> {
  // aggregateGroupByPeriod を使用: Health Connect が複数ソース(ウォッチ・スマホ等)の
  // 重複を排除した正しい日次合計を返す。readRecords の raw レコードを手動合計すると
  // ソースをまたいだ二重計上が発生するため使用しない。
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const map = new Map<string, { steps: number; activeKcal: number }>();
  try {
    const stepsResult = await aggregateGroupByPeriod({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime, endTime },
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
    for (const bucket of stepsResult) {
      const date = toDateKey(bucket.startTime);
      const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
      cur.steps = Math.round((bucket.result as { COUNT_TOTAL?: number }).COUNT_TOTAL ?? 0);
      map.set(date, cur);
    }
  } catch (err) {
    if (__DEV__) console.log('[health-sync/android] fetchSteps aggregation failed', err);
  }
  try {
    const energyResult = await aggregateGroupByPeriod({
      recordType: 'ActiveCaloriesBurned',
      timeRangeFilter: { operator: 'between', startTime, endTime },
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
    for (const bucket of energyResult) {
      const date = toDateKey(bucket.startTime);
      const cur = map.get(date) ?? { steps: 0, activeKcal: 0 };
      const energyTotal = (bucket.result as { ACTIVE_CALORIES_TOTAL?: { inKilocalories: number } }).ACTIVE_CALORIES_TOTAL;
      cur.activeKcal = Math.round(energyTotal?.inKilocalories ?? 0);
      map.set(date, cur);
    }
  } catch (err) {
    if (__DEV__) console.log('[health-sync/android] fetchActiveCalories aggregation failed', err);
  }
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    steps: v.steps,
    activeKcal: v.activeKcal,
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
    if (__DEV__) console.log('[health-sync/android] fetchWorkouts failed', err);
    return [];
  }
}

export const healthAdapter: HealthSyncAdapter = {
  isSupported() {
    return true;
  },
  async requestPermissions() {
    // 利用不可状態 (プロバイダ未インストール等) のときに requestPermission を呼ぶと
    // Play Store へ自動遷移して戻れなくなるため、初期化に成功した時だけ実行する。
    const ready = await ensureInitialized();
    if (!ready) {
      lastRequestSummary = 'init failed before requestPermission';
      return false;
    }
    try {
      // 全権限をダイアログで提示するが、最低限 Weight が許可されれば成功扱い。
      // requestPermission は「許可された権限の配列」を返す。空配列 = ダイアログで
      // 何も許可されなかった / ダイアログが出なかった可能性を意味する。
      const granted = await requestPermission(REQUESTED_PERMISSIONS);
      const summary = Array.isArray(granted)
        ? granted
            .map((g) => ('recordType' in g ? `${g.accessType}:${g.recordType}` : JSON.stringify(g)))
            .join(', ')
        : JSON.stringify(granted);
      lastRequestSummary = `returned [${Array.isArray(granted) ? granted.length : '?'}]: ${summary || '(empty)'}`;
      if (__DEV__) console.log('[health-sync/android] requestPermission result', lastRequestSummary);
      return await hasMinimumPermissions();
    } catch (err) {
      lastRequestSummary = `threw: ${err instanceof Error ? err.message : String(err)}`;
      if (__DEV__) console.log('[health-sync/android] requestPermission failed', err);
      return false;
    }
  },
  async fetch(rangeDays: number): Promise<HealthSyncResult> {
    const ready = await ensureInitialized();
    if (!ready) return emptyResult();
    const granted = await hasMinimumPermissions();
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
    const provider = await getProviderState();
    if (provider === 'unsupported') return 'unsupported';
    if (provider === 'provider_missing') return 'provider_missing';
    if (provider === 'provider_update_required') return 'provider_update_required';
    const ready = await ensureInitialized();
    if (!ready) return 'unauthorized'; // initialize 失敗でも provider は存在するので unauthorized 扱い
    const granted = await hasMinimumPermissions();
    return granted ? 'authorized' : 'unauthorized';
  },
  async getDiagnostics(): Promise<HealthDiagnostics> {
    let rawSdkStatus: number | null = null;
    let sdkStatusLabel = 'unknown';
    try {
      rawSdkStatus = await getSdkStatus();
      sdkStatusLabel =
        rawSdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE
          ? 'SDK_AVAILABLE'
          : rawSdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
          ? 'SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED'
          : rawSdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE
          ? 'SDK_UNAVAILABLE'
          : `unknown(${rawSdkStatus})`;
    } catch (err) {
      sdkStatusLabel = `getSdkStatus threw: ${err instanceof Error ? err.message : String(err)}`;
    }

    const initOk = await ensureInitialized();

    let grantedPermissions: string[] = [];
    try {
      const granted = await getGrantedPermissions();
      grantedPermissions = granted
        .map((g) => ('recordType' in g ? `${g.accessType}:${g.recordType}` : JSON.stringify(g)))
        .sort();
    } catch (err) {
      grantedPermissions = [`getGrantedPermissions threw: ${err instanceof Error ? err.message : String(err)}`];
    }

    return {
      platform: 'android',
      rawSdkStatus,
      sdkStatusLabel,
      initialized: initOk,
      grantedPermissions,
      status: await this.getStatus(),
      lastRequestSummary,
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
