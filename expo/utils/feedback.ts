/**
 * フィードバック導線 (PRD §6.8) の純ロジック。
 *
 * 送るのは**ユーザーが自分で書いた文**だけ。アプリから自動で添えるものは無く、バージョンも聞かない
 * (項目が増えると回答率が下がるため)。食事の記録・プロフィールは含めない。
 */

export const ANDROID_PACKAGE = 'app.akizony.hachibu';

/**
 * 不具合・要望のフォーム (Notion フォーム、匿名)。回答は非公開の FB Inbox に直接入る (docs/FEEDBACK_OPS.md §4.2)。
 * メール (mailto:) 版は送り主のアドレスが届くため採らなかった (af6905f → a833444)。
 */
export const FEEDBACK_FORM_URL = 'https://rapid-wandflower-a4c.notion.site/4a8ebc27ce8849a6a88b18ae9bb45523';

/** Play ストアのアプリページ。ストアアプリ → ブラウザの順に試す。 */
export const PLAY_STORE_URLS = [
  `market://details?id=${ANDROID_PACKAGE}`,
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
] as const;
