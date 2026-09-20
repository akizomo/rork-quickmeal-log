/**
 * AmountEditDialog — 量編集専用ダイアログ。
 *
 * センター配置の Dialog を使うことで、キーボードが開いてもダイアログ全体が
 * KeyboardAvoidingView により押し上げられ、確定ボタンが隠れない。
 *
 * 利用側:
 *   const amountEditConfig = useMemo(() => buildSushiAmountEditConfig(mode), [mode]);
 *
 *   <AmountEditDialog
 *     visible={editorOpen}
 *     config={amountEditConfig}
 *     initialValue={count}
 *     onClose={(next) => { setEditorOpen(false); if (next != null) setCount(next); }}
 *   />
 *
 * # 設計方針
 *  - Dialog (design-system) を使いセンター配置。キーボード表示時は Dialog ごと上に移動。
 *  - 値バリデーション・正規化はすべて amount-edit.ts の純粋関数に委譲
 *  - ダイアログは「draft」のみを管理し、確定(onClose(next))まで親には通知しない
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet, Chip, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import {
  type AmountEditConfig,
  clampToRange,
  decrementBy,
  incrementBy,
  isValidAmount,
  matchesPreset,
  parseAmountInput,
  snapToStep,
  wouldKeystrokeProduceOutOfRange,
} from '@/utils/amount-edit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AmountEditDialogProps = {
  visible: boolean;
  /**
   * Called when the dialog closes.
   * `next` is the new numeric value (null = キャンセル / no change).
   */
  onClose: (next: number | null) => void;
  config: AmountEditConfig;
  initialValue: number;
  /** Dialog title. Default: "量を変更" */
  title?: string;
  testID?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number for display, trimming unnecessary trailing zeros. */
function formatValue(value: number, decimals: 0 | 1 | 2): string {
  if (decimals === 0) return String(Math.round(value));
  // 1 → "1", 1.5 → "1.5", 0.25 → "0.25" (小数側の余分な 0 のみ落とす)
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AmountEditDialog({
  visible,
  onClose,
  config,
  initialValue,
  title,
  testID,
}: AmountEditDialogProps) {
  const t = useTheme();
  const tr = useT();
  const resolvedTitle = title ?? tr('amountEdit.defaultTitle');
  const inputRef = useRef<TextInput>(null);

  // draft: 常に valid (clamp済み・step揃い)
  const [draft, setDraft] = useState<number>(() =>
    clampToRange(snapToStep(initialValue, config), config),
  );
  // rawInput: TextInput の表示用 (タイプ途中の '5.' なども許容)
  const [rawInput, setRawInput] = useState<string>(() =>
    formatValue(clampToRange(snapToStep(initialValue, config), config), config.decimals),
  );

  // 多重発火防止
  const closingRef = useRef(false);

  // シートが開くたびに initialValue でリセット (BottomSheet なので auto-focus しない)
  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      const seeded = clampToRange(snapToStep(initialValue, config), config);
      setDraft(seeded);
      setRawInput(formatValue(seeded, config.decimals));
    }
  }, [visible, initialValue, config]);

  // draft 変化時にスクリーンリーダーへ通知
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`${draft}${config.unitLabel}`);
    }
  }, [draft, visible, config.unitLabel]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const commitAndClose = useCallback(
    (value: number) => {
      if (closingRef.current) return;
      closingRef.current = true;
      onClose(value);
    },
    [onClose],
  );

  const handleCancel = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose(null);
  }, [onClose]);

  const updateDraft = useCallback(
    (next: number) => {
      setDraft(next);
      setRawInput(formatValue(next, config.decimals));
    },
    [config.decimals],
  );

  const handleIncrement = useCallback(() => {
    updateDraft(incrementBy(draft, config));
  }, [draft, config, updateDraft]);

  const handleDecrement = useCallback(() => {
    updateDraft(decrementBy(draft, config));
  }, [draft, config, updateDraft]);

  const handlePreset = useCallback(
    (value: number) => {
      updateDraft(value);
    },
    [updateDraft],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      if (wouldKeystrokeProduceOutOfRange(rawInput, text, config)) return;
      setRawInput(text);
      const parsed = parseAmountInput(text, config);
      if (parsed !== null) {
        if (parsed <= config.max) {
          setDraft(clampToRange(parsed, config));
        }
      }
    },
    [rawInput, config],
  );

  const handleInputBlur = useCallback(() => {
    const snapped = snapToStep(draft, config);
    const clamped = clampToRange(snapped, config);
    setDraft(clamped);
    setRawInput(formatValue(clamped, config.decimals));
  }, [draft, config]);

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  const atMin = draft <= config.min;
  const atMax = draft >= config.max;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <BottomSheet
      visible={visible}
      onClose={handleCancel}
      title={resolvedTitle}
      primaryAction={{
        label: tr('common.done'),
        onPress: () => commitAndClose(draft),
        disabled: !isValidAmount(draft, config),
      }}
      secondaryAction={{
        label: tr('common.cancel'),
        onPress: handleCancel,
      }}
      keyboardAware
      testID={testID}
    >
      {/* 一体型ステッパー: [ − ] [ TextInput  単位 ] [ + ] */}
      <View style={styles.stepperRow}>
        <Pressable
          onPress={handleDecrement}
          disabled={atMin}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tr('amountEdit.decreaseA11y')}
          accessibilityState={{ disabled: atMin }}
          style={({ pressed }) => [
            styles.stepperBtn,
            {
              backgroundColor: t.colors.surface.raised,
              borderColor: t.colors.border.interactive,
              opacity: atMin ? 0.35 : pressed ? 0.65 : 1,
            },
          ]}
          testID={testID ? `${testID}-dec` : undefined}
        >
          <Text style={[styles.stepperIcon, { color: t.colors.content.primary }]}>−</Text>
        </Pressable>

        {/* 中央: タップでキーボード入力、ステッパーで連動更新 */}
        <Pressable
          style={[
            styles.valueBox,
            { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.subtle },
          ]}
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="none"
        >
          <TextInput
            ref={inputRef}
            style={[styles.valueInput, { color: t.colors.content.primary }]}
            value={rawInput}
            onChangeText={handleChangeText}
            onBlur={handleInputBlur}
            keyboardType={config.decimals > 0 ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            onSubmitEditing={() => commitAndClose(draft)}
            accessibilityLabel={tr('amountEdit.inputA11y', { min: config.min, max: config.max, unit: config.unitLabel })}
            accessibilityValue={{ now: draft, min: config.min, max: config.max }}
            testID={testID ? `${testID}-input` : undefined}
          />
          <Text style={[styles.unitText, { color: t.colors.content.secondary }]}>
            {config.unitLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleIncrement}
          disabled={atMax}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tr('amountEdit.increaseA11y')}
          accessibilityState={{ disabled: atMax }}
          style={({ pressed }) => [
            styles.stepperBtn,
            {
              backgroundColor: t.colors.surface.raised,
              borderColor: t.colors.border.interactive,
              opacity: atMax ? 0.35 : pressed ? 0.65 : 1,
            },
          ]}
          testID={testID ? `${testID}-inc` : undefined}
        >
          <Text style={[styles.stepperIcon, { color: t.colors.content.primary }]}>+</Text>
        </Pressable>
      </View>

      {/* プリセット */}
      {config.presets.length > 0 ? (
        <View style={styles.presetRow}>
          {config.presets.map((p) => (
            <Chip
              key={String(p)}
              label={`${formatValue(p, config.decimals)}${config.unitLabel}`}
              selected={matchesPreset(draft, config) === p}
              onPress={() => handlePreset(p)}
              size="sm"
              testID={testID ? `${testID}-preset-${p}` : undefined}
            />
          ))}
        </View>
      ) : null}

      <Text style={[styles.rangeHint, { color: t.colors.content.tertiary }]}>
        {config.min}–{config.max} {config.unitLabel}
      </Text>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STEPPER_SIZE = 52;

const styles = StyleSheet.create({
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 8,
  },
  stepperBtn: {
    width: STEPPER_SIZE,
    height: STEPPER_SIZE,
    borderRadius: STEPPER_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperIcon: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 30,
    textAlign: 'center',
  },
  valueBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: STEPPER_SIZE,
    paddingHorizontal: 12,
    gap: 4,
  },
  // design-system の NumberField と同じ「大きい数値入力欄」ロール (3xl は NumberField の
  // size 範囲内)。letterSpacing は NumberField 本体と揃えて tighter に統一。
  valueInput: {
    fontSize: fs['3xl'],
    fontWeight: '700',
    letterSpacing: ls.tighter,
    textAlign: 'center',
    minWidth: 48,
    paddingVertical: 0,
  },
  // 3xl の valueInput に添える単位。NumberField の非 compact 時の単位 (lg) に揃える。
  unitText: {
    fontSize: fs.lg,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rangeHint: {
    fontSize: fs.xs,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
});
