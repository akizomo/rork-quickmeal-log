# Design System

Material Design × iOS HIG 両対応のデザインシステム。
統一性と可変性を両立するため、**4層構造のトークン**を採用する。

```
Primitive Tokens  (生の値、意味なし)
      ↓
Semantic Tokens   (意味付け: surface / content / action …)
      ↓
Component Tokens  (コンポーネント固有: button.primary.background …)
      ↓
UI Components     (Button / Card / …)
```

## ディレクトリ

```
design-system/
├── tokens/
│   ├── primitives/   # 色スケール・spacing・typography・radius・elevation・motion
│   ├── semantic/     # 役割ベースのトークン (surface / content / action / border / status)
│   └── components/   # Button / Card などのコンポーネント固有トークン
├── theme/
│   ├── light.ts            # Light テーマ実体
│   └── ThemeProvider.tsx   # Context 配布 (dark 拡張の布石)
├── components/       # Button / Card (PoC)
└── index.ts          # 集約エクスポート
```

## 使い方

### 1. ルートで ThemeProvider を被せる

```tsx
// expo/app/_layout.tsx など
import { ThemeProvider } from '@/design-system';

export default function RootLayout() {
  return (
    <ThemeProvider>
      {/* ... */}
    </ThemeProvider>
  );
}
```

### 2. コンポーネントを使う

```tsx
import { Button, Card } from '@/design-system';

<Card variant="raised">
  <Text>今日の記録</Text>
  <Button label="保存する" variant="primary" onPress={save} />
</Card>
```

### 3. テーマを直接参照する (カスタムコンポーネント)

```tsx
import { useTheme } from '@/design-system';

function MyBadge() {
  const theme = useTheme();
  return (
    <View style={{
      backgroundColor: theme.colors.accent.subtle,
      padding: theme.spacing['2'],
      borderRadius: theme.radius.md,
    }}>
      {/* ... */}
    </View>
  );
}
```

## 命名規則 (E-2)

- semantic は `{category}.{role}.{state?}` のドット階層
  - 例: `surface.default`, `action.primary.pressed`, `border.focus`
- component は `{component}.{variant}.{part}.{state?}`
  - 例: `button.primary.background.pressed`

## 色相の役割ルール

primitive の色相 (hue) ごとに担う役割を固定し、semantic 層が必ずこのルールで primitive を選ぶ。

| 色相 | 役割 | Semantic 例 |
|---|---|---|
| **ivory** | 紙・面・境界線。light も dark も面の家系。 | `surface.*`, `border.default/subtle/inverse` |
| **stone** | 描画物。text/icon/強い border/反転面上のテキスト。 | `content.*`, `border.strong` |
| **sage** | ブランド/操作。アクティブ要素、フォーカスリング、text link。 | `action.primary`, `action.text`, `border.focus` |
| **lavender** | 控えめなハイライト・ゴール達成演出 (dusty / muted、暖色系 PFC と hue family 分離)。 | `accent.*` |
| **moss / amber / clay / slate** | status (success / warning / danger / info) + カロリー/トレンドなどアラート系。macro (PFC) には使わない。 | `status.*`, `nutrition.calorie.*`, `nutrition.trend.*` |
| **rose / cinnamon / olive** | PFC macro 専用。status 色と視覚的に衝突しないよう分離した食物系 hue。 | `nutrition.protein`, `nutrition.fat`, `nutrition.carbs` |

**原則**:
- body text (`content.primary`) と text link (`action.text`) は異なる hue にする。同じ sage で明度差だけだとアフォーダンスが弱い。
- surface.inverse は ivory の暗端 (同家系でフリップ) を使い、ブランド色と混同させない。
- ダークモードでは ivory の 50↔900 / stone の 50↔900 を反転させるだけで成立する。
- **アクセシビリティ (WCAG AA 4.5:1)**: `action.primary.default` は sage[800] 以上の暗さを確保。`action.text.default` も sage[700] 以上。薄い sage を filled button 背景に使わない。
- 「選択済み状態」は必ずブランドに紐づいた色 (`action.primary.container`) で表現する。`accent.*` は装飾ハイライト専用で、「選ばれた」状態には使わない。

## ドメイン (nutrition) の運用ルール

栄養・進捗の可視化 (PFC バー、カロリーリング、体重トレンド等) は、UI の一般状態 (`status.*`) と分けて `nutrition.*` から取得する。

| 用途 | トークン | 色相 | 備考 |
|---|---|---|---|
| Protein バー | `nutrition.protein.default/container` | **rose** | pink-red、肉・筋肉の連想。`status.danger` (clay) と視覚的に分離 |
| Fat バー | `nutrition.fat.default/container` | **cinnamon** | red-brown、バター・油の連想。`status.warning` (amber) の黄金と hue family を分離 |
| Carbs バー | `nutrition.carbs.default/container` | **olive** | yellow-green、穀物・野菜の連想。`status.success` (moss) と視覚的に分離 |
| カロリー予算内 | `nutrition.calorie.within` | moss | 健康的 |
| カロリー軽度超過 | `nutrition.calorie.mildExceed` | amber | 注意喚起 |
| カロリー大幅超過 | `nutrition.calorie.severeExceed` | clay | 明確な警告 |
| 空のリング/バー | `nutrition.calorie.track` | ivory | 進捗の「入れ物」 |
| トレンド改善 | `nutrition.trend.improve` | moss | 目標に向かう |
| トレンド悪化 | `nutrition.trend.worsen` | amber | danger ではなく warning の温度感 |
| トレンド維持 | `nutrition.trend.stable` | stone | ニュートラル |

**原則**:
- グラフ・バー・リングは `status.*` や `action.*` を流用しない (操作/状態と情報の混同を避ける)
- **macro (PFC) の hue は status と分離** (rose / cinnamon / olive の食物系 hue を専用使用)
- **calorie / trend の hue は status と共有可** (意味が "アラート" で重なるため)
- P=rose / F=cinnamon / C=olive の **3色は固定**。画面ごとに別の配色を作らない

## Material × iOS HIG 両対応

| 観点 | 本DS の扱い |
|---|---|
| Elevation | primitive の `elevation.*` (shadow + Android elevation) を semantic/component で解決 |
| Touch target | button.size.md の height を 48 に統一 (HIG 44 / Material 48 の大きい方) |
| Corner radius | `radius.lg (16)` = button / `radius.2xl (24)` = card (HIG 寄り) |
| Typography | Plus Jakarta Sans 固定、SF / Roboto にフォールバック |

## ダークモード (将来)

`tokens/semantic/dark.ts` を追加し、`ThemeProvider` に切替ロジックを載せる。
コンポーネントはすべて semantic 値のみ参照しているため、値差し替えだけで完結する。

## 既存 palette との共存 (A-1 段階移行)

- `expo/constants/theme.ts` の `palette` は当面残す
- 新規コード・リファクタ対象は DS を使う
- PoC 後、画面単位で段階的に DS に置き換える

## ロードマップ

- [x] Primitive / Semantic / Component tokens
- [x] Button / Card PoC
- [ ] Input / TextField
- [ ] Sheet / Modal
- [ ] Chip / Badge
- [ ] Typography コンポーネント (Heading / Body / Caption)
- [ ] Dark theme
- [ ] Motion helpers (useSpring / useFade)
