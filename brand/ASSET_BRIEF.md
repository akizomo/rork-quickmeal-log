# Hachibu — Brand Asset Production Brief

このドキュメントは、Hachibu (八分) のブランドアセット (ストアスクショ / SNS / OGP / アプリ内追加イラスト) を新規制作する際の**唯一のエントリポイント**です。
制作者 (Claude / デザイナー) はこの 1 枚を読み切れば、本ドキュメントが指す参照ファイルにアクセスして制作を開始できます。

---

## 1. Brand Snapshot

| 項目 | 値 |
|---|---|
| アプリ名 | **Hachibu** (英語表記) / `八分` (日本語サブ) |
| タグライン | **Eight Tenths is Enough.** / `八分でいい。` |
| プロダクト要旨 | 体型理解 × 目標設定 × 食事クイックログ最適化アプリ (Expo Router / React Native) |
| ロゴ思想 | 3×3 ドットマトリクス → 右下セル削除 → 下中央セルを **20% 不透明度** にした「8 番目のドット」。9 セルに 80% は割り切れず、その「割り切れなさ」がブランドの主張 |
| トーン | 静かな日本語ウェルネス。**中立・非評価・非性的**。煽らず、急かさず、断定しない |
| カラー運用 | ロゴ単色 (Sumi `#1A1916` または白)。プロダクト UI は `expo/design-system` のトークンに準拠 |
| 16px 以下フォールバック | `mark_compact_*` (7 ドット版) を使用。20% の薄ドットが消えるため |

---

## 2. Source of Truth (絶対パス)

### 2.1 ブランド定義 (PDF + 既存テキスト)
1. `brand/Hachibu_BrandBook.pdf` — ブランドブック (思想・トーン・voice)
2. `brand/Hachibu_Logo_Final.pdf` — ロゴ最終仕様 (寸法・余白・カラー指定)
3. `brand/Hachibu_Direction03_Variations.pdf` — Direction 03 (Tile Matrix) のバリエーション検討
4. `brand/Hachibu_EighthDot_Solutions.pdf` — 8 番目のドット表現案 (Oboro 採用)
5. `brand/IMPLEMENTATION_PROMPT.md` — 既存のロゴ反映プロンプト (本ドキュメントと同じトーン・粒度を継承)
6. `brand/assets/README.txt` — アセット配置仕様

### 2.2 ロゴアセット
| ファイル | 用途 |
|---|---|
| `brand/assets/mark.svg` | 単色マーク (`#1A1916`) |
| `brand/assets/mark_white.svg` | 白マーク |
| `brand/assets/mark_black.png` | 1024×1024 PNG、透過 |
| `brand/assets/mark_white.png` | 1024×1024 PNG、透過、白 |
| `brand/assets/mark_compact_black.png` | 7 ドット版 (≤16px フォールバック) |
| `brand/assets/mark_compact_white.png` | 〃 白 |
| `brand/assets/lockup_horizontal.svg` | マーク + Hachibu ワードマーク (横組) |
| `brand/assets/lockup_horizontal_black.png` | 2400×800 |
| `brand/assets/lockup_horizontal_white.png` | 〃 白 |
| `brand/assets/lockup_stacked_black.png` | 1600×2240 (縦組) |
| `brand/assets/app_icons/icon.png` | iOS アプリアイコン (1024×1024) |
| `brand/assets/app_icons/adaptive-icon.png` | Android adaptive icon |
| `brand/assets/app_icons/splash-icon.png` | スプラッシュ |

### 2.3 デザインシステム
1. `expo/design-system/README.md` — DS 全体ガイド (4 層トークン、色相役割、nutrition 配色)
2. `expo/design-system/tokens/primitives/colors.ts` — 11 hue × 10 段階の色スケール
3. `expo/design-system/tokens/primitives/typography.ts` — フォント / サイズ / 行間 / letter-spacing
4. `expo/design-system/tokens/primitives/spacing.ts` / `radius.ts` / `elevation.ts` / `motion.ts`
5. `expo/design-system/tokens/semantic/light.ts` — Light テーマ実体
6. `expo/design-system/components/` — UI コンポーネント (Button / Card / Chip / Badge / BottomSheet / Typography)
7. `expo/components/Logo.tsx` — ロゴ実装 (3×3 ドット、20% 不透明度の 8 番目)

### 2.4 プロダクトコンテキスト
1. `docs/PRD.md` — プロダクト北極星 (機能・KPI・受け入れ条件・トーン)
2. `PLAN.md` — 実装仕様 (計算式・選択肢・UI 構成)
3. `docs/IA-identity-spec.md` / `docs/IA-implementation-prompt.md` — IA / アイデンティティ仕様
4. `CLAUDE.md` — プロジェクトルール (体型 9 分類、ngrok 禁止)

---

## 3. Color & Type System (制作物が DS と整合するための要点)

### 3.1 色相役割 (`expo/design-system/README.md` を抜粋)

| 色相 | 役割 | 主な色 (primitive 中段) |
|---|---|---|
| **ivory** | 紙・面・境界線 | `#FBF8F2` / `#F6F3EC` / `#EFE9DD` / `#DDD5C7` |
| **stone** | text/icon/反転面上のテキスト | `#1C1C1A` (text) / `#6E776E` (text muted) |
| **sage** | ブランド/操作/フォーカス/text link | `#B9C9B1` / `#6D8D76` / `#355E52` |
| **lavender** | 控えめなハイライト・ゴール演出 | `#B6A2D4` (accent.default) |
| **moss / amber / clay / slate** | status (success / warning / danger / info) + カロリー / トレンド |
| **rose / cinnamon / olive** | PFC macro 専用 (P / F / C)。status と hue family を分離 |

**原則** (制作物に必ず反映):
- ロゴは Sumi `#1A1916` (≒ stone[900]) または白の単色のみ
- プロダクトの「選択済み状態」「ブランド色」は **sage**。`accent.*` (lavender) は装飾ハイライト専用で「選ばれた」状態には使わない
- PFC は **rose / cinnamon / olive** で固定。画面ごとに別配色を作らない
- 反転面 (dark surface) 上のテキストは ivory の暗端ではなく `stone` 系を使用
- WCAG AA (4.5:1) を満たす: filled button 背景は sage[800] 以上の暗さ

### 3.2 タイポグラフィ
- Primary: **Plus Jakarta Sans** (Display=Bold, Heading=SemiBold, Body=Regular)
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- ワードマーク "Hachibu" は Lato Light (または同質のクリーンな light sans) を許容 (既存規定)
- サイズスケール: 11 / 13 / 15 / 17 / 20 / 24 / 28 / 34 / 44px
- 日本語コピー併記時は日英で同等の視認性を確保。`八分` は補助的に小さく配置

---

## 4. Asset Catalog

### A. ストア・配信用スクリーンショット

App Store / Google Play / TestFlight 提出用。撮影は実機サイズ (LAN モードまたは Simulator) で行い、ngrok / tunnel は使わない (Woven AUP)。

| Asset | Size | 必須 | Notes |
|---|---|---|---|
| iPhone 6.7" (16 Pro Max) | 1290×2796 | ◎ | 各画面 5–8 枚。タイトルテキストオーバーレイあり (英 + 日本語サブ) |
| iPhone 6.5" | 1242×2688 | ◎ | 同レイアウトを別解像度で書き出し |
| iPad 13" | 2064×2752 | △ | iPad 配信を行う場合のみ |
| Google Play Feature Graphic | 1024×500 | ◎ | ストア掲載用ヒーロー (ロックアップ + タグライン) |
| Google Play 携帯端末 SS | 1080×1920 以上 | ◎ | iOS と並行ラインで揃える |

**撮影対象画面 (最低 5 枚構成案)**:
1. `intro` — ヒーロー (Logo + タグライン)
2. `onboarding` 完了直後の `status` — 体型マトリクスと提案カロリー
3. `home` (Today) — Quick Log と PFC リング
4. `DishQuickEntrySheet` を開いた状態 — クイック入力 UX
5. `MonthlyStatsView` — 振り返り (週/月実績)

**コピーガイド**: 1 画面 1 メッセージ。煽らない。例:「八分でいい。」「数値より、続くこと。」

### B. SNS / OGP / プレス素材

| Asset | Size | 必須 | Notes |
|---|---|---|---|
| X / Threads ヘッダー | 1500×500 | ◎ | ロックアップ + 余白多め |
| X / Threads 投稿画像 (アナウンス) | 1200×675 | ◎ | 16:9。コピー差し替え可テンプレ化 |
| Instagram 1:1 投稿 | 1080×1080 | ◎ | 体型シルエット引用が映える |
| Instagram 4:5 投稿 | 1080×1350 | ○ | 縦長フィード用 |
| OGP (リンクシェア統一) | 1200×630 | ◎ | サイト・GitHub README・Notion 用 |
| プレスキット ZIP | — | △ | mark / lockup (各色) + アプリアイコン + ファクトシート PDF を 1 アーカイブに |

**テンプレ要件**:
- 背景は ivory[200] (`#F6F3EC`) もしくは sage[800] (`#355E52`) のいずれか
- ロックアップは余白 = ロゴ高さ × 1 を最小確保
- コピー差し替え変数: `headline` / `subline` / `cta` の 3 領域

### C. アプリ内 イラスト・アイコン variant

| Asset | Format | 必須 | Notes |
|---|---|---|---|
| 体型シルエット追加バリアント | SVG | △ | 既存 9 分類 × 2 性別 = 18 体の差替え/追加。`expo/components/BodyTypeMatrix.tsx` 参照。中立・非性的・脱フェティッシュ |
| 空状態イラスト (Today 未記録) | SVG + PNG @1x–@3x | ◎ | 「8 番目のドット」モチーフを応用。文字は含めない |
| 完了 / 祝福イラスト (記録後) | SVG + PNG @1x–@3x | ◎ | sage 系トーン。過剰演出禁止 (花火・パーティクル不可) |
| Quick Log カテゴリアイコン拡張 | SVG | △ | `expo/constants/identity/` (dishes / ingredients / addons) に新カテゴリを追加する場合のテンプレ。線画ベース、stroke 1.5–2px |
| アプリアイコン variant | 1024×1024 PNG | △ | Light / Dark / Seasonal の 3 種類想定。`brand/assets/app_icons/` がベース |

**イラスト原則**:
- 線画ベース、stroke は stone[800] (`#30352F`) または現在のテーマプライマリ
- 塗りは ivory[200/300] と sage[100/200] のみ。鮮やかな塗りは不可
- ピクト調 (Lucide / Phosphor の light variant に近い粒度) を維持
- 8 番目のドット (faded dot) は装飾要素として 20% opacity で再利用可能

---

## 5. Delivery Format

### 5.1 ファイル形式
- **写真系 (ストアスクショ / SNS テンプレ)**: PNG (sRGB)、必要に応じて Figma / PSD のソースも納品
- **ロゴ・イラスト**: SVG (curves to outline 済み) + PNG @1x/@2x/@3x (透過)
- **アプリアイコン**: PNG 1024×1024 (透過なし、矩形)
- **プレスキット ZIP**: 上記をフォルダ別に整理

### 5.2 命名規則

```
{category}_{usage}_{variant}_{size}.{ext}

例:
store_iphone67_home_1290x2796.png
social_x_announce_v1_1200x675.png
illustration_empty_today_24.svg
appicon_seasonal_winter_1024.png
```

### 5.3 配置先 (リポジトリ内)

```
brand/
└── assets/
    ├── store/                ← (新設) ストアスクショ
    │   ├── ios/
    │   └── android/
    ├── social/               ← (新設) SNS / OGP / プレス
    │   ├── x/
    │   ├── instagram/
    │   ├── ogp/
    │   └── presskit/
    └── illustrations/        ← (新設) アプリ内追加イラスト
        ├── empty/
        ├── celebration/
        └── icons/
```

> ディレクトリは納品時に作成。既存 `brand/assets/` 直下のロゴアセットは触らない。

---

## 6. Do / Don't

### Do
- DS のトークン値 (`expo/design-system/tokens/`) を必ず参照する
- 8 番目のドット (20% 不透明度) を活用したモチーフ展開を歓迎
- 日本語と英語のコピーは同等の視認性で並べる (英主・日サブ)
- 中立・静かなトーンで、達成と継続のニュアンスを優先

### Don't
- DS トークン値の改変や独自カラーの追加
- 既存ロゴアセット (`brand/assets/mark*` / `lockup_*`) の上書き
- アプリコード (`expo/`) への変更 (アセット差し替えは別タスクで実施)
- 過剰演出 (花火、紙吹雪、ネオン色、ゲーミフィケーション的演出)
- 評価的・性的・煽情的な表現 (体型イラスト含む)
- ロゴと別アクセント色を混ぜる (ロゴはモノクロのみ)
- ngrok / `expo start --tunnel` の利用 (Woven AUP)

---

## 7. 受け入れ条件

- 各カテゴリ (A / B / C) で「最低 1 アセット」を**パイロット制作**として先行納品
- パイロットが下記 4 点を満たすことをレビューで確認:
  1. DS トークン値 (色・タイポ) と一致
  2. ロゴ仕様 (8 番目のドット 20% / 16px 以下は 7 ドット版) を遵守
  3. 命名規則と配置先が本ドキュメントの指示通り
  4. 「やらないこと」リストに違反していない
- パイロット OK → 残りを横展開

---

## 8. 制作開始前の確認チェックリスト (制作者向け)

- [ ] `brand/Hachibu_BrandBook.pdf` を通読した
- [ ] `brand/assets/` 配下のロゴアセットをすべて確認した
- [ ] `expo/design-system/README.md` の「色相の役割」表を理解した
- [ ] `expo/design-system/tokens/primitives/colors.ts` で実際の HEX を控えた
- [ ] 自分が作るアセットがカテゴリ A / B / C のどれかを宣言した
- [ ] パイロット 1 点を最初に納品して合意を取る段取りを認識した
