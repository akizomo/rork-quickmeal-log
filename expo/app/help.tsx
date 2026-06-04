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
import { ChevronDown } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, PanResponder, Platform, Pressable, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpInfographic } from '@/components/help/HelpInfographic';
import { GestureDemoIllustration } from '@/components/onboarding-illustrations';
import { Body, Caption, Heading, useTheme } from '@/design-system';
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

// MD3 motion tokens
// Standard: cubic-bezier(0.2, 0, 0, 1) — x2=0 can cause JS-fallback edge case,
// so we use (0.2, 0, 0.01, 1) which is perceptually identical.
const MD3_STANDARD   = Easing.bezier(0.2, 0, 0.01, 1.0);
const MD3_DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1.0); // screen enter
const MD3_ACCELERATE = Easing.bezier(0.3, 0, 0.8, 0.15);   // screen exit

export default function HelpRoute() {
  const [step, setStep] = useState(0);
  const t = useTheme();
  const router = useRouter();
  const isLast = step === STEPS.length - 1;
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
        if (dx < -50 && stepRef.current < STEPS.length - 1) {
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
          title: 'Hachibu の使い方',
          headerStyle: { backgroundColor: t.colors.surface.default },
          headerTintColor: t.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: t.colors.surface.default }]}>
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
              <Heading style={styles.h2}>{STEPS[step].title}</Heading>
              <StepContent stepKey={STEPS[step].key} />
              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>

          {/* ナビゲーション (固定フッター) */}
          <View style={[styles.navBar, { borderTopColor: t.colors.border.subtle, backgroundColor: t.colors.surface.default }]}>
            <View style={styles.navButtons}>
              <Pressable
                onPress={() => goTo(step - 1)}
                disabled={step === 0}
                style={[
                  styles.navBtn,
                  styles.navBtnSecondary,
                  { borderColor: t.colors.border.default, opacity: step === 0 ? 0.3 : 1 },
                ]}
              >
                <Body style={{ color: t.colors.content.secondary }}>← 前へ</Body>
              </Pressable>
              <Pressable
                onPress={isLast ? () => router.back() : () => goTo(step + 1)}
                style={[
                  styles.navBtn,
                  styles.navBtnPrimary,
                  { backgroundColor: t.colors.action.primary.default },
                ]}
              >
                <Body style={{ color: t.colors.content.onAction }}>
                  {isLast ? '閉じる' : '次へ →'}
                </Body>
              </Pressable>
            </View>

            {/* ドットインジケーター (フッター下部) */}
            <StepIndicator total={STEPS.length} current={step} />
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const STEPS: { title: string; key: string }[] = [
  { title: '操作の基本',             key: 'gestures'     },
  { title: '食材ボタンの中身',       key: 'ingredients'  },
  { title: '料理ボタンの中身',       key: 'dishes'       },
  { title: 'もっと、あなたに合わせて', key: 'future'      },
  { title: 'よくある質問',           key: 'faq'          },
];

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
          duration: 200,
          easing: MD3_STANDARD,
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

  switch (stepKey) {
    case 'gestures':
      return (
        <View style={styles.stepContent}>
          <Body>タップと長押し、2つだけ覚えれば使えます。</Body>
          <View style={styles.illustrationWrap}>
            <GestureDemoIllustration />
          </View>
          <View style={[styles.calloutBox, { backgroundColor: t.colors.action.primary.container, borderLeftColor: t.colors.action.primary.default }]}>
            <Body style={{ color: t.colors.action.primary.onContainer }}>
              ふだんの食事はタップで足ります。{'\n'}
              違うものを食べた日や、しっかり記録したい日だけ長押しを。
            </Body>
          </View>
        </View>
      );

    case 'ingredients':
      return (
        <View style={styles.stepContent}>
          <Body>
            各ボタンには、日本人がよく食べる食材を集約しています。
            タップで記録される値は、実際の食事に近い範囲に収まる設計です。
          </Body>
          <View style={styles.infographicWrap}>
            <HelpInfographic bucketKeys={INGREDIENT_BUCKETS} scaleMaxKcal={300} />
          </View>
          <View style={styles.footnotes}>
            <Footnote>● はタップ時に記録される代表値、バー は日本人がよく食べる食材の幅です。</Footnote>
            <Footnote>「よく食べる」基準: 国民健康・栄養調査 (NHNS) における各バケット内の摂取量シェア上位の食材を採用しています。</Footnote>
            <Footnote>「長押し」表記のボタンは、種類により値が大きく変わるため、毎回明示選択する仕様です。</Footnote>
          </View>
        </View>
      );

    case 'dishes':
      return (
        <View style={styles.stepContent}>
          <Body>
            一皿料理は、構成された料理単位の代表値で記録します。
            丼やパスタなど、ふだんの一食をそのまま選んでください。
          </Body>
          <View style={styles.infographicWrap}>
            <HelpInfographic bucketKeys={DISH_BUCKETS} scaleMaxKcal={1000} />
          </View>
          <View style={styles.footnotes}>
            <Footnote>料理タブは、定食・寿司・ピザ・ラーメンなど値の幅が広いボタンが多いため、長押しが基本のボタンも含まれます。</Footnote>
            <Footnote>味噌汁や豚汁など汁物は「定食・単品・汁」の中にあります。</Footnote>
          </View>
        </View>
      );

    case 'future':
      return (
        <View style={styles.stepContent}>
          <View style={styles.titleRow}>
            <View style={[styles.badge, { backgroundColor: t.colors.accent.subtle }]}>
              <Caption style={{ color: t.colors.accent.default, fontWeight: '600' }}>予定</Caption>
            </View>
          </View>
          <Body>
            記録を続けるほど、よく食べる食材と量に合わせて代表値が調整されていきます。
          </Body>
          <View style={styles.subsection}>
            <Body style={styles.h3}>食材</Body>
            <Body>パンを毎朝食べる方は、「ごはんパン麺」のタップ値がパンに寄ります。</Body>
          </View>
          <View style={styles.subsection}>
            <Body style={styles.h3}>量</Body>
            <Body>大盛り派の方は、ご飯の量も自動で合わせられます。</Body>
          </View>
          <View style={[styles.calloutBox, { backgroundColor: t.colors.action.primary.container, borderLeftColor: t.colors.action.primary.default }]}>
            <Body style={{ color: t.colors.action.primary.onContainer }}>
              今は標準的な日本人の摂取量を基準にしていますが、{'\n'}
              続けるほど、あなた自身の食習慣に近づきます。
            </Body>
          </View>
        </View>
      );

    case 'faq':
      return (
        <View style={styles.stepContent}>
          <FaqItem
            q="量がぴったりじゃないけど大丈夫？"
            a="標準的な1人前で記録します。大盛り・小盛りはタップ後の画面で切り替えられます。微調整より「続けやすさ」を優先した設計です。"
          />
          <FaqItem
            q="1ボタンに何種類も入っていて、ざっくりすぎない？"
            a="各ボタンに含まれる食材は、よく食べる範囲ならタップ値とほぼ同じカロリー範囲に収まる設計です。ボタンごとの幅は「食材ボタンの中身」「料理ボタンの中身」で確認できます。"
          />
          <FaqItem
            q="写真で記録できないの？"
            a="撮影 → 認識 → 確認の手間で、結局時間がかかり続かない原因になりやすいため、あえてタップ式にしています。ボタンを数回タップするだけで終わるので、毎日続けやすい設計です。"
          />
          <FaqItem
            q="もっと厳密に計算したい場合は？"
            a="このアプリは「ざっくり、続ける」を優先した設計です。1g単位で計算したい方は、食品成分表ベースの計測アプリ (あすけん等) との併用がおすすめです。"
          />
        </View>
      );

    default:
      return null;
  }
}

function Footnote({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.footnoteRow}>
      <Caption tone="tertiary" style={{ color: t.colors.content.tertiary }}>
        ※ {children}
      </Caption>
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
      easing: MD3_STANDARD,
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
          <ChevronDown size={16} color={t.colors.content.tertiary} strokeWidth={2} />
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
  scroll: { padding: 18, gap: 16, paddingBottom: 16 },

  // Step content area
  stepContent: {
    gap: 12,
  },

  // Fixed bottom nav bar
  navBar: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 10,
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
    gap: 6,
    paddingTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Shared typography
  h2: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  h3: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  subsection: {
    marginTop: 6,
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
    paddingTop: 14,
    paddingBottom: 14,
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
