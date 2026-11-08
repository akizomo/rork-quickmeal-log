# Analytics 設計 (KPI計装 Layer 2)

> 状態: **設計 (2026-11-06)。実装前。** D1〜D4 は 2026-11-06 に推奨どおり決定 (§9)。実装に着手した。
> 位置づけ: [ROADMAP.md](./ROADMAP.md) §3.0「KPI計装 Layer 2」の設計書。イベント一覧の正本は本書 (PRD §8.3 は本書へ向ける)。
> 起点: iOS 公開 (2026-11-04) 後、実ユーザーの行動 (どの画面を見たか・記録したか) が開発者に届かないことが分かった。届くのは RevenueCat の購入・トライアルだけ。

## 1. 目的 — 何を答えられるようにするか

N が増える前に、次の問いに数字で答えられる状態にする。

| 問い | 必要なもの |
|---|---|
| 北極星: オンボーディング完了後 24 時間以内に初回ログが付いたか (PRD §10.1) | `onboarding_completed` → `meal_logged` のファネル |
| どこで離脱したか | `onboarding_step_viewed`、`paywall_viewed` → `trial_started` |
| 続いているか (D1 / D7) | 端末ごとの匿名 ID + 起動イベント |
| 記録の入口はどこが使われているか | `meal_logged.source` (⭐️ / 検索 / My食品 / ウィジェット / 数値入力) |
| トライアルした人は何をしたか | `trial_started` と同じ匿名 ID の行動 (§9 D3) |

**測らないもの:** 食事の中身・身体の数値・自由入力の文字。理由は §3。

## 2. 現状と制約

- Layer 1 ([diagnostics.ts](../expo/utils/diagnostics.ts)) は端末内カウンタ。開発者には届かない。**Layer 2 はこの出口を足すだけで、カウンタは捨てない** (オフライン・オプトアウト時も端末内で `/dev/diagnostics` が使える)。
- Sentry はクラッシュ・速度専用。製品イベントは流さない (ROADMAP §3.0 の既定方針)。
- RevenueCat は購入・トライアル・最終起動まで。画面遷移・記録は見えない。
- 公開済みの約束: [プライバシーポリシー](../web/public/privacy.html) §1.1「食事ログ・身体情報は第三者サーバーに送信されません」/ §4「解析ツールを使用しません」。App Review メモ「all meal and body data is stored only on the device」。**この約束 (前半) は守ったまま、§4 だけを書き換える。** これが設計の最大の制約。

## 3. 原則 (イベントに載せてよいもの・いけないもの)

**載せてよい:** 「何が起きたか」の事実と、粗い区分値。画面名、入口の種別、プラン名、バージョン、端末の OS 大分類、ロケール、購読状態、導入からの日数。

**載せない (どのイベントでも):**
- 体重・体脂肪率・身長・年齢・性別・目標値・カロリー・PFC などの**数値**
- 食品名・Identity ID・My食品の名前・検索語などの**食事の中身**
- 自由入力の文字、フィードバック本文
- 端末の識別子 (IDFA / IDFV)、IP (サーバー側で保存しない設定にする)

理由: 「食事ログは端末の外に出ない」を保つため。Identity ID を時系列で並べると食事内容が復元できるので、`meal_logged` には ID を載せない。DB 拡張の判断材料 (検索の未ヒット語) は、現行どおり端末内 + 任意共有 (「名前を開発者に送る」) に留める (§9 D4)。

**強制の仕組み:** イベント名と props を TypeScript の型 (`AnalyticsEventMap`) で閉じる。型にない props は書けない。加えてテストで「禁止キー (weight / kcal / name / query / id など) を props に持つ定義がない」ことを検査する。

## 4. 送信先の選定

| | PostHog (Cloud) | Firebase Analytics | Aptabase | RevenueCat だけ |
|---|---|---|---|---|
| ユーザー単位のファネル・D7 | ✅ | ✅ | ❌ ユーザーを跨いで追わない設計 (要確認) | ❌ 購入のみ |
| 導入の重さ | JS SDK + `expo-device` / `expo-application` / `expo-file-system` (+ `expo-localization` は導入済) | ネイティブ設定ファイル (GoogleService-Info.plist 等) + config plugin。ビルド手順が増える | 軽い | 0 |
| 端末識別子 | 自前の匿名 UUID。IDFA を使わない設定にできる | 既定で広告系の ID と結びつきうる | 持たない | RC の匿名 ID |
| 自由度 (後から問いを足す) | 高い (ダッシュボード上で作れる) | 中 | 低い | なし |
| 判定 | **推奨** | 重い | D1/D7 と北極星が測れず不向き | 現状 |

PostHog の設定は「自動収集 (autocapture)・画面録画 (session replay) を使わない / IP を保存しない / 識別子を使わない」で固定する。リージョンと無料枠の現行条件は契約時に確認する (`posthog-react-native` v4 系、Expo SDK 58 / RN 0.88 での動作は実装時に Simulator で確認)。

追加は **必ず `npx expo install`**、追加後に `bun run check:deps`、`app.json` の plugins 差分を確認 (CLAUDE.md 開発環境ルール)。**Web で動いても保証にならない**ので、Simulator でネイティブ起動を 1 回通す。

## 5. イベント定義

命名は `snake_case`・過去形。props は区分値のみ。★ = 最初のリリースで必須 (北極星と離脱が測れる最小セット)。

### 5.1 ライフサイクル / 画面
| イベント | 発火 | props |
|---|---|---|
| ★ `application_installed` / `application_opened` | SDK のライフサイクル自動取得 | (SDK 標準) |
| ★ `screen_viewed` | ルート変更。**パス名からルート名だけ**を取る (クエリ・動的セグメントは捨てる) | `screen` |

### 5.2 オンボーディング / 課金 (PRD §8.3 を引き継ぐ)
| イベント | props |
|---|---|
| ★ `onboarding_step_viewed` | `step` (番号)。1 つの画面 `/onboarding` の中の段階なので `screen_viewed` では見えない |
| ★ `onboarding_completed` | — |
| ★ `trial_started` | `plan` (monthly / annual)。購入の正本は RevenueCat。トライアルを使い切った人の再購入でも出る (トライアル有無は区別しない) |
| `purchase_restored` | — |

> 当初案から外したもの: `app_intro_viewed` / `onboarding_started` / `paywall_viewed` / `weekly_recap_viewed` は、その画面を開いたこと = `screen_viewed` (`screen`: intro / onboarding / paywall / weekly-recap) で足りるため作らない。`trial_cta_tapped` は intro → onboarding の遷移で代替できる。`current_body_type_computed` / `goal_body_type_selected` / `goal_plan_confirmed` は `onboarding_step_viewed` の進み具合で代替し、体型の中身は載せない。

> 購入そのものは RevenueCat が正本。PostHog 側は「行動 → 購入」のつなぎのために `trial_started` だけ端末から送る。RevenueCat の PostHog 連携で購入イベントを流す案もあるが (現行仕様は要確認)、まずは端末発火で足りる。

### 5.3 記録 (中核)
| イベント | 発火 | props |
|---|---|---|
| ★ `meal_logged` | 食事ログが確定した 1 箇所 (app-state の確定関数) | `source`: `quick_tab` / `frequent_pinned` / `frequent_auto` / `my_food_shelf` / `search` / `my_food_page` / `widget` / `direct_input` / `barcode`、`tab` (9 ボタンのタブ区分)、`is_first` (その端末で初回か) |
| `meal_log_edited`, `meal_log_deleted` | 編集・削除 | `via` (amount_edit / swipe など) |
| `search_opened`, `direct_input_opened` | 開いた時 | — |
| `search_missed` | 諦めた確定時 (現行の `recordSearchMiss` と同じ瞬間) | `had_hints`。**検索語は載せない** |
| `my_food_saved` | My食品を新規保存 | `landed_layer1` (bool) |
| `widget_log_committed` | ウィジェット経由の確定 (drain 単位) | `count` |

### 5.4 からだ / 目標 / 振り返り
`weight_recorded`, `body_fat_recorded` (**手入力のみ**。ヘルス取り込みは数えない)、`goal_edited` (値は載せない)。`status_edited` / `exercise_logged` は見送り (必要になったら足す)。

### 5.5 許可 / 設定
`health_permission_result` (`result`: granted / denied)、`notification_permission_result`、`analytics_opt_out` (**停止の直前に 1 回だけ**送る)。

### 5.6 全イベント共通の属性 (ユーザープロパティ)
`app_version`、`build_channel` (production / testflight / dev)、`platform`、`os_major`、`locale`、`days_since_install`、`subscription_state` (none / trial / active)、**`is_internal`**。

`is_internal` は開発者自身の端末を集計から外すためのフラグ (発端の「これは自分では？」に直接効く)。`/dev/diagnostics` のスイッチで立て、PostHog 側のフィルタで除外する。TestFlight / dev ビルドは `build_channel` で自動的に分かれる。

## 6. 実装構成

| ファイル | 役割 |
|---|---|
| `constants/analytics.ts` (新規) | キー・ホスト・ビルド種別。`EXPO_PUBLIC_POSTHOG_KEY` が空なら完全 no-op (Sentry DSN と同じ流儀)。開発ビルドは既定で送らない |
| `types/analytics.ts` (新規) | `AnalyticsEventMap` (イベント名 → props の型)。ここに無い props は書けない |
| `utils/analytics-core.ts` + `.test.ts` (新規) | 純ロジック: 禁止キーの検査 (`sanitizeProps`)、画面名の生成 (クエリ・動的セグメントを捨てる)、同意が決まるまでの溜め |
| `utils/analytics.ts` (新規) | PostHog への送信口 `track()` / `applyAnalyticsConsent()`。ベンダー依存はこの 1 ファイルに閉じる。オフ・キー未設定・開発ビルドでは何もしない |
| `components/AnalyticsBridge.tsx` (新規) | 設定 → 送信口の反映、`firstSeen` の記録、`usePathname` → `screen_viewed`。`app/_layout.tsx` の `RootLayoutNav` に 1 つ置く |
| `providers/app-state-provider.tsx` | `meal_logged` を `pushLog` の 1 箇所で発火 (入口は呼び出し側が渡す)。`bumpDiagnostic` に**キー → イベントの対応表**を置き、診断カウンタと同じ瞬間に送る (計装が 2 系統に割れない)。編集・削除・体重・体脂肪・オンボ完了もここ |
| `app/paywall.tsx` / `app/onboarding.tsx` / `app/goal-edit.tsx` / `utils/health-sync/index.ts` / `utils/trial-notifications.ts` | `trial_started` / `purchase_restored`、`onboarding_step_viewed`、`goal_edited`、各許可の結果 |
| `app/settings.tsx` | 「利用状況を送る」スイッチ。**既存のトグル行を流用** (新規コンポーネントは作らない) |
| `app/dev/diagnostics` | 送信の有効/無効の表示、`is_internal` スイッチ |

## 7. 公開物の更新 (実装と同じ変更で出す)

1. [privacy.html](../web/public/privacy.html): §1 に「1.7 利用状況 (匿名)」を追加 — 何を・誰に (PostHog)・何のために送るか、**食事・身体の内容は送らない**こと、設定でいつでも止められること。§4「解析ツールを使用しません」を事実に合わせて書き換える。
2. [APP_STORE.md](./APP_STORE.md) §4-3 の栄養ラベル: 「使用状況データ > 製品の操作」(収集 / 紐付けの扱いは要判断 / トラッキング: いいえ / 目的: アナリティクス) を追加。Play のデータセーフティも同様。
3. 審査メモの「all meal and body data is stored only on the device」はそのまま真。
4. 日本の外部送信規律 (送る情報・送信先・目的の通知または公表) に該当するため、1. の記載で満たせているかを公開前に確認する。

## 8. 検証 (「動いた」の定義)

- [ ] Simulator のネイティブビルドで起動でき、PostHog のライブ画面にイベントが出る (CLAUDE.md: Web では確認にならない)
- [ ] 設定でオフにすると通信が止まる (最後に `analytics_opt_out` が 1 回出る)
- [ ] 禁止キーのテストが通る。`meal_logged` の props に食品名・数値が無い
- [ ] `bun run check:deps` が通る。`app.json` の差分を見た
- [ ] TestFlight の実機で北極星のファネルが 1 本できる
- 出荷は 1.0.2 (iOS は審査が要る。Android はクローズドテストで先に確認できる)。**1.0.1 を使っている人のデータは取れない**

## 9. 決定待ち (推奨つき)

| # | 決めること | 推奨 | 別案 |
|---|---|---|---|
| D1 | 送信先 | ✅ **PostHog に決定 (2026-11-06)**。Firebase も他アプリで使っているが、ネイティブ設定ファイルとビルド手順が増えるため、設定が楽な PostHog を選んだ | Firebase (ネイティブ設定が増える) |
| D2 | 既定 | ✅ **決定 (2026-11-06)**: **既定でオン + 設定でオフにできる + ポリシーに明記**。N が少ない時期にオフ既定だとデータがほぼ集まらない | 既定オフ (プライバシー最優先、ただし計測はほぼ空になる) |
| D3 | RevenueCat の匿名 ID との紐付け | ✅ **決定 (2026-11-06)**: **紐付けない** (別の匿名 ID。購入と行動のつなぎは `trial_started` で足りる)。栄養ラベルの「紐付け」範囲を広げない | 同じ ID を使う (トライアルした個人の行動が追えるが、購入履歴と行動が一つの ID に集まる) |
| D4 | 検索の未ヒット語 (自由入力) | ✅ **決定 (2026-11-06)**: **送らない** (端末内 + 現行の任意共有のまま)。送ると「ユーザーコンテンツ」の申告が要る | 匿名・長さ制限つきで送る (DB 拡張の判断は速くなる) |

## 10. 当初案との差分 (実装後に追記)
- **実装 2026-11-06 (コード有・Simulator での送信確認は §8)。実ユーザー検証は 1.0.2 の配布後。**
- イベントを 14 本に絞った (§5.2 の注)。画面を開いたことは `screen_viewed` 1 本に寄せた。
- `analytics_opt_out` は「オフにした瞬間」に出す。オフ中は何も送らず、オンに戻すと再開する。
- PostHog は `personProfiles: 'never'` + `disableGeoip` + 画面録画・自動収集なしで固定。**PostHog 側の Project settings で「IP を保存しない (Discard client IP data)」を ON にすること**(プライバシーポリシー 1.7 の「IP は保存しない」はこの設定が前提)。
- キーはリポジトリに置かず、EAS の環境変数 `EXPO_PUBLIC_POSTHOG_KEY` で渡す (§11)。

## 11. 配布前にやること (ユーザー作業)
1. PostHog でプロジェクト「Hachibu」を作り、Project API Key (`phc_…`) を取得。Project settings で **Discard client IP data を ON**。
2. EAS に環境変数を登録: `eas env:create --name EXPO_PUBLIC_POSTHOG_KEY --value phc_… --environment production --visibility plaintext` (preview も同様)。`eas.json` の `env` には `EXPO_PUBLIC_BUILD_CHANNEL` を入れてある。
3. PostHog のダッシュボードで `is_internal = true` を除外するフィルタを作る。自分の端末は `/dev/diagnostics` のスイッチで内部扱いにする。
4. App Store Connect の「App のプライバシー」に **使用状況データ > 製品の操作** を追加、Play Console のデータセーフティも同様 (APP_STORE.md §4-3)。
5. ポリシー (Web) は `web/public/privacy.html` を更新済み。push で Vercel に反映される。
