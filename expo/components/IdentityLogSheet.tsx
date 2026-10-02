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
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Caption,
  Chip,
  Icon,
  IconButton,
  useTheme,
} from '@/design-system';
import { AmountEditDialog } from '@/components/AmountEditDialog';
import { buildIdentityAmountEditConfig } from '@/utils/amount-edit';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/hooks/useT';
import {
  buildRegistry,
  getAddonLabel,
  getBucketDef,
  getIdentity,
  resolveAddonRef,
} from '@/constants/identity';
import {
  AmountSpec,
  AmountUnit,
  Identity,
} from '@/types/identity';
import {
  resolveLog,
  ResolveAddonInput,
  ResolveResult,
} from '@/utils/identity-resolver';
import { migrateAmountValueForUnit } from '@/utils/amount-migration';
import {
  getEffectiveAltAmountSpec,
  getEffectiveAmountSpec,
  getEffectiveDefaultAddonIds,
  getHiddenAddonIds,
} from '@/utils/identity-attribute';
import { Macro } from '@/types/nutrition';
import type { AppLocale } from '@/types/locale';
import { UNIT_LABELS } from '@/utils/unit-labels';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NUMERIC_RE = /^\d+(\.\d+)?$/;

function chipDisplayLabel(label: string, unitLabel: string): string {
  return NUMERIC_RE.test(label.trim()) ? `${label}${unitLabel}` : label;
}

function defaultAttributeKey(identity: Identity | undefined): string | undefined {
  if (!identity?.attributes?.length) return undefined;
  return identity.attributes.find((a) => a.isDefault)?.key ?? identity.attributes[0].key;
}

function defaultStyleKey(identity: Identity | undefined): string | undefined {
  if (!identity?.styles?.length) return undefined;
  return identity.styles.find((s) => s.isDefault)?.key ?? identity.styles[0].key;
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
  const tr = useT();
  const { foodRegion: locale, uiLanguage } = useLocale();
  const {
    identityLogSheet,
    openIdentityLogSheet,
    closeIdentityLogSheet,
    submitIdentityLog,
    updateLivePreview,
    deleteLog,
    logs,
  } = useAppState();

  const visible = identityLogSheet.visible;
  const bucketKey = identityLogSheet.bucketKey;
  const registry = useMemo(() => buildRegistry(locale, uiLanguage), [locale, uiLanguage]);
  const bucket = bucketKey ? (registry.buckets.find((b) => b.key === bucketKey) ?? getBucketDef(bucketKey)) : undefined;
  const identitiesInBucket = useMemo(
    () => (bucketKey ? registry.byBucket[bucketKey] ?? [] : []),
    [bucketKey, registry]
  );

  const [originIdentityId, setOriginIdentityId] = useState<string | undefined>(
    identityLogSheet.identityId
  );
  const [attributeKey, setAttributeKey] = useState<string | undefined>(undefined);
  const [styleKey, setStyleKey] = useState<string | undefined>(undefined);
  const [amountValue, setAmountValue] = useState<number>(0);
  const [amountEditorOpen, setAmountEditorOpen] = useState(false);
  // 量欄の表示単位切替 (例: 唐揚げ g⇔個)。保存・計算は常に amountValue (主単位)
  // で行い、これは入力の便宜のための表示モードに過ぎない。
  const [amountModeAlt, setAmountModeAlt] = useState(false);
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
      setAmountEditorOpen(false);
      setAmountModeAlt(false);
      setAddons([]);
      return;
    }
    // Edit mode: pre-fill from the existing log
    if (editingLog) {
      // A migrated log (e.g. 鶏むね + 揚げ → 唐揚げ) has originIdentityId !==
      // identityId; its attrKey/styleKey/amountValue were all resolved against
      // the *record* Identity (fried_main), not the origin (chicken_lean), which
      // doesn't even define a matching Attribute. Re-open directly on the
      // record Identity so the chip state and 量 spec line up with saved data.
      const isMigratedLog =
        !!editingLog.originIdentityId &&
        !!editingLog.identityId &&
        editingLog.originIdentityId !== editingLog.identityId;
      const id = isMigratedLog
        ? editingLog.identityId
        : editingLog.originIdentityId ?? editingLog.identityId ?? identitiesInBucket[0]?.id;
      if (!id) return;
      const identity = getIdentity(id);
      const restoreAttrKey = editingLog.attrKey ?? defaultAttributeKey(identity);
      const restoreSpec = identity ? getEffectiveAmountSpec(identity, restoreAttrKey) : undefined;
      setOriginIdentityId(id);
      setAttributeKey(restoreAttrKey);
      setStyleKey(editingLog.styleKey ?? defaultStyleKey(identity));
      // Translate legacy 'serving' values when the Identity has since moved to 'percent'
      const rawAmount = editingLog.amountValue ?? restoreSpec?.default ?? 1;
      const targetUnit = restoreSpec?.unit;
      const migrated = targetUnit
        ? migrateAmountValueForUnit(rawAmount, editingLog.amountUnit, targetUnit)
        : rawAmount;
      setAmountValue(migrated);
      setAmountModeAlt(false);
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
    // Search results can pre-select a specific Attribute/Style (e.g. ポテトサラダ
    // = side_creamy + potato_salad) — honor it if present and valid, otherwise fall
    // back to the Identity's own default.
    const requestedAttrKey =
      identityLogSheet.attributeKey &&
      identity?.attributes?.some((a) => a.key === identityLogSheet.attributeKey)
        ? identityLogSheet.attributeKey
        : undefined;
    const requestedStyleKey =
      identityLogSheet.styleKey &&
      identity?.styles?.some((s) => s.key === identityLogSheet.styleKey)
        ? identityLogSheet.styleKey
        : undefined;
    const initAttrKey = requestedAttrKey ?? defaultAttributeKey(identity);
    setOriginIdentityId(initialId);
    setAttributeKey(initAttrKey);
    setStyleKey(requestedStyleKey ?? defaultStyleKey(identity));
    setAmountValue(
      identityLogSheet.initialAmountValue ??
        (identity ? getEffectiveAmountSpec(identity, initAttrKey).default : 1),
    );
    setAmountModeAlt(false);
    // Preset (例: ガーリックトースト = フランスパン + バター) の検索結果は、組み合わせを
    // 選択済みで開く。編集時の復元 (appliedAddons) と同じ形なので、以降の処理は変わらない。
    // 種類で隠す Add-on (factor に織り込み済みの具) は二重計上防止のため通さない。
    const hiddenForInit = identity ? getHiddenAddonIds(identity, initAttrKey) : new Set<string>();
    setAddons((identityLogSheet.initialAddons ?? []).filter((a) => !hiddenForInit.has(a.refId)));
  }, [
    visible,
    bucketKey,
    identityLogSheet.identityId,
    identityLogSheet.attributeKey,
    identityLogSheet.styleKey,
    identityLogSheet.initialAmountValue,
    identityLogSheet.initialAddons,
    identitiesInBucket,
    editingLog,
  ]);

  const origin = originIdentityId ? getIdentity(originIdentityId) : undefined;

  const handleSelectIdentity = useCallback((identity: Identity) => {
    const attrKey = defaultAttributeKey(identity);
    setOriginIdentityId(identity.id);
    setAttributeKey(attrKey);
    setStyleKey(defaultStyleKey(identity));
    setAmountValue(getEffectiveAmountSpec(identity, attrKey).default);
    setAmountModeAlt(false);
    setAddons([]);
  }, []);

  // Style/Attribute の組み合わせが PFC崩壊遮断で振替を発生させる場合、量欄が
  // 見るべき基準は origin ではなく振替先 (recordIdentity) になる。
  // 例: 鶏むね(g) + 調理=揚げ → 唐揚げ(むね)(g) は同じ単位なので数値を維持できるが、
  // 振替先が piece 単位など別単位なら維持しても無意味なので既定値にリセットする。
  const resolveAmountBasis = useCallback(
    (attrKey: string | undefined, styleKeyArg: string | undefined) => {
      if (!origin) return undefined;
      const styleMigration = styleKeyArg
        ? origin.styles?.find((s) => s.key === styleKeyArg)?.migration
        : undefined;
      const migration =
        styleMigration ??
        (attrKey ? origin.attributes?.find((a) => a.key === attrKey)?.migration : undefined);
      if (!migration) return { identity: origin, attributeKey: attrKey };
      const target = getIdentity(migration.identityKey);
      if (!target) return { identity: origin, attributeKey: attrKey };
      return { identity: target, attributeKey: migration.attributeKey ?? defaultAttributeKey(target) };
    },
    [origin],
  );

  const handleSelectAttribute = useCallback((key: string) => {
    setAttributeKey((prev) => {
      if (prev === key || !origin) return prev;
      // 種類で factor に織り込み済みの具 (月見=卵 等) は選択から外して二重計上を防ぐ
      const hidden = getHiddenAddonIds(origin, key);
      if (hidden.size > 0) {
        setAddons((cur) => cur.filter((a) => !hidden.has(a.refId)));
      }
      setAmountModeAlt(false);
      const nextBasis = resolveAmountBasis(key, styleKey);
      if (nextBasis?.identity) {
        const nextSpec = getEffectiveAmountSpec(nextBasis.identity, nextBasis.attributeKey);
        const migratesNow = !!origin.attributes?.find((a) => a.key === key)?.migration;
        if (migratesNow) {
          // 振替時は単位が一致する限り数値を引き継ぐ (例: g→g の唐揚げ振替)。
          // 単位が変わる場合のみ振替先の既定値にリセットする。
          const prevBasis = resolveAmountBasis(prev, styleKey);
          const prevSpec = prevBasis?.identity
            ? getEffectiveAmountSpec(prevBasis.identity, prevBasis.attributeKey)
            : undefined;
          setAmountValue((cur) => (prevSpec?.unit === nextSpec.unit ? cur : nextSpec.default));
        } else {
          // 通常の種類切替は常に新しい種類の既定量にリセットする。
          // unit が同じでも default が違う (春巻=2本 vs 餃子=5個 等) ため、
          // 種類切替 = 「1人前の基準が変わった」として常にリセットするのが正しい。
          setAmountValue(nextSpec.default);
        }
      }
      return key;
    });
  }, [origin, styleKey, resolveAmountBasis]);

  const handleSelectStyle = useCallback((key: string) => {
    const targetMigration = origin?.styles?.find((s) => s.key === key)?.migration;
    if (targetMigration?.openTargetSheet) {
      // 選択肢が多く既定値固定では表現しきれない振替先 (例: 丼化 → 牛丼系) は、
      // 軽い確認で済ませず移動先の通常フローをそのまま開かせる。
      openIdentityLogSheet(targetMigration.bucketKey, {
        identityId: targetMigration.identityKey,
        editingLogId: identityLogSheet.editingLogId,
        sourceTab: identityLogSheet.sourceTab,
      });
      return;
    }
    setStyleKey((prev) => {
      if (prev === key || !origin) return prev;
      setAmountModeAlt(false);
      const nextBasis = resolveAmountBasis(attributeKey, key);
      if (nextBasis?.identity) {
        const prevBasis = resolveAmountBasis(attributeKey, prev);
        const nextSpec = getEffectiveAmountSpec(nextBasis.identity, nextBasis.attributeKey);
        const prevSpec = prevBasis?.identity
          ? getEffectiveAmountSpec(prevBasis.identity, prevBasis.attributeKey)
          : undefined;
        setAmountValue((cur) => (prevSpec?.unit === nextSpec.unit ? cur : nextSpec.default));
      }
      return key;
    });
  }, [origin, attributeKey, resolveAmountBasis, openIdentityLogSheet, identityLogSheet.editingLogId]);

  // 種類/調理連動の実効 amount spec。振替が発生している場合は振替先 Identity の
  // spec を見る (量欄の単位・チップ・既定値を実際の計算基準と一致させるため)。
  const amountBasis = useMemo(
    () => resolveAmountBasis(attributeKey, styleKey),
    [resolveAmountBasis, attributeKey, styleKey],
  );

  const effectiveAmount = useMemo(
    () => (amountBasis?.identity ? getEffectiveAmountSpec(amountBasis.identity, amountBasis.attributeKey) : undefined),
    [amountBasis],
  );

  // 主単位とは別の入力単位 (例: 唐揚げのg⇔個)。保存は常に主単位 (amountValue)
  // で行い、これは表示・入力の便宜レイヤーに過ぎない。
  const altAmountSpec = useMemo(
    () => (amountBasis?.identity ? getEffectiveAltAmountSpec(amountBasis.identity, amountBasis.attributeKey) : undefined),
    [amountBasis],
  );
  const isAltMode = amountModeAlt && !!altAmountSpec;

  // 画面に出す実効 spec / 値。alt モードのときだけ換算する。
  const activeAmountSpec: AmountSpec | undefined = isAltMode && altAmountSpec
    ? {
        unit: altAmountSpec.unit,
        default: altAmountSpec.default,
        unitLabel: altAmountSpec.unitLabel,
        chips: altAmountSpec.chips,
        min: altAmountSpec.min,
        max: altAmountSpec.max,
        step: altAmountSpec.step,
      }
    : effectiveAmount;
  // alt 単位の表示値。整数に丸めると 1.5個 (=45g) が 2個 と表示されて保存値と
  // 食い違うため、入力グリッド (数え物は 0.25) まで残して丸める。
  const displayAmountValue = isAltMode && altAmountSpec
    ? Math.round((amountValue / altAmountSpec.gramsPerUnit) * 4) / 4
    : amountValue;

  const handleSelectAmountChip = useCallback((value: number) => {
    setAmountValue(isAltMode && altAmountSpec ? value * altAmountSpec.gramsPerUnit : value);
  }, [isAltMode, altAmountSpec]);

  const handleToggleAmountMode = useCallback(() => {
    if (!altAmountSpec) return;
    setAmountModeAlt((prev) => !prev);
  }, [altAmountSpec]);

  const amountConfig = useMemo(
    () => (activeAmountSpec ? buildIdentityAmountEditConfig(activeAmountSpec, uiLanguage) : null),
    [activeAmountSpec, uiLanguage],
  );

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
      tr('identityLog.deleteTitle'),
      tr('identityLog.deleteMessage'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteLog(editingLog.id);
            updateLivePreview(null);
            closeIdentityLogSheet();
          },
        },
      ],
    );
  }, [editingLog, deleteLog, updateLivePreview, closeIdentityLogSheet, tr]);

  const canSave = !!resolved && resolved.totalMacro.kcal > 0;

  // 種類連動のトッピング既定リスト。振替が発生している場合は振替先 Identity の
  // トッピング (例: 唐揚げ=レモン/マヨ) を表示する。選択中の Add-on は (既定外でも)
  // 常に表示し続け、編集再開時や種類切替時に選択済みチップが消えないようにする。
  const visibleAddonIds = useMemo(() => {
    if (!amountBasis?.identity) return [];
    const base = getEffectiveDefaultAddonIds(amountBasis.identity, amountBasis.attributeKey);
    const hidden = getHiddenAddonIds(amountBasis.identity, amountBasis.attributeKey);
    const selectedExtra = addons
      .map((a) => a.refId)
      .filter((id) => !base.includes(id) && !hidden.has(id));
    return [...base, ...selectedExtra];
  }, [amountBasis, addons]);

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={closeIdentityLogSheet}
      title={bucket ? `${bucket.emoji} ${bucket.label}` : ''}
      primaryAction={{
        label: editingLog ? tr('identityLog.update') : tr('identityLog.save'),
        onPress: handleSave,
        disabled: !canSave,
      }}
      footerLeft={<FooterPreview macro={resolved?.totalMacro ?? null} />}
      headerRight={
        <View style={{ flexDirection: 'row', gap: t.spacing['3'], alignItems: 'center' }}>
          {editingLog ? (
            <IconButton
              icon="delete"
              size="lg"
              tone="danger"
              onPress={confirmDelete}
              accessibilityLabel={tr('identityLog.deleteA11y')}
              testID="ils-delete"
            />
          ) : null}
          <IconButton
            icon="close"
            size="lg"
            onPress={closeIdentityLogSheet}
            accessibilityLabel={tr('identityLog.closeA11y')}
            testID="ils-close"
          />
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
            <Section title={tr('identityLog.sections.type')}>
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
            <Section title={tr('identityLog.sections.cooking')}>
              <ChipRow>
                {origin.styles.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    trailingIcon={
                      opt.migration?.openTargetSheet
                        ? 'chevronRight'
                        : opt.migration
                          ? 'redirect'
                          : undefined
                    }
                    selected={styleKey === opt.key}
                    onPress={() => handleSelectStyle(opt.key)}
                    size="sm"
                    testID={`ils-style-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {/* Amount (振替先があればその実効 spec を使う) */}
          {(() => {
            const amt = activeAmountSpec ?? origin.amount;
            const amtUnitLabel = amt.unitLabel ?? UNIT_LABELS[uiLanguage][amt.unit];
            const amountRefIdentity = amountBasis?.identity ?? origin;
            const toggleLabel = isAltMode ? tr('identityLog.switchToG') : tr('identityLog.switchToCount');
            return (
          <Section title={tr('identityLog.sections.amount')}>
            {(amt.chips && amt.chips.length > 0) || altAmountSpec ? (
              <ChipRow>
                {(amt.chips ?? []).map((c) => (
                  <Chip
                    key={`${c.label}-${c.value}`}
                    label={chipDisplayLabel(c.label, amtUnitLabel)}
                    selected={displayAmountValue === c.value}
                    onPress={() => handleSelectAmountChip(c.value)}
                    size="sm"
                    testID={`ils-amount-${c.value}`}
                  />
                ))}
                {altAmountSpec ? (
                  <Pressable
                    onPress={handleToggleAmountMode}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={toggleLabel}
                    testID="ils-amount-mode-toggle"
                    style={{ justifyContent: 'center', paddingHorizontal: t.spacing['2'] }}
                  >
                    <Caption tone="secondary">{toggleLabel}</Caption>
                  </Pressable>
                ) : null}
              </ChipRow>
            ) : null}
            <Pressable
              onPress={() => setAmountEditorOpen(true)}
              style={[
                ilsStyles.amountRow,
                {
                  marginTop: (amt.chips && amt.chips.length > 0) || altAmountSpec ? t.spacing['2'] : 0,
                  backgroundColor: t.colors.surface.raised,
                  borderRadius: t.radius.lg,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={tr('dishEntry.a11yAmountChange', { value: displayAmountValue, unit: amtUnitLabel })}
              testID="ils-amount-row"
            >
              <Text style={[ilsStyles.amountRowValue, { color: t.colors.content.primary, fontSize: t.typography.fontSize['2xl'] }]}>
                {displayAmountValue}
                <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm }}>
                  {' '}{amtUnitLabel}
                </Text>
              </Text>
              <Icon name="edit" size={16} color={t.colors.content.tertiary} />
            </Pressable>
            {amountRefIdentity.referenceDescription && amt.unit === amountRefIdentity.amount.unit ? (
              <Caption tone="tertiary" style={{ marginTop: t.spacing['2'] }} testID="ils-amount-ref">
                {tr('identityLog.amountRefPrefix')}: {amountRefIdentity.referenceDescription}
              </Caption>
            ) : null}
          </Section>
            );
          })()}

          {/* Add-ons */}
          {visibleAddonIds.length > 0 ? (
            <Section title={tr('identityLog.sections.topping')}>
              <ChipRow>
                {visibleAddonIds.map((aid) => {
                  const selected = addons.some((a) => a.refId === aid);
                  return (
                    <Chip
                      key={aid}
                      label={getAddonLabel(aid)}
                      leadingIcon={selected ? 'check' : 'add'}
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
    {amountConfig ? (
      <AmountEditDialog
        visible={amountEditorOpen}
        config={amountConfig}
        initialValue={displayAmountValue}
        onClose={(next) => {
          setAmountEditorOpen(false);
          if (next !== null) setAmountValue(isAltMode && altAmountSpec ? next * altAmountSpec.gramsPerUnit : next);
        }}
        testID="ils-amount-dialog"
      />
    ) : null}
    </>
  );
}


// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ilsStyles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  amountRowValue: {
    fontWeight: '700',
  },
});

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
          color: ready ? t.colors.content.primary : t.colors.content.tertiary,
        }}
        testID="ils-preview-kcal"
      >
        {ready ? `${Math.round(macro!.kcal)} kcal` : '— kcal'}
      </Text>
      <Text
        style={{
          fontSize: t.typography.fontSize.xs,
          color: t.colors.content.secondary,
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
