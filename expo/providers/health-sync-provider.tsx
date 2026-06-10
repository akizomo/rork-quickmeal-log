import React, { createContext, useContext } from 'react';

import { useHealthSync, type UseHealthSyncReturn } from '@/hooks/use-health-sync';

/**
 * Health 同期を **アプリ全体で 1 インスタンス** に集約する context。
 *
 * 背景: `useHealthSync` は AppState の foreground リスナーと起動時自動同期を
 * 内部に持つ。画面ごとに直接フックを呼ぶと、複数のリスナー/自動同期が並走して
 * 同期が重複する。そこで `_layout` で本 provider を 1 回だけ mount し、
 * 各画面 (status / health-connect / home pull-to-refresh) は context を参照する。
 */
const HealthSyncContext = createContext<UseHealthSyncReturn | null>(null);

export function HealthSyncProvider({ children }: { children: React.ReactNode }) {
  const value = useHealthSync();
  return <HealthSyncContext.Provider value={value}>{children}</HealthSyncContext.Provider>;
}

export function useHealthSyncContext(): UseHealthSyncReturn {
  const ctx = useContext(HealthSyncContext);
  if (!ctx) {
    throw new Error('useHealthSyncContext must be used within <HealthSyncProvider>');
  }
  return ctx;
}
