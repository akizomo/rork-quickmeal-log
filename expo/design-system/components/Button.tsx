/**
 * Button — DS PoC コンポーネント。
 *
 * - variant: primary / secondary / ghost
 * - size: sm / md / lg
 * - C-2 方針: Platform 分岐はコンポーネント層で行う (iOS は active opacity、
 *   Android は ripple 相当の pressed color) — React Native Pressable が
 *   両プラットフォームで良い挙動を取るため、ここではシンプルに pressed 色のみ分岐。
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../theme';
import type { ButtonSize, ButtonVariant } from '../tokens/components';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leading,
  trailing,
  fullWidth = false,
  style,
  labelStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { variant: variantTokens, size: sizeTokens, fontWeight } = theme.components.button;
  const v = variantTokens[variant];
  const s = sizeTokens[size];

  const isDisabled = disabled || loading;

  const getContainerStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
      const bg = isDisabled
        ? v.background.disabled
        : pressed
          ? v.background.pressed
          : v.background.default;
      const borderColor = pressed ? v.border.pressed : v.border.default;
      return [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: s.radius,
          height: s.height,
          paddingHorizontal: s.paddingH,
          gap: s.gap,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ];
    },
    [v, s, variant, isDisabled, fullWidth, style],
  );

  const textColor = isDisabled ? v.label.disabled : v.label.default;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={getContainerStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      hitSlop={8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: s.fontSize,
                lineHeight: s.lineHeight,
                fontWeight: fontWeight as TextStyle['fontWeight'],
              },
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {trailing ? <View>{trailing}</View> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
