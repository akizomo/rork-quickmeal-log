/**
 * Statistics — CalorieOverflowRing / BodyStatsView / WeeklyStatsView / MonthlyStatsView のショーケース。DEV 専用。
 */

import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { useTheme } from '@/design-system';
import { Section, subTitle } from '../_shared';

export default function StatisticsScreen() {
  const t = useTheme();
  const [consumed, setConsumed] = useState(1600);
  const target = 2000;

  const scenarios: { label: string; consumed: number; target: number }[] = [
    { label: '未記録 (0%)', consumed: 0, target: 2000 },
    { label: '途中 (60%)', consumed: 1200, target: 2000 },
    { label: '達成 (100%)', consumed: 2000, target: 2000 },
    { label: '許容超過 (110%)', consumed: 2200, target: 2000 },
    { label: '2周目 (140%)', consumed: 2800, target: 2000 },
    { label: '目標0 (エラー耐性)', consumed: 500, target: 0 },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Statistics' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        {/* CalorieOverflowRing */}
        <Section title="CalorieOverflowRing" t={t}>
          <Text style={subTitle(t)}>centerMode="remaining" (ホーム実装)</Text>
          <View style={{ alignItems: 'center' }}>
            <CalorieOverflowRing
              consumedKcal={consumed}
              targetKcal={target}
              size={160}
              strokeWidth={18}
              statusMode="auto"
              centerMode="remaining"
              showStatusText={false}
            />
          </View>

          <Text style={subTitle(t)}>centerMode="consumed" (従来)</Text>
          <View style={{ alignItems: 'center' }}>
            <CalorieOverflowRing
              consumedKcal={consumed}
              targetKcal={target}
              size={160}
              strokeWidth={18}
              statusMode="auto"
              centerMode="consumed"
            />
          </View>

          <Text style={subTitle(t)}>達成チェック (showAchievedCheck)</Text>
          <View style={{ alignItems: 'center' }}>
            <CalorieOverflowRing
              consumedKcal={2000}
              targetKcal={2000}
              size={120}
              strokeWidth={14}
              centerMode="remaining"
              showAchievedCheck
              showStatusText={false}
            />
          </View>

          <Text style={subTitle(t)}>全シナリオ (size=80)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['4'], justifyContent: 'center' }}>
            {scenarios.map((s) => (
              <View key={s.label} style={{ alignItems: 'center', gap: t.spacing['1'] }}>
                <CalorieOverflowRing
                  consumedKcal={s.consumed}
                  targetKcal={s.target}
                  size={80}
                  strokeWidth={9}
                  centerMode="remaining"
                  showStatusText={false}
                  showCenterLabel={false}
                />
                <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.secondary, textAlign: 'center', maxWidth: 72 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          <Text style={subTitle(t)}>サイズ比較 (size: 60 / 100 / 140)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            {[60, 100, 140].map((size) => (
              <CalorieOverflowRing
                key={size}
                consumedKcal={1400}
                targetKcal={2000}
                size={size}
                strokeWidth={Math.round(size * 0.11)}
                centerMode="remaining"
                showStatusText={false}
              />
            ))}
          </View>
        </Section>

        <Section title="実装ノート" t={t}>
          <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm, lineHeight: 20 }}>
            {'• BodyStatsView / WeeklyStatsView / MonthlyStatsView はアプリ状態(useAppState)に依存するため、このページではCalorieOverflowRingのみを単体展示しています。\n\n• WeeklyStatsView / MonthlyStatsView のリングはCalorieOverflowRingと同じ2周オーバーフロー設計を踏襲していますが、SVGを直接組んでいます（HomeScreen内のWeeklyRingsRowと同パターン）。\n\n• アプリ内での動作確認は Stats 画面（/stats）を参照してください。'}
          </Text>
        </Section>
      </ScrollView>
    </>
  );
}
