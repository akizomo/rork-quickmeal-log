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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
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
              { backgroundColor: t.colors.surface.raised },
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
          { backgroundColor: t.colors.surface.raised },
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
          { backgroundColor: t.colors.surface.raised },
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
// IntroProgressIllustration (Slide 3: 進捗ダッシュボード)
// ---------------------------------------------------------------------------
//
// 2 カードのアニメーションループ:
//   Card A: ホーム画面 StatusCard 風 (カロリーリング + PFC ミニバー)
//   Card B: 体重スパークライン
//
// animate=true  → 入場 → フィル → 退場 の ~5s ループ
// animate=false → 静止最終フレーム

const RING_SIZE   = 110;
const RING_STROKE = 12;
const RING_R      = (RING_SIZE - RING_STROKE) / 2; // 49
const RING_CIRC   = 2 * Math.PI * RING_R;          // ≈ 307.9
const TARGET_FILL = 0.68;                          // 1438 / 2070
const SPARK_LEN   = 226;

function AnimatedProgressIllustration({ animate = false }: { animate?: boolean }) {
  const t = useTheme();
  const tr = useT();
  const { height: screenHeight } = useWindowDimensions();
  const isMounted = useRef(true);

  // native driver: カード入退場
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1Y       = useRef(new Animated.Value(12)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2Y       = useRef(new Animated.Value(12)).current;

  // JS driver: SVG (ringAnim/sparkAnim) + Animated.View width (PFC)
  const ringAnim  = useRef(new Animated.Value(0)).current;
  const barPAnim  = useRef(new Animated.Value(0)).current;
  const barFAnim  = useRef(new Animated.Value(0)).current;
  const barCAnim  = useRef(new Animated.Value(0)).current;
  const sparkAnim = useRef(new Animated.Value(0)).current;

  // SVG プロパティはリスナー経由で state に写す (CalorieOverflowRing と同方式)
  const [ringFill,  setRingFill]  = useState(animate ? 0 : 1);
  const [sparkFill, setSparkFill] = useState(animate ? 0 : 1);

  const barPWidth = barPAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '62%'] });
  const barFWidth = barFAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '59%'] });
  const barCWidth = barCAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '67%'] });

  const ringOffset  = RING_CIRC * (1 - ringFill  * TARGET_FILL);
  const sparkOffset = SPARK_LEN * (1 - sparkFill);

  const scale = Math.max(0.6, Math.min(1, (screenHeight - 349) / 380));
  const axisLabels: string[] = tr('intro.progress.axis', { returnObjects: true }) ?? ['', '', ''];

  useEffect(() => {
    isMounted.current = true;

    const ridRing  = ringAnim.addListener( ({ value }) => { if (isMounted.current) setRingFill(value);  });
    const ridSpark = sparkAnim.addListener(({ value }) => { if (isMounted.current) setSparkFill(value); });

    if (!animate) {
      card1Opacity.setValue(1); card1Y.setValue(0);
      card2Opacity.setValue(1); card2Y.setValue(0);
      ringAnim.setValue(1);
      barPAnim.setValue(1); barFAnim.setValue(1); barCAnim.setValue(1);
      sparkAnim.setValue(1);
      return () => {
        isMounted.current = false;
        ringAnim.removeListener(ridRing);
        sparkAnim.removeListener(ridSpark);
      };
    }

    const E_IN  = Easing.bezier(...(eas.enter as [number, number, number, number]));
    const E_OUT = Easing.bezier(...(eas.exit  as [number, number, number, number]));

    function reset() {
      card1Opacity.setValue(0); card1Y.setValue(12);
      card2Opacity.setValue(0); card2Y.setValue(12);
      ringAnim.setValue(0);
      barPAnim.setValue(0); barFAnim.setValue(0); barCAnim.setValue(0);
      sparkAnim.setValue(0);
    }

    function runLoop() {
      if (!isMounted.current) return;
      reset();
      Animated.sequence([
        Animated.delay(300),
        // Card A 入場 + カロリーリング塗り
        Animated.parallel([
          Animated.timing(card1Opacity, { toValue: 1, duration: dur.long, easing: E_IN, useNativeDriver: true }),
          Animated.timing(card1Y,       { toValue: 0, duration: dur.long, easing: E_IN, useNativeDriver: true }),
          Animated.timing(ringAnim,     { toValue: 1, duration: dur.long, easing: E_IN, useNativeDriver: false }),
        ]),
        // PFC バー スタッガー
        Animated.stagger(120, [
          Animated.timing(barPAnim, { toValue: 1, duration: 350, easing: E_IN, useNativeDriver: false }),
          Animated.timing(barFAnim, { toValue: 1, duration: 350, easing: E_IN, useNativeDriver: false }),
          Animated.timing(barCAnim, { toValue: 1, duration: 350, easing: E_IN, useNativeDriver: false }),
        ]),
        Animated.delay(200),
        // Card B 入場 + スパークライン描画
        Animated.parallel([
          Animated.timing(card2Opacity, { toValue: 1, duration: dur.long, easing: E_IN, useNativeDriver: true }),
          Animated.timing(card2Y,       { toValue: 0, duration: dur.long, easing: E_IN, useNativeDriver: true }),
          Animated.timing(sparkAnim,    { toValue: 1, duration: 600,      easing: E_IN, useNativeDriver: false }),
        ]),
        Animated.delay(2200),
        // 退場
        Animated.parallel([
          Animated.timing(card1Opacity, { toValue: 0, duration: dur.short, easing: E_OUT, useNativeDriver: true }),
          Animated.timing(card2Opacity, { toValue: 0, duration: dur.short, easing: E_OUT, useNativeDriver: true }),
        ]),
        Animated.delay(300),
      ]).start(({ finished }) => { if (isMounted.current && finished) runLoop(); });
    }

    runLoop();
    return () => {
      isMounted.current = false;
      ringAnim.removeListener(ridRing);
      sparkAnim.removeListener(ridSpark);
    };
  }, [animate]);

  return (
    <View style={[progressStyles.wrap, { transform: [{ scale }] }]}>
      {/* Card A: ホーム StatusCard 風 (カロリーリング + PFC ミニバー) */}
      <Animated.View style={[
        progressStyles.card,
        { backgroundColor: t.colors.surface.raised },
        { opacity: card1Opacity, transform: [{ translateY: card1Y }] },
      ]}>
        {/* 3カラムリング行 (StatusCard.ringRow 相当) */}
        <View style={progressStyles.ringRow}>
          <View style={progressStyles.sideCol}>
            <Text style={[progressStyles.sideLabel, { color: t.colors.content.secondary }]}>{tr('statusCard.meals')}</Text>
            <Text style={[progressStyles.sideValue, { color: t.colors.content.primary }]}>1,438</Text>
            <Text style={[progressStyles.sideUnit,  { color: t.colors.content.secondary }]}>kcal</Text>
          </View>
          <View style={progressStyles.ringBox}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                stroke={t.colors.nutrition.calorie.track}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                stroke={t.colors.nutrition.calorie.within.graphic}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                strokeDashoffset={ringOffset}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={progressStyles.ringCenter} pointerEvents="none">
              <Text style={[progressStyles.ringLabel, { color: t.colors.content.secondary }]}>{tr('calorieRing.remaining')}</Text>
              <Text style={[progressStyles.ringValue, { color: t.colors.content.primary }]}>632</Text>
              <Text style={[progressStyles.ringUnit,  { color: t.colors.content.secondary }]}>/ 2,070</Text>
            </View>
          </View>
          <View style={progressStyles.sideCol}>
            <Text style={[progressStyles.sideLabel, { color: t.colors.content.secondary }]}>{tr('statusCard.burned')}</Text>
            <Text style={[progressStyles.sideValue, { color: t.colors.content.primary }]}>280</Text>
            <Text style={[progressStyles.sideUnit,  { color: t.colors.content.secondary }]}>kcal</Text>
          </View>
        </View>
        {/* PFC ミニバー (MiniProgressBar + StatusCard.pfcMiniRow 相当、3列縦積み) */}
        <View style={progressStyles.pfcRow}>
          <View style={progressStyles.pfcCol}>
            <Text style={[progressStyles.pfcColLabel, { color: t.colors.content.secondary }]}>
              <Text style={[progressStyles.pfcColLetter, { color: t.colors.nutrition.protein.text }]}>P</Text>
              {` ${tr('common.macros.protein')}`}
            </Text>
            <View style={[progressStyles.pfcTrack, { backgroundColor: t.colors.nutrition.protein.background }]}>
              <Animated.View style={[progressStyles.pfcFill, { width: barPWidth, backgroundColor: t.colors.nutrition.protein.graphic }]} />
            </View>
            <Text style={[progressStyles.pfcValue, { color: t.colors.content.primary }]}>
              {'62'}<Text style={{ color: t.colors.content.secondary }}>{' / 100 g'}</Text>
            </Text>
          </View>
          <View style={progressStyles.pfcCol}>
            <Text style={[progressStyles.pfcColLabel, { color: t.colors.content.secondary }]}>
              <Text style={[progressStyles.pfcColLetter, { color: t.colors.nutrition.fat.text }]}>F</Text>
              {` ${tr('common.macros.fat')}`}
            </Text>
            <View style={[progressStyles.pfcTrack, { backgroundColor: t.colors.nutrition.fat.background }]}>
              <Animated.View style={[progressStyles.pfcFill, { width: barFWidth, backgroundColor: t.colors.nutrition.fat.graphic }]} />
            </View>
            <Text style={[progressStyles.pfcValue, { color: t.colors.content.primary }]}>
              {'41'}<Text style={{ color: t.colors.content.secondary }}>{' / 70 g'}</Text>
            </Text>
          </View>
          <View style={progressStyles.pfcCol}>
            <Text style={[progressStyles.pfcColLabel, { color: t.colors.content.secondary }]}>
              <Text style={[progressStyles.pfcColLetter, { color: t.colors.nutrition.carbs.text }]}>C</Text>
              {` ${tr('common.macros.carbs')}`}
            </Text>
            <View style={[progressStyles.pfcTrack, { backgroundColor: t.colors.nutrition.carbs.background }]}>
              <Animated.View style={[progressStyles.pfcFill, { width: barCWidth, backgroundColor: t.colors.nutrition.carbs.graphic }]} />
            </View>
            <Text style={[progressStyles.pfcValue, { color: t.colors.content.primary }]}>
              {'200'}<Text style={{ color: t.colors.content.secondary }}>{' / 300 g'}</Text>
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Card B: 体重スパークライン */}
      <Animated.View style={[
        progressStyles.card,
        { backgroundColor: t.colors.surface.raised },
        { opacity: card2Opacity, transform: [{ translateY: card2Y }] },
      ]}>
        <View style={progressStyles.sparkHeader}>
          <Text style={[progressStyles.sparkLabel, { color: t.colors.content.secondary }]}>
            {tr('intro.progress.label')}
          </Text>
          <Text style={[progressStyles.sparkDelta, { color: t.colors.nutrition.trend.improve.text }]}>
            {tr('intro.progress.delta')}
          </Text>
        </View>
        <Svg width="100%" height={56} viewBox="0 0 224 56" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="pg_sparkfill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={t.colors.action.primary.default} stopOpacity={0.15} />
              <Stop offset="100%" stopColor={t.colors.action.primary.default} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M0,18 L20,16 L40,22 L60,20 L80,28 L100,30 L120,34 L140,32 L160,40 L180,38 L200,44 L220,46 L220,56 L0,56 Z"
            fill="url(#pg_sparkfill)"
          />
          <Path
            d="M0,18 L20,16 L40,22 L60,20 L80,28 L100,30 L120,34 L140,32 L160,40 L180,38 L200,44 L220,46"
            stroke={t.colors.action.primary.default}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={SPARK_LEN}
            strokeDashoffset={sparkOffset}
          />
          <Circle cx={220} cy={46} r={3.5} fill={t.colors.action.primary.default} opacity={sparkFill >= 0.95 ? 1 : 0} />
        </Svg>
        <View style={progressStyles.sparkAxis}>
          {axisLabels.map((label, i) => (
            <Text key={i} style={[progressStyles.sparkAxisText, { color: t.colors.content.secondary }]}>
              {label}
            </Text>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

export function IntroProgressIllustration({ animate }: { animate?: boolean } = {}) {
  return <AnimatedProgressIllustration animate={animate} />;
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

const progressStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  card: {
    width: 300,
    borderRadius: radius.xl,
    padding: 14,
  },
  // 3カラムリング行 (StatusCard.ringRow 相当)
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sideCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sideLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    letterSpacing: ls.wider,
  },
  sideValue: {
    fontSize: fs.lg,
    fontWeight: '700',
    letterSpacing: ls.tight,
  },
  sideUnit: {
    fontSize: fs.xs,
    fontWeight: '500',
  },
  ringBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    marginBottom: 1,
  },
  ringValue: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    letterSpacing: ls.tighter,
  },
  ringUnit: {
    marginTop: 3,
    fontSize: fs.xs,
    fontWeight: '500',
  },
  // PFC ミニバー 3列 (MiniProgressBar + StatusCard.pfcMiniRow 相当)
  pfcRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pfcCol: {
    flex: 1,
    gap: 4,
  },
  pfcColLabel: {
    fontSize: fs.sm,
    fontWeight: '600',
  },
  pfcColLetter: {
    fontWeight: '700',
  },
  pfcTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  pfcFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  pfcValue: {
    fontSize: fs.sm,
    fontWeight: '600',
  },
  // スパークライン
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sparkLabel: {
    fontSize: fs.sm,
    fontWeight: '600',
  },
  sparkDelta: {
    fontSize: fs.sm,
    fontWeight: '600',
  },
  sparkAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sparkAxisText: {
    fontSize: fs.xs,
  },
});
