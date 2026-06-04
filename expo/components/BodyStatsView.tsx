import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import type { BodyFatEntry, WeightEntry } from '@/types/nutrition';

const CHART_HEIGHT = 150;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 24;
const CHART_PAD_X = 14;

type Point = { t: number; value: number };

/** 日付昇順・1日1点 (同日複数は最新=配列先頭を採用) に正規化 */
function toSeries(entries: { date: string; createdAt: string; value: number }[]): Point[] {
  const byDate = new Map<string, { t: number; value: number }>();
  // entries は新しい順で渡ってくる前提。先に来た (新しい) ものを優先して同日を1点に。
  for (const e of entries) {
    if (byDate.has(e.date)) continue;
    const t = new Date(e.date).getTime();
    if (!Number.isFinite(t)) continue;
    byDate.set(e.date, { t, value: e.value });
  }
  return Array.from(byDate.values()).sort((a, b) => a.t - b.t);
}

/** 直近 window 点の移動平均ライン (疎データでも破綻しない単純なトレーリング平均) */
function movingAverage(points: Point[], window: number): Point[] {
  return points.map((p, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = points.slice(from, i + 1);
    const avg = slice.reduce((acc, s) => acc + s.value, 0) / slice.length;
    return { t: p.t, value: avg };
  });
}

/** start→current→target の進捗率 (0..1)。増量/減量どちらでも機能 */
function computeProgress(start: number, current: number, target: number): number | null {
  if (target === start) return null;
  const raw = (current - start) / (target - start);
  return Math.max(0, Math.min(1, raw));
}

interface ProgressCardProps {
  title: string;
  unit: string;
  start: number | null;
  current: number | null;
  target: number | null;
  fractionDigits: number;
}

function ProgressCard({ title, unit, start, current, target, fractionDigits }: ProgressCardProps) {
  const fmt = (v: number) => v.toFixed(fractionDigits);
  const hasGoal = start != null && current != null && target != null;
  const progress = hasGoal ? computeProgress(start!, current!, target!) : null;
  const remaining = current != null && target != null ? current - target : null;

  return (
    <View style={styles.card} testID={`body-progress-${title}`}>
      <Text style={styles.cardTitle}>{title}</Text>

      {current != null ? (
        <Text style={styles.cardCurrent}>
          {fmt(current)}
          <Text style={styles.cardUnit}> {unit}</Text>
        </Text>
      ) : (
        <Text style={styles.cardEmpty}>記録なし</Text>
      )}

      {hasGoal ? (
        <>
          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneText}>開始 {fmt(start!)}</Text>
            <Text style={styles.milestoneText}>目標 {fmt(target!)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((progress ?? 0) * 100)}%` },
              ]}
            />
          </View>
          {remaining != null ? (
            <Text style={styles.cardMeta}>
              {Math.abs(remaining) < Math.pow(10, -fractionDigits) / 2
                ? '目標に到達'
                : `目標まであと ${Math.abs(remaining).toFixed(fractionDigits)} ${unit}`}
              {progress != null ? ` ・ 到達 ${Math.round(progress * 100)}%` : ''}
            </Text>
          ) : null}
        </>
      ) : current != null ? (
        <Text style={styles.cardMeta}>目標が未設定です</Text>
      ) : null}
    </View>
  );
}

interface TrendChartProps {
  width: number;
  points: Point[];
  /** メインライン (体重は移動平均)。null なら生値のみ */
  line?: Point[];
  target: number | null;
  color: string;
  /** 生値ドットの表示 */
  showRawDots: boolean;
}

function TrendChart({ width, points, line, target, color, showRawDots }: TrendChartProps) {
  if (points.length === 0) {
    return (
      <View style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}>
        <Text style={styles.chartEmpty}>記録が増えると推移が表示されます</Text>
      </View>
    );
  }

  const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const innerW = width - CHART_PAD_X * 2;

  const values = [
    ...points.map((p) => p.value),
    ...(line?.map((p) => p.value) ?? []),
    ...(target != null ? [target] : []),
  ];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const xOf = (t: number) =>
    CHART_PAD_X + (tMax === tMin ? innerW / 2 : ((t - tMin) / (tMax - tMin)) * innerW);
  const yOf = (v: number) => CHART_PAD_TOP + (1 - (v - min) / (max - min)) * innerH;

  const linePts = (line ?? points).map((p) => `${xOf(p.t)},${yOf(p.value)}`).join(' ');
  const targetY = target != null ? yOf(target) : null;

  return (
    <View style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}>
      <Svg width={width} height={CHART_HEIGHT}>
        {targetY != null ? (
          <>
            <Line
              x1={CHART_PAD_X}
              x2={width - CHART_PAD_X}
              y1={targetY}
              y2={targetY}
              stroke={palette.textMuted}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <SvgText
              x={width - CHART_PAD_X}
              y={Math.max(CHART_PAD_TOP - 4, targetY - 5)}
              fontSize={9}
              fill={palette.textMuted}
              textAnchor="end"
            >
              目標
            </SvgText>
          </>
        ) : null}

        {points.length >= 2 ? (
          <Polyline
            points={linePts}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {showRawDots
          ? points.map((p) => (
              <Circle key={p.t} cx={xOf(p.t)} cy={yOf(p.value)} r={2} fill={color} opacity={0.35} />
            ))
          : points.map((p) => (
              <Circle key={p.t} cx={xOf(p.t)} cy={yOf(p.value)} r={2.5} fill={color} />
            ))}
      </Svg>
    </View>
  );
}

export function BodyStatsView() {
  const { weights, bodyFatEntries, profile } = useAppState();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;

  const weightSeries = useMemo(
    () =>
      toSeries(
        (weights as WeightEntry[]).map((w) => ({
          date: w.date,
          createdAt: w.createdAt,
          value: w.weightKg,
        }))
      ),
    [weights]
  );
  const weightMA = useMemo(() => movingAverage(weightSeries, 7), [weightSeries]);

  const bodyFatSeries = useMemo(
    () =>
      toSeries(
        (bodyFatEntries as BodyFatEntry[]).map((b) => ({
          date: b.date,
          createdAt: b.createdAt,
          value: b.bodyFatPct,
        }))
      ),
    [bodyFatEntries]
  );

  const weightStart = weightSeries.length > 0 ? weightSeries[0].value : null;
  const weightCurrent =
    profile.currentWeightKg ??
    (weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].value : null);

  const bfStart = bodyFatSeries.length > 0 ? bodyFatSeries[0].value : null;
  const bfCurrent =
    profile.currentBodyFatPct ??
    (bodyFatSeries.length > 0 ? bodyFatSeries[bodyFatSeries.length - 1].value : null);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.group}>
        <ProgressCard
          title="体重"
          unit="kg"
          start={weightStart}
          current={weightCurrent}
          target={profile.targetWeightKg}
          fractionDigits={1}
        />
        <TrendChart
          width={chartWidth}
          points={weightSeries}
          line={weightMA}
          target={profile.targetWeightKg}
          color={palette.sageStrong}
          showRawDots
        />
        {weightSeries.length > 0 ? (
          <Text style={styles.caption}>実線は7日移動平均・点は記録値</Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <ProgressCard
          title="体脂肪率"
          unit="%"
          start={bfStart}
          current={bfCurrent}
          target={profile.targetBodyFatPct ?? null}
          fractionDigits={1}
        />
        <TrendChart
          width={chartWidth}
          points={bodyFatSeries}
          target={profile.targetBodyFatPct ?? null}
          color={palette.accent}
          showRawDots={false}
        />
        {bodyFatSeries.length > 0 ? (
          <Text style={styles.caption}>点は測定値・線は記録のある日をつないだもの</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 60 },
  group: { gap: 8 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  cardCurrent: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textMuted,
  },
  cardEmpty: {
    fontSize: 16,
    color: palette.textMuted,
    fontWeight: '600',
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  milestoneText: {
    fontSize: 11,
    color: palette.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.card,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.sageStrong,
  },
  cardMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 2,
  },
  chartWrap: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmpty: {
    fontSize: 12,
    color: palette.textMuted,
  },
  caption: {
    fontSize: 11,
    color: palette.textMuted,
    paddingHorizontal: 4,
  },
});
