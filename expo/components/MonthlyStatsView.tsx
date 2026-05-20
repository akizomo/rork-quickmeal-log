import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { adjustedTargetKcal, getGrossExerciseKcalForDate } from '@/utils/goals';
import {
  addDays,
  averageLoggedDays,
  countLoggedDays,
  formatMonthLabel,
  formatShortDay,
  getDailyMacros,
  getHistoryStartDate,
  getMonthCalendarCells,
  getMonthRange,
  isSameDay,
  startOfDay,
} from '@/utils/history';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function MonthlyStatsView() {
  const { logs, profile, settings, exerciseLogs } = useAppState();
  const t = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const today = useMemo(() => startOfDay(new Date()), []);
  const historyStart = useMemo(
    () => getHistoryStartDate(settings.onboardingCompletedAtISO ?? null, logs),
    [settings.onboardingCompletedAtISO, logs]
  );
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));

  const cells = useMemo(() => getMonthCalendarCells(anchor), [anchor]);
  const monthRange = useMemo(() => getMonthRange(anchor), [anchor]);
  const monthDailyMap = useMemo(() => getDailyMacros(logs, monthRange), [logs, monthRange]);
  const avgMacro = useMemo(() => averageLoggedDays(monthDailyMap), [monthDailyMap]);
  const loggedDays = useMemo(() => countLoggedDays(monthDailyMap), [monthDailyMap]);
  // 今日以前の日付のみ、新しい順で表示
  const monthDailyEntries = useMemo(
    () =>
      Array.from(monthDailyMap.entries())
        .filter(([key]) => new Date(key) <= today)
        .reverse(),
    [monthDailyMap, today]
  );

  const monthExerciseMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of monthDailyMap.keys()) {
      map.set(key, getGrossExerciseKcalForDate(exerciseLogs, key));
    }
    return map;
  }, [monthDailyMap, exerciseLogs]);

  const monthAdjustedTargetMap = useMemo(() => {
    const map = new Map<string, number>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const key of monthDailyMap.keys()) {
      map.set(key, base > 0 ? adjustedTargetKcal(base, exerciseLogs, key) : 0);
    }
    return map;
  }, [monthDailyMap, exerciseLogs, profile.targetCalories]);

  const avgExerciseKcal = useMemo(() => {
    const loggedKeys = Array.from(monthDailyMap.entries())
      .filter(([, m]) => m.kcal > 0)
      .map(([k]) => k);
    if (loggedKeys.length === 0) return 0;
    const sum = loggedKeys.reduce((acc, k) => acc + (monthExerciseMap.get(k) ?? 0), 0);
    return Math.round(sum / loggedKeys.length);
  }, [monthDailyMap, monthExerciseMap]);

  const canGoPrev = useMemo(() => {
    const prevMonth = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    return prevMonth >= new Date(historyStart.getFullYear(), historyStart.getMonth(), 1);
  }, [anchor, historyStart]);
  const canGoNext = useMemo(() => {
    const nextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return nextMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
  }, [anchor, today]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, [canGoPrev]);
  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, [canGoNext]);

  // Calendar geometry
  const gridPadding = 16;
  const innerWidth = screenWidth - gridPadding * 2 - 24; // 12px outer card padding both sides
  const cellSize = Math.floor(innerWidth / 7);
  const targetKcal = profile.targetCalories > 0 ? profile.targetCalories : 0;
  const maxKcal = useMemo(() => {
    const max = Math.max(targetKcal, ...Array.from(monthDailyMap.values()).map((m) => m.kcal));
    return max > 0 ? max : 2000;
  }, [monthDailyMap, targetKcal]);

  const onTapDay = useCallback(
    (dateKey: string, hasLog: boolean, future: boolean) => {
      if (!hasLog || future) return;
      router.push({ pathname: '/', params: { date: dateKey } });
    },
    [router]
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow} testID="month-header">
        <Pressable onPress={goPrev} disabled={!canGoPrev} style={styles.navBtn} testID="month-prev">
          <ChevronLeft color={canGoPrev ? palette.sageStrong : palette.textMuted} size={20} />
        </Pressable>
        <Text style={styles.headerLabel}>{formatMonthLabel(anchor)}</Text>
        <Pressable onPress={goNext} disabled={!canGoNext} style={styles.navBtn} testID="month-next">
          <ChevronRight color={canGoNext ? palette.sageStrong : palette.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={[styles.calendarCard, { padding: 12 }]}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={d} style={[styles.weekdayCell, { width: cellSize }]}>
              <Text style={[styles.weekdayText, i === 0 ? styles.sunday : null, i === 6 ? styles.saturday : null]}>
                {d}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.gridWrap}>
          {cells.map((cell) => {
            const macro = monthDailyMap.get(cell.dateKey);
            const kcal = macro?.kcal ?? 0;
            const future = cell.date > today;
            const isFutureOrEmpty = future || kcal === 0;
            // Circle radius: min 4 (no log) → max cellSize*0.42
            const minR = 4;
            const maxR = cellSize * 0.42;
            const ratio = maxKcal > 0 ? Math.min(kcal / maxKcal, 1.4) : 0;
            const r = kcal > 0 ? Math.max(minR + 2, ratio * maxR) : minR;
            const dayTarget = monthAdjustedTargetMap.get(cell.dateKey) ?? targetKcal;
            const color = (() => {
              if (kcal === 0) return 'transparent';
              if (dayTarget === 0) return t.colors.nutrition.calorie.within;
              const overall = kcal / dayTarget;
              // 〜110%: 予算内 (moss)、110〜130%: 軽度超過 (amber)、130%超: 大幅超過 (clay)
              // 不足はサイズで表現し、色はカロリー予算カラーに統一する。
              if (overall <= 1.1) return t.colors.nutrition.calorie.within;
              if (overall <= 1.3) return t.colors.nutrition.calorie.mildExceed;
              return t.colors.nutrition.calorie.severeExceed;
            })();
            const dim = !cell.inMonth || future;
            return (
              <Pressable
                key={cell.dateKey}
                onPress={() => onTapDay(cell.dateKey, kcal > 0, future)}
                disabled={isFutureOrEmpty || !cell.inMonth}
                style={[styles.cell, { width: cellSize, height: cellSize }]}
                testID={`month-cell-${cell.dateKey}`}
              >
                {kcal > 0 ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: cellSize / 2 - r,
                      left: cellSize / 2 - r,
                      width: r * 2,
                      height: r * 2,
                      borderRadius: r,
                      backgroundColor: color,
                      opacity: cell.inMonth ? 0.55 : 0.25,
                    }}
                  />
                ) : null}
                <Text
                  style={[
                    styles.cellText,
                    dim ? styles.cellTextDim : null,
                    isSameDay(cell.date, today) ? styles.cellTextToday : null,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryCard} testID="month-summary">
        <Text style={styles.summaryTitle}>{formatMonthLabel(anchor)} の平均</Text>
        <Text style={styles.summaryKcal}>{Math.round(avgMacro.kcal)} kcal / 日</Text>
        <Text style={styles.summarySub}>
          P {Math.round(avgMacro.protein)}g · F {Math.round(avgMacro.fat)}g · C {Math.round(avgMacro.carbs)}g
        </Text>
        {avgExerciseKcal > 0 ? (
          <Text style={styles.summaryConsume}>平均消費 {avgExerciseKcal} kcal / 日</Text>
        ) : null}
        <Text style={styles.summaryMeta}>記録した日: {loggedDays} 日</Text>
        <Text style={styles.summaryHint}>円の大きさ = その日の摂取カロリー量</Text>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>日別の記録</Text>
        {monthDailyEntries.map(([key, macro]) => {
          const date = new Date(key);
          const hasLog = macro.kcal > 0;
          const exerciseKcal = monthExerciseMap.get(key) ?? 0;
          return (
            <Pressable
              key={key}
              style={styles.dayRow}
              onPress={() => hasLog && onTapDay(key, true, false)}
              disabled={!hasLog}
              testID={`month-day-row-${key}`}
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
  calendarCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: '600',
  },
  sunday: { color: '#C77F6E' },
  saturday: { color: '#5F84A0' },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellCircle: {
    position: 'absolute',
  },
  cellText: {
    fontSize: 12,
    color: palette.text,
    fontWeight: '600',
    zIndex: 1,
  },
  cellTextDim: {
    color: palette.textMuted,
    opacity: 0.5,
  },
  cellTextToday: {
    color: palette.sageDeep,
    fontWeight: '800',
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
  summaryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: palette.textMuted,
  },
  summaryHint: {
    marginTop: 6,
    fontSize: 11,
    color: palette.textMuted,
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
