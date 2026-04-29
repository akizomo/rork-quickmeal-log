import * as Sentry from '@sentry/react-native';

import { SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from '@/constants/sentry';

let initialized = false;

/** Sentry の初期化。アプリ起動時に1回だけ呼ぶ。DSN 未設定時は no-op。 */
export function initSentry(): void {
  if (initialized) return;
  if (!SENTRY_DSN) {
    console.log('[sentry] DSN not set; skipping init');
    return;
  }
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      // 本番のみ送信したい場合は __DEV__ 判定を有効化:
      // enabled: !__DEV__,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      debug: __DEV__,
    });
    initialized = true;
    console.log('[sentry] initialized');
  } catch (e) {
    console.log('[sentry] init failed', e);
  }
}

export { Sentry };
