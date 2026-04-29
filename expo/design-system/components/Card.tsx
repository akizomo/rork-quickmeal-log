/**
 * Card — DS PoC コンポーネント。
 *
 * - variant: raised / flat / outlined
 * - 角丸・パディング・影は component token から取得
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { CardVariant } from '../tokens/components';

export type CardProps = {
  variant?: CardVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ variant = 'raised', children, style, testID }: CardProps) {
  const theme = useTheme();
  const tokens = theme.components.card;
  const v = tokens.variant[variant];

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: v.background,
          borderRadius: tokens.radius,
          padding: tokens.padding,
          gap: tokens.gap,
          borderWidth: v.border.width,
          borderColor: v.border.color,
          ...v.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'visible',
  },
});
