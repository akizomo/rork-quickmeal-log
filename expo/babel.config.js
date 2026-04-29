module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      // Production: console.log / info / debug を削除。
      // error / warn は Sentry 等に残すため除外。
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
    ],
  };
};
