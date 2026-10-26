/**
 * My食品ページ — 倉庫 (PRD §6.5.4)。`/my-foods`
 *
 * 全件を「最近使った順」の単純なリストで出す。並べ替え・スワイプ・編集モードは持たない
 * (棚の役割は⭐️タブの下段が担う)。行のタップ = 倍率の記録シート。
 * 入口は検索ページの「My食品 N件 ›」と設定。0件でも開け、使い方を一言添える。
 */
import { useIsFocused, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Body, Card, Icon, Label, useTheme } from '@/design-system';
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
            <Pressable
              key={food.id}
              onPress={() => router.push({ pathname: '/my-food-log', params: { id: food.id, source: 'list' } })}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: t.colors.border.subtle },
                pressed ? { opacity: 0.6 } : null,
              ]}
              testID={`my-food-row-${food.id}`}
            >
              <View style={{ flex: 1 }}>
                <Label numberOfLines={1}>{food.name}</Label>
                <Body size="sm" tone="secondary">{formatMyFoodSummary(food, tr)}</Body>
              </View>
              <Icon name="chevronRight" size={16} color={t.colors.content.tertiary} />
            </Pressable>
          ))}
        </Card>
      )}
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
    paddingVertical: 12,
    minHeight: 56,
  },
});
