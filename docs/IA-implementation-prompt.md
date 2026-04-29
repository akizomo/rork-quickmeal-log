# IA再設計 実装プロンプト v2 (Claude Code 委譲用)

> このファイルは、食事入力IA再設計を Claude Code に渡すための完全な実装プロンプトです。
>
> **2026-04-26 v2**: 案A 採用 (定食・単品 12 chip)、`quickTapDisabled` flag 導入、タップ/長押し挙動の最終仕様を反映。詳細シートの Pattern A/B 別UI挙動を明文化。

---

## 1. コンテキスト

このアプリ (Expo Router / React Native — 体型理解 × 食事クイックログ) の **食事入力IA を全面刷新** します。

### 必読ドキュメント (この順で読むこと)
1. **`docs/PRD.md`** — プロダクト要件 (北極星)
2. **`docs/IA-identity-spec.md`** — IA 設計仕様 v1.1 確定版
3. **`PLAN.md`** — 実装メモ
4. (参考) **`docs/IA-catalog.xlsx`** — 食品 346 件カタログと現状PFC収束分析

### 5つの根幹思想 (PRD §6.5 / IA spec §1.1)

| # | 思想 | 概要 |
|---|---|---|
| ① | **9ボタン×2タブ** | タップで即記録、長押しで詳細。3×3 グリッド維持 |
| ② | **PFC収束軸 (食材)** | 1バケット内の kcal/PFC が類似 (kcal±20% / F±3g以内) |
| ③ | **ジャンル軸 (一皿料理)** | 組合せでPFCが崩れる料理を1タップ精度で記録 |
| ④ | **無カロリー除外** | 水/お茶/ブラックコーヒー/塩・醤油等は記録対象外 |
| ⑤ | **専門用語排除** | 平易ラベル (5〜6文字以内) |

### 入力階層 (4層)

```
Tab → Bucket → Identity → Attribute → Style → Add-on
                  ↓          ↓          ↓        ↓
                chip      chip       chip   chip + 数値
```

- **Identity**: 素材の正体 (UI subcategory chip と1対1)
- **Attribute**: 素材性質 (PFC基礎単価を変える、例: 皮なし/皮あり)
- **Style**: 調理法 (PFCを動的加算 or 強制バケット移動)
- **Add-on**: トッピング (1単位でPFC ±3g以上動くもの)

### 多義性処理

- **PFC崩壊遮断** — Style/Attribute選択で別バケットに強制移動 (例: ジャガイモ + 揚げ → misc_dish/fries)
- **マルチエントランス** — primary Home以外のバケットからも検索ヒット
- **クロスバケット・アドオン** — Identity を Add-on としても流用 (例: 卵 = 単独Identity でも 米のadd-on でも同じ ID)

---

## 2. Phase 1 完了済み (= 入力データ層)

### コード (TS error ゼロ)

| ファイル | 内容 |
|---|---|
| `expo/types/identity.ts` | Identity / BucketDef / Attribute / Style / AmountSpec / MigrationTarget / Addon / IdentityLogDraft / AsAddon の全型。`quickTapDisabled` flag を Identity / BucketDef 両方に持つ |
| `expo/constants/identity/migration-rules.ts` | PFC崩壊遮断ルール (Style 15 + Attribute 2) と `findMigration()` ヘルパー |
| `expo/constants/identity/ingredients.ts` | 食材タブ Identity 67個 (9バケット) |
| `expo/constants/identity/dishes.ts` | 一皿料理タブ Identity 49個 (9バケット, burger統合済, misc_dish 先頭に teishoku/bento) |
| `expo/constants/identity/addons.ts` | Pure Addon 25個 + Identity流用 ID 17個 + `resolveAddonRef()` |
| `expo/constants/identity/index.ts` | バケット定義、`IDENTITY_REGISTRY`、`getIdentity()` `getBucketDef()` `getIdentitiesInBucket()` `searchIdentities()` |

> 既存 `expo/constants/quick-log-master.ts` `dish-master.ts` `nutrition-data.ts` は **Phase 5 まで残存**。Phase 5 で削除。

### Phase 1 で確定した設計判断 (すべてコード反映済み)

1. `burger` + `burger_heavy` → 統合 (Attribute=[普通/チーズ/こってり])
2. `hot_sand` / `cold_sand` → 別維持
3. `canned_lean_fish` 油漬 → Attribute=[水煮(default)/油漬]、油漬選択時は `canned_fatty_fish` に migration
4. **misc_dish ラベル「定食・単品」、`teishoku` / `bento` を misc_dish 先頭に配置 (12 chip、3×3 グリッド維持)**
5. `chicken_thigh` Attribute=皮なし は **silent migration** (UIは脂Pバケット、データは `chicken_lean` で記録、`confirmMessage` 出さない)

### バケット/Identity の `quickTapDisabled` フラグ

**バケット単位 (4枠) — タップで sheet を開く**:
- `chinese_noodles` (ラーメン中華麺) — Identity 多様性大
- `sushi` (寿司) — plate/piece/ちらし/巻 PFC違いすぎ
- `pizza` (ピザ) — light/regular/heavy 約2.5倍違い
- `misc_dish` (定食・単品) — 12 chip 多様

**Identity単位 (10個) — Attribute 幅大きい**:
- 食材: `bread` / `chicken_thigh` / `beef_pork_fatty` / `fatty_fish` / `aburaage`
- 一皿料理: `okonomi` / `fried_main` / `nabe_light` / `burger` / `teishoku`

→ `QuickLogSection.handlePress` は両 flag を見て、true なら `openIdentityLogSheet()`、false なら `quickLogIdentity(first.id)`。

---

## 3. タップ / 長押し 挙動の最終仕様 (PRD §6.5 厳守)

### バケットボタン (`QuickLogSection.tsx`)

| 操作 | 挙動 |
|---|---|
| **タップ** | `quickTapDisabled` が **bucket / first Identity いずれかで true** → `openIdentityLogSheet(bucketKey)` で sheet を開く<br>**両方 false** → `quickLogIdentity(first.id)` で即記録 (default Identity の defaultMacro で保存) |
| **長押し** | 常に `openIdentityLogSheet(bucketKey)` |

> このロジックは `expo/components/QuickLogSection.tsx` の `handlePress` / `handleLongPress` で実装済み。Phase 2-5 の作業中に逆転させないこと。

### IdentityLogSheet 内の操作

| 要素 | タップ | 長押し |
|---|---|---|
| Identity chip | 選択 (= sheet内 active切替、記録しない) | – |
| Attribute chip | 選択。Migration ある場合は trigger | – |
| Style chip | 選択。Migration ある場合 confirmMessage 表示 | – |
| 量chip | 数値フィールドに値を反映 | – |
| 数値入力 | 直接編集可。chip 選択は自動解除 | – |
| Add-on chip (default) | +1単位 追加 (合計表示にリアルタイム反映) | 個数調整UI展開 |
| Add-on chip (再タップ) | -1単位 (0で解除) | – |
| **保存して追加 ボタン** | `resolveLog()` 実行 → `submitIdentityLog(draft)` | – |
| **キャンセル ボタン** | sheet 閉じる、保存しない | – |

### Migration 確認 UX

- **Style migration** (例: ジャガイモ + 揚げ): Style chip タップ後、トーストで `confirmMessage` 表示 (「フライドポテトとして記録します」)。保存ボタン押下で内部的に migration target Identity (misc_dish/fries) で記録
- **Attribute migration (silent)** (例: chicken_thigh + 皮なし): chip 表示は脂Pのまま、内部的に lean_protein/chicken_lean で記録。トースト無し

---

## 4. Phase 2: PFC計算 + 解決ロジック

### 目的
ユーザーが選んだ Identity + Attribute + Style + Add-ons から、最終 macro と migration 先 ID を決定する **resolver** を作る。

### 4.1 新規: `expo/utils/identity-resolver.ts`

```typescript
import { Identity, IdentityLogDraft, AppliedAddon, MigrationTarget } from '@/types/identity';
import { Macro } from '@/types/nutrition';

export interface ResolveInput {
  originIdentityId: string;
  attributeKey?: string;
  styleKey?: string;
  amountValue: number;
  addons?: Array<{ refId: string; refType: 'identity' | 'addon'; units: number }>;
}

export function resolveLog(input: ResolveInput): IdentityLogDraft;
```

### Resolve ロジック

1. `getIdentity(originIdentityId)` で起点 Identity 取得
2. **Migration 解決 (優先順位):**
   - Style migration が定義されていればそれを最優先 (recordIdentityId 移動)
   - 次に Attribute migration
   - 両方ある場合は Style 優先 (Style migration 発動時、Attribute 設定は失効)
3. **Base macro 計算:**
   - Migration あり → 移動先 Identity の `defaultMacro` × `(amountValue / 移動先 Identity.amount.default)`
   - Migration なし → 起点 Identity の `defaultMacro` × `(amountValue / 起点.amount.default)`
4. **Attribute factor 適用** (migration が Attribute主導の場合は移動先で再計算):
   - `factor` の各 macro key (kcal/protein/fat/carbs) を base macro に乗算
5. **Style factor 適用** (Style migration が無い場合のみ):
   - migration あり → 適用しない (移動先 Identity の defaultMacro が既に Style 反映済み)
6. **Add-on macro 加算:**
   - `refType === 'identity'` → `getIdentity(refId).asAddon.addedMacro × units`
   - `refType === 'addon'` → `PURE_ADDONS_BY_ID[refId].addedMacro × units`
7. `IdentityLogDraft` を返す

### 4.2 ユニットテスト (推奨)

最低 6 ケース:

```typescript
// 1. 単純: 卵単独
resolveLog({ originIdentityId: 'egg', amountValue: 1 })
// → recordIdentityId='egg', totalMacro≈75/6.2/5.2/0.3

// 2. Pattern B 量変動: ごはん200g
resolveLog({ originIdentityId: 'rice', amountValue: 200 })
// → totalMacro = defaultMacro * 200/150 ≈ 312/5/0.7/74.7

// 3. Attribute migration (silent)
resolveLog({ originIdentityId: 'chicken_thigh', attributeKey: 'no_skin', amountValue: 100 })
// → recordIdentityId='chicken_lean', totalMacro≈105/23/1.5/0

// 4. Style migration
resolveLog({ originIdentityId: 'potato', styleKey: 'fried', amountValue: 150 })
// → recordIdentityId='fries', totalMacro≈320/3.8/15/40

// 5. Style + Add-on: 米200g + 卵1個 + 納豆1パック
resolveLog({
  originIdentityId: 'rice', amountValue: 200,
  addons: [
    { refId: 'egg',   refType: 'identity', units: 1 },
    { refId: 'natto', refType: 'identity', units: 1 },
  ]
})
// → totalMacro ≈ 312 + 75 + 80 = 467 kcal

// 6. Style migration optimization (鶏むね + 揚げ)
resolveLog({ originIdentityId: 'chicken_lean', styleKey: 'fried', amountValue: 100 })
// → recordIdentityId='fried_main', attribute=karaage で記録
```

### 4.3 更新: `expo/utils/quick-log-macro.ts`

新 resolver と旧 FoodLog 形式の橋渡し関数を追加:
```typescript
export function logDraftToFoodLog(draft: IdentityLogDraft, ctx: { date, mealSlot, ... }): FoodLog;
```

---

## 5. Phase 3: UI更新

### 5.1 既存 sheet を `IdentityLogSheet.tsx` に統合

**現状**: `QuickIngredientSheet.tsx` (食材) + `DishQuickEntrySheet.tsx` (一皿料理) の2sheet が並存。

**目標**: `IdentityLogSheet.tsx` 1つで両方を扱う。Pattern A/B も統一。

### 5.2 IdentityLogSheet UI構成

```
┌─────────────────────────────────────┐
│ ハンドル                              │
├─────────────────────────────────────┤
│ 🍱 定食・単品 を追加              ×   │  ← bucketDef.label + emoji
├─────────────────────────────────────┤
│ [定食][弁当][粉もの][中華点心]…      │  ← Identity chip (横スクロール)
│ ※ 選択中Identityがハイライト         │
├─────────────────────────────────────┤
│ 種類 (= Attribute)                  │  ← 該当Identityのみ表示
│ [焼魚][焼肉][唐揚げ][トンカツ]…      │
├─────────────────────────────────────┤
│ 調理 (= Style)                      │  ← 該当Identityのみ表示
│ [生][あっさり][油あり][揚げ★]       │  ← ★=migration trigger
├─────────────────────────────────────┤
│ 量                                  │  ← Pattern A/B で出し分け
│ [Pattern B のみ] chip 行             │
│ ┌─────────────────────────────┐  │
│ │   1.0      食       ✏       │  │  ← 数値入力 (常時表示)
│ └─────────────────────────────┘  │
├─────────────────────────────────────┤
│ ちょい足し (= defaultAddonIds 上位)  │
│ [納豆+] [卵+] [キムチ+] [鮭+]         │
├─────────────────────────────────────┤
│ 合計  850 kcal                       │
│ P 32 / F 30 / C 108                  │
├─────────────────────────────────────┤
│ [キャンセル]  [保存して追加]          │
└─────────────────────────────────────┘
```

### 5.3 量UI の Pattern A/B 出し分け

| Pattern | 条件 | UI |
|---|---|---|
| **A** | `Identity.amount.chips` が undefined | 数値入力 + ±ボタンのみ。chip 行非表示 |
| **B** | `Identity.amount.chips` が定義済 | chip 横並び (横スクロール) + 数値入力 |

数値入力は **常時表示**。chip タップで数値が更新されるが、直接編集も可。chip が網羅性低くても数値入力でカバー。

### 5.4 Add-on chip の挙動

- `defaultAddonIds` を初期表示 (4-6個)
- Identity流用 Add-on (cross-bucket): label = `Identity.asAddon.defaultLabel` (例: "卵を追加")
- Pure Addon: label = `Addon.label` (例: "明太子・たらこ")
- chip タップで +1単位、再タップで -1、0個で解除
- 長押しで個数調整UI (1/2/3...) を展開可能 (将来拡張、MVP は不要)
- 選択中 add-on の合計が macro セクションにリアルタイム反映

### 5.5 Style migration の確認 UX

```typescript
// Style chip onClick
if (selectedStyle.migration) {
  showToast(selectedStyle.migration.confirmMessage);
  // sheet 内の表示は元のまま (Identity/Attribute/Style chip)
  // 保存時に resolveLog() が migration target で記録
}
```

### 5.6 バケットボタン (`QuickLogSection.tsx`)

実装済み (Phase 1終了時)。次の挙動を**変更しないこと**:

```typescript
const handlePress = () => {
  if (!hasNewBucket) return;
  const bucketDef = getBucketDef(bucketKey);
  const first = getIdentitiesInBucket(bucketKey)[0];
  if (bucketDef?.quickTapDisabled || first?.quickTapDisabled) {
    openIdentityLogSheet(bucketKey);  // sheet 開く (即記録しない)
    return;
  }
  if (first) void quickLogIdentity(first.id);  // 即記録
};

const handleLongPress = () => {
  if (hasNewBucket) {
    openIdentityLogSheet(bucketKey);
  } else if (mode === 'dish') {
    void openDraftEditor(item.key);
  }
};
```

### 5.7 ボタンサイズ調整

新ラベル (例: "ごはんパン麺" "脂あり肉魚") が `numberOfLines: 1` で収まるよう、`getQuickLogButtonHeight` `getLabelFontSize` を調整 (フォント縮小 or ボタン高さ拡大)。

### 5.8 `app-state-provider.tsx` 拡張

新 API:
```typescript
openIdentityLogSheet(bucketKey: BucketKey): void;
closeIdentityLogSheet(): void;
submitIdentityLog(draft: IdentityLogDraft): Promise<void>;
quickLogIdentity(identityId: string): Promise<void>;
```

`submitIdentityLog` 内で `logDraftToFoodLog()` を呼んで FoodLog に変換、`addFoodLog()` で保存。

---

## 6. Phase 4: マルチエントランス検索

### 6.1 既存: `IdentitySearchBar.tsx`

実装済み or 拡張。

### 6.2 検索ロジック

`searchIdentities(query, restrictToBucket?)` (in `constants/identity/index.ts`) を使用。

- query が Identity の `label` または `searchTags` にマッチ
- `restrictToBucket` 指定時: primary Home が一致 OR `searchableFrom` に含まれるもの

### 6.3 検索結果の挙動

- ヒット行タップ → `openIdentityLogSheet(identity.primaryHome.bucket)` で sheet 開く + 該当 Identity を pre-select
- 各行に primary Home のバケット名を補助表示 (例: "アボカド (油・調味)")

### 6.4 配置

`expo/app/index.tsx` の `QuickLogSection` の上 or `IdentityLogSheet` 内 sticky header に検索バー配置。

---

## 7. Phase 5: データ移行

### 7.1 旧→新ID マッピング辞書

新規: `expo/constants/identity/migration-map.ts`

```typescript
export const LEGACY_TO_IDENTITY_MAP: Record<string, string> = {
  // ─ ingredients ─
  'staple/rice': 'rice',
  'staple/bread': 'bread',
  'staple/oatmeal': 'oatmeal',
  'staple/cereal': 'cereal',
  'staple/potato': 'potato',
  'lean_protein/chicken_breast': 'chicken_lean',
  'lean_protein/sasami': 'chicken_lean',
  'lean_protein/tuna_can': 'canned_lean_fish',
  'lean_protein/salad_chicken': 'salad_chicken',
  'lean_protein/lean_fish': 'white_fish',
  'lean_protein/seafood_lean': 'seafood_lean',
  'lean_protein/beef_lean': 'red_meat',
  'lean_protein/pork_lean': 'red_meat',
  // ... 旧 47 sub すべて

  // ─ dishes ─
  'rice_dish/gyudon': 'gyudon_class',
  'rice_dish/oyakodon': 'gyudon_class',
  'rice_dish/kaisendon': 'kaisendon',
  'rice_dish/fried_rice': 'fried_rice_omurice',
  'rice_dish/omurice': 'fried_rice_omurice',
  'rice_dish/rice_default': 'gyudon_class',
  // set_meal 廃止 → misc_dish 内 teishoku/bento へ
  'set_meal/teishoku': 'teishoku',
  'set_meal/bento': 'bento',
  'set_meal/convenience_bento': 'bento',  // Attribute=convenience
  // ... 旧 dish sub すべて
};

/**
 * 旧の Attribute / part / method を新 Attribute key にマップ。
 * 例: 旧 set_meal/teishoku の品名 (焼魚定食/トンカツ定食) を
 *     新 teishoku の Attribute key (yakizakana/tonkatsu) に変換。
 */
export const LEGACY_ATTRIBUTE_MAP: Record<string, string> = { ... };
```

### 7.2 ランタイム migration

`expo/providers/app-state-provider.tsx`:
```typescript
function migrateLegacyFoodLog(log: FoodLog): FoodLog {
  if (log.identityId) return log; // already migrated
  const legacyKey = `${log.categoryKey}/${log.subTypeKey ?? ''}`;
  const newId = LEGACY_TO_IDENTITY_MAP[legacyKey];
  if (!newId) return log; // 未マップは旧データのまま残す
  return { ...log, identityId: newId };
}
```

- 起動時に `AppSettings.iaSchemaVersion` を確認
- < 2 ならすべての FoodLog を1度走査して `identityId` を埋める
- 完了したら `iaSchemaVersion = 2` を保存

### 7.3 旧ファイル削除 (Phase 5 安定後)

- `expo/constants/quick-log-master.ts`
- `expo/constants/dish-master.ts`
- `expo/constants/nutrition-data.ts` (新Identity層に置換)
- `expo/components/QuickIngredientSheet.tsx`
- `expo/components/DishQuickEntrySheet.tsx`

---

## 8. 共通制約

- **TypeScript strict mode**: 各 Phase 完了時に `cd expo && node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` で error/warning ゼロを確認
- **既存テストを壊さない**
- **PRD §6.5 食事傾向の自動学習** に整合: `defaultAddonIds` の並びは初期固定、`AppSettings.quickLogHistory` の頻度学習で動的並び替え可能な構造
- **PRD §6.7 過去日遡及記録** との互換性維持: 新 sheet も `loggingDate` を尊重、過去7日内なら遡及保存可
- **中立トーン** (PRD §9.1): 専門用語回避、平易ラベル
- **ngrok 禁止** (CLAUDE.md): LAN/Simulator/EAS Internal Distribution のみ
- **コード追加場所**: 新Identity/Add-on/migration ルールは `expo/constants/identity/` 配下にのみ追加。UI コンポーネントには直接ハードコードしない

---

## 9. 実行順序

1. **Phase 2** (resolver) を先に書く
2. **Phase 3** (UI) で resolver を呼ぶ
3. **Phase 4** (検索) は Phase 3 と並行可能
4. **Phase 5** (migration) は新 sheet 動作確認後に着手 (旧データ破壊リスク回避)
5. 各 Phase 完了時に `tsc --noEmit` で error ゼロ確認
6. 各 Phase で簡単な smoke test (Identity 1個記録 → ログ確認) を行う

---

## 10. 検証コマンド

```bash
cd expo

# TypeScript型チェック
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json

# ESLint
npx eslint .

# 起動 (LAN モード, ngrok禁止)
bun run start

# iOS Simulator
bun run start:ios
```

---

## 11. 完了基準

すべて満たすまで「完了」としない:

### 機能完了
- [ ] 9ボタン × 2タブ で新ラベルが正しく表示 (3×3 グリッド)
- [ ] **タップ即記録**: バケットの `quickTapDisabled` が false かつ first Identity の `quickTapDisabled` が false の場合、タップで default Identity の defaultMacro 即記録
- [ ] **タップで sheet 開く**: bucket または first Identity の `quickTapDisabled` が true の場合、タップで sheet 開く (寿司/ピザ/中華麺/定食・単品 など)
- [ ] **長押し**: 全バケットで sheet が開く
- [ ] sheet 内: Identity → Attribute → Style → 量 → Add-on の順で操作可能
- [ ] Pattern A (chips 不在) は数値入力欄のみ、Pattern B は chip + 数値入力
- [ ] Style migration: 揚げ Style 選択時にトーストで confirmMessage 表示、保存時に misc_dish 等で記録
- [ ] Attribute migration: chicken_thigh 皮なし は silent migration、UI は脂Pバケットのまま
- [ ] マルチエントランス検索: 「アボカド」が果物タブから、「プロテイン」がおやつ甘飲タブからヒット
- [ ] 既存ユーザーの FoodLog が起動時に新 ID にマイグレート

### コード品質
- [ ] tsc / lint error ゼロ
- [ ] 旧 sheet/master ファイルが削除されている (Phase 5)
- [ ] LAN モードで実機起動して全フロー動作確認
- [ ] resolver のユニットテスト6ケース全 pass

### 思想遵守
- [ ] PRD §6.5 「タップで即記録、長押しで詳細」が **逆転していない**
- [ ] バケットラベルが 5-6文字以内で読める
- [ ] 9バケット制約 (3×3) が崩れていない

---

## 12. 注意事項 (過去の落とし穴)

### ① タップ/長押し挙動の逆転
過去に Phase 2-5 実装時にタップで sheet が開き、長押しで即記録という逆挙動になったことあり。**§3 のテーブルを必ず守る**。

### ② quickTapDisabled の見落とし
`bucketDef?.quickTapDisabled || first?.quickTapDisabled` の **両方** をチェック。片方だけでは漏れる (バケットも Identity もどちらか一方しか flag を持たない場合がある)。

### ③ Style migration vs Attribute migration の優先順位
Style migration が発動した場合、Attribute は移動先 Identity の Attribute 系で再解釈する (例: `chicken_thigh` 皮なし + 揚げ → `fried_main`/Attribute=karaage で記録、皮なしは反映されない)。

### ④ Identity 流用 Add-on の同一 ID
卵を米の add-on として追加する場合、addon ID は `'egg'` (Identity ID と同じ)。Pure Addon と区別する `refType: 'identity' | 'addon'` フィールドで判別。

### ⑤ 既存 FoodLog の互換性
`identityId` が undefined のログは旧データ。新 UI でも閲覧できるよう、`migrateLegacyFoodLog()` の **未マップ条件は破棄せず保持**。

---

## 補足

- 不明点は `docs/IA-identity-spec.md` の該当セクションを参照
- 設計判断の根拠は `docs/PRD.md` §6.5, §9.1 を確認
- 各 Identity の量定義は `IA-identity-spec.md §6.4` の表を参照
- Migration ルール一覧は `IA-identity-spec.md §3` および `expo/constants/identity/migration-rules.ts`
