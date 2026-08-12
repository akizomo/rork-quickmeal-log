import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spring } from '@/design-system/tokens/primitives/motion';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useTheme } from '@/design-system';

interface Option<T extends string = string> {
  key: T;
  label: string;
}

interface Props<T extends string = string> {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
  trackColor?: string;
  pillColor?: string;
  textColor?: string;
  activeTextColor?: string;
  padding?: number;
  borderRadius?: number;
  height?: number;
  fontSize?: number;
  style?: ViewStyle;
  testID?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  trackColor,
  pillColor,
  textColor,
  activeTextColor,
  padding = 3,
  borderRadius = 18,
  height = 36,
  fontSize = fs.sm,
  style,
  testID,
}: Props<T>) {
  const t = useTheme();
  // トラック(凹み) = surface.sunken(-1)、選択ピル(浮いた面) = surface.raised(+1)。
  const resolvedTrackColor = trackColor ?? t.colors.surface.sunken;
  const resolvedPillColor = pillColor ?? t.colors.surface.raised;
  const resolvedTextColor = textColor ?? t.colors.content.secondary;
  const resolvedActiveTextColor = activeTextColor ?? t.colors.action.text.default;
  const selectedIndex = Math.max(0, options.findIndex((o) => o.key === value));
  const pillAnim = useRef(new Animated.Value(selectedIndex)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  // ピル位置は selectedIndex を単一ソースに同期。レイアウト確定(マウント)時もここで合わせる。
  // (非ゼロ既定で初期位置がずれる問題を防ぐ。.start() が DOM transform を確実に流し込む)
  useEffect(() => {
    if (containerWidth <= 0) return;
    Animated.spring(pillAnim, {
      toValue: selectedIndex,
      ...spring.snap,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, containerWidth, pillAnim]);

  const handleSelect = (key: T) => {
    onChange(key); // 位置は value 変化 → 上の effect が追従
  };

  const pillWidth = containerWidth > 0 ? (containerWidth - padding * 2) / options.length : 0;
  const translateX = pillAnim.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * pillWidth),
  });

  const pillRadius = borderRadius - padding;

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          borderRadius,
          backgroundColor: resolvedTrackColor,
          padding,
        },
        style,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      testID={testID}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              top: padding,
              left: padding,
              width: pillWidth,
              height: height - padding * 2,
              borderRadius: pillRadius,
              backgroundColor: resolvedPillColor,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        />
      )}
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option.label}${active ? '、選択中' : ''}`}
            style={styles.button}
            testID={testID ? `${testID}-${option.key}` : undefined}
          >
            <Text
              style={[
                styles.text,
                {
                  fontSize,
                  color: active ? resolvedActiveTextColor : resolvedTextColor,
                  fontWeight: active ? '700' : '600',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type SegmentedControlProps<T extends string = string> = Props<T>;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
