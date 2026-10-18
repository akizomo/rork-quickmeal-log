/**
 * TallSheetScreen の見本 (背の高い formSheet: 見出し + 本文スクロール + 固定フッター)。DEV 専用。
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Body, Caption, TallSheetScreen, useTheme } from '@/design-system';

export default function DevSheetTall() {
  const router = useRouter();
  const t = useTheme();
  return (
    <TallSheetScreen
      title="🍚 ごはんパン麺"
      footerLeft={<Body weight="semibold">105 kcal</Body>}
      primaryAction={{ label: '保存して追加', onPress: () => router.back() }}
    >
      <Body size="sm" tone="secondary">
        detent は 60% / 100% (tallSheetOptions)。本文だけがスクロールし、フッターは常に下に貼り付く。
      </Body>
      {Array.from({ length: 30 }).map((_, i) => (
        <View
          key={i}
          style={{
            padding: t.spacing['3'],
            marginTop: t.spacing['2'],
            backgroundColor: t.colors.surface.raised,
            borderRadius: t.radius.md,
          }}
        >
          <Body>項目 {i + 1}</Body>
          <Caption tone="secondary">スクロールしても見出しの上にはみ出さない (SDK 58)</Caption>
        </View>
      ))}
    </TallSheetScreen>
  );
}
