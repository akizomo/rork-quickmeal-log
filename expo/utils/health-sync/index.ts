/**
 * Health 連動の公開 API.
 *
 * 各プラットフォームの adapter (adapter.ios.ts / adapter.android.ts /
 * adapter.web.ts) は Metro のプラットフォーム拡張子解決により自動選択される。
 * これにより iOS のネイティブモジュール (react-native-health) が Web バンドル
 * に混入することを防ぐ。
 */

import { Linking, Platform } from 'react-native';

import { healthAdapter } from './adapter';
import type { HealthDiagnostics, HealthSyncResult, HealthSyncStatus } from './types';

/** Android Health Connect provider のパッケージ名 */
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

export type {
  HealthBodyFatSample,
  HealthDailyActivitySample,
  HealthDiagnostics,
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

/** 実機トラブルシュート用の生の状態情報 */
export function getHealthDiagnostics(): Promise<HealthDiagnostics> {
  return healthAdapter.getDiagnostics();
}

/**
 * Android: Health Connect プロバイダの Play Store ページを開く。
 * iOS / Web では何もしない。
 *
 * - market:// が解決できない端末 (Play Store 未インストール) では
 *   通常の https の Play Store URL にフォールバックする。
 */
export async function openHealthConnectInstallPage(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const marketUrl = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
  try {
    const canOpen = await Linking.canOpenURL(marketUrl);
    await Linking.openURL(canOpen ? marketUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl).catch(() => undefined);
  }
}
