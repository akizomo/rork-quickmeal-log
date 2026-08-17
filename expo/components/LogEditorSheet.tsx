import React, { memo, useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { additionPresets, portionSnapPoints, sizeOptions } from '@/constants/nutrition-data';
import { Badge, BottomSheet, Caption, Icon, useTheme, type Theme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { DishDraft, DishSize, IngredientDraft, Macro, PortionValue } from '@/types/nutrition';
import { buildDishMacro, clampPortion, computeIngredient, draftFromLog, getIngredientSubtypeDef, getIngredientSubtypeDefs, getQuickCategories, getSubtypes, getToppingsForSubtype, summarizeToppings } from '@/utils/nutrition';

export const LogEditorSheet = memo(function LogEditorSheet() {
  const tr = useT();
  const { editorLog, setEditorLogId, updateDishLog, updateIngredientLog, deleteLog, editorIsPending, commitPendingLog, cancelPendingLog } = useAppState();

  const handleClose = () => {
    if (editorLog && editorIsPending) {
      cancelPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDone = () => {
    if (editorLog && editorIsPending) {
      commitPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDelete = () => {
    if (!editorLog) return;
    if (editorIsPending) {
      cancelPendingLog(editorLog.id);
    } else {
      deleteLog(editorLog.id);
    }
    setEditorLogId(null);
  };
  const ingredientDraft = useMemo<IngredientDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'ingredient') return null;
    return draftFromLog(editorLog);
  }, [editorLog]);
  const dishDraft = useMemo<DishDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'dish') return null;
    return {
      categoryKey: editorLog.categoryKey,
      subTypeKey: editorLog.subTypeKey,
      additions: editorLog.additions ?? [],
      size: editorLog.size ?? 'regular',
    };
  }, [editorLog]);

  const visible = editorLog != null;
  const log = editorLog;
  const title = log
    ? editorIsPending
      ? log.mode === 'ingredient' ? tr('logEditor.addIngredient') : tr('logEditor.addDish')
      : log.mode === 'ingredient' ? tr('logEditor.editIngredient') : tr('logEditor.editDish')
    : '';

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={title}
      secondaryAction={{
        label: editorIsPending ? tr('common.cancel') : tr('common.delete'),
        onPress: handleDelete,
      }}
      primaryAction={{
        label: editorIsPending ? tr('common.add') : tr('common.done'),
        onPress: handleDone,
      }}
      testID="log-editor-sheet"
    >
      {log?.mode === 'ingredient' && ingredientDraft ? (
        <IngredientEditorContent
          draft={ingredientDraft}
          onChange={(next) => updateIngredientLog(log.id, next)}
        />
      ) : null}
      {log?.mode === 'dish' && dishDraft ? (
        <DishEditorContent
          draft={dishDraft}
          onChange={(next) => updateDishLog(log.id, next)}
        />
      ) : null}
    </BottomSheet>
  );
});

function IngredientEditorContent({ draft, onChange }: { draft: IngredientDraft; onChange: (draft: IngredientDraft) => void }) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const categories = getQuickCategories('ingredient');
  const currentCategory = categories.find((item) => item.key === draft.categoryKey);
  const subtypeDefs = getIngredientSubtypeDefs(draft.categoryKey);
  const subtype = getIngredientSubtypeDef(draft.categoryKey, draft.subTypeKey);
  const toppings = getToppingsForSubtype(subtype);
  const computation = computeIngredient(draft);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);

  const handleCategoryChange = (key: string) => {
    const nextDefs = getIngredientSubtypeDefs(key);
    const nextSubKey = nextDefs[0]?.key ?? '';
    onChange({ categoryKey: key, subTypeKey: nextSubKey, portionValue: draft.portionValue, toppingKeys: [] });
    setCategoryOpen(false);
  };

  const handleSubtypeChange = (key: string) => {
    const nextSub = getIngredientSubtypeDef(draft.categoryKey, key);
    const availableKeys = (nextSub?.toppings ?? []).map((t) => t.key);
    const nextToppingKeys = draft.toppingKeys.filter((k) => availableKeys.includes(k));
    onChange({ ...draft, subTypeKey: key, toppingKeys: nextToppingKeys });
  };

  const handlePortionChange = (portion: PortionValue) => {
    onChange({ ...draft, portionValue: portion });
  };

  const handleToggleTopping = (key: string) => {
    const next = draft.toppingKeys.includes(key)
      ? draft.toppingKeys.filter((k) => k !== key)
      : [...draft.toppingKeys, key];
    onChange({ ...draft, toppingKeys: next });
  };

  const toppingSummary = summarizeToppings(computation.toppings);

  return (
    <View style={styles.editorSection}>
      <Pressable
        style={styles.categoryRow}
        onPress={() => setCategoryOpen((v) => !v)}
        testID="ingredient-category-row"
      >
        <Text style={styles.categoryRowLabel}>{tr('logEditor.categoryLabel')}</Text>
        <View style={styles.categoryRowValue}>
          <Text style={styles.categoryRowValueText}>
            {currentCategory ? `${currentCategory.emoji} ${currentCategory.label}` : '—'}
          </Text>
          <Icon name="chevronDown" size={14} color={t.colors.content.secondary} />
        </View>
      </Pressable>
      {categoryOpen ? (
        <View style={styles.categoryDropdown}>
          {categories.map((item) => {
            const active = item.key === draft.categoryKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleCategoryChange(item.key)}
                style={[styles.categoryOption, active ? styles.categoryOptionActive : null]}
                testID={`ingredient-category-option-${item.key}`}
              >
                <Text style={[styles.categoryOptionText, active ? styles.categoryOptionTextActive : null]}>
                  {item.emoji} {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {subtypeDefs.length > 0 ? (
        <View style={styles.subSection}>
          <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.typeSection')}</Caption>
          <View style={styles.optionWrap}>
            {subtypeDefs.map((item) => (
              <LocalChip
                key={item.key}
                label={item.label}
                active={draft.subTypeKey === item.key}
                onPress={() => handleSubtypeChange(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.portionSection}>
        <View style={styles.portionHeader}>
          <Text style={styles.portionTitle}>{tr('logEditor.amountTitle')}</Text>
          <Badge tone="brand">{draft.portionValue}x</Badge>
        </View>
        <Text style={styles.portionNowLine} numberOfLines={1} testID="ingredient-portion-label">
          {computation.portionDisplay.primaryLabel}
          <Text style={styles.portionNowLineMuted}>  ·  {computation.portionDisplay.secondaryLabel}</Text>
        </Text>
        <PortionSlider value={draft.portionValue} onChange={handlePortionChange} />
      </View>

      {toppings.length > 0 ? (
        <View style={styles.subSection}>
          <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.toppingSection')}</Caption>
          <View style={styles.optionWrap}>
            {toppings.map((item) => (
              <LocalChip
                key={item.key}
                label={item.label}
                active={draft.toppingKeys.includes(item.key)}
                onPress={() => handleToggleTopping(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <IngredientPreviewCard
        subLabel={subtype?.label ?? currentCategory?.label ?? ''}
        portionLabel={computation.portionDisplay.primaryLabel}
        portionSecondary={computation.portionDisplay.secondaryLabel}
        toppingSummary={toppingSummary}
        macro={computation.total}
      />
    </View>
  );
}

function PortionSlider({ value, onChange }: { value: PortionValue; onChange: (portion: PortionValue) => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const points = portionSnapPoints;
  const minVal = points[0];
  const maxVal = points[points.length - 1];
  const range = maxVal - minVal;
  const ratio = trackWidth > 0 ? (value - minVal) / range : 0;
  const thumbX = ratio * trackWidth;

  const snapFromX = (x: number): PortionValue => {
    if (trackWidth <= 0) return value;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    const raw = minVal + (clampedX / trackWidth) * range;
    return clampPortion(raw);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
        onPanResponderMove: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackWidth, value]
  );

  return (
    <View style={styles.sliderWrap}>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        testID="portion-slider"
      >
        <View style={[styles.sliderFill, { width: thumbX }]} />
        {points.map((p) => {
          const left = trackWidth > 0 ? ((p - minVal) / range) * trackWidth : 0;
          const active = p <= value;
          return (
            <View
              key={p}
              style={[
                styles.sliderTick,
                { left: left - 3 },
                active ? styles.sliderTickActive : null,
              ]}
            />
          );
        })}
        <View style={[styles.sliderThumb, { left: thumbX - 14 }]} pointerEvents="none" />
      </View>
      <View style={styles.sliderLabelsRow}>
        {points.map((p) => (
          <Pressable
            key={p}
            onPress={() => onChange(p as PortionValue)}
            style={styles.sliderLabelTap}
            testID={`portion-snap-${p}`}
          >
            <Text style={[styles.sliderLabelText, p === value ? styles.sliderLabelTextActive : null]} numberOfLines={1}>
              {p}x
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function IngredientPreviewCard({ subLabel, portionLabel, portionSecondary, toppingSummary, macro }: { subLabel: string; portionLabel: string; portionSecondary?: string; toppingSummary: string | null; macro: Macro }) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>{tr('logEditor.preview')}</Text>
      <Text style={styles.previewSummaryText} numberOfLines={2}>
        {subLabel}
        <Text style={styles.previewSummaryDivider}>  ·  </Text>
        {portionLabel}
        {toppingSummary ? (
          <>
            <Text style={styles.previewSummaryDivider}>  ·  </Text>
            {toppingSummary}
          </>
        ) : null}
      </Text>
      {portionSecondary ? (
        <Text style={styles.previewSummarySecondary}>{portionSecondary}</Text>
      ) : null}
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} macro="protein" />
        <MacroPill label="F" value={macro.fat} macro="fat" />
        <MacroPill label="C" value={macro.carbs} macro="carbs" />
      </View>
    </View>
  );
}

function DishEditorContent({ draft, onChange }: { draft: DishDraft; onChange: (draft: DishDraft) => void }) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const categories = getQuickCategories('dish');
  const subtypes = getSubtypes('dish', draft.categoryKey);
  const preview = buildDishMacro(draft);

  return (
    <View style={styles.editorSection}>
      <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.typeSection')}</Caption>
      <View style={styles.optionWrap}>
        {categories.map((item) => (
          <LocalChip key={item.key} label={`${item.emoji} ${item.label}`} active={draft.categoryKey === item.key} onPress={() => onChange({ ...draft, categoryKey: item.key, subTypeKey: undefined })} />
        ))}
      </View>
      {subtypes.length > 0 ? (
        <>
          <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.flavorSection')}</Caption>
          <View style={styles.optionWrap}>
            {subtypes.map((item) => (
              <LocalChip key={item.key} label={item.label} active={draft.subTypeKey === item.key} onPress={() => onChange({ ...draft, subTypeKey: item.key })} />
            ))}
          </View>
        </>
      ) : null}
      <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.additionSection')}</Caption>
      <View style={styles.optionWrap}>
        {additionPresets.map((item) => {
          const active = draft.additions.includes(item.key);
          return (
            <LocalChip
              key={item.key}
              label={item.label}
              active={active}
              onPress={() => {
                if (active) {
                  onChange({ ...draft, additions: draft.additions.filter((value) => value !== item.key) });
                  return;
                }
                if (draft.additions.length >= 2) {
                  return;
                }
                onChange({ ...draft, additions: [...draft.additions, item.key] });
              }}
            />
          );
        })}
      </View>
      <Caption tone="secondary" style={styles.editorSectionTitle}>{tr('logEditor.sizeSection')}</Caption>
      <View style={styles.optionWrap}>
        {sizeOptions.map((size) => (
          <LocalChip key={size} label={size} active={draft.size === size} onPress={() => onChange({ ...draft, size: size as DishSize })} />
        ))}
      </View>
      <PreviewCard macro={preview} />
    </View>
  );
}

function MacroPill({ label, value, macro }: { label: string; value: number; macro: 'protein' | 'fat' | 'carbs' }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const tone = t.colors.nutrition[macro];
  return (
    <View style={[styles.macroPill, { backgroundColor: tone.background }]}>
      <Text style={[styles.macroPillLabel, { color: tone.text }]}>{label}</Text>
      <Text style={[styles.macroPillValue, { color: tone.text }]}>{Math.round(value)}</Text>
    </View>
  );
}

function PreviewCard({ macro }: { macro: Macro }) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>{tr('logEditor.preview')}</Text>
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} macro="protein" />
        <MacroPill label="F" value={macro.fat} macro="fat" />
        <MacroPill label="C" value={macro.carbs} macro="carbs" />
      </View>
    </View>
  );
}

function LocalChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

void PreviewCard;
void getSubtypes;

const makeStyles = (t: Theme) => StyleSheet.create({
  editorSection: { gap: 12 },
  editorSectionTitle: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.full, backgroundColor: t.colors.surface.raised },
  chipActive: { backgroundColor: t.colors.action.primary.default },
  chipText: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  chipTextActive: { color: t.colors.content.onAction },
  previewCard: { backgroundColor: t.colors.surface.raised, borderRadius: radius['2xl'], padding: 16, gap: 12 },
  previewTitle: { fontSize: fs.sm, color: t.colors.content.secondary },
  previewSummaryText: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '600', lineHeight: 20 },
  previewSummaryDivider: { color: t.colors.content.secondary, fontWeight: '400' },
  previewSummarySecondary: { fontSize: fs.sm, color: t.colors.content.secondary, marginTop: -2 },
  previewCalories: { fontSize: fs['3xl'], fontWeight: '700', color: t.colors.content.primary },
  goalMacroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.full },
  macroPillLabel: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '700' },
  macroPillValue: { fontSize: fs.xs, color: t.colors.content.primary, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.surface.raised, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  categoryRowLabel: { fontSize: fs.sm, color: t.colors.content.secondary, fontWeight: '600' },
  categoryRowValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryRowValueText: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '700' },
  categoryDropdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: t.colors.surface.raised, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: t.colors.border.default },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: t.colors.surface.raised },
  categoryOptionActive: { backgroundColor: t.colors.action.primary.default },
  categoryOptionText: { fontSize: fs.sm, color: t.colors.content.primary, fontWeight: '600' },
  categoryOptionTextActive: { color: t.colors.content.onAction },
  subSection: { gap: 12, marginTop: 4 },
  portionSection: { backgroundColor: t.colors.surface.raised, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: t.colors.border.default },
  portionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portionTitle: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary },
  portionNowLine: { fontSize: fs.md, color: t.colors.content.primary, fontWeight: '700', marginTop: 2 },
  portionNowLineMuted: { color: t.colors.content.secondary, fontWeight: '500', fontSize: fs.sm },
  sliderWrap: { paddingTop: 12, paddingBottom: 4 },
  sliderTrack: { height: 36, justifyContent: 'center', borderRadius: radius.full },
  sliderFill: { position: 'absolute', left: 0, height: 6, backgroundColor: t.colors.action.text.default, borderRadius: radius.full, top: 15 },
  sliderTick: { position: 'absolute', width: 6, height: 6, borderRadius: radius.full, backgroundColor: t.colors.surface.sunken, top: 15 },
  sliderTickActive: { backgroundColor: t.colors.action.primary.default },
  sliderThumb: { position: 'absolute', width: 28, height: 28, borderRadius: radius.full, backgroundColor: t.colors.content.onAction, borderWidth: 2, borderColor: t.colors.action.primary.default, top: 4, ...t.elevation.sm },
  sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderLabelTap: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  sliderLabelText: { fontSize: fs.xs, color: t.colors.content.secondary, fontWeight: '600' },
  sliderLabelTextActive: { color: t.colors.action.text.default, fontWeight: '700' },
});
