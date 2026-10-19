import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/design-system';
import { duration, easing, spring } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { getLogDisplayInfo } from '@/utils/log-display';

/** これ以上動かして離したら閉じる (下方向 / 左右) */
const DISMISS_DY = 40;
const DISMISS_DX = 100;

export type UndoToastProps = {
  /**
   * 画面下端からの距離。既定は 24 (ホーム)。検索ページのように下に検索バーがある画面では、
   * バーにかぶらない高さを渡す。
   */
  bottom?: number;
};

/**
 * 記録・削除の直後に出る「取り消し」トースト。
 * ネイティブスタックでは下の画面 (ホーム) に置いたトーストは見えないので、記録が起きうる画面ごとに置く
 * (ホーム・検索ページ)。下 / 左右へのスワイプで、取り消さずに閉じられる。
 */
export const UndoToast = memo(function UndoToast({ bottom = 24 }: UndoToastProps) {
  const { undoState, undoLastLog, dismissUndo, settings } = useAppState();
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  // スワイプ中の指の移動量 (出入りのアニメーションとは別に持つ)
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [content, setContent] = useState<typeof undoState>(null);

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

  // 最新の dismissUndo をジェスチャのコールバックから呼ぶ (PanResponder は初回に1度だけ作る)
  const dismissRef = useRef(dismissUndo);
  useEffect(() => {
    dismissRef.current = dismissUndo;
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // タップは「取り消し」ボタンへ通し、少し動いたときだけスワイプとして扱う
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderMove: (_, g) => {
          dragX.setValue(g.dx);
          dragY.setValue(Math.max(0, g.dy)); // 上方向には動かさない
        },
        onPanResponderRelease: (_, g) => {
          const horizontal = Math.abs(g.dx) > DISMISS_DX || Math.abs(g.vx) > 0.8;
          const down = g.dy > DISMISS_DY || g.vy > 0.5;
          if (horizontal || down) {
            Animated.parallel([
              Animated.timing(horizontal ? dragX : dragY, {
                toValue: horizontal ? Math.sign(g.dx || 1) * 400 : 160,
                duration: duration.short,
                easing: Easing.bezier(...easing.exit),
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: duration.short,
                easing: Easing.bezier(...easing.exit),
                useNativeDriver: true,
              }),
            ]).start(() => dismissRef.current());
            return;
          }
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, ...spring.snap, useNativeDriver: true }),
            Animated.spring(dragY, { toValue: 0, ...spring.snap, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, ...spring.snap, useNativeDriver: true }),
            Animated.spring(dragY, { toValue: 0, ...spring.snap, useNativeDriver: true }),
          ]).start();
        },
      }),
    [dragX, dragY, opacity]
  );

  const active = undoState ?? content;
  if (undoState && undoState !== content) setContent(undoState);
  if (!active) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.undoToast,
        {
          bottom,
          backgroundColor: t.colors.surface.inverse,
          opacity,
          transform: [{ translateX: dragX }, { translateY: Animated.add(translateY, dragY) }],
        },
      ]}
      testID="undo-toast"
    >
      <View style={styles.textCol}>
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
  undoToast: { position: 'absolute', left: 18, right: 18, borderRadius: radius.xl, paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  textCol: { flexShrink: 1 },
  undoTitle: { color: t.colors.content.inverse, fontSize: fs.md, fontWeight: '700' },
  undoText: { fontSize: fs.sm, marginTop: 4 },
  undoAction: { fontSize: fs.md, fontWeight: '700' },
});
