# 実装プロンプト: P1〜P3 残課題一覧

> Claude Code / AI コーディングエージェント向け実装指示。
> このプロンプトを Claude Code セッションの先頭に貼り付けて使う。
>
> **完了済み**: #7 キーボード被り / #1 寿司カロリー / #9 麺ラベル / #8 どんぶりアイコン
> **このファイルの対象**: #10, #5 (P1) → #6, #2 (P2) → #3, #4 (P3)

---

## コンテキスト

- **アプリ**: Expo Router / React Native の食事クイックログアプリ
- **作業ディレクトリ**: `expo/`
- **関連ファイル**:
  - `constants/identity/ingredients.ts` — 食材 Identity 定義（量・チップ含む）
  - `components/IdentityLogSheet.tsx` — IdentityLog シートUI（チップをここで描画）
  - `types/identity.ts` — `AmountChip`, `IdentityAmount` 型定義
  - `utils/amount-edit.ts` — `buildIngredientAmountEditConfig` 関数

---

## 完了済みの前提

- `AmountEditDialog` はすでに「一体型ステッパー（`[ − ][ TextInput + 単位 ][ + ]`）＋プリセットチップ」形式に更新済み。
  ダイアログ内のプリセットは `${値}${unitLabel}` 形式でラベルを自動生成する。
- P0/P1 の他課題（寿司カロリー、ラベル整合など）は解決済み。

---

## やること1: #10 量チップのラベルに単位を付ける

### 問題

`IdentityLogSheet` に表示されるショートカットチップのラベルが数値のみで単位がない。

```
現状: [ 50 ] [ 100 ] [ 150 ]
期待: [ 50g ] [ 100g ] [ 150g ]
```

`AmountChip.label` フィールドに "100" と書かれているチップが
`ingredients.ts` / `dishes.ts` に約70件存在する。

### 修正方針

**データ側を変えず、レンダリング側で自動補完する（1ファイルの変更のみ）。**

`IdentityLogSheet.tsx` のチップ描画部分で、`chip.label` が「純粋な数値文字列」の場合のみ
`${chip.label}${unitLabel}` に変換して表示する。
意味ラベル（`小`, `1食`, `1切`, `並`, `半缶` など）はそのまま表示する。

### 実装

`IdentityLogSheet.tsx` の量チップ描画部分を以下のロジックで更新する:

```tsx
// helpers (ファイル先頭かコンポーネント外に定義)
const NUMERIC_RE = /^\d+(\.\d+)?$/;

function chipDisplayLabel(label: string, unitLabel: string): string {
  return NUMERIC_RE.test(label.trim()) ? `${label}${unitLabel}` : label;
}
```

チップの `label` prop を変更:
```tsx
// 変更前
label={c.label}

// 変更後
label={chipDisplayLabel(c.label, origin.amount.unitLabel ?? UNIT_LABEL[origin.amount.unit])}
```

`UNIT_LABEL` は `IdentityLogSheet.tsx` 内ですでに定義されているはず。
なければ `{ g: 'g', ml: 'ml', piece: '個', serving: '食' }` を使う。

### 確認すべき副作用

- `小`, `1食`, `1切`, `並`, `半缶` など文字を含むラベルは変化しないこと
- `1個`, `2個` などすでに単位が付いているラベルも変化しないこと
- `0.5` のような小数値チップ（缶の半缶など）に単位が付くこと

---

## やること2: #5 いちごを「粒」単位の独立 Identity にする

### 問題

現在 `berry` Identity に `strawberry` 属性として含まれているが、
単位が `g`（50g / 100g）で、いちごの感覚（「何粒食べた」）と合わない。

### 修正方針

1. `ingredients.ts` の `BUCKET_FRUIT` 配列に `ichigo` Identity を**新規追加**（`berry` の前に配置）
2. `berry` の `attributes` から `strawberry` を削除し、ブルーベリー・ぶどう専用にする
3. `berry` の `label` を `'ベリー・ぶどう'` に変更して内容を明示

### いちごの栄養価（根拠）

文部科学省 食品成分表2020 より:
- いちご 1粒 ≈ 平均 12〜15g（中粒）→ 代表値として **1粒 = 13g** を使用
- per 100g: kcal 34, protein 0.9, fat 0.1, carbs 8.5
- per 1粒（13g）: kcal 4.4, protein 0.12, fat 0.01, carbs 1.1
- **default = 10粒** が最も一般的な一食分

`defaultMacro` は `amount.default`（10粒）分の合計:
```
10粒 × 13g = 130g相当
kcal: 44, protein: 1.2, fat: 0.1, carbs: 11
```

### 実装: ingredients.ts の BUCKET_FRUIT

```ts
// いちごを先頭付近（バナナの後）に追加
{
  id: 'ichigo',
  label: 'いちご',
  primaryHome: { tab: 'ingredient', bucket: 'fruit' },
  defaultMacro: { kcal: 44, protein: 1.2, fat: 0.1, carbs: 11 }, // 10粒分
  amount: {
    unit: 'piece',
    unitLabel: '粒',
    default: 10,
    chips: [
      { label: '5粒',  value: 5  },
      { label: '10粒', value: 10 },
      { label: '15粒', value: 15 },
    ],
  },
  searchTags: ['ストロベリー'],
},
```

### 実装: berry の変更

```ts
// 変更前
{
  id: 'berry',
  label: 'ベリー',
  ...
  amount: { unit: 'g', default: 50, chips: [{ label: '50', value: 50 }, { label: '100', value: 100 }] },
  attributes: [
    { key: 'strawberry', label: 'いちご', isDefault: true },  // ← 削除
    { key: 'blueberry', label: 'ブルーベリー' },
    { key: 'grape', label: 'ぶどう', factor: { kcal: 1.07, carbs: 1.14 } },
  ],
}

// 変更後
{
  id: 'berry',
  label: 'ベリー・ぶどう',   // ← 変更
  ...
  amount: { unit: 'g', default: 50, chips: [{ label: '50', value: 50 }, { label: '100', value: 100 }] },
  attributes: [
    { key: 'blueberry', label: 'ブルーベリー', isDefault: true },  // ← isDefault 移動
    { key: 'grape', label: 'ぶどう', factor: { kcal: 1.07, carbs: 1.14 } },
  ],
}
```

---

## やること3（任意・効果大）: いくつかのチップラベルを意味ラベルに改善

#10 の核心は「数値だけでは意味が分からない」点なので、
よく使われる食材のチップラベルを意味ラベルに変えると更に良くなる。
ただし量が多いので優先度高い食材に絞る。

| Identity | 現状 | 改善案 |
|---|---|---|
| 鶏むね・ささみ | `100`, `150`, `200` | `手のひら1枚(100g)`, `150g`, `200g` → ※#10ラベル補完で `100g`に自動変換されるので不要かも |
| サラダ | `小(70)`, `1食(140)`, `大(210)` | すでに意味ラベル ✓ |
| ヨーグルト | `80`, `100`, `150` | `小(80g)`, `1カップ(100g)`, `大(150g)` |

※ #10 の自動補完で数値チップはすべて `Ng` 表示になるため、
この追加改善は「数値+単位 → 意味+数値+単位」にしたい場合のみ対応。
今スプリントではスキップしてもよい。

---

## テスト確認ポイント

1. `IdentityLogSheet` でいちごを開くと「10粒」がデフォルト表示、チップは「5粒 / 10粒 / 15粒」
2. `IdentityLogSheet` でチキンブレスト（`unit: g`）を開くと「100g」「150g」「200g」とチップに `g` が付く
3. `IdentityLogSheet` でサーモン（`1切`, `1食`）を開くと既存ラベルのまま変化しない
4. `AmountEditDialog` でいちごを開くと「粒」単位のステッパーが表示される
5. `berry` を開くと「ブルーベリー」がデフォルト、いちごが選択肢から消えている

---

## 注意事項

- `defaultMacro` は常に `amount.default` 個分の**合計値**。単位あたりではない
  （identity-resolver が `amountFactor = amountValue / amount.default` で計算するため）
- `unitLabel` を `amount` オブジェクトに設定すると、IdentityLogSheet の量行表示 (`amountValue + unitLabel`) と
  AmountEditDialog のステッパー単位表示に自動で使われる
- `berry` から `strawberry` を消すことで、既存ログの `attributeKey: 'strawberry'` が参照できなくなる。
  `identity-resolver.ts` でフォールバック処理を確認し、必要なら migration フラグを追加する

---

---

# P2: #6 おやつ「完飲」— 液体おやつのチップラベル改善

## 問題

`sweet_drink`（甘飲料）と `sweet_drink_rich`（甘飲料こってり）の量チップが
数値（`200`, `350`, `500`）のみで、容器サイズのコンテキストがない。
#10 の修正で `200ml`, `350ml`, `500ml` と単位は付くが、
「1本飲んだ」「缶1本」「ペットボトル1本」という生活感のある表現にならない。

## 現状データ

```ts
// sweet_drink
chips: [{ label: '200', value: 200 }, { label: '350', value: 350 }, { label: '500', value: 500 }]

// sweet_drink_rich
chips: [{ label: 'Tall', value: 350 }, { label: 'Grande', value: 470 }]
```

## 修正方針

チップラベルをコンテキスト付きに変更（`constants/identity/ingredients.ts`）。

```ts
// sweet_drink — 変更後
chips: [
  { label: 'コップ1杯', value: 200 },   // 200ml
  { label: '缶1本',     value: 350 },   // 350ml
  { label: '1本(500)',  value: 500 },   // 500mlペット
],

// sweet_drink_rich — 変更後（コーヒー系ドリンク基準）
chips: [
  { label: 'M/Tall',   value: 350 },
  { label: 'L/Grande', value: 470 },
  { label: '完飲',     value: 500 },   // カップ系の飲み切り目安
],
```

加えて `sweet_drink` の `amount.default` を `350`（缶1本）に変更する（現在も350なので確認のみ）。

## 確認ポイント

- 甘飲料を開いたとき、チップが「コップ1杯 / 缶1本 / 1本(500)」と表示される
- 甘飲料(こってり)で「完飲」チップを選ぶと500mlがセットされる
- `#10` の数値ラベル自動補完ロジックが純粋数値でないラベルに影響しないこと

---

---

# P2: #2 オーバー許容 — カロリーリングのメッセージ日本語化とトーン調整

## 問題

`CalorieOverflowRing.tsx` のステータステキストが英語かつ過剰摂取を
ネガティブに強調している。PRD のウェルネス方針（静かな日本語・非評価）に反する。

### 現状コード（CalorieOverflowRing.tsx 内 statusText）

```ts
if (consumedInt < targetInt) {
  return `${(targetInt - consumedInt).toLocaleString()} kcal left`;
}
if (consumedInt === targetInt) {
  return 'Goal reached';
}
return `${(consumedInt - targetInt).toLocaleString()} kcal over`;  // ← ネガティブ英語
```

## 修正方針

**A. 日本語化**（最低ライン）

```ts
if (consumedInt < targetInt) {
  return `あと ${(targetInt - consumedInt).toLocaleString()} kcal`;
}
if (consumedInt === targetInt) {
  return '目標達成';
}
return `+${(consumedInt - targetInt).toLocaleString()} kcal`;
```

**B. トレランスゾーン付き（推奨）**

PRD §ウェルネス方針に合わせ、少しのオーバーは中立的なトーンにする。

```ts
const over = consumedInt - targetInt;
const overRatio = over / safeTarget;

if (over <= 0) {
  return consumedInt === targetInt
    ? '目標達成'
    : `あと ${Math.abs(over).toLocaleString()} kcal`;
}
// +10% 以内 → 中立（許容範囲と感じさせる）
if (overRatio <= 0.10) {
  return `+${over.toLocaleString()} kcal`;
}
// +10〜25% → やや多めだが責めない
if (overRatio <= 0.25) {
  return `+${over.toLocaleString()} kcal 多め`;
}
// +25% 超 → 情報提供のみ
return `+${over.toLocaleString()} kcal`;
```

## 変更ファイル

- `components/CalorieOverflowRing.tsx` の `statusText` useMemo のみ変更

## 確認ポイント

- 目標以下: 「あと NNN kcal」
- 目標ちょうど: 「目標達成」
- +5%: 「+NNN kcal」（小さい数字 → ネガティブ感なし）
- +15%: 「+NNN kcal 多め」
- +30%: 「+NNN kcal」

---

---

# P3: #3 リアルタイム目標連動（中期・設計が必要）

> **スコープ**: 運動ログを記録したとき、その日の残カロリー目標がリアルタイムで増える。

## 背景

現在のカロリー目標は固定値（`profile.targetCalories`）。
運動したら消費カロリー分だけ「食べられるカロリー」が増える仕組みを実装する。

## 必要な設計判断（実装前に決める）

1. **運動ログの保存先**: 既存の `FoodLog` と別テーブル（`ExerciseLog`）か、同じログに `type: 'exercise'` を追加するか
2. **カロリー計算**: `TDEE + exerciseKcal` か `targetKcal + exerciseKcal` か
3. **リアルタイム更新のスコープ**: 当日のみ、or 過去7日も遡及対応するか
4. **UI上の表示**: リングの数値が変わるだけか、別途「運動で +XXX kcal」バッジを出すか

## 最小実装ステップ（決定後）

1. `ExerciseLog` 型を `types/nutrition.ts` に追加
2. `app-state-provider.tsx` に `exerciseLogs` state と `logExercise()` action を追加
3. `utils/goals.ts` に `adjustedTargetKcal(target, exerciseLogs, date)` を追加
4. `StatusCard` が `adjustedTargetKcal` を `targetKcal` として `CalorieOverflowRing` に渡す
5. 運動ログ入力UIを追加（ミニシート or ボトムシート）

---

---

# P3: #4 Health Connect / HealthKit 連携（中期・プラットフォーム実装）

> **スコープ**: iOS HealthKit / Android Health Connect から歩数・消費カロリー・
> 運動種別（サッカー等）を取得してアプリ内の運動ログに反映する。

## 必要な調査と判断（実装前）

1. **ライブラリ選定**: `react-native-health-connect` (Android) + `react-native-health` (iOS)、
   または `expo-health` (Expo SDK 51+) のどちらを採用するか
2. **パーミッション要件**: iOS は HealthKit entitlement が必須（EAS Build で設定）
3. **同期タイミング**: アプリ起動時にバックグラウンドフェッチか、手動同期ボタンか
4. **運動種別マッピング**: HealthKit/Health Connect の ActivityType → アプリ内カテゴリ対応表

## ステップ（決定後）

1. `eas.json` / `app.json` に HealthKit entitlement を追加
2. Expo プラグインまたはネイティブモジュールをインストール
3. `utils/health-connect.ts` に取得・正規化ロジックを実装
4. 取得データを `#3` で追加する `ExerciseLog` 型に変換して保存
5. Settings/My Status に「ヘルスデータを同期」ボタンを追加

## 注意

- #3（リアルタイム目標連動）が完了していることが前提
- TestFlight / Internal Distribution でのみ動作確認可（Simulator では HealthKit 無効）

---

## 優先度サマリー

| # | 優先度 | 工数目安 | ファイル |
|---|--------|---------|---------|
| #10 | P1 | S（1ファイル修正） | `IdentityLogSheet.tsx` |
| #5  | P1 | S（データ追加+削除） | `identity/ingredients.ts` |
| #6  | P2 | XS（チップラベル変更） | `identity/ingredients.ts` |
| #2  | P2 | XS（statusText修正） | `CalorieOverflowRing.tsx` |
| #3  | P3 | L（データモデル+UI） | 複数ファイル |
| #4  | P3 | XL（ネイティブ連携） | 複数ファイル+ネイティブ設定 |
