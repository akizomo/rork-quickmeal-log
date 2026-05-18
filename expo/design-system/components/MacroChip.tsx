/**
 * MacroChip — PFC マクロ表示用の小さなピル。
 *
 *   <MacroChip kind="protein" value={30} />
 *   <MacroChip kind="fat"     value={12} />
 *   <MacroChip kind="carbs"   value={45} />
 *
 * kind → ラベル(P/F/C) + 専用 hue (nutrition.{protein/fat/carbs}) を内部解決。
 * 全ての色・spacing・radius は useTheme() 由来。
 *
 * 既存 Badge は子要素 1 つ前提のため流用せず、ラベル + 数値の 2 テキスト
 * 構成で独立した atom として実装する。
 */

import React from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type MacroChipKind = 'protein' | 'fat' | 'carbs';
export type MacroChipSize = 'sm' | 'md';

export type MacroChipProps = {
  kind: MacroChipKind;
  value: number;
  size?: MacroChipSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const LABEL_BY_KIND: Record<MacroChipKind, string> = {
  protein: 'P',
  fat: 'F',
  carbs: 'C',
};

export function MacroChip({
  kind,
  value,
  size = 'sm',
  style,
  testID,
}: MacroChipProps) {
  const t = useTheme();
  const palette = t.colors.nutrition[kind];
  const isSm = size === 'sm';

  const paddingH = isSm ? t.spacing['2'] : t.spacing['3'];
  const paddingV = isSm ? 2 : t.spacing['1'];
  const fontSize = isSm ? t.typography.fontSize.xs : t.typography.fontSize.sm;
  const lineHeight = isSm ? t.typography.lineHeight.xs : t.typography.lineHeight.sm;
  const gap = isSm ? t.spacing['1'] : t.spacing['1.5'];

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: t.radius.full,
          backgroundColor: palette.container,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize,
          lineHeight,
          fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
          color: palette.default,
        }}
      >
        {LABEL_BY_KIND[kind]}
      </Text>
      <Text
        style={{
          fontSize,
          lineHeight,
          fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
          color: palette.default,
        }}
      >
        {Math.round(value)}
      </Text>
    </View>
  );
}
