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

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/design-system';
import { buildRegistry } from '@/constants/identity';
import { duration as dur, easing as eas } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/hooks/useT';
import { BUCKET_REVEAL_HTML } from './bucket-reveal-html';

// ---------------------------------------------------------------------------
// BucketRevealAnimation — LP「種類→ボタン格納」Canvas アニメーション (WebView)
// animate prop が true のとき ButtonGridIllustration の代わりに表示される。
// LP の Grid→Hold フェーズ (4.0s ループ) を WebView 内 Canvas で再生。
// ---------------------------------------------------------------------------

function BucketRevealAnimation() {
  return (
    <WebView
      source={{ html: BUCKET_REVEAL_HTML }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      bounces={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      overScrollMode="never"
      originWhitelist={['*']}
    />
  );
}

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

export function ButtonGridIllustration({ animate }: { animate?: boolean } = {}) {
  const t = useTheme();
  const tr = useT();
  const GRID_BUTTONS = getGridButtons(tr);
  const { height: screenHeight } = useWindowDimensions();
  if (animate) return <BucketRevealAnimation />;
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

// animate=true 時: 実際の食事ボタンを押す/長押しするアニメーションで操作モデルを説明。
// animate=false (デフォルト): help 画面向けの静的レイアウト (絵文字 + 矢印 + 結果カード)。
export function GestureDemoIllustration({ animate }: { animate?: boolean } = {}) {
  const t = useTheme();
  const tr = useT();
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));

  if (animate) return <AnimatedGestureDemoIllustration />;

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
// AnimatedGestureDemoIllustration — intro Slide 2 向けアニメーション版
//
// 2 行レイアウト:
//   Row 1 (タップ): 🍚ボタン → 指インジケータが出現してタップ → 結果カード
//   Row 2 (長押し): 🥛ボタン → 指インジケータが出てボタン押下 → 拡張リング → 結果カード
//
// 全値 useNativeDriver: true (scale / opacity / translateX のみ)
// ---------------------------------------------------------------------------

function AnimatedGestureDemoIllustration() {
  const t = useTheme();
  const tr = useT();
  const { foodRegion, uiLanguage } = useLocale();
  const { height: screenHeight } = useWindowDimensions();
  const scale = Math.max(0.7, Math.min(1, (screenHeight - 349) / 420));
  const isMounted = useRef(true);

  const staple = useMemo(() => {
    const b = buildRegistry(foodRegion, uiLanguage).buckets.find((x) => x.key === 'staple');
    return { emoji: b?.emoji ?? '🍚', label: b?.label ?? 'ごはんパン麺' };
  }, [foodRegion, uiLanguage]);

  // ── Tap row ──
  const btn1Scale    = useRef(new Animated.Value(1)).current;
  const f1Opacity    = useRef(new Animated.Value(0)).current;
  const f1Scale      = useRef(new Animated.Value(0.5)).current;
  const res1Opacity  = useRef(new Animated.Value(0)).current;
  const res1X        = useRef(new Animated.Value(10)).current;

  // ── Long-press row ──
  const btn2Scale    = useRef(new Animated.Value(1)).current;
  const f2Opacity    = useRef(new Animated.Value(0)).current;
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const res2Opacity  = useRef(new Animated.Value(0)).current;
  const res2X        = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    isMounted.current = true;
    const allVals = [
      btn1Scale, f1Opacity, f1Scale, res1Opacity, res1X,
      btn2Scale, f2Opacity, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity,
      res2Opacity, res2X,
    ];

    const E_IN  = Easing.bezier(...(eas.enter    as [number, number, number, number]));
    const E_OUT = Easing.bezier(...(eas.exit     as [number, number, number, number]));
    const E_STD = Easing.bezier(...(eas.standard as [number, number, number, number]));

    function reset() {
      btn1Scale.setValue(1);   f1Opacity.setValue(0);  f1Scale.setValue(0.5);
      res1Opacity.setValue(0); res1X.setValue(10);
      btn2Scale.setValue(1);   f2Opacity.setValue(0);
      ring1Scale.setValue(1);  ring1Opacity.setValue(0);
      ring2Scale.setValue(1);  ring2Opacity.setValue(0);
      res2Opacity.setValue(0); res2X.setValue(10);
    }

    function runLoop() {
      if (!isMounted.current) return;
      reset();

      // ① タップフェーズ
      const tapPhase = Animated.sequence([
        // 指が現れる
        Animated.parallel([
          Animated.timing(f1Opacity, { toValue: 0.35, duration: dur.fast, easing: E_IN,  useNativeDriver: true }),
          Animated.timing(f1Scale,   { toValue: 1,    duration: dur.fast, easing: E_IN,  useNativeDriver: true }),
        ]),
        Animated.delay(180),
        // タップ: ボタン押下 + 指消える
        Animated.parallel([
          Animated.timing(btn1Scale, { toValue: 0.88, duration: 80,  easing: E_OUT, useNativeDriver: true }),
          Animated.timing(f1Opacity, { toValue: 0,    duration: 80,  easing: E_OUT, useNativeDriver: true }),
        ]),
        // ボタン戻り(オーバーシュート) + 同時に結果スライドイン
        Animated.parallel([
          Animated.sequence([
            Animated.timing(btn1Scale, { toValue: 1.04, duration: 80,  easing: E_IN,  useNativeDriver: true }),
            Animated.timing(btn1Scale, { toValue: 1.0,  duration: 100, easing: E_STD, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(res1Opacity, { toValue: 1, duration: 260, easing: E_IN, useNativeDriver: true }),
            Animated.timing(res1X,       { toValue: 0, duration: 260, easing: E_IN, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(1400),
        Animated.timing(res1Opacity, { toValue: 0, duration: dur.short, easing: E_OUT, useNativeDriver: true }),
        Animated.delay(350),
      ]);

      // ② 長押しフェーズ
      const lpPhase = Animated.sequence([
        // 指が現れる
        Animated.timing(f2Opacity, { toValue: 0.35, duration: dur.fast, easing: E_IN, useNativeDriver: true }),
        Animated.delay(80),
        // ボタン押下 + 2段リング展開
        Animated.parallel([
          Animated.timing(btn2Scale, { toValue: 0.93, duration: dur.short, easing: E_OUT, useNativeDriver: true }),
          // リング1
          Animated.parallel([
            Animated.timing(ring1Scale,   { toValue: 1.65, duration: dur.xlong,        easing: E_STD, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(ring1Opacity, { toValue: 0.45, duration: 80,               easing: E_IN,  useNativeDriver: true }),
              Animated.timing(ring1Opacity, { toValue: 0,    duration: dur.xlong - 80,   easing: E_OUT, useNativeDriver: true }),
            ]),
          ]),
          // リング2 (250ms 遅延)
          Animated.sequence([
            Animated.delay(250),
            Animated.parallel([
              Animated.timing(ring2Scale,   { toValue: 1.65, duration: dur.xlong,        easing: E_STD, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(ring2Opacity, { toValue: 0.45, duration: 80,               easing: E_IN,  useNativeDriver: true }),
                Animated.timing(ring2Opacity, { toValue: 0,    duration: dur.xlong - 80,   easing: E_OUT, useNativeDriver: true }),
              ]),
            ]),
          ]),
        ]),
        Animated.delay(200),
        // 離す: ボタン戻り + 指消える + 結果スライドイン
        Animated.parallel([
          Animated.sequence([
            Animated.timing(btn2Scale, { toValue: 1.03, duration: 80,  easing: E_IN,  useNativeDriver: true }),
            Animated.timing(btn2Scale, { toValue: 1.0,  duration: 100, easing: E_STD, useNativeDriver: true }),
          ]),
          Animated.timing(f2Opacity,   { toValue: 0, duration: dur.fast, easing: E_OUT, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(res2Opacity, { toValue: 1, duration: 260, easing: E_IN, useNativeDriver: true }),
            Animated.timing(res2X,       { toValue: 0, duration: 260, easing: E_IN, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(1400),
        Animated.timing(res2Opacity, { toValue: 0, duration: dur.short, easing: E_OUT, useNativeDriver: true }),
        Animated.delay(350),
      ]);

      Animated.sequence([tapPhase, lpPhase]).start(({ finished }) => {
        if (finished && isMounted.current) runLoop();
      });
    }

    runLoop();
    return () => {
      isMounted.current = false;
      allVals.forEach((v) => v.stopAnimation());
    };
  }, []);

  const rc = t.colors.action.primary.default;
  const fc = t.colors.content.primary;

  return (
    <View style={[gestureStyles.wrap, { transform: [{ scale }] }]}>
      {/* Row 1: タップ */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.btnWithLabel}>
          <View style={gestureStyles.btnContainer}>
            <Animated.View style={[
              gestureStyles.demoBtn,
              { backgroundColor: t.colors.surface.raised, ...t.elevation.xs },
              { transform: [{ scale: btn1Scale }] },
            ]}>
              <View style={gestureStyles.iconContainer}>
                <Text style={gestureStyles.btnEmoji}>{staple.emoji}</Text>
              </View>
              <Text style={[gestureStyles.btnLabel, { color: t.colors.content.primary }]} numberOfLines={1}>
                {staple.label}
              </Text>
            </Animated.View>
            <Animated.View style={[
              gestureStyles.finger,
              { backgroundColor: fc, opacity: f1Opacity, transform: [{ scale: f1Scale }] },
            ]} />
          </View>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>
            {tr('onboarding.illustrations.gesture.tap')}
          </Text>
        </View>

        <Text style={[gestureStyles.arrow, { color: t.colors.action.text.default }]}>→</Text>

        <Animated.View style={[
          gestureStyles.result,
          { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default },
          { opacity: res1Opacity, transform: [{ translateX: res1X }] },
        ]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>
            {tr('onboarding.illustrations.gesture.riceExample')}
          </Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>
            {tr('onboarding.illustrations.gesture.quickLogHint')}
          </Text>
        </Animated.View>
      </View>

      {/* Row 2: 長押し */}
      <View style={gestureStyles.row}>
        <View style={gestureStyles.btnWithLabel}>
          <View style={gestureStyles.btnContainer}>
            {/* 拡張リング (ボタンより奥に描画) */}
            <Animated.View style={[
              gestureStyles.ring,
              { borderColor: rc, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
            ]} />
            <Animated.View style={[
              gestureStyles.ring,
              { borderColor: rc, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] },
            ]} />
            <Animated.View style={[
              gestureStyles.demoBtn,
              { backgroundColor: t.colors.surface.raised, ...t.elevation.xs },
              { transform: [{ scale: btn2Scale }] },
            ]}>
              <View style={gestureStyles.iconContainer}>
                <Text style={gestureStyles.btnEmoji}>{staple.emoji}</Text>
              </View>
              <Text style={[gestureStyles.btnLabel, { color: t.colors.content.primary }]} numberOfLines={1}>
                {staple.label}
              </Text>
            </Animated.View>
            <Animated.View style={[
              gestureStyles.finger,
              { backgroundColor: fc, opacity: f2Opacity },
            ]} />
          </View>
          <Text style={[gestureStyles.gestureLabel, { color: t.colors.content.secondary }]}>
            {tr('onboarding.illustrations.gesture.longPress')}
          </Text>
        </View>

        <Text style={[gestureStyles.arrow, { color: t.colors.action.text.default }]}>→</Text>

        <Animated.View style={[
          gestureStyles.result,
          { backgroundColor: t.colors.surface.raised, borderColor: t.colors.border.default },
          { opacity: res2Opacity, transform: [{ translateX: res2X }] },
        ]}>
          <Text style={[gestureStyles.resultTitle, { color: t.colors.content.primary }]}>
            {tr('onboarding.illustrations.gesture.chooseTypeAmount')}
          </Text>
          <Text style={[gestureStyles.resultSub, { color: t.colors.content.secondary }]}>
            {tr('onboarding.illustrations.gesture.breadNoodleExample')}
          </Text>
        </Animated.View>
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
  // ── アニメーション版専用 ──
  // ボタン + ジェスチャーラベルの縦積みコンテナ
  btnWithLabel: {
    width: 90,
    alignItems: 'center',
    gap: 6,
  },
  // リング・ボタン・指インジケータを重ねる 90×56 の固定枠 (overflow: visible でリングが外にはみ出せる)
  btnContainer: {
    width: 90,
    height: 56,
  },
  // 食事ボタン本体 — QuickLogButton と同じ構造: 影あり・ボーダーなし・borderRadius 15
  demoBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 90,
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 絵文字を囲む円形コンテナ (QuickLogButton の iconContainer と同一)
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  // 長押しリング — 56×56 の円を中央に配置し scale で外側に拡張
  // 90px 幅ボタンの中央: left = (90-56)/2 = 17
  ring: {
    position: 'absolute',
    top: 0,
    left: 17,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  // タッチインジケータ — ボタン中央: left=(90-30)/2=30, top=(56-30)/2=13
  finger: {
    position: 'absolute',
    top: 13,
    left: 30,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  // QuickLogButton の iconEmoji / label と同値
  btnEmoji: { fontSize: 19, lineHeight: 21 },
  btnLabel: { fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  // ── 静的版専用 (help.tsx 向け) ──
  action: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  gesture: { fontSize: 36 },
  // ── 共通 ──
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
