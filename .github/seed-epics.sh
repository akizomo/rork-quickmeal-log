#!/usr/bin/env bash
# PRD §6 の主要機能をエピック Issue として一括作成するスクリプト
#
# 前提: gh CLI がインストール済みで `gh auth login` 完了していること
# 使い方: bash .github/seed-epics.sh
# 注意:   このスクリプトは冪等ではありません。複数回実行すると重複 Issue が作成されます。
#         初回セットアップ時に 1 回だけ実行してください。
#
# 関連: docs/github-projects-setup.md

set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI が見つかりません。https://cli.github.com からインストールしてください。" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh CLI が認証されていません。\`gh auth login\` を実行してください。" >&2
  exit 1
fi

# リポジトリ確認
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "📦 対象リポジトリ: ${REPO}"
read -r -p "このリポジトリにエピック Issue を作成します。続行しますか? [y/N] " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
  echo "中止しました。"
  exit 0
fi

create_epic() {
  local title="$1"
  local area="$2"
  local priority="$3"
  local prd_section="$4"
  local goal="$5"
  local scope="$6"

  local body
  body=$(cat <<EOF
## ゴール
${goal}

## スコープ
${scope}

## PRD 参照
\`docs/PRD.md\` §${prd_section}

## 子タスク
実装着手時に Issue を作成し、ここにチェックリスト化してください。

- [ ] #
- [ ] #

## 受け入れ条件
- [ ] PRD §${prd_section} の AC をすべて満たす
- [ ] iOS / Android / Web のいずれかで動作確認済み
EOF
)

  echo "→ [Epic] ${title}"
  gh issue create \
    --title "[Epic] ${title}" \
    --label "type: epic,area: ${area},priority: ${priority}" \
    --body "${body}"
}

# ─────────────────────────────────────
# PRD §6 の機能ブロックをエピックとして作成
# ─────────────────────────────────────

create_epic \
  "アプリ紹介 & Paywall" \
  "app-intro" \
  "priority: p0" \
  "6.1" \
  "初回起動時にアプリ価値を伝え、Paywall で適切に課金導線を提示する。" \
  "アプリ紹介スライド / Paywall 価格動的表示 / 紹介再表示方針 (PLAN.md 参照)。"

create_epic \
  "オンボーディング基本データ収集 & 現在体型推定" \
  "onboarding" \
  "priority: p0" \
  "6.2" \
  "ユーザーの基本データ (性別/年齢/身長/体重/運動習慣) を取得し、現在体型を 9 分類マトリクスから自動推定する。" \
  "入力フロー / バリデーション / Mifflin-St Jeor 用データ確保 / 9分類自動推定ロジック。"

create_epic \
  "目標体型・目標プラン選択" \
  "goal-setting" \
  "priority: p0" \
  "6.3" \
  "現在体型と同じマトリクスから目標体型をユーザーが選択し、方向性 (減量/維持/増量) を自動導出する。" \
  "9分類マトリクス UI / 目標選択フロー / 方向性自動導出。"

create_epic \
  "目標数値提案 (kcal / PFC)" \
  "goal-setting" \
  "priority: p0" \
  "6.4" \
  "Mifflin-St Jeor + 活動係数で TDEE を計算し、減量/維持/増量に応じた kcal・PFC を提案する。" \
  "計算ロジック (PLAN.md §1) / 表示 UI / 編集可否方針。"

create_epic \
  "Quick Log (静的構造 + 動的自動学習)" \
  "quick-log" \
  "priority: p0" \
  "6.5" \
  "9バケット×2タブの静的構造で食事を素早く記録でき、利用履歴から自動学習して並びを最適化する。" \
  "9バケット定義 / 5層IA (docs/QUICK_LOG_DESIGN.md) / 入力シート / 履歴学習ロジック / 外れ値処理。"

create_epic \
  "My Status Hub" \
  "my-status" \
  "priority: p1" \
  "6.6" \
  "現在地・目標・進捗を最小限で示すハブ画面 (Progressive Disclosure)。" \
  "ホーム表示 / 目標との差分表示 / 詳細への展開動線。"

create_epic \
  "振り返り (Home 横スワイプ + 週/月 統計)" \
  "review" \
  "priority: p1" \
  "6.7" \
  "Home 画面の横スワイプで過去日へ遡り、週次/月次の達成状況を可視化する。" \
  "日付ページャ / 過去 7 日遡及記録 / 週月 stats ビュー (PLAN.md 参照)。"

echo ""
echo "✅ エピック Issue の作成が完了しました。"
echo "次のステップ: GitHub Projects に追加してください (docs/github-projects-setup.md §7)。"
