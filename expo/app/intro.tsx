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
import { Logo } from '@/components/Logo';
import { ButtonGridIllustration, GestureDemoIllustration, IntroProgressIllustration } from '@/components/onboarding-illustrations';
import { INTRO_VERSION, LEGAL_LINKS } from '@/constants/onboarding';
import { Label, useTheme, type Theme } from '@/design-system';
import { useT } from '@/hooks/useT';
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

// Slide 1/2/3 のイラストは `onboarding-illustrations.tsx` で一元管理。

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
                    <IntroProgressIllustration animate />
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

