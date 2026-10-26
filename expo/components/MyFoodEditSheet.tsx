/**
 * My食品の編集画面 (ネイティブ formSheet)。`/my-food-edit?id=…`
 *
 * My食品そのもの (名前・kcal・PFC・単位名) を直す。記録シート (今回の量) とは画面を分ける。
 * - 他の My食品と同じ名前には直せない (「同じ名前があります」を出して保存を止める)
 * - **「これまでの記録は変わりません」を、保存前から読める位置に添える**。削除の確認にも添える
 * - 削除は一番下 → 確認 (Alert・destructive)。過去の記録は一切変えない (記録が名前と数値の写しを持つため)
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Caption, NumberField, Overline, SheetScreen, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import type { MyFood } from '@/types/my-food';
import { deleteMyFood, updateMyFood } from '@/utils/my-foods';

const toStr = (n: number | null) => (n == null ? '' : String(n));
const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s) || 0);

export default function MyFoodEditRoute() {
  const tr = useT();
  const { settings, isHydrating } = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const food = (settings.myFoods ?? []).find((f) => f.id === id);

  // 設定の読み込み前に初期値を取ると空のまま固まるので、読み込みを待ってから入力欄を作る
  if (isHydrating) return null;
  if (!food) {
    return (
      <SheetScreen title={tr('myFoods.editTitle')} testID="my-food-edit">
        <Body tone="secondary">{tr('myFoods.notFound')}</Body>
      </SheetScreen>
    );
  }
  return <MyFoodEditForm key={food.id} food={food} />;
}

function MyFoodEditForm({ food }: { food: MyFood }) {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, setMyFoods } = useAppState();

  // 開いた時点の値で初期化する (編集中に値が変わっても入力欄を書き換えない)
  const [name, setName] = useState(food.name);
  const [kcal, setKcal] = useState(String(food.kcal));
  const [protein, setProtein] = useState(toStr(food.protein));
  const [fat, setFat] = useState(toStr(food.fat));
  const [carbs, setCarbs] = useState(toStr(food.carbs));
  const [unit, setUnit] = useState(food.unitLabel ?? '');
  const [duplicate, setDuplicate] = useState(false);

  const kcalValue = parseFloat(kcal) || 0;
  const canSave = name.trim().length > 0 && kcalValue > 0;

  const handleSave = () => {
    if (!canSave) return;
    const result = updateMyFood(settings.myFoods, food.id, {
      name,
      kcal: kcalValue,
      protein: toNum(protein),
      fat: toNum(fat),
      carbs: toNum(carbs),
      unitLabel: unit,
    });
    if (!result.ok) {
      if (result.reason === 'duplicate') setDuplicate(true);
      return;
    }
    setMyFoods(result.foods);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      tr('myFoods.deleteTitle', { name: food.name }),
      tr('myFoods.deleteMessage'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('common.delete'),
          style: 'destructive',
          onPress: () => {
            setMyFoods(deleteMyFood(settings.myFoods, food.id));
            // 記録シート (この画面の下) も、消えた食品を指しているので一緒に閉じる
            router.dismiss(2);
          },
        },
      ],
    );
  };

  const inputStyle = [
    styles.input,
    {
      color: t.colors.content.primary,
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radius.md,
      paddingHorizontal: t.spacing['4'],
      paddingVertical: t.spacing['3'],
    },
  ];

  return (
    <SheetScreen
      title={tr('myFoods.editTitle')}
      cancelLabel={tr('common.cancel')}
      confirmAction={{ label: tr('common.save'), onPress: handleSave, disabled: !canSave }}
      testID="my-food-edit"
    >
      <View style={{ gap: t.spacing['5'] }}>
        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('directInput.sections.name')}</Overline>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setDuplicate(false);
            }}
            style={inputStyle}
            maxLength={40}
            returnKeyType="done"
            accessibilityLabel={tr('directInput.nameA11y')}
            testID="my-food-edit-name"
          />
          {duplicate ? (
            <Body size="sm" tone="secondary" testID="my-food-edit-duplicate">{tr('myFoods.duplicate')}</Body>
          ) : null}
        </View>

        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('myFoods.perServingTitle')}</Overline>
          <NumberField value={kcal} onChangeText={setKcal} suffix="kcal" size="2xl" align="left" testID="my-food-edit-kcal" />
          <View style={styles.pfcRow}>
            <View style={{ flex: 1 }}>
              <NumberField value={protein} onChangeText={setProtein} suffix="P" size="xl" align="left" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField value={fat} onChangeText={setFat} suffix="F" size="xl" align="left" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField value={carbs} onChangeText={setCarbs} suffix="C" size="xl" align="left" placeholder="0" />
            </View>
          </View>
          <Caption tone="secondary">{tr('directInput.gramUnit')}</Caption>
        </View>

        <View style={{ gap: t.spacing['2'] }}>
          <Overline tone="secondary">{tr('myFoods.unitTitle')}</Overline>
          <TextInput
            value={unit}
            onChangeText={setUnit}
            style={inputStyle}
            maxLength={12}
            placeholder={tr('myFoods.unitPlaceholder')}
            placeholderTextColor={t.colors.content.tertiary}
            returnKeyType="done"
            testID="my-food-edit-unit"
          />
        </View>

        {/* 保存前から読める位置に */}
        <Body size="sm" tone="secondary" testID="my-food-edit-note">{tr('myFoods.recordsUnchanged')}</Body>

        <Button
          label={tr('myFoods.delete')}
          variant="ghost"
          labelStyle={{ color: t.colors.status.danger.default }}
          onPress={handleDelete}
          testID="my-food-edit-delete"
        />
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 15 },
  pfcRow: { flexDirection: 'row', gap: 12 },
});
