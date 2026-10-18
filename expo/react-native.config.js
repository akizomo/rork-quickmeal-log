// React Native の autolinking 設定。
module.exports = {
  dependencies: {
    // Rork toolkit (@rork-ai/toolkit-sdk) が間接的に入れているネイティブモジュール。
    // RN 0.88 では Android 側が Kotlin のコンパイルエラーになる (1.1.0 でも未修正, 2026-10-18)。
    // アプリのコードからは使っておらず、Rork の _layout 自動ラップも metro.config.js で外しているので、
    // ネイティブのリンク対象から外す。toolkit が SDK 58 に対応したらこの除外を見直す。
    '@blazejkustra/react-native-alert': {
      platforms: { android: null, ios: null },
    },
  },
};
