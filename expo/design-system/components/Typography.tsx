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
export type CaptionProps = BaseProps;

export function Caption({
  tone = 'tertiary',
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
