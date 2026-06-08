import React, { useMemo, useState } from 'react';
import {
  type GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

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

/** タイムスタンプ → "M/D" 表記 */
function fmtMonthDay(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ProgressCardProps {
  title: string;
  unit: string;
  current: number | null;
  target: number | null;
  fractionDigits: number;
}

// v1.7 (PRD §6.4.4): 「出発点→現在→目標」の3点進捗バーは撤去。現在値＋目標(=固定アンカー)
// への残量テキストのみ。推移は下の TrendChart + 目標ラインで表現する。
function ProgressCard({ title, unit, current, target, fractionDigits }: ProgressCardProps) {
  const fmt = (v: number) => v.toFixed(fractionDigits);
  const hasGoal = current != null && target != null;
  const remaining = hasGoal ? current! - target! : null;

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
        <Text style={styles.cardMeta}>
          {Math.abs(remaining!) < Math.pow(10, -fractionDigits) / 2
            ? `目標 ${fmt(target!)} ${unit} に到達`
            : `目標 ${fmt(target!)} ${unit}（あと ${Math.abs(remaining!).toFixed(fractionDigits)} ${unit}）`}
        </Text>
      ) : current != null ? (
        <Text style={styles.cardMeta}>目標が未設定です</Text>
      ) : null}
    </View>
  );
}

interface TrendChartProps {
  width: number;
  points: Point[];
  target: number | null;
  color: string;
  /** 吹き出し・目盛りラベルの単位と小数桁 */
  unit: string;
  fractionDigits: number;
}

function TrendChart({ width, points, target, color, unit, fractionDigits }: TrendChartProps) {
  // タップ/ドラッグで選択中の記録値インデックス (null=未選択)
  const [selected, setSelected] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <View style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}>
        <Text style={styles.chartEmpty}>記録が増えると推移が表示されます</Text>
      </View>
    );
  }

  const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const innerW = width - CHART_PAD_X * 2;

  const dataMin = Math.min(...points.map((p) => p.value));
  const dataMax = Math.max(...points.map((p) => p.value));

  const values = [...points.map((p) => p.value), ...(target != null ? [target] : [])];
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

  const linePts = points.map((p) => `${xOf(p.t)},${yOf(p.value)}`).join(' ');
  const targetY = target != null ? yOf(target) : null;
  const fmt = (v: number) => v.toFixed(fractionDigits);

  // タッチ位置 (locationX) に最も近い記録値を選択
  const handleTouch = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(xOf(points[i].t) - lx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setSelected(best);
  };

  const sel = selected != null ? points[selected] : null;
  const lastPoint = points[points.length - 1];

  // 吹き出しのレイアウト (選択点の上に表示・左右端ははみ出さないようにクランプ)
  const BOX_W = 76;
  const BOX_H = 34;
  const boxX = sel ? Math.min(Math.max(xOf(sel.t) - BOX_W / 2, 2), width - BOX_W - 2) : 0;
  const selY = sel ? yOf(sel.value) : 0;
  const boxAbove = selY - BOX_H - 10 >= 0;
  const boxY = sel ? (boxAbove ? selY - BOX_H - 10 : selY + 10) : 0;

  return (
    <View
      style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
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

        {/* Y軸: データ範囲の最大/最小目盛り */}
        <SvgText
          x={CHART_PAD_X}
          y={yOf(dataMax) - 3}
          fontSize={9}
          fill={palette.textMuted}
          textAnchor="start"
        >
          {fmt(dataMax)}
        </SvgText>
        {dataMax !== dataMin ? (
          <SvgText
            x={CHART_PAD_X}
            y={yOf(dataMin) + 10}
            fontSize={9}
            fill={palette.textMuted}
            textAnchor="start"
          >
            {fmt(dataMin)}
          </SvgText>
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

        {points.map((p) => (
          <Circle key={p.t} cx={xOf(p.t)} cy={yOf(p.value)} r={2.5} fill={color} />
        ))}

        {/* X軸: 開始/終了日付 */}
        <SvgText
          x={CHART_PAD_X}
          y={CHART_HEIGHT - 8}
          fontSize={9}
          fill={palette.textMuted}
          textAnchor="start"
        >
          {fmtMonthDay(tMin)}
        </SvgText>
        {tMax !== tMin ? (
          <SvgText
            x={width - CHART_PAD_X}
            y={CHART_HEIGHT - 8}
            fontSize={9}
            fill={palette.textMuted}
            textAnchor="end"
          >
            {fmtMonthDay(tMax)}
          </SvgText>
        ) : null}

        {/* 未選択時: 最新値を最終点に注記。目標ラインと近接する場合は「目標」ラベルと重なるため抑制 */}
        {!sel &&
        points.length >= 1 &&
        (targetY == null || Math.abs(yOf(lastPoint.value) - targetY) >= 14) ? (
          <SvgText
            x={Math.min(xOf(lastPoint.t) + 4, width - CHART_PAD_X)}
            y={Math.max(yOf(lastPoint.value) - 6, CHART_PAD_TOP)}
            fontSize={10}
            fontWeight="700"
            fill={color}
            textAnchor={xOf(lastPoint.t) > width - 48 ? 'end' : 'start'}
          >
            {fmt(lastPoint.value)}
          </SvgText>
        ) : null}

        {/* 選択時: 縦ガイド線 + 強調ドット + 吹き出し */}
        {sel ? (
          <>
            <Line
              x1={xOf(sel.t)}
              x2={xOf(sel.t)}
              y1={CHART_PAD_TOP}
              y2={CHART_HEIGHT - CHART_PAD_BOTTOM}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <Circle
              cx={xOf(sel.t)}
              cy={yOf(sel.value)}
              r={4}
              fill={color}
              stroke={palette.surface}
              strokeWidth={1.5}
            />
            <Rect
              x={boxX}
              y={boxY}
              width={BOX_W}
              height={BOX_H}
              rx={8}
              fill={palette.surface}
              stroke={palette.textMuted}
              strokeWidth={0.5}
              opacity={0.96}
            />
            <SvgText
              x={boxX + BOX_W / 2}
              y={boxY + 14}
              fontSize={10}
              fill={palette.textMuted}
              textAnchor="middle"
            >
              {fmtMonthDay(sel.t)}
            </SvgText>
            <SvgText
              x={boxX + BOX_W / 2}
              y={boxY + 28}
              fontSize={12}
              fontWeight="700"
              fill={color}
              textAnchor="middle"
            >
              {`${fmt(sel.value)} ${unit}`}
            </SvgText>
          </>
        ) : null}
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

  const weightCurrent =
    profile.currentWeightKg ??
    (weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].value : null);

  const bfCurrent =
    profile.currentBodyFatPct ??
    (bodyFatSeries.length > 0 ? bodyFatSeries[bodyFatSeries.length - 1].value : null);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.group}>
        <ProgressCard
          title="体重"
          unit="kg"
          current={weightCurrent}
          target={profile.targetWeightKg}
          fractionDigits={1}
        />
        <TrendChart
          width={chartWidth}
          points={weightSeries}
          target={profile.targetWeightKg}
          color={palette.sageStrong}
          unit="kg"
          fractionDigits={1}
        />
      </View>

      <View style={styles.group}>
        <ProgressCard
          title="体脂肪率"
          unit="%"
          current={bfCurrent}
          target={profile.targetBodyFatPct ?? null}
          fractionDigits={1}
        />
        <TrendChart
          width={chartWidth}
          points={bodyFatSeries}
          target={profile.targetBodyFatPct ?? null}
          color={palette.accent}
          unit="%"
          fractionDigits={1}
        />
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
});
