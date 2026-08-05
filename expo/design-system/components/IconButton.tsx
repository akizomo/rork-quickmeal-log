/**
 * IconButton — アイコン単体のタップ領域を統一する共通部品。
 *
 * アプリ内に「Pressable + Icon」の手書きパターンが close/削除/前後ナビ等で
 * 個別に重複し、サイズ(14〜22px)や色(secondary/tertiary)がドリフトしていた。
 * このコンポーネントに集約し、以後の close/削除/アイコンナビはすべて経由する。
 *
 * # variant
 *   - 'ghost'  — 背景なし (Dialog/BottomSheetの閉じるボタン等)
 *   - 'filled' — 円形の surface.raised 背景 (Homeヘッダーのアバター/ヘルプ/実績、
 *                週次・月次実績の前後ナビ等)
 *
 * # size
 *   - 'sm' — box 28 / icon 14 (削除・クリア等の副次的なアイコン)
 *   - 'md' — box 36 / icon 18 (標準の閉じるボタン)
 *   - 'lg' — box 42 / icon 22 (ヘッダーの主要アイコンボタン)
 *
 * # 使い方
 *   <IconButton icon="close" onPress={onClose} accessibilityLabel="閉じる" />
 *   <IconButton icon="user" variant="filled" size="lg" onPress={...} accessibilityLabel="プロフィール" />
 */

import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';

import { radius } from '../tokens/primitives/radius';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'ghost' | 'filled';
export type IconButtonTone = 'secondary' | 'tertiary' | 'danger' | 'action' | 'inverse';

const SIZE_MAP: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 28, icon: 14 },
  md: { box: 36, icon: 18 },
  lg: { box: 42, icon: 22 },
};

export type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  /** アイコン色。default: content.secondary */
  tone?: IconButtonTone;
  disabled?: boolean;
  hitSlop?: number;
  testID?: string;
  /** アイコン単体ボタンのため必須 */
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** アイコンの上に重ねるバッジ等 (絶対配置される想定)。既定は無し。 */
  children?: React.ReactNode;
};

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  tone = 'secondary',
  disabled,
  hitSlop = 8,
  testID,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
}: IconButtonProps) {
  const t = useTheme();
  const { box, icon: iconSize } = SIZE_MAP[size];
  const iconColor = disabled
    ? t.colors.content.disabled
    : tone === 'tertiary'
      ? t.colors.content.tertiary
      : tone === 'danger'
        ? t.colors.status.danger.default
        : tone === 'action'
          ? t.colors.action.text.default
          : tone === 'inverse'
            ? t.colors.content.inverse
            : t.colors.content.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[
        {
          width: box,
          height: box,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        variant === 'filled' ? { backgroundColor: t.colors.surface.raised } : null,
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={iconColor} />
      {children}
    </Pressable>
  );
}
