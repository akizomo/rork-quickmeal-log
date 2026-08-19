import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { MiniProgressBar } from '@/components/MiniProgressBar';
import { ACTIVITY_LEVEL_I18N_KEY, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { Body, BottomSheet, Button, Caption, Dialog, Icon, IconButton, Label, useTheme, type Theme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { useRouter } from 'expo-router';
import { adjustedTargetKcal, calcBaselineActiveKcal, carryoverSoftFloorKcal, classifyCarryoverDeduction, getAdjustedPfcForDate, getEffectiveSubscriptionStatus, getTdeeExerciseKcalForDate, minCarryoverDays, stepsToActiveKcal, trialDaysRemaining } from '@/utils/goals';
import { formatDateKey, formatMacroText } from '@/utils/nutrition';
import { isSameDay, sumForDate } from '@/utils/history';
import { computeWeeklyRecap } from '@/utils/weekly-recap';

// 水玉の装飾。コーナーに近いほど大きく、内側 (テキスト側) に向かって縮む。
// 1粒だけ薄く抜くのは Logo マーク自身の「20%不透明の8番目のドット」へのオマージュ。
const RECAP_TEASER_DOTS: { cx: number; cy: number; r: number; opacity: number }[] = [
  { cx: 12, cy: 8, r: 4, opacity: 0.16 },
  { cx: 46, cy: 10, r: 6, opacity: 0.2 },
  { cx: 82, cy: 8, r: 8, opacity: 0.24 },
  { cx: 120, cy: 10, r: 10, opacity: 0.26 },
  { cx: 158, cy: 10, r: 13, opacity: 0.28 },
  { cx: 30, cy: 44, r: 5, opacity: 0.14 },
  { cx: 66, cy: 46, r: 7, opacity: 0.09 },
  { cx: 104, cy: 44, r: 9, opacity: 0.25 },
  { cx: 142, cy: 46, r: 12, opacity: 0.27 },
  { cx: 12, cy: 80, r: 4, opacity: 0.14 },
  { cx: 46, cy: 82, r: 6, opacity: 0.18 },
  { cx: 82, cy: 80, r: 8, opacity: 0.22 },
  { cx: 120, cy: 82, r: 10, opacity: 0.25 },
  { cx: 158, cy: 82, r: 13, opacity: 0.27 },
];

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
  const tr = useT();
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
      <IconButton
        icon="close"
        size="md"
        onPress={onClose}
        style={styles.balanceCloseButton}
        accessibilityLabel={tr('common.close')}
      />

      <View style={styles.balanceHero}>
        <Label size="sm" tone="secondary">{overshoot ? tr('statusCard.balance.over') : tr('statusCard.balance.remaining')}</Label>
        <Text style={[styles.balanceHeroValue, overshoot && { color: t.colors.status.danger.default }]}>
          {Math.abs(remaining).toLocaleString()}
        </Text>
        <Text style={styles.balanceHeroUnit}>kcal</Text>
      </View>

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

      <View style={styles.balanceMath}>
        <View>
          <BalanceMathRow label={tr('statusCard.balance.baseGoal')} value={baseTargetKcal} />
          {activityLevelLabel ? (
            <Text style={styles.balanceMathSubtitle}>{tr('statusCard.balance.activityIncluded', { level: activityLevelLabel })}</Text>
          ) : null}
        </View>
        {hasExercise ? (
          <BalanceMathRow label={addedLabel} value={exerciseAdded} sign="+" tone="positive" />
        ) : null}
        {(hasExercise || carryoverPlanActive) ? (
          <BalanceMathRow label={tr('statusCard.balance.todayGoal')} value={adjustedTargetKcal + carryoverDeductionKcal} emphasis="mid" />
        ) : null}
        {carryoverPlanActive ? (
          <BalanceMathRow
            label={tr('statusCard.balance.adjusting', { index: carryoverDayIndex, total: carryoverDaysTotal })}
            value={carryoverDeductionKcal}
            sign="-"
          />
        ) : null}
        <BalanceMathRow label={tr('statusCard.balance.meals')} value={consumedKcal} sign="-" />
        <View style={styles.balanceMathDivider} />
        <BalanceMathRow
          label={tr('statusCard.balance.remaining')}
          value={remaining}
          emphasis="strong"
          tone={overshoot ? 'alert' : undefined}
        />
      </View>

      {showCarryoverSection && carryoverPlanActive ? (
        <View style={[styles.carryoverToggle, {
          backgroundColor: t.colors.action.primary.container,
          borderColor: t.colors.border.selected,
          flexDirection: 'row',
          alignItems: 'center',
        }]}>
          <View style={styles.carryoverToggleLeft}>
            <Text style={{ fontSize: fs.sm }}>🍽️</Text>
            <Text style={[styles.carryoverToggleLabel, { color: t.colors.action.primary.onContainer }]}>
              {tr('statusCard.carryover.activePlan', { days: carryoverDaysTotal })}
            </Text>
          </View>
          <Pressable onPress={onApplyCarryover} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('statusCard.carryover.changePlanA11y')}>
            <Label size="sm" tone="link">{tr('statusCard.carryover.change')}</Label>
          </Pressable>
          <Text style={{ color: t.colors.border.default, marginHorizontal: t.spacing['2'] }}>|</Text>
          <Pressable onPress={() => setCancelDialogVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('statusCard.carryover.stopAdjustingA11y')}>
            <Label size="sm" style={{ color: t.colors.status.danger.default }}>{tr('statusCard.carryover.stop')}</Label>
          </Pressable>
        </View>
      ) : showCarryoverSection ? (
        <Pressable
          onPress={onApplyCarryover}
          style={[styles.carryoverToggle, {
            backgroundColor: t.colors.surface.sunken,
            borderColor: t.colors.border.interactive,
          }]}
          accessibilityRole="button"
          accessibilityLabel={tr('statusCard.carryover.startAdjustingA11y')}
        >
          <View style={styles.carryoverToggleLeft}>
            <Text style={{ fontSize: fs.sm }}>🍽️</Text>
            <Text style={[styles.carryoverToggleLabel, { color: t.colors.content.secondary }]}>
              {tr('statusCard.carryover.yesterdayOverBanner')}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </Dialog>
    <Dialog
      visible={cancelDialogVisible}
      onClose={() => setCancelDialogVisible(false)}
      title={tr('statusCard.carryover.stopDialogTitle')}
      primaryAction={{
        label: tr('statusCard.carryover.stop'),
        onPress: () => { setCancelDialogVisible(false); onClose(); onCancelCarryoverPlan(); },
      }}
      secondaryAction={{
        label: tr('statusCard.carryover.continue'),
        onPress: () => setCancelDialogVisible(false),
      }}
    >
      <Body size="sm" tone="secondary">
        {tr('statusCard.carryover.stopDialogBody')}
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
  const valueColor = tone === 'alert' ? t.colors.status.danger.default : t.colors.content.primary;
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
  const tr = useT();
  const { profile } = useAppState();
  const maxDays = 14;
  const hardMinDays = minCarryoverDays(profile.targetCalories, surplusKcal, maxDays);
  const defaultDays = initialDays != null
    ? Math.min(Math.max(hardMinDays, initialDays), maxDays)
    : Math.min(Math.max(hardMinDays, 7), maxDays);
  const [days, setDays] = useState(() => defaultDays);
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

  let warnText: string | null = null;
  let warnColor = t.colors.status.warning.default;
  if (showHardError) {
    const blocked = profile.targetCalories - Math.ceil(surplusKcal / (days - 1));
    warnText = tr('statusCard.carryoverSheet.hardError', { kcal: blocked.toLocaleString() });
    warnColor = t.colors.status.danger.default;
  } else if (verdict === 'soft') {
    const effective = profile.targetCalories - perDay;
    const softFloor = carryoverSoftFloorKcal(profile.biologicalBasis);
    warnText = tr('statusCard.carryoverSheet.softWarn', { kcal: effective.toLocaleString(), floor: softFloor.toLocaleString() });
  }

  const canDecrease = days > 1;
  const canIncrease = days < maxDays;

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'edit' ? tr('statusCard.carryoverSheet.titleEdit') : tr('statusCard.carryoverSheet.titleStart')}
      primaryAction={{
        label: mode === 'edit' ? tr('statusCard.carryoverSheet.confirmEdit') : tr('statusCard.carryoverSheet.confirmStart'),
        onPress: () => { onClose(); onConfirm(days); },
        disabled: verdict === 'hard',
      }}
      secondaryAction={mode === 'edit' && onCancel ? {
        label: tr('statusCard.carryoverSheet.stopPlan'),
        onPress: () => setCancelDialogVisible(true),
        destructive: true,
      } : undefined}
      scrollable={false}
    >
      <View style={{ gap: t.spacing['1'] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: t.spacing['2'] }}>
          <Label size="sm" tone="secondary">{mode === 'edit' ? tr('statusCard.carryoverSheet.remainingAdjustment') : tr('statusCard.carryoverSheet.surplusCalories')}</Label>
          <Body size="sm" weight="semibold">+{surplusKcal} kcal</Body>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border.subtle }} />
        <View style={{ paddingVertical: t.spacing['4'], alignItems: 'center', gap: t.spacing['2'] }}>
          <Label size="sm" tone="secondary">{tr('statusCard.carryoverSheet.daysToSplit')}</Label>
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
              accessibilityLabel={tr('statusCard.carryoverSheet.decreaseDaysA11y')}
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
              <Caption tone="secondary">{tr('statusCard.carryoverSheet.days')}</Caption>
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
              accessibilityLabel={tr('statusCard.carryoverSheet.increaseDaysA11y')}
            >
              <Icon name="add" size={20} color={!canIncrease ? t.colors.content.disabled : t.colors.content.primary} />
            </Pressable>
          </View>
          <Body size="sm" tone="secondary">
            {tr('statusCard.carryoverSheet.perDaySummary', { perDay })}
          </Body>
          {warnText ? (
            <Body size="sm" style={{ color: warnColor, textAlign: 'center', paddingHorizontal: t.spacing['4'] }}>
              {warnText}
            </Body>
          ) : null}
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border.subtle }} />
        <Body size="sm" tone="secondary" style={{ paddingTop: t.spacing['2'] }}>
          {tr('statusCard.carryoverSheet.summary', {
            start: mode === 'edit' ? tr('statusCard.carryoverSheet.startToday') : tr('statusCard.carryoverSheet.startTomorrow'),
            perDay,
            days,
          })}
        </Body>
      </View>
    </BottomSheet>
    <Dialog
      visible={cancelDialogVisible}
      onClose={() => setCancelDialogVisible(false)}
      title={tr('statusCard.carryover.stopDialogTitle')}
      primaryAction={{
        label: tr('statusCard.carryover.stop'),
        onPress: () => { setCancelDialogVisible(false); onClose(); onCancel?.(); },
      }}
      secondaryAction={{
        label: tr('statusCard.carryover.continue'),
        onPress: () => setCancelDialogVisible(false),
      }}
    >
      <Body size="sm" tone="secondary">
        {tr('statusCard.carryover.stopDialogBody')}
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
  const tr = useT();
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
              ? tr('statusCard.carryoverBanner.newPlan')
              : tr('statusCard.carryoverBanner.activePlan', { days: daysRemaining })}
          </Label>
          {isNewPlan ? (
            <Body size="sm" tone="secondary">
              {tr('statusCard.carryoverBanner.newPlanBody', { surplus: surplusKcal })}
            </Body>
          ) : null}
          <Pressable
            onPress={onOpenSheet}
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1, marginTop: t.spacing['0.5'] })}
            accessibilityRole="button"
            accessibilityLabel={isNewPlan ? tr('statusCard.carryoverBanner.setUpA11y') : tr('statusCard.carryoverBanner.changeA11y')}
          >
            <Label size="sm" tone="link">
              {isNewPlan ? tr('statusCard.carryoverBanner.setUp') : tr('statusCard.carryoverBanner.change')}
            </Label>
          </Pressable>
        </View>
        <IconButton icon="close" size="sm" tone="tertiary" onPress={onDismiss} accessibilityLabel={tr('common.close')} />
      </View>
    </View>
  );
}

/**
 * 週次振り返り (旧称「週次リカップ」) の teaser カード。CarryoverBanner と同じスロット・同じ構造。
 * データ (kcal/PFC等) はここでは出さない — 中身はタップ後のストーリー側に委ねる。
 * dismiss は「見た」を意味し、週が変わると自然に再度表示対象になる
 * (weeklyRecapDismissedWeekKey は振り返り画面を開いた時点でも更新される)。
 */
function WeeklyRecapTeaser() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { logs, profile, exerciseLogs, dailyActivities, settings, updateSettingsValues } = useAppState();

  const recap = useMemo(
    () => computeWeeklyRecap(logs, profile, exerciseLogs, dailyActivities, new Date(), settings.uiLanguage),
    [logs, profile, exerciseLogs, dailyActivities, settings.uiLanguage]
  );

  if (!recap || settings.weeklyRecapDismissedWeekKey === recap.weekKey) return null;

  const dismiss = () => updateSettingsValues({ weeklyRecapDismissedWeekKey: recap.weekKey });
  const open = () => router.push('/weekly-recap');

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.surface.raised,
          borderRadius: t.radius.md,
          paddingHorizontal: t.spacing['4'],
          paddingTop: t.spacing['3'],
          paddingBottom: t.spacing['3'],
          marginBottom: t.spacing['2'],
          overflow: 'hidden',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={tr('statusCard.weeklyRecap.a11y')}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 170 }}>
        <Svg width="100%" height="100%" viewBox="0 0 170 100" preserveAspectRatio="xMaxYMid slice">
          {RECAP_TEASER_DOTS.map((d) => (
            <Circle
              key={`${d.cx}-${d.cy}`}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={t.tokens.colors.sage[800]}
              opacity={d.opacity}
            />
          ))}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Label tone="primary">{tr('statusCard.weeklyRecap.title')}</Label>
          <Caption tone="secondary">{recap.weekRangeLabel}</Caption>
        </View>
        <IconButton
          icon="close"
          size="sm"
          tone="tertiary"
          onPress={dismiss}
          accessibilityLabel={tr('common.close')}
        />
        <Icon name="chevronRight" size={16} color={t.colors.content.tertiary} />
      </View>
    </Pressable>
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
  const tr = useT();
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

  const carryoverRemainingDays = carryoverPlanActive
    ? Math.max(1, (settings.kcalCarryoverDaysTotal ?? 0) - carryoverDayIndex + 1)
    : 0;
  const carryoverEditSurplus = (settings.kcalCarryoverDailyAmount ?? 0) * carryoverRemainingDays;

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
      {isToday ? <WeeklyRecapTeaser /> : null}
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
          accessibilityLabel={tr('statusCard.a11y.openMealLog')}
          accessibilityHint={tr('statusCard.a11y.openMealLogHint')}
          disabled={!onFoodPress}
        >
          <View style={styles.sideLabelRow}>
            <View style={styles.sideLabelChevronSpacer} />
            <Label size="sm" tone="secondary">{tr('statusCard.meals')}</Label>
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
          accessibilityLabel={tr('statusCard.a11y.showBalance')}
          accessibilityHint={tr('statusCard.a11y.showBalanceHint')}
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
          accessibilityLabel={tr('statusCard.a11y.viewExerciseDetail')}
          accessibilityHint={tr('statusCard.a11y.viewExerciseDetailHint')}
        >
          <View style={styles.sideLabelRow}>
            <View style={styles.sideLabelChevronSpacer} />
            <Label size="sm" tone="secondary">{tr('statusCard.burned')}</Label>
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
          label={tr('common.macros.protein')}
          current={dayMacro.protein}
          target={effectivePfc.protein}
          textColor={t.colors.nutrition.protein.text}
          graphicColor={t.colors.nutrition.protein.graphic}
          trackColor={t.colors.nutrition.protein.background}
        />
        <MiniProgressBar
          letter="F"
          label={tr('common.macros.fat')}
          current={dayMacro.fat}
          target={effectivePfc.fat}
          textColor={t.colors.nutrition.fat.text}
          graphicColor={t.colors.nutrition.fat.graphic}
          trackColor={t.colors.nutrition.fat.background}
        />
        <MiniProgressBar
          letter="C"
          label={tr('common.macros.carbs')}
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
        exerciseAdded={Math.max(0, effectiveTarget + carryoverDeductionKcal - profile.targetCalories)}
        addedLabel={tr('statusCard.balance.addedActivity')}
        activityLevelLabel={
          profile.activityLevel ? tr(`onboarding.activity.${ACTIVITY_LEVEL_I18N_KEY[profile.activityLevel]}.label`) : null
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

const makeStyles = (t: Theme) => StyleSheet.create({
  statusCard: { paddingVertical: 4, gap: 16 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideColumn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: radius.md },
  sideColumnPressed: { opacity: 0.6 },
  sideLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'center' },
  /** chevron と同幅の透明スペーサーで Label を視覚的に中央寄せ */
  sideLabelChevronSpacer: { width: 12 + 2 /* chevron size + gap */ },
  sideValue: { fontSize: fs.lg, fontWeight: '700', color: t.colors.content.primary, letterSpacing: ls.tight },
  sideUnit: { fontSize: fs.xs, fontWeight: '500', color: t.colors.content.secondary },
  pfcMiniRow: { flexDirection: 'row', gap: 12, marginHorizontal: 12 },
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
  balanceHeroUnit: {
    fontSize: fs.xs,
    fontWeight: '500',
    color: t.colors.content.secondary,
    marginTop: -2,
    letterSpacing: ls.wider,
  },
  balanceProgressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  balanceProgressFill: { height: '100%', borderRadius: radius.full },
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
  balanceMathLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '500' },
  balanceMathLabelMid: { color: t.colors.content.primary, fontWeight: '600', fontSize: fs.sm },
  balanceMathLabelStrong: { color: t.colors.content.primary, fontWeight: '700', fontSize: fs.md },
  balanceMathValue: { fontSize: fs.md, fontWeight: '500', letterSpacing: ls.tight },
  balanceMathValueMid: { fontSize: fs.md, fontWeight: '700' },
  balanceMathValueStrong: { fontSize: fs.xl, fontWeight: '700', letterSpacing: ls.tight },
  balanceMathUnit: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '500' },
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
});
