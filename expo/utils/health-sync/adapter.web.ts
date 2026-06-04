import type {
  HealthDiagnostics,
  HealthSyncAdapter,
  HealthSyncResult,
  HealthSyncStatus,
} from './types';

/**
 * Web (および対応外プラットフォーム) 用の no-op adapter.
 *
 * `isSupported() === false` を返すので、UI 側は同期ボタンを非表示にする。
 */
export const healthAdapter: HealthSyncAdapter = {
  isSupported() {
    return false;
  },
  async requestPermissions() {
    return false;
  },
  async fetch(): Promise<HealthSyncResult> {
    return {
      weights: [],
      bodyFats: [],
      workouts: [],
      dailyActivities: [],
      syncedAt: new Date().toISOString(),
    };
  },
  async getStatus(): Promise<HealthSyncStatus> {
    return 'unsupported';
  },
  async getDiagnostics(): Promise<HealthDiagnostics> {
    return {
      platform: 'web',
      rawSdkStatus: null,
      sdkStatusLabel: 'n/a (web)',
      initialized: false,
      grantedPermissions: [],
      status: 'unsupported',
    };
  },
};
