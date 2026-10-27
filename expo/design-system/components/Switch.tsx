/**
 * Switch — オン / オフのトグル (OS 標準の Switch に、アプリの色を当てたもの)。
 *
 * RN の Switch を色の指定なしで使うと、Android では OS の既定の緑 (ティール)、iOS では緑になり、
 * アプリのブランド色 (sage) と合わなかった (2026-10-27)。3 か所で個別に色を指定せずに済むよう、ここにまとめる。
 *
 *   オン  = action.primary.default の トラック + content.onAction のつまみ
 *   オフ  = border.interactive のトラック + surface.raised のつまみ (押せる要素の輪郭と同じ濃さ)
 *
 * 画面側は `<Switch value onValueChange accessibilityLabel />` だけ書く。色の props は受け付けない。
 */

import React from 'react';
import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

import { useTheme } from '../theme';

export type SwitchProps = Omit<RNSwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

export function Switch({ value, ...rest }: SwitchProps) {
  const t = useTheme();
  return (
    <RNSwitch
      {...rest}
      value={value}
      trackColor={{ false: t.colors.border.interactive, true: t.colors.action.primary.default }}
      thumbColor={value ? t.colors.content.onAction : t.colors.surface.raised}
      // iOS はオフのときの背景を別に持つ。トラックと同じ色にして、オフの見た目を Android とそろえる
      ios_backgroundColor={t.colors.border.interactive}
    />
  );
}
