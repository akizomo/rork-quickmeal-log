import { Stack } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyStatsView } from '@/components/BodyStatsView';
import { MonthlyStatsView } from '@/components/MonthlyStatsView';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Tabs } from '@/components/Tabs';
import { WeeklyStatsView } from '@/components/WeeklyStatsView';
import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';

type TopTab = 'meals' | 'body';
type MealsTab = 'week' | 'month';

const TOP_TAB_ITEMS = [
  { key: 'meals' as const, label: '食事' },
  { key: 'body' as const, label: 'からだ' },
];

const MEALS_SEGMENT_OPTIONS = [
  { key: 'week' as const, label: '週' },
  { key: 'month' as const, label: '月' },
];

// M3 fade through: 100ms out → swap → 200ms in
const FADE_OUT_DURATION = 100;
const FADE_IN_DURATION = 200;
const M3_EMPHASIZED = Easing.bezier(0.2, 0, 0, 1.0);

export default function StatsScreen() {
  const theme = useTheme();
  const [topTab, setTopTab] = useState<TopTab>('meals');
  const [mealsTab, setMealsTab] = useState<MealsTab>('week');
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const handleTopTabChange = useCallback((tab: TopTab) => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: FADE_OUT_DURATION,
      easing: M3_EMPHASIZED,
      useNativeDriver: true,
    }).start(() => {
      setTopTab(tab);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        easing: M3_EMPHASIZED,
        useNativeDriver: true,
      }).start();
    });
  }, [contentOpacity]);

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
        <Tabs
          items={TOP_TAB_ITEMS}
          value={topTab}
          onChange={handleTopTabChange}
          style={styles.tabs}
          testID="stats-top-tabs"
        />

        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
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
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  tabs: {
    marginTop: 4,
  },
  content: { flex: 1 },
  subSegment: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
});
