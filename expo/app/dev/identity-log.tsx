/**
 * Dev page — Identity-first IdentityLogSheet 動作確認用 (Phase 3-4 検証).
 *
 * 通常のアプリフローを介さずに QuickLogSection (新 sheet 起動) と
 * IdentitySearchBar を直接マウントして UI 動作を確認できる。
 */

import React from 'react';
import { ScrollView, View } from 'react-native';

import { Body, Caption, Heading, useTheme } from '@/design-system';
import { QuickLogSection } from '@/components/QuickLogSection';

export default function DevIdentityLog() {
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default, flex: 1 }}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['4'] }}
    >
      <Heading size="lg">Identity-first IA dev</Heading>
      <Caption tone="secondary">
        QuickLogSection (検索バー + 9ボタン) を直接表示。タップで IdentityLogSheet が開きます。
      </Caption>
      <View style={{ marginTop: t.spacing['3'] }}>
        <QuickLogSection />
      </View>
      <Body tone="secondary" style={{ marginTop: t.spacing['4'] }}>
        検証手順:
      </Body>
      <Caption tone="tertiary">
        1. 検索バーに「アボカド」「プロテイン」と入力 → ヒットを確認{'\n'}
        2. 9ボタンの 1 つをタップ → IdentityLogSheet が開く{'\n'}
        3. 鶏もも → 揚げ Style → 唐揚げ migration を確認{'\n'}
        4. ご飯 + 量 200g → 合計 312 kcal を確認{'\n'}
        5. ご飯 + Add-on 卵/納豆 → 合計が増えることを確認
      </Caption>
    </ScrollView>
  );
}
