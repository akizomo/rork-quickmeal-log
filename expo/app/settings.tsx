import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { Body, Caption, Card, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';

export default function SettingsRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, updateSettingsValues, resetOnboarding } = useAppState();

  const confirmReset = () => {
    Alert.alert(
      'データをリセット',
      'プロフィール・目標・体重・体脂肪・食事ログなど、この端末に保存されているすべてのデータが消去されます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセットする',
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            router.replace('/intro');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '設定',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="settings-screen">

            {/* §ハプティクス */}
            <View style={styles.section}>
              <SettingsSectionLabel>ハプティクス</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="ハプティクス"
                  showChevron={false}
                  trailing={
                    <Switch
                      value={settings.hapticsEnabled}
                      onValueChange={(value) => updateSettingsValues({ hapticsEnabled: value })}
                      testID="settings-haptics-switch"
                    />
                  }
                />
              </SettingsListCard>
            </View>

            {/* §データ */}
            <View style={styles.section}>
              <SettingsSectionLabel>データ</SettingsSectionLabel>
              <Card variant="raised" style={{ gap: theme.spacing['2'] }}>
                <Body weight="bold">データの保存について</Body>
                <Caption tone="secondary">
                  Hachibu はアカウント不要で使えるかわりに、記録したデータはこの端末内にのみ保存されます。アプリを削除したり、機種変更すると食事ログ・体重・体脂肪率などのデータは失われます。
                </Caption>
                <Caption tone="tertiary">
                  サブスクリプションは Apple ID / Google アカウントに紐付くため、再インストール時に「購入を復元」から再開できます。
                </Caption>
              </Card>
              <SettingsListCard>
                <SettingsLinkRow
                  label="データをリセット"
                  destructive
                  showChevron={false}
                  onPress={confirmReset}
                  testID="settings-reset-data"
                />
              </SettingsListCard>
            </View>

            {/* §情報 */}
            <View style={styles.section}>
              <SettingsSectionLabel>情報</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="アプリについて"
                  onPress={() => router.push('/about')}
                  testID="settings-link-about"
                />
              </SettingsListCard>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 18, gap: 22, paddingBottom: 40 },
  section: { gap: 6 },
});
