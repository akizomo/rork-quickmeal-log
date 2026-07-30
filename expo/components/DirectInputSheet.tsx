/**
 * DirectInputSheet — 数値直接入力シート (SEARCH_SPEC v0.3 §F_direct)
 *
 * 名前(任意) + kcal(必須) + P/F/C(任意) を手入力して即座に記録する。
 * 再利用なし・使い捨て。カスタム食品管理は別スコープ (P2-S7)。
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Body, BottomSheet, Label, Overline, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { formatDateKey, generateId, getMealSlot } from '@/utils/nutrition';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function DirectInputSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const { pushLog, loggingDate } = useAppState();

  const [name, setName] = useState('');
  const [kcalStr, setKcalStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');

  const reset = useCallback(() => {
    setName('');
    setKcalStr('');
    setProteinStr('');
    setFatStr('');
    setCarbsStr('');
  }, []);

  const kcal = parseFloat(kcalStr) || 0;
  const canSave = kcal > 0;

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    const protein = parseFloat(proteinStr) || 0;
    const fat = parseFloat(fatStr) || 0;
    const carbs = parseFloat(carbsStr) || 0;
    const label = name.trim() || '直接入力';

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
      title="数値で入力"
      primaryAction={{ label: '記録する', onPress: handleSave, disabled: !canSave }}
      secondaryAction={{ label: 'キャンセル', onPress: handleClose }}
      expandToFull={false}
    >
      <View style={{ gap: t.spacing['5'] }}>
        {/* 名前 */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">名前（任意）</Overline>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="例: プロテインバー、カスタムシェイク"
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
            accessibilityLabel="食品名"
          />
        </View>

        {/* カロリー */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">カロリー（必須）</Overline>
          <View style={[styles.macroRow, { gap: t.spacing['3'] }]}>
            <MacroField
              value={kcalStr}
              onChangeText={setKcalStr}
              suffix="kcal"
              placeholder="0"
              accessibilityLabel="カロリー"
            />
          </View>
        </View>

        {/* PFC */}
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">PFC（任意）</Overline>
          <View style={[styles.macroRow, { gap: t.spacing['3'] }]}>
            <MacroField
              value={proteinStr}
              onChangeText={setProteinStr}
              suffix="P"
              placeholder="0"
              accessibilityLabel="タンパク質(g)"
            />
            <MacroField
              value={fatStr}
              onChangeText={setFatStr}
              suffix="F"
              placeholder="0"
              accessibilityLabel="脂質(g)"
            />
            <MacroField
              value={carbsStr}
              onChangeText={setCarbsStr}
              suffix="C"
              placeholder="0"
              accessibilityLabel="炭水化物(g)"
            />
          </View>
          <Body size="sm" tone="secondary">単位はすべて g</Body>
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
