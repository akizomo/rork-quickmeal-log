import { X } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Chip, useTheme } from '@/design-system';
import { palette } from '@/constants/theme';
import {
  ACTIVITY_BONUS_DAILY_CAP_KCAL,
  calcActivityBonusKcal,
  calcBaselineActiveKcal,
  calcExerciseGrossKcal,
  EXERCISE_TYPES,
  ExerciseTypeKey,
  stepsToActiveKcal,
} from '@/utils/goals';
import { useAppState } from '@/providers/app-state-provider';
import type { ExerciseLog } from '@/types/nutrition';

const DURATION_PRESETS = [15, 20, 30, 45, 60] as const;

interface ExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ExerciseSheet = memo(function ExerciseSheet({ visible, onClose }: ExerciseSheetProps) {
  const t = useTheme();
  const {
    logExercise,
    deleteExerciseLog,
    profile,
    todayDailyActivity,
    todayExerciseLogs,
    todayGrossExerciseKcal,
  } = useAppState();
  const [selectedType, setSelectedType] = useState<ExerciseTypeKey>('walking');
  const [minutes, setMinutes] = useState<number>(30);

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
    !!todayDailyActivity && (todayDailyActivity.steps > 0 || todayDailyActivity.activeKcal > 0);
  const hasWorkouts = todayExerciseLogs.length > 0;

  // 差分方式 (PRD §6.4.3): 当日活動のうち「基準超過分」が目標に反映される。
  // ここではその反映分の根拠を可視化する (なぜ食べられる量が増えたか)。
  const activityBonusKcal = useMemo(() => {
    const baseline = calcBaselineActiveKcal(profile);
    if (baseline == null || !todayDailyActivity) return 0;
    const measured =
      todayDailyActivity.activeKcal > 0
        ? todayDailyActivity.activeKcal
        : stepsToActiveKcal(todayDailyActivity.steps, profile.currentWeightKg);
    return calcActivityBonusKcal(baseline, measured);
  }, [profile, todayDailyActivity]);
  const activityBonusCapped = activityBonusKcal >= ACTIVITY_BONUS_DAILY_CAP_KCAL;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="今日の消費"
      primaryAction={{ label: '追加', onPress: handleSave }}
      secondaryAction={{ label: 'キャンセル', onPress: onClose }}
      testID="exercise-sheet"
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.content}>
          {/* === 今日の合計 (消費 kcal 合算 + 内訳) === */}
          <View style={styles.summaryCard} testID="exercise-summary-card">
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>今日の消費</Text>
              <Text style={styles.summaryKcal}>
                {Math.round(todayGrossExerciseKcal + (todayDailyActivity?.activeKcal ?? 0)).toLocaleString()}
                <Text style={styles.summaryKcalUnit}> kcal</Text>
              </Text>
            </View>
            {hasHealthActivity ? (
              <View style={styles.activityRow} testID="exercise-activity-summary">
                <Text style={styles.activityLabel}>
                  ヘルスデータ ({Math.round(todayDailyActivity!.steps).toLocaleString()}歩)
                </Text>
                <Text style={styles.activityKcal}>
                  +{Math.round(todayDailyActivity!.activeKcal).toLocaleString()} kcal
                </Text>
              </View>
            ) : null}
            {activityBonusKcal > 0 ? (
              <View style={styles.bonusRow} testID="exercise-activity-bonus">
                <Text style={styles.bonusLabel}>
                  目標に反映 (基準超過分){activityBonusCapped ? '・上限' : ''}
                </Text>
                <Text style={styles.bonusKcal}>+{activityBonusKcal.toLocaleString()} kcal</Text>
              </View>
            ) : null}
          </View>

          {/* === 今日の運動履歴 === */}
          {hasWorkouts ? (
            <View style={styles.historyBlock} testID="exercise-history-list">
              <Text style={styles.sectionLabel}>今日の運動</Text>
              {todayExerciseLogs.map((log) => (
                <ExerciseHistoryRow key={log.id} log={log} onDelete={() => deleteExerciseLog(log.id)} />
              ))}
            </View>
          ) : null}

          {/* === 運動を追加 === */}
          <View style={styles.addBlock}>
            <Text style={styles.sectionLabel}>運動を追加</Text>
            <View style={styles.typeGrid}>
              {[EXERCISE_TYPES.slice(0, 4), EXERCISE_TYPES.slice(4)].map((row, rowIdx) => (
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

function ExerciseHistoryRow({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const type = EXERCISE_TYPES.find((t) => t.key === log.exerciseType);
  return (
    <View style={styles.historyRow} testID={`exercise-history-${log.id}`}>
      <Text style={styles.historyEmoji}>{type?.emoji ?? '🏅'}</Text>
      <View style={styles.historyMeta}>
        <Text style={styles.historyLabel}>{log.exerciseLabel}</Text>
        <Text style={styles.historySub}>{log.minutes}分</Text>
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
        <X size={14} color={palette.textMuted} strokeWidth={2} />
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  activityLabel: { fontSize: 12, fontWeight: '500', color: palette.textMuted },
  activityKcal: { fontSize: 13, fontWeight: '600', color: palette.text },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  bonusLabel: { fontSize: 11, fontWeight: '500', color: palette.sageDeep },
  bonusKcal: { fontSize: 13, fontWeight: '700', color: palette.sageDeep },
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
  historyLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
  historySub: { fontSize: 11, color: palette.textMuted },
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
