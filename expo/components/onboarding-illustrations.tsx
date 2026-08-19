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
 * - FrequentTabIllustration: ⭐️タブ + 頻度ランク付きボタン3個で「使うほど上位に来る」を
 *   視覚化 (help §もっと、あなたに合わせて)
 *
 * 3つとも `useWindowDimensions` で screen height に応じて 0.7-1.0 の範囲でscale。
 * intro (slide 高制約あり) / help (scrollable) どちらでも自然なサイズで表示される。
 */

import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/design-system';
import { colors } from '@/design-system/tokens/primitives/colors';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';

// ---------------------------------------------------------------------------
// ButtonGridIllustration (Slide 1: コンセプト)
// ---------------------------------------------------------------------------

type GridButton = { e: string; l: string; highlight?: boolean };

function getGridButtons(tr: ReturnType<typeof useT>): GridButton[] {
  return [
    { e: '🍚', l: tr('onboarding.illustrations.buckets.staple') },
    { e: '🐓', l: tr('onboarding.illustrations.buckets.leanProtein') },
    { e: '🥚', l: tr('onboarding.illustrations.buckets.egg') },
    { e: '🥩', l: tr('onboarding.illustrations.buckets.fattyProtein') },
    { e: '🥛', l: tr('onboarding.illustrations.buckets.dairySoy'), highlight: true },
    { e: '🥦', l: tr('onboarding.illustrations.buckets.vegetable') },
    { e: '🍎', l: tr('onboarding.illustrations.buckets.fruit') },
    { e: '🧈', l: tr('onboarding.illustrations.buckets.oilSeasoning') },
    { e: '🍩', l: tr('onboarding.illustrations.buckets.snack') },
  ];
}

export function ButtonGridIllustration() {
  const t = useTheme();
  const tr = useT();
  const GRID_BUTTONS = getGridButtons(tr);
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
              btn.highlight ? [gridStyles.btnHighlight, { backgroundColor: t.colors.action.primary.container, borderColor: t.colors.action.primary.default }] : null,
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
  const tr = useT();
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[gestureStyles.wrap, { transform: [{ scale }] }]}>
      {/* タップデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>👆</Text>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>{tr('onboarding.illustrations.gesture.tap')}</Text>
        </View>
        <Text style={[gestureStyles.arrow, { color: t.colors.action.text.default }]}>→</Text>
        <View style={[gestureStyles.result, { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default }]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>{tr('onboarding.illustrations.gesture.riceExample')}</Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>{tr('onboarding.illustrations.gesture.quickLogHint')}</Text>
        </View>
      </View>
      {/* 長押しデモ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.action}>
          <Text style={gestureStyles.gesture}>✋</Text>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>{tr('onboarding.illustrations.gesture.longPress')}</Text>
        </View>
        <Text style={[gestureStyles.arrow, { color: t.colors.action.text.default }]}>→</Text>
        <View style={[gestureStyles.result, { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default }]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>{tr('onboarding.illustrations.gesture.chooseTypeAmount')}</Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>{tr('onboarding.illustrations.gesture.breadNoodleExample')}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FrequentTabIllustration (help §もっと、あなたに合わせて)
// ---------------------------------------------------------------------------

type RankButton = { e: string; l: string };

function getRankButtons(tr: ReturnType<typeof useT>): RankButton[] {
  return [
    { e: '🍚', l: tr('onboarding.illustrations.frequentTab.rice') },
    { e: '🍜', l: tr('onboarding.illustrations.frequentTab.ramen') },
    { e: '🥗', l: tr('onboarding.illustrations.frequentTab.salad') },
  ];
}

// 実際の segmentOptions (QuickLogSection.tsx) と同じ並び・ラベル。
// ⭐️ タブは末尾に追加され、ラベルは絵文字のみ。
const ACTIVE_TAB_INDEX = 2;

export function FrequentTabIllustration() {
  const t = useTheme();
  const tr = useT();
  const RANK_BUTTONS = getRankButtons(tr);
  const TAB_SEGMENTS = tr('onboarding.illustrations.tabs', { returnObjects: true }) as string[];
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  return (
    <View style={[frequentStyles.wrap, { transform: [{ scale }] }]}>
      {/* SegmentedControl.tsx のデフォルト配色 (トラック=surface.sunken / ピル=surface.raised) を再現 */}
      <View style={[frequentStyles.tabTrack, { backgroundColor: t.colors.surface.sunken }]}>
        {TAB_SEGMENTS.map((label, i) => (
          <View key={label} style={frequentStyles.tabSegment}>
            {i === ACTIVE_TAB_INDEX && (
              <View style={[frequentStyles.tabPill, { backgroundColor: t.colors.surface.raised }]} />
            )}
            <Text
              style={[
                frequentStyles.tabSegmentText,
                {
                  color: i === ACTIVE_TAB_INDEX ? t.colors.action.text.default : t.colors.content.secondary,
                  fontWeight: i === ACTIVE_TAB_INDEX ? '700' : '600',
                },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View style={frequentStyles.grid}>
        {RANK_BUTTONS.map((btn, i) => (
          <View
            key={i}
            style={[frequentStyles.btn, { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default }]}
          >
            <View style={[frequentStyles.rankBadge, { backgroundColor: t.colors.action.primary.default }]}>
              <Text style={[frequentStyles.rankBadgeText, { color: t.colors.content.onAction }]}>{i + 1}</Text>
            </View>
            <Text style={frequentStyles.btnEmoji}>{btn.e}</Text>
            <Text style={[frequentStyles.btnLabel, { color: t.colors.content.secondary }]}>{btn.l}</Text>
          </View>
        ))}
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

const frequentStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  tabTrack: {
    flexDirection: 'row',
    width: 220,
    height: 36,
    borderRadius: radius.full,
    padding: 3,
  },
  tabSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  tabSegmentText: {
    fontSize: fs.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
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
  rankBadge: {
    position: 'absolute',
    top: -7,
    left: -7,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: fs.xs,
    fontWeight: '700',
  },
  btnEmoji: { fontSize: 28 },
  btnLabel: { fontSize: fs.xs },
});
