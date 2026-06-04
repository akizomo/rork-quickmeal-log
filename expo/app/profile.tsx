import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyTypeMatrix } from '@/components/BodyTypeMatrix';
import { ACTIVITY_LEVEL_OPTIONS, BASIS_OPTIONS } from '@/constants/onboarding';
import { Body, Button, Caption, Card, Heading, SelectCard, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { ActivityLevel, BiologicalBasis, BodyType9 } from '@/types/nutrition';

export default function ProfileRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, updateProfileValues } = useAppState();

  const [heightCm, setHeightCm] = useState<string>(profile.heightCm != null ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState<string>(profile.currentWeightKg != null ? String(profile.currentWeightKg) : '');
  const [ageYears, setAgeYears] = useState<string>(profile.ageYears != null ? String(profile.ageYears) : '');
  const [basis, setBasis] = useState<BiologicalBasis | null>(profile.biologicalBasis ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activityLevel ?? null);
  const [currentBodyType9, setCurrentBodyType9] = useState<BodyType9 | null>(profile.currentBodyType9 ?? null);

  const handleSave = useCallback(() => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    const a = Number(ageYears);
    updateProfileValues({
      heightCm: Number.isFinite(h) && h > 0 ? h : null,
      currentWeightKg: Number.isFinite(w) && w > 0 ? w : null,
      ageYears: Number.isFinite(a) && a > 0 ? Math.round(a) : null,
      biologicalBasis: basis,
      activityLevel,
      currentBodyType9,
    });
    router.back();
  }, [heightCm, weightKg, ageYears, basis, activityLevel, currentBodyType9, updateProfileValues, router]);

  const inputStyle = [
    styles.input,
    {
      color: theme.colors.content.primary,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.sunken,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'プロフィール',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" testID="profile-screen">
            <Caption tone="secondary">→ 計算の基準として使います</Caption>

            {/* 基礎データ: コンパクトなリスト形式 */}
            <Card variant="raised" style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Heading size="lg">基礎データ</Heading>
              </View>
              <DataRow label="身長">
                <TextInput
                  style={inputStyle}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={theme.colors.content.tertiary}
                  testID="profile-height"
                />
                <Text style={[styles.suffix, { color: theme.colors.content.secondary }]}>cm</Text>
              </DataRow>
              <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
              <DataRow label="体重">
                <TextInput
                  style={inputStyle}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={theme.colors.content.tertiary}
                  testID="profile-weight"
                />
                <Text style={[styles.suffix, { color: theme.colors.content.secondary }]}>kg</Text>
              </DataRow>
              <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />
              <DataRow label="年齢">
                <TextInput
                  style={inputStyle}
                  value={ageYears}
                  onChangeText={setAgeYears}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={theme.colors.content.tertiary}
                  testID="profile-age"
                />
                <Text style={[styles.suffix, { color: theme.colors.content.secondary }]}>歳</Text>
              </DataRow>
            </Card>

            <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
              <Heading size="lg">身体基準</Heading>
              <Caption tone="secondary">RMR・推奨タンパク質量に反映されます</Caption>
              <View style={{ gap: theme.spacing['2'] }}>
                {BASIS_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.key}
                    label={opt.label}
                    selected={basis === opt.key}
                    onPress={() => setBasis(opt.key)}
                    testID={`profile-basis-${opt.key}`}
                  />
                ))}
              </View>
            </Card>

            <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
              <Heading size="lg">運動習慣</Heading>
              <Caption tone="secondary">活動係数・推奨タンパク質量に反映されます</Caption>
              <View style={{ gap: theme.spacing['2'] }}>
                {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.level}
                    label={opt.label}
                    hint={opt.hint}
                    selected={activityLevel === opt.level}
                    onPress={() => setActivityLevel(opt.level)}
                    testID={`profile-activity-${opt.level}`}
                  />
                ))}
              </View>
            </Card>

            <Card variant="raised" style={{ gap: theme.spacing['3'] }}>
              <Heading size="lg">現在の体型</Heading>
              <Caption tone="secondary">体脂肪率の推定や目標計算の基準に使います</Caption>
              <BodyTypeMatrix
                basis={basis ?? 'male_basis'}
                heightCm={Number.isFinite(Number(heightCm)) ? Number(heightCm) : null}
                selected={currentBodyType9}
                onSelect={setCurrentBodyType9}
                mode="current"
              />
            </Card>

            <Button label="保存" onPress={handleSave} testID="profile-save" />
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.dataRow}>
      <Body style={{ color: theme.colors.content.primary }}>{label}</Body>
      <View style={styles.dataRowValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, gap: 14, paddingBottom: 40 },
  listCard: { gap: 0, padding: 0, paddingBottom: 8, overflow: 'hidden' },
  listCardHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dataRowValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    textAlign: 'right',
    minWidth: 72,
  },
  suffix: { fontSize: 13, minWidth: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
