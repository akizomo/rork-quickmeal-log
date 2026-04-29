/**
 * Chip — トグル可能な小さなピル状タグ。
 *
 * 横並びで複数選択可能なカテゴリ (よく食べるもの、食事スタイル等) で使う。
 * SelectCard より小さく、並列に複数並べる用途向け。
 *
 *   <Chip label="ごはんもの" selected onPress={toggle} />
 */

import React from 'react';
import {
  Pressable,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type ChipSize = 'sm' | 'md';

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Visual density. Default 'md'. Use 'sm' for dense lists / inside sheets. */
  size?: ChipSize;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  size = 'md',
  testID,
  style,
}: ChipProps) {
  const t = useTheme();
  const isSm = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          paddingHorizontal: isSm ? t.spacing['3'] : t.spacing['4'],
          paddingVertical: isSm ? t.spacing['1'] : t.spacing['2'],
          borderRadius: t.radius.full,
          borderWidth: 1,
          borderColor: selected
            ? t.colors.border.focus
            : t.colors.border.subtle,
          backgroundColor: selected
            ? t.colors.action.primary.container
            : pressed
              ? t.colors.surface.sunken
              : t.colors.surface.raised,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: isSm ? t.typography.fontSize.xs : t.typography.fontSize.sm,
          lineHeight: isSm ? t.typography.lineHeight.xs : t.typography.lineHeight.sm,
          fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
          color: selected
            ? t.colors.action.primary.onContainer
            : t.colors.content.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
