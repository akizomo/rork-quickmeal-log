/**
 * Health 連動の公開 API.
 *
 * 各プラットフォームの adapter (adapter.ios.ts / adapter.android.ts /
 * adapter.web.ts) は Metro のプラットフォーム拡張子解決により自動選択される。
 * これにより iOS のネイティブモジュール (react-native-health) が Web バンドル
 * に混入することを防ぐ。
 */

import { healthAdapter } from './adapter';
import type { HealthSyncResult, HealthSyncStatus } from './types';

export type {
  HealthBodyFatSample,
  HealthDailyActivitySample,
  HealthMetricSource,
  HealthSyncResult,
  HealthSyncStatus,
  HealthWeightSample,
  HealthWorkoutSample,
} from './types';

/** 取得対象期間。`MAX_PAST_LOGGING_DAYS` (7) と一致させる */
export const HEALTH_SYNC_RANGE_DAYS = 7;

/** プラットフォームが Health 連動をサポートしているか */
export function isHealthSyncSupported(): boolean {
  return healthAdapter.isSupported();
}

/** 権限リクエスト。許可されたら true */
export function requestHealthPermissions(): Promise<boolean> {
  return healthAdapter.requestPermissions();
}

/** 直近 N 日分のデータを取得 */
export function syncFromHealth(
  rangeDays: number = HEALTH_SYNC_RANGE_DAYS
): Promise<HealthSyncResult> {
  return healthAdapter.fetch(rangeDays);
}

/** 現在の同期権限状態 */
export function getHealthSyncStatus(): Promise<HealthSyncStatus> {
  return healthAdapter.getStatus();
}
