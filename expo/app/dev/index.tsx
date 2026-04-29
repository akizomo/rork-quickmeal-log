import { Link } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from '@/design-system';

export default function DevHub() {
  const t = useTheme();
  const items: { label: string; href: '/dev/tokens' | '/dev/components'; desc: string }[] = [
    { label: 'Tokens', href: '/dev/tokens', desc: 'Color / Spacing / Typography / Radius / Elevation' },
    { label: 'Components', href: '/dev/components', desc: 'Button / Card variants & sizes' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentContainerStyle={{ padding: t.spacing['6'], gap: t.spacing['3'] }}
    >
      <Text
        style={{
          color: t.colors.content.secondary,
          fontSize: t.typography.fontSize.sm,
          marginBottom: t.spacing['2'],
        }}
      >
        DEV 専用 — デザインシステムの視覚確認
      </Text>
      {items.map((item) => (
        <Link key={item.href} href={item.href} asChild>
          <Pressable
            style={{
              backgroundColor: t.colors.surface.raised,
              borderRadius: t.radius['2xl'],
              padding: t.spacing['5'],
              gap: t.spacing['1'],
              ...t.elevation.sm,
            }}
          >
            <Text
              style={{
                color: t.colors.content.primary,
                fontSize: t.typography.fontSize.xl,
                fontWeight: t.typography.fontWeight.semibold,
                lineHeight: t.typography.lineHeight.xl,
              }}
            >
              {item.label}
            </Text>
            <Text
              style={{
                color: t.colors.content.secondary,
                fontSize: t.typography.fontSize.sm,
                lineHeight: t.typography.lineHeight.sm,
              }}
            >
              {item.desc}
            </Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
