/**
 * RevenueCat / IAP の設定。
 *
 * セットアップ手順:
 *   1. https://app.revenuecat.com でアカウント作成 (無料)
 *   2. プロジェクト「Hachibu」を新規作成
 *   3. iOS / Android アプリを登録 (Bundle ID: app.akihiro.hachibu)
 *   4. App Store Connect / Play Console で IAP プロダクト登録 (下記 PRODUCT_IDS)
 *   5. RevenueCat でエンタイトルメント "premium" を作成し、両プロダクトを紐付け
 *   6. Offering "default" を作成し、monthly / annual パッケージを紐付け
 *   7. ダッシュボードから API key を取得し、環境変数 or 直接置換
 *
 * トライアル設定:
 *   App Store Connect / Play Console の各プロダクトに「Introductory Offer = 7日間無料」を設定
 *   RevenueCat 側は自動で反映される
 */

import { Platform } from 'react-native';

/** App Store Connect / Play Console で登録する Product ID */
export const PRODUCT_IDS = {
  monthly: 'hachibu_premium_monthly',
  annual: 'hachibu_premium_annual',
} as const;

/** RevenueCat のエンタイトルメント識別子 (= プレミアム機能アクセス権) */
export const ENTITLEMENT_ID = 'premium';

/** RevenueCat の Offering 識別子 (デフォルト) */
export const OFFERING_ID = 'default';

/**
 * RevenueCat API key (Public SDK Key).
 * Apple/Google 別 keyが必要。Public API key (read-only) を使用。
 *
 * TODO: 取得後にここを置換するか、環境変数化する
 */
export const REVENUECAT_API_KEY = {
  ios: 'appl_REPLACE_ME',
  android: 'goog_REPLACE_ME',
} as const;

export function getRevenueCatApiKey(): string {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;
}

/** トライアル日数 (UI表示用、実際のフリートライアル期間は App Store Connect 側で設定) */
export const TRIAL_DAYS = 7;
