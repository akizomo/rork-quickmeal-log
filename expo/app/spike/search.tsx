/**
 * スパイク C — 検索を下層ページにする案。ナビゲーションバーの検索フィールド (`headerSearchBarOptions`,
 * iOS は UISearchController) を使う。
 * 確認: 開いた直後に検索フィールドへフォーカスできるか / キーボード表示中のリストのスクロール /
 *       結果をタップ → シート B が上に出る → 閉じると検索語が残ったまま戻る / 戻るボタン・スワイプで戻る。
 */
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Body, Label, useTheme } from '@/design-system';

const ITEMS = [
  'ごはん', 'おにぎり', 'おかゆ', '食パン', 'クロワッサン', 'オートミール', 'シリアル', '餅・団子', 'じゃがいも', 'さつまいも',
  'うどん', '蕎麦', 'パスタ', 'ラーメン', '鶏むね', 'ささみ', 'サラダチキン', '白身魚', 'えび', '牛赤身',
  '卵', '鶏もも', '豚ばら', 'サーモン', 'ハム', 'ベーコン', '牛乳', 'ヨーグルト', '豆腐', '納豆',
  'サラダ', '味噌汁', 'バナナ', 'りんご', 'みかん', 'チョコ', 'ケーキ', 'アイス', 'ポテチ', '菓子パン',
];

export default function SpikeSearch() {
  const router = useRouter();
  const t = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query ? ITEMS.filter((i) => i.includes(query)) : ITEMS), [query]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '検索 (spike)',
          headerSearchBarOptions: {
            placeholder: '食べたものを検索',
            autoFocus: true,
            hideWhenScrolling: false,
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
          },
        }}
      />
      <FlatList
        style={{ backgroundColor: t.colors.surface.default }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(i) => i}
        ListEmptyComponent={
          <View style={{ padding: t.spacing['5'] }}>
            <Body size="sm" tone="secondary">「{query}」は見つかりませんでした</Body>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push('/spike/tall-sheet')}
            style={({ pressed }) => ({
              paddingHorizontal: t.spacing['5'],
              paddingVertical: t.spacing['4'],
              borderBottomWidth: 1,
              borderBottomColor: t.colors.border.subtle,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Label>{item}</Label>
          </Pressable>
        )}
      />
    </>
  );
}
