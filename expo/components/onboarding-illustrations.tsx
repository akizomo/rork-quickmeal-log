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

import { useTheme } from '@/design-system';
import { colors } from '@/design-system/tokens/primitives/colors';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';

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
  const t = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[gridStyles.wrap, { transform: [{ scale }] }]}>
      <View style={gridStyles.grid}>
        {GRID_BUTTONS.map((btn, i) => (
          <View
            key={i}
            style={[
              gridStyles.btn,
              { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default },
              btn.highlight ? [gridStyles.btnHighlight, { borderColor: t.colors.action.primary.default }] : null,
            ]}
          >
            <Text style={gridStyles.btnEmoji}>{btn.e}</Text>
            <Text style={[gridStyles.btnLabel, { color: t.colors.content.secondary }]}>{btn.l}</Text>
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
  const t = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[gestureStyles.wrap, { transform: [{ scale }] }]}>
      {/* タップデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>👆</Text>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>タップ</Text>
        </View>
        <Text style={[gestureStyles.arrow, { color: t.colors.action.primary.default }]}>→</Text>
        <View style={[gestureStyles.result, { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default }]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>ご飯1杯 234 kcal</Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>代表値で即記録</Text>
        </View>
      </View>
      {/* 長押しデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>✋</Text>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>長押し</Text>
        </View>
        <Text style={[gestureStyles.arrow, { color: t.colors.action.primary.default }]}>→</Text>
        <View style={[gestureStyles.result, { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default }]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>種類・量を選択</Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>パン / 麺 / 大盛 …</Text>
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
    width: 3 * 70 + 2 * 16, // btn幅70 × 3列 + gap16 × 2 = 242px (3列で確実に折り返すための最小幅)
    gap: 16,
    justifyContent: 'center',
  },
  btn: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnHighlight: {
    backgroundColor: colors.sage[50],
    transform: [{ scale: 1.06 }],
  },
  btnEmoji: { fontSize: 28 },
  btnLabel: { fontSize: fs.xs },
});

const gestureStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 20,
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
    fontSize: fs.xs,
    fontWeight: '600',
    letterSpacing: ls.wider,
  },
  arrow: {
    fontSize: 22,
  },
  result: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  resultTitle: {
    fontSize: fs.sm,
    fontWeight: '600',
  },
  resultSub: {
    fontSize: fs.xs,
  },
});
