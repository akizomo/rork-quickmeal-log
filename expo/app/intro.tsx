import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Linking, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { INTRO_VERSION, LEGAL_LINKS } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  /** 将来差し替え予定のスクリーンショット/動画 placeholder のキャプション */
  mediaCaption: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    key: 's1',
    title: '最短で記録できる',
    subtitle: 'タップで即記録、長押しでそっと量を整える。',
    mediaCaption: 'Quick Log デモ',
    accent: palette.accentSoft,
  },
  {
    key: 's2',
    title: '見るべき数字を、一目で',
    subtitle: '総カロリーと P/F/C の進捗を、静かに表示。',
    mediaCaption: 'ダッシュボード',
    accent: '#E8E2D1',
  },
  {
    key: 's3',
    title: 'あなたに合った目標',
    subtitle: '現状を伝えるだけで、納得感のある提案。',
    mediaCaption: '目標設定',
    accent: '#DDE8D6',
  },
];

export default function IntroRoute() {
  const router = useRouter();
  const { markIntroSeen } = useAppState();
  const [index, setIndex] = useState<number>(0);
  const listRef = useRef<FlatList<Slide>>(null);

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

  const openLegal = (path: string) => {
    router.push(path as never);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page} testID="intro-screen">
        <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          {/* TOP BAR: brand + skip (compact, 56px) */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Logo size={24} color={palette.sageDeep} />
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

          {/* SLIDES — media (top large) + text (bottom compact) */}
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
            renderItem={({ item }) => (
              <View style={[styles.slide, { width: SCREEN_WIDTH }]} testID={`intro-slide-${item.key}`}>
                {/* HERO MEDIA — 約 60% */}
                <View style={[styles.mediaWrap, { backgroundColor: item.accent }]}>
                  <Text style={styles.mediaCaption}>{item.mediaCaption}</Text>
                  <Text style={styles.mediaHint}>(スクリーンショットを差し込みます)</Text>
                </View>

                {/* TEXT — タイトル + サブタイトル (下部、compact) */}
                <View style={styles.textBlock}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
              </View>
            )}
          />

          {/* BOTTOM: dots + CTA + legal */}
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
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
  brandText: { fontSize: 16, fontWeight: '700', color: palette.text, letterSpacing: 0.3 },
  skipText: { color: palette.textMuted, fontSize: 13, fontWeight: '600' },
  slideList: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  mediaWrap: {
    flex: 1,
    width: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  mediaCaption: { fontSize: 14, fontWeight: '700', color: palette.text },
  mediaHint: { fontSize: 12, color: palette.textMuted },
  textBlock: { gap: 8, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: palette.text, lineHeight: 32 },
  subtitle: { fontSize: 14, lineHeight: 22, color: palette.textMuted },
  footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.border },
  dotActive: { backgroundColor: palette.sageDeep, width: 18 },
  cta: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 12, color: palette.textMuted, textDecorationLine: 'underline' },
  legalSep: { fontSize: 12, color: palette.textMuted },
});
