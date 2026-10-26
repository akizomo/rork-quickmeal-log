/**
 * My食品の記録シート (ネイティブ formSheet)。`/my-food-log?id=…&source=list|search`
 *
 * 「1回分 × 倍率」を選んで記録するだけ。**保存値は変えない** (My食品の値を直すのは別画面 /my-food-edit。
 * 「今日は半分食べた」つもりで My食品の値を書き換える事故を避けるため、画面を分ける)。
 * ⭐️トグルは置かない (My食品はピン留めしない)。編集画面への入口はここに置く (行にタップ以外の操作を付けないため)。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Chip, Heading, SheetScreen, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { formatMyFoodPfc, formatMyFoodSummary } from '@/utils/my-food-format';
import { MY_FOOD_MULTIPLIERS, myFoodMacro } from '@/utils/my-foods';

export default function MyFoodLogRoute() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, recordMyFood, isHydrating } = useAppState();
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const food = (settings.myFoods ?? []).find((f) => f.id === id);
  const [multiplier, setMultiplier] = useState<number>(1);

  if (isHydrating) return null; // 設定の読み込みを待つ (読み込み前に「見つかりません」を出さない)
  if (!food) {
    // 開いている間に削除された等
    return (
      <SheetScreen title={tr('myFoods.title')} testID="my-food-log">
        <Body tone="secondary">{tr('myFoods.notFound')}</Body>
      </SheetScreen>
    );
  }

  const macro = myFoodMacro(food, multiplier);
  const unit = food.unitLabel;

  const handleRecord = async () => {
    await recordMyFood(food.id, multiplier, source === 'search' ? 'search' : 'list');
    router.back();
  };

  return (
    <SheetScreen
      title={food.name}
      cancelLabel={tr('common.cancel')}
      confirmAction={{ label: tr('myFoods.record'), onPress: handleRecord }}
      testID="my-food-log"
    >
      <View style={{ gap: t.spacing['5'] }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Body size="sm" tone="secondary">{formatMyFoodSummary(food)}</Body>
            <Body size="sm" tone="secondary">{formatMyFoodPfc(food)}</Body>
          </View>
          <Button
            label={tr('myFoods.editEntry')}
            variant="plain"
            size="sm"
            onPress={() => router.push({ pathname: '/my-food-edit', params: { id: food.id } })}
            testID="my-food-log-edit"
          />
        </View>

        <View style={{ gap: t.spacing['2'] }}>
          <View style={styles.chips}>
            {MY_FOOD_MULTIPLIERS.map((m) => (
              <Chip
                key={m}
                label={unit ? `${m}${unit}` : `× ${m}`}
                selected={multiplier === m}
                onPress={() => setMultiplier(m)}
                testID={`my-food-multiplier-${m}`}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: t.spacing['1'] }}>
          <Heading size="lg" testID="my-food-log-kcal">{`${Math.round(macro.kcal)} kcal`}</Heading>
          <Body size="sm" tone="secondary">
            {`P${macro.protein} · F${macro.fat} · C${macro.carbs}`}
          </Body>
        </View>
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
