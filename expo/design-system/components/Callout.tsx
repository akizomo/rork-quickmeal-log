/**
 * Callout — 画面上の特定の要素を指す吹き出し (TipKit の popover tip / MD3 の rich tooltip 相当)。
 *
 * 用途: 操作の流れを止めずに、いま見ている要素について一言だけ添える。
 *   例: 詳細シートのフッター kcal を指して「20〜30kcalは、ごはんひと口くらいの差。」(PRD §6.5.2)
 *
 * 見た目の規約:
 *   - 面は `surface.inverse` (反転面)。シート/カードの上でも埋もれず、Toast と同じ「一時的に
 *     浮いているもの」の文法に揃える
 *   - 角丸 `radius.md` / 影 `elevation.md` (ツールチップの役割。CLAUDE.md の影ルール参照)
 *   - 尻尾 (arrow) は下向き固定。吹き出しは対象の「上」に置く前提 (`placement` は今のところ top のみ)
 *   - 閉じるボタンは `IconButton` (tone="inverse")
 *
 * 位置決めは呼び出し側の責務 (絶対配置のアンカー等)。このコンポーネントは
 * 表示/非表示のフェード+わずかな浮き上がりだけを持つ。
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { duration, easing } from '../tokens/primitives/motion';
import { IconButton } from './IconButton';
import { Body } from './Typography';

export type CalloutArrowAlign = 'start' | 'center' | 'end';

export type CalloutProps = {
  visible: boolean;
  /** 1行目。言いたいことそのもの (文章)。 */
  title?: string;
  /** `title` の中で太字にする部分 (主語など)。渡すと、`title` 全体は標準の太さにして、この部分だけを太字にする。 */
  titleEmphasis?: string;
  /** 2行目以降の補足。 */
  message: string;
  /** 尻尾の水平位置。指したい要素の位置に合わせる。default: 'start' */
  arrowAlign?: CalloutArrowAlign;
  /** 尻尾の中心を、吹き出しの左端から何 px の位置に置くか。渡すと `arrowAlign` より優先 (指したい要素の真上に合わせたいとき)。 */
  arrowOffset?: number;
  /** 渡すと右上に閉じるボタンを出す。 */
  onDismiss?: () => void;
  /** 閉じるボタンの読み上げラベル (onDismiss を渡すときは必須)。 */
  dismissAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const ARROW_SIZE = 10;

export function Callout({
  visible,
  title,
  titleEmphasis,
  message,
  arrowAlign = 'start',
  arrowOffset,
  onDismiss,
  dismissAccessibilityLabel,
  style,
  testID,
}: CalloutProps) {
  const t = useTheme();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: duration.long,
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
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [t.spacing['2'], 0] });
  const arrowPosition: ViewStyle =
    arrowOffset !== undefined
      ? { alignSelf: 'flex-start', marginLeft: Math.max(arrowOffset - ARROW_SIZE / 2, t.spacing['2']) }
      : arrowAlign === 'center'
      ? { alignSelf: 'center' }
      : arrowAlign === 'end'
        ? { alignSelf: 'flex-end', marginRight: t.spacing['5'] }
        : { alignSelf: 'flex-start', marginLeft: t.spacing['5'] };

  return (
    <Animated.View
      style={[{ opacity: progress, transform: [{ translateY }] }, style]}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <View
        style={[
          styles.bubble,
          {
            ...t.elevation.md,
            backgroundColor: t.colors.surface.inverse,
            borderRadius: t.radius.md,
            paddingVertical: t.spacing['3'],
            paddingLeft: t.spacing['4'],
            paddingRight: onDismiss ? t.spacing['1'] : t.spacing['4'],
            gap: t.spacing['2'],
          },
        ]}
      >
        <View style={styles.text}>
          {title ? (
            titleEmphasis && title.includes(titleEmphasis) ? (
              <Body size="sm" tone="inverse">
                {title.slice(0, title.indexOf(titleEmphasis))}
                <Body size="sm" weight="bold" tone="inverse">
                  {titleEmphasis}
                </Body>
                {title.slice(title.indexOf(titleEmphasis) + titleEmphasis.length)}
              </Body>
            ) : (
              <Body size="sm" weight="semibold" tone="inverse">
                {title}
              </Body>
            )
          ) : null}
          <Body size="sm" tone={title ? 'inverseSecondary' : 'inverse'}>
            {message}
          </Body>
        </View>
        {onDismiss ? (
          <IconButton
            icon="close"
            size="sm"
            tone="inverse"
            onPress={onDismiss}
            accessibilityLabel={dismissAccessibilityLabel ?? ''}
            testID={testID ? `${testID}-dismiss` : undefined}
          />
        ) : null}
      </View>
      {/* 尻尾: 45°回した正方形の下半分だけを見せる */}
      <View
        style={[
          styles.arrow,
          arrowPosition,
          {
            backgroundColor: t.colors.surface.inverse,
            marginTop: -ARROW_SIZE / 2,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
  },
  arrow: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    transform: [{ rotate: '45deg' }],
  },
});
