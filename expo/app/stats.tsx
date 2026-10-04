import { Stack } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';

import { BodyStatsView, type BodyPeriod } from '@/components/BodyStatsView';
import { MonthlyStatsView } from '@/components/MonthlyStatsView';
import { SegmentedControl } from '@/design-system';
import { Tabs } from '@/design-system';
import { WeeklyStatsView } from '@/components/WeeklyStatsView';
import { useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { duration, easing } from '@/design-system/tokens/primitives/motion';

type TopTab = 'meals' | 'body';
type MealsTab = 'week' | 'month';

// M3 fade through: 100ms out → swap → 200ms(duration.short) in
const FADE_OUT_DURATION = 100;
const FADE_IN_DURATION = duration.short;

export default function StatsScreen() {
  const theme = useTheme();
  const t = useT();
  const [topTab, setTopTab] = useState<TopTab>('meals');
  const [mealsTab, setMealsTab] = useState<MealsTab>('week');
  const [bodyPeriod, setBodyPeriod] = useState<BodyPeriod>('month');
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const TOP_TAB_ITEMS = [
    { key: 'meals' as const, label: t('stats.tabs.meals') },
    { key: 'body' as const, label: t('stats.tabs.body') },
  ];
  const MEALS_SEGMENT_OPTIONS = [
    { key: 'week' as const, label: t('stats.periods.week') },
    { key: 'month' as const, label: t('stats.periods.month') },
  ];
  const BODY_SEGMENT_OPTIONS = [
    { key: 'week' as const, label: t('stats.periods.week') },
    { key: 'month' as const, label: t('stats.periods.month') },
    { key: 'year' as const, label: t('stats.periods.year') },
  ];

  const handleTopTabChange = useCallback((tab: TopTab) => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: FADE_OUT_DURATION,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: true,
    }).start(() => {
      setTopTab(tab);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        easing: Easing.bezier(...easing.standard),
        useNativeDriver: true,
      }).start();
    });
  }, [contentOpacity]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surface.default }]}>
      <Stack.Screen
        options={{
          title: t('stats.title'),
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
                textColor={theme.colors.content.secondary}
                activeTextColor={theme.colors.action.text.default}
                padding={5}
                height={40}
                fontSize={fs.sm}
                style={styles.subSegment}
                testID="stats-meals-segment"
              />
              {mealsTab === 'week' ? <WeeklyStatsView /> : <MonthlyStatsView />}
            </>
          ) : (
            <>
              <SegmentedControl
                options={BODY_SEGMENT_OPTIONS}
                value={bodyPeriod}
                onChange={setBodyPeriod}
                textColor={theme.colors.content.secondary}
                activeTextColor={theme.colors.action.text.default}
                padding={5}
                height={40}
                fontSize={fs.sm}
                style={styles.subSegment}
                testID="stats-body-segment"
              />
              <BodyStatsView period={bodyPeriod} />
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
