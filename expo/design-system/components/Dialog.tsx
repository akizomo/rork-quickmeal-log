/**
 * Dialog — センター配置の汎用ダイアログ。
 *
 * BottomSheet と同じ scrim (blur + dark tint) を使い、画面中央にカードを表示する。
 * Modal 全体を KeyboardAvoidingView で包んでいるため、キーボードが開いても
 * ダイアログ全体が押し上げられて隠れない。
 *
 * # 使い方
 *   <Dialog
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     title="タイトル"
 *     primaryAction={{ label: '完了', onPress: save }}
 *     secondaryAction={{ label: 'キャンセル', onPress: () => setOpen(false) }}
 *   >
 *     {body}
 *   </Dialog>
 */

import { BlurView } from 'expo-blur';
import { Icon } from './Icon';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Heading } from './Typography';

// ---- Constants ------------------------------------------------------------
const DIALOG_RADIUS = 20;
const SCRIM_TINT_OPACITY = 0.18;
const BLUR_INTENSITY = 24;
const WEB_BLUR_PX = 24;
const WEB_BLUR_SAT = 140;
const OPEN_SPRING = { tension: 65, friction: 11 };
const CLOSE_SPRING = { tension: 100, friction: 14, restSpeedThreshold: 1, restDisplacementThreshold: 1 };

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
export type DialogAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export type DialogProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  /** スクリムタップで閉じる。デフォルト true */
  dismissOnBackdropPress?: boolean;
  testID?: string;
};

// ---------------------------------------------------------------------------

export function Dialog({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  dismissOnBackdropPress = true,
  testID,
}: DialogProps) {
  const t = useTheme();
  const [mounted, setMounted] = useState(visible);

  // Cache content during close animation
  const cachedRef = useRef({ children, title, primaryAction, secondaryAction });
  if (visible) {
    cachedRef.current = { children, title, primaryAction, secondaryAction };
  }
  const cached = cachedRef.current;

  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    Animated.spring(progress, {
      toValue: 0,
      ...CLOSE_SPRING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onCloseRef.current();
      }
    });
  }, [progress]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, {
        toValue: 1,
        ...OPEN_SPRING,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.spring(progress, {
        toValue: 0,
        ...CLOSE_SPRING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // mounted は意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress]);

  const handleBackdropPress = useCallback(() => {
    if (dismissOnBackdropPress) requestClose();
  }, [dismissOnBackdropPress, requestClose]);

  if (!mounted) return null;

  const scrimOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  const { width: windowWidth } = Dimensions.get('window');
  const dialogWidth = Math.min(340, windowWidth - 48);

  const hasFooter = !!(cached.primaryAction || cached.secondaryAction);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* Scrim */}
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

        {/* Dialog Card */}
        <Animated.View
          style={[
            styles.card,
            {
              width: dialogWidth,
              backgroundColor: t.colors.surface.default,
              borderRadius: DIALOG_RADIUS,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={cached.title}
        >
          {/* Header */}
          {cached.title ? (
            <View style={[styles.header, { paddingHorizontal: t.spacing['5'] }]}>
              <Heading size="lg">{cached.title}</Heading>
              <Pressable
                onPress={requestClose}
                hitSlop={12}
                accessibilityLabel="閉じる"
                accessibilityRole="button"
                testID={testID ? `${testID}-close` : undefined}
              >
                <Icon name="close" size={22} color={t.colors.content.secondary} />
              </Pressable>
            </View>
          ) : null}

          {/* Content */}
          <View style={[styles.content, { paddingHorizontal: t.spacing['5'] }]}>
            {cached.children}
          </View>

          {/* Footer */}
          {hasFooter ? (
            <View
              style={[
                styles.footer,
                {
                  paddingHorizontal: t.spacing['4'],
                  paddingBottom: t.spacing['4'],
                  paddingTop: t.spacing['3'],
                  gap: t.spacing['3'],
                  borderTopColor: t.colors.border.subtle,
                },
              ]}
            >
              {cached.secondaryAction ? (
                <Button
                  label={cached.secondaryAction.label}
                  variant="ghost"
                  onPress={cached.secondaryAction.onPress}
                  disabled={cached.secondaryAction.disabled}
                  loading={cached.secondaryAction.loading}
                  style={styles.footerBtn}
                  testID={testID ? `${testID}-secondary` : undefined}
                />
              ) : (
                <View style={styles.footerBtn} />
              )}
              {cached.primaryAction ? (
                <Button
                  label={cached.primaryAction.label}
                  variant="primary"
                  onPress={cached.primaryAction.onPress}
                  disabled={cached.primaryAction.disabled}
                  loading={cached.primaryAction.loading}
                  style={styles.footerBtn}
                  testID={testID ? `${testID}-primary` : undefined}
                />
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrimTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(0,0,0,${SCRIM_TINT_OPACITY})`,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 8,
  },
  content: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
  },
});
