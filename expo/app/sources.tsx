import { Stack } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CALCULATION_SECTIONS } from '@/constants/calculation-sources';
import {
  Body,
  Icon,
  SettingsDivider,
  SettingsLinkRow,
  SettingsListCard,
  SettingsSectionLabel,
  useTheme,
} from '@/design-system';
import { useT } from '@/hooks/useT';

/**
 * 計算の根拠と出典 (App Store Guideline 1.4.1)。
 * 設定 > 情報 / ステータスの目標カード / 目標の変更 / オンボーディングの提案画面 から辿れる。
 */
export default function SourcesRoute() {
  const theme = useTheme();
  const t = useT();

  const openLink = (url: string) => {
    Linking.openURL(url).catch((e) => console.warn('[sources] failed to open URL', e));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('nav.sources'),
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="sources-screen">
            <View style={styles.section}>
              <Body tone="secondary">{t('sources.intro')}</Body>
              <Body size="sm" tone="secondary">{t('sources.disclaimer')}</Body>
            </View>

            {CALCULATION_SECTIONS.map((section) => (
              <View key={section.key} style={styles.section}>
                <SettingsSectionLabel>{t(`sources.sections.${section.key}.title`)}</SettingsSectionLabel>
                <Body size="sm" tone="secondary">{t(`sources.sections.${section.key}.body`)}</Body>
                <SettingsListCard>
                  {section.refs.map((ref, i) => (
                    <React.Fragment key={ref.title}>
                      {i > 0 ? <SettingsDivider /> : null}
                      <SettingsLinkRow
                        label={ref.title}
                        sub={ref.detail}
                        onPress={ref.url ? () => openLink(ref.url!) : undefined}
                        showChevron={false}
                        trailing={
                          ref.url ? (
                            <Icon name="externalLink" size={16} color={theme.colors.content.tertiary} />
                          ) : undefined
                        }
                        testID={`sources-ref-${section.key}-${i}`}
                      />
                    </React.Fragment>
                  ))}
                </SettingsListCard>
              </View>
            ))}
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
