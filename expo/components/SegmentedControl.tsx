import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spring } from '@/design-system/tokens/primitives/motion';

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
  trackColor = '#EEE8DA',
  pillColor = '#FFFDF8',
  textColor = '#7B857E',
  activeTextColor = '#315347',
  padding = 3,
  borderRadius = 18,
  height = 36,
  fontSize = 13,
  style,
  testID,
}: Props<T>) {
  const selectedIndex = Math.max(0, options.findIndex((o) => o.key === value));
  const pillAnim = useRef(new Animated.Value(selectedIndex)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const handleSelect = (key: T, index: number) => {
    onChange(key);
    Animated.spring(pillAnim, {
      toValue: index,
      ...spring.snap,
      useNativeDriver: true,
    }).start();
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
          backgroundColor: trackColor,
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
              backgroundColor: pillColor,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        />
      )}
      {options.map((option, index) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(option.key, index)}
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
                  color: active ? activeTextColor : textColor,
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
