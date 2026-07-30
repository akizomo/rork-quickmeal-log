import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Logo } from '@/components/Logo';
import { ButtonGridIllustration, GestureDemoIllustration } from '@/components/onboarding-illustrations';
import { INTRO_VERSION, LEGAL_LINKS } from '@/constants/onboarding';
import { lightTheme, useTheme, type Theme } from '@/design-system';
import { colors } from '@/design-system/tokens/primitives/colors';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';

type SlideMedia =
  | { kind: 'buttonGrid' }
  | { kind: 'gestureDemo' }
  | { kind: 'progress' };

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  /** ヒーロー領域の背景色 ('transparent' で親グラデを透かす) */
  accent: string;
  media: SlideMedia;
}

const SLIDES: Slide[] = [
  {
    key: 's1',
    title: '9ボタンで、8割いける。',
    subtitle: 'ふだんの食事は、タップひとつで残せる。',
    accent: colors.ivory[500], // kinari (warm paper)
    media: { kind: 'buttonGrid' },
  },
  {
    key: 's2',
    title: '急ぎはタップ、余裕は長押し。',
    subtitle: 'ちゃんと記録したい日だけ、もう一歩ふみこめる。',
    accent: colors.sage[100], // sage soft
    media: { kind: 'gestureDemo' },
  },
  {
    key: 's3',
    title: '進みは、ひと目で。',
    subtitle: '目標と今の差が、グラフでそのまま見える。',
    accent: lightTheme.colors.accent.subtle, // ai (indigo)
    media: { kind: 'progress' },
  },
];

// ── Intro 専用 進捗イラスト ───────────────────────────────────
// kcal リング + 体重スパークライン + PFC バー の 3 カード合成。
// intro 以外で再利用する見込みが無いため、ローカル定義。
const ILLUST_COLORS = {
  protein: colors.clay[400], // clay 系
  fat: colors.ivory[500], // kinari
  carb: lightTheme.colors.action.text.default,
} as const;

function IntroProgressIllustration() {
  const t = useTheme();
  const illustStyles = useMemo(() => makeIllustStyles(t), [t]);
  const { height: screenHeight } = useWindowDimensions();
  // 画面高さに応じて 0.6〜1.0 の範囲でスケール。
  // ヒーロー利用可能高さ ≒ screenHeight - 349 (TopBar + footer + textBlock 等のクローム概算)。
  // 474 = 3 カード合計のベース高 410 + wrap の paddingVertical 32×2 = 64。
  // これで 600〜950px の縦幅でもカードと上下余白が収まる。
  const scale = Math.max(0.6, Math.min(1, (screenHeight - 349) / 474));

  const pfcRows: { l: 'P' | 'F' | 'C'; v: number; c: string }[] = [
    { l: 'P', v: 0.62, c: ILLUST_COLORS.protein },
    { l: 'F', v: 0.41, c: ILLUST_COLORS.fat },
    { l: 'C', v: 0.35, c: ILLUST_COLORS.carb },
  ];

  return (
    <View style={[illustStyles.wrap, { transform: [{ scale }] }]}>
      {/* Card 1 — kcal リング */}
      <View style={illustStyles.card}>
        <View style={illustStyles.ringBox}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle
              cx={60}
              cy={60}
              r={46}
              stroke={t.colors.border.default}
              strokeWidth={9}
              fill="none"
            />
            <Circle
              cx={60}
              cy={60}
              r={46}
              stroke={t.colors.action.primary.default}
              strokeWidth={9}
              fill="none"
              strokeDasharray="289"
              strokeDashoffset="92"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </Svg>
          <View style={illustStyles.ringCenter} pointerEvents="none">
            <Text style={illustStyles.ringNumber}>1,438</Text>
            <Text style={illustStyles.ringUnit}>/ 2,070 kcal</Text>
          </View>
        </View>
      </View>

      {/* Card 2 — 体重トレンド */}
      <View style={[illustStyles.card, illustStyles.cardSpark]}>
        <View style={illustStyles.sparkHeader}>
          <Text style={illustStyles.sparkLabel}>体重 ・ 12週</Text>
          <Text style={illustStyles.sparkDelta}>-2.3kg</Text>
        </View>
        <Svg
          width="100%"
          height={56}
          viewBox="0 0 220 56"
          preserveAspectRatio="none"
        >
          <Defs>
            <SvgLinearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={t.colors.action.primary.default} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={t.colors.action.primary.default} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M0,18 L20,16 L40,22 L60,20 L80,28 L100,30 L120,34 L140,32 L160,40 L180,38 L200,44 L220,46 L220,56 L0,56 Z"
            fill="url(#sparkfill)"
          />
          <Path
            d="M0,18 L20,16 L40,22 L60,20 L80,28 L100,30 L120,34 L140,32 L160,40 L180,38 L200,44 L220,46"
            stroke={t.colors.action.primary.default}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={220} cy={46} r={3.5} fill={t.colors.action.primary.default} />
        </Svg>
        <View style={illustStyles.sparkAxis}>
          <Text style={illustStyles.sparkAxisText}>1月</Text>
          <Text style={illustStyles.sparkAxisText}>3月</Text>
          <Text style={illustStyles.sparkAxisText}>目標</Text>
        </View>
      </View>

      {/* Card 3 — PFC ミニバー */}
      <View style={[illustStyles.card, illustStyles.cardPfc]}>
        {pfcRows.map((row) => (
          <View key={row.l} style={illustStyles.pfcRow}>
            <Text style={illustStyles.pfcLabel}>{row.l}</Text>
            <View style={illustStyles.pfcTrack}>
              <View
                style={[
                  illustStyles.pfcFill,
                  { width: `${row.v * 100}%`, backgroundColor: row.c },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Slide 1/2 のイラストは help 画面と共通化済み。`onboarding-illustrations.tsx` を参照。

export default function IntroRoute() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { markIntroSeen } = useAppState();
  const [index, setIndex] = useState<number>(0);
  const [listHeight, setListHeight] = useState<number>(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const { width: screenWidth } = useWindowDimensions();

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') {
      setIndex(first.index);
    }
  }).current;

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    markIntroSeen(INTRO_VERSION);
    router.replace('/onboarding');
  }, [index, markIntroSeen, router]);

  const skip = useCallback(() => {
    markIntroSeen(INTRO_VERSION);
    router.replace('/onboarding');
  }, [markIntroSeen, router]);

  const openLegal = (url: string) => {
    Linking.openURL(url).catch((e) => console.warn('[intro] failed to open legal URL', e));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page} testID="intro-screen">
        <LinearGradient colors={[t.colors.surface.default, t.colors.surface.raised]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          {/* TOP BAR: brand + skip */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Logo size={22} color={t.colors.action.primary.default} />
              <Text style={styles.brandText}>Hachibu</Text>
            </View>
            <Pressable
              onPress={skip}
              testID="intro-skip"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="紹介をスキップ"
              accessibilityHint="オンボーディングへ進みます"
            >
              <Text style={styles.skipText}>スキップ</Text>
            </Pressable>
          </View>

          {/* SLIDES */}
          <FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            style={styles.slideList}
            onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.slide,
                  { width: screenWidth },
                  listHeight > 0 ? { height: listHeight } : null,
                ]}
                testID={`intro-slide-${item.key}`}
              >
                {/* HERO */}
                <View
                  style={[
                    styles.heroWrap,
                    { backgroundColor: item.accent },
                  ]}
                >
                  {item.media.kind === 'buttonGrid' ? (
                    <ButtonGridIllustration />
                  ) : item.media.kind === 'gestureDemo' ? (
                    <GestureDemoIllustration />
                  ) : (
                    <IntroProgressIllustration />
                  )}
                </View>

                {/* TEXT */}
                <View style={styles.textBlock}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
              </View>
            )}
          />

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
            <Pressable
              style={styles.cta}
              onPress={goNext}
              testID="intro-cta"
              accessibilityRole="button"
              accessibilityLabel={index < SLIDES.length - 1 ? '次のスライドへ' : 'はじめる'}
            >
              <Text style={styles.ctaText}>
                {index < SLIDES.length - 1 ? '次へ' : 'はじめる'}
              </Text>
            </Pressable>
            <View style={styles.legalRow}>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.terms)}>
                <Text style={styles.legalLink}>利用規約</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.privacy)}>
                <Text style={styles.legalLink}>プライバシーポリシー</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}


const makeStyles = (t: Theme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.surface.default },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    height: 48,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: fs.md, fontWeight: '700', color: t.colors.content.primary, letterSpacing: ls.wide },
  skipText: { color: t.colors.content.secondary, fontSize: fs.sm, fontWeight: '600' },
  slideList: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  heroWrap: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  textBlock: { gap: 8, paddingBottom: 8 },
  title: { fontSize: fs['2xl'], fontWeight: '700', color: t.colors.content.primary, lineHeight: 32, letterSpacing: ls.wide },
  subtitle: { fontSize: fs.sm, lineHeight: 23, color: t.colors.content.secondary },
  footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: t.colors.border.default },
  dotActive: { backgroundColor: t.colors.action.primary.default, width: 18 },
  cta: {
    backgroundColor: t.colors.action.primary.default,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { color: t.colors.content.onAction, fontSize: fs.md, fontWeight: '700', letterSpacing: ls.wide },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: fs.sm, color: t.colors.content.secondary, textDecorationLine: 'underline' },
  legalSep: { fontSize: fs.sm, color: t.colors.content.secondary },
});

const makeIllustStyles = (t: Theme) => StyleSheet.create({
  // hero の縦をフルに使い、3 カードを均等に縦中央寄せ。
  // 画面高さが変わっても各カードの比率と余白が保たれる。
  wrap: {
    width: '78%',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: t.colors.surface.raised,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardSpark: { paddingVertical: 20, paddingHorizontal: 20, alignItems: 'stretch', gap: 12 },
  cardPfc: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'stretch', gap: 9 },
  // Card 1
  ringBox: { position: 'relative', width: 120, height: 120 },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: { fontSize: fs['3xl'], fontWeight: '700', color: t.colors.content.primary, lineHeight: 28 },
  ringUnit: { fontSize: fs.xs, color: t.colors.content.secondary, marginTop: 4 },
  // Card 2
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  // カードのヘッダ行 (ラベル+値)。下の sparkAxisText(xs) より一段上に置く。
  sparkLabel: { fontSize: fs.sm, color: t.colors.content.secondary, letterSpacing: ls.wider },
  sparkDelta: { fontSize: fs.sm, color: t.colors.action.text.default, fontWeight: '600' },
  sparkAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  sparkAxisText: { fontSize: fs.xs, color: t.colors.content.secondary, letterSpacing: ls.wide },
  // Card 3
  pfcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // P/F/C の1文字ラベル = 添え字なので Caption 相当 (xs)
  pfcLabel: {
    width: 12,
    fontSize: fs.xs,
    fontWeight: '700',
    color: t.colors.content.primary,
  },
  pfcTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: t.colors.border.default,
    overflow: 'hidden',
  },
  pfcFill: { height: '100%', borderRadius: radius.full },
});

// (gridStyles / gestureStyles は components/onboarding-illustrations.tsx に移動)
