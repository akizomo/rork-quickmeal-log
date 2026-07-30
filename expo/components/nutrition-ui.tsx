import { Link, useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { HomeDatePager, type HomeDatePagerRef } from '@/components/HomeDatePager';
import { DayLogBottomSheet, type DayLogBottomSheetRef } from '@/components/DayLogBottomSheet';
import { additionPresets, portionSnapPoints, sizeOptions } from '@/constants/nutrition-data';
import { ACTIVITY_LEVEL_OPTIONS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Badge, Body, BottomSheet, Button, Caption, Dialog, Icon, IconButton, Label, useTheme, type Theme } from '@/design-system';
import { duration, easing, spring } from '@/design-system/tokens/primitives/motion';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { radius } from '@/design-system/tokens/primitives/radius';
import { elevation } from '@/design-system/tokens/primitives/elevation';
import { useAppState } from '@/providers/app-state-provider';
import { useHealthSyncContext } from '@/providers/health-sync-provider';
import { DishDraft, DishSize, IngredientDraft, Macro, PortionValue } from '@/types/nutrition';
import { adjustedTargetKcal, calcBaselineActiveKcal, carryoverSoftFloorKcal, classifyCarryoverDeduction, getAdjustedPfcForDate, getEffectiveSubscriptionStatus, getTdeeExerciseKcalForDate, minCarryoverDays, stepsToActiveKcal, trialDaysRemaining } from '@/utils/goals';
import { buildDishMacro, clampPortion, computeIngredient, draftFromLog, formatDateKey, formatMacroText, getIngredientSubtypeDef, getIngredientSubtypeDefs, getQuickCategories, getSubtypes, getToppingsForSubtype, summarizeToppings } from '@/utils/nutrition';
import { formatDayLabel, isSameDay, sumForDate } from '@/utils/history';

export function MiniProgressBar({ letter, label, current, target, textColor, graphicColor, trackColor }: {
  letter: string;
  label: string;
  current: number;
  target: number;
  /** P/F/C の文字色。AA コントラスト確認済みの nutrition.*.text を渡す。 */
  textColor: string;
  /** バー塗り色。nutrition.*.graphic (text より彩度高め) を渡す。 */
  graphicColor: string;
  /** 空バーの下地色。nutrition.*.background (マクロごとの薄いトーン) を渡す。 */
  trackColor: string;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={styles.miniBarItem}>
      <Text style={styles.miniBarLabel}>
        <Text style={[styles.miniBarLetter, { color: textColor }]}>{letter}</Text>
        {' '}
        {label}
      </Text>
      <View style={[styles.miniBarTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.miniBarFill, { width: `${progress * 100}%`, backgroundColor: graphicColor }]} />
      </View>
      <Text style={styles.miniBarValue}>
        {Math.round(current)}
        <Text style={styles.miniBarValueTarget}> / {Math.round(target)} g</Text>
      </Text>
    </View>
  );
}

export const Header = memo(function Header({ viewedDate }: { viewedDate?: Date }) {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { settings } = useAppState();
  const avatarScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.spring(avatarScale, {
      toValue: 1,
      useNativeDriver: true,
      ...spring.pop,
    }).start();
  }, [avatarScale]);

  const dateLabel = useMemo(
    () => (viewedDate ? formatDayLabel(viewedDate) : '今日'),
    [viewedDate]
  );

  // トライアル残り≤2日でアバターにバッジ表示 (PRD §6.1)
  const showTrialBadge = useMemo(() => {
    if (getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS) !== 'trialing') return false;
    const remaining = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
    return remaining > 0 && remaining <= 2;
  }, [settings]);

  return (
    <View style={styles.headerRow}>
      <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
        <IconButton
          icon="user"
          size="lg"
          variant="filled"
          onPress={() => router.push('/status')}
          testID="avatar-button"
          accessibilityLabel="プロフィール"
        >
          {showTrialBadge ? <View style={styles.avatarBadge} testID="avatar-trial-badge" /> : null}
        </IconButton>
      </Animated.View>
      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.headerDate} testID="header-date-label">{dateLabel}</Text>
      </View>
      <View style={styles.headerRight}>
        <IconButton
          icon="help"
          size="lg"
          variant="filled"
          onPress={() => router.push('/help')}
          testID="help-link"
          accessibilityLabel="使い方を見る"
        />
        <IconButton
          icon="barChart"
          size="lg"
          variant="filled"
          onPress={() => router.push('/stats')}
          testID="stats-link"
          accessibilityLabel="実績を見る"
        />
      </View>
    </View>
  );
});

/**
 * リング中央タップで開く「収支」モーダル。
 *
 * 業界標準 (YAZIO / MFP / あすけん) に合わせた計算モデル:
 *   ベース目標 (BMR × 活動係数) + 運動 (gross 全額) − 食事 = 残り
 *
 * 3 階層のテキストヒエラルキー:
 *   Tier 1 (primary):   主役の数字・最終結果      → text 色, bold, large
 *   Tier 2 (secondary): 計算式の値・中間結果      → text 色, medium
 *   Tier 3 (tertiary):  ラベル・補足・設定情報    → muted 色, regular, small
 *
 * 計算式は **常に表示** (前バージョンの "運動がある時のみ表示" を廃止)。
 */
const BalanceModal = memo(function BalanceModal({
  visible,
  onClose,
  baseTargetKcal,
  adjustedTargetKcal,
  consumedKcal,
  exerciseAdded,
  addedLabel,
  activityLevelLabel,
  carryoverPlanActive,
  carryoverDeductionKcal,
  carryoverDaysTotal,
  carryoverDayIndex,
  yesterdayOvershootKcal,
  onApplyCarryover,
  onCancelCarryoverPlan,
}: {
  visible: boolean;
  onClose: () => void;
  baseTargetKcal: number;
  adjustedTargetKcal: number;
  consumedKcal: number;
  exerciseAdded: number;
  addedLabel: string;
  activityLevelLabel: string | null;
  carryoverPlanActive: boolean;
  carryoverDeductionKcal: number;
  carryoverDaysTotal: number;
  carryoverDayIndex: number;
  /** 前日オーバー量。0 のとき帳尻行を非表示 */
  yesterdayOvershootKcal: number;
  onApplyCarryover: () => void;
  onCancelCarryoverPlan: () => void;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const remaining = adjustedTargetKcal - consumedKcal;
  const progress = adjustedTargetKcal > 0 ? Math.min(1, Math.max(0, consumedKcal / adjustedTargetKcal)) : 0;
  const overshoot = remaining < 0;
  const hasExercise = exerciseAdded > 0;
  const showCarryoverSection = carryoverPlanActive ||
    yesterdayOvershootKcal > Math.round(baseTargetKcal * 0.15);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  return (
    <>
    <Dialog visible={visible} onClose={onClose} testID="balance-modal">
      {/* close ボタン (右上) */}
      <IconButton
        icon="close"
        size="md"
        onPress={onClose}
        style={styles.balanceCloseButton}
        accessibilityLabel="閉じる"
      />

      {/* HERO (Tier 1): 残り or オーバー */}
          <View style={styles.balanceHero}>
            <Label size="sm" tone="secondary">{overshoot ? 'オーバー' : '残り'}</Label>
            <Text style={[styles.balanceHeroValue, overshoot && { color: t.colors.status.danger.default }]}>
              {Math.abs(remaining).toLocaleString()}
            </Text>
            <Text style={styles.balanceHeroUnit}>kcal</Text>
          </View>

          {/* 進捗バー (視覚補助) */}
          <View style={[styles.balanceProgressTrack, { backgroundColor: t.colors.surface.sunken }]}>
            <View
              style={[
                styles.balanceProgressFill,
                {
                  width: `${Math.min(Math.round(progress * 100), 100)}%`,
                  backgroundColor: overshoot ? t.colors.status.danger.default : t.colors.action.primary.default,
                },
              ]}
            />
          </View>

          {/* 計算式 (常に表示) */}
          <View style={styles.balanceMath}>
            <View>
              <BalanceMathRow label="ベース目標" value={baseTargetKcal} />
              {activityLevelLabel ? (
                <Text style={styles.balanceMathSubtitle}>普段の活動「{activityLevelLabel}」を含む</Text>
              ) : null}
            </View>
            {hasExercise ? (
              <BalanceMathRow label={addedLabel} value={exerciseAdded} sign="+" tone="positive" />
            ) : null}
            {(hasExercise || carryoverPlanActive) ? (
              <BalanceMathRow label="今日の目標" value={adjustedTargetKcal + carryoverDeductionKcal} emphasis="mid" />
            ) : null}
            {carryoverPlanActive ? (
              <BalanceMathRow
                label={`調整中（${carryoverDayIndex}/${carryoverDaysTotal}日目）`}
                value={carryoverDeductionKcal}
                sign="-"
              />
            ) : null}
            <BalanceMathRow label="食事" value={consumedKcal} sign="-" />
            <View style={styles.balanceMathDivider} />
            <BalanceMathRow
              label="残り"
              value={remaining}
              emphasis="strong"
              tone={overshoot ? 'alert' : undefined}
            />
          </View>

          {/* 帳尻調整トグル: 前日閾値超 or プラン実行中のとき表示 */}
          {showCarryoverSection && carryoverPlanActive ? (
            <View style={[styles.carryoverToggle, {
              backgroundColor: t.colors.action.primary.container,
              borderColor: t.colors.border.focus,
              flexDirection: 'row',
              alignItems: 'center',
            }]}>
              <View style={styles.carryoverToggleLeft}>
                <Text style={{ fontSize: fs.sm }}>🍽️</Text>
                <Text style={[styles.carryoverToggleLabel, { color: t.colors.action.primary.onContainer }]}>
                  調整中（{carryoverDaysTotal}日間）
                </Text>
              </View>
              <Pressable onPress={onApplyCarryover} hitSlop={8} accessibilityRole="button" accessibilityLabel="プランを変更する">
                <Label size="sm" tone="link">変更</Label>
              </Pressable>
              <Text style={{ color: t.colors.border.default, marginHorizontal: t.spacing['2'] }}>|</Text>
              <Pressable onPress={() => setCancelDialogVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="調整をやめる">
                <Label size="sm" style={{ color: t.colors.status.danger.default }}>やめる</Label>
              </Pressable>
            </View>
          ) : showCarryoverSection ? (
            <Pressable
              onPress={onApplyCarryover}
              style={[styles.carryoverToggle, {
                backgroundColor: t.colors.surface.sunken,
                borderColor: t.colors.border.subtle,
              }]}
              accessibilityRole="button"
              accessibilityLabel="食事の調整をはじめる"
            >
              <View style={styles.carryoverToggleLeft}>
                <Text style={{ fontSize: fs.sm }}>🍽️</Text>
                <Text style={[styles.carryoverToggleLabel, { color: t.colors.content.secondary }]}>
                  昨日の食事、少し多めでした — 調整する
                </Text>
              </View>
            </Pressable>
          ) : null}
    </Dialog>
    <Dialog
      visible={cancelDialogVisible}
      onClose={() => setCancelDialogVisible(false)}
      title="調整プランをやめますか？"
      primaryAction={{
        label: 'やめる',
        onPress: () => { setCancelDialogVisible(false); onClose(); onCancelCarryoverPlan(); },
      }}
      secondaryAction={{
        label: '続ける',
        onPress: () => setCancelDialogVisible(false),
      }}
    >
      <Body size="sm" tone="secondary">
        残りの調整がキャンセルされ、毎日の目標カロリーが通常に戻ります。
      </Body>
    </Dialog>
    </>
  );
});

/**
 * 計算式の 1 行。
 * - emphasis="strong": 最終結果 (Tier 1 — 大きく太く、text 色)
 * - emphasis="mid":    中間結果 (Tier 2 — やや太く、text 色)
 * - emphasis=undefined: 通常行 (ラベル Tier 3 muted / 値 Tier 2 medium)
 */
function BalanceMathRow({
  label,
  value,
  sign,
  tone,
  emphasis,
}: {
  label: string;
  value: number;
  sign?: '+' | '-';
  tone?: 'positive' | 'alert';
  emphasis?: 'mid' | 'strong';
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isStrong = emphasis === 'strong';
  const isMid = emphasis === 'mid';
  const valueColor =
    tone === 'alert'
      ? t.colors.status.danger.default
      : tone === 'positive'
        ? t.colors.action.text.default
        : t.colors.content.primary;
  return (
    <View style={[styles.balanceMathRow, isStrong && styles.balanceMathRowStrong]}>
      <Text
        style={[
          styles.balanceMathLabel,
          isMid && styles.balanceMathLabelMid,
          isStrong && styles.balanceMathLabelStrong,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.balanceMathValue,
          { color: valueColor },
          isMid && styles.balanceMathValueMid,
          isStrong && styles.balanceMathValueStrong,
        ]}
      >
        {sign ?? ''}{Math.abs(value).toLocaleString()}
        <Text style={styles.balanceMathUnit}> kcal</Text>
      </Text>
    </View>
  );
}

const WEEK_DAYS_JA = ['月', '火', '水', '木', '金', '土', '日'];
const TOLERANCE = 0.15;

function WeeklyRingsRow({
  today,
  viewedDate,
  logs,
  exerciseLogs,
  baseTargetKcal,
  profile,
  dailyActivities,
  carryoverDeductionKcal,
  onDayPress,
}: {
  today: Date;
  viewedDate: Date;
  logs: import('@/types/nutrition').FoodLog[];
  exerciseLogs: import('@/types/nutrition').ExerciseLog[];
  baseTargetKcal: number;
  profile: import('@/types/nutrition').UserProfile;
  dailyActivities?: import('@/types/nutrition').DailyActivitySummary[];
  carryoverDeductionKcal: number;
  onDayPress?: (dateKey: string) => void;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const weekDays = useMemo(() => {
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  const todayKey = formatDateKey(today);
  const viewedDateKey = formatDateKey(viewedDate);
  const baselineActiveKcal = useMemo(() => calcBaselineActiveKcal(profile), [profile]);

  return (
    <View style={styles.weeklyRingsRow}>
      {weekDays.map((day, i) => {
        const dk = formatDateKey(day);
        const isToday = dk === todayKey;
        const isViewed = dk === viewedDateKey;
        const isFuture = dk > todayKey;
        const consumed = sumForDate(logs, dk).kcal;
        // ホーム中央のリングと同じロジック (activityCtx + 当日のみcarryover控除) で目標を算出し、
        // 週次リング行と中央リングの進捗が食い違わないようにする。
        const da = (dailyActivities ?? []).find((d) => d.date === dk);
        const measuredActiveKcal = da
          ? da.activeKcal > 0
            ? da.activeKcal
            : stepsToActiveKcal(da.steps, profile.currentWeightKg)
          : null;
        const activityCtx = {
          measuredActiveKcal,
          baselineActiveKcal,
          rawActiveKcal: da?.activeKcal ?? 0,
        };
        const target = adjustedTargetKcal(baseTargetKcal, exerciseLogs, dk, activityCtx)
          - (isToday ? carryoverDeductionKcal : 0);

        const size = 36;
        const stroke = 5;
        const cx = size / 2;
        const r = (size - stroke) / 2;
        const circ = 2 * Math.PI * r;
        const rot = `rotate(-90 ${cx} ${cx})`;

        const ratio = !isFuture && consumed > 0 && target > 0 ? consumed / target : 0;
        const firstLap = Math.min(ratio, 1);
        const secondLap = ratio > 1 ? Math.min(ratio - 1, 1) : 0;
        const isPastTolerance = ratio > 1 + TOLERANCE;
        const progressColor = t.colors.nutrition.calorie.within.graphic;
        const toleranceColor = t.colors.nutrition.calorie.within.text;
        const overflowColor = t.colors.nutrition.calorie.severeExceed.graphic;

        // 今日 = ラベルをprimary色に（閲覧中かどうかに関わらず常時）、それ以外はneutral。
        // 閲覧中の日 = リング下にドット。ドット色は今日ならprimary、それ以外はsecondary。
        // 太さは状態に関わらず一定（統一した方が見やすいためバリエーションを廃止）。
        const labelColor = isToday ? t.colors.action.primary.default : t.colors.content.secondary;
        const dotColor = isToday ? t.colors.action.primary.default : t.colors.content.secondary;
        const fontSize = 11;

        const tappable = !isFuture;
        return (
          <Pressable
            key={dk}
            style={({ pressed }) => [styles.weeklyRingItem, pressed && tappable && { opacity: 0.6 }]}
            onPress={tappable ? () => onDayPress?.(dk) : undefined}
            accessibilityRole={tappable ? 'button' : undefined}
            accessibilityLabel={tappable ? `${WEEK_DAYS_JA[i]}曜日の記録を見る` : undefined}
          >
            <Svg width={size} height={size}>
              {/* track */}
              <Circle cx={cx} cy={cx} r={r} fill="none" stroke={t.colors.nutrition.calorie.track} strokeWidth={stroke} />
              {/* first lap */}
              {firstLap > 0 && (
                <Circle
                  cx={cx} cy={cx} r={r} fill="none"
                  stroke={progressColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  strokeDashoffset={circ * (1 - firstLap)}
                  transform={rot}
                />
              )}
              {/* overflow second lap（メインリングと同じ太さに統一） */}
              {secondLap > 0 && (
                <Circle
                  cx={cx} cy={cx} r={r} fill="none"
                  stroke={isPastTolerance ? overflowColor : toleranceColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  strokeDashoffset={circ * (1 - secondLap)}
                  transform={rot}
                />
              )}
              <SvgText
                x={cx}
                y={cx + fontSize * 0.38}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="600"
                fontFamily='PlusJakartaSans_400Regular, "Plus Jakarta Sans", -apple-system, sans-serif'
                fill={labelColor}
              >
                {WEEK_DAYS_JA[i]}
              </SvgText>
            </Svg>
            <View style={styles.weeklyRingDot}>
              {isViewed && <View style={[styles.weeklyRingDotInner, { backgroundColor: dotColor }]} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CarryoverDaySheet({
  visible,
  onClose,
  onConfirm,
  onCancel,
  surplusKcal,
  mode = 'start',
  initialDays,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
  onCancel?: () => void;
  surplusKcal: number;
  mode?: 'start' | 'edit';
  initialDays?: number;
}) {
  const t = useTheme();
  const { profile } = useAppState();
  const maxDays = 14;
  // hard床を割らない最小日数 (ユーザーが下回れないように−ボタンをブロックする境界)
  const hardMinDays = minCarryoverDays(profile.targetCalories, surplusKcal, maxDays);
  const defaultDays = initialDays != null
    ? Math.min(Math.max(hardMinDays, initialDays), maxDays)
    : Math.min(Math.max(hardMinDays, 7), maxDays);
  const [days, setDays] = useState(() => defaultDays);
  // hard境界で−を押したときだけ一時表示するエラーフラグ
  const [showHardError, setShowHardError] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setDays(initialDays != null
        ? Math.min(Math.max(hardMinDays, initialDays), maxDays)
        : Math.min(Math.max(hardMinDays, 7), maxDays));
      setShowHardError(false);
    }
  }, [visible, hardMinDays, maxDays, initialDays]);

  const perDay = Math.ceil(surplusKcal / days);
  const verdict = classifyCarryoverDeduction(profile.targetCalories, perDay, profile.biologicalBasis);

  const handleDecrement = useCallback(() => {
    if (days <= 1) return;
    const newDays = days - 1;
    const newPerDay = Math.ceil(surplusKcal / newDays);
    const newVerdict = classifyCarryoverDeduction(profile.targetCalories, newPerDay, profile.biologicalBasis);
    if (newVerdict === 'hard') {
      setShowHardError(true);
      return;
    }
    setShowHardError(false);
    setDays(newDays);
  }, [days, surplusKcal, profile.targetCalories, profile.biologicalBasis]);

  const handleIncrement = useCallback(() => {
    if (days >= maxDays) return;
    setShowHardError(false);
    setDays((d) => Math.min(maxDays, d + 1));
  }, [days, maxDays]);

  // インラインの注意 / エラー文言
  let warnText: string | null = null;
  let warnColor = t.colors.status.warning.default;
  if (showHardError) {
    const blocked = profile.targetCalories - Math.ceil(surplusKcal / (days - 1));
    warnText = `1日 ${blocked.toLocaleString()} kcal は健康的な目安を大きく下回るため設定できません`;
    warnColor = t.colors.status.danger.default;
  } else if (verdict === 'soft') {
    const effective = profile.targetCalories - perDay;
    const softFloor = carryoverSoftFloorKcal(profile.biologicalBasis);
    warnText = `1日 ${effective.toLocaleString()} kcal — 推奨される最低ライン（${softFloor.toLocaleString()} kcal）を下回ります`;
  }

  const canDecrease = days > 1;
  const canIncrease = days < maxDays;

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'edit' ? '調整プランを変更' : '帳尻調整プランを設定'}
      primaryAction={{
        label: mode === 'edit' ? '変更' : '開始',
        onPress: () => { onClose(); onConfirm(days); },
        disabled: verdict === 'hard',
      }}
      secondaryAction={mode === 'edit' && onCancel ? {
        label: 'プランをやめる',
        onPress: () => setCancelDialogVisible(true),
        destructive: true,
      } : undefined}
      scrollable={false}
    >
      <View style={{ gap: t.spacing['1'] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: t.spacing['2'] }}>
          <Label size="sm" tone="secondary">{mode === 'edit' ? '残り調整分' : '余剰カロリー'}</Label>
          <Body size="sm" weight="semibold">+{surplusKcal} kcal</Body>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border.subtle }} />
        <View style={{ paddingVertical: t.spacing['4'], alignItems: 'center', gap: t.spacing['2'] }}>
          <Label size="sm" tone="secondary">分割する日数</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['6'] }}>
            <Pressable
              onPress={handleDecrement}
              hitSlop={12}
              disabled={!canDecrease}
              style={({ pressed }) => ({
                width: 40, height: 40,
                borderRadius: t.radius.full,
                backgroundColor: !canDecrease ? t.colors.surface.sunken : pressed ? t.colors.surface.sunken : t.colors.surface.raised,
                alignItems: 'center', justifyContent: 'center',
              })}
              accessibilityLabel="日数を減らす"
            >
              <Icon name="remove" size={20} color={!canDecrease ? t.colors.content.disabled : t.colors.content.primary} />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: t.typography.fontSize['4xl'],
                fontWeight: t.typography.fontWeight.semibold as import('react-native').TextStyle['fontWeight'],
                color: t.colors.content.primary,
                lineHeight: t.typography.lineHeight['4xl'],
              }}>
                {days}
              </Text>
              <Caption tone="secondary">日間</Caption>
            </View>
            <Pressable
              onPress={handleIncrement}
              hitSlop={12}
              disabled={!canIncrease}
              style={({ pressed }) => ({
                width: 40, height: 40,
                borderRadius: t.radius.full,
                backgroundColor: !canIncrease ? t.colors.surface.sunken : pressed ? t.colors.surface.sunken : t.colors.surface.raised,
                alignItems: 'center', justifyContent: 'center',
              })}
              accessibilityLabel="日数を増やす"
            >
              <Icon name="add" size={20} color={!canIncrease ? t.colors.content.disabled : t.colors.content.primary} />
            </Pressable>
          </View>
          <Body size="sm" tone="secondary">
            1日あたり{' '}
            <Body size="sm" weight="semibold" tone="primary">{perDay} kcal</Body>
            {' '}ずつ差し引き
          </Body>
          {warnText ? (
            <Body size="sm" style={{ color: warnColor, textAlign: 'center', paddingHorizontal: t.spacing['4'] }}>
              {warnText}
            </Body>
          ) : null}
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border.subtle }} />
        <Body size="sm" tone="secondary" style={{ paddingTop: t.spacing['2'] }}>
          {mode === 'edit' ? '今日' : '明日'}から{days}日間、毎日の目標から{perDay} kcalを差し引きます。
        </Body>
      </View>
    </BottomSheet>
    <Dialog
      visible={cancelDialogVisible}
      onClose={() => setCancelDialogVisible(false)}
      title="調整プランをやめますか？"
      primaryAction={{
        label: 'やめる',
        onPress: () => { setCancelDialogVisible(false); onClose(); onCancel?.(); },
      }}
      secondaryAction={{
        label: '続ける',
        onPress: () => setCancelDialogVisible(false),
      }}
    >
      <Body size="sm" tone="secondary">
        残りの調整がキャンセルされ、毎日の目標カロリーが通常に戻ります。
      </Body>
    </Dialog>
    </>
  );
}

function CarryoverBanner({
  isNewPlan,
  surplusKcal,
  daysRemaining,
  onOpenSheet,
  onDismiss,
}: {
  isNewPlan: boolean;
  surplusKcal: number;
  daysRemaining: number;
  onOpenSheet: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.raised,
        borderRadius: t.radius.md,
        paddingHorizontal: t.spacing['4'],
        paddingTop: t.spacing['3'],
        paddingBottom: t.spacing['2'],
        marginBottom: t.spacing['2'],
      }}
      accessibilityRole="alert"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing['2'] }}>
        <Text style={{ fontSize: 14, lineHeight: 16 }}>🍽️</Text>
        <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
          <Label tone="primary">
            {isNewPlan
              ? '余剰カロリーを調整する'
              : `調整プラン 実行中 · 残り ${daysRemaining} 日`}
          </Label>
          {isNewPlan ? (
            <Body size="sm" tone="secondary">
              {`昨日+${surplusKcal}kcal超過。調整を始めますか？`}
            </Body>
          ) : null}
          <Pressable
            onPress={onOpenSheet}
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1, marginTop: t.spacing['0.5'] })}
            accessibilityRole="button"
            accessibilityLabel={isNewPlan ? '調整プランを設定する' : '調整プランを変更する'}
          >
            <Label size="sm" tone="link">
              {isNewPlan ? '設定する' : '変更'}
            </Label>
          </Pressable>
        </View>
        <IconButton icon="close" size="sm" tone="tertiary" onPress={onDismiss} accessibilityLabel="閉じる" />
      </View>
    </View>
  );
}

export const StatusCard = memo(function StatusCard({
  viewedDate,
  onFoodPress,
}: {
  viewedDate?: Date;
  /** 左「食事」エリアタップ時のコールバック (例: DayLogBottomSheet を half に展開) */
  onFoodPress?: () => void;
}) {
  const {
    profile, todayMacro, logs, exerciseLogs, dailyActivities, settings,
    yesterdayOvershootKcal,
    showCarryoverBanner, showNewPlanBanner,
    carryoverPlanActive, carryoverDayIndex, carryoverDeductionKcal,
    applyCarryover, cancelCarryoverPlan, dismissCarryoverBanner,
  } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { width: screenWidth } = useWindowDimensions();
  const [exerciseSheetVisible, setExerciseSheetVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [daySheetVisible, setDaySheetVisible] = useState(false);

  const today = useMemo(() => new Date(), []);
  const targetDate = viewedDate ?? today;
  const isToday = isSameDay(targetDate, today);
  const dateKey = formatDateKey(targetDate);
  const dayMacro = useMemo(
    () => (isToday ? todayMacro : sumForDate(logs, dateKey)),
    [isToday, todayMacro, logs, dateKey]
  );

  // 動的TDEE (PRD §6.4.3, v1.9): 当日の活動コンテキスト (ヘルス由来)。
  // 目標加算 = max(0, (歩数activeKcal − 活動係数想定) + 運動gross) を単一式で算出。
  const activityCtx = useMemo(() => {
    const baseline = calcBaselineActiveKcal(profile);
    const da = (dailyActivities ?? []).find((d) => d.date === dateKey);
    const measured = da
      ? da.activeKcal > 0
        ? da.activeKcal
        : stepsToActiveKcal(da.steps, profile.currentWeightKg)
      : null;
    return {
      measuredActiveKcal: measured,
      baselineActiveKcal: baseline,
      rawActiveKcal: da?.activeKcal ?? 0,
    };
  }, [profile, dailyActivities, dateKey]);

  // 表示中の日付に対する目標・消費・PFC をその日の運動ログ + 活動量から算出する。
  // 今日 / 過去日とも同じロジック (運動を記録した過去日も目標が拡大する)。
  // 今日かつ帳尻調整が有効な場合は carryoverDeductionKcal を差し引く。
  const effectiveTarget = useMemo(
    () => adjustedTargetKcal(profile.targetCalories, exerciseLogs, dateKey, activityCtx)
      - (isToday ? carryoverDeductionKcal : 0),
    [profile.targetCalories, exerciseLogs, dateKey, activityCtx, isToday, carryoverDeductionKcal]
  );
  const effectiveExerciseKcal = useMemo(
    () => Math.round(
      getTdeeExerciseKcalForDate(exerciseLogs, dateKey, activityCtx.rawActiveKcal ?? 0) +
      (activityCtx.measuredActiveKcal ?? 0)
    ),
    [exerciseLogs, dateKey, activityCtx]
  );
  const effectivePfc = useMemo(() => {
    const base = profile.targetCalories;
    if (base <= 0) return { protein: profile.targetProtein, fat: profile.targetFat, carbs: profile.targetCarbs };
    const ratio = effectiveTarget / base;
    return {
      protein: Math.round(profile.targetProtein * ratio),
      fat: Math.round(profile.targetFat * ratio),
      carbs: Math.round(profile.targetCarbs * ratio),
    };
  }, [profile, effectiveTarget]);

  const openExerciseSheet = useCallback(() => setExerciseSheetVisible(true), []);
  const closeExerciseSheet = useCallback(() => setExerciseSheetVisible(false), []);

  // edit時: 今日を含む残り日数と、その分の残余負債 (= 残り日数 × 現在の日割り額)
  const carryoverRemainingDays = carryoverPlanActive
    ? Math.max(1, (settings.kcalCarryoverDaysTotal ?? 0) - carryoverDayIndex + 1)
    : 0;
  const carryoverEditSurplus = (settings.kcalCarryoverDailyAmount ?? 0) * carryoverRemainingDays;

  // 画面幅に比例した可変リング径 (120–180 でクランプ)。
  const ringSize = Math.round(Math.min(180, Math.max(120, screenWidth * 0.38)));
  const ringStroke = Math.round(ringSize * 0.11);

  return (
    <View style={styles.statusCard}>
      {isToday && showCarryoverBanner ? (
        <CarryoverBanner
          isNewPlan={showNewPlanBanner}
          surplusKcal={yesterdayOvershootKcal}
          daysRemaining={(settings.kcalCarryoverDaysTotal ?? 0) - carryoverDayIndex}
          onOpenSheet={() => setDaySheetVisible(true)}
          onDismiss={dismissCarryoverBanner}
        />
      ) : null}
      <CarryoverDaySheet
        visible={daySheetVisible}
        onClose={() => setDaySheetVisible(false)}
        onConfirm={(days) => applyCarryover(days, carryoverPlanActive ? carryoverEditSurplus : undefined)}
        onCancel={cancelCarryoverPlan}
        surplusKcal={carryoverPlanActive ? carryoverEditSurplus : yesterdayOvershootKcal}
        mode={carryoverPlanActive ? 'edit' : 'start'}
        initialDays={carryoverPlanActive ? carryoverRemainingDays : undefined}
      />
      {/* 3-column: 食事 | Ring(残り) | 消費 */}
      <View style={styles.ringRow}>
        {/* Left: 食事 (タップで食事ログシート half) */}
        <Pressable
          style={({ pressed }) => [styles.sideColumn, pressed && styles.sideColumnPressed]}
          onPress={onFoodPress}
          testID="status-food-area"
          accessibilityRole="button"
          accessibilityLabel="食事ログを開く"
          accessibilityHint="今日の食事ログを開きます"
          disabled={!onFoodPress}
        >
          <View style={styles.sideLabelRow}>
            {/* 左に同サイズの透明スペーサーを置いてラベルを視覚的に中央寄せ */}
            <View style={styles.sideLabelChevronSpacer} />
            <Label size="sm" tone="secondary">食事</Label>
            <Icon name="chevronRight" size={12} color={t.colors.content.secondary} />
          </View>
          <Text style={styles.sideValue}>{Math.round(dayMacro.kcal).toLocaleString()}</Text>
          <Text style={styles.sideUnit}>kcal</Text>
        </Pressable>

        {/* Center: Ring (タップで収支表示) */}
        <Pressable
          onPress={() => setBalanceVisible(true)}
          testID="status-ring-area"
          accessibilityRole="button"
          accessibilityLabel="今日の収支を表示"
          accessibilityHint="食事と消費の内訳を表示します"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <CalorieOverflowRing
            consumedKcal={dayMacro.kcal}
            targetKcal={effectiveTarget}
            size={ringSize}
            strokeWidth={ringStroke}
            statusMode="auto"
            centerMode="remaining"
            showStatusText={false}
          />
        </Pressable>

        {/* Right: 消費 (タップで運動シート) */}
        <Pressable
          style={({ pressed }) => [styles.sideColumn, pressed && styles.sideColumnPressed]}
          onPress={openExerciseSheet}
          testID="exercise-add-button"
          accessibilityRole="button"
          accessibilityLabel="消費の詳細を見る"
          accessibilityHint="今日の運動履歴と追加のシートを開きます"
        >
          <View style={styles.sideLabelRow}>
            <View style={styles.sideLabelChevronSpacer} />
            <Label size="sm" tone="secondary">消費</Label>
            <Icon name="chevronRight" size={12} color={t.colors.content.secondary} />
          </View>
          <Text style={styles.sideValue}>{effectiveExerciseKcal > 0 ? effectiveExerciseKcal.toLocaleString() : '—'}</Text>
          <Text style={styles.sideUnit}>kcal</Text>
        </Pressable>
      </View>

      {/* PFC mini bars */}
      <View style={styles.pfcMiniRow}>
        <MiniProgressBar
          letter="P"
          label="タンパク質"
          current={dayMacro.protein}
          target={effectivePfc.protein}
          textColor={t.colors.nutrition.protein.text}
          graphicColor={t.colors.nutrition.protein.graphic}
          trackColor={t.colors.nutrition.protein.background}
        />
        <MiniProgressBar
          letter="F"
          label="脂肪"
          current={dayMacro.fat}
          target={effectivePfc.fat}
          textColor={t.colors.nutrition.fat.text}
          graphicColor={t.colors.nutrition.fat.graphic}
          trackColor={t.colors.nutrition.fat.background}
        />
        <MiniProgressBar
          letter="C"
          label="炭水化物"
          current={dayMacro.carbs}
          target={effectivePfc.carbs}
          textColor={t.colors.nutrition.carbs.text}
          graphicColor={t.colors.nutrition.carbs.graphic}
          trackColor={t.colors.nutrition.carbs.background}
        />
      </View>

      <ExerciseSheet visible={exerciseSheetVisible} onClose={closeExerciseSheet} dateKey={dateKey} />
      <BalanceModal
        visible={balanceVisible}
        onClose={() => setBalanceVisible(false)}
        baseTargetKcal={profile.targetCalories}
        adjustedTargetKcal={effectiveTarget}
        consumedKcal={Math.round(dayMacro.kcal)}
        /* 目標加算 = max(0, (歩数activeKcal − 活動係数想定) + 運動gross)。
         * adjustedTarget - baseTarget がその最終加算分 (PRD §6.4.3, v1.9)。
         * carryoverDeduction を除いて運動加算分のみを渡す。 */
        exerciseAdded={Math.max(0, effectiveTarget + carryoverDeductionKcal - profile.targetCalories)}
        addedLabel="活動・運動"
        activityLevelLabel={
          ACTIVITY_LEVEL_OPTIONS.find((a) => a.level === profile.activityLevel)?.label ?? null
        }
        carryoverPlanActive={isToday && carryoverPlanActive}
        carryoverDeductionKcal={isToday ? carryoverDeductionKcal : 0}
        carryoverDaysTotal={isToday ? (settings.kcalCarryoverDaysTotal ?? 0) : 0}
        carryoverDayIndex={isToday ? carryoverDayIndex : 0}
        yesterdayOvershootKcal={isToday ? yesterdayOvershootKcal : 0}
        onApplyCarryover={() => { setBalanceVisible(false); setDaySheetVisible(true); }}
        onCancelCarryoverPlan={cancelCarryoverPlan}
      />
    </View>
  );
});

function MacroPill({ label, value, macro }: { label: string; value: number; macro: 'protein' | 'fat' | 'carbs' }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const tone = t.colors.nutrition[macro];
  return (
    <View style={[styles.macroPill, { backgroundColor: tone.background }]}>
      <Text style={[styles.macroPillLabel, { color: tone.text }]}>{label}</Text>
      <Text style={[styles.macroPillValue, { color: tone.text }]}>{Math.round(value)}</Text>
    </View>
  );
}

/**
 * FloatingFeedback — post-save confirmation bubble at the calorie-ring
 * position (top: 340). Green sageDeep, slide-up spring animation.
 *
 * The pre-save live preview is rendered by `LivePreviewOverlay` (in
 * IdentityLogSheet.tsx) on a separate higher-z Modal layer so it stays
 * visible above the open BottomSheet.
 */
export const FloatingFeedback = memo(function FloatingFeedback() {
  const { feedback } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  // feedback が null に戻った後も退場アニメーションが終わるまで直前の内容を保持する。
  // ただし表示条件自体は feedback (実データ) を優先し、View は feedback が真になった
  // 瞬間の render で即マウントする (effect 内で state を立ててから mount すると
  // アニメーション開始が View 未マウントのタイミングと重なり、進行しない)。
  const [content, setContent] = useState<typeof feedback>(null);

  useEffect(() => {
    if (feedback) {
      opacity.setValue(0);
      translateY.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: duration.fast, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: -16, useNativeDriver: true, ...spring.pop }),
      ]).start();
      return;
    }
    // 退場: M3 Emphasized Accelerate でシンプルにフェードアウト (duration.short)。
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration.short,
      easing: Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setContent(null);
    });
  }, [feedback, opacity, translateY]);

  const active = feedback ?? content;
  if (feedback && feedback !== content) setContent(feedback);
  if (!active) return null;

  const label = active.label;
  const macro = active.macro;
  const bubbleStyle = styles.feedbackBubble;
  const labelStyle = styles.feedbackText;
  const macroStyle = styles.feedbackMacro;

  return (
    <Animated.View
      style={[bubbleStyle, { opacity, transform: [{ translateY }] }]}
      testID="floating-feedback"
      pointerEvents="none"
    >
      <Text style={labelStyle}>{label}</Text>
      <Text style={[macroStyle, { color: t.colors.content.inverseSecondary }]}>{formatMacroText(macro)}</Text>
    </Animated.View>
  );
});

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog } = useAppState();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  // undoState が null に戻った後も退場アニメーションが終わるまで直前の内容を保持する。
  // 表示条件は undoState (実データ) を優先し、View は undoState が真になった瞬間の
  // render で即マウントする (effect 内で state を立ててから mount すると
  // アニメーション開始が View 未マウントのタイミングと重なり、進行しない)。
  const [content, setContent] = useState<typeof undoState>(null);

  useEffect(() => {
    if (undoState) {
      opacity.setValue(0);
      translateY.setValue(16);
      // 入場: M3 Emphasized Decelerate で下から浮き上がる (duration.medium)。
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration.medium,
          easing: Easing.bezier(...easing.enter),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.medium,
          easing: Easing.bezier(...easing.enter),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    // 退場: M3 Emphasized Accelerate でシンプルにフェードアウト (duration.short)。
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration.short,
      easing: Easing.bezier(...easing.exit),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setContent(null);
    });
  }, [undoState, opacity, translateY]);

  const active = undoState ?? content;
  if (undoState && undoState !== content) setContent(undoState);
  if (!active) return null;

  return (
    <Animated.View
      style={[
        styles.undoToast,
        { backgroundColor: t.colors.surface.inverse, opacity, transform: [{ translateY }] },
      ]}
      testID="undo-toast"
    >
      <View>
        <Text style={styles.undoTitle}>{active.log.categoryLabel} を記録しました</Text>
        <Text style={[styles.undoText, { color: t.colors.content.inverseSecondary }]}>必要なら元に戻せます</Text>
      </View>
      <Pressable onPress={undoLastLog} testID="undo-button">
        <Text style={[styles.undoAction, { color: t.colors.action.text.onInverse }]}>取り消す</Text>
      </Pressable>
    </Animated.View>
  );
});

export const LogEditorSheet = memo(function LogEditorSheet() {
  const { editorLog, setEditorLogId, updateDishLog, updateIngredientLog, deleteLog, editorIsPending, commitPendingLog, cancelPendingLog } = useAppState();

  const handleClose = () => {
    if (editorLog && editorIsPending) {
      cancelPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDone = () => {
    if (editorLog && editorIsPending) {
      commitPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDelete = () => {
    if (!editorLog) return;
    if (editorIsPending) {
      cancelPendingLog(editorLog.id);
    } else {
      deleteLog(editorLog.id);
    }
    setEditorLogId(null);
  };
  const ingredientDraft = useMemo<IngredientDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'ingredient') return null;
    return draftFromLog(editorLog);
  }, [editorLog]);
  const dishDraft = useMemo<DishDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'dish') return null;
    return {
      categoryKey: editorLog.categoryKey,
      subTypeKey: editorLog.subTypeKey,
      additions: editorLog.additions ?? [],
      size: editorLog.size ?? 'regular',
    };
  }, [editorLog]);

  // editorLog が null になっても BottomSheet を即時 unmount しないことで退場アニメ
  // を完走させる。BottomSheet 内部で children をキャッシュしているのでここでは
  // 「visible=false の間も最後の編集対象を渡す」必要はないが、props の参照崩れ
  // を避けるため早期 return しない。
  const visible = editorLog != null;
  const log = editorLog; // 早期 return 削除に伴い nullable アクセスを許容
  const title = log
    ? editorIsPending
      ? log.mode === 'ingredient' ? '食材を追加' : '料理を追加'
      : log.mode === 'ingredient' ? '食材を編集' : '料理を編集'
    : '';

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={title}
      secondaryAction={{
        label: editorIsPending ? 'キャンセル' : '削除',
        onPress: handleDelete,
      }}
      primaryAction={{
        label: editorIsPending ? '追加' : '完了',
        onPress: handleDone,
      }}
      testID="log-editor-sheet"
    >
      {log?.mode === 'ingredient' && ingredientDraft ? (
        <IngredientEditorContent
          draft={ingredientDraft}
          onChange={(next) => updateIngredientLog(log.id, next)}
        />
      ) : null}
      {log?.mode === 'dish' && dishDraft ? (
        <DishEditorContent
          draft={dishDraft}
          onChange={(next) => updateDishLog(log.id, next)}
        />
      ) : null}
    </BottomSheet>
  );
});

function IngredientEditorContent({ draft, onChange }: { draft: IngredientDraft; onChange: (draft: IngredientDraft) => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const categories = getQuickCategories('ingredient');
  const currentCategory = categories.find((item) => item.key === draft.categoryKey);
  const subtypeDefs = getIngredientSubtypeDefs(draft.categoryKey);
  const subtype = getIngredientSubtypeDef(draft.categoryKey, draft.subTypeKey);
  const toppings = getToppingsForSubtype(subtype);
  const computation = computeIngredient(draft);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);

  const handleCategoryChange = (key: string) => {
    const nextDefs = getIngredientSubtypeDefs(key);
    const nextSubKey = nextDefs[0]?.key ?? '';
    onChange({ categoryKey: key, subTypeKey: nextSubKey, portionValue: draft.portionValue, toppingKeys: [] });
    setCategoryOpen(false);
  };

  const handleSubtypeChange = (key: string) => {
    const nextSub = getIngredientSubtypeDef(draft.categoryKey, key);
    const availableKeys = (nextSub?.toppings ?? []).map((t) => t.key);
    const nextToppingKeys = draft.toppingKeys.filter((k) => availableKeys.includes(k));
    onChange({ ...draft, subTypeKey: key, toppingKeys: nextToppingKeys });
  };

  const handlePortionChange = (portion: PortionValue) => {
    onChange({ ...draft, portionValue: portion });
  };

  const handleToggleTopping = (key: string) => {
    const next = draft.toppingKeys.includes(key)
      ? draft.toppingKeys.filter((k) => k !== key)
      : [...draft.toppingKeys, key];
    onChange({ ...draft, toppingKeys: next });
  };

  const toppingSummary = summarizeToppings(computation.toppings);

  return (
    <View style={styles.editorSection}>
      <Pressable
        style={styles.categoryRow}
        onPress={() => setCategoryOpen((v) => !v)}
        testID="ingredient-category-row"
      >
        <Text style={styles.categoryRowLabel}>カテゴリ</Text>
        <View style={styles.categoryRowValue}>
          <Text style={styles.categoryRowValueText}>
            {currentCategory ? `${currentCategory.emoji} ${currentCategory.label}` : '—'}
          </Text>
          <Icon name="chevronDown" size={14} color={t.colors.content.secondary} />
        </View>
      </Pressable>
      {categoryOpen ? (
        <View style={styles.categoryDropdown}>
          {categories.map((item) => {
            const active = item.key === draft.categoryKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleCategoryChange(item.key)}
                style={[styles.categoryOption, active ? styles.categoryOptionActive : null]}
                testID={`ingredient-category-option-${item.key}`}
              >
                <Text style={[styles.categoryOptionText, active ? styles.categoryOptionTextActive : null]}>
                  {item.emoji} {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {subtypeDefs.length > 0 ? (
        <View style={styles.subSection}>
          <Caption tone="secondary" style={styles.editorSectionTitle}>種類</Caption>
          <View style={styles.optionWrap}>
            {subtypeDefs.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={draft.subTypeKey === item.key}
                onPress={() => handleSubtypeChange(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.portionSection}>
        <View style={styles.portionHeader}>
          <Text style={styles.portionTitle}>食べた量</Text>
          <Badge tone="brand">{draft.portionValue}x</Badge>
        </View>
        <Text style={styles.portionNowLine} numberOfLines={1} testID="ingredient-portion-label">
          {computation.portionDisplay.primaryLabel}
          <Text style={styles.portionNowLineMuted}>  ·  {computation.portionDisplay.secondaryLabel}</Text>
        </Text>
        <PortionSlider value={draft.portionValue} onChange={handlePortionChange} />
      </View>

      {toppings.length > 0 ? (
        <View style={styles.subSection}>
          <Caption tone="secondary" style={styles.editorSectionTitle}>トッピング</Caption>
          <View style={styles.optionWrap}>
            {toppings.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={draft.toppingKeys.includes(item.key)}
                onPress={() => handleToggleTopping(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <IngredientPreviewCard
        subLabel={subtype?.label ?? currentCategory?.label ?? ''}
        portionLabel={computation.portionDisplay.primaryLabel}
        portionSecondary={computation.portionDisplay.secondaryLabel}
        toppingSummary={toppingSummary}
        macro={computation.total}
      />
    </View>
  );
}

function PortionSlider({ value, onChange }: { value: PortionValue; onChange: (portion: PortionValue) => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const points = portionSnapPoints;
  const minVal = points[0];
  const maxVal = points[points.length - 1];
  const range = maxVal - minVal;
  const ratio = trackWidth > 0 ? (value - minVal) / range : 0;
  const thumbX = ratio * trackWidth;

  const snapFromX = (x: number): PortionValue => {
    if (trackWidth <= 0) return value;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    const raw = minVal + (clampedX / trackWidth) * range;
    return clampPortion(raw);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
        onPanResponderMove: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackWidth, value]
  );

  return (
    <View style={styles.sliderWrap}>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        testID="portion-slider"
      >
        <View style={[styles.sliderFill, { width: thumbX }]} />
        {points.map((p) => {
          const left = trackWidth > 0 ? ((p - minVal) / range) * trackWidth : 0;
          const active = p <= value;
          return (
            <View
              key={p}
              style={[
                styles.sliderTick,
                { left: left - 3 },
                active ? styles.sliderTickActive : null,
              ]}
            />
          );
        })}
        <View style={[styles.sliderThumb, { left: thumbX - 14 }]} pointerEvents="none" />
      </View>
      <View style={styles.sliderLabelsRow}>
        {points.map((p) => (
          <Pressable
            key={p}
            onPress={() => onChange(p as PortionValue)}
            style={styles.sliderLabelTap}
            testID={`portion-snap-${p}`}
          >
            <Text style={[styles.sliderLabelText, p === value ? styles.sliderLabelTextActive : null]} numberOfLines={1}>
              {p}x
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function IngredientPreviewCard({ subLabel, portionLabel, portionSecondary, toppingSummary, macro }: { subLabel: string; portionLabel: string; portionSecondary?: string; toppingSummary: string | null; macro: Macro }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>プレビュー</Text>
      <Text style={styles.previewSummaryText} numberOfLines={2}>
        {subLabel}
        <Text style={styles.previewSummaryDivider}>  ·  </Text>
        {portionLabel}
        {toppingSummary ? (
          <>
            <Text style={styles.previewSummaryDivider}>  ·  </Text>
            {toppingSummary}
          </>
        ) : null}
      </Text>
      {portionSecondary ? (
        <Text style={styles.previewSummarySecondary}>{portionSecondary}</Text>
      ) : null}
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} macro="protein" />
        <MacroPill label="F" value={macro.fat} macro="fat" />
        <MacroPill label="C" value={macro.carbs} macro="carbs" />
      </View>
    </View>
  );
}

function DishEditorContent({ draft, onChange }: { draft: DishDraft; onChange: (draft: DishDraft) => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const categories = getQuickCategories('dish');
  const subtypes = getSubtypes('dish', draft.categoryKey);
  const preview = buildDishMacro(draft);

  return (
    <View style={styles.editorSection}>
      <Caption tone="secondary" style={styles.editorSectionTitle}>種類</Caption>
      <View style={styles.optionWrap}>
        {categories.map((item) => (
          <Chip key={item.key} label={`${item.emoji} ${item.label}`} active={draft.categoryKey === item.key} onPress={() => onChange({ ...draft, categoryKey: item.key, subTypeKey: undefined })} />
        ))}
      </View>
      {subtypes.length > 0 ? (
        <>
          <Caption tone="secondary" style={styles.editorSectionTitle}>味・タイプ</Caption>
          <View style={styles.optionWrap}>
            {subtypes.map((item) => (
              <Chip key={item.key} label={item.label} active={draft.subTypeKey === item.key} onPress={() => onChange({ ...draft, subTypeKey: item.key })} />
            ))}
          </View>
        </>
      ) : null}
      <Caption tone="secondary" style={styles.editorSectionTitle}>高影響追加</Caption>
      <View style={styles.optionWrap}>
        {additionPresets.map((item) => {
          const active = draft.additions.includes(item.key);
          return (
            <Chip
              key={item.key}
              label={item.label}
              active={active}
              onPress={() => {
                if (active) {
                  onChange({ ...draft, additions: draft.additions.filter((value) => value !== item.key) });
                  return;
                }
                if (draft.additions.length >= 2) {
                  return;
                }
                onChange({ ...draft, additions: [...draft.additions, item.key] });
              }}
            />
          );
        })}
      </View>
      <Caption tone="secondary" style={styles.editorSectionTitle}>サイズ</Caption>
      <View style={styles.optionWrap}>
        {sizeOptions.map((size) => (
          <Chip key={size} label={size} active={draft.size === size} onPress={() => onChange({ ...draft, size: size as DishSize })} />
        ))}
      </View>
      <PreviewCard macro={preview} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function PreviewCard({ macro }: { macro: Macro }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>プレビュー</Text>
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} macro="protein" />
        <MacroPill label="F" value={macro.fat} macro="fat" />
        <MacroPill label="C" value={macro.carbs} macro="carbs" />
      </View>
    </View>
  );
}

void PreviewCard;
void getSubtypes;

export function HomeScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [viewedDate, setViewedDate] = useState<Date>(() => new Date());
  const dayLogSheetRef = useRef<DayLogBottomSheetRef>(null);
  const homeDatePagerRef = useRef<HomeDatePagerRef>(null);
  const openDayLogSheet = useCallback(() => {
    dayLogSheetRef.current?.snapToHalf();
  }, []);
  const { logs, exerciseLogs, profile, dailyActivities, carryoverDeductionKcal } = useAppState();
  const today = useMemo(() => new Date(), []);
  // router.push によるページ遷移風の切り替えではなく、pager のスワイプと同じ
  // 横スライドで移動させる (WeeklyRingsRow の曜日タップ)。
  const handleDayPress = useCallback((dateKey: string) => {
    homeDatePagerRef.current?.jumpToDate(new Date(dateKey));
  }, []);

  // 画面フォーカス時 (タブ切替・他画面からの復帰・初回マウント含む) に、
  // スロットルを満たしていれば軽量に再同期する。バックグラウンド往復なしで
  // アプリ内に留まったまま Health 側のデータが更新されたケースを拾う。
  const healthSync = useHealthSyncContext();
  useFocusEffect(
    useCallback(() => {
      healthSync.syncIfDue().catch(() => undefined);
    }, [healthSync])
  );

  return (
    <View style={styles.page} testID="home-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <Header viewedDate={viewedDate} />
          <WeeklyRingsRow
            today={today}
            viewedDate={viewedDate}
            logs={logs}
            exerciseLogs={exerciseLogs}
            baseTargetKcal={profile.targetCalories}
            profile={profile}
            dailyActivities={dailyActivities}
            carryoverDeductionKcal={carryoverDeductionKcal}
            onDayPress={handleDayPress}
          />
        </View>
        <HomeDatePager ref={homeDatePagerRef} onViewedDateChange={setViewedDate} onFoodPress={openDayLogSheet} />
      </SafeAreaView>
      <DayLogBottomSheet ref={dayLogSheetRef} viewedDate={viewedDate} />
      <FloatingFeedback />
      <UndoToast />
      <LogEditorSheet />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.surface.default },
  safeArea: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  // 左右非対称 (avatar 42px vs icon×2 + gap 92px) でも center を視覚的に中央寄せするため、
  // headerCenter は absolute positioning。pointerEvents="none" でタップ素通り。
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDate: { fontSize: fs.md, fontWeight: '700', color: t.colors.action.primary.default },
  // トライアル残り≤2日で表示するバッジ (右上の小さい丸)
  avatarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: radius.full,
    backgroundColor: t.colors.status.danger.default,
    borderWidth: 2,
    borderColor: t.colors.surface.default,
  },
  statusCard: { paddingVertical: 4, gap: 16 },
  weeklyRingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  weeklyRingItem: { alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, borderRadius: radius.md },
  weeklyRingDot: { height: 5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weeklyRingDotInner: { width: 4, height: 4, borderRadius: 2 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideColumn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: radius.md },
  sideColumnPressed: { opacity: 0.6 },
  sideLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'center' },
  /** chevron と同幅の透明スペーサーで Label を視覚的に中央寄せ */
  sideLabelChevronSpacer: { width: 12 + 2 /* chevron size + gap */ },
  sideValue: { fontSize: fs.lg, fontWeight: '700', color: t.colors.content.primary, letterSpacing: ls.tight },
  sideUnit: { fontSize: fs.xs, fontWeight: '500', color: t.colors.content.secondary },
  balanceCloseButton: {
    alignSelf: 'flex-end',
  },
  /** HERO: 残り N kcal (主役、最大の数字) */
  balanceHero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  // 52px はアプリ最大の文字。display(44px)と同様、既存スケールに収まらない
  // 意図的なヒーロー例外として扱う (収支の残り/オーバー kcal を大きく見せる用途)。
  // letterSpacing も display 級の詰めが必要なため tokens の tighter(-0.8) を
  // さらに超える -1.5 を意図的に採用している。
  balanceHeroValue: {
    fontSize: 52,
    fontWeight: '700',
    color: t.colors.content.primary,
    letterSpacing: -1.5,
    lineHeight: 56,
    marginTop: 4,
  },
  // 52px の値に添える単位 = Caption 相当
  balanceHeroUnit: {
    fontSize: fs.xs,
    fontWeight: '500',
    color: t.colors.content.secondary,
    marginTop: -2,
    letterSpacing: ls.wider,
  },
  /** 進捗バー */
  balanceProgressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  balanceProgressFill: { height: '100%', borderRadius: radius.full },
  /** 計算式ブロック (常に表示) */
  balanceMath: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border.default,
    gap: 12,
  },
  balanceMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceMathRowStrong: { paddingTop: 2 },
  /** Tier 3: 通常ラベル (muted, regular) */
  balanceMathLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '500' },
  /** Tier 2 emphasis: 中間結果ラベル (text色, medium) */
  balanceMathLabelMid: { color: t.colors.content.primary, fontWeight: '600', fontSize: fs.sm },
  /** Tier 1 emphasis: 最終結果ラベル (text色, bold) */
  balanceMathLabelStrong: { color: t.colors.content.primary, fontWeight: '700', fontSize: fs.md },
  /** Tier 2: 通常値 (text色, medium) */
  balanceMathValue: { fontSize: fs.md, fontWeight: '500', letterSpacing: ls.tight },
  /** Tier 2 emphasis: 中間結果値 (semibold, slightly larger) */
  balanceMathValueMid: { fontSize: fs.md, fontWeight: '700' },
  /** Tier 1 emphasis: 最終結果値 (bold, largest) */
  balanceMathValueStrong: { fontSize: fs.xl, fontWeight: '700', letterSpacing: ls.tight },
  balanceMathUnit: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '500' },
  /** Tier 3: ベース目標の補足 (運動習慣ラベル) */
  balanceMathSubtitle: {
    fontSize: fs.xs,
    color: t.colors.content.secondary,
    marginTop: -4,
    marginBottom: 2,
    opacity: 0.85,
  },
  balanceMathDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.border.default,
    marginVertical: 2,
  },
  carryoverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  carryoverToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  carryoverToggleLabel: { fontSize: fs.sm, fontWeight: '600', flex: 1 },
  pfcMiniRow: { flexDirection: 'row', gap: 12, marginHorizontal: 12 },
  miniBarItem: { flex: 1, gap: 4 },
  miniBarLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '600' },
  miniBarLetter: { fontWeight: '700' },
  miniBarTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: radius.full },
  miniBarValue: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  miniBarValueTarget: { color: t.colors.content.secondary, fontWeight: '600' },
  macroPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.full },
  macroPillLabel: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '700' },
  macroPillValue: { fontSize: fs.xs, color: t.colors.content.primary, fontWeight: '700' },
  feedbackBubble: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: t.colors.action.primary.default, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.xl, alignItems: 'center', ...elevation.lg, shadowColor: t.colors.action.primary.default },
  feedbackText: { color: t.colors.content.onAction, fontSize: fs.md, fontWeight: '700' },
  feedbackMacro: { fontSize: fs.sm, marginTop: 2 },
  // Live preview state (sheet open, before save). Same position as feedbackBubble
  // but cream/sage-pale to read as "tentative". Pointer-events disabled so it
  // doesn't intercept taps on the open sheet.
  undoToast: { position: 'absolute', left: 18, right: 18, bottom: 24, borderRadius: radius.xl, paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  undoTitle: { color: t.colors.content.onAction, fontSize: fs.md, fontWeight: '700' },
  undoText: { fontSize: fs.sm, marginTop: 4 },
  undoAction: { fontSize: fs.md, fontWeight: '700' },
  goalMacroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  editorSection: { gap: 12 },
  editorSectionTitle: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.full, backgroundColor: t.colors.surface.raised },
  chipActive: { backgroundColor: t.colors.action.primary.default },
  chipText: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  chipTextActive: { color: t.colors.content.onAction },
  previewCard: { backgroundColor: t.colors.surface.raised, borderRadius: radius['2xl'], padding: 16, gap: 12 },
  previewTitle: { fontSize: fs.sm, color: t.colors.content.secondary },
  previewSummaryText: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '600', lineHeight: 20 },
  previewSummaryDivider: { color: t.colors.content.secondary, fontWeight: '400' },
  previewSummarySecondary: { fontSize: fs.sm, color: t.colors.content.secondary, marginTop: -2 },
  previewCalories: { fontSize: fs['3xl'], fontWeight: '700', color: t.colors.action.primary.default },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.surface.raised, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  categoryRowLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '600' },
  categoryRowValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryRowValueText: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '700' },
  categoryDropdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: t.colors.surface.raised, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: t.colors.border.default },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: t.colors.surface.raised },
  categoryOptionActive: { backgroundColor: t.colors.action.primary.default },
  categoryOptionText: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  categoryOptionTextActive: { color: t.colors.content.onAction },
  subSection: { gap: 12, marginTop: 4 },
  portionSection: { backgroundColor: t.colors.surface.raised, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: t.colors.border.default },
  portionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portionTitle: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  portionNowLine: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '700', marginTop: 2 },
  portionNowLineMuted: { color: t.colors.content.secondary, fontWeight: '500', fontSize: fs.sm },
  sliderWrap: { paddingTop: 12, paddingBottom: 4 },
  sliderTrack: { height: 36, justifyContent: 'center', borderRadius: radius.full },
  sliderFill: { position: 'absolute', left: 0, height: 6, backgroundColor: t.colors.action.text.default, borderRadius: radius.full, top: 15 },
  sliderTick: { position: 'absolute', width: 6, height: 6, borderRadius: radius.full, backgroundColor: t.colors.surface.sunken, top: 15 },
  sliderTickActive: { backgroundColor: t.colors.action.primary.default },
  sliderThumb: { position: 'absolute', width: 28, height: 28, borderRadius: radius.full, backgroundColor: t.colors.content.onAction, borderWidth: 2, borderColor: t.colors.action.primary.default, top: 4, ...elevation.sm },
  sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderLabelTap: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  sliderLabelText: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '600' },
  sliderLabelTextActive: { color: t.colors.action.primary.default, fontWeight: '700' },
});
