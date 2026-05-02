/**
 * IdentityLogSheet — Identity-first 食事入力シート (Phase 3).
 *
 * 旧 QuickIngredientSheet / DishQuickEntrySheet を統合する次世代シート。
 * バケット別 Identity 一覧 → Attribute → Style → 量 → Add-on → 合計プレビュー。
 *
 * 計算は `resolveLog()` (純粋関数) に委譲。本コンポーネントは状態管理と保存
 * トリガーのみを担う。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Trash2, X } from 'lucide-react-native';

import {
  BottomSheet,
  Caption,
  Chip,
  NumberField,
  useTheme,
} from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import {
  getBucketDef,
  getIdentitiesInBucket,
  getIdentity,
  resolveAddonRef,
} from '@/constants/identity';
import {
  AmountUnit,
  Identity,
} from '@/types/identity';
import {
  resolveLog,
  ResolveAddonInput,
  ResolveResult,
} from '@/utils/identity-resolver';
import { palette } from '@/constants/theme';
import { Macro } from '@/types/nutrition';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIT_LABEL: Record<AmountUnit, string> = {
  g: 'g',
  ml: 'ml',
  piece: '個',
  serving: '人前',
  plate: '皿',
  slice: '切',
  cut: '切れ',
};

function parseAmountInput(text: string): number {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (cleaned.length === 0) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultAttributeKey(identity: Identity | undefined): string | undefined {
  if (!identity?.attributes?.length) return undefined;
  return identity.attributes.find((a) => a.isDefault)?.key ?? identity.attributes[0].key;
}

function defaultStyleKey(identity: Identity | undefined): string | undefined {
  if (!identity?.styles?.length) return undefined;
  return identity.styles.find((s) => s.isDefault)?.key ?? identity.styles[0].key;
}

function getAddonLabel(refId: string, refType: 'identity' | 'addon'): string {
  const ref = resolveAddonRef(refId);
  if (!ref) return refId;
  if (ref.type === 'addon') return ref.data.label;
  const identity = getIdentity(ref.identityId);
  return identity?.asAddon?.defaultLabel ?? identity?.label ?? refId;
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing['3'] }}>
      <Caption tone="secondary" style={{ marginBottom: t.spacing['1'] }}>
        {title}
      </Caption>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
      {children}
    </View>
  );
}

function HorizontalChipRow({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: t.spacing['2'], paddingRight: t.spacing['2'] }}
    >
      {children}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function IdentityLogSheet() {
  const t = useTheme();
  const {
    identityLogSheet,
    closeIdentityLogSheet,
    submitIdentityLog,
    updateLivePreview,
    deleteLog,
    logs,
  } = useAppState();

  const visible = identityLogSheet.visible;
  const bucketKey = identityLogSheet.bucketKey;
  const bucket = bucketKey ? getBucketDef(bucketKey) : undefined;
  const identitiesInBucket = useMemo(
    () => (bucketKey ? getIdentitiesInBucket(bucketKey) : []),
    [bucketKey]
  );

  const [originIdentityId, setOriginIdentityId] = useState<string | undefined>(
    identityLogSheet.identityId
  );
  const [attributeKey, setAttributeKey] = useState<string | undefined>(undefined);
  const [styleKey, setStyleKey] = useState<string | undefined>(undefined);
  const [amountValue, setAmountValue] = useState<number>(0);
  const [addons, setAddons] = useState<ResolveAddonInput[]>([]);

  // When in edit mode, use the existing log to pre-fill state.
  const editingLog = useMemo(() => {
    if (!identityLogSheet.editingLogId) return null;
    return logs.find((l) => l.id === identityLogSheet.editingLogId) ?? null;
  }, [identityLogSheet.editingLogId, logs]);

  // Initialize when sheet opens / target identity changes
  useEffect(() => {
    if (!visible || !bucketKey) {
      setOriginIdentityId(undefined);
      setAttributeKey(undefined);
      setStyleKey(undefined);
      setAmountValue(0);
      setAddons([]);
      return;
    }
    // Edit mode: pre-fill from the existing log
    if (editingLog) {
      const id = editingLog.originIdentityId ?? editingLog.identityId ?? identitiesInBucket[0]?.id;
      if (!id) return;
      const identity = getIdentity(id);
      setOriginIdentityId(id);
      setAttributeKey(editingLog.attrKey ?? defaultAttributeKey(identity));
      setStyleKey(editingLog.styleKey ?? defaultStyleKey(identity));
      setAmountValue(editingLog.amountValue ?? identity?.amount.default ?? 1);
      setAddons(
        (editingLog.appliedAddons ?? []).map((a) => ({
          refId: a.refId,
          refType: a.refType,
          units: a.units,
        }))
      );
      return;
    }
    // Insert mode: default state
    const initialId = identityLogSheet.identityId ?? identitiesInBucket[0]?.id;
    if (!initialId) return;
    const identity = getIdentity(initialId);
    setOriginIdentityId(initialId);
    setAttributeKey(defaultAttributeKey(identity));
    setStyleKey(defaultStyleKey(identity));
    setAmountValue(identity?.amount.default ?? 1);
    setAddons([]);
  }, [visible, bucketKey, identityLogSheet.identityId, identitiesInBucket, editingLog]);

  const origin = originIdentityId ? getIdentity(originIdentityId) : undefined;

  const handleSelectIdentity = useCallback((identity: Identity) => {
    setOriginIdentityId(identity.id);
    setAttributeKey(defaultAttributeKey(identity));
    setStyleKey(defaultStyleKey(identity));
    setAmountValue(identity.amount.default);
    setAddons([]);
  }, []);

  const handleSelectAttribute = useCallback((key: string) => {
    setAttributeKey((prev) => (prev === key ? prev : key));
  }, []);

  const handleSelectStyle = useCallback((key: string) => {
    setStyleKey((prev) => (prev === key ? prev : key));
  }, []);

  const handleSelectAmountChip = useCallback((value: number) => {
    setAmountValue(value);
  }, []);

  const handleEditAmount = useCallback((text: string) => {
    setAmountValue(parseAmountInput(text));
  }, []);

  const toggleAddon = useCallback(
    (refId: string) => {
      const ref = resolveAddonRef(refId);
      if (!ref) return;
      const refType: 'identity' | 'addon' = ref.type === 'addon' ? 'addon' : 'identity';
      setAddons((prev) => {
        const idx = prev.findIndex((a) => a.refId === refId);
        if (idx >= 0) {
          // Already present → remove on tap
          return prev.filter((_, i) => i !== idx);
        }
        return [...prev, { refId, refType, units: 1 }];
      });
    },
    []
  );

  // Compute resolved log on every change
  const resolved: ResolveResult | null = useMemo(() => {
    if (!origin) return null;
    try {
      return resolveLog({
        originIdentityId: origin.id,
        attributeKey,
        styleKey,
        amountValue: amountValue > 0 ? amountValue : undefined,
        addons,
      });
    } catch (error) {
      console.log('[IdentityLogSheet] resolveLog failed', error);
      return null;
    }
  }, [origin, attributeKey, styleKey, amountValue, addons]);

  // Push live preview whenever resolved changes (sheet visible only).
  // FloatingFeedback renders this in a "tentative" style at the calorie-ring
  // position, transitioning to the green confirmed feedback after save.
  useEffect(() => {
    if (!visible || !resolved || !origin) {
      return;
    }
    if (resolved.totalMacro.kcal <= 0) {
      return;
    }
    updateLivePreview({
      label: origin.label,
      macro: resolved.totalMacro,
    });
  }, [visible, resolved, origin, updateLivePreview]);

  const handleSave = useCallback(async () => {
    if (!resolved) return;
    updateLivePreview(null); // clear preview; submitIdentityLog will fire green feedback
    await submitIdentityLog(resolved);
  }, [resolved, submitIdentityLog, updateLivePreview]);

  const confirmDelete = useCallback(() => {
    if (!editingLog) return;
    Alert.alert(
      '記録を削除',
      'この記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteLog(editingLog.id);
            updateLivePreview(null);
            closeIdentityLogSheet();
          },
        },
      ],
    );
  }, [editingLog, deleteLog, updateLivePreview, closeIdentityLogSheet]);

  const canSave = !!resolved && resolved.totalMacro.kcal > 0;

  // Default add-on chips visible (origin Identity's defaultAddonIds)
  const visibleAddonIds = origin?.defaultAddonIds ?? [];

  return (
    <BottomSheet
      visible={visible}
      onClose={closeIdentityLogSheet}
      title={bucket ? `${bucket.emoji} ${bucket.label}` : ''}
      primaryAction={{
        label: editingLog ? '更新' : '保存して追加',
        onPress: handleSave,
        disabled: !canSave,
      }}
      footerLeft={<FooterPreview macro={resolved?.totalMacro ?? null} />}
      headerRight={
        <View style={{ flexDirection: 'row', gap: t.spacing['3'], alignItems: 'center' }}>
          {editingLog ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="この記録を削除"
              hitSlop={8}
              testID="ils-delete"
            >
              <Trash2 size={22} color={palette.danger} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={closeIdentityLogSheet}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
            hitSlop={8}
            testID="ils-close"
          >
            <X size={22} color={t.colors.content.secondary} />
          </Pressable>
        </View>
      }
      // Fixed half-screen sheet. `expandToFull` keeps the sheet from shrinking
      // to its intrinsic content height, so chip rows / Add-on toggles / amount
      // edits don't cause the sheet to "jump" up and down while the user is
      // interacting. The internal ScrollView absorbs any overflow.
      maxHeightRatio={0.6}
      expandToFull
      testID="identity-log-sheet"
    >
      {bucket && origin ? (
        <>
          {/* Identity chip row (no Section header — bucket emoji+label is in
              the sheet header above this row). */}
          <View style={{ marginBottom: t.spacing['3'] }}>
            <HorizontalChipRow>
              {identitiesInBucket.map((id) => (
                <Chip
                  key={id.id}
                  label={id.label}
                  selected={origin.id === id.id}
                  onPress={() => handleSelectIdentity(id)}
                  size="sm"
                  testID={`ils-identity-${id.id}`}
                />
              ))}
            </HorizontalChipRow>
          </View>

          {/* Attribute */}
          {origin.attributes && origin.attributes.length > 0 ? (
            <Section title="種類">
              <ChipRow>
                {origin.attributes.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={attributeKey === opt.key}
                    onPress={() => handleSelectAttribute(opt.key)}
                    size="sm"
                    testID={`ils-attr-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {/* Style */}
          {origin.styles && origin.styles.length > 0 ? (
            <Section title="調理">
              <ChipRow>
                {origin.styles.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label + (opt.migration ? ' →' : '')}
                    selected={styleKey === opt.key}
                    onPress={() => handleSelectStyle(opt.key)}
                    size="sm"
                    testID={`ils-style-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {/* Amount */}
          <Section title="量">
            {origin.amount.chips && origin.amount.chips.length > 0 ? (
              <ChipRow>
                {origin.amount.chips.map((c) => (
                  <Chip
                    key={`${c.label}-${c.value}`}
                    label={c.label}
                    selected={amountValue === c.value}
                    onPress={() => handleSelectAmountChip(c.value)}
                    size="sm"
                    testID={`ils-amount-${c.value}`}
                  />
                ))}
              </ChipRow>
            ) : null}
            <View
              style={{
                marginTop: origin.amount.chips ? t.spacing['2'] : 0,
                backgroundColor: t.colors.surface.raised,
                borderRadius: t.radius.lg,
                paddingHorizontal: t.spacing['3'],
              }}
            >
              <NumberField
                value={amountValue.toString()}
                onChangeText={handleEditAmount}
                suffix={origin.amount.unitLabel ?? UNIT_LABEL[origin.amount.unit]}
                size="lg"
                decimal
                testID="ils-amount-input"
              />
            </View>
            {origin.referenceDescription ? (
              <Caption tone="tertiary" style={{ marginTop: t.spacing['2'] }} testID="ils-amount-ref">
                目安: {origin.referenceDescription}
              </Caption>
            ) : null}
          </Section>

          {/* Add-ons */}
          {visibleAddonIds.length > 0 ? (
            <Section title="ちょい足し">
              <ChipRow>
                {visibleAddonIds.map((aid) => {
                  const selected = addons.some((a) => a.refId === aid);
                  return (
                    <Chip
                      key={aid}
                      label={selected ? `✓ ${getAddonLabel(aid, 'identity')}` : `+ ${getAddonLabel(aid, 'identity')}`}
                      selected={selected}
                      onPress={() => toggleAddon(aid)}
                      size="sm"
                      testID={`ils-addon-${aid}`}
                    />
                  );
                })}
              </ChipRow>
            </Section>
          ) : null}

          {/* Migration hint */}
          {resolved?.confirmMessage ? (
            <View
              style={{
                marginBottom: t.spacing['3'],
                padding: t.spacing['3'],
                backgroundColor: t.colors.surface.raised,
                borderRadius: t.radius.md,
              }}
            >
              <Caption tone="secondary">→ {resolved.confirmMessage}</Caption>
            </View>
          ) : null}

          {/* Macro preview (kcal + PFC) is rendered in the footer's left slot
              via `footerLeft={<FooterPreview ... />}`, EC-cart style. */}
        </>
      ) : null}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// FooterPreview — passed to BottomSheet's `footerLeft` slot. Renders
// `kcal` + `P/F/C` next to the primary CTA, EC-cart style. Shows muted
// placeholder text when no resolvable amount is set so the footer never
// appears empty.
// ---------------------------------------------------------------------------

function FooterPreview({ macro }: { macro: Macro | null }) {
  const t = useTheme();
  const ready = !!macro && macro.kcal > 0;
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: t.typography.fontSize.lg,
          fontWeight: '700',
          color: ready ? palette.sageDeep : t.colors.content.tertiary,
        }}
        testID="ils-preview-kcal"
      >
        {ready ? `${Math.round(macro!.kcal)} kcal` : '— kcal'}
      </Text>
      <Text
        style={{
          fontSize: t.typography.fontSize.xs,
          color: palette.textMuted,
          marginTop: 2,
        }}
        testID="ils-preview-pfc"
      >
        {ready
          ? `P${Math.round(macro!.protein)} · F${Math.round(macro!.fat)} · C${Math.round(macro!.carbs)}`
          : 'P— · F— · C—'}
      </Text>
    </View>
  );
}
