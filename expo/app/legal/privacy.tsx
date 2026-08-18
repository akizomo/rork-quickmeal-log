import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, Heading, Label, useTheme } from '@/design-system';
import { useLocale } from '@/hooks/useLocale';

const CONTENT = {
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '最終更新日: 2026-04-28',
    intro: 'Hachibu (以下「本アプリ」) は、ユーザーのプライバシーを尊重します。本ポリシーは、本アプリが収集する情報、利用目的、および管理方法について説明します。',
    sections: [
      {
        title: '1. 収集する情報',
        body: null,
        subsections: [
          {
            title: '1.1 ユーザー入力情報',
            body: '本アプリは、以下の情報をユーザーが入力した時点で端末内のローカルストレージにのみ保存します:\n· 身長、体重、年齢、性別基準\n· 食事ログ (食材・料理・量・時刻)\n· 体重・体脂肪率の記録\n· 設定 (目標、運動習慣など)\n\nこれらの情報は第三者サーバーに送信されません。',
          },
          {
            title: '1.2 サブスクリプション情報',
            body: '有料プランの管理に RevenueCat を使用します。RevenueCat は購入の検証・管理のため、以下を取得します:\n· 匿名化されたユーザー識別子\n· 購入履歴\n· 端末プラットフォーム (iOS / Android)\n\n詳細は RevenueCat のプライバシーポリシーをご確認ください。',
          },
          {
            title: '1.3 課金情報',
            body: '購入処理は Apple App Store / Google Play Store が直接行い、本アプリはクレジットカード情報を取得しません。',
          },
        ],
      },
      {
        title: '2. 第三者への提供',
        body: '本アプリは、ユーザーの個人情報を第三者に販売・提供しません。',
        subsections: [],
      },
      {
        title: '3. データの削除',
        body: 'アプリを削除すると、端末内のすべてのデータが消去されます。',
        subsections: [],
      },
      {
        title: '4. クッキー / トラッキング',
        body: '本アプリはトラッキング目的のクッキー、IDFA、第三者解析ツールを使用しません。',
        subsections: [],
      },
      {
        title: '5. 子どものプライバシー',
        body: '本アプリは13歳未満のお子様を対象としていません。',
        subsections: [],
      },
      {
        title: '6. ポリシーの変更',
        body: '本ポリシーは予告なく変更されることがあります。重要な変更は、本アプリ内で通知します。',
        subsections: [],
      },
      {
        title: '7. お問い合わせ',
        body: '本ポリシーに関するお問い合わせは、contact@akizony.com までご連絡ください。',
        subsections: [],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: April 28, 2026',
    intro: 'Hachibu (the "App") respects your privacy. This policy explains what information the App collects, how it is used, and how it is managed.',
    sections: [
      {
        title: '1. Information We Collect',
        body: null,
        subsections: [
          {
            title: '1.1 User-Entered Data',
            body: 'The App stores the following information only in your device\'s local storage when you enter it:\n· Height, weight, age, and biological sex\n· Meal logs (foods, dishes, amounts, timestamps)\n· Weight and body fat percentage records\n· Settings (goals, activity level, etc.)\n\nThis information is never sent to third-party servers.',
          },
          {
            title: '1.2 Subscription Information',
            body: 'We use RevenueCat to manage paid plans. RevenueCat collects the following to verify and manage purchases:\n· An anonymized user identifier\n· Purchase history\n· Device platform (iOS / Android)\n\nSee RevenueCat\'s privacy policy for details.',
          },
          {
            title: '1.3 Payment Information',
            body: 'All purchases are processed directly by the Apple App Store or Google Play Store. The App does not access your credit card information.',
          },
        ],
      },
      {
        title: '2. Third-Party Sharing',
        body: 'The App does not sell or share your personal information with third parties.',
        subsections: [],
      },
      {
        title: '3. Data Deletion',
        body: 'Deleting the App removes all data stored on your device.',
        subsections: [],
      },
      {
        title: '4. Cookies / Tracking',
        body: 'The App does not use cookies, IDFA, or third-party analytics for tracking purposes.',
        subsections: [],
      },
      {
        title: '5. Children\'s Privacy',
        body: 'The App is not intended for children under the age of 13.',
        subsections: [],
      },
      {
        title: '6. Policy Changes',
        body: 'This policy may be updated without prior notice. Material changes will be announced within the App.',
        subsections: [],
      },
      {
        title: '7. Contact',
        body: 'For inquiries about this policy, please contact contact@akizony.com.',
        subsections: [],
      },
    ],
  },
} as const;

export default function PrivacyRoute() {
  const theme = useTheme();
  const { uiLanguage } = useLocale();
  const c = uiLanguage === 'en-US' ? CONTENT.en : CONTENT.ja;

  return (
    <>
      <Stack.Screen
        options={{
          title: c.title,
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="privacy-screen">
            <Caption tone="secondary">{c.lastUpdated}</Caption>
            <Body>{c.intro}</Body>

            {c.sections.map((section) => (
              <Section key={section.title} title={section.title}>
                {section.body ? <Body>{section.body}</Body> : null}
                {section.subsections.map((sub) => (
                  <SubSection key={sub.title} title={sub.title}>{sub.body}</SubSection>
                ))}
              </Section>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Heading size="lg">{title}</Heading>
      {children}
    </View>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.subSection}>
      <Label>{title}</Label>
      <Body>{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  subSection: { gap: 4 },
});
