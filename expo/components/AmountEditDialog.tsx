/**
 * AmountEditDialog — 量編集専用ダイアログ。
 *
 * 長押しシートの量入力部分を独立させ、システムキーボードが起動しても
 * 確定ボタンが隠れない構造にする (内部テストFB #7 の構造的な解消)。
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
 * # キーボード対応
 *  - iOS   : InputAccessoryView にて「完了」ボタンをキーボード上部に固定
 *  - Android / Web : KeyboardAvoidingView + BottomSheet の sticky footer で担保
 *
 * # 設計方針
 *  - BottomSheet を Modal として再利用することで scrim・ドラッグ退場・アニメを流用
 *  - 値バリデーション・正規化はすべて amount-edit.ts の純粋関数に委譲
 *  - ダイアログは「draft」のみを管理し、確定(onClose(next))まで親には通知しない
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  InputAccessoryView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet, Chip, useTheme } from '@/design-system';
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
  /** Sheet title. Default: "量を変更" */
  title?: string;
  testID?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number for display, trimming unnecessary trailing zeros. */
function formatValue(value: number, decimals: 0 | 1): string {
  return decimals === 1 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AmountEditDialog({
  visible,
  onClose,
  config,
  initialValue,
  title = '量を変更',
  testID,
}: AmountEditDialogProps) {
  const t = useTheme();
  const accessoryViewID = useId();
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

  // ダイアログが開くたびに initialValue でリセット＆入力フォーカス
  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      const seeded = clampToRange(snapToStep(initialValue, config), config);
      setDraft(seeded);
      setRawInput(formatValue(seeded, config.decimals));
      // シートのスライドアニメ完了後にフォーカスを当てる
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [visible, initialValue, config]);

  // draft 変化時にスクリーンリーダーへ通知
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`${draft}${config.unitLabel}`);
    }
    // draft と visible が変わったときだけ発火
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
      // キーストロークを弾く (max 超え・decimals=0 で小数点)
      if (wouldKeystrokeProduceOutOfRange(rawInput, text, config)) return;
      setRawInput(text);
      const parsed = parseAmountInput(text, config);
      if (parsed !== null) {
        // タイプ途中は min 未満でも draft を更新しない (commit 時に clamp)
        if (parsed <= config.max) {
          setDraft(clampToRange(parsed, config));
        }
      }
    },
    [rawInput, config],
  );

  const handleInputBlur = useCallback(() => {
    // フォーカスが外れた時点で draft を rawInput に同期
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

  const body = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.body}
    >
      {/* 一体型ステッパー: [ − ] [ TextInput  単位 ] [ + ] */}
      <View style={styles.stepperRow}>
        <Pressable
          onPress={handleDecrement}
          disabled={atMin}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="量を減らす"
          accessibilityState={{ disabled: atMin }}
          style={({ pressed }) => [
            styles.stepperBtn,
            {
              backgroundColor: t.colors.surface.raised,
              borderColor: t.colors.border.subtle,
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
            keyboardType={config.decimals === 1 ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            onSubmitEditing={() => commitAndClose(draft)}
            inputAccessoryViewID={Platform.OS === 'ios' ? accessoryViewID : undefined}
            accessibilityLabel={`量を入力。${config.min}から${config.max}${config.unitLabel}の範囲`}
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
          accessibilityLabel="量を増やす"
          accessibilityState={{ disabled: atMax }}
          style={({ pressed }) => [
            styles.stepperBtn,
            {
              backgroundColor: t.colors.surface.raised,
              borderColor: t.colors.border.subtle,
              opacity: atMax ? 0.35 : pressed ? 0.65 : 1,
            },
          ]}
          testID={testID ? `${testID}-inc` : undefined}
        >
          <Text style={[styles.stepperIcon, { color: t.colors.content.primary }]}>+</Text>
        </Pressable>
      </View>

      {/* プリセット — キーボード表示時はスクロールアウトしても可 */}
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
        {config.min}〜{config.max} {config.unitLabel}
      </Text>
    </KeyboardAvoidingView>
  );

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={handleCancel}
        title={title}
        expandToFull={false}
        primaryAction={{
          label: '完了',
          onPress: () => commitAndClose(draft),
          disabled: !isValidAmount(draft, config),
        }}
        secondaryAction={{
          label: 'キャンセル',
          onPress: handleCancel,
        }}
        testID={testID}
      >
        {body}
      </BottomSheet>

      {/* iOS: キーボード上部の固定「完了」ボタン */}
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryViewID}>
          <View
            style={[
              styles.accessoryBar,
              { backgroundColor: t.colors.surface.raised, borderTopColor: t.colors.border.subtle },
            ]}
          >
            <Pressable
              onPress={() => commitAndClose(draft)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="完了"
              style={styles.accessoryDoneBtn}
            >
              <Text style={[styles.accessoryDoneLabel, { color: t.colors.action.primary.default }]}>
                完了
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STEPPER_SIZE = 52; // 44pt + 余裕 (アクセシビリティ最低44pt担保)

const styles = StyleSheet.create({
  body: {
    gap: 16,
    paddingTop: 8,
  },
  // [ − ] [valueBox] [ + ] の横一列
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  // 中央の値ボックス (TextInput + 単位を横並び)
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
  valueInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    minWidth: 48,
    paddingVertical: 0,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeHint: {
    fontSize: 11,
    textAlign: 'center',
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryDoneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  accessoryDoneLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
});
