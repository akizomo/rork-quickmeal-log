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
 *
 * **編集モード** (`?editingLogId=…`。記録一覧から、My食品から記録した記録を開いたとき。PRD §6.5.4):
 * 同じ%の量欄で、その記録の量を直す。基準は記録した時点の「保存した値 = 100%」(`log.myFood.baseMacro`) で、
 * My食品を後で直したり消したりしても変わらない。⭐️・「値を直す」は出さない (記録を直す画面なので)。
 * 保存は記録を上書き、右上のごみ箱で記録を削除する (食材の記録シートの編集モードと同じ)。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Body, Button, Chip, IconButton, TallSheetScreen, useTheme } from '@/design-system';
import { AmountStepperRow } from '@/components/AmountStepperRow';
import { openAmountEditor } from '@/components/AmountEditSheet';
import { LogFooterPreview, usePinNotice } from '@/components/LogSheetFooter';
import { MyFoodValueFields, myFoodValueStrings, parseMyFoodValues } from '@/components/MyFoodValueFields';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { buildIdentityAmountEditConfig, decrementBy, incrementBy } from '@/utils/amount-edit';
import { myFoodPinKey, shouldShowFrequentTab } from '@/utils/frequent-pins';
import { MY_FOOD_AMOUNT_SPEC, myFoodAmountLabel, myFoodBaseMacro, scaleMacro, updateMyFood } from '@/utils/my-foods';
import type { MyFood } from '@/types/my-food';
import type { FoodLog } from '@/types/nutrition';

export default function MyFoodLogRoute() {
  const tr = useT();
  const { settings, logs, isHydrating } = useAppState();
  const { id, source, editingLogId } = useLocalSearchParams<{ id?: string; source?: string; editingLogId?: string }>();
  if (isHydrating) return null; // 設定の読み込みを待つ (読み込み前に「見つかりません」を出さない)

  const editingLog = editingLogId ? logs.find((l) => l.id === editingLogId) ?? null : null;
  const food = editingLogId ? null : (settings.myFoods ?? []).find((f) => f.id === id) ?? null;
  if ((editingLogId && !editingLog?.myFood) || (!editingLogId && !food)) {
    // 開いている間に削除された等
    return (
      <TallSheetScreen title={tr('myFoods.title')} testID="my-food-log">
        <Body tone="secondary">{tr('myFoods.notFound')}</Body>
      </TallSheetScreen>
    );
  }
  // 量の初期値は開いた時点のものにしたいので、記録 / My食品ごとに作り直す
  return <MyFoodLogSheet key={editingLogId ?? id} food={food} editingLog={editingLog} source={source} />;
}

function MyFoodLogSheet({
  food,
  editingLog,
  source,
}: {
  food: MyFood | null;
  editingLog: FoodLog | null;
  source?: string;
}) {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, recordMyFood, setFrequentPinned, setMyFoods, replaceLog, deleteLog } = useAppState();
  const editing = editingLog !== null;
  // 保存した値 = 100%。量は%で持つ。編集モードは、その記録の%から始める
  const [percent, setPercent] = useState<number>(editingLog?.myFood?.percent ?? MY_FOOD_AMOUNT_SPEC.default);
  const pinNotice = usePinNotice('mfl');
  // 「値を直す」: kcal・PFC をこのシートの中で直す。開いた時点の保存値で入力欄を作る (null = 閉じている)
  const [valueDraft, setValueDraft] = useState<ReturnType<typeof myFoodValueStrings> | null>(null);
  const amountConfig = useMemo(() => buildIdentityAmountEditConfig({ ...MY_FOOD_AMOUNT_SPEC, chips: [...MY_FOOD_AMOUNT_SPEC.chips] }), []);

  const pinKey = food && !editing ? myFoodPinKey(food.id) : null;
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

  // 基準 (= 100%) の値。編集モードは、記録した時点のもの (My食品を後で直しても変わらない)
  const baseMacro = editingLog?.myFood ? editingLog.myFood.baseMacro : myFoodBaseMacro(food!);
  const title = editingLog ? editingLog.categoryLabel : food!.name;
  const macro = scaleMacro(baseMacro, percent / 100);

  const draftParsed = valueDraft ? parseMyFoodValues(valueDraft) : null;
  const handleSaveValues = () => {
    if (!food || !draftParsed || draftParsed.kcal <= 0) return;
    const result = updateMyFood(settings.myFoods, food.id, { name: food.name, ...draftParsed });
    if (!result.ok) return;
    setMyFoods(result.foods);
    setValueDraft(null);
  };

  const handleRecord = async () => {
    if (editingLog?.myFood) {
      // 記録の量を直す: 基準は変えず、%と、その%での値だけを書き換える
      await replaceLog({
        ...editingLog,
        macro,
        amountLabel: myFoodAmountLabel(percent / 100),
        myFood: { ...editingLog.myFood, percent },
      });
      router.back();
      return;
    }
    await recordMyFood(food!.id, percent / 100, source === 'search' ? 'search' : source === 'frequent' ? 'frequent' : 'list');
    router.back();
  };

  const confirmDelete = () => {
    if (!editingLog) return;
    Alert.alert(tr('identityLog.deleteTitle'), tr('identityLog.deleteMessage'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteLog(editingLog.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <TallSheetScreen
      title={title}
      primaryAction={{ label: editing ? tr('common.save') : tr('myFoods.record'), onPress: handleRecord }}
      footerLeft={
        <LogFooterPreview
          macro={macro}
          testIDPrefix="mfl"
          pin={
            editing || !food
              ? undefined
              : { label: food.name, pinned: isPinned, onToggle: handleTogglePin, onCenterX: pinNotice.onCenterX }
          }
        />
      }
      footerAccessory={editing ? undefined : pinNotice.accessory}
      headerRight={
        editing ? (
          <View style={{ flexDirection: 'row', gap: t.spacing['3'], alignItems: 'center' }}>
            <IconButton
              icon="delete"
              size="lg"
              tone="danger"
              onPress={confirmDelete}
              accessibilityLabel={tr('identityLog.deleteA11y')}
              testID="mfl-delete"
            />
            <IconButton
              icon="close"
              size="lg"
              onPress={() => router.back()}
              accessibilityLabel={tr('identityLog.closeA11y')}
              testID="mfl-close"
            />
          </View>
        ) : undefined
      }
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

        {editing ? null : valueDraft ? (
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
              onPress={() => setValueDraft(myFoodValueStrings(food!))}
              testID="mfl-values-open"
            />
          </View>
        )}
      </View>
    </TallSheetScreen>
  );
}
