# Hachibu — Legal Web

Hachibu の **プライバシーポリシー** と **利用規約** を Vercel で公開する静的サイト。

## 構成

- `public/privacy.html` — プライバシーポリシー
- `public/terms.html` — 利用規約
- `public/index.html` — ルートアクセス時のランディング
- `public/style.css` — 共通スタイル
- `vercel.json` — `outputDirectory: public`, `cleanUrls: true`

ビルドステップなし。`public/` 配下を Vercel がそのまま配信する。

## デプロイ

### 初回 (UI)

1. https://vercel.com で「Add New… → Project」。
2. このリポジトリをインポート。
3. **Configure Project**:
   - Root Directory: `web`
   - Framework Preset: `Other`
   - Build Command / Install Command: 空欄
4. Deploy。`<project>.vercel.app` が払い出される。
5. Project Settings → Domains で短いサブドメイン (例: `hachibu-legal`) に変更。

### 以降

`main` ブランチに push すれば自動デプロイ。プレビューは PR 単位で自動生成。

### CLI (任意)

```bash
npm i -g vercel
cd web
vercel link
vercel --prod
```

## 公開 URL (例)

- プライバシーポリシー: `https://<subdomain>.vercel.app/privacy`
- 利用規約: `https://<subdomain>.vercel.app/terms`

`cleanUrls: true` のおかげで `.html` 拡張子なしでアクセス可能。

## 更新フロー

1. `public/privacy.html` または `public/terms.html` を編集 (`<header>` 内の最終更新日も更新)。
2. **同時に** `expo/app/legal/privacy.tsx` / `expo/app/legal/terms.tsx` も同じ内容に揃える。
3. Commit → push。

両者の本文がズレないよう、テキスト変更は必ず両ファイルセットで実施する。
