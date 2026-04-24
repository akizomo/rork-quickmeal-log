import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthlyStatsView } from '@/components/MonthlyStatsView';
import { WeeklyStatsView } from '@/components/WeeklyStatsView';
import { palette } from '@/constants/theme';

type StatsTab = 'week' | 'month';

export default function StatsScreen() {
  const [tab, setTab] = useState<StatsTab>('week');

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: '実績' }} />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.segmentWrap} testID="stats-segment">
          {(['week', 'month'] as const).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
                testID={`stats-segment-${key}`}
              >
                <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                  {key === 'week' ? '週' : '月'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tab === 'week' ? <WeeklyStatsView /> : <MonthlyStatsView />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  safe: { flex: 1 },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 5,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: palette.surface,
  },
  segmentText: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: palette.sageDeep,
    fontWeight: '700',
  },
});
