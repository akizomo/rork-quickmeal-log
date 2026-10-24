import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTheme, type Theme } from '@/design-system';
import { duration, easing, spring } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { getLogDisplayInfo } from '@/utils/log-display';

// スワイプで閉じる判定。距離か速度のどちらかを超えたら閉じ、届かなければ元の位置へ戻す。
const SWIPE_X_DISTANCE = 80;
const SWIPE_Y_DISTANCE = 40;
const SWIPE_VELOCITY = 0.5;
// タップ (取り消しボタン) と区別するため、この距離を動くまではジェスチャーを奪わない
const SWIPE_SLOP = 6;

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog, dismissUndo, settings } = useAppState();
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [content, setContent] = useState<typeof undoState>(null);
  const { width: screenWidth } = useWindowDimensions();

  const panResponder = useMemo(() => {
    const snapBack = () => {
      Animated.parallel([
        Animated.spring(dragX, { toValue: 0, ...spring.snap, useNativeDriver: true }),
        Animated.spring(dragY, { toValue: 0, ...spring.snap, useNativeDriver: true }),
      ]).start();
    };
    const flyOut = (value: Animated.Value, toValue: number) => {
      Animated.timing(value, {
        toValue,
        duration: duration.short,
        easing: Easing.bezier(...easing.exit),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) dismissUndo();
      });
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > SWIPE_SLOP || g.dy > SWIPE_SLOP,
      onPanResponderMove: (_, g) => {
        // 縦は下方向のみ追従させる (上は画面の中身側なので閉じる方向ではない)
        dragX.setValue(g.dx);
        dragY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const horizontal = Math.abs(g.dx) >= Math.abs(g.dy);
        if (horizontal && (Math.abs(g.dx) > SWIPE_X_DISTANCE || Math.abs(g.vx) > SWIPE_VELOCITY)) {
          const dir = (g.dx !== 0 ? g.dx : g.vx) > 0 ? 1 : -1;
          flyOut(dragX, dir * screenWidth);
          return;
        }
        if (!horizontal && (g.dy > SWIPE_Y_DISTANCE || g.vy > SWIPE_VELOCITY)) {
          flyOut(dragY, 160);
          return;
        }
        snapBack();
      },
      onPanResponderTerminate: snapBack,
    });
  }, [dragX, dragY, dismissUndo, screenWidth]);

  useEffect(() => {
    if (undoState) {
      opacity.setValue(0);
      translateY.setValue(16);
      dragX.setValue(0);
      dragY.setValue(0);
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
  }, [undoState, opacity, translateY, dragX, dragY]);

  const active = undoState ?? content;
  if (undoState && undoState !== content) setContent(undoState);
  if (!active) return null;

  // 横に引くほど薄くなり、画面端で消える
  const swipeOpacity = dragX.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.undoToast,
        {
          backgroundColor: t.colors.surface.inverse,
          opacity: Animated.multiply(opacity, swipeOpacity),
          transform: [{ translateX: dragX }, { translateY: Animated.add(translateY, dragY) }],
        },
      ]}
      onAccessibilityEscape={dismissUndo}
      testID="undo-toast"
    >
      <View>
        <Text style={styles.undoTitle}>
          {tr(active.kind === 'delete' ? 'undoToast.deleted' : 'undoToast.recorded', {
            label: getLogDisplayInfo(active.log, settings.uiLanguage).title,
          })}
        </Text>
        <Text style={[styles.undoText, { color: t.colors.content.inverseSecondary }]}>{tr('undoToast.hint')}</Text>
      </View>
      <Pressable onPress={undoLastLog} testID="undo-button">
        <Text style={[styles.undoAction, { color: t.colors.action.text.onInverse }]}>{tr('undoToast.undo')}</Text>
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
