/**
 * Help page (`/help`) — Hachibu の使い方
 *
 * Spec: docs/help-content.md (v2)
 *
 * セクション構成:
 *   §1-4. ステップカード (ページャー形式)
 *     §1. 操作の基本 (タップ + 長押し)
 *     §2. 食材ボタンの中身 (HelpInfographic, ingredient buckets)
 *     §3. 料理ボタンの中身 (HelpInfographic, dish buckets)
 *     §4. もっと、あなたに合わせて (将来予定)
 *   §5. よくある質問 (FAQ アコーディオン)
 *
 * トーン: 静かな日本ウェルネス、中立・非評価 (PRD §トーン準拠)
 *         intro.tsx と語感統一: 「ふみこめる」「いける」「残せる」 等
 *
 * ボタン表示ラベルは実画面 (QuickLogSection.tsx) と完全一致。
 */

import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, PanResponder, Platform, Pressable, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpInfographic } from '@/components/help/HelpInfographic';
import { FrequentTabIllustration, GestureDemoIllustration } from '@/components/onboarding-illustrations';
import { Body, Heading, Icon, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { duration, easing } from '@/design-system/tokens/primitives/motion';
import type { BucketKey } from '@/types/identity';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const INGREDIENT_BUCKETS: BucketKey[] = [
  'staple',
  'lean_protein',
  'egg',
  'fatty_protein',
  'dairy_soy',
  'veggies',
  'fruit',
  'added_fat',
  'snack_drink',
];

const DISH_BUCKETS: BucketKey[] = [
  'rice_dish',
  'curry',
  'chinese_noodles',
  'japanese_noodles',
  'pasta',
  'sushi',
  'sandwich',
  'pizza',
  'misc_dish',
];

// 汎用の M3 Standard は motion.ts の easing.standard を使う (Easing.bezier(...easing.standard))。
// 以下の2つは、このステップページャー専用に少し強めにチューニングした
// 固有カーブ。motion.ts の easing.enter/exit とは別物なので個別に保持する
// (安易に汎用トークンへ差し替えると見た目が変わるため)。
const MD3_DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1.0); // screen enter
const MD3_ACCELERATE = Easing.bezier(0.3, 0, 0.8, 0.15);   // screen exit

export default function HelpRoute() {
  const [step, setStep] = useState(0);
  const theme = useTheme();
  const tr = useT();
  const router = useRouter();
  const stepTitles: string[] = tr('help.steps', { returnObjects: true }) ?? [];
  const steps = STEP_KEYS.map((key, i) => ({ key, title: stepTitles[i] ?? key }));
  const isLast = step === steps.length - 1;
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const stepRef     = useRef(step);
  const isAnimating = useRef(false);

  // Swipe gesture (horizontal only — vertical passes through to ScrollView)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 12,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -50 && stepRef.current < STEP_KEYS.length - 1) {
          goTo(stepRef.current + 1);
        } else if (dx > 50 && stepRef.current > 0) {
          goTo(stepRef.current - 1);
        }
      },
    })
  ).current;

  const goTo = (next: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const direction = next > stepRef.current ? 1 : -1;
    stepRef.current = next;

    // Exit: MD3 Accelerate (150ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        easing: MD3_ACCELERATE,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -16 * direction,
        duration: 150,
        easing: MD3_ACCELERATE,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(16 * direction);

      // Enter: MD3 Decelerate (200ms)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: MD3_DECELERATE,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: MD3_DECELERATE,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: tr('nav.help'),
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          {/* ステップコンテンツ (スワイプで切替) */}
          <Animated.View
            style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
            {...panResponder.panHandlers}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              testID="help-screen"
            >
              <Heading style={styles.h2}>{steps[step].title}</Heading>
              <StepContent stepKey={steps[step].key} />
              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>

          {/* ナビゲーション (固定フッター) */}
          <View style={[styles.navBar, { borderTopColor: theme.colors.border.subtle, backgroundColor: theme.colors.surface.default }]}>
            <View style={styles.navButtons}>
              <Pressable
                onPress={() => goTo(step - 1)}
                disabled={step === 0}
                style={[
                  styles.navBtn,
                  styles.navBtnSecondary,
                  { borderColor: theme.colors.border.default, opacity: step === 0 ? 0.3 : 1 },
                ]}
              >
                <Body style={{ color: theme.colors.content.secondary }}>{tr('help.nav.prev')}</Body>
              </Pressable>
              <Pressable
                onPress={isLast ? () => router.back() : () => goTo(step + 1)}
                style={[
                  styles.navBtn,
                  styles.navBtnPrimary,
                  { backgroundColor: theme.colors.action.primary.default },
                ]}
              >
                <Body style={{ color: theme.colors.content.onAction }}>
                  {isLast ? tr('help.nav.close') : tr('help.nav.next')}
                </Body>
              </Pressable>
            </View>

            {/* ドットインジケーター (フッター下部) */}
            <StepIndicator total={steps.length} current={step} />
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const STEP_KEYS = ['gestures', 'ingredients', 'dishes', 'future', 'faq'] as const;

function StepIndicator({ total, current }: { total: number; current: number }) {
  const t = useTheme();
  // Animated width per dot (useNativeDriver: false required for layout props)
  const widthAnims = useRef(
    Array.from({ length: total }, (_, i) => new Animated.Value(i === 0 ? 20 : 8))
  ).current;

  React.useEffect(() => {
    Animated.parallel(
      widthAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i === current ? 20 : 8,
          duration: duration.short,
          easing: Easing.bezier(...easing.standard),
          useNativeDriver: false,
        })
      )
    ).start();
  }, [current]);

  return (
    <View style={styles.dots}>
      {widthAnims.map((widthAnim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: widthAnim,
              backgroundColor: i === current
                ? t.colors.action.primary.default
                : t.colors.border.default,
            },
          ]}
        />
      ))}
    </View>
  );
}

function StepContent({ stepKey }: { stepKey: string }) {
  const t = useTheme();
  const tr = useT();

  switch (stepKey) {
    case 'gestures':
      return (
        <View style={styles.stepContent}>
          <Body>{tr('help.content.gestures.body')}</Body>
          <View style={styles.illustrationWrap}>
            <GestureDemoIllustration animate />
          </View>
          <View style={[styles.calloutBox, { backgroundColor: t.colors.action.primary.container, borderLeftColor: t.colors.action.primary.default }]}>
            <Body style={{ color: t.colors.action.primary.onContainer }}>
              {tr('help.content.gestures.callout')}
            </Body>
          </View>
        </View>
      );

    case 'ingredients':
      return (
        <View style={styles.stepContent}>
          <Body>{tr('help.content.ingredients.body')}</Body>
          <View style={styles.infographicWrap}>
            <HelpInfographic bucketKeys={INGREDIENT_BUCKETS} scaleMaxKcal={300} />
          </View>
          <View style={styles.footnotes}>
            <Footnote>{tr('help.content.ingredients.footnote1')}</Footnote>
            <Footnote>{tr('help.content.ingredients.footnote2')}</Footnote>
          </View>
        </View>
      );

    case 'dishes':
      return (
        <View style={styles.stepContent}>
          <Body>{tr('help.content.dishes.body')}</Body>
          <View style={styles.infographicWrap}>
            <HelpInfographic bucketKeys={DISH_BUCKETS} scaleMaxKcal={1000} />
          </View>
          <View style={styles.footnotes}>
            <Footnote>{tr('help.content.dishes.footnote1')}</Footnote>
            <Footnote>{tr('help.content.dishes.footnote2')}</Footnote>
          </View>
        </View>
      );

    case 'future':
      return (
        <View style={styles.stepContent}>
          <Body>{tr('help.content.future.body')}</Body>
          <View style={styles.illustrationWrap}>
            <FrequentTabIllustration />
          </View>
          <View style={styles.subsection}>
            <Body style={styles.h3}>{tr('help.content.future.starTitle')}</Body>
            <Body>{tr('help.content.future.starBody')}</Body>
          </View>
          <View style={styles.subsection}>
            <Body style={styles.h3}>{tr('help.content.future.defaultTitle')}</Body>
            <Body>{tr('help.content.future.defaultBody')}</Body>
          </View>
        </View>
      );

    case 'faq':
      return (
        <View style={styles.stepContent}>
          <FaqItem q={tr('help.content.faq.q1')} a={tr('help.content.faq.a1')} />
          <FaqItem q={tr('help.content.faq.q2')} a={tr('help.content.faq.a2')} />
          <FaqItem q={tr('help.content.faq.q3')} a={tr('help.content.faq.a3')} />
          <FaqItem q={tr('help.content.faq.q4')} a={tr('help.content.faq.a4')} />
        </View>
      );

    default:
      return null;
  }
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.footnoteRow}>
      <Body size="sm" tone="secondary">
        ※ {children}
      </Body>
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const t = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    // MD3 standard easing, Medium1 (250ms)
    Animated.timing(rotateAnim, {
      toValue,
      duration: 250,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: true,
    }).start();
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });
    setOpen(v => !v);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={toggle}
      style={[styles.faqItem, { borderTopColor: t.colors.border.subtle }]}
    >
      <View style={styles.faqHeader}>
        <Body style={[styles.faqQ, { color: t.colors.content.primary, flex: 1 }]}>
          {q}
        </Body>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon name="chevronDown" size={16} color={t.colors.content.tertiary} />
        </Animated.View>
      </View>
      {open && (
        <Body style={{ color: t.colors.content.secondary, paddingTop: 8 }}>
          {a}
        </Body>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 16 },

  // Step content area
  stepContent: {
    gap: 12,
  },

  // Fixed bottom nav bar
  navBar: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  navBtnSecondary: {
    borderWidth: 1,
  },
  navBtnPrimary: {},

  // Dot indicator (フッター内)
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Shared typography
  h2: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    marginBottom: 2,
  },
  h3: {
    fontSize: fs.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  subsection: {
    marginTop: 8,
    gap: 4,
  },
  calloutBox: {
    marginTop: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  infographicWrap: {
    marginTop: 4,
  },
  illustrationWrap: {
    marginTop: 4,
    marginBottom: 4,
    alignItems: 'center',
  },
  footnotes: {
    marginTop: 8,
    gap: 4,
  },
  footnoteRow: {},

  // FAQ accordion
  faqItem: {
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqQ: {
    fontWeight: '600',
  },
});
