/**
 * スパイク B — 背の高いシート: `sheetAllowedDetents: [0.5, 1]`。IdentityLogSheet 相当。
 * 確認: SDK 54 で flex: 1 (本文スクロール + 固定フッター) が組めるか / detent 間のドラッグ /
 *       本文スクロールとシートのドラッグの競合 / 下部 TextInput とキーボード /
 *       シートからシートを開く (A を上に積む) / 戻ったときに状態が残るか。
 * 中身のレイアウトが崩れる場合は「flex を使わず高さを明示する」案 (下の FIXED_LAYOUT) も試す。
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View, useWindowDimensions } from 'react-native';

import { Body, Button, Chip, Heading, Label, useTheme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { SpikeToast, useSpikeToast } from './_toast';

// 実験: 見出しを外して ScrollView を先頭の子にしたとき、本文のずれが消えるか
const SHOW_HEADER = true;

const CHIPS = ['ごはん', 'おにぎり', '食パン', 'うどん', 'パスタ', 'オートミール', 'じゃがいも', 'さつまいも', '中華麺', '餅'];

export default function SpikeTallSheet() {
  const router = useRouter();
  const t = useTheme();
  const { height } = useWindowDimensions();
  const [fixedLayout, setFixedLayout] = useState(false);
  const [selected, setSelected] = useState(0);
  const [memo, setMemo] = useState('');
  const toast = useSpikeToast();
  // 実験: シート提示直後のテキスト計測ずれが「初回計測のタイミング」由来かを見るため、500ms 後に本文を作り直す
  const [remountKey, setRemountKey] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setRemountKey(1), 500);
    return () => clearTimeout(id);
  }, []);

  // FIXED_LAYOUT: flex を使わず、画面高から本文の高さを決め打ちする代替案
  const body = (
    <ScrollView
      key={remountKey}
      style={[fixedLayout ? { height: height * 0.62 } : { flex: 1 }, { backgroundColor: 'rgba(0,0,255,0.08)' }]}
      onLayout={(e) => console.log('[spike] scroll layout', JSON.stringify(e.nativeEvent.layout))}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['5'] }}
      keyboardShouldPersistTaps="handled"
      // シート内の ScrollView に iOS が自動で inset 調整をかけ、本文が見出しの下へ潜り込むのを防ぐ
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      // 最大 detent ではシートが持ち上がらないため、キーボード分の inset を ScrollView 側に入れて入力欄までスクロールさせる
      automaticallyAdjustKeyboardInsets
      onScroll={(e) => console.log('[spike] offset', e.nativeEvent.contentOffset.y, 'inset', JSON.stringify(e.nativeEvent.contentInset))}
      scrollEventThrottle={200}
    >
      <Body size="sm" tone="secondary" onLayout={(e) => console.log('[spike] body layout', JSON.stringify(e.nativeEvent.layout))}>
        レイアウト: {fixedLayout ? '高さ明示' : 'flex: 1'}。下のフッターが常に画面下に貼り付き、本文だけがスクロールすれば OK。
      </Body>
      {[0, 1, 2].map((sec) => (
        <View key={sec} style={{ gap: t.spacing['2'] }}>
          <Label size="sm">種類 {sec + 1}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
            {CHIPS.map((c, i) => (
              <Chip key={c} label={c} selected={selected === sec * 100 + i} onPress={() => setSelected(sec * 100 + i)} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ gap: t.spacing['2'] }}>
        <Label size="sm">メモ (一番下の入力欄 — キーボードに隠れないか)</Label>
        <View style={{ backgroundColor: t.colors.surface.sunken, borderRadius: radius.md, paddingHorizontal: t.spacing['4'] }}>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="入力してみる"
            placeholderTextColor={t.colors.content.tertiary}
            style={{ paddingVertical: t.spacing['3'], fontSize: t.typography.fontSize.md, color: t.colors.content.primary }}
          />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ ...(fixedLayout ? { height: height - 80 } : { flex: 1 }), backgroundColor: t.colors.surface.default }}>
      {SHOW_HEADER ? <View onLayout={(e) => console.log('[spike] header layout', JSON.stringify(e.nativeEvent.layout))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing['5'], paddingTop: t.spacing['5'], backgroundColor: 'rgba(255,0,0,0.15)' }}>
        <Heading size="lg">ごはんパン麺 (spike)</Heading>
        <Button label={fixedLayout ? 'flex に戻す' : '高さ明示に切替'} size="sm" variant="ghost" onPress={() => setFixedLayout((v) => !v)} />
      </View> : null}
      {body}
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing['3'],
          paddingHorizontal: t.spacing['5'],
          paddingTop: t.spacing['3'],
          paddingBottom: t.spacing['8'],
          borderTopWidth: 1,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        <Button label="シートAを積む" variant="ghost" onPress={() => router.push('/spike/small-sheet')} style={{ flex: 1 }} />
        <Button label="記録する" onPress={() => { toast.show('記録しました'); setTimeout(() => router.back(), 600); }} style={{ flex: 1 }} />
      </View>
      <SpikeToast message={toast.message} />
    </View>
  );
}
