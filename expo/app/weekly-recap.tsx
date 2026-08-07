/**
 * 週次振り返り — 全画面ストーリー形式。直近の完了週 (月〜日) の食事記録を振り返る。
 * (旧称「週次リカップ」。プロジェクトの正式用語 docs/ROADMAP.md に合わせて統一 2026-08-06)
 *
 * デザインは design_handoff_weekly_recap (2026-08-05) の構成・トーンを踏襲しつつ、
 * コンテンツは中立トーン (PRD §9.1) の観点で調整している:
 *   - カロリーのヒーロー数字は「1日あたりの平均」のみ。目標との差分・週合計はどちらも
 *     ヒーローに据えない (差分を大きく見せるのは評価的で中立トーンに反する。比較は
 *     カード4のPFCインサイト1箇所に集約する) 2026-08-06
 *   - 各カードの説明キャプション (「点線は目標」等) は、見れば分かることの言葉での
 *     反復だったため削除。リード文は全カード「〜のは」で統一し、見出し→数字の
 *     ストーリー的なリズムを揃えた
 *   - 食材候補は「この週の記録」ではなく「履歴優先+全カタログ補完」(macroBoost 参照)
 * トークン対応:
 *   - light カード = surface.default 等の意味トークン (システムダークモードに自動追従)
 *   - deep カード  = sage-800/900 固定 (テーマに依存しないブランド演出色)
 *   - Lato は未バンドルのためシステムフォント + fontWeight:'300' で近似
 *   - ヒーロー数字 (40〜88px) は fontSize.display(44px) を超える意図的な例外
 */
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Caption, Icon, IconButton, MacroChip, Overline, useTheme, type Theme } from '@/design-system';
import { Logo } from '@/components/Logo';
import { duration, easing } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { getBucketDef, getIdentity } from '@/constants/identity';
import { useAppState } from '@/providers/app-state-provider';
import {
  computeWeeklyRecap,
  type MacroAxis,
  type WeeklyRecap,
} from '@/utils/weekly-recap';

const MACRO_LABEL: Record<MacroAxis, { jp: string }> = {
  protein: { jp: 'たんぱく質' },
  fat: { jp: '脂質' },
  carbs: { jp: '炭水化物' },
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
  const insets = useSafeAreaInsets();
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

  const styles = useMemo(() => makeStyles(t), [t]);
  const cards = useMemo<Card[]>(() => (recap ? buildCards(recap, styles) : []), [recap, styles]);
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
      <StatusBar style={current.bg === 'deep' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.chrome, { top: insets.top }]} pointerEvents="box-none">
          <View style={styles.chromeRow}>
            <View style={styles.chromeMain}>
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
              <Caption style={[styles.weekLabel, { color: chromeColor }]}>
                {recap.weekRangeLabel}
              </Caption>
            </View>
            <IconButton
              icon="close"
              size="md"
              onPress={close}
              accessibilityLabel="閉じる"
              style={{ opacity: 0.6 }}
              tone={current.bg === 'deep' ? 'inverse' : 'secondary'}
            />
          </View>
        </View>

        <View style={styles.zones} pointerEvents="box-none">
          <Pressable style={styles.zonePrev} onPress={goPrev} accessibilityRole="button" accessibilityLabel="前へ" />
          {index < cards.length - 1 ? (
            <Pressable style={styles.zoneNext} onPress={goNext} accessibilityRole="button" accessibilityLabel="次へ" />
          ) : (
            <View style={styles.zoneNext} pointerEvents="none" />
          )}
        </View>

        {current.bg === 'deep' ? (
          <View style={styles.logoWatermark} pointerEvents="none">
            <Logo size={300} color={t.tokens.colors.ivory[50]} />
          </View>
        ) : null}

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

function buildCards(recap: WeeklyRecap, styles: Styles): Card[] {
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
            fontSize: 48,
            lineHeight: 56,
            letterSpacing: -1,
            fontWeight: '300',
          }}
        >
          先週の{'\n'}ごはんを{'\n'}ふりかえる
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
        <View style={{ marginTop: t.spacing['6'] }}>
          <Body size="lg" style={{ lineHeight: 26 }}>先週、記録が残っていたのは</Body>
          <View style={[styles.heroRow, { marginTop: t.spacing['5'] }]}>
            <Body style={heroTextStyle(t, 88)}>{recap.daysLogged}</Body>
            <Body style={[heroUnitStyle(t), { marginLeft: t.spacing['2'] }]}>／7日</Body>
          </View>
        </View>
        <View style={[styles.spacer, { justifyContent: 'center' }]}>
          <View style={styles.dotsRow}>
            {recap.days.map((d) => (
              <View
                key={d.dateKey}
                style={[
                  styles.dot,
                  d.logged
                    ? { backgroundColor: t.colors.action.primary.default }
                    : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.colors.border.default, borderStyle: 'dashed' },
                ]}
              >
                {d.logged ? <Icon name="check" size={16} color={t.colors.content.onAction} /> : null}
              </View>
            ))}
          </View>
          <View style={[styles.dotsRow, { marginTop: t.spacing['2'] }]}>
            {recap.days.map((d) => (
              <Caption key={d.dateKey} style={styles.dotLabel}>{d.weekdayLabel}</Caption>
            ))}
          </View>
        </View>
      </>
    ),
  });

  // 3. カロリー (light) — ヒーロー数字は「1日あたりの平均」のみ。目標との差を強調しない
  // (差分を大きく見せるのは中立トーンに反するため不採用。比較はカード4のPFCインサイトに任せる)
  cards.push({
    bg: 'light',
    render: (t) => (
      <>
        <Overline tone="secondary">02 — カロリー</Overline>
        <View style={{ marginTop: t.spacing['6'] }}>
          <Body size="lg" style={{ lineHeight: 26 }}>先週、1日あたり食べていたのは</Body>
          <View style={[styles.heroRow, { marginTop: t.spacing['5'] }]}>
            <Body style={heroTextStyle(t, 60)}>{recap.avgKcal.toLocaleString('ja-JP')}</Body>
            <Body style={[heroUnitStyle(t), { marginLeft: t.spacing['2'] }]}>kcal</Body>
          </View>
          {recap.avgTargetKcal > 0 ? (
            <Body size="sm" tone="secondary" style={{ marginTop: t.spacing['2'] }}>
              目標 {recap.avgTargetKcal.toLocaleString('ja-JP')}kcal
            </Body>
          ) : null}
        </View>
        <View style={[styles.spacer, { justifyContent: 'center' }]}>
          <DailyKcalChart recap={recap} t={t} />
        </View>
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
            <Overline tone="secondary">03 — {label.jp}</Overline>
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
            <View style={[styles.spacer, { justifyContent: 'center' }]}>
              <View style={{ gap: t.spacing['4'] }}>
                <MacroBar label="1日の平均" value={insight.avgActual} max={max} color={nutri.graphic} t={t} styles={styles} />
                <MacroBar label="1日の目標" value={insight.avgTarget} max={max} color={t.colors.border.default} t={t} styles={styles} muted />
              </View>
            </View>
          </>
        );
      },
    });
  }

  // 5. アドバイス+豆知識 (light, 条件あり: direction='less' = 増やす候補 / 'more' = 代替案)
  if (recap.macroBoost) {
    const boost = recap.macroBoost;
    const label = MACRO_LABEL[boost.axis];
    cards.push({
      bg: 'light',
      render: (t) => (
        <>
          <Overline tone="secondary">04 — アドバイス</Overline>
          <Body size="lg" style={{ marginTop: t.spacing['6'], lineHeight: 26 }}>
            {boost.direction === 'less'
              ? `${label.jp}を増やしたいときは`
              : `${label.jp}が少なめの選択肢なら`}
          </Body>
          <View style={[styles.spacer, { justifyContent: 'center' }]}>
            <View style={{ gap: t.spacing['3'] }}>
              {boost.candidates.map((c) => {
                const identity = getIdentity(c.identityId);
                const bucket = identity ? getBucketDef(identity.primaryHome.bucket) : undefined;
                const axisGrams = identity?.defaultMacro[boost.axis] ?? 0;
                return (
                  <View
                    key={c.identityId}
                    style={[styles.candidateCard, { backgroundColor: t.colors.surface.raised }]}
                  >
                    <Body style={{ fontSize: 20 }}>{bucket?.emoji ?? '🍽️'}</Body>
                    <Body weight="medium" style={{ flex: 1, color: t.colors.content.primary }}>
                      {c.label}
                    </Body>
                    <MacroChip kind={boost.axis} value={axisGrams} size="sm" />
                  </View>
                );
              })}
            </View>
          </View>
          {boost.note ? (
            <View style={{ borderTopWidth: 1, borderTopColor: t.colors.border.default, paddingTop: t.spacing['4'] }}>
              <Overline tone="tertiary">豆知識 · {boost.note.identityLabel}</Overline>
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
            fontSize: 36,
            lineHeight: 48,
            letterSpacing: -0.5,
            fontWeight: '300',
          }}
        >
          ざっくりが、{'\n'}続くコツ。
        </Body>
        <Body size="sm" style={{ color: t.tokens.colors.ivory[100], opacity: 0.75, marginTop: t.spacing['5'] }}>
          来週の振り返りは、次の月曜に。
        </Body>
        <View style={styles.spacer} />
        <OutroButton t={t} styles={styles} />
      </>
    ),
  });

  return cards;
}

function OutroButton({ t, styles }: { t: Theme; styles: Styles }) {
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
          // このボタンは常に固定の sage[800] 背景 (deep カード、テーマ非依存) の上にある。
          // border.inverse はテーマ相対 (light⇔dark反転) なため、light テーマだと
          // ivory[800](暗色)になりsage800と同化してほぼ見えなかった (CR1.54、2026-08-07指摘)。
          // 同じカードの他要素と同様、固定の ivory[100] を直接使う。
          borderColor: t.tokens.colors.ivory[100],
          // ivory[100] を10%不透明度で。トークン値+αサフィックスで raw rgba を避ける。
          backgroundColor: pressed ? `${t.tokens.colors.ivory[100]}1A` : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="とじる"
    >
      <Body style={{ color: t.tokens.colors.ivory[100] }}>とじる</Body>
    </Pressable>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  t,
  styles,
  muted,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  t: Theme;
  styles: Styles;
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

/**
 * WeeklyStatsView (components/WeeklyStatsView.tsx) と同じ描画ルールを踏襲:
 *   - バー幅 = スロット幅 × 0.55、角丸 radius.xs
 *   - 色は kcal/当日目標比 の3段階 (within/mildExceed/severeExceed、nutrition.calorie.*)
 *   - 目標線は日ごとの値を結ぶ Polyline (運動による当日拡大を反映)、破線+点
 *   - 未記録日はバー無し (h=0)、ラベルのみ残す — 「0kcal」に見せない
 */
function DailyKcalChart({ recap, t }: { recap: WeeklyRecap; t: Theme }) {
  const W = 320;
  const H = 150;
  const PT = 10;
  const PB = 26;
  const pad = 4;
  const inner = H - PT - PB;
  const slot = (W - pad * 2) / 7;
  const bw = slot * 0.55;
  const maxVal = Math.max(1, ...recap.days.map((d) => d.targetKcal), ...recap.days.map((d) => d.kcal)) * 1.1;

  const barColor = (kcal: number, dayTarget: number) => {
    if (kcal <= 0) return t.colors.nutrition.calorie.track;
    if (dayTarget <= 0) return t.colors.nutrition.calorie.within.graphic;
    const ratio = kcal / dayTarget;
    if (ratio <= 1.1) return t.colors.nutrition.calorie.within.graphic;
    if (ratio <= 1.3) return t.colors.nutrition.calorie.mildExceed.graphic;
    return t.colors.nutrition.calorie.severeExceed.graphic;
  };

  const hasTarget = recap.days.some((d) => d.targetKcal > 0);
  const targetPoints = recap.days.map((d, i) => ({
    x: pad + i * slot + slot / 2,
    y: PT + inner * (1 - d.targetKcal / maxVal),
  }));

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {recap.days.map((d, i) => {
        const cx = pad + i * slot + slot / 2;
        const x = cx - bw / 2;
        const h = Math.max(0, (d.kcal / maxVal) * inner);
        const y = PT + inner - h;
        const dateNum = new Date(d.dateKey + 'T00:00:00').getDate();
        return (
          <React.Fragment key={d.dateKey}>
            <Rect
              x={x}
              y={y}
              width={bw}
              height={h}
              rx={radius.xs}
              fill={barColor(d.kcal, d.targetKcal)}
              opacity={d.kcal > 0 ? 0.55 : 1}
            />
            <SvgText x={cx} y={H - 16} fontSize={10} fill={t.colors.content.secondary} textAnchor="middle">
              {d.weekdayLabel}
            </SvgText>
            <SvgText x={cx} y={H - 5} fontSize={10} fontWeight="600" fill={t.colors.content.primary} textAnchor="middle">
              {dateNum}
            </SvgText>
          </React.Fragment>
        );
      })}
      {hasTarget ? (
        <>
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
        </>
      ) : null}
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

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    chrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: t.spacing['5'], paddingTop: t.spacing['2'], zIndex: 30 },
    chromeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing['2'] },
    chromeMain: { flex: 1 },
    ticks: { flexDirection: 'row', gap: t.spacing['1'] },
    tick: { flex: 1, height: 2.5, borderRadius: radius.full },
    weekLabel: { marginTop: t.spacing['3'], letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.6, fontSize: t.typography.fontSize.xs },
    zones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 25 },
    // ロゴ (3×3ドット・8割の主張) を deep カードの背景に薄く配置。表紙/アウトロ限定。
    logoWatermark: { position: 'absolute', bottom: -10, right: -30, opacity: 0.07, zIndex: 5 },
    zonePrev: { width: '35%', height: '100%' },
    zoneNext: { width: '65%', height: '100%' },
    cardBody: { flex: 1, paddingHorizontal: t.spacing['6'], paddingTop: t.spacing['16'], paddingBottom: t.spacing['8'], zIndex: 20 },
    spacer: { flex: 1 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
    dotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dot: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
    dotLabel: { width: 28, textAlign: 'center', marginTop: t.spacing['2'] },
    pill: { alignSelf: 'flex-start', borderRadius: radius.full, paddingVertical: t.spacing['2'], paddingHorizontal: t.spacing['4'] },
    track: { height: 10, borderRadius: radius.full, overflow: 'hidden' },
    trackFill: { height: '100%', borderRadius: radius.full },
    barCaptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    candidateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing['3'],
      borderRadius: radius.lg,
      paddingVertical: t.spacing['4'],
      paddingHorizontal: t.spacing['4'],
    },
    outroBtn: { borderWidth: 1, borderRadius: radius.full, paddingVertical: t.spacing['4'], alignItems: 'center' },
  });
}
type Styles = ReturnType<typeof makeStyles>;
