import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { palette } from '@/constants/theme';

/**
 * Material 3 "Primary tabs" 風のタブ。
 * @see https://m3.material.io/components/tabs/overview
 *
 * アニメーション仕様 (M3):
 *  - インジケーター幅 = ラベル幅
 *  - インジケーターはラベル中央下に配置
 *  - Easing: emphasized — cubic-bezier(0.2, 0, 0, 1.0)、300ms
 */

const M3_EMPHASIZED = Easing.bezier(0.2, 0, 0, 1.0);
const INDICATOR_DURATION = 300;
const INDICATOR_HEIGHT = 3;

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
  const [containerWidth, setContainerWidth] = useState(0);
  // 各ラベルの幅を記録
  const [labelWidths, setLabelWidths] = useState<number[]>(() => items.map(() => 0));

  const tabWidth = containerWidth > 0 ? containerWidth / items.length : 0;
  const activeIndex = items.findIndex((i) => i.key === value);

  // indicatorX: transform.translateX → useNativeDriver: true
  // indicatorW: width (layout prop) → useNativeDriver: false
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;

  // インジケーターの目標 X = タブ中央 - ラベル幅/2
  const getTargetX = (index: number, lw: number) =>
    index * tabWidth + tabWidth / 2 - lw / 2;

  // activeIndex or labelWidths or tabWidth が変わったらアニメーション
  // translateX と width は useNativeDriver が異なるため parallel 不可 → 独立起動
  useEffect(() => {
    const lw = labelWidths[activeIndex] ?? 0;
    if (tabWidth <= 0 || lw <= 0) return;

    Animated.timing(indicatorX, {
      toValue: getTargetX(activeIndex, lw),
      duration: INDICATOR_DURATION,
      easing: M3_EMPHASIZED,
      useNativeDriver: true,
    }).start();

    Animated.timing(indicatorW, {
      toValue: lw,
      duration: INDICATOR_DURATION,
      easing: M3_EMPHASIZED,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, labelWidths, tabWidth]);

  // コンテナ幅が初めて確定したらスナップ（アニメなし）
  const initialized = useRef(false);
  useEffect(() => {
    if (tabWidth <= 0) return;
    const lw = labelWidths[activeIndex] ?? 0;
    if (lw <= 0) return;
    if (!initialized.current) {
      indicatorX.setValue(getTargetX(activeIndex, lw));
      indicatorW.setValue(lw);
      initialized.current = true;
    }
  }, [tabWidth, labelWidths]);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handleLabelLayout = (index: number) => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setLabelWidths((prev) => {
      if (prev[index] === w) return prev;
      const next = [...prev];
      next[index] = w;
      return next;
    });
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.row} onLayout={handleContainerLayout}>
        {items.map((item, index) => {
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
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
                onLayout={handleLabelLayout(index)}
              >
                {item.label}
              </Text>
              <View style={styles.indicatorSlot} />
            </Pressable>
          );
        })}

        {/* スライドするインジケーター */}
        <Animated.View
          style={[
            styles.indicator,
            { width: indicatorW, transform: [{ translateX: indicatorX }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  row: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  labelActive: {
    color: palette.sageDeep,
  },
  labelInactive: {
    color: palette.textMuted,
  },
  indicatorSlot: {
    height: INDICATOR_HEIGHT,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: INDICATOR_HEIGHT,
    borderTopLeftRadius: INDICATOR_HEIGHT,
    borderTopRightRadius: INDICATOR_HEIGHT,
    backgroundColor: palette.sageDeep,
  },
});
