import { useRouter } from 'expo-router';
import { IconButton, useTheme } from '@/design-system';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { Theme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { radius } from '@/design-system/tokens/primitives/radius';
import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { MiniProgressBar } from '@/components/nutrition-ui';
import { useAppState } from '@/providers/app-state-provider';
import { adjustedTargetKcal, getTdeeExerciseKcalForDate } from '@/utils/goals';
import { formatDateKey } from '@/utils/nutrition';
import {
  addDays,
  formatShortDay,
  formatWeekRangeLabel,
  getDailyMacros,
  getHistoryStartDate,
  getWeekRange,
  startOfDay,
} from '@/utils/history';

// プロット領域(バー・ラベル)の高さは従来通り固定し、その下に純粋な余白(CHART_BOTTOM_GAP)を足す。
// (コンテナに paddingBottom だけ足すと border-box 下で Svg 自体が押し縮められてしまうため、
//  高さの数値自体を増やして描画エリアと余白を明確に分離する。)
const CHART_CONTENT_HEIGHT = 170;
const CHART_BOTTOM_GAP = 12;
const CHART_HEIGHT = CHART_CONTENT_HEIGHT + CHART_BOTTOM_GAP;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 38;

export function WeeklyStatsView() {
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
  const range = useMemo(() => getWeekRange(anchor), [anchor]);
  const dailyMap = useMemo(() => getDailyMacros(logs, range), [logs, range]);
  const dailyEntries = useMemo(() => Array.from(dailyMap.entries()), [dailyMap]);

  // 進行中の当日は目標に対してまだ食べきっていないだけで不足に見えるため、
  // サマリー系の平均（kcal・PFCバー・リング）はすべて「完了した日」を優先して集計する。
  // 完了した日が1日もなければ（例: 週の初日）当日込みの記録日にフォールバック。
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const summaryKeys = useMemo(() => {
    const completed = dailyEntries.filter(([k, m]) => k !== todayKey && m.kcal > 0).map(([k]) => k);
    if (completed.length > 0) return completed;
    return dailyEntries.filter(([, m]) => m.kcal > 0).map(([k]) => k);
  }, [dailyEntries, todayKey]);

  const avgMacro = useMemo(() => {
    if (summaryKeys.length === 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    const sum = summaryKeys.reduce(
      (acc, k) => {
        const m = dailyMap.get(k);
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
  }, [summaryKeys, dailyMap]);

  const dailyExerciseMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key] of dailyEntries) {
      const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
      map.set(key, getTdeeExerciseKcalForDate(exerciseLogs, key, rawActiveKcal));
    }
    return map;
  }, [dailyEntries, exerciseLogs, dailyActivities]);

  const dailyAdjustedTargetMap = useMemo(() => {
    const map = new Map<string, number>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const [key] of dailyEntries) {
      const rawActiveKcal = (dailyActivities ?? []).find((d) => d.date === key)?.activeKcal ?? 0;
      map.set(key, base > 0 ? adjustedTargetKcal(base, exerciseLogs, key, { rawActiveKcal }) : 0);
    }
    return map;
  }, [dailyEntries, exerciseLogs, profile.targetCalories, dailyActivities]);

  const avgAdjustedTarget = useMemo(() => {
    if (summaryKeys.length === 0) return profile.targetCalories;
    const sum = summaryKeys.reduce((acc, k) => acc + (dailyAdjustedTargetMap.get(k) ?? 0), 0);
    return Math.round(sum / summaryKeys.length);
  }, [summaryKeys, dailyAdjustedTargetMap, profile.targetCalories]);

  const avgExerciseKcal = useMemo(() => {
    if (summaryKeys.length === 0) return 0;
    const sum = summaryKeys.reduce((acc, k) => acc + (dailyExerciseMap.get(k) ?? 0), 0);
    return Math.round(sum / summaryKeys.length);
  }, [summaryKeys, dailyExerciseMap]);

  // 日ごとのPFC目標: kcal目標と同じ比率（運動による拡大）でP/F/Cも拡大する（ホーム画面と同じロジック）
  const dailyEffectivePfcMap = useMemo(() => {
    const map = new Map<string, { protein: number; fat: number; carbs: number }>();
    const base = profile.targetCalories > 0 ? profile.targetCalories : 0;
    for (const [key] of dailyEntries) {
      const ratio = base > 0 ? (dailyAdjustedTargetMap.get(key) ?? 0) / base : 1;
      map.set(key, {
        protein: profile.targetProtein * ratio,
        fat: profile.targetFat * ratio,
        carbs: profile.targetCarbs * ratio,
      });
    }
    return map;
  }, [dailyEntries, dailyAdjustedTargetMap, profile.targetCalories, profile.targetProtein, profile.targetFat, profile.targetCarbs]);

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
  // avgMacro/avgAdjustedTarget が既に「完了した日優先」で集計されているため、そのまま使う。
  const ringAvg = useMemo(
    () => (targetKcal > 0 ? { avgKcal: avgMacro.kcal, avgTarget: targetKcal } : null),
    [targetKcal, avgMacro]
  );
  const dayTargets = useMemo(
    () => dailyEntries.map(([key]) => dailyAdjustedTargetMap.get(key) ?? 0),
    [dailyEntries, dailyAdjustedTargetMap]
  );
  const hasTarget = useMemo(() => dayTargets.some((v) => v > 0), [dayTargets]);
  const maxKcal = useMemo(() => {
    const max = Math.max(targetKcal, ...dayTargets, ...Array.from(dailyMap.values()).map((m) => m.kcal));
    return max > 0 ? max * 1.1 : 2000;
  }, [dailyMap, targetKcal, dayTargets]);

  const chartWidth = screenWidth - 32;
  const barCount = 7;
  const chartHorizontalPadding = 14;
  const barAreaWidth = chartWidth - chartHorizontalPadding * 2;
  const slotWidth = barAreaWidth / barCount;
  const barWidth = slotWidth * 0.55;
  const chartInnerHeight = CHART_CONTENT_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

  const targetPoints = useMemo(
    () =>
      dayTargets.map((target, i) => {
        const centerX = chartHorizontalPadding + i * slotWidth + slotWidth / 2;
        const y = CHART_PADDING_TOP + chartInnerHeight * (1 - target / maxKcal);
        return { x: centerX, y };
      }),
    [dayTargets, chartHorizontalPadding, slotWidth, chartInnerHeight, maxKcal]
  );

  // MonthlyStatsView と同じ3段階ルール（不足は色でなくバー高さ vs 目標線の差で表現する）
  const barColor = useCallback(
    (kcal: number, dayTarget: number) => {
      if (kcal <= 0) return t.colors.nutrition.calorie.track;
      if (dayTarget <= 0) return t.colors.nutrition.calorie.within.graphic;
      const ratio = kcal / dayTarget;
      if (ratio <= 1.1) return t.colors.nutrition.calorie.within.graphic;
      if (ratio <= 1.3) return t.colors.nutrition.calorie.mildExceed.graphic;
      return t.colors.nutrition.calorie.severeExceed.graphic;
    },
    [t]
  );

  const onTapDay = useCallback(
    (dateKey: string) => {
      router.push({ pathname: '/', params: { date: dateKey } });
    },
    [router]
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow} testID="week-header">
        <IconButton
          icon="chevronLeft"
          size="md"
          variant="ghost"
          tone="action"
          onPress={goPrev}
          disabled={!canGoPrev}
          testID="week-prev"
          accessibilityLabel="前の週へ"
        />
        <Text style={styles.headerLabel}>{formatWeekRangeLabel(range)}</Text>
        <IconButton
          icon="chevronRight"
          size="md"
          variant="ghost"
          tone="action"
          onPress={goNext}
          disabled={!canGoNext}
          testID="week-next"
          accessibilityLabel="次の週へ"
        />
      </View>

      {/* チャート: 背景なし */}
      <Svg width={chartWidth} height={CHART_HEIGHT}>
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
                rx={radius.xs}
                fill={barColor(macro.kcal, dayTargets[i])}
                opacity={macro.kcal > 0 ? 0.55 : 1}
              />
              <SvgText
                x={centerX}
                y={CHART_CONTENT_HEIGHT - 14}
                fontSize={fs.xs}
                fill={t.colors.content.secondary}
                textAnchor="middle"
              >
                {dow}
              </SvgText>
              <SvgText
                x={centerX}
                y={CHART_CONTENT_HEIGHT - 3}
                fontSize={fs.xs}
                fontWeight="600"
                fill={t.colors.content.primary}
                textAnchor="middle"
              >
                {date.getDate()}
              </SvgText>
            </React.Fragment>
          );
        })}
        {hasTarget ? (
          <React.Fragment>
            <Polyline
              points={targetPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={t.colors.content.secondary}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            {targetPoints.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={t.colors.content.secondary} />
            ))}
          </React.Fragment>
        ) : null}
      </Svg>

      {/* 週平均サマリー: 独立カード */}
      <View style={[styles.summaryCard, { width: chartWidth }]} testID="week-summary">
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryTitle}>週平均</Text>
            <Text style={styles.summaryKcal}>
              {Math.round(avgMacro.kcal).toLocaleString()}
              <Text style={styles.summaryKcalTarget}> / {Math.round(targetKcal).toLocaleString()} kcal</Text>
            </Text>
            {avgExerciseKcal > 0 ? (
              <Text style={styles.summaryConsume}>平均消費 {avgExerciseKcal} kcal / 日</Text>
            ) : null}
          </View>
          {ringAvg ? (
            <CalorieOverflowRing
              consumedKcal={ringAvg.avgKcal}
              targetKcal={ringAvg.avgTarget}
              size={56}
              strokeWidth={7}
              centerMode="remaining"
              showCenterLabel={false}
              showStatusText={false}
              animate={false}
              testID="week-ratio-ring"
            />
          ) : null}
        </View>

        <View style={styles.pfcDivider} />

        <View style={styles.pfcRow} testID="week-pfc-row">
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

      {/* 日別リスト: 個別カードを廃止し、グループ化フラットリストに */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>日別の記録</Text>
        <View style={[styles.listGroup, { width: chartWidth }]}>
          {dailyEntries.map(([key, macro], idx) => {
            const date = new Date(key);
            const hasLog = macro.kcal > 0;
            const exerciseKcal = dailyExerciseMap.get(key) ?? 0;
            return (
              <Pressable
                key={key}
                style={[styles.dayRow, idx > 0 && styles.dayRowBorder]}
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
  summaryCard: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.xl,
    padding: 16,
    alignSelf: 'center',
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
    color: t.colors.action.text.default,
  },
  summaryKcalTarget: {
    fontSize: fs.md,
    fontWeight: '600',
    color: t.colors.content.secondary,
  },
  pfcDivider: {
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
    alignSelf: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
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
    color: t.colors.action.text.default,
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
