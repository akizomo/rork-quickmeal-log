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
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

export type ChipSize = 'sm' | 'compact' | 'md';

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Visual density. Default 'md'. Use 'sm' for dense lists / inside sheets. */
  size?: ChipSize;
  /** ラベル前に表示する Material アイコン (例: 選択中 'check' / 追加 'add') */
  leadingIcon?: IconName;
  /** ラベル後に表示する Material アイコン (例: 'chevronRight') */
  trailingIcon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  size = 'md',
  leadingIcon,
  trailingIcon,
  testID,
  style,
}: ChipProps) {
  const t = useTheme();
  const isSm = size === 'sm';
  const isCompact = size === 'compact';
  const textColor = selected
    ? t.colors.action.primary.onContainer
    : t.colors.content.primary;
  const iconSize = (isSm || isCompact) ? 12 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          paddingHorizontal: isSm ? t.spacing['3'] : isCompact ? t.spacing['3'] : t.spacing['4'],
          // compact: 6px は 4px グリッドの中間点。シート内チップ密度の意図的な調整値
          paddingVertical: isSm ? t.spacing['1'] : isCompact ? 6 : t.spacing['2'],
          borderRadius: t.radius.full,
          borderWidth: 1,
          borderColor: selected
            ? t.colors.border.selected
            : t.colors.border.interactive,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['1'] }}>
        {leadingIcon ? <Icon name={leadingIcon} size={iconSize} color={textColor} /> : null}
        {/* ロール的には Label (トグルの「名前」)。<Label> を使わないのは、
            sm時にfontSize.xs (Labelが持たないサイズ) まで詰める必要があり、
            かつ selected 状態で色が切り替わるため。 */}
        <Text
          style={{
            fontSize: isSm ? t.typography.fontSize.xs : t.typography.fontSize.sm,
            lineHeight: isSm ? t.typography.lineHeight.xs : t.typography.lineHeight.sm,  // compact も sm フォント
            fontWeight: t.typography.fontWeight.semibold as TextStyle['fontWeight'],
            color: textColor,
          }}
        >
          {label}
        </Text>
        {trailingIcon ? <Icon name={trailingIcon} size={iconSize} color={textColor} /> : null}
      </View>
    </Pressable>
  );
}
