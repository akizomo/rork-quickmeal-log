import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Leaf, Sparkles, Target, Zap } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Linking, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { INTRO_VERSION, LEGAL_LINKS, TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    key: 's1',
    icon: <Zap size={34} color={palette.sageDeep} />,
    title: '最短で記録できる',
    body: 'タップで即記録、長押しでそっと量を整える。忙しい日でも負担にならない軽さ。',
    accent: palette.accentSoft,
  },
  {
    key: 's2',
    icon: <Sparkles size={34} color={palette.sageDeep} />,
    title: '見るべき数字がすぐ分かる',
    body: '総カロリーとP/F/Cの進捗を、静かに、一目で。複雑な栄養管理はいりません。',
    accent: '#E8E2D1',
  },
  {
    key: 's3',
    icon: <Target size={34} color={palette.sageDeep} />,
    title: '自分に合った目標',
    body: '現状を伝えるだけで、納得感のあるおすすめ目標を提案します。',
    accent: '#DDE8D6',
  },
  {
    key: 's4',
    icon: <Leaf size={34} color={palette.sageDeep} />,
    title: `${TRIAL_DURATION_DAYS}日間無料で試せる`,
    body: '有料アプリですが、まずは無料で体験できます。いつでも解約できます。',
    accent: '#E8DCC4',
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
    router.replace('/paywall');
  }, [index, markIntroSeen, router]);

  const skip = useCallback(() => {
    markIntroSeen(INTRO_VERSION);
    router.replace('/paywall');
  }, [markIntroSeen, router]);

  const openLegal = (url: string) => {
    Linking.openURL(url).catch((e) => console.log('[intro] openURL', e));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page} testID="intro-screen">
        <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <View style={styles.headerRow}>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
            <Pressable onPress={skip} testID="intro-skip">
              <Text style={styles.skipText}>スキップ</Text>
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width: SCREEN_WIDTH }]} testID={`intro-slide-${item.key}`}>
                <View style={[styles.iconWrap, { backgroundColor: item.accent }]}>{item.icon}</View>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideBody}>{item.body}</Text>
              </View>
            )}
          />

          <View style={styles.footer}>
            <Pressable style={styles.cta} onPress={goNext} testID="intro-cta">
              <Text style={styles.ctaText}>
                {index < SLIDES.length - 1 ? '次へ' : `${TRIAL_DURATION_DAYS}日間無料で始める`}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.border },
  dotActive: { backgroundColor: palette.sageDeep, width: 18 },
  skipText: { color: palette.textMuted, fontSize: 13, fontWeight: '600' },
  slide: { flex: 1, paddingHorizontal: 36, justifyContent: 'center', alignItems: 'center', gap: 22 },
  iconWrap: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  slideTitle: { fontSize: 26, fontWeight: '700', color: palette.text, textAlign: 'center' },
  slideBody: { fontSize: 15, lineHeight: 24, color: palette.textMuted, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 14 },
  cta: { backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  legalLink: { fontSize: 12, color: palette.textMuted, textDecorationLine: 'underline' },
  legalSep: { fontSize: 12, color: palette.textMuted },
});
