import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAppState } from '@/providers/app-state-provider';
import { applyAnalyticsConsent, track } from '@/utils/analytics';
import { screenNameFromPathname } from '@/utils/analytics-core';

/**
 * 設定 (同意・内部端末フラグ・購読状態) を送信口へ反映し、画面遷移を `screen_viewed` として送る。
 * 画面は持たない。AppStateProvider の内側に 1 つだけ置く。設計は docs/ANALYTICS.md。
 */
export function AnalyticsBridge() {
  const { settings, isHydrating, updateSettingsValues } = useAppState();
  const pathname = usePathname();

  const enabled = settings.analyticsEnabled !== false;
  const isInternal = settings.analyticsInternal === true;
  const status = settings.subscriptionStatus;
  const subscriptionState = status === 'active' ? 'active' : status === 'trialing' ? 'trial' : 'none';
  const locale = settings.uiLanguage ?? 'ja';
  const firstSeenISO = settings.analyticsFirstSeenISO;

  // 同意・属性の反映。設定の読み込みが終わってから (それまでのイベントは短く溜まる)。
  useEffect(() => {
    if (isHydrating) return;
    applyAnalyticsConsent(enabled, { firstSeenISO, isInternal, subscriptionState, locale });
  }, [isHydrating, enabled, firstSeenISO, isInternal, subscriptionState, locale]);

  // 送信を始めた日 (days_since_install の起点)。一度だけ端末内に残す。
  useEffect(() => {
    if (isHydrating || !enabled || firstSeenISO) return;
    updateSettingsValues({ analyticsFirstSeenISO: new Date().toISOString() });
  }, [isHydrating, enabled, firstSeenISO, updateSettingsValues]);

  // 画面遷移。同じ画面の連続は 1 回に畳む。
  const lastScreen = useRef<string | null>(null);
  useEffect(() => {
    const screen = screenNameFromPathname(pathname);
    if (!screen || screen === lastScreen.current) return;
    lastScreen.current = screen;
    track('screen_viewed', { screen });
  }, [pathname]);

  return null;
}
