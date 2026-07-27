/**
 * Typography scale (primitive fontSize) — DEV 専用。
 * Heading/Body/Caption 等の実コンポーネント確認は `/dev/components/data-display` 参照。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/design-system';
import { Section } from '../_shared';

export default function TypographyScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Typography' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <TypographyScale t={t} />
      </ScrollView>
    </>
  );
}

function TypographyScale({ t }: { t: Theme }) {
  const sizes = Object.entries(t.typography.fontSize) as [string, number][];
  return (
    <Section title="Typography — fontSize" t={t}>
      {sizes.map(([k, v]) => (
        <View key={k} style={{ gap: 2 }}>
          <Text style={{ fontSize: v, color: t.colors.content.primary }}>
            {k} — あいうAa 123
          </Text>
          <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>
            {v}px / line {t.typography.lineHeight[k as keyof typeof t.typography.lineHeight]}px
          </Text>
        </View>
      ))}
    </Section>
  );
}
