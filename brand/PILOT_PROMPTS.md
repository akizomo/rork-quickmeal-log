# Hachibu — Pilot Asset Production Prompts

各カテゴリ (A / B / C) のパイロット 1 点を制作するためのプロンプト集。
それぞれを単独で別の Claude セッション (または外部デザイナー) に渡して着手できる。

> **共通前提**:
> - 必ず最初に `brand/ASSET_BRIEF.md` を読み、Source of Truth と色相役割を内面化する
> - DS トークン値 (`expo/design-system/tokens/primitives/colors.ts` ほか) と一致させる
> - ロゴは `brand/assets/mark.svg` / `brand/assets/lockup_horizontal.svg` を改変しない (引用のみ)
> - 8 番目のドット (20% 不透明度) と 16px 以下フォールバック (7 ドット版) の制約を遵守
> - ngrok / `expo start --tunnel` は禁止 (Woven AUP)。LAN モード or Simulator/Web を使用

---

## Pilot A — ストアスクショ (iPhone 6.7" / Home)

```
あなたは Hachibu の App Store スクリーンショット制作を担当します。
リポジトリ `rork-quickmeal-log` で作業し、以下のパイロット 1 点を納品してください。

【必読】
1. brand/ASSET_BRIEF.md (全文)
2. brand/Hachibu_BrandBook.pdf
3. expo/design-system/README.md
4. expo/design-system/tokens/primitives/colors.ts
5. docs/PRD.md (該当画面のトーン確認)

【パイロット仕様】
- カテゴリ: A. ストア・配信用スクリーンショット
- 対象画面: Home (Today) — Quick Log と PFC リングが見える状態
- サイズ: 1290 × 2796 (iPhone 16 Pro Max 6.7")
- 形式: PNG (sRGB)、納品先 `brand/assets/store/ios/`
- ファイル名: `store_iphone67_home_v1_1290x2796.png`

【制作手順】
1. iOS Simulator を iPhone 16 Pro Max で起動
   - `cd expo && bun install`
   - `bun run start:ios` (LAN モード、tunnel 禁止)
2. オンボーディングを完了させ、Home (Today) 画面で以下を満たす状態を作る:
   - Quick Log に最低 2 件記録済み
   - PFC リングが部分的に埋まっている
   - 日付は今日
3. Simulator のステータスバーをクリーン化:
   `xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`
4. スクリーンショット取得 (1290×2796 のままで保存):
   `xcrun simctl io booted screenshot /tmp/raw_home.png`
5. 上部 280px に帯を追加し、以下のオーバーレイテキストを配置:
   - 英ヘッドライン: "Eight tenths is enough."
   - 日本語サブ: "八分でいい。"
   - フォント: Plus Jakarta Sans Bold (44px) + Regular (20px)、letter-spacing -0.3
   - 帯背景: ivory[200] (#F6F3EC)、テキスト: stone[900] (#1C1C1A)
   - 合成は `sharp` (npm) もしくは `magick` で行う:
     ```bash
     bun x sharp-cli -i /tmp/raw_home.png \
       composite -i overlay.svg --top 0 --left 0 \
       -o brand/assets/store/ios/store_iphone67_home_v1_1290x2796.png
     ```
6. 仕上がり確認:
   - 1290×2796 のまま、jpegイズなし、文字の anti-aliasing が滲んでいない
   - ロゴは画面内に直接出さない (アプリ UI 自体がロゴ代わり)

【受け入れ条件】
- ASSET_BRIEF の Do/Don't に違反していない
- DS の ivory[200] / stone[900] と完全一致
- ステータスバーが 9:41 / 充電満タンに統一されている
- 日本語フォントが iOS のシステムフォントにフォールバックせず Plus Jakarta Sans の英文と並んで違和感なし

【やらないこと】
- アプリ画面そのもののコード変更
- ロゴ画像のオーバーレイ (帯テキストのみ)
- 過剰な装飾 (グラデーション・影・エフェクト)
- ngrok / tunnel モードの使用
```

---

## Pilot B — OGP (1200 × 630)

```
あなたは Hachibu の OGP 画像制作を担当します。
リポジトリ `rork-quickmeal-log` で作業し、以下のパイロット 1 点を納品してください。

【必読】
1. brand/ASSET_BRIEF.md (全文)
2. brand/assets/lockup_horizontal.svg (引用元、改変禁止)
3. brand/Hachibu_Logo_Final.pdf
4. expo/design-system/tokens/primitives/colors.ts
5. expo/design-system/tokens/primitives/typography.ts

【パイロット仕様】
- カテゴリ: B. SNS / OGP / プレス素材
- 用途: リンクシェア統一画像 (X / Threads / Slack / GitHub README / Notion)
- サイズ: 1200 × 630 (PNG, sRGB)、SVG ソースも併納品
- 配置先: `brand/assets/social/ogp/`
- ファイル名: `social_ogp_default_v1_1200x630.png` / `.svg`

【デザイン仕様】
- 背景: ivory[200] (#F6F3EC) 全面
- 中央左寄せに lockup_horizontal を高さ 200px で配置 (左 marginは 96px)
- lockup の右側に縦書き 8 番目のドット 20% 不透明度の装飾 (3×3 グリッド、bottom-middle のみ薄)
- 下端に sage[800] (#355E52) で 6px の細い水平線、その下に余白 32px
- タグライン: 右下に 2 行
  - 英: "Eight tenths is enough."  fontFamily=PlusJakartaSans Bold, size=32, color=stone[900]
  - 日: "八分でいい。"  size=18, color=stone[600] (#6E776E), letter-spacing 0.6
- 全体に 1px ivory[600] (#DDD5C7) の枠線 (印刷時のトリム保険)

【制作手順】
1. SVG を手書き (1200×630 viewBox)
2. lockup_horizontal.svg は <use> または直接インライン展開
3. SVG → PNG 書き出し:
   `bun x sharp-cli -i social_ogp_default_v1.svg -o social_ogp_default_v1_1200x630.png`
4. 視認性チェック: 200×105 サムネにリサイズしても "Hachibu" が判読可能であること

【受け入れ条件】
- HEX が DS と完全一致 (#F6F3EC, #1C1C1A, #6E776E, #355E52, #DDD5C7)
- lockup の縦横比は元 SVG を維持 (改変なし)
- 英・日タグラインの行間が窮屈でない
- PNG は 1200×630 ジャストサイズ、フィット計算なし

【やらないこと】
- lockup の色変更や変形
- グラデーション・写真背景・装飾フレーム
- 8 番目のドット以外のドット模様追加
- 絵文字・スタンプ・キャラクター
```

---

## Pilot C — 空状態イラスト (Today 未記録)

```
あなたは Hachibu のアプリ内イラスト制作を担当します。
リポジトリ `rork-quickmeal-log` で作業し、以下のパイロット 1 点を納品してください。

【必読】
1. brand/ASSET_BRIEF.md (全文)
2. expo/components/Logo.tsx (8 番目のドット実装の参照)
3. expo/design-system/tokens/primitives/colors.ts
4. expo/design-system/README.md (色相役割)
5. expo/app/index.tsx (空状態が出る画面)

【パイロット仕様】
- カテゴリ: C. アプリ内 イラスト・アイコン variant
- 用途: Home (Today) で当日の記録が 0 件のときのプレースホルダー
- 形式: SVG (primary) + PNG @1x/@2x/@3x (160×160 / 320×320 / 480×480)
- 配置先: `brand/assets/illustrations/empty/`
- ファイル名:
  - `illustration_empty_today_v1.svg`
  - `illustration_empty_today_v1_160.png` / `_320.png` / `_480.png`

【デザイン仕様】
- viewBox: 0 0 160 160
- 中央に直径 96 の円 (塗り: ivory[300] #F3EEE4、stroke なし)
- 円内に 3×3 ドットグリッド (1 ドット直径 12、ピッチ 24)
  - 全体は stone[800] (#30352F) で stroke なしの塗り
  - 右下セル (row=2, col=2): なし (ロゴ仕様の踏襲)
  - 下中央セル (row=2, col=1): 不透明度 20% (8 番目のドット)
- 円の右下外側に小さな破線円 (直径 36、stroke=sage[400] #9AB594、stroke-width=1.5、stroke-dasharray="3 3")
  - 「これから埋まっていく」余白を象徴
- 文字は含めない (画面側で「今日の記録はまだありません」等を表示)

【制作手順】
1. SVG を手書き (160×160 viewBox、装飾は SVG primitives のみ)
2. 描画は <circle> と <rect> のみで完結させる (path は使わない)
3. PNG 3 サイズ書き出し:
   ```bash
   for s in 160 320 480; do
     bun x sharp-cli -i illustration_empty_today_v1.svg \
       resize $s $s \
       -o illustration_empty_today_v1_${s}.png
   done
   ```
4. ダークモード対応: 別バリアント `_dark.svg` (ivory[300] → ivory[800] #403A2E、stone[800] → ivory[100]) も任意で同梱可

【受け入れ条件】
- 8 番目のドットが 20% 不透明度で正しく表現されている
- 16px サムネにしても破線円が崩れない
- HEX が DS の primitives と完全一致
- SVG は 5KB 以下、PNG は透過

【やらないこと】
- キャラクター・顔・絵文字を含めない
- グラデーション・影・blur フィルタの使用
- ロゴそのものの埋め込み (構成要素の引用は OK、シンボルとしては別物)
- 動的アニメーションの想定 (静止画として完結)
```

---

## レビュー手順 (3 点パイロット完成後)

1. 3 ファイル + ソースを `brand/assets/{store|social|illustrations}/` に配置
2. ASSET_BRIEF §7「受け入れ条件」の 4 項目を逐一照合:
   - DS トークン一致
   - ロゴ仕様遵守 (20% / 7 ドット版)
   - 命名規則 / 配置先一致
   - Don't 違反なし
3. 違反があれば該当プロンプトを修正して再生成
4. 全カテゴリ OK → 残りアセットへ横展開する制作プロンプトを派生作成
