/**
 * SelectCard — 選択式のタイル。
 *
 * radio/checkbox をスタイルで表現する代わりに、カード全体の状態で選択を示す。
 * label / hint / leading / trailing を組み合わせられる。
 *
 *   <SelectCard
 *     selected={basis === 'male_basis'}
 *     onPress={() => setBasis('male_basis')}
 *     label="男性基準"
 *     hint="体脂肪率やカロリー目安の計算に使います"
 *   />
 */

import React from 'react';
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  Text,
} from 'react-native';
import { useTheme } from '../theme';

export type SelectCardProps = {
  label: string;
  hint?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function SelectCard({
  label,
  hint,
  selected = false,
  disabled = false,
  onPress,
  leading,
  trailing,
  testID,
  style,
}: SelectCardProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: hint ? 'flex-start' : 'center',
          gap: t.spacing['3'],
          paddingHorizontal: t.spacing['5'],
          paddingVertical: t.spacing['4'],
          borderRadius: t.radius.lg,
          borderWidth: 2,
          // default は薄い outline (タイル形状の認識だけ担う)。
          // selected 時はブランド色で注目を集める。
          borderColor: selected ? t.colors.border.focus : t.colors.border.subtle,
          // 選択時は action.primary.container (薄いブランド色) で
          // 「アクション済み」であることを色でも明示する。
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
      {leading ? <View style={{ flexShrink: 0 }}>{leading}</View> : null}
      <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
        {/* ロール的には Label (選択肢の「名前」)。<Label> を使わないのは、
            fontSize.lg (Labelが持たないサイズ) を使う大型タイル向けの見出しであり、
            かつ selected 状態で色を切り替える必要があるため。 */}
        <Text
          style={{
            fontSize: t.typography.fontSize.lg,
            lineHeight: t.typography.lineHeight.lg,
            fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
            color: selected
              ? t.colors.action.primary.onContainer
              : t.colors.content.primary,
          }}
        >
          {label}
        </Text>
        {/* ロール的には Body size="sm" (選択肢を説明する文章)。<Body> を使わないのは、
            この2行 (label/hint) が同じ gap レイアウトの中で色・weight含め密結合しているため。 */}
        {hint ? (
          <Text
            style={{
              fontSize: t.typography.fontSize.sm,
              lineHeight: t.typography.lineHeight.sm,
              color: t.colors.content.secondary,
            }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={{ flexShrink: 0 }}>{trailing}</View> : null}
    </Pressable>
  );
}
