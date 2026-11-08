/**
 * analytics.ts — 利用状況の送信口 (KPI計装 Layer 2)。設計は docs/ANALYTICS.md。
 *
 * - ベンダー (PostHog) への依存はこのファイルに閉じる。
 * - キー未設定・開発ビルド・利用者がオフにしている間は、何も送らない。
 * - 同意 (設定) が読み込まれるまでのイベントは短く溜め、確定後に流す / 捨てる。
 * - 食事の中身・数値・自由入力は送らない。props は型 (AnalyticsEventMap) と
 *   sanitizeProps の二重で絞る。
 */

import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

import { ANALYTICS_IN_DEV, BUILD_CHANNEL, POSTHOG_HOST, POSTHOG_KEY } from '@/constants/analytics';
import type { AnalyticsEventMap, AnalyticsEventName } from '@/types/analytics';
import { type PendingEvent, daysSince, pushPending, sanitizeProps } from '@/utils/analytics-core';

type Consent = 'unknown' | 'on' | 'off';

/** 全イベントに付く属性 (docs/ANALYTICS.md §5.6)。 */
export interface AnalyticsContext {
  firstSeenISO?: string;
  isInternal: boolean;
  subscriptionState: 'none' | 'trial' | 'active';
  locale: string;
}

let client: PostHog | null = null;
let consent: Consent = 'unknown';
let pending: PendingEvent[] = [];

/** この端末で送信が成り立つか (キーがあり、開発ビルドでないか / 開発でも明示許可)。 */
export function isAnalyticsAvailable(): boolean {
  if (!POSTHOG_KEY) return false;
  if (__DEV__ && !ANALYTICS_IN_DEV) return false;
  return true;
}

function osMajor(): string {
  const v = String(Platform.Version);
  return v.split('.')[0] || 'unknown';
}

function superProperties(ctx: AnalyticsContext): Record<string, string | number | boolean> {
  return {
    app_version: Constants.expoConfig?.version ?? 'unknown',
    build_channel: BUILD_CHANNEL,
    platform: Platform.OS,
    os_major: osMajor(),
    locale: ctx.locale,
    days_since_install: daysSince(ctx.firstSeenISO, new Date()),
    subscription_state: ctx.subscriptionState,
    is_internal: ctx.isInternal,
  };
}

function ensureClient(): PostHog | null {
  if (client) return client;
  if (!isAnalyticsAvailable()) return null;
  try {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // IP からの地域推定をさせない。画面録画・自動収集は使わない (PostHogProvider も使わない)。
      disableGeoip: true,
      enableSessionReplay: false,
      // ログインの無いアプリなので、人物プロファイルは作らない (匿名イベントのまま)。
      personProfiles: 'never',
      captureAppLifecycleEvents: true,
      persistence: 'file',
    });
  } catch (e) {
    console.log('[analytics] init failed', e);
    client = null;
  }
  return client;
}

function send(name: string, props: Record<string, string | number | boolean>): void {
  try {
    client?.capture(name, props);
  } catch (e) {
    console.log('[analytics] capture failed', e);
  }
}

/**
 * 同意と属性を反映する。設定の読み込み後と、設定の変更時に呼ぶ (何度呼んでもよい)。
 * on: クライアントを起こし、溜めたイベントを流す。off: 溜めたものを捨て、止める。
 */
export function applyAnalyticsConsent(enabled: boolean, ctx: AnalyticsContext): void {
  if (!enabled) {
    if (consent === 'on' && client) {
      // 停止の直前に 1 回だけ。流し切ってから止める。
      send('analytics_opt_out', {});
      void client.flush().finally(() => void client?.optOut());
    }
    consent = 'off';
    pending = [];
    return;
  }

  const c = ensureClient();
  if (!c) {
    // キー未設定・開発ビルド。同意だけ記録して何もしない。
    consent = 'on';
    pending = [];
    return;
  }

  const wasOff = consent === 'off';
  consent = 'on';
  try {
    if (wasOff || c.optedOut) void c.optIn();
    void c.register(superProperties(ctx));
  } catch (e) {
    console.log('[analytics] register failed', e);
  }
  const flushed = pending;
  pending = [];
  flushed.forEach((e) => send(e.name, e.props));
}

type TrackArgs<E extends AnalyticsEventName> = AnalyticsEventMap[E] extends undefined
  ? []
  : [props: AnalyticsEventMap[E]];

/** イベントを送る。呼び出し側は結果を待たない・失敗しても何も起きない。 */
export function track<E extends AnalyticsEventName>(name: E, ...args: TrackArgs<E>): void {
  if (consent === 'off') return;
  if (!isAnalyticsAvailable()) return;
  const { props, dropped } = sanitizeProps(args[0] as Record<string, unknown> | undefined);
  if (dropped.length > 0 && __DEV__) {
    console.warn(`[analytics] ${name}: dropped props`, dropped);
  }
  if (consent === 'unknown') {
    pending = pushPending(pending, { name, props });
    return;
  }
  send(name, props);
}
