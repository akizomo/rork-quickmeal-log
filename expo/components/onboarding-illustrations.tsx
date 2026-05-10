/**
 * Onboarding illustrations — intro 画面 (`app/intro.tsx`) と help 画面 (`app/help.tsx`)
 * の両方で再利用される操作概念ビジュアル。
 *
 * - ButtonGridIllustration: 9個の食事ボタンを 3×3 でミニチュア表示。1個 highlight で
 *   "1ボタンが食事カテゴリを表す" 直感を視覚化 (intro Slide 1 / help §概念導入用)
 *
 * - GestureDemoIllustration: タップ / 長押し の2行を絵文字+矢印+結果カードで提示
 *   (intro Slide 2 / help §1 操作の基本)
 *
 * 両方とも `useWindowDimensions` で screen height に応じて 0.7-1.0 の範囲でscale。
 * intro (slide 高制約あり) / help (scrollable) どちらでも自然なサイズで表示される。
 */

import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { palette } from '@/constants/theme';

// ---------------------------------------------------------------------------
// ButtonGridIllustration (Slide 1: コンセプト)
// ---------------------------------------------------------------------------

type GridButton = { e: string; l: string; highlight?: boolean };
const GRID_BUTTONS: GridButton[] = [
  { e: '🍚', l: '主食' },
  { e: '🐓', l: '低脂P' },
  { e: '🥚', l: '卵' },
  { e: '🥩', l: '脂P' },
  { e: '🥛', l: '乳大豆', highlight: true },
  { e: '🥦', l: '野菜' },
  { e: '🍎', l: '果物' },
  { e: '🧈', l: '油調味' },
  { e: '🍩', l: 'おやつ' },
];

export function ButtonGridIllustration() {
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[gridStyles.wrap, { transform: [{ scale }] }]}>
      <View style={gridStyles.grid}>
        {GRID_BUTTONS.map((btn, i) => (
          <View
            key={i}
            style={[gridStyles.btn, btn.highlight ? gridStyles.btnHighlight : null]}
          >
            <Text style={gridStyles.btnEmoji}>{btn.e}</Text>
            <Text style={gridStyles.btnLabel}>{btn.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GestureDemoIllustration (Slide 2: 操作モデル / help §1 操作の基本)
// ---------------------------------------------------------------------------

export function GestureDemoIllustration() {
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[gestureStyles.wrap, { transform: [{ scale }] }]}>
      {/* タップデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>👆</Text>
          <Text style={gestureStyles.gestureLabel}>タップ</Text>
        </View>
        <Text style={gestureStyles.arrow}>→</Text>
        <View style={gestureStyles.result}>
          <Text style={gestureStyles.resultTitle}>ご飯1杯 234 kcal</Text>
          <Text style={gestureStyles.resultSub}>代表値で即記録</Text>
        </View>
      </View>
      {/* 長押しデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>✋</Text>
          <Text style={gestureStyles.gestureLabel}>長押し</Text>
        </View>
        <Text style={gestureStyles.arrow}>→</Text>
        <View style={gestureStyles.result}>
          <Text style={gestureStyles.resultTitle}>種類・量を選択</Text>
          <Text style={gestureStyles.resultSub}>パン / 麺 / 大盛 …</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const gridStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 14,
    justifyContent: 'center',
  },
  btn: {
    width: 70,
    height: 70,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnHighlight: {
    borderColor: palette.sageDeep,
    backgroundColor: '#F0F4EF',
    transform: [{ scale: 1.06 }],
  },
  btnEmoji: { fontSize: 28 },
  btnLabel: { fontSize: 10, color: palette.textMuted },
});

const gestureStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 290,
  },
  action: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  gesture: { fontSize: 36 },
  gestureLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.textMuted,
    letterSpacing: 0.5,
  },
  arrow: {
    fontSize: 22,
    color: palette.sageDeep,
  },
  result: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
  },
  resultSub: {
    fontSize: 11,
    color: palette.textMuted,
  },
});
