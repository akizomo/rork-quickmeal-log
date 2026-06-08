import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import type { ColorValue } from 'react-native';

/**
 * 中央アイコン抽象。
 *
 * アプリ全体のUIアイコンは **必ずこの `Icon` を経由** すること。
 * 各画面が `@expo/vector-icons` や他のアイコンライブラリを直接 import するのは禁止。
 * ライブラリを差し替える際は、下の `ICON_GLYPH` を1箇所書き換えれば全画面に反映される。
 *
 * 採用: Material Icons (outlined 寄り)。トーン「静かな日本語ウェルネス」に合わせ、
 *       outline バリアントがあるものは outline を選ぶ。
 *
 * 注意: 体型シルエット / グラフ / ロゴ等の **ドメイン描画 (react-native-svg)** は
 *       UIアイコンではないため、ここには含めない。
 */

/** 意味ベースのアイコン名 → MaterialIcons グリフ名 (outlined 寄り) */
const ICON_GLYPH = {
  close: 'close',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'keyboard-arrow-down',
  edit: 'edit',
  add: 'add',
  redirect: 'subdirectory-arrow-right',
  delete: 'delete-outline',
  barChart: 'bar-chart',
  check: 'check',
  help: 'help-outline',
  search: 'search',
  user: 'person-outline',
} as const satisfies Record<string, React.ComponentProps<typeof MaterialIcons>['name']>;

export type IconName = keyof typeof ICON_GLYPH;

export interface IconProps {
  /** 意味ベースのアイコン名 (例: 'close', 'chevronRight') */
  name: IconName;
  /** ピクセルサイズ (既定 24) */
  size?: number;
  /** 色 (テーマカラー文字列を渡す) */
  color?: ColorValue;
}

export function Icon({ name, size = 24, color }: IconProps) {
  return <MaterialIcons name={ICON_GLYPH[name]} size={size} color={color} />;
}
