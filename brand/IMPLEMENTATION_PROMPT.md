# アプリ反映プロンプト — Hachibu Logo & Name

このプロンプトを Claude Code または開発者に渡すと、新ロゴ/ネームを Expo Router アプリに反映できます。

---

## 📋 渡すプロンプト本文（ここから下をそのままコピー）

Expo Router (React Native) アプリ `expo/` のブランド情報を、新しいロゴ「Hachibu」に差し替えてください。**ロゴとアプリ名のみを更新**します。カラー、タイポグラフィ、ボイス、その他のビジュアル要素は既存実装をそのまま維持してください。

### 採用ブランド情報

- **アプリ名**: `Hachibu` (英語表記。日本語サブタイトルが必要な場面では `八分` を併記可)
- **タグライン**: `Eight Tenths is Enough.` / 日本語版 `八分でいい。`
- **ロゴ**: 3×3 ドットマトリクス。右下セル削除。下中央セルが 20% 不透明度の "8番目のドット"。
- **カラー**: ロゴは単色。既存アプリのプライマリテキストカラーに合わせる（モノクロ運用）

### アセット配置

ロゴアセットは `brand/assets/` に既に配置済み:

```
brand/assets/
├── README.txt                       — 仕様書
├── mark.svg                         — 単色マーク (#1A1916)
├── mark_white.svg                   — 白マーク
├── mark_black.png                   1024×1024、透過
├── mark_white.png                   1024×1024、透過、白
├── mark_compact_black.png           7ドット版（≤16px フォールバック）
├── mark_compact_white.png           〃 白
├── lockup_horizontal.svg            マーク + Hachibu 横組
├── lockup_horizontal_black.png      2400×800
├── lockup_horizontal_white.png      〃 白
└── lockup_stacked_black.png         縦組
```

### 必要な変更

#### 1. `expo/app.json`

- `expo.name`: `"Quiet Nutrition"` → `"Hachibu"`
- `expo.icon`: 新しい `mark.svg` ベースで生成した PNG に差し替え
- `expo.splash.image`: スプラッシュを Hachibu マークベースに更新
- `expo.android.adaptiveIcon.foregroundImage`: 同上
- `expo.web.favicon`: ファビコンを Hachibu マークに更新

#### 2. アセット差し替え (`expo/assets/images/`)

以下のファイルを、`brand/assets/` のソースから生成して上書き:

| 既存ファイル | 元アセット | サイズ・備考 |
|-----|-----|-----|
| `icon.png` | `mark_black.png` | 1024×1024、iOS 用。背景は既存と合わせる（白 or 既存ベタ色）。中央にマーク、上下左右マージンは「セル幅×1」分 |
| `adaptive-icon.png` | `mark_black.png` | 1024×1024、Android 用。foregroundImage なのでセーフゾーンを意識（中心 66% 内にマーク収める） |
| `splash-icon.png` | `mark_black.png` | スプラッシュ。マークだけ。サイズは既存と同じ |
| `favicon.png` | `mark_compact_black.png` | 16〜32px サイズ。**薄ドットは消える**ので 7ドット版を使う |
| `favicon-32.png` | `mark_compact_black.png` | 32×32 |

> **重要**: `favicon` と 16px 以下の用途では `mark_compact_*.png` （7ドット版）を使用。20% の薄ドットは可視サイズが必要。

#### 3. ソースコードのテキスト書き換え

以下のファイル内で `Quiet Nutrition` を `Hachibu` に置換:

- `expo/app/settings.tsx`
- `expo/app/modal.tsx`
- `expo/app.json` (上記 1 と同じ)

加えて、以下も確認:
- `expo/app/intro.tsx`、`expo/app/onboarding.tsx`、`expo/app/about.tsx` 内に「Quiet Nutrition」もしくは類似のアプリ名表記があれば `Hachibu` に統一
- ヘッダーや welcome 画面で表示される「app title」の文字列を全て `Hachibu` に
- もし日本語表記が必要な場面があれば `八分` を補助的に併記（例: ロックアップで `Hachibu / 八分`）

#### 4. 共通 Logo コンポーネントを新設

`expo/components/Logo.tsx` を作成。`react-native-svg` を使ってロゴをインライン描画するコンポーネント:

```tsx
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  /** Below 16px, use compact (7-dot) variant — the faded 8th dot disappears at small sizes. */
  compact?: boolean;
};

/**
 * Hachibu logo mark.
 * 3×3 grid, bottom-right cell removed, bottom-middle cell at 20% opacity.
 * The faded 8th dot is the brand thesis (80% on a 9-cell grid is impossible).
 */
export function Logo({ size = 48, color = "#1A1916", compact }: Props) {
  // Auto-fallback to compact variant at very small sizes
  const useCompact = compact ?? size < 16;
  const cell = size / 4;
  const dotR = cell * 0.32;
  const cells: { row: number; col: number; opacity: number }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 2) continue;            // missing cell
      if (row === 2 && col === 1 && useCompact) continue; // skip 8th in compact
      const opacity = row === 2 && col === 1 ? 0.2 : 1;
      cells.push({ row, col, opacity });
    }
  }
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map(({ row, col, opacity }, i) => (
          <Circle
            key={i}
            cx={col * cell + cell + cell / 2}
            cy={row * cell + cell + cell / 2}
            r={dotR}
            fill={color}
            opacity={opacity}
          />
        ))}
      </Svg>
    </View>
  );
}
```

`react-native-svg` が未導入なら `bun add react-native-svg` で追加。Expo SDK と互換のあるバージョンを使うこと（現時点では auto resolve で問題なし）。

#### 5. ロゴコンポーネントの利用箇所

以下の箇所で従来のテキスト/アイコンを `<Logo />` に差し替え:

- `expo/app/intro.tsx` のヒーローエリア（`<Logo size={120} />` 程度）
- `expo/app/about.tsx` のヘッダー（`<Logo size={48} />`）
- `expo/app/_layout.tsx` のヘッダー左にロゴを置く実装になっている場合

その他の画面（home / onboarding / status 等）の見た目は変更しない。

### 実装手順

1. アセット差し替え（手作業もしくは画像生成ツールで PNG を `expo/assets/images/` に上書き）
2. `app.json` の `name` を `Hachibu` に更新
3. ソース内の `Quiet Nutrition` を `Hachibu` に置換 (3ファイル)
4. `react-native-svg` を導入 (未導入の場合)
5. `expo/components/Logo.tsx` を新規作成（上記コード）
6. intro / about などの主要画面でロゴ表示を `<Logo />` に置換

### 受け入れ条件

- `expo/app.json` の `expo.name` が `Hachibu`
- iOS シミュレータでビルドした際、アプリ名・スプラッシュ・アイコンが新しいものになっている
- Web ビルドのファビコンに 7ドット版が表示される
- intro / about 画面で `<Logo />` コンポーネントがレンダリングされる
- 既存のカラーパレット・フォント・コピーは変更されていない（差分は app.json + 3 つのテキスト置換 + 新規 Logo.tsx + アセット 5 種のみ）
- `bun run start-web` でビルドエラーなし、`expo lint` がパス
- ngrok / tunnel モードは絶対に使わない（Woven AUP 準拠、`bun run start` の LAN モード or simulator で確認）

### やらないこと

- カラートークン（既存の design-system）の変更
- タイポグラフィの変更
- 体型イラスト、Quick Log、My Status の見た目変更
- README やドキュメントの大幅な書き換え（ブランド名が出る箇所のみ）
- 既存コンポーネントのリファクタ
- ngrok / `expo start --tunnel` の利用

---

## 🎯 このプロンプトの設計意図

- **採用範囲を狭く明示**: 「ロゴ + ネームのみ」と冒頭で宣言し、最後の "やらないこと" でも再確認 → スコープクリープ防止
- **アセット位置を絶対パスで提示**: ハンドオフで一番事故るのが「どのファイルを使うのか」 → リスト化
- **コンポーネント化を提案**: PNG 差し替えだけでなく、`<Logo />` を作っておけば将来サイズ・色を柔軟に変えられる
- **16px 以下の特例を明示**: 朧ドットは小サイズで消えるので fallback ロジックを明文化
- **受け入れ条件と "やらないこと" を分離**: 受け入れ条件で「何ができていれば OK か」を、やらないことで「触っちゃいけないもの」を分けて可視化
- **CLAUDE.md の ngrok 禁止ルールも反映**: プロジェクト固有のルールはプロンプトに織り込む
