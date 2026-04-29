import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/components/SettingsList';
import { LEGAL_LINKS } from '@/constants/onboarding';
import { Body, Caption, useTheme } from '@/design-system';

export default function AboutRoute() {
  const theme = useTheme();
  const router = useRouter();

  const openLink = (path: string) => {
    router.push(path as never);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber ?? '1'
      : String(Constants.expoConfig?.android?.versionCode ?? '1');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'アプリについて',
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="about-screen">

            {/* ブランドヘッダー */}
            <View style={styles.brandHeader}>
              <Logo size={48} color={theme.colors.action.primary.default} />
              <Body style={{ fontWeight: '700' }}>Hachibu</Body>
              <Caption tone="tertiary">Eight Tenths is Enough.</Caption>
            </View>

            {/* §法的情報 */}
            <View style={styles.section}>
              <SettingsSectionLabel>法的情報</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="利用規約"
                  onPress={() => openLink(LEGAL_LINKS.terms)}
                  testID="about-link-terms"
                />
                <SettingsDivider />
                <SettingsLinkRow
                  label="プライバシーポリシー"
                  onPress={() => openLink(LEGAL_LINKS.privacy)}
                  testID="about-link-privacy"
                />
              </SettingsListCard>
            </View>

            {/* §バージョン */}
            <View style={styles.section}>
              <SettingsSectionLabel>バージョン</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label="バージョン"
                  sub={`${version} (${buildNumber})`}
                  showChevron={false}
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
  brandHeader: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  section: { gap: 6 },
});
