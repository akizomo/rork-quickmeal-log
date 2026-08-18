import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, Heading, Label, useTheme } from '@/design-system';
import { useLocale } from '@/hooks/useLocale';

const CONTENT = {
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新日: 2026-04-28',
    intro: '本利用規約 (以下「本規約」) は、Hachibu (以下「本アプリ」) の利用条件を定めるものです。本アプリをダウンロード・使用することで、本規約に同意したものとみなします。',
    sections: [
      {
        title: '1. サービス内容',
        body: '本アプリは、食事記録・体重管理・目標設定の支援を目的とした個人向けツールです。本アプリの提供する情報・推奨は医学的助言ではありません。健康に関する判断は医師等の専門家にご相談ください。',
        subsections: [],
      },
      {
        title: '2. サブスクリプション',
        body: null,
        subsections: [
          { title: '2.1 無料体験', body: '新規ユーザーには 7日間 の無料体験期間を提供します。期間終了前に解約すれば課金は発生しません。' },
          { title: '2.2 有料プラン', body: '価格は地域・ストアによって異なります。ご購入前に表示される価格をご確認ください。価格は予告なく変更される場合があります。変更前に購読中のユーザーには事前通知します。' },
          { title: '2.3 自動更新', body: '購読は期間終了の24時間前までに解約しない限り、自動更新されます。解約は Apple ID / Google アカウントの設定から行ってください。' },
          { title: '2.4 返金', body: '返金は Apple / Google の返金ポリシーに従います。本アプリは独自の返金対応を行いません。' },
        ],
      },
      {
        title: '3. 禁止事項',
        body: '以下の行為を禁止します:\n· 本アプリの逆コンパイル・改変\n· 不正アクセス、リバースエンジニアリング\n· 知的財産権の侵害\n· 第三者への譲渡、再配布',
        subsections: [],
      },
      {
        title: '4. 免責事項',
        body: '本アプリは「現状有姿」で提供されます。提案するカロリー・栄養目標・体型分類は一般的な参考値であり、医学的助言や治療を代替するものではありません。本アプリの利用によって生じた損害について、開発者は責任を負いません。',
        subsections: [],
      },
      {
        title: '5. データ消失',
        body: '本アプリのデータは端末内に保存されます。アプリの削除・端末故障・OS更新等により消失した場合の補償は行いません。重要なデータは別途バックアップを取ってください。',
        subsections: [],
      },
      {
        title: '6. サービスの変更・終了',
        body: '開発者は予告なくサービス内容の変更、機能追加・削除、または提供終了を行うことができます。',
        subsections: [],
      },
      {
        title: '7. 規約の変更',
        body: '本規約は予告なく変更されることがあります。重要な変更は本アプリ内で通知します。',
        subsections: [],
      },
      {
        title: '8. 準拠法・管轄',
        body: '本規約は日本法に準拠し、本規約に関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。',
        subsections: [],
      },
      {
        title: '9. お問い合わせ',
        body: '本規約に関するお問い合わせは、contact@akizony.com までご連絡ください。',
        subsections: [],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: April 28, 2026',
    intro: 'These Terms of Service ("Terms") govern your use of Hachibu (the "App"). By downloading or using the App, you agree to these Terms.',
    sections: [
      {
        title: '1. Service Description',
        body: 'The App is a personal tool for meal logging, weight management, and goal setting. Information and recommendations provided by the App are not medical advice. Consult a qualified healthcare professional for health-related decisions.',
        subsections: [],
      },
      {
        title: '2. Subscription',
        body: null,
        subsections: [
          { title: '2.1 Free Trial', body: 'New users receive a 7-day free trial. No charge will occur if you cancel before the trial ends.' },
          { title: '2.2 Paid Plans', body: 'Prices vary by region and are shown at the time of purchase. Prices may change without prior notice. Existing subscribers will be notified in advance of any price changes.' },
          { title: '2.3 Auto-Renewal', body: 'Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. Manage your subscription in your Apple ID or Google Account settings.' },
          { title: '2.4 Refunds', body: "Refunds are subject to Apple's or Google's refund policies. The App does not handle refunds directly." },
        ],
      },
      {
        title: '3. Prohibited Activities',
        body: 'The following are prohibited:\n· Reverse-engineering or modifying the App\n· Unauthorized access or reverse-engineering\n· Infringing intellectual property rights\n· Transferring or redistributing the App to third parties',
        subsections: [],
      },
      {
        title: '4. Disclaimer',
        body: 'The App is provided "as is." Calorie targets, nutritional goals, and body composition estimates are general reference values and do not substitute medical advice or treatment. The developer is not liable for any damages arising from use of the App.',
        subsections: [],
      },
      {
        title: '5. Data Loss',
        body: 'App data is stored locally on your device. We are not responsible for data loss due to app deletion, device failure, or OS updates. Please back up important data separately.',
        subsections: [],
      },
      {
        title: '6. Service Changes',
        body: 'The developer may change, add, remove, or discontinue service features at any time without notice.',
        subsections: [],
      },
      {
        title: '7. Changes to Terms',
        body: 'These Terms may be updated without prior notice. Material changes will be announced within the App.',
        subsections: [],
      },
      {
        title: '8. Governing Law',
        body: 'These Terms are governed by the laws of Japan. Any disputes shall be subject to the exclusive jurisdiction of the Tokyo District Court.',
        subsections: [],
      },
      {
        title: '9. Contact',
        body: 'For inquiries about these Terms, please contact contact@akizony.com.',
        subsections: [],
      },
    ],
  },
} as const;

export default function TermsRoute() {
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
          <ScrollView contentContainerStyle={styles.scroll} testID="terms-screen">
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
