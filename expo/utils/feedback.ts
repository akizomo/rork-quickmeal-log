/**
 * フィードバック導線 (PRD §6.8) の純ロジック。
 *
 * 送るのは**ユーザーが自分で書いた文**と、調査に要る最小の環境情報 (アプリのバージョン・OS) だけ。
 * 食事の記録・プロフィールは含めない。
 */

export const FEEDBACK_EMAIL = 'contact@akizony.com';
export const ANDROID_PACKAGE = 'app.akizony.hachibu';

export type FeedbackEnv = {
  appVersion: string;
  buildNumber: string;
  os: string;
  osVersion: string | number;
};

/**
 * 不具合・要望のメール (mailto:)。件名と、本文の末尾に環境情報を入れておく。
 * 本文の先頭は空けておき、ユーザーがそのまま書き始められるようにする。
 */
export function buildFeedbackMailto(subject: string, env: FeedbackEnv): string {
  const footer = `\n\n\n---\nHachibu ${env.appVersion} (${env.buildNumber}) / ${env.os} ${env.osVersion}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(footer)}`;
}

/** Play ストアのアプリページ。ストアアプリ → ブラウザの順に試す。 */
export const PLAY_STORE_URLS = [
  `market://details?id=${ANDROID_PACKAGE}`,
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
] as const;
