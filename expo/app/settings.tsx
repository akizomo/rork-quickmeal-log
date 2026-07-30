import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { Body, Card, Label, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { widgetRequestPin } from '@/utils/widget-bridge';

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
                <Label>データの保存について</Label>
                <Body size="sm" tone="secondary">
                  Hachibu はアカウント不要で使えるかわりに、記録したデータはこの端末内にのみ保存されます。アプリを削除したり、機種変更すると食事ログ・体重・体脂肪率などのデータは失われます。
                </Body>
                <Body size="sm" tone="secondary">
                  サブスクリプションは Apple ID / Google アカウントに紐付くため、再インストール時に「購入を復元」から再開できます。
                </Body>
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

            {/* §ウィジェット (Android のみ) */}
            {Platform.OS === 'android' && (
              <View style={styles.section}>
                <SettingsSectionLabel>ウィジェット</SettingsSectionLabel>
                <SettingsListCard>
                  <SettingsLinkRow
                    label="ホーム画面ウィジェットを追加"
                    showChevron={false}
                    onPress={() => { void widgetRequestPin(); }}
                  />
                </SettingsListCard>
              </View>
            )}

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
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  section: { gap: 8 },
});
