import React, { useMemo, useState } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { BottomSheet, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { useUnitSystem } from '@/hooks/useUnitSystem';
import { toDisplayWeight, weightSuffix } from '@/utils/units';
import type { BodyFatEntry, GoalDirection, WeightEntry } from '@/types/nutrition';
import { formatMonthLabel, formatShortDay, formatWeekRangeLabel } from '@/utils/history';

const CHART_HEIGHT = 158;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 32;
const CHART_PL = 10; // left padding
const CHART_PR = 38; // right padding — Y軸ラベル列
const DAY_MS = 86_400_000;

/**
 * 食事タブと同じ規則: タブ名 = 表示する期間。点の粒度は期間から自動で決まる別レイヤー。
 */
export type BodyPeriod = 'week' | 'month' | 'year';
type Grain = 'day' | 'week' | 'month';

const PERIOD_CONFIG: Record<BodyPeriod, { windowDays: number; grain: Grain }> = {
  week: { windowDays: 7, grain: 'day' },
  month: { windowDays: 31, grain: 'day' }, // 日次 (週平均ではなく各日の記録をそのまま)
  year: { windowDays: 366, grain: 'month' },
};

type Point = { t: number; value: number };

/** ローカル週初 (月曜) の 0:00 */
function startOfWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d.getTime();
}

/** ローカル月初の 0:00 */
function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/**
 * 期間の窓で絞り、粒度に応じてバケット平均を1点として返す。
 * day 粒度は日次系列をそのまま窓だけ適用。
 */
function aggregate(series: Point[], period: BodyPeriod, todayT: number): Point[] {
  const { windowDays, grain } = PERIOD_CONFIG[period];
  const filtered = series.filter((p) => p.t >= todayT - windowDays * DAY_MS);
  if (grain === 'day') return filtered;

  const keyOf = grain === 'week' ? startOfWeek : startOfMonth;
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const p of filtered) {
    const k = keyOf(p.t);
    const b = buckets.get(k) ?? { sum: 0, n: 0 };
    b.sum += p.value;
    b.n += 1;
    buckets.set(k, b);
  }
  return Array.from(buckets.entries())
    .map(([t, b]) => ({ t, value: b.sum / b.n }))
    .sort((a, b) => a.t - b.t);
}

/** 日付昇順・1日1点に正規化 */
function toSeries(entries: { date: string; createdAt: string; value: number }[]): Point[] {
  const byDate = new Map<string, { t: number; value: number }>();
  for (const e of entries) {
    if (byDate.has(e.date)) continue;
    const t = new Date(e.date).getTime();
    if (!Number.isFinite(t)) continue;
    byDate.set(e.date, { t, value: e.value });
  }
  return Array.from(byDate.values()).sort((a, b) => a.t - b.t);
}

function fmtMD(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekRangeOf(t: number): { start: Date; end: Date } {
  const start = new Date(t);
  const end = new Date(t);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/** Y軸のきりのいい目盛りを生成 (ステップは 1/2/5/10 × magnitude) */
function niceYTicks(lo: number, hi: number): number[] {
  const r = hi - lo;
  if (r < 0.001) return [lo];
  const rough = r / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= rough) ?? mag;
  const ticks: number[] = [];
  for (
    let v = Math.ceil(lo / step) * step;
    v <= hi + step * 1e-6;
    v = Math.round((v + step) * 1e10) / 1e10
  ) {
    ticks.push(v);
  }
  return ticks;
}

/** 整数の目盛りは小数点なしで表示 */
function fmtYTick(v: number, fractionDigits: number): string {
  return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(fractionDigits);
}

// ---- MetricCardHeader -------------------------------------------------------

interface MetricCardHeaderProps {
  title: string;
  unit: string;
  current: number | null;
  target: number | null;
  fractionDigits: number;
  color: string;
  direction: GoalDirection | null;
  onRecord?: () => void;
}

function MetricCardHeader({
  title,
  unit,
  current,
  target,
  fractionDigits,
  color,
  direction,
  onRecord,
}: MetricCardHeaderProps) {
  const t = useTheme();
  const tr = useT();
  const fmt = (v: number) => v.toFixed(fractionDigits);
  const hasGoal = current != null && target != null;
  const remaining = hasGoal ? current! - target! : null;
  const epsilon = Math.pow(10, -fractionDigits) / 2;

  const isReached =
    hasGoal &&
    (Math.abs(remaining!) < epsilon ||
      (direction === 'lose' && remaining! < 0) ||
      (direction === 'gain' && remaining! > 0));

  const remainingLabel =
    hasGoal && !isReached
      ? tr('bodyStats.remaining', { value: Math.abs(remaining!).toFixed(fractionDigits), unit })
      : null;

  return (
    <View style={styles.cardHeader} testID={`body-progress-${title}`}>
      <View>
        <Text style={[styles.cardTitle, { color: t.colors.content.secondary }]}>{title}</Text>
        {current != null ? (
          <Text style={[styles.cardCurrent, { color }]}>
            {fmt(current)}
            <Text style={[styles.cardUnit, { color: t.colors.content.secondary }]}> {unit}</Text>
          </Text>
        ) : (
          <Text style={[styles.cardEmpty, { color: t.colors.content.secondary }]}>{tr('bodyStats.noRecord')}</Text>
        )}
      </View>

      <View style={styles.cardHeaderRight}>
        {onRecord && (
          <Pressable
            onPress={onRecord}
            accessibilityRole="button"
            accessibilityLabel={tr('bodyStats.record')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.recordLink, { color: t.colors.action.text.default }]}>
              {tr('bodyStats.record')}
            </Text>
          </Pressable>
        )}
        {isReached ? (
          <View style={[styles.goalBadge, { backgroundColor: t.colors.status.success.container }]}>
            <Text style={[styles.goalBadgeText, { color: t.colors.status.success.onContainer }]}>
              {'✓ '}{tr('bodyStats.goalReached')}
            </Text>
          </View>
        ) : remainingLabel ? (
          <Text style={[styles.cardMeta, { color: t.colors.content.secondary }]}>{remainingLabel}</Text>
        ) : current != null ? (
          <Text style={[styles.cardMeta, { color: t.colors.content.secondary }]}>{tr('bodyStats.noGoal')}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ---- TrendChart -------------------------------------------------------------

interface TrendChartProps {
  width: number;
  points: Point[];
  target: number | null;
  color: string;
  unit: string;
  fractionDigits: number;
  grain: Grain;
  period: BodyPeriod;
  emptyMessage: string;
  title: string;
  locale?: 'ja' | 'en-US';
}

function TrendChart({
  width,
  points,
  target,
  color,
  unit,
  fractionDigits,
  grain,
  period,
  emptyMessage,
  title,
  locale,
}: TrendChartProps) {
  const t = useTheme();
  const tr = useT();
  const [selected, setSelected] = useState<number | null>(null);
  const [tipSize, setTipSize] = useState({ w: 0, h: 0 });

  if (points.length === 0) {
    return (
      <View
        style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}
        accessible
        accessibilityLabel={`${tr('bodyStats.chartA11yLabel', { title })}${locale === 'en-US' ? '. ' : '。'}${emptyMessage}`} // i18n-ignore: locale-conditional punctuation
      >
        <Text style={[styles.chartEmpty, { color: t.colors.content.secondary }]}>{emptyMessage}</Text>
      </View>
    );
  }

  const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const innerW = width - CHART_PL - CHART_PR;

  // Y range: data + target を常に含む
  const allValues = [...points.map((p) => p.value), ...(target != null ? [target] : [])];
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.15;
    min -= pad;
    max += pad;
  }
  const yTicks = niceYTicks(min, max);
  if (yTicks.length > 0) {
    min = Math.min(min, yTicks[0]);
    max = Math.max(max, yTicks[yTicks.length - 1]);
  }
  if (min >= max) { min -= 1; max += 1; }

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const xOf = (ts: number) =>
    CHART_PL + (tMax === tMin ? innerW / 2 : ((ts - tMin) / (tMax - tMin)) * innerW);
  const yOf = (v: number) => CHART_PAD_TOP + (1 - (v - min) / (max - min)) * innerH;

  const linePts = points.map((p) => `${xOf(p.t)},${yOf(p.value)}`).join(' ');
  const targetY = target != null ? yOf(target) : null;
  const fmt = (v: number) => v.toFixed(fractionDigits);

  const handleTouch = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(xOf(points[i].t) - lx);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setSelected(best);
  };

  const sel = selected != null ? points[selected] : null;
  const lastPoint = points[points.length - 1];

  const showDots = points.length <= 1 || innerW / (points.length - 1) >= 8;
  const dotRadius = points.length > 1 && innerW / (points.length - 1) < 12 ? 1.5 : 2.5;

  const labelFontSize = t.typography.fontSize.xs;
  const labelColor = t.colors.content.secondary;
  const gridColor = t.colors.border.subtle;
  const targetColor = t.colors.status.info.default;

  // X軸ラベル: 期間ごとに適切な文字列
  const fmtXLabel = (ts: number): string => {
    const d = new Date(ts);
    if (period === 'week') {
      const days =
        locale === 'en-US'
          ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          : ['日', '月', '火', '水', '木', '金', '土']; // i18n-ignore: locale-conditional day names
      return days[d.getDay()];
    }
    if (period === 'year') {
      return locale === 'en-US'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
        : `${d.getMonth() + 1}月`; // i18n-ignore: locale-conditional month label
    }
    // month (day grain): M/D 表記
    return fmtMD(ts);
  };

  // X軸に表示する点のインデックス
  const xLabelIndices: number[] = [];
  if (period === 'week' || period === 'year') {
    // 全点表示
    for (let i = 0; i < points.length; i++) xLabelIndices.push(i);
  } else {
    // month (day grain): 最初・7日ごと
    xLabelIndices.push(0);
    for (let i = 7; i < points.length; i += 7) xLabelIndices.push(i);
  }

  // ツールチップ日付整形 (既存のまま)
  const tooltipDate = (ts: number) =>
    grain === 'day'
      ? formatShortDay(new Date(ts), locale)
      : grain === 'week'
        ? formatWeekRangeLabel(weekRangeOf(ts))
        : formatMonthLabel(new Date(ts), locale);

  const TIP_GAP = 10;
  const pointX = sel ? xOf(sel.t) : 0;
  const pointY = sel ? yOf(sel.value) : 0;
  const tipLeft = Math.min(Math.max(pointX - tipSize.w / 2, 4), width - tipSize.w - 4);
  const tipAbove = pointY - tipSize.h - TIP_GAP >= 0;
  const tipTop = tipAbove ? pointY - tipSize.h - TIP_GAP : pointY + TIP_GAP;

  // a11y サマリー (既存のまま)
  const firstPoint = points[0];
  const deltaValue = lastPoint.value - firstPoint.value;
  const deltaText =
    points.length < 2
      ? '' // i18n-ignore: next line has locale-conditional punctuation
      : `${locale === 'en-US' ? ', ' : '、'}${
          Math.abs(deltaValue) < Math.pow(10, -fractionDigits) / 2
            ? tr('bodyStats.noChange')
            : tr(deltaValue > 0 ? 'bodyStats.deltaPlus' : 'bodyStats.deltaMinus', {
                value: fmt(Math.abs(deltaValue)),
                unit,
              })
        }`;
  const targetText =
    target != null
      ? tr('bodyStats.targetRemainingSuffix', {
          target: fmt(target),
          unit,
          remaining: fmt(Math.abs(lastPoint.value - target)),
        })
      : '';
  const chartSummary =
    points.length < 2
      ? tr('bodyStats.singlePointSummary', {
          date: fmtXLabel(firstPoint.t),
          value: fmt(firstPoint.value),
          unit,
          targetText,
        })
      : tr('bodyStats.rangeSummary', {
          fromDate: fmtXLabel(firstPoint.t),
          toDate: fmtXLabel(lastPoint.t),
          count: points.length,
          fromValue: fmt(firstPoint.value),
          toValue: fmt(lastPoint.value),
          unit,
          deltaText,
          targetText,
        });

  return (
    <View
      style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      accessible
      accessibilityRole="image"
      accessibilityLabel={tr('bodyStats.chartA11yLabel', { title })}
      accessibilityHint={chartSummary}
    >
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Y軸グリッドライン + 右側ラベル */}
        {yTicks.map((tick) => {
          const y = yOf(tick);
          if (y < CHART_PAD_TOP - 4 || y > CHART_HEIGHT - CHART_PAD_BOTTOM + 4) return null;
          const suppressLabel = targetY != null && Math.abs(y - targetY) < 10;
          return (
            <React.Fragment key={`ytick-${tick}`}>
              <Line
                x1={CHART_PL}
                x2={width - CHART_PR}
                y1={y}
                y2={y}
                stroke={gridColor}
                strokeWidth={0.5}
              />
              {!suppressLabel && (
                <SvgText
                  x={width - CHART_PR + 5}
                  y={y + 4}
                  fontSize={labelFontSize}
                  fill={labelColor}
                  textAnchor="start"
                >
                  {fmtYTick(tick, fractionDigits)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* 目標ライン: 破線 + 右軸に数値ラベル (目標色) */}
        {targetY != null ? (
          <>
            <Line
              x1={CHART_PL}
              x2={width - CHART_PR}
              y1={targetY}
              y2={targetY}
              stroke={targetColor}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <SvgText
              x={width - CHART_PR + 5}
              y={targetY + 4}
              fontSize={labelFontSize}
              fill={targetColor}
              textAnchor="start"
              fontWeight={t.typography.fontWeight.medium as string}
            >
              {fmt(target!)}
            </SvgText>
          </>
        ) : null}

        {/* データ折れ線 */}
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

        {/* ドット */}
        {showDots
          ? points.map((p) => (
              <Circle key={p.t} cx={xOf(p.t)} cy={yOf(p.value)} r={dotRadius} fill={color} />
            ))
          : null}

        {/* X軸ラベル (全点 or 間引き) */}
        {xLabelIndices.map((i) => {
          const p = points[i];
          const px = xOf(p.t);
          const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={px}
              y={CHART_HEIGHT - 16}
              fontSize={labelFontSize}
              fill={labelColor}
              textAnchor={anchor}
            >
              {fmtXLabel(p.t)}
            </SvgText>
          );
        })}

        {/* 選択時: 縦ガイド線 + 強調ドット */}
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
              opacity={0.5}
            />
            <Circle
              cx={xOf(sel.t)}
              cy={yOf(sel.value)}
              r={4}
              fill={color}
              stroke={t.colors.surface.default}
              strokeWidth={2}
            />
          </>
        ) : null}
      </Svg>

      {/* ツールチップ (SVG 外の実 View でオーバーレイ) */}
      {sel ? (
        <View
          pointerEvents="none"
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (Math.abs(w - tipSize.w) > 0.5 || Math.abs(h - tipSize.h) > 0.5) {
              setTipSize({ w, h });
            }
          }}
          style={{
            position: 'absolute',
            left: tipLeft,
            top: tipTop,
            opacity: tipSize.w > 0 ? 1 : 0,
            alignItems: 'center',
            paddingVertical: t.spacing['2'],
            paddingHorizontal: t.spacing['3'],
            borderRadius: t.radius.md,
            backgroundColor: t.colors.surface.default,
            borderWidth: 1,
            borderColor: t.colors.border.subtle,
            ...t.elevation.md,
          }}
        >
          <Text
            style={{
              fontSize: t.typography.fontSize.xs,
              lineHeight: t.typography.lineHeight.xs,
              color: t.colors.content.secondary,
              fontWeight: t.typography.fontWeight.medium as TextStyle['fontWeight'],
            }}
          >
            {tooltipDate(sel.t)}
          </Text>
          <Text
            style={{
              marginTop: 1,
              fontSize: t.typography.fontSize.sm,
              lineHeight: t.typography.lineHeight.sm,
              color,
              fontWeight: t.typography.fontWeight.bold as TextStyle['fontWeight'],
            }}
          >
            {`${fmt(sel.value)} ${unit}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---- 記録シート (インライン) -------------------------------------------------

function WeightRecordSheet({
  visible,
  onClose,
  value,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('status.weightSheet.title')}
      scrollable={false}
      primaryAction={{ label: t('common.save'), onPress: onSubmit }}
      testID="weight-sheet-stats"
    >
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface.sunken }]}>
        <TextInput
          style={[styles.inputField, { color: theme.colors.content.primary }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="56.4"
          placeholderTextColor={theme.colors.content.tertiary}
          autoFocus
          testID="weight-input-stats"
        />
        <Text style={[styles.inputSuffix, { color: theme.colors.content.tertiary }]}>kg</Text>
      </View>
    </BottomSheet>
  );
}

function BfRecordSheet({
  visible,
  onClose,
  value,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('status.bfSheet.title')}
      scrollable={false}
      primaryAction={{ label: t('common.save'), onPress: onSubmit }}
      testID="bf-sheet-stats"
    >
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface.sunken }]}>
        <TextInput
          style={[styles.inputField, { color: theme.colors.content.primary }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="18.5"
          placeholderTextColor={theme.colors.content.tertiary}
          autoFocus
          testID="bf-input-stats"
        />
        <Text style={[styles.inputSuffix, { color: theme.colors.content.tertiary }]}>%</Text>
      </View>
    </BottomSheet>
  );
}

// ---- BodyStatsView ----------------------------------------------------------

export function BodyStatsView({ period = 'month' }: { period?: BodyPeriod }) {
  const t = useTheme();
  const tr = useT();
  const { weights, bodyFatEntries, profile, settings, addWeightEntry, addBodyFatEntry } = useAppState();
  const { unitSystem } = useUnitSystem();
  const wUnit = weightSuffix(unitSystem);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;
  const grain = PERIOD_CONFIG[period].grain;
  const todayT = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // 記録シート状態
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [bfSheetVisible, setBfSheetVisible] = useState(false);
  const [bfInput, setBfInput] = useState('');

  const submitWeight = () => {
    const v = Number(weightInput);
    if (!Number.isFinite(v) || v <= 0) return;
    addWeightEntry(v);
    setWeightInput('');
    setWeightSheetVisible(false);
  };

  const submitBf = () => {
    const v = Number(bfInput);
    if (!Number.isFinite(v) || v <= 0 || v > 60) return;
    addBodyFatEntry(v);
    setBfInput('');
    setBfSheetVisible(false);
  };

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

  const weightPoints = useMemo(
    () => aggregate(weightSeries, period, todayT),
    [weightSeries, period, todayT]
  );
  const bodyFatPoints = useMemo(
    () => aggregate(bodyFatSeries, period, todayT),
    [bodyFatSeries, period, todayT]
  );

  const weightCurrentKg =
    profile.currentWeightKg ??
    (weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].value : null);
  const weightCurrent = weightCurrentKg != null ? toDisplayWeight(weightCurrentKg, unitSystem) : null;
  const weightTargetDisplay =
    profile.targetWeightKg != null ? toDisplayWeight(profile.targetWeightKg, unitSystem) : null;
  const weightPointsDisplay = useMemo(
    () => weightPoints.map((p) => ({ ...p, value: toDisplayWeight(p.value, unitSystem) })),
    [weightPoints, unitSystem]
  );

  const bfCurrent =
    profile.currentBodyFatPct ??
    (bodyFatSeries.length > 0 ? bodyFatSeries[bodyFatSeries.length - 1].value : null);

  const bfGoalDirection: GoalDirection | null =
    profile.goalDirection === 'recomp' ? 'lose' : profile.goalDirection ?? null;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 体重カード */}
        <View style={[styles.metricCard, { width: chartWidth, backgroundColor: t.colors.surface.raised }]}>
          <MetricCardHeader
            title={tr('bodyStats.weight')}
            unit={wUnit}
            current={weightCurrent}
            target={weightTargetDisplay}
            fractionDigits={1}
            color={t.colors.action.text.default}
            direction={profile.goalDirection ?? null}
            onRecord={() => setWeightSheetVisible(true)}
          />
          <View style={[styles.cardDivider, { backgroundColor: t.colors.border.default }]} />
          <TrendChart
            width={chartWidth}
            title={tr('bodyStats.weight')}
            points={weightPointsDisplay}
            target={weightTargetDisplay}
            color={t.colors.action.text.default}
            unit={wUnit}
            fractionDigits={1}
            grain={grain}
            period={period}
            locale={settings.uiLanguage}
            emptyMessage={
              weightSeries.length > 0 ? tr('bodyStats.emptyPeriod') : tr('bodyStats.emptyAll')
            }
          />
        </View>

        {/* 体脂肪率カード */}
        <View style={[styles.metricCard, { width: chartWidth, backgroundColor: t.colors.surface.raised }]}>
          <MetricCardHeader
            title={tr('bodyStats.bodyFat')}
            unit="%"
            current={bfCurrent}
            target={profile.targetBodyFatPct ?? null}
            fractionDigits={1}
            color={t.colors.accent.default}
            direction={bfGoalDirection}
            onRecord={() => setBfSheetVisible(true)}
          />
          <View style={[styles.cardDivider, { backgroundColor: t.colors.border.default }]} />
          <TrendChart
            width={chartWidth}
            title={tr('bodyStats.bodyFat')}
            points={bodyFatPoints}
            target={profile.targetBodyFatPct ?? null}
            color={t.colors.accent.default}
            unit="%"
            fractionDigits={1}
            grain={grain}
            period={period}
            locale={settings.uiLanguage}
            emptyMessage={
              bodyFatSeries.length > 0
                ? tr('bodyStats.emptyPeriod')
                : tr('bodyStats.emptyAll')
            }
          />
        </View>
      </ScrollView>

      <WeightRecordSheet
        visible={weightSheetVisible}
        onClose={() => { setWeightSheetVisible(false); setWeightInput(''); }}
        value={weightInput}
        onChange={setWeightInput}
        onSubmit={submitWeight}
      />
      <BfRecordSheet
        visible={bfSheetVisible}
        onClose={() => { setBfSheetVisible(false); setBfInput(''); }}
        value={bfInput}
        onChange={setBfInput}
        onSubmit={submitBf}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 60 },
  metricCard: {
    borderRadius: 20,
    overflow: 'visible',
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: fs.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardCurrent: {
    fontSize: fs['3xl'],
    fontWeight: '700',
  },
  cardUnit: {
    fontSize: fs.md,
    fontWeight: '600',
  },
  cardEmpty: {
    fontSize: fs.md,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: fs.sm,
  },
  recordLink: {
    fontSize: fs.sm,
    fontWeight: '500',
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  goalBadgeText: {
    fontSize: fs.xs,
    fontWeight: '500',
  },
  chartWrap: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmpty: {
    fontSize: fs.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputField: {
    flex: 1,
    fontSize: fs['3xl'],
    fontWeight: '700',
  },
  inputSuffix: {
    fontSize: fs.md,
    fontWeight: '700',
  },
});
