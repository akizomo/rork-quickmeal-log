/**
 * Sentry のクラッシュレポート設定。
 *
 * セットアップ手順:
 *   1. https://sentry.io でアカウント作成 (個人開発者は無料枠)
 *   2. プロジェクト「Hachibu」を React Native で作成
 *   3. ダッシュボードから DSN を取得
 *   4. 下の SENTRY_DSN を実値に置換 or 環境変数化
 *
 * DSN は公開しても問題ない値だが、レート制限を回避するため
 * GitHub にコミットする際は EAS Secrets / .env で管理することを推奨。
 */

/** Sentry の DSN (Public). 未設定時は自動で skip される。 */
export const SENTRY_DSN: string = '';

/** トレース送信サンプリング率 (0.0 - 1.0)。本番は 0.1 程度を推奨。 */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;
