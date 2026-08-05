/**
 * 週次リカップ — 全画面ストーリー形式。直近の完了週 (月〜日) の食事記録を振り返る。
 *
 * デザインは design_handoff_weekly_recap (2026-08-05) のトーンを踏襲しつつ、
 * コンテンツは utils/weekly-recap.ts の実データに合わせて調整している:
 *   - カロリーのヒーロー数字は「目標との差」ではなく「週合計」(ユーザー要望)
 *   - 食材候補は「この週の記録」ではなく「履歴優先+全カタログ補完」(macroBoost 参照)
 * トークン対応:
 *   - light カード = surface.default 等の意味トークン (システムダークモードに自動追従)
 *   - deep カード  = sage-800/900 固定 (テーマに依存しないブランド演出色)
 *   - Lato は未バンドルのためシステムフォント + fontWeight:'300' で近似
 *   - ヒーロー数字 (46〜104px) は fontSize.display(44px) を超える意図的な例外
 */
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, IconButton, Overline, useTheme, type Theme } from '@/design-system';
import { duration, easing } from '@/design-system/tokens/primitives/motion';
import { useAppState } from '@/providers/app-state-provider';
import {
  computeWeeklyRecap,
  type MacroAxis,
  type WeeklyRecap,
} from '@/utils/weekly-recap';

const MACRO_LABEL: Record<MacroAxis, { jp: string; en: string }> = {
  protein: { jp: 'たんぱく質', en: 'Protein' },
  fat: { jp: '脂質', en: 'Fat' },
  carbs: { jp: '炭水化物', en: 'Carbs' },
};

type CardBg = 'light' | 'deep';
interface Card {
  bg: CardBg;
  render: (t: Theme) => React.ReactNode;
}

const M3_EASE = Easing.bezier(...easing.enter);

export default function WeeklyRecapScreen() {
  const t = useTheme();
  const router = useRouter();
  const { logs, profile, exerciseLogs, dailyActivities, settings, updateSettingsValues } = useAppState();

  const recap = useMemo(
    () => computeWeeklyRecap(logs, profile, exerciseLogs, dailyActivities, new Date()),
    [logs, profile, exerciseLogs, dailyActivities],
  );

  // 開いた時点で「見た」とみなし、その週は teaser を再表示しない (WidgetNudgeBanner と同じ考え方)。
  useEffect(() => {
    if (recap && settings.weeklyRecapDismissedWeekKey !== recap.weekKey) {
      updateSettingsValues({ weeklyRecapDismissedWeekKey: recap.weekKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recap?.weekKey]);

  const cards = useMemo<Card[]>(() => (recap ? buildCards(recap) : []), [recap]);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: duration.long,
      easing: M3_EASE,
      useNativeDriver: true,
    }).start();
  }, [index, fade]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goNext = () => setIndex((i) => Math.min(i + 1, cards.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  if (!recap || cards.length === 0) {
    // データが無い週は teaser 自体を出さない設計だが、直リンク等の防御として何もせず閉じる。
    return null;
  }

  const current = cards[index];
  const bgColor = current.bg === 'deep' ? t.tokens.colors.sage[800] : t.colors.surface.default;
  const chromeColor = current.bg === 'deep' ? t.tokens.colors.ivory[100] : t.colors.content.primary;

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.chrome} pointerEvents="box-none">
          <View style={styles.ticks}>
            {cards.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  { backgroundColor: chromeColor, opacity: i <= index ? 0.95 : 0.22 },
                ]}
              />
            ))}
          </View>
          <Caption
            style={[styles.weekLabel, { color: chromeColor }]}
          >
            {recap.weekRangeLabel}
          </Caption>
        </View>

        <IconButton
          icon="close"
          size="md"
          onPress={close}
          accessibilityLabel="閉じる"
          style={[styles.closeBtn, { opacity: 0.6 }]}
          tone={current.bg === 'deep' ? 'inverse' : 'secondary'}
        />

        <View style={styles.zones} pointerEvents="box-none">
          <Pressable style={styles.zonePrev} onPress={goPrev} accessibilityRole="button" accessibilityLabel="前へ" />
          <Pressable style={styles.zoneNext} onPress={goNext} accessibilityRole="button" accessibilityLabel="次へ" />
        </View>

        <Animated.View
          style={[
            styles.cardBody,
            {
              opacity: fade,
              transform: [
                {
                  translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }),
                },
              ],
            },
          ]}
        >
          {current.render(t)}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function buildCards(recap: WeeklyRecap): Card[] {
  const cards: Card[] = [];

  // 1. 表紙 (deep) — 統計なし
  cards.push({
    bg: 'deep',
    render: (t) => (
      <>
        <Overline style={{ color: t.tokens.colors.ivory[200], opacity: 0.7 }}>Weekly Recap</Overline>
        <View style={styles.spacer} />
        <Body
          weight="regular"
          style={{
            color: t.tokens.colors.ivory[50],
            fontSize: 30,
            lineHeight: 42,
            fontWeight: '300',
          }}
        >
          先週の{'\n'}ごはんの{'\n'}ぐあい
        </Body>
        <Body size="sm" style={{ color: t.tokens.colors.ivory[100], opacity: 0.8, marginTop: t.spacing['6'] }}>
          {recap.weekRangeLabel}
        </Body>
        <View style={styles.spacer} />
        <Overline style={{ color: t.tokens.colors.ivory[200], opacity: 0.45, textAlign: 'center' }}>
          タップして進む
        </Overline>
      </>
    ),
  });

  // 2. 記録日数 (light)
  cards.push({
    bg: 'light',
    render: (t) => (
      <>
        <Overline tone="secondary">01 — 記録日数</Overline>
        <View style={styles.spacer} />
        <View style={styles.heroRow}>
          <Body style={heroTextStyle(t, 88)}>{recap.daysLogged}</Body>
          <Body style={[heroUnitStyle(t), { marginLeft: t.spacing['2'] }]}>／7日</Body>
        </View>
        <View style={[styles.dotsRow, { marginTop: t.spacing['8'] }]}>
          {recap.days.map((d) => (
            <View
              key={d.dateKey}
              style={[
                styles.dot,
                d.logged
                  ? { backgroundColor: t.colors.action.primary.default }
                  : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.colors.border.default, borderStyle: 'dashed' },
              ]}
            />
          ))}
        </View>
        <View style={styles.dotsRow}>
          {recap.days.map((d) => (
            <Caption key={d.dateKey} style={styles.dotLabel}>{d.weekdayLabel}</Caption>
          ))}
        </View>
        <Body size="sm" tone="secondary" style={{ marginTop: t.spacing['6'], lineHeight: 24 }}>
          記録が残っていた日を数えました。{'\n'}空いている日は、空いたままにしてあります。
        </Body>
        <View style={styles.spacer} />
      </>
    ),
  });

  // 3. カロリー (light) — ヒーロー数字は「週合計」
  cards.push({
    bg: 'light',
    render: (t) => (
      <>
        <Overline tone="secondary">02 — カロリー</Overline>
        <View style={{ marginTop: t.spacing['5'] }}>
          <Body size="sm" tone="secondary">先週、記録した食事の合計は</Body>
          <View style={[styles.heroRow, { marginTop: t.spacing['1'] }]}>
            <Body style={heroTextStyle(t, 60)}>{recap.totalKcal.toLocaleString('ja-JP')}</Body>
            <Body style={[heroUnitStyle(t), { marginLeft: t.spacing['2'] }]}>kcal</Body>
          </View>
        </View>
        <Body
          size="sm"
          tone="secondary"
          style={{
            marginTop: t.spacing['5'],
            paddingTop: t.spacing['4'],
            borderTopWidth: 1,
            borderTopColor: t.colors.border.default,
          }}
        >
          平均 {recap.avgKcal.toLocaleString('ja-JP')}kcal　／　目標 {recap.avgTargetKcal.toLocaleString('ja-JP')}kcal
        </Body>
        <View style={{ marginTop: t.spacing['6'] }}>
          <DailyKcalChart recap={recap} t={t} />
        </View>
        <Caption style={{ marginTop: t.spacing['2'] }}>
          点線は目標。枠だけの棒は、記録のなかった日です。
        </Caption>
        <View style={styles.spacer} />
      </>
    ),
  });

  // 4. PFCインサイト (light, 条件あり)
  if (recap.macroInsight) {
    const insight = recap.macroInsight;
    const label = MACRO_LABEL[insight.axis];
    const max = Math.max(insight.avgActual, insight.avgTarget) || 1;
    cards.push({
      bg: 'light',
      render: (t) => {
        const nutri = t.colors.nutrition[insight.axis];
        return (
          <>
            <Overline tone="secondary">03 — {label.en}</Overline>
            <Body size="lg" style={{ marginTop: t.spacing['6'], lineHeight: 26 }}>
              目標との差がいちばん大きかったのは
            </Body>
            <Body
              style={{
                marginTop: t.spacing['5'],
                fontSize: 40,
                lineHeight: 46,
                fontWeight: '300',
                color: nutri.text,
              }}
            >
              {label.jp}
            </Body>
            <View
              style={[
                styles.pill,
                { backgroundColor: nutri.background, marginTop: t.spacing['4'] },
              ]}
            >
              <Body size="sm" weight="medium" style={{ color: nutri.text }}>
                目標より {insight.direction === 'less' ? '少なめ' : '多め'}
              </Body>
            </View>
            <View style={{ marginTop: t.spacing['8'], gap: t.spacing['4'] }}>
              <MacroBar label="1日の平均" value={insight.avgActual} max={max} color={nutri.graphic} t={t} />
              <MacroBar label="1日の目標" value={insight.avgTarget} max={max} color={t.colors.border.default} t={t} muted />
            </View>
            <View style={styles.spacer} />
            <Caption>
              P・F・Cのうち、目標との開きが最も大きかった1つだけを表示しています。
            </Caption>
          </>
        );
      },
    });
  }

  // 5. アドバイス+豆知識 (light, 条件あり: direction='less' のときだけ)
  if (recap.macroBoost) {
    const boost = recap.macroBoost;
    const label = MACRO_LABEL[boost.axis];
    cards.push({
      bg: 'light',
      render: (t) => (
        <>
          <Overline tone="secondary">04 — アドバイス</Overline>
          <Body size="lg" style={{ marginTop: t.spacing['6'], lineHeight: 26 }}>
            {label.jp}を増やしたいときは
          </Body>
          <View style={{ marginTop: t.spacing['6'], gap: t.spacing['2'] }}>
            {boost.candidates.map((c) => (
              <View
                key={c.identityId}
                style={[styles.chip, { backgroundColor: t.colors.action.primary.container, borderColor: t.colors.action.primary.default + '55' }]}
              >
                <Body weight="medium" style={{ color: t.colors.action.primary.onContainer }}>
                  {c.label}
                </Body>
              </View>
            ))}
          </View>
          <View style={styles.spacer} />
          {boost.note ? (
            <View style={{ borderTopWidth: 1, borderTopColor: t.colors.border.default, paddingTop: t.spacing['4'] }}>
              <Overline tone="tertiary" style={{ fontSize: 10 }}>Note · {boost.note.identityLabel}</Overline>
              <Body size="sm" tone="secondary" style={{ marginTop: t.spacing['2'], lineHeight: 22 }}>
                {boost.note.note}
              </Body>
            </View>
          ) : null}
        </>
      ),
    });
  }

  // 6. アウトロ (deep)
  cards.push({
    bg: 'deep',
    render: (t) => (
      <>
        <Overline style={{ color: t.tokens.colors.ivory[200], opacity: 0.7 }}>Weekly Recap</Overline>
        <View style={styles.spacer} />
        <Body
          style={{
            color: t.tokens.colors.ivory[50],
            fontSize: 26,
            lineHeight: 42,
            fontWeight: '300',
          }}
        >
          今週も、{'\n'}ざっくりで、いい。
        </Body>
        <Body size="sm" style={{ color: t.tokens.colors.ivory[100], opacity: 0.75, marginTop: t.spacing['5'] }}>
          来週のリカップは、次の月曜に。
        </Body>
        <View style={styles.spacer} />
        <OutroButton t={t} />
      </>
    ),
  });

  return cards;
}

function OutroButton({ t }: { t: Theme }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={({ pressed }) => [
        styles.outroBtn,
        {
          borderColor: t.colors.border.inverse,
          backgroundColor: pressed ? 'rgba(251,248,242,0.1)' : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="ホームに戻る"
    >
      <Body style={{ color: t.tokens.colors.ivory[100] }}>ホームに戻る</Body>
    </Pressable>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  t,
  muted,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  t: Theme;
  muted?: boolean;
}) {
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <View>
      <View style={styles.barCaptionRow}>
        <Body size="sm" tone="secondary">{label}</Body>
        <Body weight="regular" style={{ fontSize: 17, color: muted ? t.colors.content.secondary : t.colors.content.primary }}>
          {value}g
        </Body>
      </View>
      <View style={[styles.track, { backgroundColor: t.colors.surface.sunken, marginTop: t.spacing['1'] }]}>
        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function DailyKcalChart({ recap, t }: { recap: WeeklyRecap; t: Theme }) {
  const W = 320;
  const H = 150;
  const PT = 10;
  const PB = 26;
  const pad = 4;
  const inner = H - PT - PB;
  const slot = (W - pad * 2) / 7;
  const bw = slot * 0.46;
  const target = recap.days[0]?.targetKcal || recap.avgTargetKcal || 1;
  const maxVal = Math.max(target, ...recap.days.map((d) => d.kcal)) * 1.1 || 1;
  const ty = PT + inner * (1 - target / maxVal);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {target > 0 ? (
        <>
          <Line x1={pad} x2={W - pad} y1={ty} y2={ty} stroke={t.colors.content.tertiary} strokeDasharray="3 5" strokeWidth={1} opacity={0.6} />
          <SvgText x={W - pad} y={ty - 6} fontSize={10} fill={t.colors.content.tertiary} textAnchor="end">
            目標 {target.toLocaleString('ja-JP')}
          </SvgText>
        </>
      ) : null}
      {recap.days.map((d, i) => {
        const cx = pad + i * slot + slot / 2;
        const x = cx - bw / 2;
        if (!d.logged) {
          const h = 22;
          const y = PT + inner - h;
          return (
            <Rect
              key={d.dateKey}
              x={x}
              y={y}
              width={bw}
              height={h}
              rx={4}
              fill="none"
              stroke={t.colors.border.default}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          );
        }
        const h = Math.max(5, (d.kcal / maxVal) * inner);
        const y = PT + inner - h;
        return (
          <Rect key={d.dateKey} x={x} y={y} width={bw} height={h} rx={4} fill={t.colors.action.primary.default} opacity={0.9} />
        );
      })}
      {recap.days.map((d, i) => {
        const cx = pad + i * slot + slot / 2;
        return (
          <SvgText
            key={d.dateKey}
            x={cx}
            y={H - 10}
            fontSize={11}
            fill={d.logged ? t.colors.content.tertiary : t.colors.content.disabled}
            textAnchor="middle"
          >
            {d.weekdayLabel}
          </SvgText>
        );
      })}
    </Svg>
  );
}

function heroTextStyle(t: Theme, size: number) {
  return {
    fontSize: size,
    lineHeight: size * 1.02,
    fontWeight: '300' as const,
    letterSpacing: -size * 0.02,
    color: t.colors.content.primary,
  };
}
function heroUnitStyle(t: Theme) {
  return { fontSize: 18, fontWeight: '300' as const, color: t.colors.content.secondary };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 8, zIndex: 30 },
  ticks: { flexDirection: 'row', gap: 4 },
  tick: { flex: 1, height: 2.5, borderRadius: 2 },
  weekLabel: { marginTop: 12, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.6, fontSize: 10 },
  closeBtn: { position: 'absolute', top: 4, right: 12, zIndex: 35 },
  zones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 25 },
  zonePrev: { width: '35%', height: '100%' },
  zoneNext: { width: '65%', height: '100%' },
  cardBody: { flex: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32, zIndex: 20 },
  spacer: { flex: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  dotsRow: { flexDirection: 'row', gap: 12 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  dotLabel: { width: 20, textAlign: 'center', marginTop: 6 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 999 },
  barCaptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chip: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 18 },
  outroBtn: { borderWidth: 1, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
});
