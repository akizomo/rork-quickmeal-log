/**
 * SHEET_MIGRATION.md Phase 0 — formSheet 移行のスパイク (使い捨て)。
 * テストビルド (PAYWALL_SKIP_ENABLED) の 設定 > 開発者向け から開く。
 * 各画面で確認した結果を docs/SHEET_MIGRATION.md §6 の判定表に記入する。
 */
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { Body, Button, Label, SettingsLinkRow, SettingsListCard, SettingsSectionLabel, useTheme } from '@/design-system';

export default function SpikeIndex() {
  const router = useRouter();
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Sheet spike' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['6'] }}
      >
        <Body size="sm" tone="secondary">
          ネイティブ formSheet / 下層検索ページの挙動確認用。結果は SHEET_MIGRATION.md §6 に記入。
        </Body>
        <View style={{ gap: t.spacing['2'] }}>
          <SettingsSectionLabel>シート</SettingsSectionLabel>
          <SettingsListCard>
            <SettingsLinkRow
              label="A. 小シート (fitToContents + 入力)"
              sub="体重入力相当。キーボード追従・自動フォーカス"
              onPress={() => router.push('/spike/small-sheet')}
            />
            <SettingsLinkRow
              label="B. 背の高いシート (detent 50%/100%)"
              sub="IdentityLogSheet 相当。flex レイアウト・固定フッター・スクロール"
              onPress={() => router.push('/spike/tall-sheet')}
            />
          </SettingsListCard>
        </View>
        <View style={{ gap: t.spacing['2'] }}>
          <SettingsSectionLabel>ページ</SettingsSectionLabel>
          <SettingsListCard>
            <SettingsLinkRow
              label="C. 下層の検索ページ"
              sub="ナビゲーションバーの検索フィールド → 選択でシート B"
              onPress={() => router.push('/spike/search')}
            />
          </SettingsListCard>
        </View>
        <View style={{ gap: t.spacing['2'] }}>
          <Label size="sm">比較用 (いまの実装)</Label>
          <Body size="sm" tone="secondary">
            ホームの 🔍 検索シート / 食品ボタン長押しのシートと見比べる。
          </Body>
          <Button label="ホームへ戻る" variant="ghost" onPress={() => router.dismissAll()} />
        </View>
      </ScrollView>
    </>
  );
}
