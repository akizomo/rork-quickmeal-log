# シート/ダイアログの iOS 標準化 (formSheet 移行) 計画

> 2026-10-17 作成。App Store リリース前に実施する方針 (ユーザー決定)。
> 発端: TestFlight 実機で「量調整ダイアログが開かない」「シートとキーボードが連動しない」「検索シートがはみ出す」が出た ([APP_STORE.md](./APP_STORE.md) 🐛節)。2026-10-17 の対症修正は入れたが、根は **シート/ダイアログが RN `<Modal>` (別ウィンドウ) で自作されていること**。
>
> 状態は3層で書く: コード有 ≠ 到達可能 ≠ 実ユーザー検証済。

---

## 1. なぜ移行するか (いまの構造の問題)

| 問題 | 原因 | 移行後 |
|---|---|---|
| 兄弟配置の Modal が iOS で開かない | iOS は表示中の Modal の「隣」に別 Modal を出せない。重ね順がコンポーネントの置き場所に依存 | ネイティブスタックが提示順を管理。**どの画面からでも上に積める** |
| Android でシートがキーボードを避けられない | RN Modal は Activity の `adjustResize` を継承しない別 Window (CLAUDE.md 既知制限) | Android もプラットフォーム標準の bottom sheet 挙動 |
| キーボード追従を `keyboardAware` で opt-in | 付け忘れると追従しない (実際に4か所漏れていた) | iOS のネイティブシートは自動で追従 |
| 見た目・ジェスチャーが自作 | spring・ドラッグ閾値・scrim を自前で再現 | detent・グラバー・スワイプ閉じ・背景の縮小が OS 標準 |

## 2. 技術前提 (2026-10-17 確認)

- expo-router **6.0.24** / react-native-screens **4.16.0** (追加の依存なし。いま入っている版で `presentation: 'formSheet'` が使える)
- 使えるオプション: `sheetAllowedDetents` (`[0.5, 1]` などの比率 or `'fitToContents'`) / `sheetInitialDetentIndex` / `sheetGrabberVisible` (iOS) / `sheetCornerRadius` / `sheetLargestUndimmedDetentIndex` / `sheetExpandsWhenScrolledToEdge` (iOS)
- **制約 (要スパイク)**
  - **SDK 54 では、数値 detent のシート内で `flex: 1` が iOS で効かない** (Expo 公式: SDK 55 以降で対応)。背の高いシート (IdentityLogSheet 等) のレイアウトが組めるかが最大の不確定要素
  - `fitToContents` は `flex: 1` 不可。中身の高さを明示する必要がある
  - formSheet 内では **ネイティブヘッダーが出ない** (title / header ボタンは中身側で描く) — いまの BottomSheet も自前ヘッダーなので影響小
  - Android は detent 最大3つ
  - **キーボードの挙動は公式ドキュメントに記載なし**。iOS は UIKit のシートなので追従する想定、Android は要実測
- **RN `<Modal>` を残す場合の注意**: ネイティブシートの上に出す Modal は、**そのシート画面の中で描画する**こと。`_layout.tsx` のようなルートに置いた Modal は、シート表示中に開けない (今回と同じ症状になる)

## 3. 影響範囲 (棚卸し)

### 3-1. BottomSheet 利用 (11か所)
| シート | 場所 | 開き方 | 移行先案 | 備考 |
|---|---|---|---|---|
| **SearchSheet** | QuickLogSection | state | **下層ページ (push)** + ナビゲーションバーの検索フィールド (`headerSearchBarOptions`) | iOS 標準の検索 UI。検索 → 食品選択 → シート → 閉じると検索ページに戻る、が「戻る」で成立し `onDismiss` 再オープンの仕組みが不要に |
| DirectInputSheet | SearchSheet 内 | state | 検索ページから push or formSheet | 検索の下層化と同時に決める |
| **IdentityLogSheet** (833行) | `_layout.tsx` グローバル | `openIdentityLogSheet()` + onDismiss コールバック (app-state) | formSheet ルート `/log/identity?bucket=&identityId=&editingLogId=` | 最大の山。コールバック → ルートパラメータ + app-state への直接書き込みに置き換え |
| DishQuickEntrySheet | `_layout.tsx` グローバル | app-state | formSheet ルート | 中の AmountEditDialog も同時に |
| LogEditorSheet | HomeScreen | state | formSheet ルート `?logId=` | |
| ExerciseSheet | StatusCard | state | formSheet (`fitToContents`) | |
| WeeklyBalanceSheet | StatusCard | state | formSheet (`fitToContents`) | |
| 体重 / 体脂肪 入力 ×4 | status.tsx ×2, BodyStatsView ×2 | state | formSheet (`fitToContents`) 1ルートに共通化 | 同じ UI が2画面に重複しているのも解消できる |

### 3-2. Dialog 利用
| ダイアログ | 移行先案 |
|---|---|
| 週の収支「やめる」確認 ×2 (StatusCard) | **`Alert.alert`** (iOS 標準のアラート。破壊的ボタンは `style: 'destructive'`) |
| balance-modal (収支の説明) | formSheet (`fitToContents`) |
| AmountEditDialog (TextInput 自動フォーカス) | 第一候補: 呼び出し元シートの中で Dialog のまま (ネスト)。第二候補: formSheet `fitToContents` + iOS のキーボード追従に任せる (Android の挙動はスパイクで確認) |
| search-misses の Dialog | 開発者向け画面。最後に Alert 化 |
| app/modal.tsx | テンプレート残骸。削除候補 |

### 3-3. 付随して変わるもの
- **FloatingFeedback (トースト)**: いまはシートより上に出すため別 Modal に載せている。ネイティブシートの上に出すには iOS で react-native-screens の `FullWindowOverlay` が必要 (要スパイク)
- **design-system**: `BottomSheet` から Modal・アニメ・ジェスチャーを外し、「シート画面のレイアウト (ヘッダー・本文・フッターの余白)」だけを担う部品 (例: `SheetScreen`) に作り替える。`Dialog` は残すが用途を限定
- **/dev ショーケース** (`app/dev/components/overlays.tsx`) の Overlays ページ
- **CLAUDE.md** の「生の Modal を使わない」「BottomSheet と TextInput のキーボードルール」節を書き換え
- **テスト**: testID (`search-sheet`, `ils-*` 等) を参照するテストがあれば追従

## 4. 段取り

| Phase | 内容 | 完了条件 |
|---|---|---|
| **0. スパイク** (最初に必ず) | 体重入力シート (小・`fitToContents`) と IdentityLogSheet 相当の背の高いダミー (数値 detent) の2本だけ formSheet で作り、**iOS 実機と Android 実機**で確認: キーボード追従 / `flex` レイアウト / スワイプ閉じ / シートからシートを開く / シート上の Dialog / シート上のトースト / ダークモード | 判定表を埋めて Go / No-Go。**No-Go 要因が SDK 54 の `flex` 制約だけなら、SDK 55 への更新を先にやるか決める** |
| 1. 土台 | `SheetScreen` 部品、シート用ルートグループ、「結果を返す」パターン (コールバック → app-state)、トーストの `FullWindowOverlay` 化 | 体重/体脂肪シートが新方式で動く |
| 2. 検索の下層ページ化 | SearchSheet → push ページ + ネイティブ検索バー、DirectInput の行き先 | 検索 → 記録 → 戻る が自然につながる |
| 3. 記録系シート | IdentityLogSheet / DishQuickEntrySheet / LogEditorSheet (+ AmountEditDialog の扱い確定) | 主要な記録導線が新方式 |
| 4. 小物 | Exercise / WeeklyBalance / balance-modal、確認ダイアログ → `Alert.alert` | RN `<Modal>` の利用がゼロ (or 理由付きの例外のみ) |
| 5. 後片付け | 旧 BottomSheet 実装削除、CLAUDE.md・/dev・ROADMAP 更新 | ドキュメントと実装が一致 |

各 Phase の確認は **iOS と Android の両方の実機**で行う ([BUILD.md](./BUILD.md) の testflight / preview プロファイル)。

## 5. リスクと判断ポイント

- **実機確認の往復コスト**: ローカルの Xcode 27 では起動直後に落ちるため ([APP_STORE.md](./APP_STORE.md) ⚠️節)、いまは確認のたびに EAS ビルド (20〜40分) が要る。移行は試行回数が多いので、**先に手元へ Xcode 26 を併用インストールして Simulator で回せるようにする**ことを強く推奨
- **SDK 54 の `flex` 制約**: スパイクで背の高いシートが組めなければ、SDK 55 へ上げてから移行するか、背の高いシートだけ下層ページ (push) にする
- **Android のキーボード**: formSheet でも避けられない場合、入力のあるシートは Android だけ下層ページにする等の分岐を検討
- **リリース時期**: Phase 0〜5 の分だけ初回審査提出が後ろにずれる。Phase 0 の結果で全体の見積もりを出し直す
- **記録導線は毎日使う中核 UX**: 移行中に壊すと影響が大きい。Phase ごとにコミットを分け、いつでも戻せるようにする

## 6. Phase 0 スパイク判定表

**実装 (2026-10-17)**: `expo/app/spike/` (使い捨て。移行完了時にディレクトリごと削除)。テストビルド (`testflight` / `preview` / dev) の **設定 > 開発者向け > Sheet spike** から開く。状態: コード有・tsc/i18n/lint 通過・Web で描画確認のみ。**ネイティブ挙動は未確認**。

| # | 確認項目 | 画面 | iOS | Android |
|---|---|---|:---:|:---:|
| 1 | 小シートが中身の高さで開く (`fitToContents`) | A | ○ | |
| 2 | 自動フォーカスでキーボードが出て、**シートごと押し上げられ**「保存して閉じる」が見える | A | ○ | |
| 3 | 400ms の自動フォーカスでアニメと競合しない (競合するなら何 ms 必要か) | A | ○ | |
| 4 | シート上で `Dialog` (RN Modal) が開く | A | ○ (閉じるとフォーカス・キーボードも復帰) | |
| 5 | `Alert.alert` の見た目・破壊的ボタンの赤 | A | ○ | |
| 6 | トーストがシートの**上**に出る (`FullWindowOverlay`) | A / B | ○ | |
| 7 | 背の高いシートで **flex: 1 の本文スクロール + 固定フッター**が成立する (SDK 54 制約) | B | × フッターが画面外へはみ出す | |
| 8 | 7 が崩れる場合、「高さ明示」切替で成立するか | B | △ フッター固定は成立。ただし **ScrollView の中身全体が上へずれて描画** (react-native-screens のバグ。§7) | |
| 9 | 50% / 100% の detent 間をドラッグできる・本文スクロールと喧嘩しない | B | | |
| 10 | 本文最下部のメモ入力がキーボードに隠れない | B | △ 最大 detent ではシートは持ち上がらないが、`automaticallyAdjustKeyboardInsets` で入力欄はキーボード上へスクロールされる (フッターは隠れる = iOS 標準と同じ) | |
| 11 | シート B の上にシート A を積める → 閉じると B に戻り状態 (選択チップ) が残る | B | | |
| 12 | 下スワイプで閉じる / 背景タップで閉じる | A / B | ○ (スワイプ。キーボード表示中は閉じない) | |
| 13 | 検索ページで検索フィールドに自動フォーカスし、入力で絞り込める | C | | |
| 14 | 結果タップ → シート B → 閉じると**検索語が残ったまま**検索ページに戻る | C | | |
| 15 | 戻るボタン / 左端スワイプでホームへ戻る | C | | |
| 16 | ダークモードで背景・角丸・グラバーが破綻しない | A / B / C | | |

判定: 1〜2, 4, 7 or 8, 11, 13〜14 が両 OS で ○ なら **Go**。7・8 とも × なら SDK 55 更新の要否を決める。2・10 が Android だけ × なら、入力のあるシートは Android のみ下層ページにする案を検討。

### 6-1. iOS 結果メモ (2026-10-17, Xcode 26.6 ビルド / iOS 26.5 Simulator)
- 環境: ローカル Xcode 26 併用で Simulator 確認が可能になった (Xcode 27 ビルドの起動クラッシュは再現せず = SDK 起因の見立てが確定)。EAS ビルド枠は不使用
- **小さいシート (fitToContents) は iOS 標準そのものの挙動で、移行の価値が高い**: キーボード追従・Dialog/Alert/トーストの重ね・スワイプ閉じがすべてそのまま動く
- **背の高いシートは SDK 54 では素直に組めない**: flex 不可、高さ明示でも複数行テキストの描画ずれ、最大 detent でのキーボード回避は自前対応が要る
- 未確認: 9 (detent 間ドラッグ) / 11 (シートからシートを積む) / 13〜15 (下層検索ページ) / 16 (ダーク) / Android 全項目
- 既存実装 (2026-10-17 修正分) の確認: 体重入力シート (BottomSheet + keyboardAware) はキーボード上にシートが乗り Save も見える = ○

## 7. 背の高いシートの不具合調査と SDK 更新の判断材料 (2026-10-17)

### 7-1. 原因の切り分け (iOS 26.5 Simulator / react-native-screens 4.16)
| 実験 | 結果 | わかったこと |
|---|---|---|
| ヘッダー・本文・フッターに onLayout ログ + 背景色 | レイアウト値は正しい (header y0 h56 / ScrollView y56 h645 / 本文先頭テキスト y20 h40) | Yoga の計算は正常。**描画位置だけがずれる** |
| 500ms 後に ScrollView を key で作り直す | 変化なし | 初回計測のタイミング問題ではない |
| `contentInsetAdjustmentBehavior="never"` + `automaticallyAdjustContentInsets={false}` | 変化なし・onScroll も発火せず (offset 0) | iOS の自動 inset 調整ではない |
| `sheetExpandsWhenScrolledToEdge: false` | 変化なし | — |
| ヘッダーを外し ScrollView を先頭の子にする | **ScrollView の中身が丸ごと描画されなくなる** | formSheet が中の ScrollView を特別扱い (取り込み) して描画を壊している = **react-native-screens 側のバグ** |
| `automaticallyAdjustKeyboardInsets` | 入力欄はキーボード上までスクロールされる (○)。ただしスクロールした中身がヘッダーの上へはみ出して描画される | キーボード回避自体はこの1行で解決できる。はみ出しは上と同じバグ |

結論: **書き方の工夫では回避できない、ライブラリ側の不具合**。react-native-screens の更新履歴に該当しそうな修正がある:
- 4.29.0: "skip form sheet scroll view frame correction once the screen is invalidated" (#4652) / "stop form sheet from resizing a recycled scroll view" (#4791)
- 4.30.0: "use native screen origin as shadow tree offset" (#4725) ← 「計算は正しいのに描画位置がずれる」症状と一致

### 7-2. どの Expo SDK でその修正が入るか (bundledNativeModules.json で確認)
| SDK | react-native-screens | 上記修正 | 備考 |
|---|---|:---:|---|
| 54 (現行) | 4.16 | なし | **SDK 54 は SDK 58 リリース (2026-10-15) で重要修正の提供が終了** |
| 55 | ~4.23 | **なし** | Xcode 26 必須・旧アーキテクチャ廃止 |
| 56 / 57 | ~4.26 | **なし** | iOS 最低 16.4 (56〜)。57.0.23 で Scene 対応を opt-in |
| **58** (2026-10-15) | **~4.30** | **あり** | RN 0.88 / **Scene ライフサイクル標準 = Xcode 27 でビルド可** / Sentry RN 8 系・WebView 14 系へ |

→ **「SDK 55 に上げればシートが直る」は成り立たない**。直る見込みがあるのは SDK 58 のみ (ただし実機・Simulator での確認はまだ。更新履歴からの推定)。

### 7-3. 選択肢
| 案 | 内容 | 良い点 | リスク |
|---|---|---|---|
| **A. SDK 58 に上げてから全面移行** | 54 → 58 を一気に更新 → 背の高いシートも formSheet 化 | シートの不具合が直る見込み / Xcode 27 が使える (Xcode 26 併用が不要に) / サポート切れの解消 | **リリース2日目の SDK**。4 メジャー分の破壊的変更 (Expo Router のナビゲーション刷新・iOS 16.4 未満切り捨て・expo-file-system 非同期化 等)。react-native-health / RevenueCat / 自前 config plugin (Health Connect・Pods・Widget) の互換は未確認。**全機能の再確認が必要で、初回審査が大きく遅れる** |
| **B. 小さいシートと検索だけ先に移行、背の高いシートは現行のまま出す** | fitToContents の小シート (体重/体脂肪・週の収支・運動・確認ダイアログ→Alert) と検索の下層ページ化だけ SDK 54 で移行。IdentityLogSheet 等は 2026-10-17 修正済みの BottomSheet のまま審査へ | 小シートは iOS 標準そのもので確認済み (§6)。リリースを大きく遅らせない | 背の高いシートは自作 BottomSheet のまま (Android のキーボード制限も残る)。SDK 54 はサポート切れのまま審査に出す |
| C. SDK 55〜57 に上げる | — | — | **シートの不具合は直らない**。更新コストだけかかる。選ぶ理由がない |

### 7-4. 推奨
**B → リリース後に A**。
- 初回審査は「小シート + 検索ページ」の移行と、2026-10-17 の不具合修正で出す
- リリース後、SDK 58 が 58.0.x で落ち着いたら (目安 2〜4 週) 別ブランチで 54 → 58 を更新し、まず本スパイク B を再実行して #4725 系の修正で描画ずれが消えるか確認 → 消えたら背の高いシートを移行
- **期限**: Apple は例年 4 月に「最新 SDK でのビルド」を提出要件にする。iOS 27 SDK が必須になる 2027 年春までに SDK 58 以上への更新は避けられない (Scene ライフサイクル対応のため)

### 7-5. 量調整ダイアログ (AmountEditDialog) の扱い (2026-10-17 検討)
- 方向性としては formSheet (`fitToContents` + 数字キーボード右上の「保存」カプセル) が合う。体重入力と同じ形で、中央 Dialog よりも iOS 標準に近い
- **ただし今は移せない**: 呼び出し元の IdentityLogSheet / DishQuickEntrySheet が背の高い BottomSheet (RN `<Modal>`) のまま。ネイティブ formSheet はナビゲーションの画面から出るので、RN Modal の**上には出せない** (UIKit は表示中の Modal がある画面から別の画面を出せない。今回「量調整が開かない」と同じ種類の不具合になる。未検証の推定)
- → **SDK 58 で背の高いシートを formSheet 化するときに一緒に移す**。そのとき「値を呼び出し元へ返す」仕組み (今は `onClose(next)` コールバック) をルートのパラメータ + 状態への直接書き込みに置き換える
- それまでは 2026-10-17 の修正 (シートの子として描画するネスト Modal) で運用

### 7-6. SDK 58 での再検証 (2026-10-18, sdk-58-upgrade ブランチ / Xcode 27.1 / iOS 27.1 Simulator)
- **起動**: Xcode 27 でビルドしたアプリが iOS 27 で正常に起動 (SDK 58 の Scene ライフサイクル対応で、SDK 54 の起動直後クラッシュは解消)
- **背の高い formSheet (スパイク B)**: SDK 54 で出ていた問題がすべて解消
  - 本文先頭が見出しの上にはみ出して描画される不具合 → **解消** (react-native-screens 4.30 の修正と一致)
  - `flex: 1` の本文スクロール + 固定フッター → **成立** (SDK 54 ではフッターが画面外へはみ出していた)
  - 最下部の入力欄 → `automaticallyAdjustKeyboardInsets` でキーボードの真上までスクロールされ、描画ずれも無し
- 結論: **背の高いシート (IdentityLogSheet / DishQuickEntrySheet / LogEditorSheet / 検索) も formSheet に移行できる**。量調整ダイアログ (§7-5) も同時に移せる
- 既存の BottomSheet 実装 (検索シート + キーボード、2026-10-17 の修正) も SDK 58 で表示崩れなし
- 未確認: Android 全般 (android/ の作り直しが未了)、HealthKit の許可ダイアログと実データ取得

## 8. 全面移行 (2026-10-18, sdk-58-ios-sheets ブランチ)

状態: コード有・tsc / jest / i18n 通過。iOS 27 Simulator での確認は §8-3 (Android は未確認)。

### 8-1. 移行先の対応表
| 旧 | 新 | 種別 |
|---|---|---|
| IdentityLogSheet (BottomSheet, グローバル) | `/log-identity` | tallSheetOptions + TallSheetScreen |
| DishQuickEntrySheet (BottomSheet, グローバル) | `/dish-entry` | 同上 |
| LogEditorSheet (BottomSheet, HomeScreen) | `/log-editor` | 同上 |
| ExerciseSheet (BottomSheet, StatusCard) | `/exercise?dateKey=` | 同上 |
| AmountEditDialog (Dialog) | `/amount-edit` (`openAmountEditor()`) | formSheetOptions + SheetScreen。数字キーボード右上の「保存」カプセル |
| 体重 / 体脂肪 (BottomSheet ×4) | `/record-body?kind=` (10-17 済) | 同上 |
| DirectInputSheet (BottomSheet) | `/direct-input` | 同上 |
| BalanceModal (Dialog) | `/balance` | 同上 (右上 ×) |
| WeeklyBalanceSheet (BottomSheet) | `/weekly-balance` | 同上 |
| 週の収支「やめる」確認 (Dialog ×2) | `Alert.alert` (destructive) | iOS 標準アラート |
| SearchSheet (BottomSheet) | `/search` (下層ページ) | `headerSearchBarOptions` (UISearchController) |
| 見つからなかった食品の編集 (Dialog) | `/search-miss-edit?q=` | formSheetOptions + SheetScreen |
| app/modal.tsx (テンプレートの残骸) | 削除 | — |

アプリ本体 (app/ と components/) の RN `<Modal>` / `BottomSheet` / `Dialog` の利用は **ゼロ**。両部品は /dev の比較用に残す (削除は Android での確認後に判断)。

### 8-2. 値の受け渡し
- 開閉の状態を app-state が持っていたもの (記録シート / 一皿料理 / ログ編集) は、**状態はそのまま**にして、開くときにルートを push、状態が閉じたらルートが `router.back()`、スワイプで閉じられたらルートのアンマウント時に状態を閉じる (`app/log-identity.tsx` 等)
- 量入力の結果は `openAmountEditor({ onDone })` (zustand の小さなストア) で返す
- StatusCard が計算した値 (収支・週の収支) は `utils/sheet-props.ts` で渡す
- 旧 `openIdentityLogSheet({ onDismiss })` の「キャンセルで検索シートを開き直す」は、検索がページになり記録シートを閉じれば検索に戻るので使わなくなった (仕組みは残置)

### 8-x. 背の高いシートの描画ずれ: SDK 58 でも「書き方」で防ぐ必要があった (2026-10-18)
§7-6 のスパイク B は正常に見えたが、`TallSheetScreen` (見出し + `flex: 1` の ScrollView + フッター) では SDK 58 でも本文が見出しの上へ約 70pt はみ出して描画された。
- **原因**: react-native-screens は formSheet 内の ScrollView の frame を「シート全体」に補正する (`RNSScreen.mm` `applyFrameCorrectionForDescendantScrollView`)。ScrollView が画面直下の子でない場合は `setFrame:self.frame` のフォールバックになり、Yoga が置いた位置 (見出しの下) が無視される。
- **効果が無かった対処**: ScrollView を View で包む / `sheetExpandsWhenScrolledToEdge: false` / 初期 detent の変更 / 横スクロールのチップ列を外す / 見出しに `collapsable={false}`。
- **効いた対処**: ScrollView を画面直下の最初の子にして `absoluteFill`、見出しとフッターは 1 枚のオーバーレイ (`pointerEvents="box-none"`) にして ScrollView の上に重ね、実測した高さを本文の余白 (`paddingTop` / `paddingBottom`) に足す。画面直下を 2 要素に保つ (3 つ以上だと `RNSScreenContentWrapper` が警告する)。
- 実装は `design-system/components/TallSheetScreen.tsx`。**背の高い formSheet は必ずこの部品を使う** (自前で ScrollView を並べない)。
