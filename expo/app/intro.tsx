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
import { Label, useTheme, type Theme } from '@/design-system';
import { useT } from '@/hooks/useT';
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
  media: SlideMedia;
}

const SLIDE_META: { key: string; media: SlideMedia }[] = [
  { key: 's1', media: { kind: 'buttonGrid' } },
  { key: 's2', media: { kind: 'gestureDemo' } },
  { key: 's3', media: { kind: 'progress' } },
];

// ── Intro 専用 進捗イラスト ───────────────────────────────────
// kcal リング + 体重スパークライン + PFC バー の 3 カード合成。
// intro 以外で再利用する見込みが無いため、ローカル定義。
function IntroProgressIllustration() {
  const t = useTheme();
  const tr = useT();
  const axisLabels: string[] = tr('intro.progress.axis', { returnObjects: true }) ?? ['', '', ''];
  const illustColors = {
    protein: t.colors.nutrition.protein.graphic,
    fat: t.colors.nutrition.fat.graphic,
    carb: t.colors.action.text.default,
  };
  const illustStyles = useMemo(() => makeIllustStyles(t), [t]);
  const { height: screenHeight } = useWindowDimensions();
  // 画面高さに応じて 0.6〜1.0 の範囲でスケール。
  // ヒーロー利用可能高さ ≒ screenHeight - 349 (TopBar + footer + textBlock 等のクローム概算)。
  // 474 = 3 カード合計のベース高 410 + wrap の paddingVertical 32×2 = 64。
  // これで 600〜950px の縦幅でもカードと上下余白が収まる。
  const scale = Math.max(0.6, Math.min(1, (screenHeight - 349) / 474));

  const pfcRows: { l: 'P' | 'F' | 'C'; v: number; c: string }[] = [
    { l: 'P', v: 0.62, c: illustColors.protein },
    { l: 'F', v: 0.41, c: illustColors.fat },
    { l: 'C', v: 0.35, c: illustColors.carb },
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
          <Text style={illustStyles.sparkLabel}>{tr('intro.progress.label')}</Text>
          <Text style={illustStyles.sparkDelta}>{tr('intro.progress.delta')}</Text>
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
          {axisLabels.map((label, i) => (
            <Text key={i} style={illustStyles.sparkAxisText}>{label}</Text>
          ))}
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
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const slideAccentMap = useMemo<Record<string, string>>(() => ({
    s1: t.colors.surface.raised,           // neutral: light=ivory[50], dark=#2B2620
    s2: t.colors.action.primary.container, // sage: light=sage[100], dark=sage[900]
    s3: t.colors.accent.subtle,            // ai: light=ai[100], dark=ai[900]
  }), [t]);
  const slideTexts: { title: string; subtitle: string }[] = tr('intro.slides', { returnObjects: true }) ?? [];
  const slides: Slide[] = SLIDE_META.map((meta, i) => ({
    ...meta,
    title: slideTexts[i]?.title ?? meta.key,
    subtitle: slideTexts[i]?.subtitle ?? '',
  }));
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
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    markIntroSeen(INTRO_VERSION);
    router.replace('/onboarding');
  }, [index, slides.length, markIntroSeen, router]);

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
              accessibilityLabel={tr('intro.a11y.skip')}
              accessibilityHint={tr('intro.a11y.skipHint')}
            >
              <Label size="sm" tone="link">{tr('intro.skip')}</Label>
            </Pressable>
          </View>

          {/* SLIDES */}
          <FlatList
            ref={listRef}
            data={slides}
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
                    { backgroundColor: slideAccentMap[item.key] ?? t.colors.surface.raised },
                  ]}
                >
                  {item.media.kind === 'buttonGrid' ? (
                    <ButtonGridIllustration animate />
                  ) : item.media.kind === 'gestureDemo' ? (
                    <GestureDemoIllustration animate />
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
              {slides.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
            <Pressable
              style={styles.cta}
              onPress={goNext}
              testID="intro-cta"
              accessibilityRole="button"
              accessibilityLabel={index < slides.length - 1 ? tr('intro.a11y.next') : tr('intro.start')}
            >
              <Text style={styles.ctaText}>
                {index < slides.length - 1 ? tr('intro.next') : tr('intro.start')}
              </Text>
            </Pressable>
            <View style={styles.legalRow}>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.terms)}>
                <Text style={styles.legalLink}>{tr('nav.terms')}</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable onPress={() => openLegal(LEGAL_LINKS.privacy)}>
                <Text style={styles.legalLink}>{tr('nav.privacy')}</Text>
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
  // ロゴタイプ専用フォント (Lato Light)。本文スケール(fs.*)より一段大きくしないと
  // Light ウェイトは Bold 比で視覚的に小さく・薄く見えるため fontSize は個別指定。
  brandText: { fontFamily: 'Lato_300Light', fontSize: 19, fontWeight: '300', color: t.colors.content.primary, letterSpacing: ls.wide },
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
