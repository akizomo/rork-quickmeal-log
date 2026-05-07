/**
 * Help page (`/help`) — Hachibu の使い方
 *
 * Spec: docs/help-content.md (v2)
 *
 * セクション構成:
 *   §1. 操作の基本 (タップ + 長押し)
 *   §2. 食材ボタンの中身 (HelpInfographic, ingredient buckets)
 *   §3. 料理ボタンの中身 (HelpInfographic, dish buckets)
 *   §4. もっと、あなたに合わせて (将来予定)
 *   §5. よくある質問 (FAQ)
 *
 * トーン: 静かな日本ウェルネス、中立・非評価 (PRD §トーン準拠)
 *         intro.tsx と語感統一: 「ふみこめる」「いける」「残せる」 等
 *
 * ボタン表示ラベルは実画面 (QuickLogSection.tsx) と完全一致。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpInfographic } from '@/components/help/HelpInfographic';
import { GestureDemoIllustration } from '@/components/onboarding-illustrations';
import { Body, Caption, Heading, useTheme } from '@/design-system';
import type { BucketKey } from '@/types/identity';

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

export default function HelpRoute() {
  const t = useTheme();

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
          <ScrollView contentContainerStyle={styles.scroll} testID="help-screen">

            {/* §1. 操作の基本 */}
            <Section>
              <Heading style={styles.h2}>操作の基本</Heading>
              <Body>タップと長押し、2つだけ覚えれば使えます。</Body>

              {/* intro と共通ビジュアル: タップ=ご飯1杯234kcal / 長押し=種類・量選択 */}
              <View style={styles.illustrationWrap}>
                <GestureDemoIllustration />
              </View>

              <View style={[styles.calloutBox, { backgroundColor: t.colors.action.primary.container, borderLeftColor: t.colors.action.primary.default }]}>
                <Body style={{ color: t.colors.action.primary.onContainer }}>
                  ふだんの食事はタップで足ります。
                  違うものを食べた日や、しっかり記録したい日だけ長押しを。
                </Body>
              </View>
            </Section>

            <Divider />

            {/* §2. 食材ボタンの中身 */}
            <Section>
              <Heading style={styles.h2}>食材ボタンの中身</Heading>
              <Body>
                各ボタンには、日本人がよく食べる食材を集約しています。
                タップで記録される値は、実際の食事に近い範囲に収まる設計です。
              </Body>

              <View style={styles.infographicWrap}>
                <HelpInfographic bucketKeys={INGREDIENT_BUCKETS} scaleMaxKcal={300} />
              </View>

              <View style={styles.footnotes}>
                <Footnote>
                  ● はタップ時に記録される代表値、バー は日本人がよく食べる食材の幅です。
                </Footnote>
                <Footnote>
                  「よく食べる」基準: 国民健康・栄養調査 (NHNS) における各バケット内の摂取量シェア上位の食材を採用しています。
                </Footnote>
                <Footnote>
                  「長押し」表記のボタンは、種類により値が大きく変わるため、毎回明示選択する仕様です。
                </Footnote>
              </View>
            </Section>

            <Divider />

            {/* §3. 料理ボタンの中身 */}
            <Section>
              <Heading style={styles.h2}>料理ボタンの中身</Heading>
              <Body>
                一皿料理は、構成された料理単位の代表値で記録します。
                丼やパスタなど、ふだんの一食をそのまま選んでください。
              </Body>

              <View style={styles.infographicWrap}>
                <HelpInfographic bucketKeys={DISH_BUCKETS} scaleMaxKcal={1000} />
              </View>

              <View style={styles.footnotes}>
                <Footnote>
                  料理タブは、定食・寿司・ピザ・ラーメンなど値の幅が広いボタンが多いため、長押しが基本のボタンも含まれます。
                </Footnote>
                <Footnote>
                  味噌汁や豚汁など汁物は「定食・単品・汁」の中にあります。
                </Footnote>
              </View>
            </Section>

            <Divider />

            {/* §4. もっと、あなたに合わせて (将来予定) */}
            <Section>
              <View style={styles.titleRow}>
                <Heading style={styles.h2}>もっと、あなたに合わせて</Heading>
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
                  今は標準的な日本人の摂取量を基準にしていますが、
                  続けるほど、あなた自身の食習慣に近づきます。
                </Body>
              </View>
            </Section>

            <Divider />

            {/* §5. FAQ */}
            <Section>
              <Heading style={styles.h2}>よくある質問</Heading>

              <FaqItem
                q="パンや麺を食べる日はどうすれば？"
                a="「ごはんパン麺」ボタンを長押しすると、パン・オートミール・餅などから選べます。麺類は「うどん蕎麦」「ラーメン」「パスタ」のボタンに分かれているので、そちらをタップしてください。よく使うものから順に並ぶので、繰り返すうちに早くなります。"
              />
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
                a="撮影 → 認識 → 確認の手間で、結局時間がかかり続かない原因になりやすいため、あえてタップ式にしています。3秒で終わるので、毎日続けやすい設計です。"
              />
              <FaqItem
                q="もっと厳密に計算したい場合は？"
                a="このアプリは「ざっくり、続ける」を優先した設計です。1g単位で計算したい方は、食品成分表ベースの計測アプリ (あすけん等) との併用がおすすめです。"
              />
            </Section>

            <View style={{ height: 24 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

function Divider() {
  const t = useTheme();
  return <View style={[styles.divider, { backgroundColor: t.colors.border.subtle }]} />;
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
  const t = useTheme();
  return (
    <View style={[styles.faqItem, { borderTopColor: t.colors.border.subtle }]}>
      <Body style={[styles.faqQ, { color: t.colors.content.primary }]}>Q. {q}</Body>
      <Body style={{ color: t.colors.content.secondary }}>A. {a}</Body>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, gap: 4, paddingBottom: 40 },
  section: {
    gap: 10,
    paddingVertical: 18,
  },
  divider: {
    height: 1,
    marginHorizontal: -18,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
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
  },
  subsection: {
    marginTop: 6,
    gap: 4,
  },
  calloutBox: {
    marginTop: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  infographicWrap: {
    marginTop: 8,
  },
  illustrationWrap: {
    marginTop: 4,
    marginBottom: 4,
    alignItems: 'center',
  },
  footnotes: {
    marginTop: 10,
    gap: 4,
  },
  footnoteRow: {
    paddingLeft: 0,
  },
  faqItem: {
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  faqQ: {
    fontWeight: '600',
  },
});
