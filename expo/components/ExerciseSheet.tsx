import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Chip, Icon, useTheme } from '@/design-system';
import { palette } from '@/constants/theme';
import { ACTIVITY_LEVEL_OPTIONS } from '@/constants/onboarding';
import {
  ACTIVITY_BONUS_DAILY_CAP_KCAL,
  calcBaselineActiveKcal,
  calcExerciseGrossKcal,
  calcGoalAdditionKcal,
  EXERCISE_TYPES,
  ExerciseTypeKey,
  stepsToActiveKcal,
} from '@/utils/goals';
import { useAppState } from '@/providers/app-state-provider';
import { formatDateKey } from '@/utils/nutrition';
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
  const {
    logExercise,
    deleteExerciseLog,
    profile,
    exerciseLogs,
    dailyActivities,
  } = useAppState();
  const [selectedType, setSelectedType] = useState<ExerciseTypeKey>('walking');
  const [minutes, setMinutes] = useState<number>(30);

  const todayKey = formatDateKey(new Date());
  const dateKey = dateKeyProp ?? todayKey;
  const isToday = dateKey === todayKey;

  // 表示対象日のデータを導出
  const dailyActivity = useMemo(
    () => (dailyActivities ?? []).find((d) => d.date === dateKey) ?? null,
    [dailyActivities, dateKey]
  );
  const dateExerciseLogs = useMemo(
    () => exerciseLogs.filter((e) => e.date === dateKey),
    [exerciseLogs, dateKey]
  );
  const grossExerciseKcal = useMemo(
    () => dateExerciseLogs.reduce((s, e) => s + e.grossKcal, 0),
    [dateExerciseLogs]
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

  const showLedger = hasHealthActivity && baselineKcal != null;
  const activityCapped =
    showLedger &&
    measuredActiveKcal != null &&
    measuredActiveKcal - (baselineKcal as number) > ACTIVITY_BONUS_DAILY_CAP_KCAL;

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

  const sheetTitle = isToday ? '今日の消費' : 'この日の消費';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      primaryAction={{ label: '追加', onPress: handleSave }}
      secondaryAction={{ label: 'キャンセル', onPress: onClose }}
      testID="exercise-sheet"
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.summaryCard} testID="exercise-summary-card">
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>{sheetTitle}</Text>
              <Text style={styles.summaryKcal}>
                {consumedKcal.toLocaleString()}
                <Text style={styles.summaryKcalUnit}> kcal</Text>
              </Text>
            </View>
            {showLedger ? (
              <>
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>
                    活動レベル「{activityLevelLabel ?? '-'}」の想定
                  </Text>
                  <Text style={styles.ledgerValue}>
                    −{(baselineKcal as number).toLocaleString()} kcal
                  </Text>
                </View>
                <View style={[styles.ledgerRow, styles.ledgerResultRow]}>
                  <Text style={styles.ledgerResultLabel}>
                    目標に追加{activityCapped ? '（上限あり）' : ''}
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
              <Text style={styles.sectionLabel}>{isToday ? '今日の運動' : 'この日の運動'}</Text>
              {hasHealthActivity ? (
                <View style={styles.historyRow} testID="exercise-health-walking">
                  <Text style={styles.historyEmoji}>{walkingType?.emoji ?? '🚶'}</Text>
                  <View style={styles.historyMeta}>
                    <View style={styles.historyLabelRow}>
                      <Text style={styles.historyLabel}>ウォーキング</Text>
                      <View style={[styles.sourceBadge, styles.sourceBadgeHealth]}>
                        <Text style={[styles.sourceBadgeText, styles.sourceBadgeTextHealth]}>ヘルス</Text>
                      </View>
                    </View>
                    <Text style={styles.historySub}>
                      {Math.round(dailyActivity!.steps).toLocaleString()}歩
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
            <Text style={styles.sectionLabel}>運動を追加</Text>
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
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: active ? t.colors.border.focus : t.colors.border.subtle,
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
                            fontSize: 10,
                            fontWeight: '600',
                            textAlign: 'center',
                            color: active ? t.colors.action.primary.onContainer : t.colors.content.primary,
                          }}
                        >
                          {type.label}
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
                  label={`${preset}分`}
                  selected={minutes === preset}
                  onPress={() => setMinutes(preset)}
                  testID={`exercise-duration-${preset}`}
                />
              ))}
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>消費カロリー</Text>
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
  const type = EXERCISE_TYPES.find((t) => t.key === log.exerciseType);
  const isHealth = log.source === 'health';
  const time = formatLogTime(log.timestamp);
  const subParts = [`${log.minutes}分`, time].filter(Boolean) as string[];
  return (
    <View style={styles.historyRow} testID={`exercise-history-${log.id}`}>
      <Text style={styles.historyEmoji}>{type?.emoji ?? '🏅'}</Text>
      <View style={styles.historyMeta}>
        <View style={styles.historyLabelRow}>
          <Text style={styles.historyLabel}>{log.exerciseLabel}</Text>
          <View style={[styles.sourceBadge, isHealth ? styles.sourceBadgeHealth : styles.sourceBadgeManual]}>
            <Text style={[styles.sourceBadgeText, isHealth ? styles.sourceBadgeTextHealth : styles.sourceBadgeTextManual]}>
              {isHealth ? 'ヘルス' : '手動'}
            </Text>
          </View>
        </View>
        <Text style={styles.historySub}>{subParts.join(' · ')}</Text>
      </View>
      <Text style={styles.historyKcal}>+{Math.round(log.grossKcal).toLocaleString()} kcal</Text>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={styles.historyDelete}
        testID={`exercise-history-delete-${log.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${log.exerciseLabel} を削除`}
      >
        <Icon name="close" size={14} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  content: { gap: 18, paddingBottom: 16 },
  summaryCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: palette.textMuted, letterSpacing: 0.4 },
  summaryKcal: { fontSize: 26, fontWeight: '700', color: palette.text, letterSpacing: -0.4 },
  summaryKcalUnit: { fontSize: 12, fontWeight: '500', color: palette.textMuted },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  ledgerLabel: { fontSize: 12, fontWeight: '500', color: palette.textMuted, flex: 1 },
  ledgerValue: { fontSize: 12, fontWeight: '600', color: palette.textMuted },
  ledgerResultRow: { borderTopWidth: 0, paddingTop: 4 },
  ledgerResultLabel: { fontSize: 13, fontWeight: '700', color: palette.text, flex: 1 },
  ledgerResultValue: { fontSize: 15, fontWeight: '700', color: palette.sageDeep },
  ledgerResultZero: { color: palette.textMuted },
  historyBlock: { gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  historyEmoji: { fontSize: 20 },
  historyMeta: { flex: 1, gap: 2 },
  historyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
  historySub: { fontSize: 11, color: palette.textMuted },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceBadgeHealth: { backgroundColor: palette.accentSoft, borderColor: palette.accentSoft },
  sourceBadgeManual: { backgroundColor: 'transparent', borderColor: palette.border },
  sourceBadgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  sourceBadgeTextHealth: { color: palette.accent },
  sourceBadgeTextManual: { color: palette.textMuted },
  historyKcal: { fontSize: 13, fontWeight: '700', color: palette.sageDeep },
  historyDelete: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBlock: { gap: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  typeGrid: { gap: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeEmoji: { fontSize: 22 },
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  previewCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
  previewKcal: { fontSize: 20, fontWeight: '700', color: palette.sageDeep },
});
