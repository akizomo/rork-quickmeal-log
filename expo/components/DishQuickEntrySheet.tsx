import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ChineseNoodlePrimaryDef,
  DISH_TOP_CATEGORIES,
  DishSubcategory,
  DishTopCategoryDef,
  PizzaTypeDef,
  RamenStyleDef,
  SetMealOptionDef,
  SushiModeDef,
  getDishTopCategory,
  multiplyMacroSimple,
} from '@/constants/dish-master';
import { palette } from '@/constants/theme';
import { BottomSheet } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import {
  ChineseNoodlesPrimaryType,
  DishPortionOption,
  DishQuickEntryPayload,
  Macro,
  PizzaType,
  RamenStyle,
  SetMealType,
  StandardPortionFactor,
  SushiCountMode,
} from '@/types/nutrition';

void DISH_TOP_CATEGORIES;

function formatKcal(m: Macro): string {
  return `${Math.round(m.kcal)} kcal`;
}

function MacroLine({ m }: { m: Macro }) {
  return (
    <Text style={styles.macroLine}>
      P {Math.round(m.protein)} · F {Math.round(m.fat)} · C {Math.round(m.carbs)}
    </Text>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function PortionRow({
  options,
  factor,
  onChange,
}: {
  options: DishPortionOption[];
  factor: StandardPortionFactor;
  onChange: (f: StandardPortionFactor) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => (
        <Chip
          key={String(opt.factor)}
          label={opt.primaryLabel}
          active={opt.factor === factor}
          onPress={() => onChange(opt.factor)}
          testID={`dqe-portion-${opt.factor}`}
        />
      ))}
    </View>
  );
}

function InstantPreview({
  subcategoryLabel,
  portionLabel,
  macro,
}: {
  subcategoryLabel?: string;
  portionLabel?: string;
  macro: Macro;
}) {
  const meta = [subcategoryLabel, portionLabel].filter(Boolean).join(' · ');
  return (
    <View style={styles.previewCard}>
      {meta ? <Text style={styles.previewMeta}>{meta}</Text> : null}
      <Text style={styles.previewKcal}>{formatKcal(macro)}</Text>
      <MacroLine m={macro} />
    </View>
  );
}

function ChineseNoodlesBody({
  category,
  onSubmit,
}: {
  category: DishTopCategoryDef;
  onSubmit: (p: DishQuickEntryPayload) => void;
}) {
  if (category.quickEntry.kind !== 'chinese_noodles') return null;
  const primaryOptions = category.quickEntry.primaryOptions;
  const [primaryKey, setPrimaryKey] = useState<ChineseNoodlesPrimaryType>(primaryOptions[0].key);
  const primary: ChineseNoodlePrimaryDef = primaryOptions.find((p) => p.key === primaryKey) ?? primaryOptions[0];
  const [ramenStyleKey, setRamenStyleKey] = useState<RamenStyle | null>(
    primary.ramenStyles ? primary.ramenStyles[0].key : null
  );

  useEffect(() => {
    if (primary.ramenStyles) {
      setRamenStyleKey(primary.ramenStyles[0].key);
    } else {
      setRamenStyleKey(null);
    }
  }, [primaryKey]);

  const activeRamenStyle: RamenStyleDef | null = primary.ramenStyles && ramenStyleKey
    ? primary.ramenStyles.find((s) => s.key === ramenStyleKey) ?? primary.ramenStyles[0]
    : null;

  const portionOptions = activeRamenStyle?.portionOptions ?? primary.portionOptions ?? [];
  const baseMacro = activeRamenStyle?.baseMacroAt1x ?? primary.baseMacroAt1x;
  const [factor, setFactor] = useState<StandardPortionFactor>(1);

  useEffect(() => {
    setFactor(1);
  }, [primaryKey, ramenStyleKey]);

  const macro = useMemo(() => (baseMacro ? multiplyMacroSimple(baseMacro, factor) : { kcal: 0, protein: 0, fat: 0, carbs: 0 }), [baseMacro, factor]);

  const activePortionLabel = portionOptions.find((p) => p.factor === factor)?.primaryLabel;
  const label = activeRamenStyle?.label ?? primary.label;

  return (
    <>
      <Text style={styles.sectionLabel}>種類</Text>
      <View style={styles.row}>
        {primaryOptions.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            active={p.key === primaryKey}
            onPress={() => setPrimaryKey(p.key)}
            testID={`dqe-primary-${p.key}`}
          />
        ))}
      </View>

      {primary.ramenStyles && ramenStyleKey ? (
        <>
          <Text style={styles.sectionLabel}>スタイル</Text>
          <View style={styles.row}>
            {primary.ramenStyles.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                active={s.key === ramenStyleKey}
                onPress={() => setRamenStyleKey(s.key)}
                testID={`dqe-ramen-${s.key}`}
              />
            ))}
          </View>
        </>
      ) : null}

      {portionOptions.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>量</Text>
          <PortionRow options={portionOptions} factor={factor} onChange={setFactor} />
        </>
      ) : null}

      <InstantPreview subcategoryLabel={label} portionLabel={activePortionLabel} macro={macro} />

      <PrimaryActionButton
        label="追加"
        onPress={() =>
          onSubmit({
            topCategoryKey: category.key,
            subcategoryKey: ramenStyleKey ?? primary.key,
            subcategoryLabel: label,
            portionFactor: factor,
            portionPrimaryLabel: activePortionLabel,
            chinesePrimaryType: primary.key,
            ramenStyle: activeRamenStyle?.key,
            macro,
          })
        }
      />
    </>
  );
}

function SushiBody({
  category,
  onSubmit,
}: {
  category: DishTopCategoryDef;
  onSubmit: (p: DishQuickEntryPayload) => void;
}) {
  if (category.quickEntry.kind !== 'sushi_count') return null;
  const config = category.quickEntry;
  const [modeKey, setModeKey] = useState<SushiCountMode>(config.defaultMode);
  const mode: SushiModeDef = config.modes.find((m) => m.key === modeKey) ?? config.modes[0];
  const [count, setCount] = useState<number>(mode.presetCounts[1] ?? mode.presetCounts[0]);
  const [input, setInput] = useState<string>('');

  useEffect(() => {
    setCount(mode.presetCounts[1] ?? mode.presetCounts[0]);
    setInput('');
  }, [modeKey]);

  const effectiveCount = useMemo(() => {
    const parsed = parseInt(input, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(Math.max(parsed, mode.min), mode.max);
    }
    return count;
  }, [count, input, mode]);

  const macro = useMemo(() => multiplyMacroSimple(mode.macroPerUnit, effectiveCount), [mode, effectiveCount]);

  return (
    <>
      <Text style={styles.sectionLabel}>モード</Text>
      <View style={styles.row}>
        {config.modes.map((m) => (
          <Chip
            key={m.key}
            label={m.label}
            active={m.key === modeKey}
            onPress={() => setModeKey(m.key)}
            testID={`dqe-sushi-mode-${m.key}`}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{mode.unitLabel}数</Text>
      <View style={styles.row}>
        {mode.presetCounts.map((c) => (
          <Chip
            key={c}
            label={`${c}${mode.unitLabel}`}
            active={c === effectiveCount && input === ''}
            onPress={() => {
              setCount(c);
              setInput('');
            }}
            testID={`dqe-sushi-count-${c}`}
          />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={`直接入力 (${mode.min}〜${mode.max})`}
        placeholderTextColor={palette.textMuted}
        value={input}
        onChangeText={setInput}
        keyboardType="number-pad"
        testID="dqe-sushi-input"
      />

      <InstantPreview
        subcategoryLabel={mode.label}
        portionLabel={`${effectiveCount}${mode.unitLabel}`}
        macro={macro}
      />

      <PrimaryActionButton
        label="追加"
        onPress={() =>
          onSubmit({
            topCategoryKey: category.key,
            subcategoryKey: modeKey === 'plate' ? 'kaiten_sushi' : 'nigiri_set',
            subcategoryLabel: mode.label,
            sushiMode: modeKey,
            sushiCount: effectiveCount,
            portionPrimaryLabel: `${effectiveCount}${mode.unitLabel}`,
            macro,
          })
        }
      />
    </>
  );
}

function PizzaBody({
  category,
  onSubmit,
}: {
  category: DishTopCategoryDef;
  onSubmit: (p: DishQuickEntryPayload) => void;
}) {
  if (category.quickEntry.kind !== 'pizza_slices') return null;
  const config = category.quickEntry;
  const [typeKey, setTypeKey] = useState<PizzaType>('regular');
  const type: PizzaTypeDef = config.pizzaTypes.find((t) => t.key === typeKey) ?? config.pizzaTypes[1] ?? config.pizzaTypes[0];
  const [slices, setSlices] = useState<number>(2);
  const [input, setInput] = useState<string>('');

  const effectiveSlices = useMemo(() => {
    const parsed = parseInt(input, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(Math.max(parsed, config.minSlices), config.maxSlices);
    }
    return slices;
  }, [slices, input, config]);

  const macro = useMemo(() => multiplyMacroSimple(type.macroPerSlice, effectiveSlices), [type, effectiveSlices]);

  return (
    <>
      <Text style={styles.sectionLabel}>タイプ</Text>
      <View style={styles.row}>
        {config.pizzaTypes.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={t.key === typeKey}
            onPress={() => setTypeKey(t.key)}
            testID={`dqe-pizza-type-${t.key}`}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>切れ数</Text>
      <View style={styles.row}>
        {config.presetSlices.map((c) => (
          <Chip
            key={c}
            label={`${c}切`}
            active={c === effectiveSlices && input === ''}
            onPress={() => {
              setSlices(c);
              setInput('');
            }}
            testID={`dqe-pizza-slice-${c}`}
          />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={`直接入力 (${config.minSlices}〜${config.maxSlices})`}
        placeholderTextColor={palette.textMuted}
        value={input}
        onChangeText={setInput}
        keyboardType="number-pad"
        testID="dqe-pizza-input"
      />

      <InstantPreview
        subcategoryLabel={`ピザ ${type.label}`}
        portionLabel={`${effectiveSlices}切`}
        macro={macro}
      />

      <PrimaryActionButton
        label="追加"
        onPress={() =>
          onSubmit({
            topCategoryKey: category.key,
            subcategoryKey: `pizza_${type.key}`,
            subcategoryLabel: `ピザ ${type.label}`,
            pizzaType: type.key,
            pizzaSliceCount: effectiveSlices,
            portionPrimaryLabel: `${effectiveSlices}切`,
            macro,
          })
        }
      />
    </>
  );
}

function SetMealBody({
  category,
  onSubmit,
}: {
  category: DishTopCategoryDef;
  onSubmit: (p: DishQuickEntryPayload) => void;
}) {
  if (category.quickEntry.kind !== 'set_meal_select') return null;
  const config = category.quickEntry;
  const [typeKey, setTypeKey] = useState<SetMealType>(config.options[0].key);
  const option: SetMealOptionDef = config.options.find((o) => o.key === typeKey) ?? config.options[0];
  const [factor, setFactor] = useState<StandardPortionFactor>(1);

  const macro = useMemo(() => multiplyMacroSimple(option.baseMacroAt1x, factor), [option, factor]);
  const portionLabel = option.portionOptions.find((p) => p.factor === factor)?.primaryLabel;

  return (
    <>
      <Text style={styles.sectionLabel}>種類</Text>
      <View style={styles.row}>
        {config.options.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            active={o.key === typeKey}
            onPress={() => setTypeKey(o.key)}
            testID={`dqe-set-${o.key}`}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>量</Text>
      <PortionRow options={option.portionOptions} factor={factor} onChange={setFactor} />

      <InstantPreview subcategoryLabel={option.label} portionLabel={portionLabel} macro={macro} />

      <PrimaryActionButton
        label="追加"
        onPress={() =>
          onSubmit({
            topCategoryKey: category.key,
            subcategoryKey: option.key,
            subcategoryLabel: option.label,
            portionFactor: factor,
            portionPrimaryLabel: portionLabel,
            setMealType: option.key,
            macro,
          })
        }
      />
    </>
  );
}

function InstantSaveBody({
  category,
  onSubmit,
}: {
  category: DishTopCategoryDef;
  onSubmit: (p: DishQuickEntryPayload) => void;
}) {
  if (category.quickEntry.kind !== 'instant_save') return null;
  const defaultKey = category.quickEntry.defaultSubcategoryKey;
  const [subKey, setSubKey] = useState<string>(defaultKey);
  const sub: DishSubcategory = category.subcategories.find((s) => s.key === subKey) ?? category.subcategories[0];
  const [factor, setFactor] = useState<StandardPortionFactor>(category.quickEntry.defaultPortionFactor);
  const macro = useMemo(() => multiplyMacroSimple(sub.baseMacroAt1x, factor), [sub, factor]);
  const portionLabel = sub.portionOptions.find((p) => p.factor === factor)?.primaryLabel;

  return (
    <>
      <Text style={styles.sectionLabel}>種類</Text>
      <View style={styles.row}>
        {category.subcategories.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            active={s.key === subKey}
            onPress={() => setSubKey(s.key)}
            testID={`dqe-sub-${s.key}`}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>量</Text>
      <PortionRow options={sub.portionOptions} factor={factor} onChange={setFactor} />

      <InstantPreview subcategoryLabel={sub.label} portionLabel={portionLabel} macro={macro} />

      <PrimaryActionButton
        label="追加"
        onPress={() =>
          onSubmit({
            topCategoryKey: category.key,
            subcategoryKey: sub.key,
            subcategoryLabel: sub.label,
            portionFactor: factor,
            portionPrimaryLabel: portionLabel,
            macro,
          })
        }
      />
    </>
  );
}

function PrimaryActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress} testID="dqe-submit">
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export const DishQuickEntrySheet = memo(function DishQuickEntrySheet() {
  const { dishQuickEntryKey, setDishQuickEntryKey, submitDishQuickEntry } = useAppState();
  const visible = Boolean(dishQuickEntryKey);
  const category = dishQuickEntryKey ? getDishTopCategory(dishQuickEntryKey) ?? null : null;

  const handleSubmit = async (payload: DishQuickEntryPayload) => {
    await submitDishQuickEntry(payload);
  };

  const handleClose = () => {
    setDishQuickEntryKey(null);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={category?.label ?? ''}
      testID="dqe"
    >
      {category ? (
        <>
          {category.quickEntry.kind === 'instant_save' ? (
            <InstantSaveBody category={category} onSubmit={handleSubmit} />
          ) : null}
          {category.quickEntry.kind === 'chinese_noodles' ? (
            <ChineseNoodlesBody category={category} onSubmit={handleSubmit} />
          ) : null}
          {category.quickEntry.kind === 'sushi_count' ? (
            <SushiBody category={category} onSubmit={handleSubmit} />
          ) : null}
          {category.quickEntry.kind === 'pizza_slices' ? (
            <PizzaBody category={category} onSubmit={handleSubmit} />
          ) : null}
          {category.quickEntry.kind === 'set_meal_select' ? (
            <SetMealBody category={category} onSubmit={handleSubmit} />
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: palette.sageDeep,
    borderColor: palette.sageDeep,
  },
  chipLabel: {
    fontSize: 13,
    color: palette.text,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: palette.white,
  },
  input: {
    marginTop: 10,
    backgroundColor: palette.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.text,
  },
  previewCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.surface,
    gap: 4,
  },
  previewMeta: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  previewKcal: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  macroLine: {
    fontSize: 12,
    color: palette.textMuted,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: palette.sageDeep,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
