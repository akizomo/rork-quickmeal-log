import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyStatsView } from '@/components/BodyStatsView';
import { MonthlyStatsView } from '@/components/MonthlyStatsView';
import { SegmentedControl } from '@/components/SegmentedControl';
import { WeeklyStatsView } from '@/components/WeeklyStatsView';
import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';

type TopTab = 'meals' | 'body';
type MealsTab = 'week' | 'month';

const TOP_SEGMENT_OPTIONS = [
  { key: 'meals' as const, label: '食事' },
  { key: 'body' as const, label: 'からだ' },
];

const MEALS_SEGMENT_OPTIONS = [
  { key: 'week' as const, label: '週' },
  { key: 'month' as const, label: '月' },
];

export default function StatsScreen() {
  const theme = useTheme();
  const [topTab, setTopTab] = useState<TopTab>('meals');
  const [mealsTab, setMealsTab] = useState<MealsTab>('week');

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
          options={TOP_SEGMENT_OPTIONS}
          value={topTab}
          onChange={setTopTab}
          trackColor={palette.card}
          pillColor={palette.surface}
          textColor={palette.textMuted}
          activeTextColor={palette.sageDeep}
          padding={5}
          height={44}
          fontSize={14}
          style={styles.segment}
          testID="stats-top-segment"
        />

        {topTab === 'meals' ? (
          <>
            <SegmentedControl
              options={MEALS_SEGMENT_OPTIONS}
              value={mealsTab}
              onChange={setMealsTab}
              trackColor={palette.card}
              pillColor={palette.surface}
              textColor={palette.textMuted}
              activeTextColor={palette.sageDeep}
              padding={5}
              height={40}
              fontSize={13}
              style={styles.subSegment}
              testID="stats-meals-segment"
            />
            {mealsTab === 'week' ? <WeeklyStatsView /> : <MonthlyStatsView />}
          </>
        ) : (
          <BodyStatsView />
        )}
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
  subSegment: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
