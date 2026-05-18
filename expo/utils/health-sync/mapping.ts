import { EXERCISE_TYPES, type ExerciseTypeKey } from '@/utils/goals';

/**
 * HealthKit `HKWorkoutActivityType` (string name) / Health Connect `ExerciseType`
 * をアプリ内 `EXERCISE_TYPES` キーに正規化するマッピング。
 *
 * 未知の type は `'other'` (スポーツ) にフォールバックする。
 */

/** HealthKit `HKWorkoutActivityType` のセマンティック名 → アプリ内 key */
const IOS_WORKOUT_MAP: Record<string, ExerciseTypeKey> = {
  Walking: 'walking',
  Running: 'running',
  Hiking: 'walking',
  Cycling: 'cycling',
  TraditionalStrengthTraining: 'strength',
  FunctionalStrengthTraining: 'strength',
  CoreTraining: 'strength',
  Yoga: 'yoga',
  Pilates: 'yoga',
  MindAndBody: 'yoga',
  Flexibility: 'yoga',
  Swimming: 'swimming',
  HighIntensityIntervalTraining: 'hiit',
  CrossTraining: 'hiit',
  Other: 'other',
};

/** Android Health Connect `exerciseType` 数値定数 → アプリ内 key
 *  参照: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord
 */
const ANDROID_WORKOUT_MAP: Record<number, ExerciseTypeKey> = {
  79: 'walking', // EXERCISE_TYPE_WALKING
  56: 'running', // EXERCISE_TYPE_RUNNING
  57: 'running', // EXERCISE_TYPE_RUNNING_TREADMILL
  37: 'walking', // EXERCISE_TYPE_HIKING → walking (アプリ内に hiking なし)
  8: 'cycling', // EXERCISE_TYPE_BIKING
  9: 'cycling', // EXERCISE_TYPE_BIKING_STATIONARY
  70: 'strength', // EXERCISE_TYPE_STRENGTH_TRAINING
  82: 'strength', // EXERCISE_TYPE_WEIGHTLIFTING
  83: 'yoga', // EXERCISE_TYPE_YOGA
  53: 'yoga', // EXERCISE_TYPE_PILATES
  74: 'swimming', // EXERCISE_TYPE_SWIMMING_POOL
  75: 'swimming', // EXERCISE_TYPE_SWIMMING_OPEN_WATER
  36: 'hiit', // EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
};

/**
 * iOS HealthKit のワークアウト名をアプリ内キーに正規化
 */
export function normalizeIosWorkoutType(rawType: string | undefined | null): ExerciseTypeKey {
  if (!rawType) return 'other';
  return IOS_WORKOUT_MAP[rawType] ?? 'other';
}

/**
 * Android Health Connect の数値型をアプリ内キーに正規化
 */
export function normalizeAndroidExerciseType(rawType: number | undefined | null): ExerciseTypeKey {
  if (rawType == null) return 'other';
  return ANDROID_WORKOUT_MAP[rawType] ?? 'other';
}

export function getExerciseLabel(key: ExerciseTypeKey): string {
  return EXERCISE_TYPES.find((t) => t.key === key)?.label ?? 'スポーツ';
}
