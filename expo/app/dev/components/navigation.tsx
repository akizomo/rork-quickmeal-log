/**
 * Navigation — SegmentedControl / Tabs のショーケース。DEV 専用。
 */

import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { SegmentedControl, Tabs, useTheme } from '@/design-system';
import { Section, subTitle, labelStyle } from '../_shared';
import { Text } from 'react-native';

type Period = '1m' | '3m' | '1y';
type StatsTab = 'body' | 'meal';

export default function NavigationScreen() {
  const t = useTheme();
  const [period, setPeriod] = useState<Period>('1m');
  const [statsTab, setStatsTab] = useState<StatsTab>('body');
  const [twoOption, setTwoOption] = useState<'week' | 'month'>('week');
  const [fiveOption, setFiveOption] = useState<'a' | 'b' | 'c' | 'd' | 'e'>('a');

  return (
    <>
      <Stack.Screen options={{ title: 'Navigation' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        {/* SegmentedControl */}
        <Section title="SegmentedControl" t={t}>
          <Text style={subTitle(t)}>2 items</Text>
          <SegmentedControl
            options={[
              { key: 'week', label: '週' },
              { key: 'month', label: '月' },
            ]}
            value={twoOption}
            onChange={setTwoOption}
          />

          <Text style={subTitle(t)}>3 items (実装例: 期間選択)</Text>
          <SegmentedControl<Period>
            options={[
              { key: '1m', label: '1ヶ月' },
              { key: '3m', label: '3ヶ月' },
              { key: '1y', label: '1年' },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <Text style={labelStyle(t)}>選択中: {period}</Text>

          <Text style={subTitle(t)}>5 items</Text>
          <SegmentedControl<'a' | 'b' | 'c' | 'd' | 'e'>
            options={[
              { key: 'a', label: 'A' },
              { key: 'b', label: 'B' },
              { key: 'c', label: 'C' },
              { key: 'd', label: 'D' },
              { key: 'e', label: 'E' },
            ]}
            value={fiveOption}
            onChange={setFiveOption}
          />

          <Text style={subTitle(t)}>カスタム高さ・角丸</Text>
          <SegmentedControl
            options={[
              { key: 'week', label: '週' },
              { key: 'month', label: '月' },
            ]}
            value={twoOption}
            onChange={setTwoOption}
            height={44}
            borderRadius={t.radius.lg}
          />
        </Section>

        {/* Tabs */}
        <Section title="Tabs" t={t}>
          <Text style={subTitle(t)}>2 tabs (実装例: からだ / 食事)</Text>
          <View style={{ backgroundColor: t.colors.surface.default, borderRadius: t.radius['2xl'], overflow: 'hidden' }}>
            <Tabs<StatsTab>
              items={[
                { key: 'body', label: 'からだ' },
                { key: 'meal', label: '食事' },
              ]}
              value={statsTab}
              onChange={setStatsTab}
            />
            <View style={{ padding: t.spacing['4'] }}>
              <Text style={labelStyle(t)}>
                {statsTab === 'body' ? 'からだタブのコンテンツ' : '食事タブのコンテンツ'}
              </Text>
            </View>
          </View>

          <Text style={subTitle(t)}>3 tabs</Text>
          <View style={{ backgroundColor: t.colors.surface.default, borderRadius: t.radius['2xl'], overflow: 'hidden' }}>
            <Tabs
              items={[
                { key: 'a', label: '概要' },
                { key: 'b', label: '詳細' },
                { key: 'c', label: '設定' },
              ]}
              value="a"
              onChange={() => {}}
            />
          </View>
        </Section>
      </ScrollView>
    </>
  );
}
