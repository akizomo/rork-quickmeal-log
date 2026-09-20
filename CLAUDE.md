# Project Guidance

## 必読ドキュメント
- **[docs/PRD.md](./docs/PRD.md)** — プロダクトの北極星。機能・データ・UX方針・KPI・受け入れ条件を定義。
  - 実装・設計の意思決定は必ずこのPRDを参照すること
  - 議論によって変更が生じた場合は、PRDを更新してから実装する
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** — 実装状況と優先順位の正本。何を次にやるかは必ずここを見る。
  - **「次に何をするか」の議論を始める前に必ず読むこと。** §3.0 が現況 (実装済/到達不能/未実装) と実行順を持つ
  - **機能を実装・出荷したら、同じ作業の一部として §3.0 と該当レーンを更新する。** 「後でまとめて」にしない
  - **当初案と違う実装になったら差分を書く。** 黙って置き換えると設計判断の履歴が失われる
  - 状態は3層で書く: **「コード有」≠「到達可能」≠「実ユーザー検証済」**。grep で分かるのは1層目のみ
- **[PLAN.md](./PLAN.md)** — 実装仕様の詳細メモ (計算式・選択肢・UI構成の意思決定根拠)
- **[docs/BUILD.md](./docs/BUILD.md)** — EAS Build 手順 (GitHub Actions / ローカル CLI)・トラブルシュート・リリースノート規約。**ビルドを作成する際は必ずこのドキュメントに従う。**
- **[docs/PLAY_STORE.md](./docs/PLAY_STORE.md)** — Play Console 提出時の文言・カテゴリ・連絡先テンプレート
- **[docs/VOICE.md](./docs/VOICE.md)** — ブランドペルソナ・ライティングルール・USE/AVOID語彙。**UXコピーを書く・レビューする際は必ず参照すること。**
- **[docs/EXPERIENCE_DEPTH.md](./docs/EXPERIENCE_DEPTH.md)** — 体験軸ロードマップ。6つのコア体験 (①記録 / ②把握 / ③振り返り / ④実感 / ⑤継続 / ⑥納得) に機能をマッピングし、優先順位判断の補完ビューとして使う。

## プロジェクト概要
体型理解 × 目標設定 × 食事クイックログ最適化アプリ。Expo Router (React Native) 実装。

## ディレクトリ
- `expo/app/` — 画面 (Expo Router)
- `expo/components/` — 共通UI
- `expo/providers/app-state-provider.tsx` — アプリ状態
- `expo/constants/onboarding.ts` — オンボーディング定数
- `expo/types/nutrition.ts` — 型定義
- `expo/utils/goals.ts` — 目標計算ロジック

## デザインシステム運用ルール（必読）
UI の実装・修正を行う際は**必ず以下の順序**で参照すること。

0. **`expo/app/dev/` にトークン/コンポーネントのショーケース画面がある（一般的なデザインシステムに合わせた Foundations / Components 2系統構成）**
   - `/dev/foundations` — Colors / Typography / Spacing / Radius / Elevation / **Motion** の各ページ (`expo/app/dev/foundations/*.tsx`)。Motion は duration/easing/spring を実際にアニメーション再生して比較できる。
   - `/dev/components` — Buttons (Button/IconButton) / Inputs (NumberField/SelectCard/Chip) / Data Display (Typography/Card/Badge) / Overlays (Dialog/BottomSheet) の各ページ (`expo/app/dev/components/*.tsx`)。
   - 共通の `Section`/`NavList` 等の見た目ヘルパーは `expo/app/dev/_shared.tsx` (routing対象外)。
   - 新しいトークンやコンポーネントを追加・変更したら、**必ず該当カテゴリのページにも反映する**。LAN/Simulator/Web からそのまま確認できる。

1. **まず `expo/design-system/` を見る**
   - `tokens/primitives/` — colors, spacing, radius, elevation, typography の数値ソース
   - `tokens/semantic/light.ts` — surface/content/border/status など意味付きトークン
   - `components/` — Card, Chip, Button, Typography 等の既成部品
   - `theme/light.ts` — `useTheme()` で取得できる全トークンのルート
   - `constants/theme.ts` の `palette` は後方互換レガシー。**新規コードでは `useTheme()` を優先**

2. **既存トークンで表現できる場合はトークンを使う**
   - 色は**必ず semantic token** (`t.colors.surface.raised` / `t.colors.status.danger` / `t.colors.nutrition.calorie.within.text` 等、`design-system/tokens/semantic/light.ts`) を第一選択にする。
     - `colors.stone[300]` のような **primitive の直接参照は原則禁止**。primitive はあくまで semantic token の実装詳細であり、画面/コンポーネントから直接触らない。
     - legacy な `constants/theme.ts` の `palette` も同様に非推奨。`palette.X` が既存コードにあっても、対応する semantic token (`t.colors.*`) が使える文脈なら置き換える。
     - **最適な semantic token が存在しない場合、primitive にフォールバックしたり独自 hex を書いたりして黙って解決しない。** どんな意味の色が必要か (例: 「status.danger の淡い container 色」「暗背景上の warning アクセント」) を整理した上で、新規 semantic token を `tokens/semantic/light.ts` に追加すべきか**ユーザーに相談・提案する**。
   - **面(surface)はレイヤーモデルで選ぶ** (2026-07-30整理)。**色 = 同じ文脈内のレイヤー差、scrim+影 = 文脈そのものの切り替え**、という2チャネルに分離している。
     - 同じ文脈の中では、**レイヤーが上がるほど白に近づく**: `sunken`(ivory[300], 輝度0.858) < `default`(ivory[200], 0.898) < `raised`(ivory[50], 0.982)
       - `sunken` = 凹み。入力欄の地・トラック・非選択の塗り
       - `default` = 文脈の地。**ページ / シート / ダイアログすべてこれ**
       - `raised` = カード
     - **シート/ダイアログは「上のレイヤー」ではなく新しい文脈**。背景は `surface.default` に戻し、ページの上にあることは scrim と `elevation.xl` が表現する (`BottomSheet.tsx` / `Dialog.tsx` 参照)。こうすることでシート内のカードも `raised` を使えて、白の天井にぶつからない。
     - かつて存在した `surface.overlay` は「シート・モーダル用」と称しながら実際はシートに使われず、`default` より暗い汎用の地として使われていたため **`sunken` へ統合して削除済み** (値は同一のため見た目の変化なし)。
     - **`sunken` は高さの軸であって状態ではない。** pressed/hover 等のインタラクション状態に流用しないこと。現状 `Chip` / `SelectCard` / `goal-edit` の stepper が pressed に `sunken` を流用しており、これは state トークンへ分離すべき既知の負債 (未処理)。
     - カードに影が無いのは意図的なフラットデザイン。**影は「コンテンツの上に覆いかぶさるもの」にだけ付ける** (ボトムシート`xl` / トースト`lg` / ツールチップ`md` / スライダーつまみ`sm` / 押せる面の微かな持ち上がり`xs`)。レイヤーが一段上であることは色が担うので、カードに影は要らない。
   - 影は `elevation.xs / sm / md` を使う。SVG 内で影を手書きしない。
   - 角丸は `radius.xs(4) / sm(8) / md(12) / lg(16) / xl(20) / 2xl(24)`。用途別の目安 (実運用パターンから逆算):
     - `md(12)`: 小型カード・バナー・ツールチップ・リスト行 (他カードの中/隣に収まる密度の高い面)
     - `lg(16)`: ボタン的な選択タイル (SelectCard等)。**Buttonそのものはfullを使う (2026-07-30変更、下記参照)**
     - `xl(20)`: 大型サマリー/チャート/カレンダーカード、浮遊トースト
     - `2xl(24)`: 標準「カード」(design-system Cardコンポーネントの公式デフォルト)
     - `full(9999)`: **Button公式値**・ピル・バッジ・チップ・円形ボタン・トラック/フィルバー (丸系は数値一致より形状で判断する)。ボタンだけ角丸長方形にする積極的な理由がなく、アプリ内の自前実装ボタンの大半が既にfull相当だったため統一した
     - 非標準値 (14/18/22/28等) を見つけたら上記の役割に最も近いものへスナップする。visual diff は最大2px程度で許容範囲。
   - フォントサイズは `fontSize.xs(11)` が最小。9px・10px はシステム外。
   - **タイポグラフィで最初に選ぶのは「サイズ」ではなく「役割」**。役割が決まればサイズはほぼ一意に定まる (2026-07-29整理、WCAG AA実測ベース)。上から順に判定する:
     1. 読ませる文章か → `Body` (size="sm"13px / "md"15px既定 / "lg"17px)。本文・説明文・注釈文は**短くても必ずこれ**。"sm"がiOS Footnote相当
     2. UI要素の「名前」か → `Label` (size="sm"13px / "md"15px既定 / "lg"17px、semibold)。トグル名・フォーム項目名・リスト行の主見出し・統計カードの項目名など、文章ではない短い名詞句。MD3のLabelロールに相当し、`Button`のラベルも概念上は同じロール (Buttonは状態別文字色が要るため実装上はTextを直接組むが、fontSize/fontWeightはLabelと同じprimitiveを意図的に使う)
     3. 後続の複数項目をまとめるグループ見出しか → `Overline` (13px semibold + letterSpacing.wide)。設定画面の「データ」「情報」等
     4. 隣に主要素があって初めて意味を持つ添え物か → `Caption` (11px)。単位・軸ラベル・数値の添え字**のみ**
     - 見出しは `Heading` (lg〜display)。
     - `Body` と `Label` の境界は**文章か名前か**。**「ラベルなので太字にしたい」と思って `<Body weight="semibold">` と書いたら、それは `Label`。**
     - `Overline` と `Label size="sm"` は同じ13px/semiboldで差は letterSpacing のみ。**複数要素をまとめているか**で決める (まとめる=Overline / 単一要素の名前=Label)。
     - 「軸ラベル」の"ラベル"は `Label` ロールではない (添え物なので `Caption`)。
     - よくある誤り: 説明文に`Caption`を使う / セクション見出しに`Caption`を使う / ラベルを`Body weight="semibold"`で書く / ラベル用に生の`Text`+独自styleを作る → すべて上記の役割に差し替える
   - **本文域のフォントサイズスケールは 11 / 13 / 15 / 17 の4段のみ** (2026-07-29決定)。かつてあった `fontSize.caption1`(12) と `fontSize.callout`(16) は隣接段と1px差で「12と13のどちらか」を判断する基準を持てずドリフトの温床だったため、全参照を役割ベースで寄せた上で**削除済み**。中間サイズを足したくなったら、まず役割 (Body/Label/Caption) が足りているかを疑うこと。
   - 11pxの`Body`は存在しない (`size="xs"`は2026-07-29に廃止、`Caption`と同値で区別不能だったため)。文章を11pxにしたくなったら文量か階層を疑う。
   - `fontSize.display`(44px) を超える生の巨大数値 (例: `nutrition-ui.tsx` の `balanceHeroValue` 52px) が既に1箇所存在する。これはトークンへスナップせず「意図的なヒーロー例外」として現場でコメント明記する運用とした。同種の巨大数値が複数箇所に増えたら、その時点で primitive に `hero` 段を追加するかを検討する。
   - tone は `primary`(本文) / `secondary`(補助テキスト全般、AA準拠) の2段でほぼ足りる。`tertiary`は**非テキスト専用**(アイコン・placeholder・区切り線。3:1基準)であり、**テキストの色として使わない** (`content.tertiary`はWCAGの通常文字基準4.5:1を満たさない)。
   - スペースは `spacing` の 4px グリッドを使う。用途別の目安 (実運用パターンから逆算、詳細は `/dev/foundations/spacing`):
     - `0.5(2px)`: ごく僅かな微調整 (Badge sm の paddingV 等)
     - `1(4px)`: インライン要素間の詰めたgap (アイコン+ラベル、Chip内部のgap)
     - `2(8px)`: 標準の行内/リスト項目内gap。Dialog/BottomSheetの「隣接chromeがある側」の余白
     - `3(12px)`: リスト項目間のgap。Footerのtop padding。Chip/Badgeの横paddingの下限(sm)
     - `4(16px)`: カード内側の小要素のpadding。Footerの横/下padding。Button(sm)の横padding
     - `5(20px)`: 画面全体の外側padding (contentContainerStyle)。Cardコンポーネント公式paddingそのもの。Dialog/BottomSheetの横paddingと「隣接chromeが無い側」の余白
     - `6(24px)`: より余裕を持たせた画面padding。Button(lg)の横padding
     - `8(32px)`: 画面内の独立したセクション同士の縦rhythm
     - Dialog/BottomSheet のコンテンツ余白は「header/footerがある側は控えめ (spacing.2)、無い側はカード端に直接触れるので広め (spacing.5)」というルールで統一している (`Dialog.tsx` 参照)。同様の「カード端に接する要素」を作る際はこのパターンを踏襲する。
     - 非グリッド値 (6/10/14/18/22px等) を見つけたら上記の役割に最も近いトークンへスナップする。これらは 2px 内のズレで隣接グリッド点が等距離のため、**縮めると content clip リスクがある分、大きい側へ丸める (+2px: 6→8/10→12/14→16/18→20/22→24) のを既定**とする。app全体の既存ドリフト (約80箇所) は 2026-07-25 にこの規則で解消済み。新規実装では発生させないこと。
   - アニメーションは **必ず `duration` / `easing` / `spring` トークン** (`design-system/tokens/primitives/motion.ts`) を使う。
     - `Animated.timing({ duration: 200, easing: Easing.bezier(0.2, 0, 0, 1) })` のような生の数値・自前 bezier 定義は禁止。
     - `duration.fast(120)`=マイクロフィードバック、`short(200)`=退場、`medium(300)`=画面内遷移、`long(450)`=入場、`xlong(600)`=長い演出。
     - `easing.standard`=汎用/画面遷移、`enter`=入場(減速)、`exit`=退場(加速)。`spring.enter/exit/snap/pop` も同様に用途別。
     - **既存トークンと数値がほぼ同じ独自定義 (例: 独自の `MD3_STANDARD` 定数) を見つけたら、トークン側に寄せて重複を解消する。** 明確に異なるチューニングが必要な場合のみ、独自定数を保持してよいが、その理由をコメントで明記し、トークン名を騙る紛らわしい命名 (`MD3_*` 等) は避ける。
   - 生の RN `<Modal>` を直接使わない。モーダル/ボトムシートが必要な場合は必ず `design-system` の `Dialog`（中央配置）または `BottomSheet`（下からのシート）を使う。
   - **BottomSheet と TextInput のキーボードルール（違反するとキーボードがシートを隠す）**
     - TextInput を含む BottomSheet には必ず `keyboardAware={true}` を付ける。
     - `keyboardAware` は **iOS のみ機能する**（`keyboardWillShow` イベントでシートを translateY）。Android は Modal の `windowSoftInputMode="adjustResize"` 任せ。**「付ければ全 OS で動く」は誤り。**
     - **BottomSheet 内の TextInput を autoFocus / `setTimeout(() => ref.focus(), N)` で自動フォーカスしない。** シートの開くアニメーションとキーボードアニメーションが競合し、レイアウトが崩れる。ユーザーのタップで初めてキーボードが出る設計にする。
     - Dialog（中央配置）では auto-focus は許容される（キーボードがダイアログ下に出るため干渉しない）。BottomSheet に変換する際は必ず auto-focus を除去すること。
   - アイコン単体のタップ領域 (close/削除/前後ナビ等) は必ず `IconButton` (`design-system/components/IconButton.tsx`) を使う。`Pressable + Icon` の手書きは禁止。`variant`(ghost/filled) と `size`(sm/md/lg) と `tone`(secondary/tertiary/danger/action) で表現し、新しい組み合わせが要る場合は `IconButton` 側を拡張する。

3. **コンポーネントは既存の流用を優先する**
   - 新しい UI を作る前に、必ず `design-system/components/` (Badge, Button, Card, Chip, Dialog, Icon, IconButton, MacroChip, MealLogCard, NumberField, SelectCard, Typography 等) に流用できるものがないか確認する。
   - 既存コンポーネントの props / variant で表現できる場合はそれを使い、画面側でスタイルを個別に書き直さない。
   - **既存コンポーネントで賄えない新パターンが必要そうな場合は、実装前に「新規コンポーネントが必要か」をユーザーに相談・提案する。** 独断で一時しのぎの独自実装を作らない。
   - 相談の結果、新規作成が妥当と判断されたら、必ずトークン・既存コンポーネントをベースに構築し、実装後は `design-system/components/` に追加してシステムを進化させる。
   - **デザインシステムを一時的に迂回する独自実装は原則禁止**

4. **SVG コンポーネント（グラフ等）の特例**
   - SVG 内では `elevation`（影）が使えないため、浮き要素（ツールチップ等）は **ネイティブ View オーバーレイ** にして `elevation` トークンを適用すること
   - SVG 内の色・サイズ指定も `palette` または直接 `lightColors` から参照する

## 実装時の原則
- 体型分類: **9分類 (脂肪×筋量の2軸)** を採用する (PRD §3.2)
- 男女別SVG計18体で現在体型・目標体型を同一マトリクスで表現 (PRD §7)
- 現在体型は**自動推定**、目標体型は同じマトリクスからユーザー選択 (PRD §6.2, §6.3)
- 数値提案は Mifflin-St Jeor ベース、活動係数は内部固定 (PLAN.md §1)
- トーン: 静かな日本語ウェルネス。中立・非評価・非性的。

## 開発環境ルール
### 依存パッケージの追加・更新ルール (必読)
**背景**: 2026-08-20、`expo-localization` を `^57.0.1` (SDK 54 の正は `~17.0.9`) で追加したため、内部テスト配布版が splash 表示直後にクラッシュした。`tsc` も `jest` も Web 起動確認もすべて通っており、**実機ビルドまで誰も気づけなかった**。同種の事故を繰り返さないための規則。

- **Expo エコシステムのパッケージは絶対に `npm/bun add` で直接入れない。必ず `npx expo install <pkg>` を使う。**
  - `expo-*`, `react-native-*`, `@sentry/react-native`, `react`, `react-dom`, `react-native` が対象。
  - `expo install` は **インストール済み SDK に対応するバージョンを解決する**。`npm add` は latest を取りにいくため、SDK と無関係な別系列 (今回の 57.x) が入る。
  - 判断に迷ったら `expo install` を使う。Expo 管理外のパッケージに対しても安全に動作する (内部で npm/bun に委譲する)。
- **`package.json` の Expo 関連依存を手で編集しない。** バージョンを変えたいときも `npx expo install <pkg>` 経由にする。
- **ネイティブモジュールを追加したら、その config plugin が `app.json` の `plugins` に登録されているか必ず確認する。**
  - 未登録だとネイティブ初期化に失敗し、これ単体でも起動時クラッシュになる。今回 `expo-localization` が未登録だった。
  - `npx expo install --fix` は不足している plugin を自動追加してくれる。実行後は `git diff app.json` で必ず差分を見る。
- **依存を触ったら `bun run check:deps` (= `expo install --check`) を必ず通す。** CI (`.github/workflows/lint.yml`) でも実行され、不整合があれば落ちる。
  - 注意: `--check` は **`package.json` の範囲指定ではなく `node_modules` の実インストール版**を見る。package.json を手編集しただけの状態ではローカルの `--check` は素通りする (CI は `npm install` 後に走るので検出できる)。**ローカルで確認するときは必ずインストールを済ませてから実行する。** これも「手編集しない」理由のひとつ。
- **`expo install --check` / `--fix` の警告を「動いてるから」で無視しない。** メジャーが飛んでいる警告 (`expected version` と桁が違う) は**確実にクラッシュ要因**であり、警告ではなくエラーとして扱う。

#### 「Web で動いた」はネイティブの動作保証にならない
`bun run start-web` / Claude Preview で確認できるのは JS レイヤーだけ。**ネイティブモジュールのバージョン不整合・config plugin 欠落・権限設定漏れは Web では一切再現しない。**
- ネイティブ依存 (カメラ / 通知 / ヘルス / ロケール / IAP / Sentry 等) に触れた変更は、**Simulator/Emulator か実機ビルドで起動確認するまで「動いた」と言わない。**
- 特に **依存追加を含む変更を配布ビルドに乗せる前**は、`expo run:ios` / `expo run:android` でローカルネイティブ起動を1回通す。

### ngrok 禁止 (Woven AUP)
- **ngrok / Expo tunnel モードは絶対に使用しない**。Woven の Acceptable Use Policy で禁止されている。
- `expo start --tunnel`, `bun run start -- --tunnel`, `bunx ngrok ...`, `@expo/ngrok` の手動起動はすべて禁止。
- 提案・実行・スクリプト追加・ドキュメント記載のいずれにおいても ngrok / tunnel モードを推奨してはならない。
- 実機確認は **LAN モード** (`bun run start` = `--lan`)、**Simulator/Emulator** (`bun run start:ios` / `start:android`)、または **Web** (`bun run start-web`) を使う。
- LAN が通らない場合の最終手段は **EAS Build internal distribution** (TestFlight / APK 配布)。tunnel に逃げない。
