/**
 * DirectInputSheet — 数値直接入力シート (SEARCH_SPEC v0.3 §F_direct)
 *
 * 名前(任意) + kcal(必須) + P/F/C(任意) を手入力して即座に記録する。
 * 再利用なし・使い捨て。カスタム食品管理は別スコープ (P2-S7)。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Body, BottomSheet, Label, Overline, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { formatDateKey, generateId, getMealSlot } from '@/utils/nutrition';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called on cancel only (not after a successful save) — e.g. to re-open search sheet. */
  onDismiss?: () => void;
};

export function DirectInputSheet({ visible, onClose, onDismiss }: Props) {
  const t = useTheme();
  const tr = useT();
  const { pushLog, loggingDate } = useAppState();

  const [name, setName] = useState('');
  const [kcalStr, setKcalStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [kcalIsAuto, setKcalIsAuto] = useState(false);
  // true のとき PFC 変化によるオート上書きを抑制する
  const kcalManuallyEdited = useRef(false);

  // PFC から kcal を自動計算 (P×4 + F×9 + C×4)
  useEffect(() => {
    if (kcalManuallyEdited.current) return;
    const p = parseFloat(proteinStr) || 0;
    const f = parseFloat(fatStr) || 0;
    const c = parseFloat(carbsStr) || 0;
    const total = Math.round(p * 4 + f * 9 + c * 4);
    if (total > 0) {
      setKcalStr(String(total));
      setKcalIsAuto(true);
    } else {
      setKcalStr('');
      setKcalIsAuto(false);
    }
  }, [proteinStr, fatStr, carbsStr]);

  const handleKcalChange = useCallback((v: string) => {
    setKcalStr(v);
    kcalManuallyEdited.current = v.length > 0;
    if (v.length === 0) setKcalIsAuto(false);
  }, []);

  const reset = useCallback(() => {
    setName('');
    setKcalStr('');
    setProteinStr('');
    setFatStr('');
    setCarbsStr('');
    setKcalIsAuto(false);
    kcalManuallyEdited.current = false;
  }, []);

  const kcal = parseFloat(kcalStr) || 0;
  const canSave = kcal > 0;

  const handleClose = useCallback(() => {
    reset();
    onClose();
    onDismiss?.();
  }, [reset, onClose, onDismiss]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    const protein = parseFloat(proteinStr) || 0;
    const fat = parseFloat(fatStr) || 0;
    const carbs = parseFloat(carbsStr) || 0;
    const label = name.trim() || tr('directInput.fallbackLabel');

    const now = new Date();
    // Preserve time-of-day even when logging to a past date
    const logDate = loggingDate
      ? (() => {
          const d = new Date(loggingDate);
          d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          return d;
        })()
      : now;

    await pushLog({
      id: generateId('log'),
      date: formatDateKey(logDate),
      timestamp: logDate.toISOString(),
      mealSlot: getMealSlot(logDate),
      mode: 'ingredient',
      categoryKey: 'direct_input',
      categoryLabel: label,
      macro: { kcal, protein, fat, carbs },
    });

    reset();
    onClose();
  }, [canSave, kcal, name, proteinStr, fatStr, carbsStr, loggingDate, pushLog, reset, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={tr('directInput.title')}
      primaryAction={{ label: tr('directInput.record'), onPress: handleSave, disabled: !canSave }}
      secondaryAction={{ label: tr('common.cancel'), onPress: handleClose }}
      keyboardAware
      expandToFull
    >
      <View style={{ gap: t.spacing['5'] }}>
        {/* 名前 */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('directInput.sections.name')}</Overline>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tr('directInput.namePlaceholder')}
            placeholderTextColor={t.colors.content.tertiary}
            returnKeyType="next"
            style={[
              styles.nameInput,
              {
                color: t.colors.content.primary,
                backgroundColor: t.colors.surface.raised,
                borderRadius: t.radius.md,
                paddingHorizontal: t.spacing['4'],
                paddingVertical: t.spacing['3'],
              },
            ]}
            accessibilityLabel={tr('directInput.nameA11y')}
          />
        </View>

        {/* カロリー */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('directInput.sections.kcal')}</Overline>
          <View style={[styles.macroRow, { gap: t.spacing['3'] }]}>
            <MacroField
              value={kcalStr}
              onChangeText={handleKcalChange}
              suffix="kcal"
              placeholder="0"
              accessibilityLabel={tr('directInput.kcalA11y')}
            />
          </View>
          {kcalIsAuto && (
            <Body size="sm" tone="secondary">{tr('directInput.kcalAutoCalc')}</Body>
          )}
        </View>

        {/* PFC */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('directInput.sections.pfc')}</Overline>
          <View style={[styles.macroRow, { gap: t.spacing['3'] }]}>
            <MacroField
              value={proteinStr}
              onChangeText={setProteinStr}
              suffix="P"
              placeholder="0"
              accessibilityLabel={tr('directInput.proteinA11y')}
            />
            <MacroField
              value={fatStr}
              onChangeText={setFatStr}
              suffix="F"
              placeholder="0"
              accessibilityLabel={tr('directInput.fatA11y')}
            />
            <MacroField
              value={carbsStr}
              onChangeText={setCarbsStr}
              suffix="C"
              placeholder="0"
              accessibilityLabel={tr('directInput.carbsA11y')}
            />
          </View>
          <Body size="sm" tone="secondary">{tr('directInput.gramUnit')}</Body>
        </View>
      </View>
    </BottomSheet>
  );
}

function MacroField({
  value,
  onChangeText,
  suffix,
  placeholder,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (v: string) => void;
  suffix: string;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.macroField,
        {
          backgroundColor: t.colors.surface.raised,
          borderRadius: t.radius.md,
          paddingHorizontal: t.spacing['3'],
          paddingVertical: t.spacing['2'],
        },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={t.colors.content.tertiary}
        style={[
          styles.macroInput,
          {
            color: t.colors.content.primary,
            fontSize: t.typography.fontSize['2xl'],
            fontWeight: t.typography.fontWeight.bold as import('react-native').TextStyle['fontWeight'],
          },
        ]}
        accessibilityLabel={accessibilityLabel}
      />
      <Label size="sm" tone="secondary">{suffix}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    fontSize: 15,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  macroField: {
    flex: 1,
    alignItems: 'center',
  },
  macroInput: {
    width: '100%',
    textAlign: 'center',
    paddingVertical: 0,
  },
});
