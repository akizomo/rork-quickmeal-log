import { useRouter } from 'expo-router';
import { Icon } from '@/design-system';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import { adjustedTargetKcal, getGrossExerciseKcalForDate } from '@/utils/goals';
import {
  addDays,
  averageLoggedDays,
  formatShortDay,
  formatWeekRangeLabel,
  getDailyMacros,
  getHistoryStartDate,
  getWeekRange,
  startOfDay,
} from '@/utils/history';

const CHART_HEIGHT = 170;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 38;

export function WeeklyStatsView() {
  const { logs, profile, settings, exerciseLogs } = useAppState();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const today = useMemo(() => startOfDay(new Date()), []);
  const historyStart = useMemo(
    () => getHistoryStartDate(settings.onboardingCompletedAtISO ?? null, logs),
    [settings.onboardingCompletedAtISO, logs]
  );

  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const range = useMemo(() => getWeekRange(anchor), [anchor]);
  const dailyMap = useMemo(() => getDailyMacros(logs, range), [logs, range]);
  const dailyEntries = useMemo(() => Array.from(dailyMap.entries()), [dailyMap]);
  const avgMacro = useMemo(() => averageLoggedDays(dailyMap), [dailyMap]);

  const dailyExerciseMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key] of dailyEntries) {
      map.set(key, getGrossExerciseKcalForDate(exerciseLogs, key));
    }
    return map;
  }, [dailyEntries, exerciseLogs]);

  const dailyAdjustedTargetMap = useMemo(() => {
    const map = new Map<string, number>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const [key] of dailyEntries) {
      map.set(key, base > 0 ? adjustedTargetKcal(base, exerciseLogs, key) : 0);
    }
    return map;
  }, [dailyEntries, exerciseLogs, profile.targetCalories]);

  const avgAdjustedTarget = useMemo(() => {
    const loggedKeys = dailyEntries.filter(([k]) => (dailyMap.get(k)?.kcal ?? 0) > 0).map(([k]) => k);
    if (loggedKeys.length === 0) return profile.targetCalories;
    const sum = loggedKeys.reduce((acc, k) => acc + (dailyAdjustedTargetMap.get(k) ?? 0), 0);
    return Math.round(sum / loggedKeys.length);
  }, [dailyEntries, dailyMap, dailyAdjustedTargetMap, profile.targetCalories]);

  const avgExerciseKcal = useMemo(() => {
    const loggedKeys = dailyEntries.filter(([k]) => (dailyMap.get(k)?.kcal ?? 0) > 0).map(([k]) => k);
    if (loggedKeys.length === 0) return 0;
    const sum = loggedKeys.reduce((acc, k) => acc + (dailyExerciseMap.get(k) ?? 0), 0);
    return Math.round(sum / loggedKeys.length);
  }, [dailyEntries, dailyMap, dailyExerciseMap]);

  const canGoPrev = useMemo(() => {
    const prevWeekEnd = addDays(range.start, -1);
    return prevWeekEnd >= historyStart;
  }, [range.start, historyStart]);
  const canGoNext = useMemo(() => range.end < today, [range.end, today]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setAnchor((prev) => addDays(prev, -7));
  }, [canGoPrev]);
  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setAnchor((prev) => addDays(prev, 7));
  }, [canGoNext]);

  const targetKcal = avgAdjustedTarget > 0 ? avgAdjustedTarget : profile.targetCalories > 0 ? profile.targetCalories : 0;
  const maxKcal = useMemo(() => {
    const max = Math.max(targetKcal, ...Array.from(dailyMap.values()).map((m) => m.kcal));
    return max > 0 ? max * 1.1 : 2000;
  }, [dailyMap, targetKcal]);

  const chartWidth = screenWidth - 32;
  const barCount = 7;
  const chartHorizontalPadding = 14;
  const barAreaWidth = chartWidth - chartHorizontalPadding * 2;
  const slotWidth = barAreaWidth / barCount;
  const barWidth = slotWidth * 0.55;
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

  const onTapDay = useCallback(
    (dateKey: string) => {
      router.push({ pathname: '/', params: { date: dateKey } });
    },
    [router]
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow} testID="week-header">
        <Pressable onPress={goPrev} disabled={!canGoPrev} style={styles.navBtn} testID="week-prev">
          <Icon name="chevronLeft" color={canGoPrev ? palette.sageStrong : palette.textMuted} size={20} />
        </Pressable>
        <Text style={styles.headerLabel}>{formatWeekRangeLabel(range)}</Text>
        <Pressable onPress={goNext} disabled={!canGoNext} style={styles.navBtn} testID="week-next">
          <Icon name="chevronRight" color={canGoNext ? palette.sageStrong : palette.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={[styles.chartWrap, { width: chartWidth, height: CHART_HEIGHT }]}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {targetKcal > 0 ? (
            <Line
              x1={chartHorizontalPadding}
              x2={chartWidth - chartHorizontalPadding}
              y1={CHART_PADDING_TOP + chartInnerHeight * (1 - targetKcal / maxKcal)}
              y2={CHART_PADDING_TOP + chartInnerHeight * (1 - targetKcal / maxKcal)}
              stroke={palette.textMuted}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ) : null}
          {dailyEntries.map(([key, macro], i) => {
            const ratio = macro.kcal / maxKcal;
            const h = Math.max(0, ratio * chartInnerHeight);
            const slotX = chartHorizontalPadding + i * slotWidth;
            const centerX = slotX + slotWidth / 2;
            const x = centerX - barWidth / 2;
            const y = CHART_PADDING_TOP + (chartInnerHeight - h);
            const date = new Date(key);
            const dow = WEEKDAYS[date.getDay()];
            return (
              <React.Fragment key={key}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill={macro.kcal > 0 ? palette.sage : '#E2DDD4'}
                />
                <SvgText
                  x={centerX}
                  y={CHART_HEIGHT - 14}
                  fontSize={10}
                  fill={palette.textMuted}
                  textAnchor="middle"
                >
                  {dow}
                </SvgText>
                <SvgText
                  x={centerX}
                  y={CHART_HEIGHT - 3}
                  fontSize={10}
                  fontWeight="600"
                  fill={palette.text}
                  textAnchor="middle"
                >
                  {date.getDate()}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.summaryCard} testID="week-summary">
        <Text style={styles.summaryTitle}>週平均</Text>
        <Text style={styles.summaryKcal}>{Math.round(avgMacro.kcal)} kcal / 日</Text>
        <Text style={styles.summarySub}>
          P {Math.round(avgMacro.protein)}g · F {Math.round(avgMacro.fat)}g · C {Math.round(avgMacro.carbs)}g
        </Text>
        {avgExerciseKcal > 0 ? (
          <Text style={styles.summaryConsume}>平均消費 {avgExerciseKcal} kcal / 日</Text>
        ) : null}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>日別の記録</Text>
        {dailyEntries.map(([key, macro]) => {
          const date = new Date(key);
          const hasLog = macro.kcal > 0;
          const exerciseKcal = dailyExerciseMap.get(key) ?? 0;
          return (
            <Pressable
              key={key}
              style={styles.dayRow}
              onPress={() => hasLog && onTapDay(key)}
              disabled={!hasLog}
              testID={`week-day-row-${key}`}
            >
              <View style={styles.dayRowLeft}>
                <Text style={styles.dayLabel}>{formatShortDay(date)}</Text>
                {!hasLog ? <Text style={styles.dayNoLog}>記録なし</Text> : null}
              </View>
              {hasLog ? (
                <View style={styles.dayRowRight}>
                  <Text style={styles.dayKcal}>{Math.round(macro.kcal)} kcal</Text>
                  <Text style={styles.dayMacroLine}>
                    P{Math.round(macro.protein)} F{Math.round(macro.fat)} C{Math.round(macro.carbs)}
                    {exerciseKcal > 0 ? ` · 消費 ${Math.round(exerciseKcal)}` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.dayDash}>—</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  chartWrap: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 0,
    alignSelf: 'center',
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  summaryKcal: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  summarySub: {
    fontSize: 13,
    color: palette.text,
  },
  summaryConsume: {
    marginTop: 2,
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  listSection: {
    gap: 6,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 12,
  },
  dayRowLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  dayNoLog: {
    fontSize: 11,
    color: palette.textMuted,
  },
  dayRowRight: {
    alignItems: 'flex-end',
  },
  dayKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  dayMacroLine: {
    fontSize: 11,
    color: palette.textMuted,
    marginTop: 2,
  },
  dayDash: {
    fontSize: 14,
    color: palette.textMuted,
  },
});
