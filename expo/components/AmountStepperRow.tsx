/**
 * AmountStepperRow — 記録シートの量欄: [ 値 (タップで数値入力) ]  [−][＋]。
 * 食材の記録シート (IdentityLogSheet) と My食品の記録シート (MyFoodLogSheet) で同じ見た目・同じ操作にする。
 *
 * - 値の領域をタップすると、量入力シート (`/amount-edit`) で数字を打てる (onPressValue)
 * - −/＋ は呼び出し側が、量入力シートのステッパーと同じ刻み (utils/amount-edit.ts の stepperTiers) で動かす
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';

export function AmountStepperRow({
  value,
  unitLabel,
  onPressValue,
  onStep,
  atMin,
  atMax,
  valueA11yLabel,
  testIDPrefix,
  style,
}: {
  value: number;
  unitLabel: string;
  onPressValue: () => void;
  onStep: (direction: 'up' | 'down') => void;
  atMin: boolean;
  atMax: boolean;
  valueA11yLabel: string;
  /** 例: 'ils-amount' → ils-amount-row / ils-amount-dec / ils-amount-inc */
  testIDPrefix: string;
  style?: { marginTop?: number };
}) {
  const t = useTheme();
  const tr = useT();
  return (
    <View
      style={[
        styles.row,
        {
          marginTop: style?.marginTop ?? 0,
          paddingRight: t.spacing['2'],
          gap: t.spacing['2'],
          backgroundColor: t.colors.surface.raised,
          borderRadius: t.radius.lg,
        },
      ]}
    >
      <Pressable
        onPress={onPressValue}
        style={[styles.valueArea, { paddingLeft: t.spacing['4'] }]}
        accessibilityRole="button"
        accessibilityLabel={valueA11yLabel}
        testID={`${testIDPrefix}-row`}
      >
        <Text style={[styles.value, { color: t.colors.content.primary, fontSize: t.typography.fontSize['2xl'] }]}>
          {value}
          <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm }}>
            {' '}{unitLabel}
          </Text>
        </Text>
      </Pressable>
      <View style={[styles.stepper, { gap: t.spacing['3'] }]}>
        <IconButton
          icon="remove"
          variant="outlined"
          size="lg"
          hitSlop={4}
          onPress={() => onStep('down')}
          disabled={atMin}
          accessibilityLabel={tr('amountEdit.decreaseA11y')}
          testID={`${testIDPrefix}-dec`}
        />
        <IconButton
          icon="add"
          variant="outlined"
          size="lg"
          hitSlop={4}
          onPress={() => onStep('up')}
          disabled={atMax}
          accessibilityLabel={tr('amountEdit.increaseA11y')}
          testID={`${testIDPrefix}-inc`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 58,
  },
  // 値の領域は行の残り幅いっぱい・高さいっぱいをタップ可能にする
  valueArea: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontWeight: '700',
  },
});
