import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { BarChart3, ChevronDown, ChevronRight, HelpCircle, User, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
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
import { HomeDatePager } from '@/components/HomeDatePager';
import { DayLogBottomSheet, type DayLogBottomSheetRef } from '@/components/DayLogBottomSheet';
import { additionPresets, portionSnapPoints, sizeOptions } from '@/constants/nutrition-data';
import { ACTIVITY_LEVEL_OPTIONS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { Badge, BottomSheet, Caption, useTheme } from '@/design-system';
import { duration, spring } from '@/design-system/tokens/primitives/motion';
import { useAppState } from '@/providers/app-state-provider';
import { DishDraft, DishSize, IngredientDraft, Macro, PortionValue } from '@/types/nutrition';
import { getIdentity } from '@/constants/identity';
import { getLogDisplayInfo } from '@/utils/log-display';
import { adjustedTargetKcal, calcActivityBonusKcal, calcBaselineActiveKcal, getAdjustedPfcForDate, getEffectiveSubscriptionStatus, getGrossExerciseKcalForDate, stepsToActiveKcal, trialDaysRemaining } from '@/utils/goals';
import { buildDishMacro, clampPortion, computeIngredient, draftFromLog, formatDateKey, formatMacroText, getIngredientSubtypeDef, getIngredientSubtypeDefs, getQuickCategories, getSubtypes, getToppingsForSubtype, summarizeToppings } from '@/utils/nutrition';
import { formatDayLabel, isSameDay, sumForDate } from '@/utils/history';

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function MiniProgressBar({ letter, label, current, target, color }: {
  letter: string;
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={styles.miniBarItem}>
      <Text style={styles.miniBarLabel}>
        <Text style={[styles.miniBarLetter, { color }]}>{letter}</Text>
        {' '}
        {label}
      </Text>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.miniBarValue}>{Math.round(current)} / {Math.round(target)} g</Text>
    </View>
  );
}

export const Header = memo(function Header({ viewedDate }: { viewedDate?: Date }) {
  const router = useRouter();
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
        <Pressable
          onPress={() => router.push('/status')}
          style={styles.avatarButton}
          testID="avatar-button"
        >
          <User size={20} color={palette.sageDeep} strokeWidth={1.8} />
          {showTrialBadge ? <View style={styles.avatarBadge} testID="avatar-trial-badge" /> : null}
        </Pressable>
      </Animated.View>
      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.headerDate} testID="header-date-label">{dateLabel}</Text>
      </View>
      <View style={styles.headerRight}>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/help')}
          testID="help-link"
          accessibilityLabel="使い方を見る"
        >
          <HelpCircle color={palette.sageStrong} size={20} />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push('/stats')}
          testID="stats-link"
          accessibilityLabel="実績を見る"
        >
          <BarChart3 color={palette.sageStrong} size={20} />
        </Pressable>
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
  activityLevelLabel,
}: {
  visible: boolean;
  onClose: () => void;
  baseTargetKcal: number;
  adjustedTargetKcal: number;
  consumedKcal: number;
  /** 今日の運動で目標に加算される kcal (現モデルでは gross 全額) */
  exerciseAdded: number;
  /** オンボで選んだ運動習慣のラベル (例: "軽めに動く"). 未設定なら null */
  activityLevelLabel: string | null;
}) {
  const remaining = adjustedTargetKcal - consumedKcal;
  const progress = adjustedTargetKcal > 0 ? Math.min(1, Math.max(0, consumedKcal / adjustedTargetKcal)) : 0;
  const overshoot = remaining < 0;
  const hasExercise = exerciseAdded > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.balanceOverlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="閉じる">
        <Pressable
          style={styles.balanceCard}
          onPress={() => undefined}
          accessibilityRole="summary"
          accessibilityLabel="今日の収支"
        >
          {/* close ボタン (右上) */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.balanceCloseButton}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <X size={18} color={palette.textMuted} strokeWidth={2} />
          </Pressable>

          {/* HERO (Tier 1): 残り or オーバー */}
          <View style={styles.balanceHero}>
            <Text style={styles.balanceHeroCaption}>{overshoot ? 'オーバー' : '残り'}</Text>
            <Text style={[styles.balanceHeroValue, overshoot && { color: palette.danger }]}>
              {Math.abs(remaining).toLocaleString()}
            </Text>
            <Text style={styles.balanceHeroUnit}>kcal</Text>
          </View>

          {/* 進捗バー (視覚補助) */}
          <View style={styles.balanceProgressTrack}>
            <View
              style={[
                styles.balanceProgressFill,
                {
                  width: `${Math.min(Math.round(progress * 100), 100)}%`,
                  backgroundColor: overshoot ? palette.danger : palette.sageDeep,
                },
              ]}
            />
          </View>

          {/* 計算式 (常に表示) */}
          <View style={styles.balanceMath}>
            <View>
              <BalanceMathRow label="ベース目標" value={baseTargetKcal} />
              {activityLevelLabel ? (
                <Text style={styles.balanceMathSubtitle}>運動習慣「{activityLevelLabel}」を反映</Text>
              ) : null}
            </View>
            {hasExercise ? (
              <BalanceMathRow label="運動" value={exerciseAdded} sign="+" tone="positive" />
            ) : null}
            {hasExercise ? (
              <BalanceMathRow label="今日の目標" value={adjustedTargetKcal} emphasis="mid" />
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
        </Pressable>
      </Pressable>
    </Modal>
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
  const isStrong = emphasis === 'strong';
  const isMid = emphasis === 'mid';
  const valueColor =
    tone === 'alert'
      ? palette.danger
      : tone === 'positive'
        ? palette.sageStrong
        : isStrong || isMid
          ? palette.text
          : palette.text;
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

export const StatusCard = memo(function StatusCard({
  viewedDate,
  onFoodPress,
}: {
  viewedDate?: Date;
  /** 左「食事」エリアタップ時のコールバック (例: DayLogBottomSheet を half に展開) */
  onFoodPress?: () => void;
}) {
  const { profile, todayMacro, logs, exerciseLogs, dailyActivities } = useAppState();
  const t = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [exerciseSheetVisible, setExerciseSheetVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);

  const today = useMemo(() => new Date(), []);
  const targetDate = viewedDate ?? today;
  const isToday = isSameDay(targetDate, today);
  const dateKey = formatDateKey(targetDate);
  const dayMacro = useMemo(
    () => (isToday ? todayMacro : sumForDate(logs, dateKey)),
    [isToday, todayMacro, logs, dateKey]
  );

  // 動的TDEE (PRD §6.4.3): その日の活動量から「基準超過分」を kcal に換算。
  // 運動ログとの二重計上は adjustedTargetKcal 内の max() 調停で防ぐ。
  const activityBonusKcal = useMemo(() => {
    const baseline = calcBaselineActiveKcal(profile);
    if (baseline == null) return 0;
    const da = (dailyActivities ?? []).find((d) => d.date === dateKey);
    if (!da) return 0;
    const measured =
      da.activeKcal > 0 ? da.activeKcal : stepsToActiveKcal(da.steps, profile.currentWeightKg);
    return calcActivityBonusKcal(baseline, measured);
  }, [profile, dailyActivities, dateKey]);

  // 表示中の日付に対する目標・消費・PFC をその日の運動ログ + 活動量から算出する。
  // 今日 / 過去日とも同じロジック (運動を記録した過去日も目標が拡大する)。
  const effectiveTarget = useMemo(
    () => adjustedTargetKcal(profile.targetCalories, exerciseLogs, dateKey, activityBonusKcal),
    [profile.targetCalories, exerciseLogs, dateKey, activityBonusKcal]
  );
  const effectiveExerciseKcal = useMemo(
    () => getGrossExerciseKcalForDate(exerciseLogs, dateKey),
    [exerciseLogs, dateKey]
  );
  const effectivePfc = useMemo(
    () => getAdjustedPfcForDate(profile, exerciseLogs, dateKey, activityBonusKcal),
    [profile, exerciseLogs, dateKey, activityBonusKcal]
  );

  const openExerciseSheet = useCallback(() => setExerciseSheetVisible(true), []);
  const closeExerciseSheet = useCallback(() => setExerciseSheetVisible(false), []);

  // 画面幅に比例した可変リング径 (120–180 でクランプ)。
  const ringSize = Math.round(Math.min(180, Math.max(120, screenWidth * 0.38)));
  const ringStroke = Math.round(ringSize * 0.11);

  return (
    <View style={styles.statusCard}>
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
            <Text style={styles.sideLabel}>食事</Text>
            <ChevronRight size={12} color={palette.textMuted} strokeWidth={2} />
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
            <Text style={styles.sideLabel}>消費</Text>
            <ChevronRight size={12} color={palette.textMuted} strokeWidth={2} />
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
          color={t.colors.nutrition.protein.default}
        />
        <MiniProgressBar
          letter="F"
          label="脂肪"
          current={dayMacro.fat}
          target={effectivePfc.fat}
          color={t.colors.nutrition.fat.default}
        />
        <MiniProgressBar
          letter="C"
          label="炭水化物"
          current={dayMacro.carbs}
          target={effectivePfc.carbs}
          color={t.colors.nutrition.carbs.default}
        />
      </View>

      <ExerciseSheet visible={exerciseSheetVisible} onClose={closeExerciseSheet} />
      <BalanceModal
        visible={balanceVisible}
        onClose={() => setBalanceVisible(false)}
        baseTargetKcal={profile.targetCalories}
        adjustedTargetKcal={effectiveTarget}
        consumedKcal={Math.round(dayMacro.kcal)}
        /* v1.7+: 業界標準モデル (YAZIO/MFP/あすけん) で gross 全額加算。
         * adjustedTarget - baseTarget は今や運動 gross と一致する。 */
        exerciseAdded={Math.max(0, effectiveTarget - profile.targetCalories)}
        activityLevelLabel={
          ACTIVITY_LEVEL_OPTIONS.find((a) => a.level === profile.activityLevel)?.label ?? null
        }
      />
    </View>
  );
});

const SegmentedTabLegacy = memo(function SegmentedTabLegacy() {
  const { selectedMode, setSelectedMode } = useAppState();
  return (
    <View style={styles.segmentedWrap} testID="mode-tab">
      {([
        { key: 'ingredient', label: '食材' },
        { key: 'dish', label: '一皿料理' },
      ] as const).map((item) => {
        const active = item.key === selectedMode;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSelectedMode(item.key)}
            style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
            testID={`mode-tab-${item.key}`}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

void SegmentedTabLegacy;

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillLabel}>{label}</Text>
      <Text style={styles.macroPillValue}>{Math.round(value)}</Text>
    </View>
  );
}

function LogListItemLegacy({ log }: { log: import('@/types/nutrition').FoodLog }) {
  const { deleteLog, setEditorLogId, openIdentityLogSheet } = useAppState();
  const display = getLogDisplayInfo(log);
  const handlePress = () => {
    if (log.identityId) {
      const id = getIdentity(log.identityId);
      if (id) {
        openIdentityLogSheet(id.primaryHome.bucket, {
          identityId: log.originIdentityId ?? log.identityId,
          editingLogId: log.id,
        });
        return;
      }
    }
    setEditorLogId(log.id);
  };
  return (
    <Pressable style={styles.logItem} onPress={handlePress} testID={`log-item-${log.id}`}>
      <View style={styles.logItemTop}>
        <View>
          <Text style={styles.logTitle}>{display.title}{display.bucketHint ? `  · ${display.bucketHint}` : ''}</Text>
          {display.subtitle ? (
            <Text style={[styles.logSubtitle, { fontWeight: '500' }]} testID={`log-attr-${log.id}`}>
              {display.subtitle}
            </Text>
          ) : null}
          {display.addonsText ? (
            <Text style={styles.logSubtitle} testID={`log-topping-${log.id}`}>
              {display.addonsText}
            </Text>
          ) : null}
          <Text style={styles.logSubtitle}>{formatTime(log.timestamp)} · {display.amountText}</Text>
        </View>
        <Text style={styles.logKcal}>{Math.round(log.macro.kcal)} kcal</Text>
      </View>
      <View style={styles.logMacroRow}>
        <MacroPill label="P" value={log.macro.protein} />
        <MacroPill label="F" value={log.macro.fat} />
        <MacroPill label="C" value={log.macro.carbs} />
      </View>
      <View style={styles.logActionRow}>
        <Pressable style={styles.deleteButton} onPress={() => deleteLog(log.id)} testID={`log-delete-${log.id}`}>
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

void LogListItemLegacy;

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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!feedback) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: duration.fast, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: -16, useNativeDriver: true, ...spring.pop }),
    ]).start();
  }, [feedback, opacity, translateY]);

  if (!feedback) return null;

  const label = feedback.label;
  const macro = feedback.macro;
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
      <Text style={macroStyle}>{formatMacroText(macro)}</Text>
    </Animated.View>
  );
});

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog } = useAppState();
  if (!undoState) return null;
  return (
    <View style={styles.undoToast} testID="undo-toast">
      <View>
        <Text style={styles.undoTitle}>{undoState.log.categoryLabel} を記録しました</Text>
        <Text style={styles.undoText}>必要なら元に戻せます</Text>
      </View>
      <Pressable onPress={undoLastLog} testID="undo-button">
        <Text style={styles.undoAction}>取り消す</Text>
      </Pressable>
    </View>
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
          <ChevronDown size={14} color={palette.textMuted} />
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
        <MacroPill label="P" value={macro.protein} />
        <MacroPill label="F" value={macro.fat} />
        <MacroPill label="C" value={macro.carbs} />
      </View>
    </View>
  );
}

function DishEditorContent({ draft, onChange }: { draft: DishDraft; onChange: (draft: DishDraft) => void }) {
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
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function PreviewCard({ macro }: { macro: Macro }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>プレビュー</Text>
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} />
        <MacroPill label="F" value={macro.fat} />
        <MacroPill label="C" value={macro.carbs} />
      </View>
    </View>
  );
}

void PreviewCard;
void getSubtypes;

export function HomeScreen() {
  const [viewedDate, setViewedDate] = useState<Date>(() => new Date());
  const dayLogSheetRef = useRef<DayLogBottomSheetRef>(null);
  const openDayLogSheet = useCallback(() => {
    dayLogSheetRef.current?.snapToHalf();
  }, []);
  return (
    <View style={styles.page} testID="home-screen">
      <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <Header viewedDate={viewedDate} />
        </View>
        <HomeDatePager onViewedDateChange={setViewedDate} onFoodPress={openDayLogSheet} />
      </SafeAreaView>
      <DayLogBottomSheet ref={dayLogSheetRef} viewedDate={viewedDate} />
      <FloatingFeedback />
      <UndoToast />
      <LogEditorSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 160, gap: 24 },
  topContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  // 左右非対称 (avatar 42px vs icon×2 + gap 92px) でも center を視覚的に中央寄せするため、
  // headerCenter は absolute positioning。pointerEvents="none" でタップ素通り。
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  headerDate: { fontSize: 16, fontWeight: '700', color: palette.sageDeep },
  avatarButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  // トライアル残り≤2日で表示するバッジ (右上の小さい丸)
  avatarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D9534F',
    borderWidth: 2,
    borderColor: palette.background,
  },
  appTitle: { fontSize: 18, fontWeight: '700', color: palette.sageDeep },
  appSubtitle: { fontSize: 13, color: palette.textMuted, marginTop: 2 },
  trialBadge: { fontSize: 11, color: palette.sageStrong, marginTop: 2, fontWeight: '600' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  statusCard: { paddingVertical: 4, gap: 16 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideColumn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 12 },
  sideColumnPressed: { opacity: 0.6 },
  sideLabel: { fontSize: 11, fontWeight: '600', color: palette.textMuted, letterSpacing: 0.4 },
  sideLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'center' },
  /** chevron と同幅の透明スペーサーで Label を視覚的に中央寄せ */
  sideLabelChevronSpacer: { width: 12 + 2 /* chevron size + gap */ },
  sideValue: { fontSize: 18, fontWeight: '700', color: palette.text, letterSpacing: -0.3 },
  sideUnit: { fontSize: 11, fontWeight: '500', color: palette.textMuted },
  balanceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 28, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  balanceCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  balanceCloseButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** HERO: 残り N kcal (主役、最大の数字) */
  balanceHero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  balanceHeroCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceHeroValue: {
    fontSize: 52,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -1.5,
    lineHeight: 56,
    marginTop: 4,
  },
  balanceHeroUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.textMuted,
    marginTop: -2,
    letterSpacing: 0.6,
  },
  /** 進捗バー */
  balanceProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E2DDD4',
    overflow: 'hidden',
  },
  balanceProgressFill: { height: '100%', borderRadius: 999 },
  /** 計算式ブロック (常に表示) */
  balanceMath: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    gap: 10,
  },
  balanceMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceMathRowStrong: { paddingTop: 2 },
  /** Tier 3: 通常ラベル (muted, regular) */
  balanceMathLabel: { fontSize: 13, color: palette.textMuted, fontWeight: '500' },
  /** Tier 2 emphasis: 中間結果ラベル (text色, medium) */
  balanceMathLabelMid: { color: palette.text, fontWeight: '600', fontSize: 13 },
  /** Tier 1 emphasis: 最終結果ラベル (text色, bold) */
  balanceMathLabelStrong: { color: palette.text, fontWeight: '700', fontSize: 14 },
  /** Tier 2: 通常値 (text色, medium) */
  balanceMathValue: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  /** Tier 2 emphasis: 中間結果値 (semibold, slightly larger) */
  balanceMathValueMid: { fontSize: 15, fontWeight: '700' },
  /** Tier 1 emphasis: 最終結果値 (bold, largest) */
  balanceMathValueStrong: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  balanceMathUnit: { fontSize: 10, color: palette.textMuted, fontWeight: '500' },
  /** Tier 3: ベース目標の補足 (運動習慣ラベル) */
  balanceMathSubtitle: {
    fontSize: 11,
    color: palette.textMuted,
    marginTop: -4,
    marginBottom: 2,
    opacity: 0.85,
  },
  balanceMathDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginVertical: 2,
  },
  pfcMiniRow: { flexDirection: 'row', gap: 12, marginHorizontal: 12 },
  miniBarItem: { flex: 1, gap: 4 },
  miniBarLabel: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  miniBarLetter: { fontWeight: '700' },
  miniBarTrack: { height: 6, borderRadius: 999, backgroundColor: '#E2DDD4', overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 999 },
  miniBarValue: { fontSize: 13, color: palette.text, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2C23', marginBottom: 14 },
  segmentedWrap: { flexDirection: 'row', backgroundColor: palette.card, borderRadius: 18, padding: 5, marginBottom: 14 },
  segmentButton: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: palette.surface },
  segmentText: { color: palette.textMuted, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: palette.text, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  quickButton: { width: '31.5%', aspectRatio: 1, backgroundColor: palette.surface, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  quickEmoji: { fontSize: 31 },
  quickLabel: { fontSize: 14, color: '#354137', textAlign: 'center', fontWeight: '500' },
  sheetCard: { marginTop: 6, backgroundColor: palette.sheet, borderRadius: 32, padding: 18, paddingBottom: 22 },
  sheetHandle: { width: 52, height: 6, borderRadius: 999, backgroundColor: '#C6C6BD', alignSelf: 'center', marginBottom: 18 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#243228' },
  sheetCount: { fontSize: 13, color: palette.textMuted },
  emptyState: { backgroundColor: palette.surface, borderRadius: 24, padding: 22, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  emptyText: { fontSize: 14, lineHeight: 21, color: palette.textMuted },
  logItem: { backgroundColor: palette.surface, borderRadius: 24, padding: 16, marginBottom: 12, gap: 12 },
  logItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  logTitle: { fontSize: 16, fontWeight: '700', color: '#243128' },
  logSubtitle: { marginTop: 4, fontSize: 13, color: palette.textMuted },
  logKcal: { fontSize: 15, fontWeight: '700', color: palette.sageDeep },
  logMacroRow: { flexDirection: 'row', gap: 8 },
  macroPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#ECE5D9' },
  macroPillLabel: { fontSize: 12, color: palette.textMuted, fontWeight: '700' },
  macroPillValue: { fontSize: 12, color: palette.text, fontWeight: '700' },
  logActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  amountButtonText: { fontSize: 16, color: palette.text, fontWeight: '700' },
  amountText: { fontSize: 14, color: palette.textMuted },
  deleteButton: { backgroundColor: '#F0E2DD', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: palette.danger, fontSize: 13, fontWeight: '700' },
  feedbackBubble: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: palette.sageDeep, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, alignItems: 'center', shadowColor: palette.sageDeep, shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  feedbackText: { color: palette.white, fontSize: 16, fontWeight: '700' },
  feedbackMacro: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  // Live preview state (sheet open, before save). Same position as feedbackBubble
  // but cream/sage-pale to read as "tentative". Pointer-events disabled so it
  // doesn't intercept taps on the open sheet.
  feedbackBubbleLive: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.sageStrong, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, alignItems: 'center', shadowColor: palette.sageStrong, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  feedbackTextLive: { color: palette.sageDeep, fontSize: 16, fontWeight: '700' },
  feedbackMacroLive: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  undoToast: { position: 'absolute', left: 18, right: 18, bottom: 24, borderRadius: 22, backgroundColor: '#29322C', paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  undoTitle: { color: palette.white, fontSize: 14, fontWeight: '700' },
  undoText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 4 },
  undoAction: { color: '#E9C28F', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 28, 24, 0.32)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, gap: 18 },
  sheetGrabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(49, 83, 71, 0.18)', marginBottom: 8 },
  sheetHero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  statusAvatarLarge: { width: 84, height: 84, borderRadius: 42, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center' },
  statusAvatarEmoji: { fontSize: 42 },
  sheetHeroTitle: { fontSize: 24, fontWeight: '700', color: palette.text },
  sheetHeroSubtitle: { fontSize: 14, color: palette.textMuted },
  statusInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  statusInfoCard: { width: '48%', backgroundColor: palette.card, borderRadius: 22, padding: 16, gap: 8 },
  infoLabel: { color: palette.textMuted, fontSize: 12 },
  infoValue: { color: palette.text, fontSize: 18, fontWeight: '700' },
  statusGoalCard: { backgroundColor: palette.card, borderRadius: 28, padding: 18, gap: 12 },
  goalCardTitle: { fontSize: 13, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  goalCalories: { fontSize: 30, fontWeight: '700', color: palette.sageDeep },
  goalMacroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  goalHint: { fontSize: 13, color: palette.textMuted },
  editorSheet: { maxHeight: '92%', backgroundColor: palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  editorTitle: { fontSize: 22, fontWeight: '700', color: palette.text, marginBottom: 12 },
  editorBody: { gap: 18, paddingBottom: 20 },
  editorSection: { gap: 12 },
  editorSectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: palette.card },
  chipActive: { backgroundColor: palette.sageDeep },
  chipText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  chipTextActive: { color: palette.white },
  previewCard: { backgroundColor: palette.card, borderRadius: 24, padding: 16, gap: 10 },
  previewTitle: { fontSize: 13, color: palette.textMuted },
  previewSummaryText: { fontSize: 14, color: palette.text, fontWeight: '600', lineHeight: 20 },
  previewSummaryDivider: { color: palette.textMuted, fontWeight: '400' },
  previewSummarySecondary: { fontSize: 12, color: palette.textMuted, marginTop: -2 },
  previewCalories: { fontSize: 28, fontWeight: '700', color: palette.sageDeep },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  categoryRowLabel: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  categoryRowValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryRowValueText: { fontSize: 15, color: palette.text, fontWeight: '700' },
  categoryDropdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: palette.surface, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: palette.border },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: palette.card },
  categoryOptionActive: { backgroundColor: palette.sageDeep },
  categoryOptionText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  categoryOptionTextActive: { color: palette.white },
  subSection: { gap: 10, marginTop: 4 },
  portionSection: { backgroundColor: palette.surface, borderRadius: 22, padding: 16, gap: 10, borderWidth: 1, borderColor: palette.border },
  portionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portionTitle: { fontSize: 15, fontWeight: '700', color: palette.text },
  portionBadge: { fontSize: 13, fontWeight: '700', color: palette.sageDeep, backgroundColor: palette.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  portionBaseline: { fontSize: 12, color: palette.textMuted },
  portionNowLine: { fontSize: 15, color: palette.text, fontWeight: '700', marginTop: 2 },
  portionNowLineMuted: { color: palette.textMuted, fontWeight: '500', fontSize: 12 },
  sliderWrap: { paddingTop: 10, paddingBottom: 4 },
  sliderTrack: { height: 36, justifyContent: 'center', borderRadius: 999 },
  sliderFill: { position: 'absolute', left: 0, height: 6, backgroundColor: palette.sageStrong, borderRadius: 999, top: 15 },
  sliderTick: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.cardStrong, top: 15 },
  sliderTickActive: { backgroundColor: palette.sageDeep },
  sliderThumb: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: palette.white, borderWidth: 2, borderColor: palette.sageDeep, top: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderLabelTap: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  sliderLabelText: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },
  sliderLabelTextActive: { color: palette.sageDeep, fontWeight: '700' },
  editorFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryButton: { flex: 1, backgroundColor: '#F0E2DD', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: palette.danger, fontSize: 14, fontWeight: '700' },
  primaryButton: { flex: 1, backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: palette.white, fontSize: 14, fontWeight: '700' },
});
