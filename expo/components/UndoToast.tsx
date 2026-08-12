import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/design-system';
import { duration, easing } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [content, setContent] = useState<typeof undoState>(null);

  useEffect(() => {
    if (undoState) {
      opacity.setValue(0);
      translateY.setValue(16);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration.medium,
          easing: Easing.bezier(...easing.enter),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.medium,
          easing: Easing.bezier(...easing.enter),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration.short,
      easing: Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setContent(null);
    });
  }, [undoState, opacity, translateY]);

  const active = undoState ?? content;
  if (undoState && undoState !== content) setContent(undoState);
  if (!active) return null;

  return (
    <Animated.View
      style={[
        styles.undoToast,
        { backgroundColor: t.colors.surface.inverse, opacity, transform: [{ translateY }] },
      ]}
      testID="undo-toast"
    >
      <View>
        <Text style={styles.undoTitle}>
          {active.kind === 'delete' ? `${active.log.categoryLabel} を削除しました` : `${active.log.categoryLabel} を記録しました`}
        </Text>
        <Text style={[styles.undoText, { color: t.colors.content.inverseSecondary }]}>必要なら元に戻せます</Text>
      </View>
      <Pressable onPress={undoLastLog} testID="undo-button">
        <Text style={[styles.undoAction, { color: t.colors.action.text.onInverse }]}>取り消す</Text>
      </Pressable>
    </Animated.View>
  );
});

const makeStyles = (t: Theme) => StyleSheet.create({
  undoToast: { position: 'absolute', left: 18, right: 18, bottom: 24, borderRadius: radius.xl, paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  undoTitle: { color: t.colors.content.inverse, fontSize: fs.md, fontWeight: '700' },
  undoText: { fontSize: fs.sm, marginTop: 4 },
  undoAction: { fontSize: fs.md, fontWeight: '700' },
});
