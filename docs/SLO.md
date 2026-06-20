# SLO / パフォーマンス管理

このアプリは **ローカルファースト**（データは AsyncStorage、唯一の外部源は Health = HealthKit / Health Connect）。
そのため SLO は「API レイテンシ」ではなく、**起動の速さ・Health 同期の鮮度と信頼性・UI の滑らかさ**を指標にする。

計測は Sentry（[utils/perf.ts](../expo/utils/perf.ts)）の span として送信し、ダッシュボードで p50/p95 と成功率を集計する。
DSN 未設定時は完全 no-op なので、ローカル開発・テストでは何も送られない。

## 計測の有効化

1. [constants/sentry.ts](../expo/constants/sentry.ts) の `SENTRY_DSN` を実値に設定（EAS Secrets 推奨）。
2. `SENTRY_TRACES_SAMPLE_RATE` を本番 0.1 程度に。span（トランザクション）はこのサンプリングに従う。
3. Sentry ダッシュボードの **Performance** で下記 span 名を検索し、p95 / 失敗率のアラートを設定。

## SLO 一覧

| # | 指標 | span 名 (op) | 目標 (SLO) | アラート閾値 | 計測箇所 |
|---|------|-------------|-----------|------------|---------|
| 1 | 起動 → ハイドレート完了 (TTI) | `app.tti.hydrate` (`app.start`) | p95 < 800ms | p95 > 1.2s (5分窓) | [app-state-provider.tsx](../expo/providers/app-state-provider.tsx) |
| 2 | Health 同期 所要時間 | `health.sync` (`health.sync`) | p95 < 3s | p95 > 6s | [use-health-sync.ts](../expo/hooks/use-health-sync.ts) |
| 3 | Health 同期 成功率 | `health.sync` の status=ok 比率 | > 98% | < 95% (1h窓) | 同上 |
| 4 | pager スワイプ jank | Sentry Mobile Vitals (slow/frozen frames) | frozen < 0.1% | frozen > 0.5% | RN profiling（要 `enableNativeFramesTracking`） |

> span の attributes: `health.sync` は `range.days` と `result.{weights,bodyFats,workouts,dailyActivities}` を持つ。
> 異常な同期件数 0 が続く場合は権限剥奪・プロバイダ未インストールを疑う。

## エラーバジェット運用

- 成功率 SLO（#3）に対し、月次でエラーバジェット（許容失敗 2%）を消費管理する。
- バジェット枯渇時は新機能より Health 同期の安定化（リトライ・権限再要求 UX）を優先する。

## Health 再同期ポリシー（参考）

UI 観点の鮮度設計。詳細は [use-health-sync.ts](../expo/hooks/use-health-sync.ts)。

- **起動時**: 権限ありなら 1 回自動同期（ハイドレート完了後）。
- **foreground 復帰時**: 最終同期から **5分** 経過、または**日付が変わった**ら自動再同期。
  それ以外はスロットルでスキップ（Health クエリ負荷とバッテリーを抑制）。
- **手動**: ホームの **pull-to-refresh** と設定画面の「今すぐ同期」で即時実行（スロットル無視）。
  pull-to-refresh は Health 未連携でも常に有効で、最低限「今日」の再計算を行う。
- 最終同期時刻は `settings.lastHealthSyncAtISO` に永続化し、アンマウントを跨いでスロットル判定する。

## 「今日」の日付ロールオーバー

Health の foreground 再同期と対になる挙動。詳細は [app-state-provider.tsx](../expo/providers/app-state-provider.tsx) の `todayKey`。

- `todayKey` をリアクティブ state 化し、**foreground 復帰時**と**深夜0時タイマー**で再計算する。
- これがないと、アプリを開いたまま日跨ぎした際に「歩数は当日分に更新されたのに、画面の日付・今日の合計・トライアル残日数は前日のまま」というズレが起きる。
- pull-to-refresh / 設定の `refreshToday()` でも明示的に再計算できる（タイマー漏れの保険）。
