import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACTIVITY_LEVEL_OPTIONS, BASIS_OPTIONS } from '@/constants/onboarding';
import { Body, Button, Card, Heading, SelectCard, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { ActivityLevel, BiologicalBasis } from '@/types/nutrition';

export default function ProfileRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, updateProfileValues } = useAppState();

  const [heightCm, setHeightCm] = useState<string>(profile.heightCm != null ? String(profile.heightCm) : '');
  const [ageYears, setAgeYears] = useState<string>(profile.ageYears != null ? String(profile.ageYears) : '');
  const [basis, setBasis] = useState<BiologicalBasis | null>(profile.biologicalBasis ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activityLevel ?? null);

  const handleSave = useCallback(() => {
    const h = Number(heightCm);
    const a = Number(ageYears);
    updateProfileValues({
      heightCm: Number.isFinite(h) && h > 0 ? h : null,
      ageYears: Number.isFinite(a) && a > 0 ? Math.round(a) : null,
      biologicalBasis: basis,
      activityLevel,
    });
    router.back();
  }, [heightCm, ageYears, basis, activityLevel, updateProfileValues, router]);

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
              <View style={{ gap: theme.spacing['1'] }}>
                <Heading size="lg">身体基準</Heading>
                <Body size="sm" tone="secondary">RMR・推奨タンパク質量に反映されます</Body>
              </View>
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
              <View style={{ gap: theme.spacing['1'] }}>
                <Heading size="lg">運動習慣</Heading>
                <Body size="sm" tone="secondary">活動係数・推奨タンパク質量に反映されます</Body>
              </View>
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
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fs.md,
    textAlign: 'right',
    minWidth: 72,
  },
  suffix: { fontSize: fs.sm, minWidth: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
