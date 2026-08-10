import React, { useMemo, useState } from 'react';
import {
  type GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import type { BodyFatEntry, WeightEntry } from '@/types/nutrition';
import { formatMonthLabel, formatShortDay, formatWeekRangeLabel } from '@/utils/history';

const CHART_HEIGHT = 158;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 32;
const CHART_PAD_X = 14;
const DAY_MS = 86_400_000;

/**
 * 食事タブと同じ規則: タブ名 = 表示する期間。点の粒度は期間から自動で決まる別レイヤー
 * (長期でも「帯」にしないため粗くする)。ユーザーには粒度を見せない。
 */
export type BodyPeriod = 'week' | 'month' | 'year';
type Grain = 'day' | 'week' | 'month';

const PERIOD_CONFIG: Record<BodyPeriod, { windowDays: number; grain: Grain }> = {
  week: { windowDays: 7, grain: 'day' }, // 直近1週間を日毎
  month: { windowDays: 31, grain: 'week' }, // 直近1ヶ月を週毎(平均)
  year: { windowDays: 366, grain: 'month' }, // 直近1年を月毎(平均)
};

type Point = { t: number; value: number };

/** ローカル週初 (月曜) の 0:00 */
function startOfWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const mondayOffset = (d.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  d.setDate(d.getDate() - mondayOffset);
  return d.getTime();
}

/** ローカル月初の 0:00 */
function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/**
 * 期間の窓で絞り、粒度に応じてバケット平均を1点として返す (x=バケット起点で等間隔)。
 * 日粒度は日次系列をそのまま窓だけ適用。
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

/** 軸端用のコンパクトな "M/D" (日・週粒度の端点)。点ごとの詳細表記は食事の formatter を流用。 */
function fmtMD(t: number): string {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 週バケット起点 → その週の DateRange (食事の formatWeekRangeLabel に渡す)。 */
function weekRangeOf(t: number): { start: Date; end: Date } {
  const start = new Date(t);
  const end = new Date(t);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

interface MetricCardHeaderProps {
  title: string;
  unit: string;
  current: number | null;
  target: number | null;
  fractionDigits: number;
  color: string;
}

function MetricCardHeader({ title, unit, current, target, fractionDigits, color }: MetricCardHeaderProps) {
  const t = useTheme();
  const fmt = (v: number) => v.toFixed(fractionDigits);
  const hasGoal = current != null && target != null;
  const remaining = hasGoal ? current! - target! : null;

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
          <Text style={[styles.cardEmpty, { color: t.colors.content.secondary }]}>記録なし</Text>
        )}
      </View>
      {hasGoal ? (
        <Text style={[styles.cardMeta, { color: t.colors.content.secondary }]}>
          {Math.abs(remaining!) < Math.pow(10, -fractionDigits) / 2
            ? `目標に到達`
            : `あと ${Math.abs(remaining!).toFixed(fractionDigits)} ${unit}`}
        </Text>
      ) : current != null ? (
        <Text style={[styles.cardMeta, { color: t.colors.content.secondary }]}>目標未設定</Text>
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
  /** 点の粒度 (ラベル整形に使用。期間から自動決定) */
  grain: Grain;
  /** 点が無いときの文言 (履歴あり=期間外 / 履歴なし で出し分け) */
  emptyMessage: string;
  /** 指標名 ("体重" 等)。スクリーンリーダー向けの代替テキスト生成に使う */
  title: string;
}

function TrendChart({
  width,
  points,
  target,
  color,
  unit,
  fractionDigits,
  grain,
  emptyMessage,
  title,
}: TrendChartProps) {
  const t = useTheme();
  // タップ/ドラッグで選択中の記録値インデックス (null=未選択)
  const [selected, setSelected] = useState<number | null>(null);
  // ツールチップの実測サイズ (中央寄せ・端クランプ・上下反転の算出に使う)
  const [tipSize, setTipSize] = useState({ w: 0, h: 0 });

  if (points.length === 0) {
    return (
      <View
        style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}
        accessible
        accessibilityLabel={`${title}の推移グラフ。${emptyMessage}`}
      >
        <Text style={[styles.chartEmpty, { color: t.colors.content.secondary }]}>{emptyMessage}</Text>
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

  // 点が密なら生値ドットを隠して線のみ (説明不要の自明な間引き)。
  const showDots = points.length <= 1 || innerW / (points.length - 1) >= 8;
  // DS トークン値を SVG 属性用にキャッシュ (SVG は文字列ではなく数値を要求)
  const labelFontSize = t.typography.fontSize.xs; // 11px — システム最小
  const labelColor = t.colors.content.secondary;

  // ラベルは食事タブと統一: 軸端は粒度に応じた簡易表記、点ごとの詳細は食事の formatter を流用。
  const xLabel = (ts: number) =>
    grain === 'month' ? formatMonthLabel(new Date(ts)) : fmtMD(ts);
  const tooltipDate = (ts: number) =>
    grain === 'day'
      ? formatShortDay(new Date(ts))
      : grain === 'week'
        ? formatWeekRangeLabel(weekRangeOf(ts))
        : formatMonthLabel(new Date(ts));

  // ツールチップ配置: 選択点の中央上に置き、上に余白が無ければ下へ反転。左右端はクランプ。
  const TIP_GAP = 10;
  const pointX = sel ? xOf(sel.t) : 0;
  const pointY = sel ? yOf(sel.value) : 0;
  const tipLeft = Math.min(Math.max(pointX - tipSize.w / 2, 4), width - tipSize.w - 4);
  const tipAbove = pointY - tipSize.h - TIP_GAP >= 0;
  const tipTop = tipAbove ? pointY - tipSize.h - TIP_GAP : pointY + TIP_GAP;

  // --- スクリーンリーダー向けの代替テキスト (2026-08-09追加) ---
  // SVG の中の <SvgText> は軸ラベルの断片としてバラバラに読み上げられてしまうため、
  // ラッパーを単一の要素にまとめ、短い説明 (label) と長い説明 (hint) の2層で渡す。
  // ドラッグで点を選ぶ操作は VoiceOver では使えなくなるが、その代わりに
  // 「いつからいつまで、いくつからいくつへ、どれだけ変化したか」を一度に得られる。
  const firstPoint = points[0];
  const deltaValue = lastPoint.value - firstPoint.value;
  const deltaText =
    points.length < 2
      ? ''
      : `、${Math.abs(deltaValue) < Math.pow(10, -fractionDigits) / 2
          ? '変化なし'
          : `${deltaValue > 0 ? 'プラス' : 'マイナス'}${fmt(Math.abs(deltaValue))}${unit}`}`;
  const targetText =
    target != null
      ? `。目標${fmt(target)}${unit}、残り${fmt(Math.abs(lastPoint.value - target))}${unit}`
      : '';
  const chartSummary =
    points.length < 2
      ? `${xLabel(firstPoint.t)}に${fmt(firstPoint.value)}${unit}の記録が1件${targetText}`
      : `${xLabel(firstPoint.t)}から${xLabel(lastPoint.t)}まで${points.length}件。` +
        `${fmt(firstPoint.value)}${unit}から${fmt(lastPoint.value)}${unit}へ${deltaText}${targetText}`;

  return (
    <View
      style={[styles.chartWrap, { width, height: CHART_HEIGHT }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${title}の推移グラフ`}
      accessibilityHint={chartSummary}
    >
      <Svg width={width} height={CHART_HEIGHT}>
        {targetY != null ? (
          <>
            <Line
              x1={CHART_PAD_X}
              x2={width - CHART_PAD_X}
              y1={targetY}
              y2={targetY}
              stroke={t.colors.content.secondary}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <SvgText
              x={width - CHART_PAD_X}
              y={Math.max(CHART_PAD_TOP - 4, targetY - 5)}
              fontSize={labelFontSize}
              fill={labelColor}
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
          fontSize={labelFontSize}
          fill={labelColor}
          textAnchor="start"
        >
          {fmt(dataMax)}
        </SvgText>
        {dataMax !== dataMin ? (
          <SvgText
            x={CHART_PAD_X}
            y={yOf(dataMin) + 10}
            fontSize={labelFontSize}
            fill={labelColor}
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

        {showDots
          ? points.map((p) => (
              <Circle key={p.t} cx={xOf(p.t)} cy={yOf(p.value)} r={2.5} fill={color} />
            ))
          : null}

        {/* X軸: 開始/終了日付 */}
        <SvgText
          x={CHART_PAD_X}
          y={CHART_HEIGHT - 16}
          fontSize={labelFontSize}
          fill={labelColor}
          textAnchor="start"
        >
          {xLabel(tMin)}
        </SvgText>
        {tMax !== tMin ? (
          <SvgText
            x={width - CHART_PAD_X}
            y={CHART_HEIGHT - 16}
            fontSize={labelFontSize}
            fill={labelColor}
            textAnchor="end"
          >
            {xLabel(tMax)}
          </SvgText>
        ) : null}

        {/* 未選択時: 最新値を最終点に注記。目標ラインと近接する場合は「目標」ラベルと重なるため抑制 */}
        {!sel &&
        points.length >= 1 &&
        (targetY == null || Math.abs(yOf(lastPoint.value) - targetY) >= 14) ? (
          <SvgText
            x={Math.min(xOf(lastPoint.t) + 4, width - CHART_PAD_X)}
            y={Math.max(yOf(lastPoint.value) - 6, CHART_PAD_TOP)}
            fontSize={labelFontSize}
            fontWeight={t.typography.fontWeight.bold}
            fill={color}
            textAnchor={xOf(lastPoint.t) > width - 48 ? 'end' : 'start'}
          >
            {fmt(lastPoint.value)}
          </SvgText>
        ) : null}

        {/* 選択時: 縦ガイド線 + 強調ドット (吹き出しは SVG 外の実 View で描画) */}
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

      {/* 吹き出し: DS トークン (近白面 + border.subtle + elevation.md + 角丸/余白/タイポ)。
          SVG では影が出せないため実 View でオーバーレイし、実測サイズで中央寄せ・端クランプ。 */}
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
              color: t.colors.content.tertiary,
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

export function BodyStatsView({ period = 'month' }: { period?: BodyPeriod }) {
  const t = useTheme();
  const { weights, bodyFatEntries, profile } = useAppState();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;
  const grain = PERIOD_CONFIG[period].grain;
  const todayT = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

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

  // 期間＋粒度の集約は推移グラフにのみ適用。現在値カードは常に全履歴の最新を見せる。
  const weightPoints = useMemo(
    () => aggregate(weightSeries, period, todayT),
    [weightSeries, period, todayT]
  );
  const bodyFatPoints = useMemo(
    () => aggregate(bodyFatSeries, period, todayT),
    [bodyFatSeries, period, todayT]
  );

  const weightCurrent =
    profile.currentWeightKg ??
    (weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].value : null);

  const bfCurrent =
    profile.currentBodyFatPct ??
    (bodyFatSeries.length > 0 ? bodyFatSeries[bodyFatSeries.length - 1].value : null);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* 体重: ヘッダー + グラフを1枚のカードに統合 */}
      <View style={[styles.metricCard, { width: chartWidth, backgroundColor: t.colors.surface.raised }]}>
        <MetricCardHeader
          title="体重"
          unit="kg"
          current={weightCurrent}
          target={profile.targetWeightKg}
          fractionDigits={1}
          color={t.colors.action.text.default}
        />
        <View style={[styles.cardDivider, { backgroundColor: t.colors.border.default }]} />
        <TrendChart
          width={chartWidth}
          title="体重"
          points={weightPoints}
          target={profile.targetWeightKg}
          color={t.colors.action.text.default}
          unit="kg"
          fractionDigits={1}
          grain={grain}
          emptyMessage={
            weightSeries.length > 0 ? 'この期間の記録はありません' : '記録が増えると推移が表示されます'
          }
        />
      </View>

      {/* 体脂肪率: ヘッダー + グラフを1枚のカードに統合 */}
      <View style={[styles.metricCard, { width: chartWidth, backgroundColor: t.colors.surface.raised }]}>
        <MetricCardHeader
          title="体脂肪率"
          unit="%"
          current={bfCurrent}
          target={profile.targetBodyFatPct ?? null}
          fractionDigits={1}
          color={t.colors.accent.default}
        />
        <View style={[styles.cardDivider, { backgroundColor: t.colors.border.default }]} />
        <TrendChart
          width={chartWidth}
          title="体脂肪率"
          points={bodyFatPoints}
          target={profile.targetBodyFatPct ?? null}
          color={t.colors.accent.default}
          unit="%"
          fractionDigits={1}
          grain={grain}
          emptyMessage={
            bodyFatSeries.length > 0
              ? 'この期間の記録はありません'
              : '記録が増えると推移が表示されます'
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 60 },
  metricCard: {
    borderRadius: 20,
    overflow: 'visible', // ツールチップ影がカード端で切れないよう visible
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 12,
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
  chartWrap: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmpty: {
    fontSize: fs.sm,
  },
});
