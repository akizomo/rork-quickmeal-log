import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthlyStatsView } from '@/components/MonthlyStatsView';
import { SegmentedControl } from '@/components/SegmentedControl';
import { WeeklyStatsView } from '@/components/WeeklyStatsView';
import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';

type StatsTab = 'week' | 'month';

const STATS_SEGMENT_OPTIONS = [
  { key: 'week' as const, label: '週' },
  { key: 'month' as const, label: '月' },
];

export default function StatsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<StatsTab>('week');

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: '実績',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <SegmentedControl
          options={STATS_SEGMENT_OPTIONS}
          value={tab}
          onChange={setTab}
          trackColor={palette.card}
          pillColor={palette.surface}
          textColor={palette.textMuted}
          activeTextColor={palette.sageDeep}
          padding={5}
          height={44}
          fontSize={14}
          style={styles.segment}
          testID="stats-segment"
        />
        {tab === 'week' ? <WeeklyStatsView /> : <MonthlyStatsView />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  segment: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
});
