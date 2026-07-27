/**
 * Elevation (shadow) scale — DEV 専用。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/design-system';
import { Section } from '../_shared';

export default function ElevationScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Elevation' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <ElevationScale t={t} />
      </ScrollView>
    </>
  );
}

function ElevationScale({ t }: { t: Theme }) {
  const levels = Object.entries(t.elevation) as [string, (typeof t.elevation)['sm']][];
  return (
    <Section title="Elevation" t={t}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: t.spacing['4'],
          padding: t.spacing['3'],
        }}
      >
        {levels.map(([k, v]) => (
          <View key={k} style={{ alignItems: 'center', gap: t.spacing['2'] }}>
            <View
              style={{
                width: 72,
                height: 72,
                backgroundColor: t.colors.surface.raised,
                borderRadius: t.radius.lg,
                ...v,
              }}
            />
            <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.primary }}>{k}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}
