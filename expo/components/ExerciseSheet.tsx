import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Chip, IconButton, Label, Overline, useTheme, type Theme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { radius } from '@/design-system/tokens/primitives/radius';
import { ACTIVITY_LEVEL_OPTIONS } from '@/constants/onboarding';
import {
  ACTIVITY_BONUS_DAILY_CAP_KCAL,
  calcBaselineActiveKcal,
  calcExerciseGrossKcal,
  calcGoalAdditionKcal,
  EXERCISE_TYPES,
  ExerciseTypeKey,
  getTdeeExerciseKcalForDate,
  stepsToActiveKcal,
} from '@/utils/goals';
import { useAppState } from '@/providers/app-state-provider';
import { formatDateKey } from '@/utils/nutrition';
import { formatDayLabel } from '@/utils/history';
import type { ExerciseLog } from '@/types/nutrition';

const DURATION_PRESETS = [15, 20, 30, 45, 60] as const;

interface ExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 省略時は今日。過去日を指定するとその日のデータを表示する。 */
  dateKey?: string;
}

export const ExerciseSheet = memo(function ExerciseSheet({ visible, onClose, dateKey: dateKeyProp }: ExerciseSheetProps) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const {
    logExercise,
    deleteExerciseLog,
    profile,
    exerciseLogs,
    dailyActivities,
    settings,
  } = useAppState();
  const [selectedType, setSelectedType] = useState<ExerciseTypeKey>('walking');
  const [minutes, setMinutes] = useState<number>(30);

  const todayKey = formatDateKey(new Date());
  const dateKey = dateKeyProp ?? todayKey;

  // 表示対象日のデータを導出
  const dailyActivity = useMemo(
    () => (dailyActivities ?? []).find((d) => d.date === dateKey) ?? null,
    [dailyActivities, dateKey]
  );
  const dateExerciseLogs = useMemo(
    () => exerciseLogs.filter((e) => e.date === dateKey),
    [exerciseLogs, dateKey]
  );
  // TDEE 計算用: activeKcal > 0 の日は health ログが measuredActiveKcal に包含されるため除外。
  // (表示は dateExerciseLogs をそのまま使い全ログを見せる)
  const grossExerciseKcal = useMemo(
    () => getTdeeExerciseKcalForDate(dateExerciseLogs, dateKey, dailyActivity?.activeKcal ?? 0),
    [dateExerciseLogs, dateKey, dailyActivity]
  );

  const weightKg = profile.currentWeightKg ?? 60;

  const selectedTypeInfo = useMemo(
    () => EXERCISE_TYPES.find((et) => et.key === selectedType)!,
    [selectedType]
  );

  const grossKcal = useMemo(
    () => calcExerciseGrossKcal(selectedTypeInfo.met, weightKg, minutes),
    [selectedTypeInfo.met, weightKg, minutes]
  );

  const handleSave = useCallback(() => {
    logExercise(selectedType, minutes);
    onClose();
  }, [logExercise, selectedType, minutes, onClose]);

  const hasHealthActivity =
    !!dailyActivity && (dailyActivity.steps > 0 || dailyActivity.activeKcal > 0);
  const hasWorkouts = dateExerciseLogs.length > 0;

  const measuredActiveKcal = useMemo(() => {
    if (!dailyActivity) return null;
    return dailyActivity.activeKcal > 0
      ? dailyActivity.activeKcal
      : stepsToActiveKcal(dailyActivity.steps, profile.currentWeightKg);
  }, [dailyActivity, profile.currentWeightKg]);

  const consumedKcal = Math.round((measuredActiveKcal ?? 0) + grossExerciseKcal);

  const baselineKcal = useMemo(() => calcBaselineActiveKcal(profile), [profile]);

  const goalAddition = useMemo(
    () =>
      calcGoalAdditionKcal(grossExerciseKcal, {
        measuredActiveKcal,
        baselineActiveKcal: baselineKcal,
      }),
    [grossExerciseKcal, measuredActiveKcal, baselineKcal]
  );

  // baseline はプロフィールの活動レベルから決まるため、ヘルス同期の有無に関わらず常に表示する。
  // calcGoalAdditionKcal も measured=null を 0 として扱い常に控除するため、表示と計算が一致する。
  const showLedger = baselineKcal != null;
  const activityCapped =
    showLedger &&
    (measuredActiveKcal ?? 0) - (baselineKcal as number) > ACTIVITY_BONUS_DAILY_CAP_KCAL;

  const activityLevelLabel = useMemo(
    () => ACTIVITY_LEVEL_OPTIONS.find((a) => a.level === profile.activityLevel)?.label ?? null,
    [profile.activityLevel]
  );

  // ヘルスの歩数が取れている日はウォーキングを「歩数(ヘルス)」に集約し、
  // 手動追加の重複を避ける (二重計上の不安を構造的に排除)。
  const walkingType = useMemo(() => EXERCISE_TYPES.find((et) => et.key === 'walking') ?? null, []);
  const availableTypes = useMemo(
    () => (hasHealthActivity ? EXERCISE_TYPES.filter((et) => et.key !== 'walking') : EXERCISE_TYPES),
    [hasHealthActivity]
  );

  // ウォーキングがグリッドから消えた時に選択をフォールバックさせる。
  useEffect(() => {
    if (hasHealthActivity && selectedType === 'walking' && availableTypes[0]) {
      setSelectedType(availableTypes[0].key as ExerciseTypeKey);
    }
  }, [hasHealthActivity, selectedType, availableTypes]);

  const dayLabel = useMemo(() => formatDayLabel(new Date(dateKey), new Date(), settings.uiLanguage), [dateKey, settings.uiLanguage]);
  const sheetTitle = tr('exercise.sheetTitle', { day: dayLabel });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      primaryAction={{ label: tr('exercise.add'), onPress: handleSave }}
      secondaryAction={{ label: tr('common.cancel'), onPress: onClose }}
      testID="exercise-sheet"
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.summaryCard} testID="exercise-summary-card">
            <View style={styles.summaryHeader}>
              <Label size="sm" tone="secondary">{sheetTitle}</Label>
              <Text style={styles.summaryKcal}>
                {consumedKcal.toLocaleString()}
                <Text style={styles.summaryKcalUnit}> kcal</Text>
              </Text>
            </View>
            {showLedger ? (
              <>
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>
                    {tr('exercise.activityLevelBase', { level: activityLevelLabel ?? '-' })}
                  </Text>
                  <Text style={styles.ledgerValue}>
                    −{(baselineKcal as number).toLocaleString()} kcal
                  </Text>
                </View>
                <View style={[styles.ledgerRow, styles.ledgerResultRow]}>
                  <Text style={styles.ledgerResultLabel}>
                    {activityCapped ? tr('exercise.goalAdditionCapped') : tr('exercise.goalAddition')}
                  </Text>
                  <Text style={[styles.ledgerResultValue, goalAddition === 0 && styles.ledgerResultZero]}>
                    +{goalAddition.toLocaleString()} kcal
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* === 運動記録 (歩数=ヘルスのウォーキングに集約 + 手動ログ) === */}
          {hasHealthActivity || hasWorkouts ? (
            <View style={styles.historyBlock} testID="exercise-history-list">
              <Overline>{tr('exercise.historyTitle', { day: dayLabel })}</Overline>
              {hasHealthActivity ? (
                <View style={styles.historyRow} testID="exercise-health-walking">
                  <Text style={styles.historyEmoji}>{walkingType?.emoji ?? '🚶'}</Text>
                  <View style={styles.historyMeta}>
                    <View style={styles.historyLabelRow}>
                      <Text style={styles.historyLabel}>{tr('exercise.walking')}</Text>
                      <View style={[styles.sourceBadge, styles.sourceBadgeHealth]}>
                        <Text style={[styles.sourceBadgeText, styles.sourceBadgeTextHealth]}>{tr('exercise.sourceHealth')}</Text>
                      </View>
                    </View>
                    <Text style={styles.historySub}>
                      {tr('exercise.steps', { n: Math.round(dailyActivity!.steps).toLocaleString() })}
                    </Text>
                  </View>
                  <Text style={styles.historyKcal}>
                    +{Math.round(measuredActiveKcal ?? 0).toLocaleString()} kcal
                  </Text>
                </View>
              ) : null}
              {dateExerciseLogs.map((log) => (
                <ExerciseHistoryRow key={log.id} log={log} onDelete={() => deleteExerciseLog(log.id)} />
              ))}
            </View>
          ) : null}

          {/* === 運動を追加 === */}
          <View style={styles.addBlock}>
            <Overline>{tr('exercise.addExercise')}</Overline>
            <View style={styles.typeGrid}>
              {[availableTypes.slice(0, 4), availableTypes.slice(4)].map((row, rowIdx) => (
                <View key={rowIdx} style={styles.typeRow}>
                  {row.map((type) => {
                    const active = selectedType === type.key;
                    return (
                      <Pressable
                        key={type.key}
                        style={({ pressed }) => ({
                          flex: 1,
                          aspectRatio: 1,
                          borderRadius: radius.lg,
                          borderWidth: 1,
                          borderColor: active ? t.colors.border.selected : t.colors.border.interactive,
                          backgroundColor: active
                            ? t.colors.action.primary.container
                            : pressed
                              ? t.colors.surface.sunken
                              : t.colors.surface.raised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        })}
                        onPress={() => setSelectedType(type.key as ExerciseTypeKey)}
                        testID={`exercise-type-${type.key}`}
                      >
                        <Text style={styles.typeEmoji}>{type.emoji}</Text>
                        <Text
                          style={{
                            fontSize: fs.xs,
                            fontWeight: '600',
                            textAlign: 'center',
                            color: active ? t.colors.action.primary.onContainer : t.colors.content.primary,
                          }}
                        >
                          {type.key === 'walking' ? tr('exercise.walking') : tr(`exercise.typeLabels.${type.key}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  label={`${preset}${tr('common.unit.min')}`}
                  selected={minutes === preset}
                  onPress={() => setMinutes(preset)}
                  testID={`exercise-duration-${preset}`}
                />
              ))}
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{tr('exercise.burnedCaloriesLabel')}</Text>
                <Text style={styles.previewKcal}>{grossKcal} kcal</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

function formatLogTime(timestamp: string): string | null {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function ExerciseHistoryRow({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const theme = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const type = EXERCISE_TYPES.find((t) => t.key === log.exerciseType);
  const localizedLabel = type
    ? (type.key === 'walking' ? tr('exercise.walking') : tr(`exercise.typeLabels.${type.key}`))
    : log.exerciseLabel;
  const isHealth = log.source === 'health';
  const time = formatLogTime(log.timestamp);
  const subParts = [`${log.minutes}${tr('common.unit.min')}`, time].filter(Boolean) as string[];
  return (
    <View style={styles.historyRow} testID={`exercise-history-${log.id}`}>
      <Text style={styles.historyEmoji}>{type?.emoji ?? '🏅'}</Text>
      <View style={styles.historyMeta}>
        <View style={styles.historyLabelRow}>
          <Text style={styles.historyLabel}>{localizedLabel}</Text>
          <View style={[styles.sourceBadge, isHealth ? styles.sourceBadgeHealth : styles.sourceBadgeManual]}>
            <Text style={[styles.sourceBadgeText, isHealth ? styles.sourceBadgeTextHealth : styles.sourceBadgeTextManual]}>
              {isHealth ? tr('exercise.sourceHealth') : tr('exercise.sourceManual')}
            </Text>
          </View>
        </View>
        <Text style={styles.historySub}>{subParts.join(' · ')}</Text>
      </View>
      <Text style={styles.historyKcal}>+{Math.round(log.grossKcal).toLocaleString()} kcal</Text>
      <IconButton
        icon="close"
        size="sm"
        onPress={onDelete}
        testID={`exercise-history-delete-${log.id}`}
        accessibilityLabel={tr('exercise.deleteA11y', { label: localizedLabel })}
      />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  scroll: { maxHeight: 520 },
  content: { gap: 20, paddingBottom: 16 },
  summaryCard: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryKcal: { fontSize: fs['3xl'], fontWeight: '700', color: t.colors.content.primary, letterSpacing: ls.tight },
  summaryKcalUnit: { fontSize: fs.xs, fontWeight: '500', color: t.colors.content.secondary },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border.default,
  },
  ledgerLabel: { fontSize: fs.sm, fontWeight: '500', color: t.colors.content.secondary, flex: 1 },
  ledgerValue: { fontSize: fs.sm, fontWeight: '600', color: t.colors.content.secondary },
  ledgerResultRow: { borderTopWidth: 0, paddingTop: 4 },
  ledgerResultLabel: { fontSize: fs.sm, fontWeight: '700', color: t.colors.content.primary, flex: 1 },
  ledgerResultValue: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  ledgerResultZero: { color: t.colors.content.secondary },
  historyBlock: { gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border.default,
  },
  historyEmoji: { fontSize: 20 },
  historyMeta: { flex: 1, gap: 2 },
  historyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyLabel: { fontSize: fs.md, fontWeight: '600', color: t.colors.content.primary },
  historySub: { fontSize: fs.xs, color: t.colors.content.secondary },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceBadgeHealth: { backgroundColor: t.colors.accent.subtle, borderColor: t.colors.accent.subtle },
  sourceBadgeManual: { backgroundColor: 'transparent', borderColor: t.colors.border.default },
  sourceBadgeText: { fontSize: fs.xs, fontWeight: '600', letterSpacing: ls.wide },
  sourceBadgeTextHealth: { color: t.colors.accent.default },
  sourceBadgeTextManual: { color: t.colors.content.secondary },
  historyKcal: { fontSize: fs.sm, fontWeight: '700', color: t.colors.content.primary },
  addBlock: { gap: 12 },
  typeGrid: { gap: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeEmoji: { fontSize: 22 },
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  previewCard: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius.xl,
    padding: 16,
    gap: 8,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: fs.md, fontWeight: '600', color: t.colors.content.primary },
  previewKcal: { fontSize: fs.xl, fontWeight: '700', color: t.colors.content.primary },
});
