/**
 * My食品の記録シート (ネイティブ formSheet)。`/my-food-log?id=…&source=list|search|frequent`
 *
 * 量は「保存した値 = 100%」として%で調整するだけ (PRD v1.19)。食材の記録シートの%の量欄と同じ部品
 * (AmountStepperRow + 量入力シート) とチップを使う。**保存値は変えない** (My食品の値を直すのは別画面
 * /my-food-edit。「今日は半分食べた」つもりで My食品の値を書き換える事故を避けるため、画面を分ける)。
 * 名前の変更・削除はここに置かない (シートの上にシートが重なる二重構造になるため。My食品ページの行タップから開く
 * 編集ページで行う)。kcal・PFC は「値を直す」でこのシートの中で直せる (値が合っていないと気づくのは、ここで kcal を見たとき)。
 *
 * 下部は食材の記録シートと同じボトムアクション (名前・kcal・PFC + ⭐️ + 記録)。⭐️ で、この My食品を
 * ⭐️タブのお気に入りに入れる / はずす (PRD v1.18)。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Chip, TallSheetScreen, useTheme } from '@/design-system';
import { AmountStepperRow } from '@/components/AmountStepperRow';
import { openAmountEditor } from '@/components/AmountEditSheet';
import { LogFooterPreview, usePinNotice } from '@/components/LogSheetFooter';
import { MyFoodValueFields, myFoodValueStrings, parseMyFoodValues } from '@/components/MyFoodValueFields';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { buildIdentityAmountEditConfig, decrementBy, incrementBy } from '@/utils/amount-edit';
import { myFoodPinKey, shouldShowFrequentTab } from '@/utils/frequent-pins';
import { MY_FOOD_AMOUNT_SPEC, myFoodMacro, updateMyFood } from '@/utils/my-foods';

export default function MyFoodLogRoute() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, recordMyFood, setFrequentPinned, setMyFoods, isHydrating } = useAppState();
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const food = (settings.myFoods ?? []).find((f) => f.id === id);
  // 保存した値 = 100%。量は%で持つ
  const [percent, setPercent] = useState<number>(MY_FOOD_AMOUNT_SPEC.default);
  const pinNotice = usePinNotice('mfl');
  // 「値を直す」: kcal・PFC をこのシートの中で直す。開いた時点の保存値で入力欄を作る (null = 閉じている)
  const [valueDraft, setValueDraft] = useState<ReturnType<typeof myFoodValueStrings> | null>(null);
  const amountConfig = useMemo(() => buildIdentityAmountEditConfig({ ...MY_FOOD_AMOUNT_SPEC, chips: [...MY_FOOD_AMOUNT_SPEC.chips] }), []);

  const pinKey = food ? myFoodPinKey(food.id) : null;
  const isPinned = !!pinKey && (settings.frequentPins ?? []).includes(pinKey);
  const handleTogglePin = useCallback(() => {
    if (!food || !pinKey) return;
    const adding = !isPinned;
    const historyEntries = Object.values((settings.quickLogHistory ?? {}) as Record<string, unknown[]>).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    pinNotice.announce({
      adding,
      label: food.name,
      firstEver: !settings.pinNoticeSeenAtISO,
      tabWasHidden: !shouldShowFrequentTab(historyEntries, settings.frequentPins, settings.myFoods),
    });
    setFrequentPinned(pinKey, adding);
  }, [food, pinKey, isPinned, pinNotice, setFrequentPinned, settings.quickLogHistory, settings.frequentPins, settings.myFoods, settings.pinNoticeSeenAtISO]);

  // 量の直接入力は、食材の記録シートと同じ量入力シート (/amount-edit) を上に積む
  const openAmountSheet = () => {
    openAmountEditor({
      config: amountConfig,
      initialValue: percent,
      testID: 'mfl-amount-dialog',
      onDone: (next) => {
        if (next !== null) setPercent(next);
      },
    });
  };

  // 量欄の −/＋。刻みは量入力シートのステッパーと同じ (10%)
  const stepAmount = (direction: 'up' | 'down') => {
    setPercent((p) => (direction === 'up' ? incrementBy(p, amountConfig) : decrementBy(p, amountConfig)));
  };

  if (isHydrating) return null; // 設定の読み込みを待つ (読み込み前に「見つかりません」を出さない)
  if (!food) {
    // 開いている間に削除された等
    return (
      <TallSheetScreen title={tr('myFoods.title')} testID="my-food-log">
        <Body tone="secondary">{tr('myFoods.notFound')}</Body>
      </TallSheetScreen>
    );
  }

  const macro = myFoodMacro(food, percent / 100);

  const draftParsed = valueDraft ? parseMyFoodValues(valueDraft) : null;
  const handleSaveValues = () => {
    if (!draftParsed || draftParsed.kcal <= 0) return;
    const result = updateMyFood(settings.myFoods, food.id, { name: food.name, ...draftParsed });
    if (!result.ok) return;
    setMyFoods(result.foods);
    setValueDraft(null);
  };

  const handleRecord = async () => {
    await recordMyFood(food.id, percent / 100, source === 'search' ? 'search' : source === 'frequent' ? 'frequent' : 'list');
    router.back();
  };

  return (
    <TallSheetScreen
      title={food.name}
      primaryAction={{ label: tr('myFoods.record'), onPress: handleRecord }}
      footerLeft={
        <LogFooterPreview
          macro={macro}
          testIDPrefix="mfl"
          pin={{ label: food.name, pinned: isPinned, onToggle: handleTogglePin, onCenterX: pinNotice.onCenterX }}
        />
      }
      footerAccessory={pinNotice.accessory}
      testID="my-food-log"
    >
      <View style={{ gap: t.spacing['2'] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
          {amountConfig.presets.map((v) => (
            <Chip
              key={v}
              label={`${v}%`}
              selected={percent === v}
              onPress={() => setPercent(v)}
              size="compact"
              testID={`my-food-percent-${v}`}
            />
          ))}
        </View>
        <AmountStepperRow
          value={percent}
          unitLabel={amountConfig.unitLabel}
          onPressValue={openAmountSheet}
          onStep={stepAmount}
          atMin={percent <= amountConfig.min}
          atMax={percent >= amountConfig.max}
          valueA11yLabel={tr('dishEntry.a11yAmountChange', { value: percent, unit: amountConfig.unitLabel })}
          testIDPrefix="mfl-amount"
        />
        <Body size="sm" tone="secondary">{tr('myFoods.percentNote')}</Body>

        {valueDraft ? (
          <View style={{ gap: t.spacing['3'], marginTop: t.spacing['4'] }} testID="mfl-values-editor">
            <MyFoodValueFields values={valueDraft} onChange={setValueDraft} testIDPrefix="mfl-values" />
            {/* 保存前から読める位置に */}
            <Body size="sm" tone="secondary">{tr('myFoods.recordsUnchanged')}</Body>
            <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
              <Button label={tr('common.cancel')} variant="secondary" size="sm" onPress={() => setValueDraft(null)} testID="mfl-values-cancel" />
              <Button
                label={tr('myFoods.saveValues')}
                size="sm"
                onPress={handleSaveValues}
                disabled={!draftParsed || draftParsed.kcal <= 0}
                testID="mfl-values-save"
              />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'flex-start' }}>
            <Button
              label={tr('myFoods.editValues')}
              variant="plain"
              size="sm"
              onPress={() => setValueDraft(myFoodValueStrings(food))}
              testID="mfl-values-open"
            />
          </View>
        )}
      </View>
    </TallSheetScreen>
  );
}
