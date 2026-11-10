/**
 * Toast — 操作の結果を一言だけ伝える、一時的に浮いているピル (MD3 の Snackbar 相当)。
 *
 * 用途: 記録した / 削除した / お気に入りに追加した、のように「いまの操作で何が起きたか」を伝える。
 *   その場で戻せる操作 (取り消すなど) が要るときだけ `action` を1つ渡す。
 *
 * 見た目の規約:
 *   - 面は `surface.inverse` (反転面)、角丸 `radius.full`、影 `elevation.lg` (CLAUDE.md の影ルール: トースト)
 *   - 文章は1行の `Body`。何についてのトーストかを示す主語だけ `emphasis` で太字にする
 *   - 文 + 補足の2段にしたいときは `description` を渡す (下記)。`message` が見出しの文
 *     (「◯◯を記録しました」)、`description` が補足 (小さく淡く・1行)。ピルは2段になるので角丸が `radius.xl` に変わる
 *   - 操作ボタンは暗い面の上のテキストボタン色 (`action.text.onInverse`)
 *
 * description は「何が」と「どれだけ」のように、1文に詰めると折り返してしまう結果のためのもの
 * (2026-11-10 追加。記録トーストが「ごはん 150g（普通） を記録しました」と長くなり、1文だと
 * 単語の途中で折り返したため、見出し + 補足に分けた)。文章を2文に増やすためには使わない。
 *   - 画面の要素を指して補足したい → `Callout` (title + message の2段)
 *   - 読んで判断してもらう必要がある (エラー・確認) → `Alert.alert`
 *   - 2段にするとピル (radius.full) が間延びするので、description があるときだけ `radius.xl` にする
 *
 * スワイプ: `onDismiss` を渡すと、横に払って閉じられる (一般的な Snackbar と同じく横のみ。
 *   シートの中では縦に払うとシートごと閉じるので、縦は使わない)。
 *
 * 位置決めと自動で消す時間管理は呼び出し側の責務 (`style` で置き、時間が来たら visible を false にする)。
 * アプリ全体のトースト (UndoToast) はネイティブの formSheet の下に隠れるので、シートを開いたまま
 * 結果を伝えたいときは、シートの `footerAccessory` にこの部品を直接置く。
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import { duration, easing, spring } from '../tokens/primitives/motion';
import { Body, Label } from './Typography';

export type ToastAction = { label: string; onPress: () => void; testID?: string };

export type ToastProps = {
  visible: boolean;
  message: string;
  /** 見出し (`message`) の下に置く補足 (量など)。渡すと2段のトーストになる。1行に収まる短さにする (はみ出したら省略)。 */
  description?: string;
  /** スクリーンリーダーに読ませる文。見出し+補足だけでは何が起きたかが欠けるとき (「記録しました」) に渡す。 */
  accessibilityLabel?: string;
  /** `message` の中で太字にする部分 (「◯◯を削除しました」の ◯◯ など、何についてのトーストかを示す主語)。 */
  emphasis?: string;
  /** 文の右に並べる操作ボタン (取り消すなど)。 */
  action?: ToastAction;
  /** 渡すと横スワイプで閉じられる。払い切ったときに呼ぶので、ここで visible を false にする。 */
  onDismiss?: () => void;
  /** 外側 (ピルを中央に置く行) のスタイル。位置決めに使う。 */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// スワイプで閉じる判定。距離か速度のどちらかを超えたら閉じ、届かなければ元の位置へ戻す。
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 0.5;
// タップ (操作ボタン) と区別するため、この距離を横に動くまではジェスチャーを奪わない
const SWIPE_SLOP = 6;

export function Toast({ visible, message, description, accessibilityLabel, emphasis, action, onDismiss, style, testID }: ToastProps) {
  const t = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [dragX] = useState(() => new Animated.Value(0));
  // 出すときはすぐ描く。消すときは退場アニメーションが終わってから外す
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      dragX.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: duration.medium,
        easing: Easing.bezier(...easing.enter),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: duration.short,
      easing: Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress, dragX]);

  const panResponder = useMemo(() => {
    const snapBack = () => {
      Animated.spring(dragX, { toValue: 0, ...spring.snap, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      // 横に動いたときだけ奪う。縦の動きは親 (シートのスワイプ閉じ・スクロール) に渡す
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > SWIPE_SLOP && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => dragX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > SWIPE_DISTANCE || Math.abs(g.vx) > SWIPE_VELOCITY) {
          const dir = (g.dx !== 0 ? g.dx : g.vx) > 0 ? 1 : -1;
          Animated.timing(dragX, {
            toValue: dir * screenWidth,
            duration: duration.short,
            easing: Easing.bezier(...easing.exit),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) onDismiss?.();
          });
          return;
        }
        snapBack();
      },
      onPanResponderTerminate: snapBack,
    });
  }, [dragX, screenWidth, onDismiss]);

  if (!mounted) return null;

  const at = emphasis ? message.indexOf(emphasis) : -1;
  const interactive = visible && (!!action || !!onDismiss);
  // 横に引くほど薄くなり、画面端で消える
  const swipeOpacity = dragX.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [t.spacing['2'], 0] });

  const actionNode = action ? (
    <Pressable onPress={action.onPress} hitSlop={t.spacing['3']} accessibilityRole="button" testID={action.testID}>
      <Label style={{ color: t.colors.action.text.onInverse }}>{action.label}</Label>
    </Pressable>
  ) : null;

  return (
    <View
      style={[styles.row, style]}
      pointerEvents={interactive ? 'box-none' : 'none'}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View
        {...(onDismiss ? panResponder.panHandlers : null)}
        style={[
          t.elevation.lg,
          styles.pill,
          {
            backgroundColor: t.colors.surface.inverse,
            borderRadius: description ? t.radius.xl : t.radius.full,
            paddingHorizontal: t.spacing['5'],
            paddingVertical: t.spacing['3'],
            gap: t.spacing['4'],
            opacity: Animated.multiply(progress, swipeOpacity),
            transform: [{ translateX: dragX }, { translateY }],
          },
        ]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={accessibilityLabel}
        onAccessibilityEscape={onDismiss}
        testID={testID}
      >
        {/* 文章なので Body。主語だけ太字にして、何が起きたかを一目で読めるようにする */}
        <View style={styles.message}>
          {description && at === 0 ? (
            // 2段のときは見出しを「主語 / 述語」の行にする。長い主語は1行で省略し、述語
            // (「を記録しました」) は折り返さない (文の途中で切れて「記/録しました」になるのを防ぐ)
            <View style={styles.titleRow}>
              <Body tone="inverse" weight="bold" numberOfLines={1} style={styles.titleSubject}>
                {emphasis}
              </Body>
              <Body tone="inverse" style={[styles.titlePredicate, { marginLeft: t.spacing['1'] }]}>
                {message.slice(emphasis!.length).trim()}
              </Body>
            </View>
          ) : (
          <Body tone="inverse">
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
          )}
          {description ? (
            <Body tone="inverseSecondary" size="sm" numberOfLines={1}>
              {description}
            </Body>
          ) : null}
        </View>
        {actionNode}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center' },
  message: { flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleSubject: { flexShrink: 1 },
  titlePredicate: { flexShrink: 0 },
});
