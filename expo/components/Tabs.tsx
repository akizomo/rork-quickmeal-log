import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { palette } from '@/constants/theme';

/**
 * Material 3 "Primary tabs" 風のタブ。
 * @see https://m3.material.io/components/tabs/overview
 *
 * 画面レベルの切替 (例: 食事 / からだ) に使う。
 * サブ階層の選択 (週 / 月 など) には SegmentedControl を使い、役割を分ける。
 *
 * 特徴:
 *  - ラベルはコンテナ幅を等分 (fixed tabs)
 *  - アクティブタブ下にアクティブインジケータ (上端角丸の下線)
 *  - 行全体の下に divider
 */
interface TabItem<T extends string = string> {
  key: T;
  label: string;
}

interface Props<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: ViewStyle;
  testID?: string;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  style,
  testID,
}: Props<T>) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.row}>
        {items.map((item) => {
          const active = item.key === value;
          return (
            <Pressable
              key={item.key}
              style={styles.tab}
              onPress={() => onChange(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`${testID ?? 'tabs'}-${item.key}`}
            >
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {item.label}
              </Text>
              <View style={[styles.indicator, active ? styles.indicatorActive : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const INDICATOR_HEIGHT = 3;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelActive: {
    color: palette.sageDeep,
  },
  labelInactive: {
    color: palette.textMuted,
  },
  indicator: {
    alignSelf: 'stretch',
    height: INDICATOR_HEIGHT,
    marginHorizontal: 16,
    borderTopLeftRadius: INDICATOR_HEIGHT,
    borderTopRightRadius: INDICATOR_HEIGHT,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: palette.sageDeep,
  },
});
