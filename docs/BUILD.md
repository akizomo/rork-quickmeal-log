# Hachibu ビルド手順書

> Hachibu の本番 / 内部配布ビルドを誰がどの環境からでも同じ手順で作れるようにするための標準化ドキュメント。
> EAS Build (Expo Application Services) を使用。

> **⚠️ ルール**: ビルド完了を報告する際は **必ずリリースノートをセットで出すこと**。
> 前回リリースノートを出したコミットから `HEAD` までの差分を `git log <前回commit>..HEAD --oneline` で確認し、
> Play Store 用 (ユーザー向け) と 社内 Changelog (技術メモ) の両方を作成する。
> 今月の残りビルド数も合わせて報告する。

---

## 0. TL;DR — 最短手順

### Android production (推奨: GitHub Actions)

```bash
gh workflow run eas-build.yml -f profile=production -f platform=android
gh run watch  # 進捗を確認
```

### Android production (ローカル CLI)

```bash
cd expo
npx eas-cli@18.12.2 build --profile production --platform android --non-interactive
```

### iOS production (ローカル CLI)

```bash
cd expo
npx eas-cli@18.12.2 build --profile production --platform ios --non-interactive
```

> **iOS で Apple ID ログインが要る操作 (証明書の新規作成・更新) は `eas-cli@25.0.0` 以上を使う。** 18.12.2 では Apple 側の認証変更により `Authentication with Apple Developer Portal failed! iTunes service key is empty` で失敗する (2026-10-16 確認)。`npx` は eas-cli の取得に10分以上かかったため `bunx eas-cli@25.0.0 ...` を使った。証明書が EAS に保存された後の通常ビルドは `--non-interactive` で動く想定 (未検証)。
>
> **iOS のビルドイメージは `eas.json` で `macos-tahoe-26.6-xcode-27.0` (= EAS の `sdk-58` 対応イメージ) に固定している。外さないこと。**
> Xcode 27 (iOS 27 SDK) でビルドすると UIScene ライフサイクル必須となり、RN 0.81 / Expo SDK 54 のアプリは起動直後に `EXC_BREAKPOINT` で落ちる (2026-10-16 ローカル Xcode 27.1 で実証)。SDK 58 (RN 0.88) は Scene ライフサイクルに対応済みで、Xcode 27 で起動することを 2026-10-18 に Simulator で確認した (SDK 54 に戻す場合は `macos-sequoia-15.6-xcode-26.0` へ戻す)。
> `auto` / `latest` エイリアスは将来イメージが動き得るため使わない。Expo SDK を上げるときはイメージも対応する `sdk-XX` の実体へ同時に更新する。
> **27.0 に固定している理由**: Expo のイメージ一覧には 27.1 (RC) もあるが、ベータ/RC の Xcode でビルドしたものは App Store Connect が受け付けないことがある。正式版の 27.1 が EAS に出たら更新を検討する。イメージ名は eas.json では検証されず、誤りは cloud build の開始時にしか分からないので、変更時は [Expo のビルドサーバー一覧](https://docs.expo.dev/build-reference/infrastructure/) で名前を確認する。

---

> **⚠️ 依存を増減したら `bun.lock` も更新してコミットする (2026-10-18)。** `expo/` には `bun.lock` と `package-lock.json` の両方がある。**EAS は `bun.lock` があれば bun で `--frozen-lockfile` インストールする**ため、`package.json` と食い違うと「Install dependencies」フェーズで `Unknown error` になる (`expo-location` を `npm uninstall` で外し、`package-lock.json` だけ更新して `bun.lock` を忘れた事故)。
> 依存を触ったら、ビルド前に **`cd expo && bun install --lockfile-only && bun install --frozen-lockfile --dry-run`** を実行し、`bun.lock` の差分をコミットする。`npm ci` はローカルでは peer 依存 (lucide-react-native と react 19) で失敗するが、EAS は npm を使わないので無関係。

## 1. 前提条件

| 項目 | 必須? | 確認コマンド |
|---|:---:|---|
| Node.js 22+ | ✅ | `node -v` |
| Expo アカウント (`akizony`) ログイン | ✅ | `npx eas-cli whoami` |
| Expo の `EXPO_TOKEN` (GitHub Actions のみ) | ✅ (CI) | GitHub Repo Settings > Secrets |
| Android keystore (EAS サーバー保管済み) | ✅ | 初回のみ自動生成。以降は EAS が保持 |
| iOS Distribution Certificate / Provisioning Profile | ✅ (iOS) | EAS が管理 |

> **重要**: `expo/` ディレクトリ内で実行する必要がある。ルートではエラーになる (EAS が project root を見つけられない)。

---

## 2. ビルドの実行方法

### 方法 A: GitHub Actions (推奨)

ローカルマシンを占有せず、ログが GitHub に残る。

**起動方法 1: gh CLI**
```bash
gh workflow run eas-build.yml \
  -f profile=production \
  -f platform=android
```

**起動方法 2: GitHub Web UI**
1. リポジトリの **Actions** タブ
2. **EAS Build** ワークフロー
3. **Run workflow** ボタン
4. profile / platform を選択して **Run workflow**

**入力パラメータ**

| パラメータ | 選択肢 | デフォルト |
|---|---|---|
| `profile` | `production` / `preview` / `development` | `production` |
| `platform` | `android` / `ios` / `all` | `android` |

設定ファイル: [.github/workflows/eas-build.yml](../.github/workflows/eas-build.yml)

### 方法 B: ローカル EAS CLI

リアルタイムログを見たい / 緊急ビルド時に使用。

```bash
cd expo
# 初回 or 依存変更時のみ
npm install --legacy-peer-deps

# ビルド実行
npx eas-cli@18.12.2 build --profile production --platform android --non-interactive
```

> **注意**: `@latest` は v21.8.0 以降でプロジェクト設定の検出ロジックが変わり、`extra.eas.projectId` を読めず "EAS project not configured" で失敗する。バージョンを固定して使うこと。

**ログイン確認**:
```bash
npx eas-cli@18.12.2 whoami
# 期待される出力: akizony / akizomo.foot628@gmail.com
```

未ログインの場合: `npx eas-cli@18.12.2 login` で対話的にログイン。

---

## 3. ビルドプロファイル

[expo/eas.json](../expo/eas.json) で定義。

| プロファイル | 用途 | Android 出力 | iOS 出力 | versionCode 自動増 |
|---|---|---|---|:---:|
| **development** | Dev Client (Expo Go の代わり) | APK | Simulator | ❌ |
| **preview** | 内部配布・テスター向け | APK | Real device | ❌ |
| **production** | 製品版 / ストア提出 | AAB | App Store | ✅ |

> ⚠️ **審査に提出するビルド・TestFlight (内部/外部テスト) に出すビルドは、すべて `production` プロファイル。** `preview` ビルドは paywall に `[TEST] Paywall スキップ` が出る (Android の APK 配布用で、iOS の TestFlight には使わない)。
> **`testflight` プロファイルは 2026-10-18 に廃止した** (paywall スキップ付きの TestFlight 用)。有料 App 契約が有効になり、TestFlight でも購入が Sandbox 扱いで試せるため不要になった。外部テストのベータ審査でスキップボタンが見えるのも避けたい。TestFlight でも本番と同じ見た目・同じ購入フローで確認する。
> TestFlight に出すビルドは、そのまま審査にも使い回せる (App Store Connect でバージョンに紐付けるだけ。再ビルド不要)。

**選び方の目安**:
- 友人 5 人にインストールさせて即動作確認したい → `preview`
- Play Console クローズドテスト / 本番リリース → `production`
- Expo Go では足りない native module を試す → `development`

---

## 4. リリースノート規約

ビルド完了後、リリースノートを 2 種類用意する。

### 4-1. Play Store / App Store 用 (ユーザー向け)

- **長さ**: Play Store 500 字以内 / App Store 4000 字以内
- **トーン**: 静かな日本語ウェルネス (中立・非評価・非性的)
- **形式**:
  ```
  バージョン X.Y.Z (build N)

  カテゴリ見出し
  ・具体的な変更点 1
  ・具体的な変更点 2
  ```
- **書かないこと**: 技術名 (RevenueCat, Sentry 等)、コミットハッシュ、Internal な用語

### 4-2. 社内 Changelog 用 (技術メモ)

- Markdown 形式
- セクション: `Features` / `Fixes` / `Chore / CI` / `Build info`
- コミットハッシュ・versionCode 推移を含める

### 4-3. 範囲の決め方

「前回**成功した production ビルド**から今回までのコミット差分」を対象にする。

```bash
# 前回の成功 production ビルドのコミットを EAS から取得
npx --yes eas-cli@latest build:list \
  --status finished --platform android --limit 5 --json --non-interactive \
  | jq -r '.[].gitCommitHash' | head -2

# コミット差分を確認
git log <前回のコミット>..HEAD --oneline
```

---

## 5. ビルド進捗の監視ルール

**EAS CLI の出力ファイルが `Waiting for build to complete.` のまま止まっていても、クラウド側では既に失敗している場合がある。**
出力ファイルを見るだけでなく、以下で EAS 本体のステータスを必ず確認すること。

```bash
# ビルドIDは起動時のログ「See logs:」URLの末尾
npx --yes eas-cli@latest build:view <BUILD_ID> --json 2>/dev/null \
  | node -e "const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{const t=Buffer.concat(c).toString();const o=JSON.parse(t.slice(t.indexOf('{')));console.log('status:',o.status,'error:',JSON.stringify(o.error));})"
```

**判断基準**:
- ユーザーに**1回でも**「まだ？」と聞かれたら即座に上記コマンドでクラウドステータスを直接確認する
- 起動から30分以上経過していても完了通知が来ない場合も確認する
- `ERRORED` になっていたら即座に報告し、ログを取得して原因を調査する

---

## 5-2. Kotlin / Java コンパイルエラーの修正ルール

**コンパイルエラーを修正する前に、必ず同じパターンが他のファイルにも存在しないか全検索してから一括修正すること。**
1ファイルだけ直してビルドするのは貴重なビルド枠の無駄遣いになる。

```bash
# 例: Glance API の旧パターンを全ファイル検索
find expo/android -name "*.kt" | xargs grep -l "override fun Content()"

# 例: 特定の import が不足しているファイルを探す
find expo/android -name "*.kt" | xargs grep -l "cornerRadius"
```

**手順**:
1. エラーログからパターンを特定する
2. `find` + `grep` で同パターンを持つ全ファイルをリストアップする
3. 全ファイルを一括修正してから1回でビルドする

---

## 6. トラブルシューティング

### ⚠️ `expo prebuild` で android/ のウィジェットが消える (SDK 58〜)
SDK 58 から `npx expo prebuild` は既定で `android/` を作り直す (`--clean` 相当)。android/ はホーム画面ウィジェット (Kotlin・XML・receiver・Gradle 設定) を手で足して git 管理しているため、**そのまま実行すると全部消える**。
- Android で prebuild が要るときは、実行後に `git status expo/android` で消えた/上書きされたファイルを確認し、ウィジェット関連 (widget/ 一式、res の layout/xml/drawable/values-night、colors.xml と strings.xml の widget_*、AndroidManifest の receiver、MainApplication の `WidgetBridgePackage`、build.gradle の Compose/Glance) と調整済みのスプラッシュ画像・アイコンを戻す (SDK 58 更新コミット b6e604a が手順の実例)
- 恒久対応はウィジェットを config plugin 化して prebuild で毎回生成すること (未着手)

### iOS アプリが起動直後に落ちる (`NoSceneLifecycleAdoption`)
クラッシュレポートに `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` があれば、Xcode 27 系でビルドされている。`eas.json` の `ios.image` が Xcode 26 系に固定されているか、ローカルなら `xcodebuild -version` を確認する。ローカル Mac が Xcode 27 しか無い場合、Simulator 確認は諦めて EAS → TestFlight で確認する。

### 配布したビルドが splash 表示直後にクラッシュする

**まず依存バージョンを疑う。** SDK 非互換のネイティブモジュールが混ざっていると、JS に到達する前に落ちる。`tsc` / `jest` / Web 起動確認はすべて通るため、この症状はコード側を追っても原因に辿り着かない。

```bash
cd expo && npx expo install --check
```

`expected version` と桁が違う警告 (例: `expo-localization@57.0.1 - expected version: ~17.0.9`) が出たらそれが原因。

```bash
npx expo install --fix
git diff app.json    # plugins への config plugin 自動追加を必ず確認する
```

修正後は**ビルドを作り直して配布し直す**。既に配布済みのビルドはローカル修正では直らない。

再発防止ルールは [CLAUDE.md「依存パッケージの追加・更新ルール」](../CLAUDE.md#依存パッケージの追加更新ルール-必読) を参照。要点は **Expo 関連は必ず `npx expo install` で入れる**こと。

- 実績: 2026-08-20 `expo-localization@^57.0.1` (正 `~17.0.9`) + config plugin 未登録 → 内部テスト版が splash でクラッシュ。修正コミット `db60e2a`。

### Android のリリースビルドだけ起動直後に落ちる (R8 がクラスを削る)

**依存が合っていてもデバッグ版で動いても、リリースだけ落ちることがある。** SDK 58 から Android のリリースビルドは R8 (使われないコードを削る処理) が既定で有効 (`android.enableMinifyInReleaseBuilds=true`)。リフレクションで名前から作られるクラスは、静的には「使われていない」ように見えるので、コンストラクタごと削られる。エミュレータのデバッグ版 (`expo run:android`) は R8 が効かないため、**ここでは再現しない**。

**再現する手順** (EAS のビルドを待たずに、同じ R8 設定でエミュレータに入れる。約10分):

```bash
cd expo/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # JDK が無ければ Android Studio 同梱のもの
SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
adb logcat -c && adb shell am start -n app.akizony.hachibu/.MainActivity
adb logcat -d -b crash -v time | grep -E "FATAL|Caused by"
adb logcat -d -v time | grep -E "NoSuchMethod|ClassNotFound|NoClassDefFound"   # 落ちないが削られている分も拾う
```

エミュレータは arm64 のもの。x86_64 なら `-PreactNativeArchitectures` を合わせる。`app/build/outputs/mapping/release/` の `usage.txt` (削られたもの) と `seeds.txt` (残ったもの) で、何が消えたか確認できる。

**直し方**: [expo/android/app/proguard-rules.pro](../expo/android/app/proguard-rules.pro) に `-keep` を足す。**落ちたクラス1つだけでなく、同じ型 (リフレクションで作られるクラス) をまとめて足す**。1つ直してビルドしても、次のクラスで落ちるだけで、ビルド枠を無駄にする。

- 実績: 2026-10-27 versionCode 81 (SDK 58 で初の Android production) が splash で落ちた。WorkManager (Glance ウィジェット経由) が起動時に Room の `WorkDatabase_Impl` をリフレクションで作るが、room-runtime 2.5.0 の同梱ルールはクラスだけ残してコンストラクタを残さず、R8 に削られた。`-keep class * extends androidx.room.RoomDatabase { <init>(); }` で解消 (`35bf590`)。直後のログに `OverwritingInputMerger.<init>` の `NoSuchMethodException` も出ていたため、WorkManager の `InputMerger` / `ListenableWorker` もまとめて keep した (`6f6653a`)。

### `npm install` が peer dependency エラーで失敗

```
npm error ERESOLVE could not resolve
npm error Conflicting peer dependency: react@18.3.1
```

**対応**: `--legacy-peer-deps` を必ず付ける。CI ワークフロー / ローカル両方で必須。

```bash
npm install --legacy-peer-deps
```

### `Failed to resolve plugin for module "expo-router"`

→ node_modules が未インストール。`cd expo && npm install --legacy-peer-deps`。

### `EAS project not configured` (build:view 等で発生)

→ コマンドを `expo/` ディレクトリ内から実行していない。`cd expo` してから再実行。

### キュー時間が長い (1 時間以上 `IN_QUEUE`)

- EAS Free tier の通常動作。https://status.expo.dev/ で障害情報を確認
- 緊急なら preview プロファイルで先行ビルドして配布

### `Build profile "production" has specified the channel "production", but the "expo-updates" package hasn't been installed`

→ 警告のみ (ビルドは継続)。OTA アップデート機能を使うなら:
```bash
cd expo
npx expo install expo-updates
npx --yes eas-cli@latest update:configure
```

### ビルドが `ERRORED` で完了する

1. EAS ダッシュボードでログを開く: `https://expo.dev/accounts/akizony/projects/hachibu/builds/<id>`
2. 「Build complete hook」フェーズのログを確認
3. 多くは: 依存関係の native build 失敗 / 容量超過 / Android キーストア問題

過去事例: 2026-05-13 に 3 連続で `Unknown error` で失敗 → 4 回目で原因不明のまま成功。EAS 側の一時的な問題だった可能性。

---

## 7. ビルド後のアクション

### 6-1. AAB / IPA のダウンロード

ビルド完了時の出力に表示される URL から:
```
https://expo.dev/artifacts/eas/<hash>.aab
```

### 6-2. Play Console / App Store Connect へのアップロード

**Android**:
1. Play Console > リリース > **クローズドテスト** または **製品版**
2. **新しいリリースを作成** > AAB をアップロード
3. リリースノート (§4-1) を貼り付け
4. **保存** > **リリースをレビュー**

**iOS**:
- `eas submit --platform ios --latest` で App Store Connect に自動アップロード
- または Transporter アプリで手動アップロード

### 6-3. (将来) eas submit による自動提出

未設定。[expo/eas.json](../expo/eas.json) の `submit` セクションに認証情報を入れれば:

```bash
npx --yes eas-cli@latest submit --platform android --latest
```

で自動提出可能になる。

---

## 8. ビルド設定ファイル参照

| ファイル | 役割 |
|---|---|
| [expo/eas.json](../expo/eas.json) | ビルドプロファイル / submit 設定 |
| [expo/app.json](../expo/app.json) | アプリメタデータ / bundle id / versionCode |
| [.github/workflows/eas-build.yml](../.github/workflows/eas-build.yml) | GitHub Actions CI |
| [docs/PLAY_STORE.md](./PLAY_STORE.md) | Play Console 提出時の文言ドラフト |

---

## 9. 過去ビルド実績

| Build # | Profile | Commit | 結果 | 備考 |
|---:|---|---|---|---|
| 16 | production | a66bac7 | ✅ FINISHED | 久しぶりの成功 (約 3h キュー) |
| 17 | production | a66bac7 | ✅ FINISHED | 再ビルド (9 分で完了) |
| 13〜15 | production | d7be2cc | ❌ ERRORED | Build complete hook で `Unknown error` 連続発生 |
| 8 | production | d321f420 | ✅ FINISHED | 2026-05-10 の最後の成功ビルド |

最新の状況は EAS ダッシュボードで確認:
https://expo.dev/accounts/akizony/projects/hachibu/builds
