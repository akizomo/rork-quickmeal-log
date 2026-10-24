/**
 * AmountEditSheet — 量の直接入力シート (ネイティブ formSheet `/amount-edit` の中身)。
 *
 * 2026-10-18: 中央 Dialog から formSheet へ移行 (docs/SHEET_MIGRATION.md §7-5)。
 * 体重入力 (record-body.tsx) と同じく、iOS は数字キーボード右上の OS 標準カプセルを「保存」にして確定する。
 *
 * 呼び出し側は値を受け取るコールバックを `openAmountEditor()` に渡す。シートはナビゲーションの
 * 画面として開くため、props では値を返せない。依頼内容は小さな zustand ストアに置く。
 *
 *   openAmountEditor({ config, initialValue, onDone: (next) => { if (next !== null) setCount(next) } });
 *
 * # 設計方針
 *  - 値バリデーション・正規化はすべて amount-edit.ts の純粋関数に委譲
 *  - シートは「draft」のみを管理し、確定まで呼び出し側には通知しない。保存せずに閉じたら onDone(null)
 */

import { router, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { create } from 'zustand';

import { Chip, SheetScreen, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { radius } from '@/design-system/tokens/primitives/radius';
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

export type AmountEditRequest = {
  config: AmountEditConfig;
  initialValue: number;
  /** シートのタイトル。既定は「量を変更」 */
  title?: string;
  testID?: string;
  /** 閉じたときに呼ばれる。`next` は確定した値 (null = 保存せずに閉じた) */
  onDone: (next: number | null) => void;
};

type AmountEditStore = {
  request: AmountEditRequest | null;
  setRequest: (request: AmountEditRequest | null) => void;
};

/** 開いている量入力シートの依頼内容。シートはナビゲーションの画面なので props では渡せない */
const useAmountEditStore = create<AmountEditStore>((set) => ({
  request: null,
  setRequest: (request) => set({ request }),
}));

/** 量入力シート (`/amount-edit`) を開く。確定・取り消しの結果は request.onDone で受け取る */
export function openAmountEditor(request: AmountEditRequest): void {
  useAmountEditStore.getState().setRequest(request);
  router.push('/amount-edit');
}

/** `/amount-edit` ルートの中身。依頼が無い (再起動直後など) ときは何も出さずに閉じる */
export function AmountEditRoute() {
  const request = useAmountEditStore((s) => s.request);
  const routerRef = useRouter();
  // 依頼ごとの onDone を1回だけ呼ぶ (保存で閉じた / スワイプ・キャンセルで閉じた のどちらか)
  const doneRef = useRef(false);

  useEffect(() => {
    if (!request) routerRef.back();
  }, [request, routerRef]);

  useEffect(() => {
    // スワイプ等でシートが閉じられたら「保存せずに閉じた」として通知する
    return () => {
      const current = useAmountEditStore.getState().request;
      if (!doneRef.current && current) current.onDone(null);
      useAmountEditStore.getState().setRequest(null);
    };
  }, []);

  if (!request) return null;
  return (
    <AmountEditSheet
      {...request}
      onDone={(next) => {
        if (doneRef.current) return;
        doneRef.current = true;
        request.onDone(next);
        routerRef.back();
      }}
    />
  );
}

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

function AmountEditSheet({
  onDone,
  config,
  initialValue,
  title,
  testID,
}: AmountEditRequest) {
  const t = useTheme();
  const tr = useT();
  const resolvedTitle = title ?? tr('amountEdit.defaultTitle');
  const inputRef = useRef<TextInputInstance>(null);

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

  // シートの提示アニメ後に入力へフォーカス (record-body と同じく 400ms。spike で競合しないことを確認済み)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  // draft 変化時にスクリーンリーダーへ通知
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${draft}${config.unitLabel}`);
  }, [draft, config.unitLabel]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const commitAndClose = useCallback(
    (value: number) => {
      if (closingRef.current) return;
      closingRef.current = true;
      onDone(value);
    },
    [onDone],
  );

  const handleCancel = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onDone(null);
  }, [onDone]);

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
    <SheetScreen
      title={resolvedTitle}
      cancelLabel={tr('common.cancel')}
      onCancel={handleCancel}
      confirmAction={{
        label: tr('common.save'),
        onPress: () => commitAndClose(draft),
        disabled: !isValidAmount(draft, config),
      }}
      confirmPlacement="return-key"
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
            // iOS: 数字キーボード右上の OS 標準カプセルを「保存」にして確定 (record-body.tsx と同じ)
            // Android: 数字キーボード右下の ✓ で確定
            returnKeyType="done"
            inputAccessoryViewButtonLabel={tr('common.save')}
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
    </SheetScreen>
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
    borderRadius: radius.md,
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
