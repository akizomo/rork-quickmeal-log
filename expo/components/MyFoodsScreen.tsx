/**
 * My食品ページ — 倉庫 (PRD §6.5.4)。`/my-foods`
 *
 * 全件を「最近使った順」の単純なリストで出す。並べ替え・スワイプ・編集モードは持たない
 * (棚の役割は⭐️タブの下段が担う)。行のタップ = 倍率の記録シート。
 * 入口は検索ページの「My食品 N件 ›」と設定。0件でも開け、使い方を一言添える。
 */
import { useIsFocused, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Body, Button, Card, IconButton, Label, useTheme } from '@/design-system';
import { useLocale } from '@/hooks/useLocale';
import { buildMyFoodShareText } from '@/utils/my-food-landing';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { formatMyFoodSummary } from '@/utils/my-food-format';
import { sortMyFoodsByRecent } from '@/utils/my-foods';

export function MyFoodsScreen() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const { settings, undoState } = useAppState();
  const foods = sortMyFoodsByRecent(settings.myFoods);
  const { foodRegion } = useLocale();

  // 開発者への共有 (PRD §6.5.4「DB拡張への接続」): 画面に出ている名前と、DB に着地するかだけ。押したときだけ送る
  const handleShareNames = useCallback(() => {
    void Share.share({ message: buildMyFoodShareText(foods, new Date().toISOString(), foodRegion) });
  }, [foods, foodRegion]);

  // 記録したらホームまで戻す (検索ページと同じ。記録できたかをホームの合計と取り消しトーストで見せる)
  const isFocused = useIsFocused();
  const savedLogIdRef = useRef<string | null>(undoState?.kind === 'add' ? undoState.log.id : null);
  const goHomeAfterFocusRef = useRef(false);
  useEffect(() => {
    if (undoState?.kind !== 'add' || undoState.log.id === savedLogIdRef.current) return;
    savedLogIdRef.current = undoState.log.id;
    if (isFocused) router.dismissTo('/');
    else goHomeAfterFocusRef.current = true;
  }, [undoState, isFocused, router]);
  useEffect(() => {
    if (isFocused && goHomeAfterFocusRef.current) {
      goHomeAfterFocusRef.current = false;
      router.dismissTo('/');
    }
  }, [isFocused, router]);

  const openFood = (food: { id: string }) =>
    router.push({ pathname: '/my-food-log', params: { id: food.id, source: 'list' } });

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: t.spacing['5'] }}
      testID="my-foods-screen"
    >
      {foods.length === 0 ? (
        <Body tone="secondary" style={{ textAlign: 'center', paddingVertical: t.spacing['8'] }} testID="my-foods-empty">
          {tr('myFoods.empty')}
        </Body>
      ) : (
        <Card variant="raised" style={styles.listCard}>
          {foods.map((food, index) => (
            // 行 (押せる領域) と「+」は兄弟にする。Pressable の中に Pressable を入れ子にしない (Web で button の入れ子になる)
            <View
              key={food.id}
              style={[
                styles.row,
                { borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: t.colors.border.subtle },
              ]}
            >
              <Pressable
                onPress={() => openFood(food)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rowMain, pressed ? { opacity: 0.6 } : null]}
                testID={`my-food-row-${food.id}`}
              >
                <Label numberOfLines={1}>{food.name}</Label>
                <Body size="sm" tone="secondary">{formatMyFoodSummary(food)}</Body>
              </Pressable>
              {/* 押すと倍率の記録の画面が開く = 「追加」の入口だと分かるように */}
              <IconButton
                icon="add"
                variant="outlined"
                size="sm"
                tone="action"
                onPress={() => openFood(food)}
                accessibilityLabel={tr('myFoods.addA11y', { name: food.name })}
              />
            </View>
          ))}
        </Card>
      )}

      {foods.length > 0 ? (
        <View style={{ marginTop: t.spacing['6'], gap: t.spacing['2'], alignItems: 'flex-start' }}>
          <Body size="sm" tone="secondary">{tr('myFoods.shareNote')}</Body>
          <Button
            label={tr('myFoods.share')}
            variant="secondary"
            size="sm"
            onPress={handleShareNames}
            testID="my-foods-share"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // SettingsListCard と同じ: 行自身の paddingVertical で高さを決める (Card の inline padding に負けないよう通常のオブジェクト)
  listCard: { paddingVertical: 4, paddingHorizontal: 16, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  rowMain: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
