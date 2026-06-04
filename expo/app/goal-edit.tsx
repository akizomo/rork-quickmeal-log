import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deriveTargetCellFromDirection } from '@/constants/body-matrix';
import { PACE_OPTIONS } from '@/constants/onboarding';
import { Body, Button, Caption, Card, Heading, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { BodyType9, GoalDirection, PaceLevel } from '@/types/nutrition';
import { recommendGoal } from '@/utils/goals';

const DIRECTION_OPTIONS: { key: GoalDirection; label: string }[] = [
  { key: 'lose', label: '減らす' },
  { key: 'maintain', label: '維持' },
  { key: 'recomp', label: '引き締め' },
  { key: 'gain', label: '増やす' },
];

export default function GoalEditRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, updateProfileValues } = useAppState();

  const [direction, setDirection] = useState<GoalDirection | null>(profile.goalDirection ?? null);
  const [paceLevel, setPaceLevel] = useState<PaceLevel | null>(profile.paceLevel ?? null);

  const basis = profile.biologicalBasis ?? 'male_basis';
  const currentBodyType9 = profile.currentBodyType9 ?? null;

  const derivedTarget: BodyType9 | null = useMemo(() => {
    if (!direction || !currentBodyType9) return null;
    return deriveTargetCellFromDirection(currentBodyType9, direction);
  }, [direction, currentBodyType9]);

  const preview = useMemo(() => {
    if (!direction) return null;
    if (direction !== 'maintain' && direction !== 'recomp' && !paceLevel) return null;
    return recommendGoal({
      heightCm: profile.heightCm,
      weightKg: profile.currentWeightKg,
      ageYears: profile.ageYears ?? null,
      basis: profile.biologicalBasis ?? null,
      direction,
      activityLevel: profile.activityLevel ?? null,
      paceLevel: direction === 'maintain' ? null : paceLevel,
      targetBodyType9: derivedTarget,
      currentBodyFatPct: profile.currentBodyFatPct ?? null,
      currentStage: profile.currentBodyStage,
      targetStage: profile.targetBodyStage,
    });
  }, [direction, paceLevel, derivedTarget, profile]);

  const handleSave = useCallback(() => {
    if (!direction) return;
    if (direction !== 'maintain' && !paceLevel) return;

    updateProfileValues({
      goalDirection: direction,
      paceLevel: direction === 'maintain' || direction === 'recomp' ? null : paceLevel,
      targetBodyType9: derivedTarget,
      ...(preview && {
        targetCalories: preview.targetKcal,
        targetProtein: preview.proteinG,
        targetFat: preview.fatG,
        targetCarbs: preview.carbsG,
        targetWeightKg: preview.targetWeightKg,
        targetBodyFatPct: preview.targetBodyFatPct,
      }),
    });
    router.back();
  }, [direction, paceLevel, derivedTarget, preview, updateProfileValues, router]);

  const noNeedPace = direction === 'maintain' || direction === 'recomp';
  const canSave = direction != null && (noNeedPace || paceLevel != null);

  return (
    <>
      <Stack.Screen
        options={{
          title: '目標を変更',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <View style={styles.container} testID="goal-edit-screen">

            {/* PREVIEW — live update */}
            <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
              {preview ? (
                <>
                  <View style={styles.metricsRow}>
                    <MetricBlock label="目標体重" value={preview.targetWeightKg.toFixed(1)} unit="kg" />
                    <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
                    <MetricBlock label="目標BF%" value={String(preview.targetBodyFatPct)} unit="%" />
                  </View>
                  <View style={[styles.hr, { backgroundColor: theme.colors.border.subtle }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                    <Heading size="2xl">{preview.targetKcal}</Heading>
                    <Caption tone="tertiary" style={{ marginBottom: 4 }}>kcal / 日</Caption>
                  </View>
                  <Caption tone="secondary">
                    P {preview.proteinG}g · F {preview.fatG}g · C {preview.carbsG}g
                  </Caption>
                </>
              ) : (
                <Body tone="tertiary">目的{direction == null ? '' : '・ペース'}を選ぶとここに表示されます</Body>
              )}
            </Card>

            {/* DIRECTION — segmented */}
            <View style={{ gap: theme.spacing['2'] }}>
              <Caption tone="secondary">目的</Caption>
              <SegmentedRow
                options={DIRECTION_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
                value={direction}
                onChange={(k) => setDirection(k as GoalDirection)}
                testIDPrefix="goal-direction"
              />
            </View>

            {/* PACE — segmented (maintain時は非表示) */}
            {direction !== 'maintain' && direction !== 'recomp' ? (
              <View style={{ gap: theme.spacing['2'] }}>
                <Caption tone="secondary">ペース</Caption>
                <SegmentedRow
                  options={PACE_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
                  value={paceLevel}
                  onChange={(k) => setPaceLevel(k as PaceLevel)}
                  testIDPrefix="goal-pace"
                />
              </View>
            ) : null}

            <View style={{ flex: 1 }} />

            <Button label="保存" onPress={handleSave} disabled={!canSave} testID="goal-save" />
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

function MetricBlock({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metricBlock}>
      <Caption tone="tertiary">{label}</Caption>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <Heading size="xl">{value}</Heading>
        <Caption tone="tertiary" style={{ marginBottom: 3, color: theme.colors.content.tertiary }}>
          {unit}
        </Caption>
      </View>
    </View>
  );
}

function SegmentedRow({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (k: string) => void;
  testIDPrefix: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: theme.colors.surface.sunken, borderColor: theme.colors.border.subtle },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              active
                ? {
                    backgroundColor: theme.colors.action.primary.default,
                  }
                : null,
            ]}
            testID={`${testIDPrefix}-${opt.key}`}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: active ? '700' : '600',
                color: active ? theme.colors.content.onAction : theme.colors.content.primary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  container: { flex: 1, padding: 18, gap: 16 },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metricBlock: { flex: 1, gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 40, marginHorizontal: 8 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
});
