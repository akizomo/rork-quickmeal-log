/**
 * My食品の編集ページ (通常の下層ページ)。`/my-food-edit?id=…`
 *
 * My食品ページ (倉庫) の行タップで開く。2026-10-26 (PRD v1.19) に formSheet から下層ページへ変えた
 * (記録シートの中に「編集」を置いていたため、シートの上にシートが重なる二重構造になっていた)。
 *
 * My食品そのもの (名前・kcal・PFC) を直す。記録シート (今回の量) とは画面を分ける。
 * - 他の My食品と同じ名前には直せない (「同じ名前があります」を出して保存を止める)
 * - 「お気に入りに入れる」スイッチ: ⭐️のお気に入りに入れる/はずす (記録シートの ⭐️ と同じ状態。押した時点で反映する)
 * - **「これまでの記録は変わりません」を、保存前から読める位置に添える**。削除の確認にも添える
 * - 削除は一番下 → 確認 (Alert・destructive)。過去の記録は一切変えない (記録が名前と数値の写しを持つため)
 * - 保存は右上。戻るだけなら保存しない
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MyFoodValueFields, myFoodValueStrings, parseMyFoodValues } from '@/components/MyFoodValueFields';
import {
  Body,
  Button,
  Overline,
  SettingsLinkRow,
  SettingsListCard,
  Switch,
  useTheme,
} from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import type { MyFood } from '@/types/my-food';
import { myFoodPinKey } from '@/utils/frequent-pins';
import { deleteMyFood, updateMyFood } from '@/utils/my-foods';

export default function MyFoodEditRoute() {
  const t = useTheme();
  const tr = useT();
  const { settings, isHydrating } = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const food = (settings.myFoods ?? []).find((f) => f.id === id);

  // 設定の読み込み前に初期値を取ると空のまま固まるので、読み込みを待ってから入力欄を作る
  if (isHydrating) return null;
  if (!food) {
    return (
      <View style={{ flex: 1, padding: t.spacing['5'], backgroundColor: t.colors.surface.default }} testID="my-food-edit">
        <Body tone="secondary">{tr('myFoods.notFound')}</Body>
      </View>
    );
  }
  return <MyFoodEditForm key={food.id} food={food} />;
}

function MyFoodEditForm({ food }: { food: MyFood }) {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, setMyFoods, setFrequentPinned } = useAppState();

  // 開いた時点の値で初期化する (編集中に値が変わっても入力欄を書き換えない)
  const [name, setName] = useState(food.name);
  const [values, setValues] = useState(() => myFoodValueStrings(food));
  const [duplicate, setDuplicate] = useState(false);

  const parsed = parseMyFoodValues(values);
  const canSave = name.trim().length > 0 && parsed.kcal > 0;

  const pinKey = myFoodPinKey(food.id);
  const isPinned = (settings.frequentPins ?? []).includes(pinKey);

  const handleSave = () => {
    if (!canSave) return;
    const result = updateMyFood(settings.myFoods, food.id, { name, ...parsed });
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
            router.back();
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
    <>
      <Stack.Screen
        options={{
          title: tr('myFoods.editTitle'),
          headerRight: () => (
            <Button
              label={tr('common.save')}
              variant="plain"
              size="sm"
              onPress={handleSave}
              disabled={!canSave}
              testID="my-food-edit-save"
            />
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: t.spacing['5'], paddingBottom: t.spacing['8'] }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        testID="my-food-edit"
      >
        <View style={{ gap: t.spacing['6'] }}>
          <View style={{ gap: t.spacing['2'] }}>
            <Overline tone="secondary">{tr('myFoods.nameTitle')}</Overline>
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

          <MyFoodValueFields values={values} onChange={setValues} testIDPrefix="my-food-edit" />

          <SettingsListCard testID="my-food-edit-favorite">
            <SettingsLinkRow
              label={tr('myFoods.favorite')}
              showChevron={false}
              trailing={
                <Switch
                  value={isPinned}
                  onValueChange={(v) => setFrequentPinned(pinKey, v)}
                  accessibilityLabel={tr('myFoods.favorite')}
                  testID="my-food-edit-favorite-switch"
                />
              }
            />
          </SettingsListCard>

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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 15 },
});
