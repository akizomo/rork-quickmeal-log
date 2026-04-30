import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, Heading, useTheme } from '@/design-system';

export default function TermsRoute() {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen
        options={{
          title: '利用規約',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="terms-screen">
            <Caption tone="tertiary">最終更新日: 2026-04-28</Caption>

            <Body>
              本利用規約 (以下「本規約」) は、Hachibu (以下「本アプリ」) の利用条件を定めるものです。本アプリをダウンロード・使用することで、本規約に同意したものとみなします。
            </Body>

            <Section title="1. サービス内容">
              <Body>
                本アプリは、食事記録・体重管理・目標設定の支援を目的とした個人向けツールです。本アプリの提供する情報・推奨は **医学的助言ではありません**。健康に関する判断は医師等の専門家にご相談ください。
              </Body>
            </Section>

            <Section title="2. サブスクリプション">
              <SubSection title="2.1 無料体験">
                新規ユーザーには 7日間 の無料体験期間を提供します。期間終了前に解約すれば課金は発生しません。
              </SubSection>
              <SubSection title="2.2 有料プラン">
                月額プラン: ¥480 / 月{'\n'}
                年額プラン: ¥4,800 / 年{'\n\n'}
                価格は予告なく変更される場合があります。変更前に購読中のユーザーには事前通知します。
              </SubSection>
              <SubSection title="2.3 自動更新">
                購読は期間終了の24時間前までに解約しない限り、自動更新されます。解約は Apple ID / Google アカウントの設定から行ってください。
              </SubSection>
              <SubSection title="2.4 返金">
                返金は Apple / Google の返金ポリシーに従います。本アプリは独自の返金対応を行いません。
              </SubSection>
            </Section>

            <Section title="3. 禁止事項">
              <Body>
                以下の行為を禁止します:{'\n'}
                · 本アプリの逆コンパイル・改変{'\n'}
                · 不正アクセス、リバースエンジニアリング{'\n'}
                · 知的財産権の侵害{'\n'}
                · 第三者への譲渡、再配布
              </Body>
            </Section>

            <Section title="4. 免責事項">
              <Body>
                本アプリは「現状有姿」で提供されます。提案するカロリー・栄養目標・体型分類は **一般的な参考値** であり、医学的助言や治療を代替するものではありません。本アプリの利用によって生じた損害について、開発者は責任を負いません。
              </Body>
            </Section>

            <Section title="5. データ消失">
              <Body>
                本アプリのデータは端末内に保存されます。アプリの削除・端末故障・OS更新等により消失した場合の補償は行いません。重要なデータは別途バックアップを取ってください。
              </Body>
            </Section>

            <Section title="6. サービスの変更・終了">
              <Body>
                開発者は予告なくサービス内容の変更、機能追加・削除、または提供終了を行うことができます。
              </Body>
            </Section>

            <Section title="7. 規約の変更">
              <Body>
                本規約は予告なく変更されることがあります。重要な変更は本アプリ内で通知します。
              </Body>
            </Section>

            <Section title="8. 準拠法・管轄">
              <Body>
                本規約は日本法に準拠し、本規約に関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </Body>
            </Section>

            <Section title="9. お問い合わせ">
              <Body>
                本規約に関するお問い合わせは、contact@akizony.com までご連絡ください。
              </Body>
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
