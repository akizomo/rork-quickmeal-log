/**
 * SettingsList — SettingsSectionLabel / SettingsListCard / SettingsLinkRow / SettingsDivider のショーケース。DEV 専用。
 */

import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import {
  SettingsDivider,
  SettingsLinkRow,
  SettingsListCard,
  SettingsSectionLabel,
  useTheme,
} from '@/design-system';
import { Section } from '../_shared';

export default function SettingsListScreen() {
  const t = useTheme();
  const [toggle, setToggle] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: 'SettingsList' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <Section title="SettingsList" t={t}>
          {/* 基本パターン: SectionLabel + Card + 複数行 */}
          <View style={{ gap: t.spacing['2'] }}>
            <SettingsSectionLabel>アカウント</SettingsSectionLabel>
            <SettingsListCard>
              <SettingsLinkRow label="プロフィール" onPress={() => {}} />
              <SettingsDivider />
              <SettingsLinkRow label="メールアドレス" sub="user@example.com" onPress={() => {}} />
              <SettingsDivider />
              <SettingsLinkRow label="パスワード変更" onPress={() => {}} />
            </SettingsListCard>
          </View>

          {/* trailing: Switch */}
          <View style={{ gap: t.spacing['2'] }}>
            <SettingsSectionLabel>通知</SettingsSectionLabel>
            <SettingsListCard>
              <SettingsLinkRow
                label="プッシュ通知"
                showChevron={false}
                trailing={
                  <Switch
                    value={toggle}
                    onValueChange={setToggle}
                    trackColor={{ true: t.colors.action.primary.default }}
                  />
                }
              />
            </SettingsListCard>
          </View>

          {/* destructive */}
          <View style={{ gap: t.spacing['2'] }}>
            <SettingsSectionLabel>データ</SettingsSectionLabel>
            <SettingsListCard>
              <SettingsLinkRow label="データをエクスポート" onPress={() => {}} />
              <SettingsDivider />
              <SettingsLinkRow label="アカウントを削除" destructive onPress={() => {}} />
            </SettingsListCard>
          </View>

          {/* chevron なし・外部リンク想定 */}
          <View style={{ gap: t.spacing['2'] }}>
            <SettingsSectionLabel>情報</SettingsSectionLabel>
            <SettingsListCard>
              <SettingsLinkRow label="バージョン" sub="1.0.0" showChevron={false} />
              <SettingsDivider />
              <SettingsLinkRow label="プライバシーポリシー" onPress={() => {}} />
              <SettingsDivider />
              <SettingsLinkRow label="利用規約" onPress={() => {}} />
            </SettingsListCard>
          </View>
        </Section>
      </ScrollView>
    </>
  );
}
