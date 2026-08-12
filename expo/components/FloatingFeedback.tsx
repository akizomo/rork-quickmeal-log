import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { useTheme, type Theme } from '@/design-system';
import { duration, easing, spring } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { formatMacroText } from '@/utils/nutrition';

/**
 * FloatingFeedback — post-save confirmation bubble at the calorie-ring
 * position (top: 340). Green sageDeep, slide-up spring animation.
 *
 * The pre-save live preview is rendered by `LivePreviewOverlay` (in
 * IdentityLogSheet.tsx) on a separate higher-z Modal layer so it stays
 * visible above the open BottomSheet.
 */
export const FloatingFeedback = memo(function FloatingFeedback() {
  const { feedback } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const [content, setContent] = useState<typeof feedback>(null);

  useEffect(() => {
    if (feedback) {
      opacity.setValue(0);
      translateY.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: duration.fast, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: -16, useNativeDriver: true, ...spring.pop }),
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
  }, [feedback, opacity, translateY]);

  const active = feedback ?? content;
  if (feedback && feedback !== content) setContent(feedback);
  if (!active) return null;

  const label = active.label;
  const macro = active.macro;

  return (
    <Animated.View
      style={[styles.feedbackBubble, { opacity, transform: [{ translateY }] }]}
      testID="floating-feedback"
      pointerEvents="none"
    >
      <Text style={styles.feedbackText}>{label}</Text>
      <Text style={[styles.feedbackMacro, { color: t.colors.content.onAction, opacity: 0.75 }]}>{formatMacroText(macro)}</Text>
    </Animated.View>
  );
});

const makeStyles = (t: Theme) => StyleSheet.create({
  feedbackBubble: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: t.colors.action.primary.default, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.xl, alignItems: 'center', ...t.elevation.lg, shadowColor: t.colors.action.primary.default },
  feedbackText: { color: t.colors.content.onAction, fontSize: fs.md, fontWeight: '700' },
  feedbackMacro: { fontSize: fs.sm, marginTop: 2 },
});
