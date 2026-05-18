/**
 * TypeScript fallback / typing entry point.
 *
 * Metro はランタイム解決時に `adapter.ios.ts` / `adapter.android.ts` /
 * `adapter.web.ts` を優先するため、この `adapter.ts` は基本的にロードされない。
 * TypeScript の型解決と、想定外プラットフォーム用の安全な no-op を兼ねる。
 */

export { healthAdapter } from './adapter.web';
