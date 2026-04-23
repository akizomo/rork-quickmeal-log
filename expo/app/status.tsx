import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyTypeSilhouette } from '@/components/BodyTypeSilhouette';
import {
  ALL_FAVORITE_ITEMS,
  BASIS_OPTIONS,
  BODY_STAGES,
  LEGAL_LINKS,
  MEAL_SLOT_LABELS,
  MEAL_STYLE_OPTIONS,
  TRIAL_DURATION_DAYS,
} from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import { BiologicalBasis, BodyStage, GoalDirection, MealSlotKey, MealStyle, PortionTendency } from '@/types/nutrition';
import { recommendGoal, recomputePfcFromKcal, trialDaysRemaining } from '@/utils/goals';

export default function StatusRoute() {
  const router = useRouter();
  const { profile, settings, weights, updateProfileValues, updateSettingsValues, addWeightEntry, resetOnboarding } = useAppState();
  const [weightSheetVisible, setWeightSheetVisible] = useState<boolean>(false);
  const [weightInput, setWeightInput] = useState<string>('');

  const latestDelta = useMemo(() => {
    if (weights.length < 2) return null;
    return Number((weights[0].weightKg - weights[1].weightKg).toFixed(1));
  }, [weights]);

  const avg7 = useMemo(() => {
    if (weights.length === 0) return null;
    const recent = weights.slice(0, 7);
    const sum = recent.reduce((acc, w) => acc + w.weightKg, 0);
    return Math.round((sum / recent.length) * 10) / 10;
  }, [weights]);

  const trialDays = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);

  const openLink = (url: string) => {
    Linking.openURL(url).catch((e) => console.log('[status] link', e));
  };

  const submitWeight = () => {
    const v = Number(weightInput);
    if (!Number.isFinite(v) || v <= 0) return;
    addWeightEntry(v);
    setWeightInput('');
    setWeightSheetVisible(false);
  };

  const recommend = useCallback(() => {
    const rec = recommendGoal({
      heightCm: profile.heightCm,
      weightKg: profile.currentWeightKg,
      ageYears: profile.ageYears ?? null,
      basis: profile.biologicalBasis ?? null,
      direction: profile.goalDirection ?? null,
      currentStage: profile.currentBodyStage,
      targetStage: profile.targetBodyStage,
    });
    if (rec) {
      updateProfileValues({
        targetCalories: rec.targetKcal,
        targetProtein: rec.proteinG,
        targetFat: rec.fatG,
        targetCarbs: rec.carbsG,
        targetWeightKg: rec.targetWeightKg,
        targetBodyFatPct: rec.targetBodyFatPct,
      });
    }
  }, [profile, updateProfileValues]);

  const adjustKcal = (delta: number) => {
    const nextKcal = Math.max(1200, (profile.targetCalories || 0) + delta);
    const pfc = recomputePfcFromKcal(nextKcal, profile.goalDirection);
    updateProfileValues({
      targetCalories: nextKcal,
      targetProtein: pfc.proteinG,
      targetFat: pfc.fatG,
      targetCarbs: pfc.carbsG,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Status',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.page}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="status-screen">

            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                {profile.biologicalBasis && profile.currentBodyStage ? (
                  <BodyTypeSilhouette basis={profile.biologicalBasis} stage={profile.currentBodyStage} active size={56} />
                ) : (
                  <View style={styles.heroAvatar}><Text style={styles.heroAvatarEmoji}>🧑🏻</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>{profile.name ?? 'You'}</Text>
                  <Text style={styles.heroSubtitle}>
                    {profile.currentWeightKg ? `${profile.currentWeightKg} kg` : '体重未設定'}
                    {profile.targetWeightKg ? ` → ${profile.targetWeightKg} kg` : ''}
                  </Text>
                  {latestDelta !== null ? (
                    <Text style={styles.heroDelta}>
                      最近の変化 {latestDelta > 0 ? '+' : ''}{latestDelta} kg {avg7 ? `· 7日平均 ${avg7} kg` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable style={styles.weightButton} onPress={() => setWeightSheetVisible(true)} testID="status-update-weight">
                <Text style={styles.weightButtonText}>体重を更新する</Text>
              </Pressable>
            </View>

            <Section title="現在の状態">
              <NumberRow label="身長" value={profile.heightCm} suffix="cm" onChange={(v) => updateProfileValues({ heightCm: v })} />
              <NumberRow label="現在体重" value={profile.currentWeightKg} suffix="kg" onChange={(v) => updateProfileValues({ currentWeightKg: v })} />
              <NumberRow label="体脂肪率" value={profile.currentBodyFatPct ?? null} suffix="%" onChange={(v) => updateProfileValues({ currentBodyFatPct: v })} />
              <NumberRow label="年齢" value={profile.ageYears ?? null} suffix="歳" onChange={(v) => updateProfileValues({ ageYears: v })} integer />
              <BasisRow basis={profile.biologicalBasis ?? null} onChange={(b) => updateProfileValues({ biologicalBasis: b })} />
              <BodyStageRow
                label="現在の体格"
                basis={profile.biologicalBasis ?? 'male_basis'}
                stage={profile.currentBodyStage ?? null}
                onChange={(s) => updateProfileValues({ currentBodyStage: s })}
              />
            </Section>

            <Section title="目標">
              <DirectionRow direction={profile.goalDirection ?? null} onChange={(d) => updateProfileValues({ goalDirection: d })} />
              <BodyStageRow
                label="目指す体格"
                basis={profile.biologicalBasis ?? 'male_basis'}
                stage={profile.targetBodyStage ?? null}
                onChange={(s) => updateProfileValues({ targetBodyStage: s })}
              />
              <NumberRow label="目標体重" value={profile.targetWeightKg} suffix="kg" onChange={(v) => updateProfileValues({ targetWeightKg: v })} />
              <NumberRow label="目標体脂肪率" value={profile.targetBodyFatPct ?? null} suffix="%" onChange={(v) => updateProfileValues({ targetBodyFatPct: v })} />
              <View style={styles.kcalRow}>
                <Text style={styles.rowLabel}>1日の目標 kcal</Text>
                <View style={styles.adjustRow}>
                  <Pressable style={styles.adjustButton} onPress={() => adjustKcal(-50)} testID="status-kcal-down">
                    <Text style={styles.adjustText}>−</Text>
                  </Pressable>
                  <Text style={styles.kcalValue}>{profile.targetCalories || '--'} kcal</Text>
                  <Pressable style={styles.adjustButton} onPress={() => adjustKcal(50)} testID="status-kcal-up">
                    <Text style={styles.adjustText}>＋</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.pfcRow}>
                <PfcCell label="P" value={profile.targetProtein} />
                <PfcCell label="F" value={profile.targetFat} />
                <PfcCell label="C" value={profile.targetCarbs} />
              </View>
              <Pressable style={styles.recommendButton} onPress={recommend} testID="status-recommend">
                <Text style={styles.recommendText}>おすすめを再提案</Text>
              </Pressable>
            </Section>

            <Section title="食事パーソナライズ">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlotKey[]).map((slot) => (
                <View key={slot} style={styles.subBlock}>
                  <Text style={styles.subBlockLabel}>{MEAL_SLOT_LABELS[slot]}</Text>
                  <View style={styles.chipsWrap}>
                    {MEAL_STYLE_OPTIONS.map((opt) => {
                      const active = (settings.mealStyleBySlot?.[slot] ?? 'unset') === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          onPress={() =>
                            updateSettingsValues({
                              mealStyleBySlot: {
                                breakfast: settings.mealStyleBySlot?.breakfast ?? 'unset',
                                lunch: settings.mealStyleBySlot?.lunch ?? 'unset',
                                dinner: settings.mealStyleBySlot?.dinner ?? 'unset',
                                snack: settings.mealStyleBySlot?.snack ?? 'unset',
                                [slot]: opt.key,
                              } as Record<MealSlotKey, MealStyle>,
                            })
                          }
                          style={[styles.chip, active ? styles.chipActive : null]}
                          testID={`status-meal-${slot}-${opt.key}`}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{opt.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={styles.subBlock}>
                <Text style={styles.subBlockLabel}>よく食べるもの</Text>
                <View style={styles.chipsWrap}>
                  {ALL_FAVORITE_ITEMS.map((item) => {
                    const active = (settings.favoriteItemIds ?? []).includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          const cur = settings.favoriteItemIds ?? [];
                          const next = cur.includes(item.id) ? cur.filter((x) => x !== item.id) : cur.length >= 5 ? cur : [...cur, item.id];
                          updateSettingsValues({ favoriteItemIds: next });
                        }}
                        style={[styles.chip, active ? styles.chipActive : null]}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.subBlock}>
                <Text style={styles.subBlockLabel}>普段の量</Text>
                <View style={styles.chipsWrap}>
                  {(['light', 'normal', 'heavy'] as PortionTendency[]).map((p) => {
                    const active = (settings.portionTendency ?? 'normal') === p;
                    return (
                      <Pressable key={p} onPress={() => updateSettingsValues({ portionTendency: p })} style={[styles.chip, active ? styles.chipActive : null]}>
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                          {p === 'light' ? '少なめ' : p === 'heavy' ? '多め' : 'ふつう'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Section>

            <Section title="サブスクリプション">
              <View style={styles.subRow}>
                <Text style={styles.rowLabel}>ステータス</Text>
                <Text style={styles.rowValue}>
                  {settings.subscriptionStatus === 'trialing'
                    ? `無料トライアル中（残り${trialDays}日）`
                    : settings.subscriptionStatus === 'active'
                    ? '有効'
                    : '未加入'}
                </Text>
              </View>
              <Pressable style={styles.linkRow} onPress={() => openLink(LEGAL_LINKS.manageSubscription)}>
                <Text style={styles.linkLabel}>購読を管理する</Text>
                <ChevronRight size={16} color={palette.textMuted} />
              </Pressable>
            </Section>

            <Section title="アプリ情報">
              <Pressable style={styles.linkRow} onPress={() => router.push('/intro')}>
                <Text style={styles.linkLabel}>アプリの使い方を見る</Text>
                <ChevronRight size={16} color={palette.textMuted} />
              </Pressable>
              <Pressable style={styles.linkRow} onPress={() => openLink(LEGAL_LINKS.terms)}>
                <Text style={styles.linkLabel}>利用規約</Text>
                <ChevronRight size={16} color={palette.textMuted} />
              </Pressable>
              <Pressable style={styles.linkRow} onPress={() => openLink(LEGAL_LINKS.privacy)}>
                <Text style={styles.linkLabel}>プライバシーポリシー</Text>
                <ChevronRight size={16} color={palette.textMuted} />
              </Pressable>
              <View style={styles.subRow}>
                <Text style={styles.rowLabel}>バージョン</Text>
                <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
              </View>
              <Pressable style={styles.resetRow} onPress={() => { resetOnboarding(); router.replace('/intro'); }} testID="status-reset-onboarding">
                <Text style={styles.resetText}>オンボーディングをやり直す</Text>
              </Pressable>
            </Section>
          </ScrollView>
        </SafeAreaView>
      </View>

      <WeightSheet
        visible={weightSheetVisible}
        onClose={() => setWeightSheetVisible(false)}
        value={weightInput}
        onChange={setWeightInput}
        onSubmit={submitWeight}
        avg7={avg7}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function NumberRow({ label, value, suffix, onChange, integer = false }: { label: string; value: number | null; suffix: string; onChange: (v: number | null) => void; integer?: boolean }) {
  const [editing, setEditing] = useState<boolean>(false);
  const [temp, setTemp] = useState<string>(value !== null ? String(value) : '');
  const commit = () => {
    if (temp === '') {
      onChange(null);
    } else {
      const n = Number(temp);
      if (Number.isFinite(n)) onChange(integer ? Math.round(n) : n);
    }
    setEditing(false);
  };
  return (
    <Pressable style={styles.subRow} onPress={() => { setTemp(value !== null ? String(value) : ''); setEditing(true); }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editing ? (
        <View style={styles.editCell}>
          <TextInput
            style={styles.editInput}
            value={temp}
            onChangeText={setTemp}
            keyboardType="numeric"
            autoFocus
            onBlur={commit}
            onSubmitEditing={commit}
          />
          <Text style={styles.rowValueSuffix}>{suffix}</Text>
        </View>
      ) : (
        <Text style={styles.rowValue}>{value !== null ? `${value} ${suffix}` : '未設定'}</Text>
      )}
    </Pressable>
  );
}

function BasisRow({ basis, onChange }: { basis: BiologicalBasis | null; onChange: (b: BiologicalBasis) => void }) {
  return (
    <View style={styles.subRow}>
      <Text style={styles.rowLabel}>身体基準</Text>
      <View style={styles.inlineChips}>
        {BASIS_OPTIONS.map((opt) => {
          const active = basis === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.smallChip, active ? styles.smallChipActive : null]}>
              <Text style={[styles.smallChipText, active ? styles.smallChipTextActive : null]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BodyStageRow({ label, basis, stage, onChange }: { label: string; basis: BiologicalBasis; stage: BodyStage | null; onChange: (s: BodyStage) => void }) {
  return (
    <View style={styles.stageBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.silhouetteRow}>
        {BODY_STAGES.map((s) => (
          <Pressable key={s} onPress={() => onChange(s)} style={[styles.silhouetteCell, stage === s ? styles.silhouetteCellActive : null]}>
            <BodyTypeSilhouette basis={basis} stage={s} active={stage === s} size={40} />
            <Text style={[styles.silhouetteLabel, stage === s ? styles.silhouetteLabelActive : null]}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DirectionRow({ direction, onChange }: { direction: GoalDirection | null; onChange: (d: GoalDirection) => void }) {
  const opts: { key: GoalDirection; label: string }[] = [
    { key: 'lose', label: '減らす' },
    { key: 'maintain', label: '維持' },
    { key: 'gain', label: '増やす' },
  ];
  return (
    <View style={styles.subRow}>
      <Text style={styles.rowLabel}>方向</Text>
      <View style={styles.inlineChips}>
        {opts.map((opt) => {
          const active = direction === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.smallChip, active ? styles.smallChipActive : null]}>
              <Text style={[styles.smallChipText, active ? styles.smallChipTextActive : null]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PfcCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.pfcCell}>
      <Text style={styles.pfcLabel}>{label}</Text>
      <Text style={styles.pfcValue}>{value}g</Text>
    </View>
  );
}

function WeightSheet({ visible, onClose, value, onChange, onSubmit, avg7 }: { visible: boolean; onClose: () => void; value: string; onChange: (v: string) => void; onSubmit: () => void; avg7: number | null }) {
  const insets = useSafeAreaInsets();
  const diff = avg7 !== null && value !== '' ? Number((Number(value) - avg7).toFixed(1)) : null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.weightSheet, { paddingBottom: 24 + insets.bottom }]} onPress={() => undefined}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.weightSheetTitle}>体重を更新</Text>
            <View style={styles.weightInputWrap}>
              <TextInput
                style={styles.weightInput}
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="56.4"
                placeholderTextColor={palette.textMuted}
                autoFocus
                testID="weight-input"
              />
              <Text style={styles.weightInputSuffix}>kg</Text>
            </View>
            {diff !== null && Number.isFinite(diff) ? (
              <Text style={styles.weightDiff}>
                7日平均との差 {diff > 0 ? '+' : ''}{diff} kg
              </Text>
            ) : null}
            <Pressable style={styles.weightSubmit} onPress={onSubmit} testID="weight-submit">
              <Text style={styles.weightSubmitText}>保存</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  scroll: { padding: 18, gap: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: palette.surface, borderRadius: 24, padding: 18, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center' },
  heroAvatarEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: palette.text },
  heroSubtitle: { fontSize: 14, color: palette.textMuted, marginTop: 4 },
  heroDelta: { fontSize: 12, color: palette.sageStrong, marginTop: 4, fontWeight: '600' },
  weightButton: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  weightButtonText: { color: palette.white, fontSize: 14, fontWeight: '700' },
  section: { backgroundColor: palette.surface, borderRadius: 22, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 12, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', marginBottom: 6 },
  sectionBody: { gap: 4 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  subBlock: { paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  subBlockLabel: { fontSize: 13, color: palette.text, fontWeight: '700' },
  rowLabel: { fontSize: 14, color: palette.text, fontWeight: '600' },
  rowValue: { fontSize: 14, color: palette.textMuted, fontWeight: '600' },
  rowValueSuffix: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },
  editCell: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, minWidth: 110 },
  editInput: { flex: 1, fontSize: 14, color: palette.text, fontWeight: '700', textAlign: 'right' },
  inlineChips: { flexDirection: 'row', gap: 6 },
  smallChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.card },
  smallChipActive: { backgroundColor: palette.sageDeep },
  smallChipText: { fontSize: 12, color: palette.text, fontWeight: '600' },
  smallChipTextActive: { color: palette.white },
  stageBlock: { paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  silhouetteRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.card, padding: 8, borderRadius: 14 },
  silhouetteCell: { alignItems: 'center', flex: 1, paddingVertical: 2, borderRadius: 10 },
  silhouetteCellActive: { backgroundColor: palette.accentSoft },
  silhouetteLabel: { fontSize: 11, color: palette.textMuted, fontWeight: '600' },
  silhouetteLabelActive: { color: palette.sageDeep, fontWeight: '700' },
  kcalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjustButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  adjustText: { fontSize: 15, color: palette.text, fontWeight: '700' },
  kcalValue: { fontSize: 16, color: palette.text, fontWeight: '700', minWidth: 100, textAlign: 'center' },
  pfcRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  pfcCell: { flex: 1, backgroundColor: palette.card, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  pfcLabel: { fontSize: 11, color: palette.textMuted, fontWeight: '700' },
  pfcValue: { fontSize: 14, color: palette.text, fontWeight: '700', marginTop: 2 },
  recommendButton: { backgroundColor: palette.accentSoft, borderRadius: 999, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  recommendText: { color: palette.sageDeep, fontSize: 13, fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.card },
  chipActive: { backgroundColor: palette.sageDeep },
  chipText: { fontSize: 12, color: palette.text, fontWeight: '600' },
  chipTextActive: { color: palette.white },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  linkLabel: { fontSize: 14, color: palette.text, fontWeight: '600' },
  resetRow: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  resetText: { color: palette.danger, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 28, 24, 0.4)', justifyContent: 'flex-end' },
  weightSheet: { backgroundColor: palette.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 12, gap: 16 },
  sheetGrabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.border, marginBottom: 8 },
  weightSheetTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  weightInput: { flex: 1, fontSize: 26, color: palette.text, fontWeight: '700' },
  weightInputSuffix: { fontSize: 14, color: palette.textMuted, fontWeight: '700' },
  weightDiff: { fontSize: 13, color: palette.textMuted },
  weightSubmit: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  weightSubmitText: { color: palette.white, fontSize: 15, fontWeight: '700' },
});
