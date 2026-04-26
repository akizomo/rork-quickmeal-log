# GitHub Projects (Kanban) セットアップ手順

このリポジトリのバックログを GitHub Projects (v2) の Kanban ボードで運用するための手順書です。
Issue テンプレート・ラベル・PR テンプレートはコード化済みなので、ここでは **GitHub UI でしか作れない部分** (Project 本体・自動化ルール・ビュー) と **初回 seed 手順** を扱います。

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `.github/ISSUE_TEMPLATE/*.yml` | Issue 起票フォーム (feature / bug / chore / epic) |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR テンプレート |
| `.github/labels.yml` | ラベル定義 (single source of truth) |
| `.github/workflows/sync-labels.yml` | ラベル自動同期 Action |
| `.github/seed-epics.sh` | PRD §6 の機能をエピック Issue として一括作成 |

---

## 1. ラベルを同期する

`labels.yml` を編集 → `main` に push すると `Sync Labels` workflow が自動実行されます。

手動で実行したい場合:

```bash
# GitHub Actions タブから "Sync Labels" → "Run workflow"
# もしくは gh CLI で
gh workflow run sync-labels.yml
```

確認: リポジトリの `Issues` → `Labels` で `type: *` `priority: *` `area: *` `status: *` が並んでいれば成功。

> **メモ**: `delete-other-labels: false` にしているため、`labels.yml` から削除しても GitHub 側のラベルは残ります。運用が安定したら `true` に切り替えると `labels.yml` が単一の正になります。

---

## 2. エピック Issue を seed する

PRD §6 の主要機能を 7 件のエピック Issue として作成します。

```bash
# リポジトリのルートで実行
bash .github/seed-epics.sh
```

確認:
- `Issues` タブに `[Epic] ...` が 7 件並ぶ
- 各 Issue に `type: epic` + `area: *` + `priority: *` ラベルが付与されている

> **重要**: スクリプトは冪等ではありません。再実行すると重複 Issue が作成されます。1 回だけ実行してください。

---

## 3. Project (Kanban Board) を作成する

GitHub UI でしか作成できないため、以下の手順で手動セットアップします。

### 3.1 Project を作成

1. `https://github.com/akizomo` → `Projects` タブ → `New project`
2. テンプレート: **Board** を選択
3. プロジェクト名: `QuickMeal Log Backlog`
4. 説明: `rork-quickmeal-log のバックログ管理 (PRD §6 ベース)`
5. リポジトリにリンク: Project の `Settings` → `Manage access` → `akizomo/rork-quickmeal-log` を追加

### 3.2 Status 列を構成

デフォルトの `Todo / In Progress / Done` を以下の 5 列に変更します。

| 列 | 意味 |
|---|---|
| `Backlog` | 起票直後 / 仕様未確定 |
| `Ready` | 仕様確定 / 着手可能 |
| `In Progress` | 実装中 |
| `In Review` | PR レビュー中 |
| `Done` | マージ済み / クローズ済み |

操作: Board 上の列ヘッダ右の `...` → `Edit` で名前変更、`+ New column` で追加。

### 3.3 カスタムフィールドを追加

`Settings` → `Custom fields` → `+ New field`:

| フィールド名 | 種類 | 値 |
|---|---|---|
| `Priority` | Single select | `P0` (赤) / `P1` (黄) / `P2` (緑) |
| `Area` | Single select | `app-intro` / `paywall` / `onboarding` / `body-matrix` / `goal-setting` / `quick-log` / `my-status` / `review` / `cross-cutting` |
| `Estimate` | Number | (任意・SP やステータスポイント用) |
| `Iteration` | Iteration | 期間 1〜2 週間 |

> ラベルと冗長に見えますが、ラベルは検索・絞り込み用、Project フィールドは Board 上のグルーピング・フィルタ用として併用します。

### 3.4 自動化ルール (Workflows)

`Settings` → `Workflows` で以下を有効化:

| Workflow | 設定 |
|---|---|
| **Item added to project** | `Status = Backlog` に自動設定 |
| **Item reopened** | `Status = Backlog` |
| **Item closed** | `Status = Done` |
| **Pull request merged** | `Status = Done` |
| **Auto-add to project** | リポジトリ `akizomo/rork-quickmeal-log` の Issue/PR を自動追加 (フィルタ: `is:issue,pr` 推奨) |

`In Progress` / `In Review` への遷移は手動で動かします (Assign のタイミングと PR 提出のタイミングで)。

### 3.5 ビューを追加

Board の左サイドバー `+ New view`:

| ビュー名 | 種類 | 設定 |
|---|---|---|
| `Board` (デフォルト) | Board | Group by: `Status` |
| `Roadmap` | Roadmap | Date fields: `Iteration` |
| `All Items` | Table | Sort: `Priority` ASC, `Status` ASC |
| `Current Sprint` | Board | Filter: `iteration:@current`, Group by: `Status` |
| `By Area` | Board | Group by: `Area` |

---

## 4. エピック Issue を Project に追加

Project が作成されると `Auto-add to project` workflow により今後の Issue/PR は自動で追加されますが、seed 直後の既存 Issue は手動で追加が必要な場合があります。

```bash
# gh CLI で全 Issue を一括追加 (PROJECT_NUMBER は Project URL の最後の数字)
gh issue list --label "type: epic" --json number -q '.[].number' | \
  xargs -I {} gh project item-add PROJECT_NUMBER --owner akizomo --url "https://github.com/akizomo/rork-quickmeal-log/issues/{}"
```

または Project の `+ Add item` から `#` で Issue を検索して追加。

---

## 5. 日々の運用ルーティン

| タイミング | アクション |
|---|---|
| 思いつき・要望 | Issue 作成 (テンプレートを選ぶ) → 自動で `Backlog` |
| 仕様レビュー後 | `status: ready` ラベル + Project Status を `Ready` |
| 着手 | Assign + Project Status を `In Progress` |
| PR 作成 | PR 本文に `Closes #N` → `In Review` (workflow が PR を自動追加) |
| マージ | Issue が close → 自動で `Done` |
| スプリント末 | `By Area` ビューで未完了の偏りを確認 → 翌 Iteration 計画 |

---

## 6. 子タスクの粒度

エピック (`type: epic`) は粗く、その下に `type: feature` / `type: bug` / `type: chore` を子 Issue として作成します。
エピック本文の「子タスク」チェックリストに `- [ ] #123` 形式で並べると Project 上で進捗が可視化されます (GitHub の "Tasklist" 機能)。

---

## 7. トラブルシュート

- **ラベルが同期されない**: `Sync Labels` workflow が失敗していないか Actions タブで確認。`labels.yml` の YAML 構文エラーがよくある原因。
- **Issue テンプレートが表示されない**: `.github/ISSUE_TEMPLATE/*.yml` のフロントマター (`name:` `description:`) が必須。
- **`gh project item-add` で権限エラー**: `gh auth refresh -s project` で Project スコープを追加。
