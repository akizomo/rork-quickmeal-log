/**
 * My食品の値 (kcal・P・F・C) の入力欄。My食品の編集ページ (MyFoodEditScreen) と、
 * 記録シートのインライン編集 (MyFoodLogSheet「値を直す」) で同じ見た目にする (PRD v1.19)。
 * 文字列のまま受け渡し、数値への変換と検証は呼び出し側 (utils/my-foods.ts の updateMyFood)。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Caption, NumberField, Overline, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import type { MyFood } from '@/types/my-food';

export type MyFoodValueStrings = { kcal: string; protein: string; fat: string; carbs: string };

const toStr = (n: number | null) => (n == null ? '' : String(n));

/** 保存されている値を、入力欄の文字列にする。 */
export function myFoodValueStrings(food: MyFood): MyFoodValueStrings {
  return { kcal: String(food.kcal), protein: toStr(food.protein), fat: toStr(food.fat), carbs: toStr(food.carbs) };
}

/** 入力欄の文字列を、保存する数値にする。PFC は空なら null (未入力)。 */
export function parseMyFoodValues(v: MyFoodValueStrings): {
  kcal: number;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
} {
  const num = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s) || 0);
  return { kcal: parseFloat(v.kcal) || 0, protein: num(v.protein), fat: num(v.fat), carbs: num(v.carbs) };
}

export function MyFoodValueFields({
  values,
  onChange,
  testIDPrefix,
}: {
  values: MyFoodValueStrings;
  onChange: (next: MyFoodValueStrings) => void;
  testIDPrefix: string;
}) {
  const t = useTheme();
  const tr = useT();
  return (
    <View style={{ gap: t.spacing['2'] }}>
      <Overline tone="secondary">{tr('myFoods.perServingTitle')}</Overline>
      <NumberField
        value={values.kcal}
        onChangeText={(kcal) => onChange({ ...values, kcal })}
        suffix="kcal"
        size="2xl"
        align="left"
        testID={`${testIDPrefix}-kcal`}
      />
      <View style={styles.pfcRow}>
        <View style={{ flex: 1 }}>
          <NumberField value={values.protein} onChangeText={(protein) => onChange({ ...values, protein })} suffix="P" size="xl" align="left" placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField value={values.fat} onChangeText={(fat) => onChange({ ...values, fat })} suffix="F" size="xl" align="left" placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField value={values.carbs} onChangeText={(carbs) => onChange({ ...values, carbs })} suffix="C" size="xl" align="left" placeholder="0" />
        </View>
      </View>
      <Caption tone="secondary">{tr('directInput.gramUnit')}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  pfcRow: { flexDirection: 'row', gap: 12 },
});
