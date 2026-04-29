/**
 * NumberField — 大きな数値入力。
 *
 * オンボーディング Phase 1 の "身長/体重/年齢" 画面のように
 * 1画面1入力で視覚的にフォーカスさせる用途向け。
 *
 *   <NumberField value={h} onChangeText={setH} suffix="cm" size="display" autoFocus />
 */

import React from 'react';
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../theme';

type Size = 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'display';

export type NumberFieldProps = Omit<TextInputProps, 'style' | 'onChange'> & {
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
  /**
   * Type scale used for the value text. 'display' (default) is the onboarding
   * hero size; pick smaller values (lg/xl/2xl) for compact bottom-sheet inputs.
   */
  size?: Size;
  align?: 'left' | 'center' | 'right';
  decimal?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

// Vertical padding scales down with the visual size so a "compact" field
// doesn't keep the hero-sized whitespace around it.
const COMPACT_SIZES: ReadonlyArray<Size> = ['lg', 'xl', '2xl'];
function isCompact(size: Size): boolean {
  return COMPACT_SIZES.includes(size);
}

export function NumberField({
  value,
  onChangeText,
  suffix,
  size = 'display',
  align = 'center',
  decimal = true,
  style,
  inputStyle,
  ...rest
}: NumberFieldProps) {
  const t = useTheme();
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const compact = isCompact(size);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: justify,
          gap: t.spacing['2'],
          paddingVertical: compact ? t.spacing['2'] : t.spacing['4'],
        },
        style,
      ]}
    >
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        placeholderTextColor={t.colors.content.tertiary}
        selectionColor={t.colors.border.focus}
        style={[
          {
            color: t.colors.content.primary,
            fontSize: t.typography.fontSize[size],
            lineHeight: t.typography.lineHeight[size],
            fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
            letterSpacing: t.typography.letterSpacing.tighter,
            minWidth: compact ? 56 : 120,
            textAlign: align,
            paddingVertical: 0,
          },
          inputStyle,
        ]}
      />
      {suffix ? (
        <Text
          style={{
            color: t.colors.content.secondary,
            fontSize: compact ? t.typography.fontSize.sm : t.typography.fontSize.lg,
            fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
          }}
        >
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}
