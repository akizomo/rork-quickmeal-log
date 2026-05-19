# Health Sync (HealthKit / Health Connect) — 残課題

> 2026-05-19 時点。code-reviewer + security-reviewer agent によるレビュー結果から、
> 即修正できなかった項目を記録。優先度順。
> 関連実装: `expo/utils/health-sync/`, `expo/hooks/use-health-sync.ts`,
> `expo/providers/app-state-provider.tsx` (ingestHealthSyncResult 周辺),
> `expo/plugins/health-connect-manifest.plugin.js`.

---

## 🔴 Critical — Play Console 申告 (Android Health Connect が動くための必須条件)

実機で「健康の申告を完了する必要があります」と表示される根本原因。Health Connect は
READ 権限要求アプリに対し Google Play での **Health Apps Declaration** 完了 + 承認
を要求する。EAS Build APK 直配布でも同様にブロックされる (Play の承認済み package
リストと照合される)。

### 手順
1. **プライバシーポリシー URL を準備** (既存の `web/public/legal/privacy.html` を利用)
2. **Play Console > アプリのコンテンツ > Health Connect declaration** を提出
   - 要求権限: `READ_STEPS / READ_ACTIVE_CALORIES_BURNED / READ_WEIGHT / READ_BODY_FAT / READ_EXERCISE`
   - 各データの用途を明文化 (UI スクリーンショット添付)
   - データ取扱い: 端末内のみ保存、外部送信なし
3. **Data Safety フォーム完成** (Play Console > データセーフティ)
   - データ種別: Health and fitness → Steps / Calories burned / Weight / Body measurements / Exercise sessions
   - 用途: App functionality
   - 共有先: Not shared with third parties
4. **Internal Testing トラックに AAB アップロード** (`eas submit`)
5. テスター登録 + 配信リンク経由インストール → Play 承認済み認識で権限ダイアログ表示

### 待ち時間
- Health Apps Declaration 審査: 通常 7 営業日以内
- 承認まで Android Health Connect 連携は完全停止

### 開発中の代替
- iOS HealthKit は事前審査なし → TestFlight ですぐ動作確認可
- iOS 側で機能完成 → Android は Play 申告完了後に検証

参考: [Health Connect Publishing Permissions](https://developer.android.com/health-and-fitness/guides/health-connect/publish/publishing-permissions)

---

## 🟡 Major — ストア審査リスクあり

### 1. AsyncStorage のヘルスデータ平文保存 (App Store 5.1.3 / Play Health Connect)

**該当**: `expo/providers/app-state-provider.tsx:200` (`AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(...))`)

体重 / 体脂肪 / 運動ログを JSON 平文で AsyncStorage に保存している。
- Apple [App Store Review Guideline 5.1.3](https://developer.apple.com/app-store/review/guidelines/#health-and-health-research) は HealthKit データに「同等のセキュリティレベルでの保護」を要求
- Google Play の Health Connect ポリシーも「適切な暗号化」を要件に含む

iOS の AsyncStorage は `NSFileProtectionCompleteUntilFirstUserAuthentication` 相当の保護があるが明示指定がなく、最低クラスにフォールバックする可能性がある。

**対応案**:
- `expo-secure-store` (iOS Keychain / Android Keystore) または `react-native-encrypted-storage` の導入
- データ量が多いので、データ本体は暗号化 + 復号鍵を SecureStore に置く二段構成が現実的
- 移行スクリプト: 既存ユーザーの平文データを起動時に暗号化版へ書き換え

**影響**: 即時リジェクトは少ないが、審査で指摘される可能性大。重要度高。

### 2. iOS `getStatus()` が「初期化済 = 認可済」と誤判定

**該当**: `expo/utils/health-sync/adapter.ios.ts:283` (`return initialized ? 'authorized' : 'unknown'`)

HealthKit の `initHealthKit()` は **個別権限が拒否されていても** `error = null` を返すことがある。結果として:
- UI は「連携済」と表示
- 実際にはデータが空配列で返ってくる
- ユーザーは何が起きているか分からない

加えて、アプリ再起動後は `initialized` がリセットされ `status === 'unknown'` になるため、`useHealthSync` の自動同期 useEffect (`status === 'authorized'` 判定) が **永遠に動かない**。

**対応案**:
- `getStatus()` の中で `getWeightSamples` などのダミー読み取りを試行し、空配列または特定エラーで権限拒否を判定
- もしくは AsyncStorage に「最後に許可した時刻」を保存して `authorized` を判定基準にする (ただし権限取り消しは検知不可)
- React Native でアクセスできる `HKHealthStore authorizationStatusForType:` のラッパーは現状 `react-native-health` で未提供。PR 提出か fork 検討

**影響**: iOS の自動同期 UX が機能しない。実機検証で再現確認 → 優先対応推奨。

---

## 🟢 Minor — 後追いで OK

### 3. `ANDROID_WORKOUT_MAP` の未網羅 → MET fallback で精度低下

**該当**: `expo/utils/health-sync/mapping.ts` (`ANDROID_WORKOUT_MAP`)

Health Connect の `ExerciseSessionRecord.exerciseType` は 80+ の数値定数があるが、現在 mapping に登録されているのは 12 種。未マップは `'other'` (MET 5.0) にフォールバック。
- 水泳 (MET≈6.0)・HIIT (≈8.0) など差が大きい種別が未マップだと kcal 誤差 30% 超
- Android Health Connect の数値定数全リストを mapping に追加すれば解決

**対応案**: 公式ドキュメントから数値リスト取得 → mapping 拡張 (~80 行追加)

### 4. プライバシーポリシー文言の未整備

**該当**: `expo/app/health-connect.tsx`

連携誘導画面で「データがデバイス外に送信されないこと」「Health データを第三者に提供しないこと」への言及がない。Apple ガイドライン 5.1.3 / Google Play Health Connect ポリシーは Health データ取扱についてプライバシーポリシーで明文化することを要求。

**対応案**:
- 連携誘導画面に「取得データは端末内のみに保存され、外部送信されません」の一文を追加
- プライバシーポリシー (`/legal/privacy`) へのリンクを設置
- プライバシーポリシー本体に Health データセクションを追加 (web/public/legal/)

### 5. iOS bodyFat の SDK バージョン依存

**該当**: `expo/utils/health-sync/adapter.ios.ts:186` (`bodyFatPct: Math.round(s.value * 100 * 10) / 10`)

`react-native-health` v1.x の一部バージョンでは `unit: 'percent'` 指定時に既に 0-100 のパーセント値を返すことがある。0.0-1.0 前提で `* 100` していると上限超過 (例: bodyFatPct=2500%) になる可能性。

**対応案**:
- 実機テストで値域確認 (HealthKit データを手動入力 → 取込結果ログ)
- 上限チェック追加: `Math.min(result, 75)` 程度
- v1.19.0 でどちらの挙動かを実機で確認

### 6. `ingestHealthSyncResult` の deps 変動で不要な effect 再評価

**該当**: `expo/providers/app-state-provider.tsx:1247-1256` (deps `[weights, bodyFatEntries, exerciseLogs, dailyActivities, ...]`)

state が変わるたびに `ingestHealthSyncResult` 関数が再生成 → `useHealthSync` の `performSync` も再生成 → 自動同期 useEffect が dep 変化として再評価される (実害は `didAutoSyncRef.current` で防いでいる)。

**対応案**: `useRef` で最新 state を保持する "ref update trick" パターン

### 7. テストデブト: `identity-resolver.test.ts` の `fries` ケース

**該当**: `expo/utils/identity-resolver.test.ts:22, 91`

IA v1.2 リファクタで `fries` が独立 Identity から `fried_main` の attribute に変更されたが、テストは旧モデル参照のまま。**Health Sync とは無関係** だが、現在 2 件 fail のままなので CI 設定時に支障。

**対応案**:
- `expect(getIdentity('fries')).toBeDefined()` → 削除 (該当 identity なし)
- `expect(result.recordIdentityId).toBe('fries')` → `'fried_main'`、`expect(result.attributeKey).toBe('fries')` を追加

---

## 参考: 既に対応済みの項目 (記録目的)

- ✅ Play Store 自動遷移防止 (`getSdkStatus` 事前チェック) — `2a98782`
- ✅ AndroidManifest `<uses-permission>` 注入 — `fe42727`
- ✅ iOS/Android `initialize()` 並列レース防止 — `2dead7b`
- ✅ `upsertDailyActivity` の stale closure リスク解消 — `2dead7b`
- ✅ `healthUpdatePermission` 文言矛盾削除 — `2dead7b`
- ✅ `HealthSyncRow` の `HealthSyncStatus` 型重複統一 — `2dead7b`
- ✅ Expo plugin の MainActivity 検索堅牢化 — `2dead7b`
- ✅ `console.log` の `__DEV__` ガード化 — `2dead7b`

---

## 次回着手の判断材料

- Play Store / App Store **審査前** には項目 **1 (暗号化)** と **4 (プライバシー文言)** を済ませる必要あり
- 実機検証で **2 (iOS getStatus)** の症状確認 → 必要なら対応
- 残りは UX 精度の向上タスクとして後追いで OK
