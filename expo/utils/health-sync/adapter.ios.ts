import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

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
 * iOS HealthKit adapter.
 *
 * 2026-10-17: react-native-health (2024-10 以降更新なし・旧 Bridge 依存で RN 0.88 ではビルド不可) から
 * @kingstinct/react-native-healthkit (Nitro Modules) へ移行。取得結果は従来と同じ内部形
 * (HealthValue 相当: value / startDate / endDate / id) に揃え、正規化・集約ロジックはそのまま使う。
 */

/** 正規化前の1サンプル (旧 react-native-health の HealthValue と同じ形) */
interface HealthValue {
  id?: string;
  value: number;
  startDate: string;
  endDate?: string;
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  WorkoutTypeIdentifier,
] as const;

const AUTH_REQUEST = { toRead: READ_TYPES, toShare: [] } as const;

let initialized = false;
/** 進行中の初期化 Promise を保持して並列呼び出しでの二重実行を防ぐ */
let initInFlight: Promise<boolean> | null = null;

/**
 * 許可ダイアログを出す (初回のみ OS が表示。以降は即座に返る)。
 * HealthKit は読み取り許可の可否をアプリに教えないため、「依頼が済んだ = 初期化済み」とみなす (旧実装と同じ扱い)。
 * 許可を求める前にクエリを投げるとライブラリがクラッシュするので、取得は必ずこの後に行う。
 */
function initHealthKit(): Promise<boolean> {
  if (initialized) return Promise.resolve(true);
  if (initInFlight) return initInFlight;
  initInFlight = requestAuthorization(AUTH_REQUEST)
    .then((ok) => {
      initialized = ok;
      return ok;
    })
    .catch((error: unknown) => {
      if (__DEV__) console.log('[health-sync/ios] init error', error);
      initialized = false;
      return false;
    })
    .finally(() => {
      initInFlight = null;
    });
  return initInFlight;
}

function rangeStart(rangeDays: number): Date {
  return new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
}

async function getQuantitySamples(
  identifier: QuantityTypeIdentifier,
  unit: string,
  rangeDays: number,
  label: string,
): Promise<HealthValue[]> {
  try {
    const samples = await queryQuantitySamples(identifier, {
      limit: 100,
      ascending: false,
      unit,
      filter: { date: { startDate: rangeStart(rangeDays) } },
    });
    return samples.map((s) => ({
      id: s.uuid,
      value: s.quantity,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
    }));
  } catch (err) {
    if (__DEV__) console.log(`[health-sync/ios] ${label} error`, err);
    return [];
  }
}

function getWeightSamples(rangeDays: number): Promise<HealthValue[]> {
  return getQuantitySamples('HKQuantityTypeIdentifierBodyMass', 'kg', rangeDays, 'bodyMass');
}

function getBodyFatSamples(rangeDays: number): Promise<HealthValue[]> {
  return getQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', '%', rangeDays, 'bodyFat');
}

/**
 * 歩数 / アクティブエネルギーを1日単位の合計で取る (HKStatisticsCollectionQuery の cumulativeSum)。
 * 旧実装の getDailyStepCountSamples と同じく、iPhone と Apple Watch の重複はソース間で HealthKit が排除する。
 */
async function getDailyCumulative(
  identifier: QuantityTypeIdentifier,
  unit: string,
  rangeDays: number,
  label: string,
): Promise<HealthValue[]> {
  const start = rangeStart(rangeDays);
  const anchor = new Date(start);
  anchor.setHours(0, 0, 0, 0);
  try {
    const buckets = await queryStatisticsCollectionForQuantity(
      identifier,
      ['cumulativeSum'],
      anchor,
      { day: 1 },
      { unit, filter: { date: { startDate: anchor } } },
    );
    return buckets
      .filter((b) => b.startDate && b.sumQuantity)
      .map((b) => ({
        value: b.sumQuantity!.quantity,
        startDate: b.startDate!.toISOString(),
        endDate: (b.endDate ?? b.startDate!).toISOString(),
      }));
  } catch (err) {
    if (__DEV__) console.log(`[health-sync/ios] ${label} error`, err);
    return [];
  }
}

function getDailyStepSamples(rangeDays: number): Promise<HealthValue[]> {
  return getDailyCumulative('HKQuantityTypeIdentifierStepCount', 'count', rangeDays, 'stepCount');
}

function getActiveEnergySamples(rangeDays: number): Promise<HealthValue[]> {
  return getDailyCumulative('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', rangeDays, 'activeEnergy');
}

interface IosWorkoutSample {
  id?: string;
  /** HKWorkoutActivityType の名前 (PascalCase。mapping.ts の IOS_WORKOUT_MAP のキー) */
  activityName?: string;
  calories?: number;
  /** 秒 */
  duration?: number;
  start?: string;
  end?: string;
}

/** WorkoutActivityType の数値 → 'TraditionalStrengthTraining' 形式の名前 (旧ライブラリの activityName と同じ表記) */
function workoutActivityName(type: WorkoutActivityType): string | undefined {
  const name = WorkoutActivityType[type] as string | undefined;
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined;
}

async function getWorkoutSamples(rangeDays: number): Promise<IosWorkoutSample[]> {
  try {
    const proxies = await queryWorkoutSamples({
      limit: 0,
      ascending: false,
      filter: { date: { startDate: rangeStart(rangeDays) } },
    });
    return proxies.map((proxy) => {
      // proxy はネイティブオブジェクトを抱えるので、値だけ取り出して解放する
      const w = proxy.toJSON();
      proxy.dispose();
      return {
        id: w.uuid,
        activityName: workoutActivityName(w.workoutActivityType),
        calories: w.totalEnergyBurned?.unit === 'kcal' ? w.totalEnergyBurned.quantity : undefined,
        duration: w.duration.unit === 's' ? w.duration.quantity : undefined,
        start: w.startDate.toISOString(),
        end: w.endDate.toISOString(),
      };
    });
  } catch (err) {
    if (__DEV__) console.log('[health-sync/ios] workouts error', err);
    return [];
  }
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
    weightKg: Math.round(s.value * 10) / 10, // kg で取得済み。小数1桁
    healthSyncId: buildHealthSyncId('weight', s),
  }));
}

function normalizeBodyFat(samples: HealthValue[]): HealthBodyFatSample[] {
  return samples.map((s) => ({
    date: toDateKey(s.endDate ?? s.startDate),
    recordedAt: s.endDate ?? s.startDate,
    // HealthKit の percent 単位は 0.0〜1.0。ライブラリが % に換算して返す場合もあるので両方に対応する
    bodyFatPct: Math.round((s.value <= 1 ? s.value * 100 : s.value) * 10) / 10,
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
    // HealthKit は読み取り許可の可否を教えない。わかるのは「許可ダイアログを出し終えたか」だけなので、
    // 出し終えていれば authorized、未依頼なら unknown とする (旧実装と同じ意味)。
    if (initialized) return 'authorized';
    try {
      const status = await getRequestStatusForAuthorization(AUTH_REQUEST);
      return status === AuthorizationRequestStatus.unnecessary ? 'authorized' : 'unknown';
    } catch {
      return 'unknown';
    }
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
