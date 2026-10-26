/**
 * SheetToast — シートの中に出す、一言だけのトースト (反転面の小さなピル)。UndoToast と同じ「一時的に浮いているもの」の見た目。
 *
 * アプリ全体のトースト (UndoToast) はネイティブの formSheet の下に隠れるので、シートを開いたまま結果を
 * 伝えたいときはこちらを使う。取り消しなどの操作は持たない (一言だけ)。
 * 位置決めと自動で消す時間管理は呼び出し側 (visible を false にする)。
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Label, useTheme } from '@/design-system';
import { duration, easing } from '@/design-system/tokens/primitives/motion';

export function SheetToast({ visible, message, testID }: { visible: boolean; message: string; testID?: string }) {
  const t = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.fast : duration.short,
      easing: visible ? Easing.bezier(...easing.enter) : Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  return (
    <View style={styles.row} pointerEvents="none" importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
      <Animated.View
        style={[
          t.elevation.lg,
          {
            backgroundColor: t.colors.surface.inverse,
            borderRadius: t.radius.full,
            paddingHorizontal: t.spacing['5'],
            paddingVertical: t.spacing['3'],
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
        accessibilityLiveRegion="polite"
        testID={testID}
      >
        <Label tone="inverse">{message}</Label>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginBottom: 8 },
});
