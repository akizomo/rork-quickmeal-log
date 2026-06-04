import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppState } from '@/providers/app-state-provider';
import {
  HEALTH_SYNC_RANGE_DAYS,
  getHealthDiagnostics,
  getHealthSyncStatus,
  isHealthSyncSupported,
  openHealthConnectInstallPage,
  requestHealthPermissions,
  syncFromHealth,
  type HealthDiagnostics,
  type HealthSyncResult,
  type HealthSyncStatus,
} from '@/utils/health-sync';

export interface UseHealthSyncReturn {
  /** プラットフォームがサポートしているか (Web では false) */
  supported: boolean;
  /** 現在の権限状態 */
  status: HealthSyncStatus;
  /** 同期中かどうか */
  syncing: boolean;
  /** 最終同期時刻 (ISO) */
  lastSyncedAt: string | null;
  /** 最後の同期エラーメッセージ */
  lastError: string | null;
  /** 手動同期を実行 */
  syncNow: () => Promise<void>;
  /** 権限リクエスト */
  requestPermissions: () => Promise<boolean>;
  /** Android: Health Connect プロバイダの Play Store ページを開く */
  openInstallPage: () => Promise<void>;
  /** 実機トラブルシュート用の生の状態情報を取得 */
  fetchDiagnostics: () => Promise<HealthDiagnostics>;
}

/**
 * Health 連動フック (Phase 1).
 *
 * 起動時 1 回の自動同期 + 手動 `syncNow()` を提供する。
 * 同期結果は **Provider の `ingestHealthSyncResult` に 1 回だけ渡す**。
 * 各サンプルを個別関数で取り込むループは stale closure バグを起こすため廃止。
 *
 * v1.7+ 安全装置:
 *   - AsyncStorage ハイドレート完了 (`isHydrating === false`) まで同期を遅延。
 *     起動直後に Health からデータが返ってきても、まだ読み出されていない
 *     既存ログを上書きしないことを保証。
 */
export function useHealthSync(): UseHealthSyncReturn {
  const { ingestHealthSyncResult, isHydrating } = useAppState();
  const [supported] = useState<boolean>(() => isHealthSyncSupported());
  const [status, setStatus] = useState<HealthSyncStatus>('unknown');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const didAutoSyncRef = useRef<boolean>(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getHealthSyncStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const performSync = useCallback(async (): Promise<HealthSyncResult | null> => {
    if (!supported) return null;
    // 🛡️ ハイドレート完了まで同期しない (起動時レースで既存ログを上書きしない)
    if (isHydrating) {
      if (__DEV__) console.log('[health-sync] skipped: provider still hydrating');
      return null;
    }
    setSyncing(true);
    setLastError(null);
    try {
      const result = await syncFromHealth(HEALTH_SYNC_RANGE_DAYS);
      // 単一トランザクションで全てを取り込む (stale closure を回避)
      ingestHealthSyncResult({
        weights: result.weights,
        bodyFats: result.bodyFats,
        workouts: result.workouts.map((w) => ({
          startedAt: w.startedAt,
          exerciseTypeKey: w.exerciseTypeKey,
          exerciseLabel: w.exerciseLabel,
          minutes: w.minutes,
          grossKcal: w.grossKcal,
          healthSyncId: w.healthSyncId,
        })),
        dailyActivities: result.dailyActivities,
        syncedAt: result.syncedAt,
      });
      setLastSyncedAt(result.syncedAt);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '同期に失敗しました';
      setLastError(message);
      if (__DEV__) console.log('[health-sync] sync error', err instanceof Error ? err.message : err);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [supported, isHydrating, ingestHealthSyncResult]);

  const syncNow = useCallback(async () => {
    await performSync();
  }, [performSync]);

  const requestPermissions = useCallback(async () => {
    if (!supported) return false;
    // 🛡️ プロバイダ未インストール/要更新の状態で requestPermission を呼ぶと
    // Play Store へ強制遷移してしまうので、事前ステータスを確認して中断する。
    const current = await getHealthSyncStatus();
    setStatus(current);
    if (current === 'provider_missing' || current === 'provider_update_required' || current === 'unsupported') {
      return false;
    }
    const granted = await requestHealthPermissions();
    setStatus(granted ? 'authorized' : 'unauthorized');
    return granted;
  }, [supported]);

  const openInstallPage = useCallback(async () => {
    await openHealthConnectInstallPage();
  }, []);

  const fetchDiagnostics = useCallback(() => getHealthDiagnostics(), []);

  useEffect(() => {
    if (!supported) return;
    if (isHydrating) return; // 🛡️ ハイドレート完了を待つ
    if (didAutoSyncRef.current) return;
    if (status !== 'authorized') return;
    didAutoSyncRef.current = true;
    performSync().catch(() => undefined);
  }, [supported, isHydrating, status, performSync]);

  return {
    supported,
    status,
    syncing,
    lastSyncedAt,
    lastError,
    syncNow,
    requestPermissions,
    openInstallPage,
    fetchDiagnostics,
  };
}
