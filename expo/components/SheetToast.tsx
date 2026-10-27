/**
 * SheetToast — シートの中に出す、一言だけのトースト (反転面の小さなピル)。UndoToast と同じ「一時的に浮いているもの」の見た目。
 *
 * アプリ全体のトースト (UndoToast) はネイティブの formSheet の下に隠れるので、シートを開いたまま結果を
 * 伝えたいときはこちらを使う。基本は一言だけ。削除の「取り消す」のように、その場で戻せる操作が要るときだけ
 * `action` を1つ渡せる (UndoToast の取り消しボタンと同じ役割)。
 * 位置決めと自動で消す時間管理は呼び出し側 (visible を false にする)。
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Body, Label, useTheme } from '@/design-system';
import { duration, easing } from '@/design-system/tokens/primitives/motion';

export function SheetToast({
  visible,
  message,
  emphasis,
  action,
  testID,
}: {
  visible: boolean;
  message: string;
  /** message の中で太字にする部分 (「◯◯をお気に入りに追加しました」の ◯◯ など、何についてのトーストかを示す主語)。 */
  emphasis?: string;
  /** 文の右に並べる操作ボタン (取り消すなど)。渡したときだけ、トースト自体がタップを受ける */
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const t = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const at = emphasis ? message.indexOf(emphasis) : -1;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.fast : duration.short,
      easing: visible ? Easing.bezier(...easing.enter) : Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  return (
    <View style={styles.row} pointerEvents={action && visible ? 'box-none' : 'none'} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
      <Animated.View
        style={[
          t.elevation.lg,
          {
            backgroundColor: t.colors.surface.inverse,
            borderRadius: t.radius.full,
            paddingHorizontal: t.spacing['5'],
            paddingVertical: t.spacing['3'],
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing['4'],
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
        accessibilityLiveRegion="polite"
        testID={testID}
      >
        {/* 文章なので Body。主語だけ太字にして、何が起きたかを一目で読めるようにする */}
        <Body tone="inverse" style={styles.message}>
          {at === -1 ? (
            message
          ) : (
            <>
              {message.slice(0, at)}
              <Body tone="inverse" weight="bold">
                {emphasis}
              </Body>
              {message.slice(at + emphasis!.length)}
            </>
          )}
        </Body>
        {action ? (
          <Pressable
            onPress={action.onPress}
            hitSlop={t.spacing['3']}
            accessibilityRole="button"
            testID={action.testID}
          >
            {/* 暗い面の上のテキストボタン色。UndoToast の取り消しと同じトークン */}
            <Label style={{ color: t.colors.action.text.onInverse }}>{action.label}</Label>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginBottom: 8 },
  message: { flexShrink: 1 },
});
