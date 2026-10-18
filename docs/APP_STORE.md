# App Store 掲載プラン (Hachibu iOS)

> 2026-10-16 作成。Apple Developer Program 登録完了を起点に、App Store 掲載までの作業を **あなた (手続き)** と **Claude (実装)** に分けて管理する。
> 関連: [BUILD.md](./BUILD.md) (ビルド手順) / [PLAY_STORE.md](./PLAY_STORE.md) (Android 版の掲載文言) / [privacy.tsx](../expo/app/legal/privacy.tsx)
>
> 状態は ROADMAP と同じ3層で書く: **コード有 ≠ 到達可能 (実機で動く) ≠ 実ユーザー検証済**。

---

## 0. 前提の確認結果 (2026-10-16)

| 項目 | 状態 |
|---|---|
| Bundle ID | `app.akizony.hachibu` (app.json 設定済) |
| iPad | 非対応 (`supportsTablet: false`) → iPhone スクショのみで可 |
| アカウント機能 | なし → アカウント削除要件 (5.1.1(v)) / Sign in with Apple は対象外 |
| ヘルス連携 | `utils/health-sync/adapter.ios.ts` に HealthKit 実装あり (**読み取りのみ**)。**iOS 実機では一度も動かしていない** |
| 課金 | RevenueCat の iOS キーが未設定 (`appl_REPLACE_ME`) → 現状 iOS では paywall がプラン取得失敗になる |
| Android 専用機能 | ウィジェット / Health Connect 導線 / In-App Update はすべて `Platform.OS` で分岐済、iOS では非表示 |
| ローカルの Xcode | ~~未インストール~~ → **Xcode 27.1 導入済** (2026-10-16、`xcode-select` 切替済) |

---

## 1. あなたがやる手続き

上から順に。**A は審査待ちが発生するので今日中に出すのが安全。**

### A. 契約・口座 (最優先・待ち時間あり)
- [x] App Store Connect > ビジネス で **有料 App 契約 (Paid Apps Agreement)** に同意 (2026-10-16)
- [x] 銀行口座・税務情報 (W-8BEN 等) を登録 (2026-10-16 提出完了: 口座・W-8BEN (日米条約12条 0%)・米国外ステータス証明書。**契約ステータスの「有効」待ち**) → 契約ステータスが「有効」になるまで数日。**これが有効になるまでサブスクの Sandbox 購入テストができない**
- [ ] 配信地域を決める (推奨: **まず日本のみ**。EU を含めると DSA のトレーダー申告が必要で、個人は住所が公開される)

### B. App Store Connect の初期設定
- [x] Certificates, Identifiers & Profiles で App ID `app.akizony.hachibu` を作成し **HealthKit** capability を ON (EAS が自動作成する場合もあるが、HealthKit が付いているか確認)
- [x] App Store Connect で新規 App を作成 (名前 Hachibu / プライマリ言語 日本語 / Bundle ID 上記 / SKU 任意 例 `hachibu-ios`)
- [x] 作成後に表示される **Apple ID (数字の ascAppId)** と **Team ID** を Claude に共有 → `eas.json` の submit 設定を埋める

### C. サブスクリプション
- [x] サブスクリプショングループ「Hachibu Premium」を作成
- [x] 2つのプロダクトを作成 (ID は [constants/iap.ts](../expo/constants/iap.ts) `PRODUCT_IDS.ios` と一致させる)
  - `hachibu_premium_monthly` (1か月)
  - `hachibu_premium_annual` (1年)
- [x] 価格を Android 版と揃えて設定、両方に **お試しオファー: 7日間無料** を付与
- [ ] 各プロダクトの審査用スクリーンショット (paywall の画面) と表示名を登録
- [x] App Store Connect で **App 内課金用の共有シークレット** or **In-App Purchase Key (.p8)** を発行

### D. RevenueCat
- [x] RevenueCat プロジェクトに **App Store アプリを追加** (Bundle ID 上記、C で発行したキーを登録)
- [x] 2プロダクトを取り込み、エンタイトルメント `Hachibu` と Offering `default` の monthly / annual パッケージに紐付け (2026-10-18 ユーザー申告で完了。TestFlight の paywall で価格が出ることは未確認)
- [x] 発行された **`appl_` で始まる Public SDK Key** を Claude に共有 (公開キーなのでチャットで可)

### E. ビルド環境
- [x] **Xcode をインストール** (2026-10-16 完了) (App Store から。約15GB) → 初回起動でコンポーネント追加 → ターミナルで:
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
  これでローカルの `expo run:ios` (Simulator) が動くようになる。CLAUDE.md の「ネイティブ依存はローカルネイティブ起動を1回通す」ルールの前提
- [x] 初回の EAS iOS ビルドは **対話モードで1回だけ手元実行** (2026-10-16 完了。eas-cli@25.0.0 で実行。配布証明書・プロビジョニングプロファイルは 2027-10-16 まで有効。build `07a7fc74` は Sentry アップロードで ERRORED)
- [x] **初の iOS ビルド成功** (2026-10-16、`45fe9d11-6957-4b33-a732-783993785c63`、1.0.1 (3)、Xcode 26.0 イメージ)。コード有・ビルド可、実機起動は未確認 (Apple ID ログイン → 証明書・プロビジョニングを EAS に作らせる)。2FA があるため Claude からは実行できない:
  ```bash
  cd expo && npx eas-cli@18.12.2 build --profile production --platform ios
  ```
- [ ] Sentry の dSYM アップロード用に `SENTRY_AUTH_TOKEN` を EAS に登録 (2026-10-16 確認: **Android も含め未設定**。暫定でアップロード無効化中、上記⚠️参照)

### F. テスト
- [ ] App Store Connect > ユーザーとアクセス > **Sandbox テスター** を1つ作成
- [ ] TestFlight 内部テストで実機に入れ、§3 のチェックリストを確認 (Claude が項目を用意済)
- [ ] (任意) 外部 TestFlight で数人に配布 → ベータ版審査が1回入る

### G. ストア掲載情報の入力 (文言は §4 のドラフトを貼る)
- [ ] スクリーンショット 6.9インチ (1320×2868) 最低3枚
- [ ] App のプライバシー (§4-3 の回答表)
- [ ] 年齢制限の質問票 / カテゴリ (ヘルスケア/フィットネス) / 著作権表記 / サポート URL / プライバシーポリシー URL
- [ ] バージョンページ下部の「App内課金とサブスクリプション」で 2 プロダクトにチェック (**最初のサブスクはアプリ本体と同時提出が必須**。単独では提出できない)
- [ ] 審査メモ (§4-4) を貼って **審査へ提出**

---

## 2. Claude がやる実装タスク

### ✅ 2026-10-16 完了 (コード有・Web で表示確認済・iOS 実機は未確認)
- **輸出コンプライアンス**: `app.json` に `ios.config.usesNonExemptEncryption: false` を追加 (毎ビルドの暗号化質問を省略)
- **未使用の `expo-image-picker` を削除**: コードから一切参照されていないのにネイティブモジュールとしてリンクされており、Info.plist に写真ライブラリの利用目的文が無いと App Store へのアップロード時に ITMS-90683 で弾かれるリスクがあった
- **paywall を審査ガイドライン 3.1.2 に寄せた** ([paywall.tsx](../expo/app/paywall.tsx))
  - 価格を「¥◯◯ / 月」「¥◯◯ / 年」と請求期間付きで表示
  - 自動更新の説明を「無料期間後に自動課金 → 解約まで更新 → 更新24時間前までに解約 → ストア設定から解約」まで明記
  - プラン取得失敗時に出ていた開発者向け文言「IAP プロダクトの設定を完了してください」を撤去し、「もう一度読み込む」ボタンに置き換え (審査員が見ると 2.1 の未完成扱いになり得た)
- **プライバシーポリシー更新** (アプリ内 [privacy.tsx](../expo/app/legal/privacy.tsx) と Web [privacy.html](../web/public/privacy.html) の両方)
  - 1.4 ヘルスデータ: 読み取る項目・端末内のみで使用・外部/iCloud に送らない・広告に使わない・書き込まない (HealthKit 審査 5.1.3 / 2.5.1 で必須の記述)
  - 1.5 カメラとバーコード: 画像は保存・送信しない、バーコード番号は Open Food Facts へ送信
  - 1.6 クラッシュ情報: Sentry の利用を明記 (従来「第三者解析ツールを使用しない」と書いていたが Sentry を使っており不正確だった)
  - RevenueCat の購入情報削除の問い合わせ先を追記
  - ⚠️ **Web 版は Vercel へデプロイするまで公開 URL に反映されない**
- **Pods のデプロイメントターゲット下限を引き上げる config plugin を追加** ([ios-pods-deployment-target.plugin.js](../expo/plugins/ios-pods-deployment-target.plugin.js)): Xcode 27 では Sentry / RevenueCat 等の古い podspec 宣言がビルドエラーになるため、post_install で 15.1 未満の Pod を 15.1 に揃える
- **Privacy Manifest のキー名を修正** (`app.json`): `NSPrivacyAccessedAPIReasons` → 正しい `NSPrivacyAccessedAPITypeReasons`。誤ったキーのままだと ITMS-91053 (理由未申告) の警告対象になる
- **Product ID をプラットフォーム別に整理** ([constants/iap.ts](../expo/constants/iap.ts)): iOS は `:` が使えないため `hachibu_premium_monthly` / `hachibu_premium_annual` を定義

### ⚠️ 2026-10-16 ローカル Simulator 起動で判明した問題
- `xcodebuild` (Xcode 27.1 / iOS 27.1 SDK) で Debug ビルドは **成功**。ただし起動直後に `EXC_BREAKPOINT` で即終了
- 原因: **iOS 27 SDK でビルドしたアプリは UIScene ライフサイクル必須** (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`)。RN 0.81.5 / Expo SDK 54 の AppDelegate はシーン非対応。アプリコードのバグではなくツールチェーン起因
- 対応方針 (2026-10-16 決定): **ローカル Simulator 確認は断念し、EAS → TestFlight 実機で確認する**。`eas.json` の development / preview / production すべての `ios.image` を `macos-sequoia-15.6-xcode-26.0` (EAS の `sdk-54` 実体) に固定済。将来 Apple が iOS 27 SDK を提出要件にしたら Expo SDK 更新 (シーン対応版) が必須になる
- 付随: Sentry のソースマップ/dSYM 自動アップロードが **org・project・auth token すべて未設定** のため iOS ビルドが失敗する (ローカル `xcodebuild`、EAS 初回ビルド `07a7fc74` とも)。EAS の production 環境変数は空で、Android はアップロード失敗でもビルドが止まらないため気づかれていなかった。暫定で `eas.json` の preview / production `ios.env` に `SENTRY_DISABLE_AUTO_UPLOAD=true` を設定。**クラッシュ自体は届くがスタックトレースはシンボル化されない**。正式対応 (app.json の Sentry plugin に organization/project、EAS に `SENTRY_AUTH_TOKEN` を Secret 登録し、フラグを外す) は Android と合わせて別途

### ✅ 2026-10-16 テストビルド用 paywall スキップ
- 有料 App 契約が有効になるまで Sandbox 購入ができず、TestFlight で paywall を越えられないため、既存の `__DEV__` 限定スキップボタンを **`EXPO_PUBLIC_ALLOW_PAYWALL_SKIP=true` のビルドでも表示** するよう拡張 ([constants/iap.ts](../expo/constants/iap.ts) `PAYWALL_SKIP_ENABLED`)
- `eas.json` に `testflight` プロファイル (production を extends + フラグ) を追加。`preview` にもフラグ付与。**`production` には入れていない** (eas config で確認済)
- スキップは `subscriptionStatus: 'trialing'` + `trialStartedAtISO` をローカルに立てるだけで RevenueCat には何も送らない。RC が後で 'none' を返してもダウングレードされない既存仕様のためループしない
- 状態: コード有・tsc 通過。実機未確認
- ビルド: `bunx eas-cli@25.0.0 build --profile testflight --platform ios --non-interactive` → `bunx eas-cli@25.0.0 submit --profile testflight --platform ios --latest`

### 🐛 2026-10-17 TestFlight 実機 (iOS) で見つかった不具合と対応
状態: コード有・tsc/jest 通過。**実機未確認** (次の testflight ビルドで確認)
| 症状 | 原因 | 対応 |
|---|---|---|
| 量調整ダイアログが開かない | iOS は表示中の `Modal` の**兄弟**として別の `Modal` を出せず黙って失敗する。BottomSheet と Dialog が兄弟配置だった (Android は重ねられるので未発覚) | `IdentityLogSheet` / `DishQuickEntrySheet` / `StatusCard` (確認ダイアログ2件) でダイアログを親の子として描画 = ネスト Modal |
| 検索シートがキーボードで画面上へはみ出す | BottomSheet がキーボード高さぶん translateY で全体を押し上げていた。96% 高のシートは上端が画面外へ | 下端をキーボード上端に合わせ max height を残り領域へ縮める方式に変更 (LayoutAnimation type=keyboard で同期) |
| 体重/体脂肪シートでキーボードが追従しない | `keyboardAware` 付け忘れ (status.tsx ×2, BodyStatsView ×2) | 付与 |
| イントロ1枚目のアニメが出ない | WebView が固有幅を持たず、親 `alignItems: center` で幅0に潰れていた (推定) | `containerStyle` で stretch |
| splash のロゴ・文字が大きすぎる | splash-icon.png 内の要素が画面幅77% | 0.6倍 (46%) に再生成。Android は `android/res` の別画像なので影響なし |

- 残課題 (本質対応): BottomSheet/Dialog が RN `Modal` ベースであること自体が、重ね順の脆さと Android キーボード未対応の根。**リリース前に formSheet へ移行する方針 (2026-10-17 決定)**。影響範囲と段取りは [SHEET_MIGRATION.md](./SHEET_MIGRATION.md)

### ⏳ あなたの手続き待ち
| タスク | 必要なもの |
|---|---|
| ~~`constants/iap.ts` の `REVENUECAT_API_KEY.ios` を差し替え~~ ✅ 2026-10-16 設定済 | — |
| ~~`eas.json` の `submit.production.ios` を埋める~~ ✅ 2026-10-16 ascAppId・Team ID 設定済 (appleId は未記入 → submit 時に対話入力) | — |
| ~~`expo run:ios` で Simulator 起動確認~~ → ローカルは Xcode 27 のため断念、TestFlight で代替 | E の初回 EAS ビルド |
| TestFlight で見つかった不具合の修正 | F の実機確認結果 |
| ストア用スクリーンショット作成 | Simulator (E) で撮影 or LP 素材から合成 |

### 📝 別途検討 (今回はやっていない)
- [PLAY_STORE.md](./PLAY_STORE.md) の Google Play「データセーフティ」回答にも、ヘルスデータ・Sentry の記述が反映されているか見直し (プライバシーポリシー更新に合わせて)
- **年額だけトライアルを1か月にする案** (2026-10-16 ユーザー発案、初回審査後に検討): 体の変化は7日では実感しにくく、年額選択の動機にもなる。ただし現状はトライアル日数が `TRIAL_DAYS` / `TRIAL_DURATION_DAYS` で全プラン7日固定・端末側で計時 (paywall バッジ / 終了通知 / 残り日数表示 / 利用規約2.1)。プラン別にするにはストアの introductory offer 期間を RevenueCat から読む形に改修が要る。Android 版との揃え方も同時に決める
- 英語版プライバシーポリシーの Web 公開 (現状 Web は日本語のみ。US 配信時に必要)

---

## 3. TestFlight 実機チェックリスト

- [ ] 起動 → intro → オンボーディング → paywall まで進める (splash で落ちない)
- [ ] paywall: 年額・月額が「¥◯◯ / 年」「¥◯◯ / 月」で出る / Sandbox で購入 → ホームへ / 再インストール後「購入を復元」で戻る
- [ ] トライアル終了通知の許可ダイアログが購入直後に出る
- [ ] ヘルスケア: 許可ダイアログの文言 / 歩数・アクティブエネルギー・ワークアウト・体重・体脂肪が取り込まれる / 日付をまたいだ再同期 / ホームの pull-to-refresh
- [ ] ヘルスケアの許可を「すべてオフ」にしてもクラッシュせず、手入力で使える
- [ ] バーコード: カメラ許可ダイアログ → 読み取り → Open Food Facts の結果表示
- [ ] BottomSheet + TextInput (検索 / 直接入力) でキーボードがシートを隠さない (iOS は `keyboardAware` が効く想定)
- [ ] ダークモード / Dynamic Island・ホームインジケータ周りの Safe Area
- [ ] 設定 > サブスクリプション管理が Apple のサブスク画面を開く
- [ ] ウィジェット導線・Health Connect の文言が **出ていない**
- [ ] Sentry に iOS のイベントが届き、スタックトレースがシンボル化されている

---

## 4. 掲載情報ドラフト

### 4-1. テキスト
| 項目 | 上限 | ドラフト |
|---|---|---|
| 名前 | 30字 | Hachibu |
| サブタイトル | 30字 | タップで続く、ざっくり食事記録 |
| キーワード | 100字 | 食事記録,カロリー,ダイエット,体重,体脂肪,PFC,栄養,食事管理,レコーディング,タンパク質,ヘルスケア,歩数 |
| プロモーションテキスト | 170字 | (PLAY_STORE.md §2 の短い説明を流用) |
| 説明 | 4000字 | PLAY_STORE.md §2 の詳しい説明を流用。「Health Connect」→「ヘルスケア」に置換、ウィジェットの記述は削除 |

> 文言は [VOICE.md](./VOICE.md) に沿って最終確認する。

### 4-2. URL
- プライバシーポリシー: `https://hachibu.vercel.app/privacy`
- サポート URL (必須): `https://hachibu.vercel.app/` (LP。問い合わせ先 contact@akizony.com が辿れること)

### 4-3. App のプライバシー (栄養ラベル) 回答案
Apple の定義では「端末外に送信されるもの」だけが「収集」に当たる。食事ログ・身体情報・ヘルスデータは端末内のみなので **収集に当たらない**。

| データの種類 | 収集 | ユーザーに紐付け | トラッキング | 目的 | 送信先 |
|---|:---:|:---:|:---:|---|---|
| 購入 > 購入履歴 | ✅ | いいえ | いいえ | App の機能 | RevenueCat |
| 識別子 > ユーザ ID | ✅ | いいえ | いいえ | App の機能 | RevenueCat (匿名 ID) |
| 診断 > クラッシュデータ | ✅ | いいえ | いいえ | App の機能 | Sentry |
| 診断 > パフォーマンスデータ | ✅ | いいえ | いいえ | App の機能 | Sentry (トレース) |
| ヘルスとフィットネス | ❌ | — | — | — | 端末内のみ |

> 要判断: バーコード番号の Open Food Facts 送信は個人に紐付かない商品コードのため「収集なし」とする想定。気になる場合は「その他のデータ」で申告する。

### 4-4. 審査メモ (App Review への注記)
```
Hachibu has no user accounts; all meal and body data is stored only on the device.
The app starts with a 7-day free trial subscription (auto-renewable). You can test the purchase with a Sandbox account. "Restore Purchase" is available at the bottom of the paywall.
HealthKit is used read-only (steps, active energy, workouts, weight, body fat %) to adjust the daily calorie target shown on the home screen. Health permission is optional; the app works fully with manual input.
The camera is used only to scan food barcodes.
```
