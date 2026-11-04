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
- [x] 銀行口座・税務情報 (W-8BEN 等) を登録 (2026-10-16 提出完了: 口座・W-8BEN (日米条約12条 0%)・米国外ステータス証明書。**契約ステータスは「有効」になった (2026-10-18 ユーザー申告)**) → Sandbox 購入テストが可能になった
- [x] 配信地域を決める (推奨: **まず日本のみ**。EU を含めると DSA のトレーダー申告が必要で、個人は住所が公開される) — 2026-10-27 の提出時に設定 (日本のみで案内。実際の設定は App Store Connect で要確認)

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
- [x] 各プロダクトの審査用スクリーンショット (paywall の画面) と表示名を登録 (2026-10-27。**暫定で 10-18 の古い実機画像 (英語・ドル建て) を使った**。日本語・円建ての実機画像への差し替えは次の版か、審査で聞かれたときに)
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
- [x] スクリーンショット 6.9インチ (1320×2868) 3枚 + 6.1/6.3インチ (1206×2622) 3枚 (2026-10-27)。**6.1/6.3インチの欄も必須だった** (提出時に「Dynamic Island (medium) のスクショが必要」と出る)。アルファを含めない (JPEG 書き出し)。素材は [store-assets/ios/ja/](./store-assets/ios/ja/) の生スクショ + 合成画像
- [x] App のプライバシー (§4-3 の回答表。**購入履歴・ユーザーIDは「ユーザーに紐付く」= はい**に訂正して入力。ほか Crash / Performance / Other Diagnostic Data、Product Interaction は Sentry のパンくず次第で追加)
- [x] 年齢制限の質問票 / カテゴリ (ヘルスケア/フィットネス) / 著作権表記 / サポート URL / プライバシーポリシー URL / Content Rights (第三者コンテンツ = はい)
- [x] サブスクを審査提出に追加 (**最初のサブスクはアプリ本体と同時提出が必須**。今の App Store Connect は、バージョンページではなく「Draft Submission」に、サブスクグループとは別に**各商品を「Add for Review」で追加する**)
- [x] 審査メモ (§4-4) を貼って **審査へ提出** — **2026-10-27 提出** (iOS 1.0.1 ビルド 11)。審査メモからは「カメラ」の1行を除いた (§6 参照)

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

### 🐛 2026-10-18 アップロード検証で ITMS-90683 (Build 5 が弾かれた)
- **症状**: `NSHealthUpdateUsageDescription` が Info.plist に無い、というメールが届いた (Build 5)。
- **原因**: `app.json` の `@kingstinct/react-native-healthkit` プラグインで `"NSHealthUpdateUsageDescription": false` にしていた。アプリは **読み取りのみ**でも、HealthKit ライブラリが書き込み系 API を参照しているため、**書き込みをしなくても説明文は必須**。(SDK 58 移行時に「書き込まないので不要」と判断したのが誤り)
- **対応**: 説明文を入れた (「ヘルスケアのデータを読み取って使うだけで、書き込むことはありません」)。書き込み権限の要求は出さないので、許可ダイアログには影響しない。
- **再発防止**: HealthKit 周りの Info.plist キーは **`false` で消さない**。ネイティブ依存を触ったら、ビルド前に `npx expo config --type introspect | grep NSHealth` で両方のキーが入っていることを確認する。
- 注意: Info.plist には location / microphone / motion の既定文言も入っている (`expo-location` / `expo-camera` 由来)。アプリは位置情報・マイクを使っていないので、不要なら該当モジュールの除去を検討 (審査で用途を聞かれ得る)。

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
| 購入 > 購入履歴 | ✅ | **はい** (2026-10-27 訂正。匿名 ID が端末に残り購入履歴と結びつくため、Apple の定義では「紐付く」側) | いいえ | App の機能 | RevenueCat |
| 識別子 > ユーザ ID | ✅ | **はい** (同上) | いいえ | App の機能 | RevenueCat (匿名 ID) |
| 診断 > クラッシュデータ | ✅ | いいえ | いいえ | App の機能 | Sentry |
| 診断 > パフォーマンスデータ | ✅ | いいえ | いいえ | App の機能 | Sentry (トレース) |
| ヘルスとフィットネス | ❌ | — | — | — | 端末内のみ |

> 要判断: 設定 > フィードバックの「不具合・要望を送る」は、アプリ内ブラウザで Notion の匿名フォームを開く (PRD v1.16 §6.8)。ユーザーが自分で書いた文 (と任意のスクリーンショット) が端末外に出るが、アプリが自動で送るものではなく、名前・メールアドレス・識別子も届かない。申告しない想定だが、気になる場合は「ユーザコンテンツ > その他のユーザコンテンツ」(紐付けなし・App の機能) で申告する。ポリシー本文は変えない。
>
> 要判断: バーコード番号の Open Food Facts 送信は個人に紐付かない商品コードのため「収集なし」とする想定。気になる場合は「その他のデータ」で申告する。
>
> **2026-10-27 追記**: バーコード画面 ([barcode-log.tsx](../expo/app/barcode-log.tsx)) は**どこからも到達できない** (導線なし。「コード有 ≠ 到達可能」)。今回の審査には出ていない機能なので、Open Food Facts への送信は実際には起きない。公開するときに、導線・出典表示・本節の見直しを一緒にやる (§6)。

### 4-4. 審査メモ (App Review への注記)
```
Hachibu has no user accounts; all meal and body data is stored only on the device.
The app starts with a 7-day free trial subscription (auto-renewable). You can test the purchase with a Sandbox account. "Restore Purchase" is available at the bottom of the paywall.
HealthKit is used read-only (steps, active energy, workouts, weight, body fat %) to adjust the daily calorie target shown on the home screen. Health permission is optional; the app works fully with manual input.
The sources for all calorie and nutrition calculations are listed in Settings > Info > Calculations & Sources (also linked below the daily goal on the Status screen).
```

> 2026-10-27: 元の文面にあった「The camera is used only to scan food barcodes.」は、バーコード画面に導線が無く今のビルドで使われないため、審査メモから外した。カメラの許可の説明文 (`expo-camera`) だけ Info.plist に残っている。聞かれたら「バーコード機能用で、今のバージョンでは未公開」と答える。

---

## 5. SDK 58 更新の動作確認メモ (2026-10-18, sdk-58-upgrade ブランチ)

| 項目 | 結果 |
|---|---|
| Android (Android 17 エミュレータ) 起動・オンボーディング・paywall スキップ・ホーム表示 | ○ |
| ウィジェット5種が OS に登録される | ○ |
| ウィジェット (2×2) をホーム画面に追加 → 表示 → ボタンをタップして記録 (「✓ Undo」に切り替わる) | ○ (他のサイズ 4×2 / 3×3 / リング / 4×3 は未確認。追加は設定 > 「Add Home Screen Widget」、置かれるのは追加先のページで 1 ページ目とは限らない) |
| Health Connect の許可画面 → 許可 → 画面遷移 | ○ (読み取り権限3件) |
| Health Connect の歩数集計 | ○ エラーなし |
| Health Connect のアクティブカロリー集計 | ✗ `IllegalArgumentException: Either use TimeRangeFilter with LocalDateTime or AggregateGroupByDurationRequest`。歩数と同じ呼び出し形式のため Android 17 エミュレータの挙動の可能性が高い。**SDK 54 でも出るかは未確認** (切り分けには実機か旧ビルドが必要) |
| Health Connect の実データ取り込み | 未確認 (エミュレータにデータを入れる手段が無い) |
| リリースビルド (R8 有効) の起動 | 未確認 |

---

## 6. 提出記録と、承認後のやること

### 6-1. 提出記録 (2026-10-27)
- **提出**: iOS 1.0.1 (ビルド 11)。審査待ち。状態は ROADMAP と同じ3層で、**コード有・提出済・審査結果は未確認 / 実機 (TestFlight) での購入確認は未実施**
- **掲載情報**: 日本語のみ。価格は無料 (サブスクで課金: 月額 ¥480 / 年額 ¥4,800、7日間無料)。配信は日本のみ (想定)。**2026-11-02 に月額 ¥300 / 年額 ¥3,000 への値下げを決めた (PRD v1.21)。提出した版の価格と説明文は ¥480 / ¥4,800 のままで、公開前に価格を変える (§6-2 の 0)**
- **提出時に分かったこと** (次回以降の手順に効く)
  - 6.1/6.3インチの欄にもスクショが必須 (6.9インチだけでは「Dynamic Island (medium)」エラー)。1320×2868 を 1206×2622 に縮めても縦横比はほぼ同じ
  - スクショは**アルファチャンネルを含めない** (JPEG 書き出しが手軽)。1080×1920 (Android 用) は「File dimensions are invalid」で弾かれる
  - 最初のサブスクは、バージョンページではなく **Draft Submission で各商品を「Add for Review」** する。グループだけでは「New subscription groups must be submitted with an auto-renewable subscription」で止まる。商品ごとに**審査用スクリーンショット**が必要
  - 年齢制限は、お酒の項目 (alcohol) があるので「お酒・たばこ・薬物への言及」は Infrequent が忠実
- **提出に含まれた意図外の項目**: Draft Submission に Custom Product Page「default」と App Screenshot 単体が入っていた (意図して作ったものか未確認)
- **既知の未解決** (審査には出したまま): 週次ふり返りの進捗バーが見出しに重なる不具合の修正 (`baa50ab`、ブランチ `claude/practical-albattani-e8d02d`) は **main に未統合 = ビルド 11 には入っていない**

### 6-1b. リジェクトと対応 (2026-10-29 審査 → 10-31 修正)
審査端末は iPad Air 11インチ (M3)、対象はビルド 11。指摘は2件。

| ガイドライン | 指摘 | 対応 |
|---|---|---|
| **5.1.1(iv)** 許可の誘導 | ヘルス連携の説明画面 ([health-connect.tsx](../expo/app/health-connect.tsx)) のボタンが「連携する」で、「あとで」で許可ダイアログを出さずに閉じられた | iOS では「あとで」を出さず、ボタンを「続ける / Continue」にした。説明画面からは必ず OS の許可ダイアログへ進み、許すかどうかは OS 側で選ぶ。拒否してもホームへ進む。見出しも問いかけ (「連携しますか？」) をやめた。Android は Health Connect 未インストール時の抜け道が要るので「あとで」を残す |
| **1.4.1** 健康情報の出典 | 目標カロリーなどの計算に出典が無い | 「計算の根拠と出典」ページ ([sources.tsx](../expo/app/sources.tsx)、データは [calculation-sources.ts](../expo/constants/calculation-sources.ts)) を新設。式の説明 + 論文・公的資料へのリンク (DOI / 厚労省 / FAO / WHO / 文科省 / USDA) + 医療上の助言ではない旨。**導線は5か所**: 設定 > 情報 / ステータスの目標カード直下 / 目標の変更 / オンボーディングのペース選択と提案画面 |

- 状態: **コード有・到達可能 (Web で表示とリンクを確認)・実機未確認**。**2026-11-02 時点で再提出済・審査中** (再提出日とビルド番号は未記録)。iOS の許可ダイアログへの遷移は Simulator / TestFlight で確認する
- 2026-10-31 出典の再点検 (コードの式とページの記述・文献の中身を1件ずつ照合、DOI は Crossref で書誌一致を確認):
  - 減量・増量ペースの出典を ACSM (Donnelly 2009: 運動介入の話でペースの根拠ではない) から Helms 2014 (減量 0.5〜1%/週) と Iraki 2019 (増量 0.25〜0.5%/週) に差し替え。アプリの範囲 (減量 0.25〜0.75% / 増量 0.125〜0.375%) は両者の範囲かそれより穏やか
  - 7,700kcal/kg は目安である旨と Hall 2008 を追加
  - 活動係数 1.2〜1.725 は FAO/WHO/UNU の PAL 値そのものではない (FAO の座位中心は 1.40〜1.69)。一次出典が見つからない慣用値なので、「考え方は PAL にもとづく・値は広く使われている目安」と書き、運動は別に足す設計であることも明記
  - 歩数換算 0.0005 kcal/歩/kg の根拠を追加: 1分100歩 ≒ 3METs (Tudor-Locke 2019) → 3 kcal/kg/時 ÷ 6000歩 = 0.0005
  - 脂質の下限 0.6 g/kg は出典が無いので「アプリ独自の下限」と明記
  - 体脂肪率の見込み (減量の75%・増量の30%が脂肪) と9分類・注意しきい値が出典ページに無かったので「体脂肪率の見込み」節を追加 (Forbes 2000 / Gallagher 2000)。値はアプリの目安と明記
  - 食品: 成分表と照合済みは JP の約31% (MACRO_SOURCES.md) なので、「成分表をもとに」をやめ「主な食品を成分表・USDA・チェーン公式と照合」に修正
- 2026-10-31 再点検 (2回目。アプリ内で健康の数値を出す関数を `utils/goals.ts` から全部洗い出し、出典↔コードを双方向に照合):
  - **運動の MET を 2024 Adult Compendium に更新**: ランニング 7.0→7.5 (12020) / ヨガ 2.5→2.3 (02150) / HIIT 8.0→7.0 (02210)。ほかの4種目は 2011 版と同値。旧値は 2011 版 (国立健康・栄養研究所の日本語版で確認) と一致していた。記録済みログの kcal は保存時の値のまま
  - Mifflin の係数 (9.99/6.25/−4.92, 男+5・女−161) は原著の抄録と一致。食事誘発性熱産生 10% は Westerterp の 5〜15% の範囲内。ISSN のたんぱく質は運動する人 1.4〜2.0、減量中 2.3〜3.1 g/kg (アプリは 1.2〜2.3)
  - 体脂肪率のしきい値 (必須脂肪 5/13%・肥満 25/32%) は Gallagher ではなく ACE の区分が根拠だったので ACE を追加 (公式サイトで表は確認できず、書籍として掲載)。13%/5% 未満は保存不可である旨も記載
  - 出典ページに無かった計算を追記: BMI 17.5 未満は保存不可 (アプリの安全線)・週の収支調整の下限 1,000kcal・運動で増えた分は炭水化物に足す・引き締め時の体脂肪 −0.5pt/月・体型推定の体脂肪率でも Katch-McArdle を使うこと・目標への上乗せの実際の式 (ヘルス/歩数ぶんの上限 800kcal、記録した運動は上限なし)
  - コードのコメントに残っていた「ACSM / ISSN」などの出典表記を、実際の出典 (Helms / Iraki / calculation-sources.ts) に直した
  - 使っていない出典はなし (全件がいずれかの式・しきい値に対応)。逆に Forbes は「脂肪の割合はもとの体脂肪率で変わる」という考え方の出典で、75% / 30% という値そのものはアプリの仮定 (Forbes の式では体脂肪の少ない人ほど脂肪の割合は小さい)。→ **同日、Forbes の式に置き換えた** (PRD v1.20 §6.4.1。下記)
  - 出典ページの対象外としたもの: 週次ふり返りの「高密度食材」判定 (たんぱく質25%/脂質35%/炭水化物45%、未検証の暫定値) と実績グラフの色分け (110%/130%)。どちらも記録の振り分けで、健康上の推奨ではない。`calcTDEE` (係数1.11/1.12)・`estimateTargetWeight` など未使用の関数が残っている
- 2026-10-31 **目標体脂肪率の見込みを Forbes の式に変更** (PRD v1.20): 一律の「減量75%・増量30%が脂肪」をやめ、除脂肪量の割合 = 10.4 / (10.4 + 脂肪量kg) を積分した式を、目標体重について解く (`projectFatMassAtWeight`)。出典に Hall 2007 を追加。例: 70kg・18% の標準ペース減量 (3か月で −4.6kg) は 14% → 16%、80kg・25% → 70kg は 18% → 20%。増量は筋トレ込みの楽観的な値をやめたので、見込みの体脂肪率が以前より高く出る
- 式や係数 (`utils/goals.ts`) を変えたら、`calculation-sources.ts` と `locales/*.json` の `sources.sections.*` も同じ変更で直す
- 審査への返信文 (Resolution Center、英語):

```
Thank you for the review. We have addressed both issues in the new build.

Guideline 5.1.1(iv): The screen shown before the HealthKit permission request no longer has a "Later" button, and its button now reads "Continue". Tapping it always proceeds to the system permission request, where the user decides. The app works fully if permission is denied.

Guideline 1.4.1: We added a "Calculations & Sources" page that explains each calculation (resting metabolic rate, daily energy expenditure, calorie target, macros, exercise calories, BMI range, food nutrition data) with links to the original sources (peer-reviewed papers via DOI, FAO/WHO, the Japanese Ministry of Health, Labour and Welfare, MEXT, and USDA). It can be opened from Settings > Info, directly below the daily goal card on the Status screen, on the Edit Goal screen, and on the pace and plan screens at the end of onboarding.
```

### 6-2. 承認後にやること
> **2026-11-04 承認 → ビルド 15 で公開した (2026-11-04 10:13 JST、iTunes Lookup で確認。ストア URL `https://apps.apple.com/jp/app/hachibu/id6823520048`)。** 承認されたのはビルド 15 (`91deaa5`、10-31)。公開方法は「手動で公開」。ビルド 16 (`098309e`、11-02) には週次ふり返りの作り直し・My食品の記録編集で%調整・検索から記録後の戻り1回・多め/少なめ判定 20%・Android の価格直書きの撤去が入っているが、iOS で急ぐ修正は無く、ふり返りの作り直しが大きいため実機未確認のまま出さない。15 の iOS 画面に価格の直書きは無い (ペイウォールはストアの価格を表示)。**16 もバージョンは 1.0.1 なので、15 を公開したら使えない**。16 の内容と `baa50ab` (進捗バーの重なり。15・16 とも未収録) は 1.0.2 として作り直し、TestFlight で確認してから審査に出す (§6-3)

0. ~~**公開する前に価格を月額 ¥300 / 年額 ¥3,000 に変える**~~ → **2026-11-02 審査中に変更済**。公開前に Sandbox でペイウォールが ¥300 / ¥3,000 になっているかだけ確認する。以下は当初の手順: (PRD v1.21。審査は ¥480 / ¥4,800 のまま出している)。価格の変更は審査なしで反映される。公開の方法を「手動で公開」にできていれば、承認 → 価格変更 → 公開の順にする。自動公開だった場合は公開後すぐに変える (値下げは既存の購読者にも自動で適用される)。説明文の価格は審査中のバージョンでは直せないので、次の版で直す
1. **App Store の URL を確認する**: `https://apps.apple.com/jp/app/id6823520048` (App Store Connect のアプリ ID。公開後に開けるか確認)
2. **LP (Web) を更新する** — 今は「iPhone 版は準備中」として作ってある ([web/public/index.html](../web/public/index.html))
   - **2026-11-04 書き換え・デプロイ済 (`5763b3c`。push で Vercel に自動反映、本番でバッジ表示を確認)**: 冒頭/末尾 CTA = App Store バッジ (主) + 「Android をお使いなら / クローズドテストに参加」(従)。ヘッダーのボタンは「はじめる」(#start へ)。ヒーロー上の小さな文・meta/OG・末尾の文と箇条書き (7日間無料・期間内の解約で無料・Android のテストは無料) を更新。通知登録モーダル・JS・専用 CSS を撤去
   - **バッジ**: Apple 公式の素材 ZIP (Download-on-the-App-Store) から JP / US-UK の黒の SVG を `web/public/lp/app-store-badge-ja.svg` / `app-store-badge-en.svg` として同梱 (2026-11-04)。直リンクにしなかったのは外部サーバー依存と訪問者の IP が Apple に渡るのを避けるため
   - デプロイは **iOS を公開 → `https://apps.apple.com/jp/app/id6823520048` が開けるのを確認 → Vercel** の順
   - 以下は当初のメモ:
   - 「iPhone をお使いなら / On iPhone?」の通知登録ボタン (data-cta="ios-notify"、**2か所**: 冒頭 CTA と末尾 CTA) → **App Store のバッジ + 上記 URL へのリンク**に置き換える (バッジは Apple 公式の「App Store からダウンロード」を使う。自作しない)
   - 「iPhone の方は、準備が整い次第お知らせします / iPhone version coming soon」の文 (JA/EN 両方) を書き換える
   - iOS 通知メーリングリストのモーダル (formsubmit.co、`id="form-subject"` 周辺) とその JS (`formSubject` / `data-cta="ios-notify"` のイベント) は**撤去**する
   - `lp/` のデモ動画・画像は Android 画面のまま。差し替えは任意 (store-assets/ios/ja の画像が使える)
   - 変更後は Vercel へデプロイ (Web は自動では反映されない)
3. **通知登録者に1通だけ送る**: LP の登録フォームは formsubmit.co 経由で `contact@akizony.com` に届いている。公開したら、**登録者に「iOS 版を公開した」と1通だけ送る** (LP に「ローンチ時の1通のみ」と約束している。2通目は送らない)
4. **審査用の素材を整える** (任意): paywall の審査用スクショを日本語・円建ての実機画像に差し替える
5. **公開後すぐ**: App Store の本番版を入れて、起動 → オンボーディング → paywall の表示 (円の価格) とヘルスケアの許可を確認する。本番の購入は実際に課金されるので、購入と復元の確認は TestFlight (Sandbox) で済ませておく

### 6-3. 次の版の候補 (審査結果を待つ間の準備)
- 週次ふり返りの表示崩れの修正 (`baa50ab`) を main に統合してビルドする
- `bun run check:deps` を通す (expo 系パッケージのパッチ版が古い)
- Sentry の `SENTRY_AUTH_TOKEN` を EAS に登録してスタックトレースを読めるようにする
- バーコード機能を出すか、カメラの許可の説明文を外すか決める (出す場合は導線・Open Food Facts の出典表示・プライバシー回答の見直し)
- iOS のアプリ内「更新があります」案内 ([ROADMAP.md](./ROADMAP.md) の未着手項目)
