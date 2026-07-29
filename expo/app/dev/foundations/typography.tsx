/**
 * Typography scale (primitive fontSize) — DEV 専用。
 * 役割別コンポーネント (Heading/Body/Label/Caption/Overline) と使い分けの判定表は
 * `/dev/components/data-display` 参照。**実装時に選ぶのはサイズではなく役割**。
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

/** 本文域は 11/13/15/17 の4段に集約済み。この2つは移行待ちの残骸で新規利用は禁止。 */
const DEPRECATED_SIZES = new Set(['caption1', 'callout']);

function TypographyScale({ t }: { t: Theme }) {
  const sizes = Object.entries(t.typography.fontSize) as [string, number][];
  return (
    <Section title="Typography — fontSize" t={t}>
      {sizes.map(([k, v]) => {
        const deprecated = DEPRECATED_SIZES.has(k);
        return (
          <View key={k} style={{ gap: 2, opacity: deprecated ? 0.45 : 1 }}>
            <Text style={{ fontSize: v, color: t.colors.content.primary }}>
              {k} — あいうAa 123
            </Text>
            <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>
              {v}px / line {t.typography.lineHeight[k as keyof typeof t.typography.lineHeight]}px
              {deprecated ? ' — deprecated: 新規利用禁止' : ''}
            </Text>
          </View>
        );
      })}
    </Section>
  );
}
