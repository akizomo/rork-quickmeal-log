/**
 * RevenueCat / IAP の設定。
 *
 * セットアップ手順:
 *   1. https://app.revenuecat.com でアカウント作成 (無料)
 *   2. プロジェクト「Hachibu」を新規作成
 *   3. iOS / Android アプリを登録 (Bundle ID: app.akizony.hachibu)
 *   4. App Store Connect / Play Console で IAP プロダクト登録 (下記 PRODUCT_IDS)
 *   5. RevenueCat でエンタイトルメント "Hachibu" を作成し、両プロダクトを紐付け
 *   6. Offering "default" を作成し、monthly / annual パッケージを紐付け
 *   7. ダッシュボードから API key を取得し、環境変数 or 直接置換
 *
 * トライアル設定:
 *   App Store Connect / Play Console の各プロダクトに「Introductory Offer = 7日間無料」を設定
 *   RevenueCat 側は自動で反映される
 */

import { Platform } from 'react-native';

/**
 * ストアに登録する Product ID (コードからは参照しない。RevenueCat の Offering 経由で解決される)。
 * - Android: Play Console の「サブスクリプション:基本プラン」形式
 * - iOS: App Store Connect は ':' を使えないため別体系。サブスクリプショングループ
 *   「Hachibu Premium」に月額・年額の2つを作り、両方に 7日間無料の Introductory Offer を付ける
 */
export const PRODUCT_IDS = {
  android: {
    monthly: 'hachibu_monthly:monthly-base',
    annual: 'hachibu_monthly:base-annual-2',
  },
  ios: {
    monthly: 'hachibu_premium_monthly',
    annual: 'hachibu_premium_annual',
  },
} as const;

/** RevenueCat のエンタイトルメント識別子 (= プレミアム機能アクセス権) */
export const ENTITLEMENT_ID = 'Hachibu';

/** RevenueCat の Offering 識別子 (デフォルト) */
export const OFFERING_ID = 'default';

/**
 * RevenueCat API key (Public SDK Key).
 * Apple/Google 別 keyが必要。Public API key (read-only) を使用。
 *
 * iOS キーは 2026-10-16 に RevenueCat へ App Store アプリを登録して発行したもの。
 */
export const REVENUECAT_API_KEY = {
  ios: 'appl_HrOfSOJfEvQfMeWfVULYLCnvzip',
  android: 'goog_EYQHJObVfiJIBsGfANhwzWKUGHS',
} as const;

export function getRevenueCatApiKey(): string {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;
}

/** トライアル日数 (UI表示用、実際のフリートライアル期間は App Store Connect 側で設定) */
export const TRIAL_DAYS = 7;

/**
 * paywall の「スキップ」ボタンを出すか。
 * 開発ビルド (__DEV__) と、eas.json で EXPO_PUBLIC_ALLOW_PAYWALL_SKIP=true を焼き込んだ
 * テスト配布ビルド (profile `testflight` / `preview`) のみ true。
 * 有料 App 契約が有効になる前は Sandbox 購入ができず paywall を越えられないため、
 * 実機確認用に用意している。**`production` プロファイルには絶対に入れない** (審査ビルドに混入させない)。
 */
export const PAYWALL_SKIP_ENABLED =
  __DEV__ || process.env.EXPO_PUBLIC_ALLOW_PAYWALL_SKIP === 'true';
