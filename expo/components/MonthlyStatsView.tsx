import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { IconButton, useTheme, type Theme } from '@/design-system';
import { colors } from '@/design-system/tokens/primitives/colors';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { MiniProgressBar } from '@/components/nutrition-ui';
import { useAppState } from '@/providers/app-state-provider';
import { adjustedTargetKcal, getTdeeExerciseKcalForDate } from '@/utils/goals';
import { formatDateKey } from '@/utils/nutrition';
import {
  addDays,
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
  const { logs, profile, settings, exerciseLogs, dailyActivities } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
  // 今日以前の日付のみ、新しい順で表示
  const monthDailyEntries = useMemo(
    () =>
      Array.from(monthDailyMap.entries())
        .filter(([key]) => new Date(key) <= today)
        .reverse(),
    [monthDailyMap, today]
  );

  // 進行中の当日は目標に対してまだ食べきっていないだけで不足に見えるため、
  // サマリー系の平均（kcal・PFCバー・リング）はすべて「完了した日」を優先して集計する。
  // 完了した日が1日もなければ（例: 月の初日）当日込みの記録日にフォールバック。
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const summaryKeys = useMemo(() => {
    const completed = Array.from(monthDailyMap.entries())
      .filter(([k, m]) => k !== todayKey && m.kcal > 0)
      .map(([k]) => k);
    if (completed.length > 0) return completed;
    return Array.from(monthDailyMap.entries()).filter(([, m]) => m.kcal > 0).map(([k]) => k);
  }, [monthDailyMap, todayKey]);

  const avgMacro = useMemo(() => {
    if (summaryKeys.length === 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    const sum = summaryKeys.reduce(
      (acc, k) => {
        const m = monthDailyMap.get(k);
        return m
          ? { kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, fat: acc.fat + m.fat, carbs: acc.carbs + m.carbs }
          : acc;
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    );
    return {
      kcal: sum.kcal / summaryKeys.length,
      protein: sum.protein / summaryKeys.length,
      fat: sum.fat / summaryKeys.length,
      carbs: sum.carbs / summaryKeys.length,
    };
  }, [summaryKeys, monthDailyMap]);

  const monthExerciseMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of monthDailyMap.keys()) {
      const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
      map.set(key, getTdeeExerciseKcalForDate(exerciseLogs, key, rawActiveKcal));
    }
    return map;
  }, [monthDailyMap, exerciseLogs, dailyActivities]);

  const monthAdjustedTargetMap = useMemo(() => {
    const map = new Map<string, number>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const key of monthDailyMap.keys()) {
      const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
      map.set(key, base > 0 ? adjustedTargetKcal(base, exerciseLogs, key, { rawActiveKcal }) : 0);
    }
    return map;
  }, [monthDailyMap, exerciseLogs, profile.targetCalories, dailyActivities]);

  const avgExerciseKcal = useMemo(() => {
    if (summaryKeys.length === 0) return 0;
    const sum = summaryKeys.reduce((acc, k) => acc + (monthExerciseMap.get(k) ?? 0), 0);
    return Math.round(sum / summaryKeys.length);
  }, [summaryKeys, monthExerciseMap]);

  const avgAdjustedTarget = useMemo(() => {
    if (summaryKeys.length === 0) return profile.targetCalories;
    const sum = summaryKeys.reduce((acc, k) => acc + (monthAdjustedTargetMap.get(k) ?? 0), 0);
    return Math.round(sum / summaryKeys.length);
  }, [summaryKeys, monthAdjustedTargetMap, profile.targetCalories]);

  // avgMacro/avgAdjustedTarget が既に「完了した日優先」で集計されているため、そのまま使う。
  const monthRingAvg = useMemo(
    () => (avgAdjustedTarget > 0 ? { avgKcal: avgMacro.kcal, avgTarget: avgAdjustedTarget } : null),
    [avgAdjustedTarget, avgMacro]
  );

  // 日ごとのPFC目標: kcal目標と同じ比率（運動による拡大）でP/F/Cも拡大する（ホーム画面と同じロジック）
  const dailyEffectivePfcMap = useMemo(() => {
    const map = new Map<string, { protein: number; fat: number; carbs: number }>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const key of monthDailyMap.keys()) {
      const ratio = base > 0 ? (monthAdjustedTargetMap.get(key) ?? 0) / base : 1;
      map.set(key, {
        protein: profile.targetProtein * ratio,
        fat: profile.targetFat * ratio,
        carbs: profile.targetCarbs * ratio,
      });
    }
    return map;
  }, [monthDailyMap, monthAdjustedTargetMap, profile.targetCalories, profile.targetProtein, profile.targetFat, profile.targetCarbs]);

  const avgPfcTarget = useMemo(() => {
    if (summaryKeys.length === 0) {
      return { protein: profile.targetProtein, fat: profile.targetFat, carbs: profile.targetCarbs };
    }
    const sum = summaryKeys.reduce(
      (acc, k) => {
        const v = dailyEffectivePfcMap.get(k);
        return v ? { protein: acc.protein + v.protein, fat: acc.fat + v.fat, carbs: acc.carbs + v.carbs } : acc;
      },
      { protein: 0, fat: 0, carbs: 0 }
    );
    return {
      protein: sum.protein / summaryKeys.length,
      fat: sum.fat / summaryKeys.length,
      carbs: sum.carbs / summaryKeys.length,
    };
  }, [summaryKeys, dailyEffectivePfcMap, profile.targetProtein, profile.targetFat, profile.targetCarbs]);

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
        <IconButton
          icon="chevronLeft"
          size="md"
          variant="ghost"
          tone="action"
          onPress={goPrev}
          disabled={!canGoPrev}
          testID="month-prev"
          accessibilityLabel="前の月へ"
        />
        <Text style={styles.headerLabel}>{formatMonthLabel(anchor)}</Text>
        <IconButton
          icon="chevronRight"
          size="md"
          variant="ghost"
          tone="action"
          onPress={goNext}
          disabled={!canGoNext}
          testID="month-next"
          accessibilityLabel="次の月へ"
        />
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
              if (dayTarget === 0) return t.colors.nutrition.calorie.within.graphic;
              const overall = kcal / dayTarget;
              // 〜110%: 予算内 (moss)、110〜130%: 軽度超過 (amber)、130%超: 大幅超過 (clay)
              // 不足はサイズで表現し、色はカロリー予算カラーに統一する。
              if (overall <= 1.1) return t.colors.nutrition.calorie.within.graphic;
              if (overall <= 1.3) return t.colors.nutrition.calorie.mildExceed.graphic;
              return t.colors.nutrition.calorie.severeExceed.graphic;
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
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryTitle}>{formatMonthLabel(anchor)} の平均</Text>
            <Text style={styles.summaryKcal}>
              {Math.round(avgMacro.kcal).toLocaleString()}
              <Text style={styles.summaryKcalTarget}> / {Math.round(avgAdjustedTarget).toLocaleString()} kcal</Text>
            </Text>
            {avgExerciseKcal > 0 ? (
              <Text style={styles.summaryConsume}>平均消費 {avgExerciseKcal} kcal / 日</Text>
            ) : null}
          </View>
          {monthRingAvg ? (
            <CalorieOverflowRing
              consumedKcal={monthRingAvg.avgKcal}
              targetKcal={monthRingAvg.avgTarget}
              size={56}
              strokeWidth={7}
              centerMode="remaining"
              showCenterLabel={false}
              showStatusText={false}
              animate={false}
              testID="month-ratio-ring"
            />
          ) : null}
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.pfcRow} testID="month-pfc-row">
          <MiniProgressBar
            letter="P"
            label="タンパク質"
            current={avgMacro.protein}
            target={avgPfcTarget.protein}
            textColor={t.colors.nutrition.protein.text}
            graphicColor={t.colors.nutrition.protein.graphic}
            trackColor={t.colors.nutrition.protein.background}
          />
          <MiniProgressBar
            letter="F"
            label="脂肪"
            current={avgMacro.fat}
            target={avgPfcTarget.fat}
            textColor={t.colors.nutrition.fat.text}
            graphicColor={t.colors.nutrition.fat.graphic}
            trackColor={t.colors.nutrition.fat.background}
          />
          <MiniProgressBar
            letter="C"
            label="炭水化物"
            current={avgMacro.carbs}
            target={avgPfcTarget.carbs}
            textColor={t.colors.nutrition.carbs.text}
            graphicColor={t.colors.nutrition.carbs.graphic}
            trackColor={t.colors.nutrition.carbs.background}
          />
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>日別の記録</Text>
        <View style={styles.listGroup}>
          {monthDailyEntries.map(([key, macro], idx) => {
            const date = new Date(key);
            const hasLog = macro.kcal > 0;
            const exerciseKcal = monthExerciseMap.get(key) ?? 0;
            return (
              <Pressable
                key={key}
                style={[styles.dayRow, idx > 0 && styles.dayRowBorder]}
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
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerLabel: {
    fontSize: fs.md,
    fontWeight: '700',
    color: t.colors.content.primary,
  },
  calendarCard: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.xl,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: fs.xs,
    color: t.colors.content.secondary,
    fontWeight: '600',
  },
  sunday: { color: colors.clay[300] },
  saturday: { color: colors.fog[400] },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // カレンダーグリッド内の日付数字 = 密度の高い添え字なので xs
  cellText: {
    fontSize: fs.xs,
    color: t.colors.content.primary,
    fontWeight: '600',
    zIndex: 1,
  },
  cellTextDim: {
    color: t.colors.content.secondary,
    opacity: 0.5,
  },
  cellTextToday: {
    color: t.colors.action.primary.default,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.xl,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLeft: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: fs.sm,
    color: t.colors.content.secondary,
    fontWeight: '600',
  },
  summaryKcal: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    color: t.colors.action.primary.default,
  },
  summaryKcalTarget: {
    fontSize: fs.md,
    fontWeight: '600',
    color: t.colors.content.secondary,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.border.default,
    marginVertical: 16,
  },
  pfcRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryConsume: {
    marginTop: 2,
    fontSize: fs.sm,
    color: t.colors.content.secondary,
    fontWeight: '600',
  },
  listSection: {
    gap: 8,
  },
  listTitle: {
    fontSize: fs.md,
    fontWeight: '700',
    color: t.colors.content.primary,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  listGroup: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dayRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border.default,
  },
  dayRowLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dayLabel: {
    fontSize: fs.md,
    fontWeight: '700',
    color: t.colors.content.primary,
  },
  dayNoLog: {
    fontSize: fs.xs,
    color: t.colors.content.secondary,
  },
  dayRowRight: {
    alignItems: 'flex-end',
  },
  dayKcal: {
    fontSize: fs.md,
    fontWeight: '700',
    color: t.colors.action.primary.default,
  },
  dayMacroLine: {
    fontSize: fs.xs,
    color: t.colors.content.secondary,
    marginTop: 2,
  },
  dayDash: {
    fontSize: fs.md,
    color: t.colors.content.secondary,
  },
});
