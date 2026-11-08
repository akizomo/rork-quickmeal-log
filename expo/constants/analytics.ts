/**
 * 利用状況の分析 (KPI計装 Layer 2) の設定。設計は docs/ANALYTICS.md。
 *
 * セットアップ手順:
 *   1. https://posthog.com でアカウント作成 → プロジェクト「Hachibu」を作る
 *   2. Project API Key (phc_...) を取得 (クライアント用の公開キー。秘密ではない)
 *   3. eas.json の各プロファイル env と、ローカルの Metro 起動時の環境変数に
 *      EXPO_PUBLIC_POSTHOG_KEY を渡す
 *   4. Project settings で「IP を保存しない (Discard client IP data)」を ON にする
 *
 * キー未設定なら完全に何もしない (Sentry の DSN と同じ流儀)。
 */

/** PostHog の Project API Key。未設定 (空文字) のときは送信しない。 */
export const POSTHOG_KEY: string = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

/**
 * PostHog のホスト。日本のユーザー中心だが、無料枠・安定性で US を既定にする。
 * EU に変えるなら 'https://eu.i.posthog.com'。
 */
export const POSTHOG_HOST: string = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/**
 * 開発ビルド (__DEV__) は既定で送らない。Simulator で送信を確かめるときだけ
 * EXPO_PUBLIC_ANALYTICS_IN_DEV=1 を付けて Metro を起動する。
 */
export const ANALYTICS_IN_DEV: boolean = process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV === '1';

/** ビルド種別 (eas.json の env で焼き込む)。未指定は production 扱い。 */
export const BUILD_CHANNEL: string = __DEV__ ? 'dev' : (process.env.EXPO_PUBLIC_BUILD_CHANNEL ?? 'production');
