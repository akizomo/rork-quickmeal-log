/**
 * MacroCard — PFC マクロ目標を表示する静的カード。
 *
 *   <MacroCard kind="protein" value={130} />
 *   <MacroCard kind="fat"     value={60} />
 *   <MacroCard kind="carbs"   value={220} />
 *
 * MacroChip (ログ上のピル表示) とは用途が異なり、目標値を大きめに
 * 静的表示するカード。P/F/C の英字だけでは伝わりにくいため、
 * 日本語名(たんぱく質/脂質/炭水化物)を併記する。
 * kind → 英字ラベル + 日本語ラベル + 専用 hue (nutrition.{protein/fat/carbs}) を内部解決。
 * 全ての色・spacing・radius は useTheme() 由来。
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
import type { MacroChipKind } from './MacroChip';

export type MacroCardProps = {
  kind: MacroChipKind;
  value: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const LABEL_BY_KIND: Record<MacroChipKind, string> = {
  protein: 'P',
  fat: 'F',
  carbs: 'C',
};

const LABEL_JA_BY_KIND: Record<MacroChipKind, string> = {
  protein: 'たんぱく質',
  fat: '脂質',
  carbs: '炭水化物',
};

export function MacroCard({ kind, value, style, testID }: MacroCardProps) {
  const t = useTheme();
  const palette = t.colors.nutrition[kind];

  return (
    <View
      testID={testID}
      style={[
        {
          flex: 1,
          backgroundColor: palette.background,
          borderRadius: t.radius.md,
          paddingVertical: t.spacing['2'],
          alignItems: 'center',
          gap: 2,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.spacing['1'] }}>
        {/* ロール的には Label (P/F/C = マクロ種別の「名前」)。MacroChip と同じ制約
            (fontSize.xs は Label が持たないサイズ、macro毎の色を直接当てる必要) の
            ため <Label> は使わない。 */}
        <Text
          style={{
            fontSize: t.typography.fontSize.xs,
            fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
            color: palette.text,
          }}
        >
          {LABEL_BY_KIND[kind]}
        </Text>
        <Text
          style={{
            fontSize: t.typography.fontSize.xs,
            fontWeight: t.typography.fontWeight.regular as TextStyle['fontWeight'],
            color: palette.text,
          }}
        >
          {LABEL_JA_BY_KIND[kind]}
        </Text>
      </View>
      <Text
        style={{
          fontSize: t.typography.fontSize.md,
          fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
          color: palette.text,
          marginTop: 2,
        }}
      >
        {Math.round(value)}g
      </Text>
    </View>
  );
}
