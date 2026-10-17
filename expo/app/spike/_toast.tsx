/**
 * SHEET_MIGRATION.md Phase 0 スパイク用 — ネイティブ formSheet の「上」にトーストを出せるかの検証。
 * iOS は react-native-screens の FullWindowOverlay (別 UIWindow) に載せる。
 * Android の FullWindowOverlay は通常の View として描画される。
 * routing 対象外 (`_` prefix)。移行完了時に spike ディレクトリごと削除する。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design-system';
import { duration } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';

export function useSpikeToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 1800);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { message, show };
}

export function SpikeToast({ message }: { message: string | null }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: message ? 1 : 0, duration: duration.fast, useNativeDriver: true }).start();
  }, [message, opacity]);
  if (!message) return null;
  return (
    <FullWindowOverlay>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: insets.top + t.spacing['3'] }]}>
        <Animated.View
          style={{
            opacity,
            backgroundColor: t.colors.action.primary.default,
            borderRadius: radius.xl,
            paddingHorizontal: t.spacing['4'],
            paddingVertical: t.spacing['3'],
            ...t.elevation.lg,
          }}
        >
          <Text style={{ color: t.colors.content.onAction, fontWeight: '600' }}>{message}</Text>
        </Animated.View>
      </View>
    </FullWindowOverlay>
  );
}
