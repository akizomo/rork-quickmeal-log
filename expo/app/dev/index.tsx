import { Link } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';

export default function DevHub() {
  const t = useTheme();
  const { settings, updateSettingsValues } = useAppState();

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

      <View
        style={{
          backgroundColor: t.colors.surface.raised,
          borderRadius: t.radius['2xl'],
          padding: t.spacing['5'],
          gap: t.spacing['3'],
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
          Paywall
        </Text>
        <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm }}>
          現在: <Text style={{ fontWeight: 'bold' }}>{settings.subscriptionStatus}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
          <Pressable
            onPress={() => {
              updateSettingsValues({ subscriptionStatus: 'trialing' });
              Alert.alert('Paywall スキップ', 'subscriptionStatus を trialing にセットしました。');
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: '#2d6a4f',
              borderRadius: t.radius.lg,
              padding: t.spacing['3'],
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.typography.fontSize.sm }}>
              スキップ (trialing)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              updateSettingsValues({ subscriptionStatus: 'none' });
              Alert.alert('Paywall リセット', 'subscriptionStatus を none に戻しました。');
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: '#9b2335',
              borderRadius: t.radius.lg,
              padding: t.spacing['3'],
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.typography.fontSize.sm }}>
              リセット (none)
            </Text>
          </Pressable>
        </View>
      </View>

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
