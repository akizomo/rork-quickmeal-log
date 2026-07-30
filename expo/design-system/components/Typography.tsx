/**
 * Typography — Heading / Body / Label / Caption / Overline
 *
 * **選ぶ軸は「サイズ」ではなく「役割」**。まず役割でコンポーネントを決め、
 * その中でだけサイズを選ぶ。役割が決まればサイズはほぼ一意に定まる。
 *
 *   Heading  見出し。画面/カードのタイトル。                    lg 〜 display
 *   Body     読ませる文章。本文・説明文・注釈文。                 sm / md / lg
 *   Label    UI要素の「名前」。文章ではない短い名詞句。            sm / md
 *   Caption  添え物。単位・軸ラベル・数値の添え字。               xs 固定 (11px)
 *   Overline グループ見出し。設定画面の「データ」「情報」等。       sm 固定 (13px)
 *
 * Body と Label の境界は **文章か名前か** で判断する。
 *   ○ <Body size="sm">1日の目安より多めですが、週の合計では収まっています。</Body>
 *   ○ <Label size="sm">目標カロリー</Label>
 * 「ラベルなので太字にしたい」ときに `<Body weight="semibold">` としない — それは Label。
 *
 * Caption は文章に使わない。11px は読ませるサイズではない。説明文が短くても Body size="sm"。
 */

import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '../theme';

type ToneKey = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'onAction' | 'link';
type TypographySize = keyof Theme['typography']['fontSize'];

type BaseProps = Omit<TextProps, 'style'> & {
  tone?: ToneKey;
  align?: TextStyle['textAlign'];
  weight?: keyof Theme['typography']['fontWeight'];
  style?: TextProps['style'];
};

function resolveTone(theme: Theme, tone: ToneKey): string {
  switch (tone) {
    case 'secondary': return theme.colors.content.secondary;
    case 'tertiary':  return theme.colors.content.tertiary;
    case 'inverse':   return theme.colors.content.inverse;
    case 'onAction':  return theme.colors.content.onAction;
    case 'link':      return theme.colors.action.text.default;
    case 'primary':
    default:          return theme.colors.content.primary;
  }
}

// ---------- Heading ----------
export type HeadingProps = BaseProps & {
  size?: Extract<TypographySize, 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'display'>;
};

export function Heading({
  size = '2xl',
  tone = 'primary',
  align,
  weight = 'semibold',
  style,
  children,
  ...rest
}: HeadingProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: resolveTone(t, tone),
          fontSize: t.typography.fontSize[size],
          lineHeight: t.typography.lineHeight[size],
          fontWeight: t.typography.fontWeight[weight] as TextStyle['fontWeight'],
          letterSpacing: t.typography.letterSpacing.tight,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------- Body ----------
// 読ませる文章専用。size は sm(13=iOS Footnote) / md(15=既定) / lg(17) の3段。
// 11px の Body は存在しない — 文章を 11px にしたくなったら文量か階層を疑う (Caption は添え物専用)。
export type BodyProps = BaseProps & {
  size?: Extract<TypographySize, 'sm' | 'md' | 'lg'>;
};

export function Body({
  size = 'md',
  tone = 'primary',
  align,
  weight = 'regular',
  style,
  children,
  ...rest
}: BodyProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: resolveTone(t, tone),
          fontSize: t.typography.fontSize[size],
          lineHeight: t.typography.lineHeight[size],
          fontWeight: t.typography.fontWeight[weight] as TextStyle['fontWeight'],
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------- Label ----------
// UI要素の「名前」専用。トグル名・フォーム項目名・リスト行の見出し・統計カードの項目名など、
// 文章ではない短い名詞句を担う。semibold 既定なのは、ラベルが周囲の本文/数値から
// 独立した要素だと一目で分かる必要があるため。MD3 の Label ロール (Label Large/Medium/Small)
// に相当し、Button のラベルも概念上は同じロール。
//
//   size="lg"(17) Button のラベルと同じ大きさ。強調したい単発のUI要素名に使う稀なケース。
//   size="md"(15) 本文と同じ行に並ぶラベル。リスト行の主見出し、トグル名 (既定)。
//   size="sm"(13) 一段下がったラベル。フォーム項目名、カード内の項目名。
//
// letterSpacing は付けない。字間を広げるのは Overline (グループ見出し) の役割で、
// ラベルまで広げると「見出しの入れ子」に見えて階層が壊れる。
//
// Button (`tokens/components/button.ts`) は状態別の文字色 (pressed/disabled) や
// numberOfLines を Text に直接持たせる必要があるためこのコンポーネントを描画には使わないが、
// フォントサイズ/太さは同じ primitive (fontSize.sm/md/lg, fontWeight.semibold) から意図的に
// 揃えている。**この Label の size ラインナップを変えたら button.ts の size テーブルも見直すこと。**
export type LabelProps = BaseProps & {
  size?: Extract<TypographySize, 'sm' | 'md' | 'lg'>;
};

export function Label({
  size = 'md',
  tone = 'primary',
  align,
  weight = 'semibold',
  style,
  children,
  ...rest
}: LabelProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: resolveTone(t, tone),
          fontSize: t.typography.fontSize[size],
          lineHeight: t.typography.lineHeight[size],
          fontWeight: t.typography.fontWeight[weight] as TextStyle['fontWeight'],
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------- Caption ----------
// 単位・軸ラベル・数値の添え字など、ごく短い添え物専用。以下は Caption ではない:
//   文章 (説明文・注釈文) → Body size="sm"
//   UI要素の名前 (項目名・トグル名) → Label size="sm"
// 「軸ラベル」の"ラベル"は Label ロールではない。グラフの目盛りのように、
// 隣の主要素があって初めて意味を持つ添え物だけが Caption。
export type CaptionProps = BaseProps;

export function Caption({
  tone = 'secondary',
  align,
  weight = 'regular',
  style,
  children,
  ...rest
}: CaptionProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: resolveTone(t, tone),
          fontSize: t.typography.fontSize.xs,
          lineHeight: t.typography.lineHeight.xs,
          fontWeight: t.typography.fontWeight[weight] as TextStyle['fontWeight'],
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------- Overline ----------
// セクション/グループ見出し専用 (例: 設定画面の「データ」「情報」等)。
// Caption(11px)では小さすぎるため、Body smと同じ13pxをsemibold+letterSpacing.wideで
// 差別化する。MD3ではoverline(10px)自体が廃止されlabelLargeに統合された経緯を踏まえた値。
//
// Label size="sm" と同じ13px/semibold で、差は letterSpacing.wide のみ。使い分けは
// **複数要素をまとめているか**で決める:
//   Overline 後続の複数項目をグループ化する見出し (「データ」の下に3行の設定が続く)
//   Label    単一要素に付く名前 (その行のトグルの名前)
export type OverlineProps = Omit<BaseProps, 'weight'>;

export function Overline({
  tone = 'secondary',
  align,
  style,
  children,
  ...rest
}: OverlineProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: resolveTone(t, tone),
          fontSize: t.typography.fontSize.sm,
          lineHeight: t.typography.lineHeight.sm,
          fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
          letterSpacing: t.typography.letterSpacing.wide,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
