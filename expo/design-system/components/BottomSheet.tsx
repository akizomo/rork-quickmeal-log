/**
 * BottomSheet — Material 3 / iOS HIG 準拠の統一ボトムシート。
 *
 * # アプリ全体のモーダル背景ルール (本コンポーネントが Single Source of Truth)
 * - 親画面の認知負荷を下げるため、必ず blur + 暗色 tint で覆う
 *   - native: <BlurView intensity=24 tint="dark">
 *   - web:    backdrop-filter: blur(24px) saturate(140%)
 * - 暗色 tint opacity = 18% (blur と組み合わせて視認性確保)
 * - 入場時に scrim opacity を 0→1 で fade、シートは 80% off-screen から spring
 * - 退場時に scrim opacity を 1→0 で fade、シートは画面下まで完全 slide-down
 *   (シート自体は opacity 操作しない = "fade out" でなく "slide out")
 *
 * # 親側の使い方
 *   <BottomSheet
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     title="食材を追加"
 *     primaryAction={{ label: '保存して追加', onPress: save }}
 *     secondaryAction={{ label: 'キャンセル', onPress: () => setOpen(false) }}
 *   >
 *     {body}
 *   </BottomSheet>
 *
 * # 重要: close 時に body を残すための内部キャッシュ
 * 親が `visible=false` を渡しても、BottomSheet は「退場アニメ完走まで Modal を保持」
 * する。children も最後の値を保持して描画するため、親側で `if (!data) return null`
 * のような早期 unmount を **しないで OK** (むしろ早期 unmount すると退場が見えない)。
 *
 * # 数値
 * - scrim tint opacity 18% / blur 24px (両方併用)
 * - handle 32×4dp (M3)
 * - 角丸 28dp 上部のみ
 * - elevation 3 相当 shadow
 * - bottom inset = max(safeArea.bottom, spacing[4])
 * - close threshold: drag 120px or velocity 0.5px/ms
 */

import { BlurView } from 'expo-blur';
import { Icon } from './Icon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Heading } from './Typography';

// ---- M3 / HIG numeric constants -------------------------------------------
const HANDLE_WIDTH = 32;
const HANDLE_HEIGHT = 4;
const DISMISS_TRANSLATE = 120;        // px
const DISMISS_VELOCITY = 0.5;         // px / ms
const SHEET_RADIUS = 28;              // M3 large container radius (top corners)
const SCRIM_TINT_OPACITY = 0.18;      // 半透明 dark overlay (blur と合わせて読みやすさを担保)
const BLUR_INTENSITY = 24;            // expo-blur (native)
const WEB_BLUR_PX = 24;               // CSS backdrop-filter blur (web)
const WEB_BLUR_SAT = 140;             // 彩度を少し上げてガラス感
const OPEN_SPRING = { tension: 65, friction: 11 };
// M3 Emphasized Accelerate: cubic-bezier(0.3, 0, 1, 1) 200ms
const CLOSE_DURATION = 200;
const CLOSE_EASING = Easing.bezier(0.3, 0, 1, 1);
const TRANSLATE_OFFSCREEN = 800;      // off-screen distance for drag-released close
const FALLBACK_SHEET_HEIGHT = 600;    // sheetHeight が onLayout 前のときの暫定値

/**
 * Web 用 blur レイヤー — RN Web の <View> は backdrop-filter を style から弾くことが
 * あるため、ネイティブ DOM の <div> を直接出して確実に CSS が当たるようにする。
 * RN ネイティブビルドでは Platform チェックでこの分岐は実行されないので
 * 'div' が render されることはない。
 */
function WebBlurLayer() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backdropFilter: `blur(${WEB_BLUR_PX}px) saturate(${WEB_BLUR_SAT}%)`,
        WebkitBackdropFilter: `blur(${WEB_BLUR_PX}px) saturate(${WEB_BLUR_SAT}%)`,
        pointerEvents: 'none',
      }}
    />
  );
}

// ---- Types ----------------------------------------------------------------
export type BottomSheetAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
};

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;

  title?: string;
  /** Replaces the default × close button on the right side of the header. */
  headerRight?: React.ReactNode;

  children: React.ReactNode;
  /** When true (default) wraps children in a ScrollView. */
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;

  /** Right-side primary CTA. */
  primaryAction?: BottomSheetAction;
  /** Left-side secondary CTA. Ignored when `footerLeft` is provided. */
  secondaryAction?: BottomSheetAction;
  /**
   * Custom node rendered on the left side of the footer in place of
   * `secondaryAction`. Useful for EC-style cart footers where the left side
   * shows a live preview (e.g. kcal · PFC) and the right side shows a single
   * primary CTA.
   */
  footerLeft?: React.ReactNode;

  /** Tap on scrim closes the sheet. Default: true. */
  dismissOnBackdropPress?: boolean;
  /** Drag down on the handle area dismisses. Default: true. */
  dragToDismiss?: boolean;
  /** Show the drag handle on top. Default: true. */
  showHandle?: boolean;

  /** Maximum height as ratio of the modal area. Default: 0.92. */
  maxHeightRatio?: number;
  /**
   * When true, the sheet always fills `maxHeightRatio` of the screen instead of
   * shrinking to fit its children. Useful for editor sheets (`IdentityLogSheet`)
   * that want a stable, predictable footer position even when chip rows are short.
   */
  expandToFull?: boolean;

  testID?: string;
  /** Optional accessibility label for the sheet container. */
  accessibilityLabel?: string;

  /**
   * Optional content rendered inside the sheet's Modal but ABOVE the sheet
   * itself (e.g. live preview bubble that floats above the sheet). Positioned
   * via the consumer's own absolute styles. Wrapped in `pointerEvents="none"`
   * so it never intercepts taps on the sheet.
   */
  topAccessory?: React.ReactNode;
};

// ---------------------------------------------------------------------------

export function BottomSheet({
  visible,
  onClose,
  title,
  headerRight,
  children,
  scrollable = true,
  contentStyle,
  primaryAction,
  secondaryAction,
  dismissOnBackdropPress = true,
  dragToDismiss = true,
  showHandle = true,
  maxHeightRatio = 0.92,
  expandToFull = false,
  testID,
  accessibilityLabel,
  topAccessory,
  footerLeft,
}: BottomSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  // mounted state — keep Modal visible until close animation completes.
  const [mounted, setMounted] = useState(visible);
  // sheetHeight — measured via onLayout. Used so the sheet slides ENTIRELY
  // off-screen on close (no fade-out, just a clean slide-down).
  const [sheetHeight, setSheetHeight] = useState<number>(FALLBACK_SHEET_HEIGHT);

  // Cache children/title/actions while close animation is running so the body
  // does not vanish if the parent unmounts/clears its data on visible=false.
  const cachedRef = useRef({ children, title, headerRight, primaryAction, secondaryAction, footerLeft });
  if (visible) {
    cachedRef.current = { children, title, headerRight, primaryAction, secondaryAction, footerLeft };
  }
  const cached = cachedRef.current;

  // openProgress: 0 = closed, 1 = open. Drives translateY + scrim opacity.
  const openProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // dragY: user drag offset from rest position (positive = downward).
  const dragY = useRef(new Animated.Value(0)).current;

  // Keep the latest onClose available without re-creating panResponder.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /**
   * Request close: animate sheet down + scrim out, then call onClose().
   * Idempotent — multiple invocations during animation are coalesced.
   */
  const requestClose = useCallback(() => {
    Animated.timing(openProgress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: CLOSE_EASING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        dragY.setValue(0);
        onCloseRef.current();
      }
    });
  }, [dragY, openProgress]);

  // Open / close lifecycle
  useEffect(() => {
    if (visible) {
      // Mount, then animate in.
      setMounted(true);
      dragY.setValue(0);
      Animated.spring(openProgress, {
        toValue: 1,
        ...OPEN_SPRING,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      // External request to close — animate out, then unmount.
      Animated.timing(openProgress, {
        toValue: 0,
        duration: CLOSE_DURATION,
        easing: CLOSE_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          dragY.setValue(0);
          setMounted(false);
        }
      });
    }
    // mounted is intentionally excluded to avoid re-running on internal mount toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dragY, openProgress]);

  // Drag-to-dismiss (only on handle area)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragToDismiss,
        onMoveShouldSetPanResponder: (_, g) => dragToDismiss && Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          // Rubber-band when dragging upward.
          const y = g.dy >= 0 ? g.dy : g.dy / 4;
          dragY.setValue(y);
        },
        onPanResponderRelease: (_, g) => {
          const shouldClose = g.dy > DISMISS_TRANSLATE || g.vy > DISMISS_VELOCITY;
          if (shouldClose) {
            // Continue downward with current velocity, then call onClose
            Animated.parallel([
              Animated.spring(dragY, {
                toValue: TRANSLATE_OFFSCREEN,
                velocity: g.vy * 1000,
                tension: 90,
                friction: 14,
                useNativeDriver: true,
              }),
              Animated.timing(openProgress, {
                toValue: 0,
                duration: CLOSE_DURATION,
                easing: CLOSE_EASING,
                useNativeDriver: true,
              }),
            ]).start(({ finished }) => {
              if (finished) {
                dragY.setValue(0);
                onCloseRef.current();
              }
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              tension: 90,
              friction: 12,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            tension: 90,
            friction: 12,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragToDismiss, dragY, openProgress]
  );

  // Backdrop press — declared before any early return to satisfy rules-of-hooks.
  const handleBackdropPress = useCallback(() => {
    if (dismissOnBackdropPress) requestClose();
  }, [dismissOnBackdropPress, requestClose]);

  if (!mounted) return null;

  // Slide the sheet entirely off-screen on close (height-aware).
  // openProgress 0 → translateY = sheetHeight (シート全体が画面下に消える)
  // openProgress 1 → translateY = 0 (rest position)
  const baseTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  });
  const sheetTranslateY = Animated.add(baseTranslateY, dragY);
  const scrimOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const bottomInset = Math.max(insets.bottom, t.spacing['4']);
  const hasFooter = !!(cached.primaryAction || cached.secondaryAction || cached.footerLeft);

  // Built-in × button (overridable via headerRight)
  const renderHeaderRight = (): React.ReactNode => {
    if (cached.headerRight !== undefined) return cached.headerRight;
    return (
      <Pressable
        onPress={requestClose}
        hitSlop={12}
        accessibilityLabel="閉じる"
        accessibilityRole="button"
        testID={testID ? `${testID}-close` : undefined}
      >
        <Icon name="close" size={22} color={t.colors.content.secondary} />
      </Pressable>
    );
  };

  // Footer button helper
  const renderActionButton = (action: BottomSheetAction, variant: 'primary' | 'ghost') => (
    <Button
      label={action.label}
      variant={variant}
      onPress={action.onPress}
      disabled={action.disabled}
      loading={action.loading}
      style={styles.actionItem}
      testID={
        testID
          ? `${testID}-${variant === 'primary' ? 'primary' : 'secondary'}`
          : undefined
      }
    />
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.fill}>
        {/* Scrim — native は BlurView、web は WebBlurLayer (raw <div>) で
            backdrop-filter を確実に適用。scrimOpacity でフェード制御。
            シートは fade しない（slide のみ）。 */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: scrimOpacity }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {Platform.OS === 'web' ? (
            <WebBlurLayer />
          ) : (
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <TouchableWithoutFeedback onPress={handleBackdropPress} accessible={false}>
            <View style={styles.scrimTint} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* topAccessory — content above the sheet (e.g. live preview bubble).
            Wrapped with pointerEvents="box-none" so taps fall through to the
            scrim / sheet, except where the accessory's own children declare
            otherwise. */}
        {topAccessory ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {topAccessory}
          </View>
        ) : null}

        <Animated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            // Only update if measurably different to avoid re-renders.
            if (Math.abs(h - sheetHeight) > 1) setSheetHeight(h);
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.surface.default,
              borderTopLeftRadius: SHEET_RADIUS,
              borderTopRightRadius: SHEET_RADIUS,
              transform: [{ translateY: sheetTranslateY }],
              maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
              // expandToFull: anchor the sheet at both top and bottom so it
              // always occupies the full `maxHeightRatio` window. Without it
              // the sheet shrinks to its intrinsic content height.
              ...(expandToFull
                ? { height: `${Math.round(maxHeightRatio * 100)}%` }
                : null),
            },
          ]}
          accessibilityLabel={accessibilityLabel}
          testID={testID}
        >
          {/* Drag handle — pan responder anchored here */}
          {showHandle ? (
            <View
              {...(dragToDismiss ? panResponder.panHandlers : {})}
              style={styles.handleArea}
              accessibilityRole={dragToDismiss ? 'adjustable' : undefined}
              accessibilityLabel={dragToDismiss ? 'ボトムシート。下にスワイプで閉じる' : undefined}
            >
              <View
                style={{
                  width: HANDLE_WIDTH,
                  height: HANDLE_HEIGHT,
                  borderRadius: HANDLE_HEIGHT / 2,
                  backgroundColor: t.colors.border.strong,
                  opacity: 0.4,
                }}
              />
            </View>
          ) : null}

          {/* Header */}
          {cached.title || cached.headerRight !== undefined ? (
            <View style={[styles.header, { paddingHorizontal: t.spacing['5'] }]}>
              {cached.title ? <Heading size="lg">{cached.title}</Heading> : <View />}
              {renderHeaderRight()}
            </View>
          ) : null}

          {/* Content */}
          {scrollable ? (
            <ScrollView
              contentContainerStyle={[
                {
                  paddingHorizontal: t.spacing['5'],
                  paddingTop: t.spacing['4'],
                  paddingBottom: hasFooter ? t.spacing['4'] : bottomInset,
                },
                contentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {cached.children}
            </ScrollView>
          ) : (
            <View
              style={[
                {
                  paddingHorizontal: t.spacing['5'],
                  paddingTop: t.spacing['4'],
                  paddingBottom: hasFooter ? t.spacing['4'] : bottomInset,
                },
                contentStyle,
              ]}
            >
              {cached.children}
            </View>
          )}

          {/* Footer (横並び・右が primary) */}
          {hasFooter ? (
            <View
              style={[
                styles.actions,
                {
                  paddingHorizontal: t.spacing['5'],
                  paddingTop: t.spacing['3'],
                  paddingBottom: bottomInset,
                  gap: t.spacing['3'],
                  borderTopColor: t.colors.border.subtle,
                  backgroundColor: t.colors.surface.default,
                },
              ]}
            >
              {cached.footerLeft !== undefined && cached.footerLeft !== null ? (
                <View style={styles.actionItem}>{cached.footerLeft}</View>
              ) : cached.secondaryAction ? (
                renderActionButton(cached.secondaryAction, 'ghost')
              ) : (
                <View style={styles.actionItem} />
              )}
              {cached.primaryAction
                ? renderActionButton(cached.primaryAction, 'primary')
                : <View style={styles.actionItem} />}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrimTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(0,0,0,${SCRIM_TINT_OPACITY})`,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // M3 elevation 3 相当
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionItem: {
    flex: 1,
  },
});
