/**
 * QuickIngredientSheet — 食材カテゴリ長押しで開く詳細入力シート。
 *
 * シートの構造・閉じる挙動・blur背景・slide退場アニメは DS の `<BottomSheet>`
 * に委譲する。本ファイルはコンテンツ（サブカテゴリ / 条件付き詳細 / 量 /
 * プレビュー）と、保存→ FoodLog 化 + 履歴追記の繋ぎ込みのみを担う。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { getQuickLogCategory } from '@/constants/quick-log-master';
import { Body, BottomSheet, Caption, Chip, Heading, NumberField, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import {
  AmountCandidate,
  AttributeKey,
  CookingMethodKey,
  IngredientQuickDraft,
  NormalizedUnit,
  PartKey,
  QuickLogHistoryMap,
  QuickLogSubcategory,
} from '@/types/quick-log';
import { computeQuickLogMacro } from '@/utils/quick-log-macro';
import { draftForSubcategory, pickInitialDraft } from '@/utils/quick-log-history';

const UNIT_LABEL: Record<NormalizedUnit, string> = {
  g: 'g',
  ml: 'ml',
  piece: '個',
};

function parseAmountInput(text: string): number {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (cleaned.length === 0) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findCandidateByValue(
  candidates: AmountCandidate[],
  value: number,
  unit: NormalizedUnit
): AmountCandidate | undefined {
  return candidates.find((c) => c.amount === value && c.unit === unit);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing['5'] }}>
      <Caption tone="secondary" style={{ marginBottom: t.spacing['2'] }}>
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

export function QuickIngredientSheet() {
  const t = useTheme();
  const {
    quickIngredientSheetCategory,
    closeQuickIngredientSheet,
    submitQuickIngredient,
    settings,
  } = useAppState();

  const visible = quickIngredientSheetCategory != null;
  const category = visible ? getQuickLogCategory(quickIngredientSheetCategory!) : undefined;

  const [draft, setDraft] = useState<IngredientQuickDraft | null>(null);

  // Build initial draft when sheet opens
  useEffect(() => {
    if (!visible || !category) {
      setDraft(null);
      return;
    }
    const seeded = (settings.quickLogHistory ?? {}) as QuickLogHistoryMap;
    setDraft(pickInitialDraft(seeded, category.key));
  }, [visible, category, settings.quickLogHistory]);

  const sub = useMemo<QuickLogSubcategory | undefined>(() => {
    if (!draft || !category) return undefined;
    return category.subcategories.find((s) => s.key === draft.subcategoryKey);
  }, [draft, category]);

  const computation = useMemo(() => (draft ? computeQuickLogMacro(draft) : null), [draft]);

  const handleSelectSubcategory = useCallback(
    (sc: QuickLogSubcategory) => {
      if (!category) return;
      setDraft(draftForSubcategory(category.key, sc));
    },
    [category]
  );

  const handleSelectAttribute = useCallback((key: AttributeKey) => {
    setDraft((d) => (d ? { ...d, attrKey: key } : d));
  }, []);

  const handleSelectPart = useCallback((key: PartKey) => {
    setDraft((d) => (d ? { ...d, partKey: key } : d));
  }, []);

  const handleSelectMethod = useCallback((key: CookingMethodKey) => {
    setDraft((d) => (d ? { ...d, methodKey: key } : d));
  }, []);

  const handleSelectAmount = useCallback((c: AmountCandidate) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            amountValue: c.amount,
            amountUnit: c.unit,
            amountLabel: c.label,
            amountCandidateKey: c.key,
          }
        : d
    );
  }, []);

  const handleEditAmount = useCallback(
    (text: string) => {
      const value = parseAmountInput(text);
      setDraft((d) => {
        if (!d) return d;
        const candidates = sub?.amountCandidates ?? [];
        const matched = findCandidateByValue(candidates, value, d.amountUnit);
        if (matched) {
          return {
            ...d,
            amountValue: value,
            amountLabel: matched.label,
            amountCandidateKey: matched.key,
          };
        }
        return {
          ...d,
          amountValue: value,
          amountLabel: undefined,
          amountCandidateKey: undefined,
        };
      });
    },
    [sub]
  );

  const handleSave = useCallback(async () => {
    if (!draft || !sub) return;
    await submitQuickIngredient(draft);
  }, [draft, sub, submitQuickIngredient]);

  const canSave = !!draft && draft.amountValue > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={closeQuickIngredientSheet}
      title={category ? `${category.label}を追加` : ''}
      primaryAction={{ label: '保存して追加', onPress: handleSave, disabled: !canSave }}
      secondaryAction={{ label: 'キャンセル', onPress: closeQuickIngredientSheet }}
      testID="quick-ingredient-sheet"
    >
      {category && draft ? (
        <>
          {/* Subcategory */}
          <Section title="種類">
            <ChipRow>
              {category.subcategories.map((sc) => (
                <Chip
                  key={sc.key}
                  label={sc.label}
                  selected={draft.subcategoryKey === sc.key}
                  onPress={() => handleSelectSubcategory(sc)}
                  testID={`qis-sub-${sc.key}`}
                />
              ))}
            </ChipRow>
          </Section>

          {/* Conditional detail */}
          {sub?.detailUi === 'attribute' && sub.attributes ? (
            <Section title="種類">
              <ChipRow>
                {sub.attributes.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={draft.attrKey === opt.key}
                    onPress={() => handleSelectAttribute(opt.key)}
                    testID={`qis-attr-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {(sub?.detailUi === 'part' || sub?.detailUi === 'part_method') && sub.parts ? (
            <Section title="部位">
              <ChipRow>
                {sub.parts.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={draft.partKey === opt.key}
                    onPress={() => handleSelectPart(opt.key)}
                    testID={`qis-part-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {(sub?.detailUi === 'method' || sub?.detailUi === 'part_method') && sub.methods ? (
            <Section title="調理法">
              <ChipRow>
                {sub.methods.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={draft.methodKey === opt.key}
                    onPress={() => handleSelectMethod(opt.key)}
                    testID={`qis-method-${opt.key}`}
                  />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {/* Amount */}
          {sub ? (
            <Section title="量">
              <ChipRow>
                {sub.amountCandidates.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    selected={draft.amountCandidateKey === c.key}
                    onPress={() => handleSelectAmount(c)}
                    testID={`qis-amount-${c.key}`}
                  />
                ))}
              </ChipRow>
              <View
                style={{
                  marginTop: t.spacing['3'],
                  backgroundColor: t.colors.surface.raised,
                  borderRadius: t.radius.lg,
                  paddingHorizontal: t.spacing['4'],
                }}
              >
                <NumberField
                  value={draft.amountValue.toString()}
                  onChangeText={handleEditAmount}
                  suffix={UNIT_LABEL[draft.amountUnit]}
                  size="3xl"
                  decimal
                  testID="qis-amount-input"
                />
              </View>
            </Section>
          ) : null}

          {/* Macro preview */}
          {computation ? (
            <View
              style={{
                marginTop: t.spacing['2'],
                padding: t.spacing['4'],
                backgroundColor: t.colors.surface.sunken,
                borderRadius: t.radius.lg,
              }}
            >
              <Caption tone="secondary">合計</Caption>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: t.spacing['2'],
                  marginTop: 2,
                }}
              >
                <Heading size="lg">{Math.round(computation.total.kcal)}</Heading>
                <Body tone="secondary">kcal</Body>
              </View>
              <Caption tone="tertiary" style={{ marginTop: 2 }}>
                P {computation.total.protein} / F {computation.total.fat} / C {computation.total.carbs}
              </Caption>
            </View>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}
