/**
 * Radius scale — DEV 専用。用途別の目安は CLAUDE.md のデザインシステム運用ルール参照。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/design-system';
import { Section } from '../_shared';

const USAGE: Record<string, string> = {
  xs: '小さい装飾アクセント',
  sm: 'チップの一部',
  md: '小型カード・バナー・ツールチップ・リスト行',
  lg: 'ボタン・選択タイル',
  xl: '大型サマリー/チャート/カレンダーカード、浮遊トースト',
  '2xl': '標準「カード」(Card コンポーネント既定)',
  '3xl': '最大級のシートコンテナ',
  full: 'ピル・バッジ・チップ・円形ボタン (丸系は形状で判断)',
};

export default function RadiusScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Radius' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <RadiusScale t={t} />
      </ScrollView>
    </>
  );
}

function RadiusScale({ t }: { t: Theme }) {
  const steps = Object.entries(t.radius) as [string, number][];
  return (
    <Section title="Radius" t={t}>
      <View style={{ gap: t.spacing['4'] }}>
        {steps.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['3'] }}>
            <View
              style={{
                width: 56,
                height: 56,
                backgroundColor: t.colors.surface.raised,
                borderRadius: Math.min(v, 28),
                borderWidth: 1,
                borderColor: t.colors.border.default,
              }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, color: t.colors.content.primary }}>
                {k} — {v === 9999 ? 'full' : `${v}px`}
              </Text>
              <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>{USAGE[k]}</Text>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}
