/**
 * CountChip — 個数を持てる Chip (同じトッピングを重ねる用途)。
 *
 * - 未選択: 通常の Chip と同じ。タップで 1 個追加。
 * - 選択中: ピルの中が左右に分かれる。
 *     左 (✕ + 名前 ×N) = 個数に関わらず 1 タップで取り消し
 *     右 (＋)          = 1 個追加 (max で無効)
 *   別チップを増やさず、1 つのピル内で完結させる (ダブルチーズ・チャーシュー3枚)。
 *
 *   <CountChip label="チーズ" count={2} max={4} onChange={setCount} />
 */

import React from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';

export type CountChipProps = {
  label: string;
  /** 現在の個数。0 = 未選択。 */
  count: number;
  /** 個数の上限。省略時 4。 */
  max?: number;
  onChange: (next: number) => void;
  testID?: string;
};

export function CountChip({ label, count, max = 4, onChange, testID }: CountChipProps) {
  const t = useTheme();
  const selected = count > 0;
  const textColor = selected ? t.colors.action.primary.onContainer : t.colors.content.primary;
  const textStyle: TextStyle = {
    fontSize: t.typography.fontSize.sm,
    lineHeight: t.typography.lineHeight.sm,
    fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: textColor,
  };
  // Chip (compact) と同じ縦横の密度。6px は 4px グリッドの中間点で Chip 側と揃えた調整値
  const padV = 6;
  const padH = t.spacing['3'];

  const shell = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: t.radius.full,
    borderWidth: 1,
    overflow: 'hidden' as const,
    borderColor: selected ? t.colors.border.selected : t.colors.border.interactive,
    backgroundColor: selected ? t.colors.action.primary.container : t.colors.surface.raised,
  };

  if (!selected) {
    return (
      <Pressable
        onPress={() => onChange(1)}
        accessibilityRole="button"
        accessibilityState={{ selected: false }}
        testID={testID}
        style={({ pressed }) => [
          shell,
          {
            paddingHorizontal: padH,
            paddingVertical: padV,
            backgroundColor: pressed ? t.colors.surface.sunken : t.colors.surface.raised,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['1'] }}>
          <Icon name="add" size={12} color={textColor} />
          <Text style={textStyle}>{label}</Text>
        </View>
      </Pressable>
    );
  }

  const canAdd = count < max;
  return (
    <View style={shell}>
      <Pressable
        onPress={() => onChange(0)}
        accessibilityRole="button"
        accessibilityLabel={`${label}を外す`}
        testID={testID}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing['1'],
          paddingLeft: padH,
          paddingRight: t.spacing['2'],
          paddingVertical: padV,
          backgroundColor: pressed ? t.colors.surface.sunken : 'transparent',
        })}
      >
        <Icon name="close" size={12} color={textColor} />
        <Text style={textStyle}>{count > 1 ? `${label} ×${count}` : label}</Text>
      </Pressable>
      <View style={{ width: 1, alignSelf: 'stretch', marginVertical: t.spacing['1'], backgroundColor: t.colors.border.selected }} />
      <Pressable
        onPress={() => onChange(count + 1)}
        disabled={!canAdd}
        accessibilityRole="button"
        accessibilityLabel={`${label}をもう1つ足す`}
        testID={testID ? `${testID}-add` : undefined}
        style={({ pressed }) => ({
          paddingLeft: t.spacing['2'],
          paddingRight: padH,
          paddingVertical: padV,
          opacity: canAdd ? 1 : 0.4,
          backgroundColor: pressed && canAdd ? t.colors.surface.sunken : 'transparent',
        })}
      >
        <Icon name="add" size={12} color={textColor} />
      </Pressable>
    </View>
  );
}
