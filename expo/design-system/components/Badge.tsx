/**
 * Badge — 小さなピル型ラベル。
 *
 * 用途例:
 *   <Badge tone="accent">おすすめ</Badge>       // ハイライト装飾 (lavender)
 *   <Badge tone="brand">1.0x</Badge>           // 現在値 indicator (sage)
 *   <Badge tone="success">記録済</Badge>
 *   <Badge tone="warning">残り3日</Badge>
 *   <Badge tone="neutral">optional</Badge>
 *
 * tone の使い分け:
 *   - accent  : 装飾ハイライト (おすすめ / NEW 等)
 *   - brand   : selected / active / current indicator
 *   - neutral : 補助情報 (optional 表示など)
 *   - success / warning / danger / info : status 表示
 */

import React from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme, type Theme } from '../theme';

export type BadgeTone =
  | 'accent'
  | 'brand'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'sm' | 'md';

export type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  style,
  testID,
}: BadgeProps) {
  const t = useTheme();
  const p = resolveBadgePalette(t, tone);
  const dims =
    size === 'md'
      ? {
          paddingH: t.spacing['3'],
          paddingV: t.spacing['1'],
          fontSize: t.typography.fontSize.sm,
          lineHeight: t.typography.lineHeight.sm,
        }
      : {
          paddingH: t.spacing['2'],
          paddingV: 2,
          fontSize: t.typography.fontSize.xs,
          lineHeight: t.typography.lineHeight.xs,
        };

  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: p.bg,
          paddingHorizontal: dims.paddingH,
          paddingVertical: dims.paddingV,
          borderRadius: t.radius.full,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: dims.fontSize,
          lineHeight: dims.lineHeight,
          fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
          color: p.fg,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

function resolveBadgePalette(t: Theme, tone: BadgeTone): { bg: string; fg: string } {
  switch (tone) {
    case 'accent':
      return { bg: t.colors.accent.subtle, fg: t.tokens.colors.ai[700] };
    case 'brand':
      return {
        bg: t.colors.action.primary.container,
        fg: t.colors.action.primary.onContainer,
      };
    case 'success':
      return { bg: t.tokens.colors.moss[100], fg: t.tokens.colors.moss[700] };
    case 'warning':
      return { bg: t.tokens.colors.amber[100], fg: t.tokens.colors.amber[700] };
    case 'danger':
      return { bg: t.tokens.colors.clay[100], fg: t.tokens.colors.clay[700] };
    case 'info':
      return { bg: t.tokens.colors.fog[100], fg: t.tokens.colors.fog[700] };
    case 'neutral':
    default:
      return { bg: t.colors.surface.sunken, fg: t.colors.content.secondary };
  }
}
