# Project Guidance

## 必読ドキュメント
- **[docs/PRD.md](./docs/PRD.md)** — プロダクトの北極星。機能・データ・UX方針・KPI・受け入れ条件を定義。
  - 実装・設計の意思決定は必ずこのPRDを参照すること
  - 議論によって変更が生じた場合は、PRDを更新してから実装する
- **[PLAN.md](./PLAN.md)** — 実装仕様の詳細メモ (計算式・選択肢・UI構成の意思決定根拠)
- **[docs/BUILD.md](./docs/BUILD.md)** — EAS Build 手順 (GitHub Actions / ローカル CLI)・トラブルシュート・リリースノート規約。**ビルドを作成する際は必ずこのドキュメントに従う。**
- **[docs/PLAY_STORE.md](./docs/PLAY_STORE.md)** — Play Console 提出時の文言・カテゴリ・連絡先テンプレート

## プロジェクト概要
体型理解 × 目標設定 × 食事クイックログ最適化アプリ。Expo Router (React Native) 実装。

## ディレクトリ
- `expo/app/` — 画面 (Expo Router)
- `expo/components/` — 共通UI
- `expo/providers/app-state-provider.tsx` — アプリ状態
- `expo/constants/onboarding.ts` — オンボーディング定数
- `expo/types/nutrition.ts` — 型定義
- `expo/utils/goals.ts` — 目標計算ロジック

## デザインシステム運用ルール（必読）
UI の実装・修正を行う際は**必ず以下の順序**で参照すること。

1. **まず `expo/design-system/` を見る**
   - `tokens/primitives/` — colors, spacing, radius, elevation, typography の数値ソース
   - `tokens/semantic/light.ts` — surface/content/border/status など意味付きトークン
   - `components/` — Card, Chip, Button, Typography 等の既成部品
   - `theme/light.ts` — `useTheme()` で取得できる全トークンのルート
   - `constants/theme.ts` の `palette` は後方互換レガシー。**新規コードでは `useTheme()` を優先**

2. **既存トークンで表現できる場合はトークンを使う**
   - 色はセマンティクストークン (`t.colors.surface.raised` 等) を優先。ハードコード hex 禁止。
   - 影は `elevation.xs / sm / md` を使う。SVG 内で影を手書きしない。
   - 角丸は `radius.xs(4) / sm(8) / md(12) / lg(16) / xl(20) / 2xl(24)`
   - フォントサイズは `fontSize.xs(11)` が最小。9px・10px はシステム外。
   - スペースは `spacing` の 4px グリッドを使う。

3. **既存コンポーネントで賄えない新パターンが必要な場合**
   - まず設計方針を確認してから実装する
   - 必ずトークン・既存コンポーネントをベースに構築する
   - 実装後は `design-system/components/` に追加してシステムを進化させる
   - **デザインシステムを一時的に迂回する独自実装は原則禁止**

4. **SVG コンポーネント（グラフ等）の特例**
   - SVG 内では `elevation`（影）が使えないため、浮き要素（ツールチップ等）は **ネイティブ View オーバーレイ** にして `elevation` トークンを適用すること
   - SVG 内の色・サイズ指定も `palette` または直接 `lightColors` から参照する

## 実装時の原則
- 体型分類: **9分類 (脂肪×筋量の2軸)** を採用する (PRD §3.2)
- 男女別SVG計18体で現在体型・目標体型を同一マトリクスで表現 (PRD §7)
- 現在体型は**自動推定**、目標体型は同じマトリクスからユーザー選択 (PRD §6.2, §6.3)
- 数値提案は Mifflin-St Jeor ベース、活動係数は内部固定 (PLAN.md §1)
- トーン: 静かな日本語ウェルネス。中立・非評価・非性的。

## 開発環境ルール
### ngrok 禁止 (Woven AUP)
- **ngrok / Expo tunnel モードは絶対に使用しない**。Woven の Acceptable Use Policy で禁止されている。
- `expo start --tunnel`, `bun run start -- --tunnel`, `bunx ngrok ...`, `@expo/ngrok` の手動起動はすべて禁止。
- 提案・実行・スクリプト追加・ドキュメント記載のいずれにおいても ngrok / tunnel モードを推奨してはならない。
- 実機確認は **LAN モード** (`bun run start` = `--lan`)、**Simulator/Emulator** (`bun run start:ios` / `start:android`)、または **Web** (`bun run start-web`) を使う。
- LAN が通らない場合の最終手段は **EAS Build internal distribution** (TestFlight / APK 配布)。tunnel に逃げない。
