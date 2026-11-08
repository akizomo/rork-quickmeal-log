# モバイルビルド依頼用プロンプト (他リポジトリ向け)

Hachibu (rork-quickmeal-log) で固まったビルドの進め方を、他のリポジトリ (Expo / Capacitor / ネイティブ) でも再現させるためのプロンプト。正本は `~/.claude/skills/mobile-build/SKILL.md` で、これはその控え。
使い方は3通り:

1. **その場で貼る** — ビルドを頼むメッセージの先頭に、下の「プロンプト本文」をそのまま貼る
2. **リポジトリに置く** — 対象リポジトリの `CLAUDE.md` に「## ビルド手順」として本文を貼る (毎回貼らなくてよくなる)
3. **全リポジトリ共通にする** — `~/.claude/skills/mobile-build/SKILL.md` に置く (先頭に下記 frontmatter を付ける)。「ビルドして」で自動的に読まれる

```markdown
---
name: mobile-build
description: iOS / Android アプリのビルド・配布を頼まれたら必ず最初に使う。「ビルドして」「TestFlightに出したい」「App Store / Play Store に提出」「archive」「AAB/APK/IPA を作って」などが対象。Expo (EAS Build)・Capacitor・React Native・ネイティブ Xcode/Gradle のどれでも使う。手順書の確認、ビルド前チェック、コピペ用コマンド、署名トラブル、進捗監視、アップロード前の確認、リリースノート付き完了報告までの手順。
---
```

---

## プロンプト本文

````markdown
# iOS / Android ビルドの進め方

iOS / Android のビルド・配布を頼まれたら、以下の手順と規則に従うこと。いきなりビルドを叩かず §0 から順に進める。
**返答・報告はすべて日本語で書く。**

## 0. 前提の確認 (最初に1回)
- リポジトリにビルド/リリース手順書 (`docs/BUILD.md` / `docs/IOS_RELEASE.md` 等) があれば**まず読み、こちらより優先する**。無ければ、進めた結果を最後に手順書として書き起こす
- 構成を判定し、該当するトラックを使う:
  - `eas.json` がある → **トラック A (Expo / EAS Build)**
  - `capacitor.config.*` がある、または `ios/` `android/` を直接ビルドする → **トラック B (ローカル Xcode / Gradle)**
- アプリのルート (monorepo ならサブディレクトリ) を特定し、コマンドは必ずそこで実行する
- バンドル ID / バージョン / ビルド番号 (iOS `CFBundleVersion`・Android `versionCode`) の現在値を確認する。**ストアに一度でも上げたことがあるなら、前回より大きくする**

## 1. 共通: 何を作るか
- App Store 審査・TestFlight・Play Console のテスト/本番に出すものは**本番設定 (release / production)** で作る。テスト用のスキップボタン等が入る設定で出さない
- どのプラットフォーム・どの配布先か曖昧なら、ビルド前に1行で確認する

## 2. 共通: ビルド前チェック (省略しない)
- 依存のバージョン不整合を先に潰す (Expo なら `npx expo install --check`。メジャーが違う警告はエラー扱い)。Expo 系パッケージは `npx expo install` で入れ、package.json を手編集しない
- lockfile が package.json と一致してコミット済みか確認する
- 型チェック / lint / テストがあれば通す
- 未コミットの変更が意図せずビルドに混ざらないか見る
- 環境変数・API キー (課金 SDK 等) が本番値で入っているか確認する。値そのものはチャットに書かない

## 3A. トラック A: Expo / EAS Build
- プロファイルは `eas.json` を読んで選ぶ。審査・TestFlight は `production`
- `eas-cli` はバージョン固定 (`@latest` は挙動が変わる)。**iOS の証明書作成・更新など Apple ID ログインが要る操作は eas-cli 25.0.0 以上**
- iOS は `eas.json` の `ios.image` を Expo SDK に対応する**正式版 Xcode のイメージに固定** (`auto`/`latest` は使わない。ベータ/RC Xcode のビルドは App Store Connect に弾かれることがある)
- **本番ビルドの起動はユーザーが行う前提**で、コピペできるコマンドを bash ブロックで出す。実行ディレクトリは絶対パス:
  ```bash
  cd /absolute/path/to/app && npx eas-cli@<固定版> build --profile production --platform ios --non-interactive
  ```
  TestFlight まで上げるなら `--auto-submit` 付きも併記。GitHub Actions に EAS ワークフローがあれば `gh workflow run` も出す
- 監視: CLI が `Waiting for build to complete.` で止まっていてもクラウドでは失敗していることがある。`npx eas-cli build:view <BUILD_ID> --json` で status を直接見る。「まだ？」と聞かれたら・30分以上動きがなければ即確認

## 3B. トラック B: ローカル Xcode / Gradle (Capacitor 等)
- Web 層があるなら先にビルドして同期する (Capacitor: `npm run build && npx cap sync ios`)
- **iOS の署名で詰まりやすい点**:
  - CLI の `xcodebuild archive -allowProvisioningUpdates` は開発用プロファイルを先に作ろうとするため、**登録済みデバイスが0台だと失敗する**。この場合の選択肢を両方示す: (1) iPhone を USB 接続して Xcode にデバイス登録させる / (2) Xcode の GUI で Product → Archive → Organizer の「Distribute App → App Store Connect」で配布用署名のみで出す
  - `CODE_SIGN_IDENTITY` / `PROVISIONING_PROFILE_SPECIFIER` を `xcodebuild` の引数で渡すと **Pods (Firebase 等) にまで適用されて失敗する**。上書きはアプリ本体ターゲットに限る
  - エクスポートは `ExportOptions.plist` の `method` を `app-store-connect`、`signingStyle` を `automatic` にする
- Android: `./gradlew bundleRelease` (AAB)。リリース用 keystore の場所とパスワードの管理方法を確認する (値はチャットに書かない)。リリースだけ落ちる場合は R8 を疑う (§4)
- ローカルビルドは枠を消費しないので Claude が実行してよい。ただし**ストアへのアップロード (`xcrun altool` / Transporter / `fastlane` / Play Console) は Apple/Google に送る操作なので、直前に必ずユーザーに確認する**

## 4. 失敗したときの直し方
- **同じ型のエラーをまとめて直してから1回でビルドし直す。** ログから型を特定 → `grep` で同じパターンを全ファイルから洗い出す → 一括修正
- 配布ビルドが splash 直後に落ちる → 依存バージョン不整合 / ネイティブプラグイン未登録を疑う
- iOS が起動直後に落ちる → ビルドに使った Xcode とフレームワークのバージョンの組み合わせを疑う
- Android のリリースだけ落ちる → R8 (minify) がリフレクションで使うクラスを削っている。`./gradlew assembleRelease` でローカル再現し、`proguard-rules.pro` に `-keep` を**同じ種類のクラスまとめて**足す
- ユーザーの手作業が要る詰まり (デバイス登録・証明書・契約同意など) は、何をどこで押すかを番号付きで具体的に書く
- 原因と手順は手順書のトラブルシューティングに追記する

## 5. 動作確認の考え方
- **Web で動いたことはネイティブの動作保証にならない。** ネイティブ依存に触れた変更は Simulator/Emulator か実機で起動確認するまで「動いた」と言わない
- **ngrok / `expo start --tunnel` は使わない・勧めない。** 実機確認は LAN / Simulator / 内部配布を使う

## 6. 完了報告 (必ずセット)
1. ビルド番号・バージョン・設定 (production 等)・成果物の場所 / ダッシュボード URL
2. **リリースノート2種**。範囲は「前回ストアに出したビルドのコミット..HEAD」の `git log --oneline`
   - **ストア用 (ユーザー向け)**: 日本語・技術名やコミットハッシュは書かない・Play Store 500字以内。**絵文字は使わない** (App Store Connect / TestFlight で入力エラーになる)
   - **社内 Changelog**: Features / Fixes / Chore / Build info、コミットハッシュとビルド番号の推移
3. EAS を使った場合は今月の残りビルド数
4. 次にユーザーがやること (TestFlight の What to Test 入力、審査提出、Play Console へのアップロード等)
````
