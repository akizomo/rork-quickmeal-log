/**
 * Typography — Heading / Body / Caption
 *
 * 役割ごとにコンポーネントを分け、サイズは token に沿ったキーで指定する。
 *   <Heading size="2xl">タイトル</Heading>
 *   <Body tone="secondary">本文</Body>
 *   <Caption>注釈</Caption>
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
export type BodyProps = BaseProps & {
  size?: Extract<TypographySize, 'xs' | 'sm' | 'md' | 'lg'>;
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

// ---------- Caption ----------
// 単位・軸ラベル・数値の添え字など、ごく短い添え物専用。文章 (説明文・注釈文) には
// 使わないこと — 読ませる文章は Body size="sm" を使う。
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
