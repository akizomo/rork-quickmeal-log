import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Chip } from '@/design-system';
import { useTheme } from '@/design-system';
import { palette } from '@/constants/theme';
import { EXERCISE_TYPES, calcExerciseGrossKcal, calcExerciseNetKcal, ExerciseTypeKey } from '@/utils/goals';
import { useAppState } from '@/providers/app-state-provider';

const DURATION_PRESETS = [15, 20, 30, 45, 60] as const;

interface ExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ExerciseSheet = memo(function ExerciseSheet({ visible, onClose }: ExerciseSheetProps) {
  const t = useTheme();
  const { logExercise, profile } = useAppState();
  const [selectedType, setSelectedType] = useState<ExerciseTypeKey>('walking');
  const [minutes, setMinutes] = useState<number>(30);

  const weightKg = profile.currentWeightKg ?? 60;
  const activityLevel = profile.activityLevel ?? 1;

  const selectedTypeInfo = useMemo(
    () => EXERCISE_TYPES.find((et) => et.key === selectedType)!,
    [selectedType]
  );

  const grossKcal = useMemo(
    () => calcExerciseGrossKcal(selectedTypeInfo.met, weightKg, minutes),
    [selectedTypeInfo.met, weightKg, minutes]
  );

  const netKcal = useMemo(
    () => calcExerciseNetKcal(grossKcal, activityLevel),
    [grossKcal, activityLevel]
  );

  const handleSave = useCallback(() => {
    logExercise(selectedType, minutes);
    onClose();
  }, [logExercise, selectedType, minutes, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="運動を記録"
      primaryAction={{ label: '追加', onPress: handleSave }}
      secondaryAction={{ label: 'キャンセル', onPress: onClose }}
      testID="exercise-sheet"
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.content}>
          {/* Exercise type grid */}
          <Text style={styles.sectionLabel}>種類</Text>
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
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '600',
                        textAlign: 'center',
                        color: active ? t.colors.action.primary.onContainer : t.colors.content.primary,
                      }}>
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Duration presets */}
          <Text style={styles.sectionLabel}>時間</Text>
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

          {/* Calorie preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>消費カロリー</Text>
              <Text style={styles.previewKcal}>{grossKcal} kcal</Text>
            </View>
            {activityLevel > 1 ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabelSub}>目標に加算(差分)</Text>
                <Text style={styles.previewKcalSub}>+{netKcal} kcal</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  scroll: { maxHeight: 480 },
  content: { gap: 16, paddingBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  typeGrid: {
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeEmoji: {
    fontSize: 22,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  previewKcal: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  previewLabelSub: {
    fontSize: 12,
    color: palette.textMuted,
  },
  previewKcalSub: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.sageStrong,
  },
});
