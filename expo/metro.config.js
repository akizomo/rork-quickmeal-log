const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);
const rorkConfig = withRorkMetro(config);

// Rork toolkit の transformer は app/_layout.tsx に RorkDevWrapper (SDK 53/54 向け) と
// RorkAnalyticsProvider を自動で差し込む。Expo SDK 58 (RN 0.88) では RorkDevWrapper が
// 削除済みの RN 内部モジュールを読むためバンドルが失敗する (2026-10-17)。
// RorkAnalyticsProvider も EXPO_PUBLIC_PROJECT_ID / TEAM_ID が無い本アプリでは何もしないので、
// transformer だけ Expo 既定に戻し、resolver 側 (Web 向け polyfill) は Rork のものを使い続ける。
// toolkit が SDK 58 に対応したら、この上書きを外して withRorkMetro(config) に戻す。
module.exports = {
  ...rorkConfig,
  transformer: {
    ...rorkConfig.transformer,
    babelTransformerPath: config.transformer.babelTransformerPath,
  },
};
