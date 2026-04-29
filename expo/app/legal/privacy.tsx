import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, Heading, useTheme } from '@/design-system';

export default function PrivacyRoute() {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen
        options={{
          title: 'プライバシーポリシー',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="privacy-screen">
            <Caption tone="tertiary">最終更新日: 2026-04-28</Caption>

            <Body>
              Hachibu (以下「本アプリ」) は、ユーザーのプライバシーを尊重します。本ポリシーは、本アプリが収集する情報、利用目的、および管理方法について説明します。
            </Body>

            <Section title="1. 収集する情報">
              <SubSection title="1.1 ユーザー入力情報">
                本アプリは、以下の情報をユーザーが入力した時点で **端末内のローカルストレージにのみ** 保存します:{'\n'}
                · 身長、体重、年齢、性別基準{'\n'}
                · 食事ログ (食材・料理・量・時刻){'\n'}
                · 体重・体脂肪率の記録{'\n'}
                · 設定 (目標、運動習慣など){'\n\n'}
                これらの情報は **第三者サーバーに送信されません**。
              </SubSection>
              <SubSection title="1.2 サブスクリプション情報">
                有料プランの管理に RevenueCat を使用します。RevenueCat は購入の検証・管理のため、以下を取得します:{'\n'}
                · 匿名化されたユーザー識別子{'\n'}
                · 購入履歴{'\n'}
                · 端末プラットフォーム (iOS / Android){'\n\n'}
                詳細は RevenueCat のプライバシーポリシーをご確認ください。
              </SubSection>
              <SubSection title="1.3 課金情報">
                購入処理は Apple App Store / Google Play Store が直接行い、本アプリはクレジットカード情報を取得しません。
              </SubSection>
            </Section>

            <Section title="2. 第三者への提供">
              <Body>本アプリは、ユーザーの個人情報を第三者に販売・提供しません。</Body>
            </Section>

            <Section title="3. データの削除">
              <Body>アプリを削除すると、端末内のすべてのデータが消去されます。</Body>
            </Section>

            <Section title="4. クッキー / トラッキング">
              <Body>
                本アプリはトラッキング目的のクッキー、IDFA、第三者解析ツールを使用しません。
              </Body>
            </Section>

            <Section title="5. 子どものプライバシー">
              <Body>本アプリは13歳未満のお子様を対象としていません。</Body>
            </Section>

            <Section title="6. ポリシーの変更">
              <Body>
                本ポリシーは予告なく変更されることがあります。重要な変更は、本アプリ内で通知します。
              </Body>
            </Section>

            <Section title="7. お問い合わせ">
              <Body>本ポリシーに関するお問い合わせは、本アプリの開発者までご連絡ください。</Body>
            </Section>
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
      <Body weight="bold">{title}</Body>
      <Body>{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 40, gap: 16 },
  section: { gap: 8 },
  subSection: { gap: 4 },
});
