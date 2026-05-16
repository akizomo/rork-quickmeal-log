# Hachibu ビルド手順書

> Hachibu の本番 / 内部配布ビルドを誰がどの環境からでも同じ手順で作れるようにするための標準化ドキュメント。
> EAS Build (Expo Application Services) を使用。

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
npx --yes eas-cli@latest build --profile production --platform android --non-interactive
```

### iOS production (ローカル CLI)

```bash
cd expo
npx --yes eas-cli@latest build --profile production --platform ios --non-interactive
```

---

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
npx --yes eas-cli@latest build --profile production --platform android --non-interactive
```

**ログイン確認**:
```bash
npx --yes eas-cli@latest whoami
# 期待される出力: akizony / akizomo.foot628@gmail.com
```

未ログインの場合: `npx --yes eas-cli@latest login` で対話的にログイン。

---

## 3. ビルドプロファイル

[expo/eas.json](../expo/eas.json) で定義。

| プロファイル | 用途 | Android 出力 | iOS 出力 | versionCode 自動増 |
|---|---|---|---|:---:|
| **development** | Dev Client (Expo Go の代わり) | APK | Simulator | ❌ |
| **preview** | 内部配布・テスター向け | APK | Real device | ❌ |
| **production** | 製品版 / ストア提出 | AAB | App Store | ✅ |

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

## 5. トラブルシューティング

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

## 6. ビルド後のアクション

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

## 7. ビルド設定ファイル参照

| ファイル | 役割 |
|---|---|
| [expo/eas.json](../expo/eas.json) | ビルドプロファイル / submit 設定 |
| [expo/app.json](../expo/app.json) | アプリメタデータ / bundle id / versionCode |
| [.github/workflows/eas-build.yml](../.github/workflows/eas-build.yml) | GitHub Actions CI |
| [docs/PLAY_STORE.md](./PLAY_STORE.md) | Play Console 提出時の文言ドラフト |

---

## 8. 過去ビルド実績

| Build # | Profile | Commit | 結果 | 備考 |
|---:|---|---|---|---|
| 16 | production | a66bac7 | ✅ FINISHED | 久しぶりの成功 (約 3h キュー) |
| 17 | production | a66bac7 | ✅ FINISHED | 再ビルド (9 分で完了) |
| 13〜15 | production | d7be2cc | ❌ ERRORED | Build complete hook で `Unknown error` 連続発生 |
| 8 | production | d321f420 | ✅ FINISHED | 2026-05-10 の最後の成功ビルド |

最新の状況は EAS ダッシュボードで確認:
https://expo.dev/accounts/akizony/projects/hachibu/builds
