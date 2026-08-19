import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';

import { SettingsDivider, SettingsLinkRow, SettingsListCard, SettingsSectionLabel } from '@/design-system';
import { Body, Icon, Label, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import { useUnitSystem } from '@/hooks/useUnitSystem';
import { widgetRequestPin } from '@/utils/widget-bridge';

const THEME_OPTION_KEYS: ('system' | 'light' | 'dark')[] = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS: { key: 'ja' | 'en-US'; label: string }[] = [
  { key: 'ja', label: '日本語' }, // i18n-ignore: language option always shown in its own language
  { key: 'en-US', label: 'English (US)' },
];
const REGION_OPTIONS: { key: 'ja' | 'en-US'; labelKey: string }[] = [
  { key: 'ja', labelKey: 'settings.region.ja' },
  { key: 'en-US', labelKey: 'settings.region.enUS' },
];

export default function SettingsRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { settings, updateSettingsValues, resetOnboarding } = useAppState();
  const { uiLanguage, foodRegion, setUiLanguage, setFoodRegion } = useLocale();
  const { unitSystem, setUnitSystem } = useUnitSystem();

  const THEME_OPTIONS = THEME_OPTION_KEYS.map((key) => ({
    key,
    label: t(`settings.theme.${key}`),
  }));

  const confirmReset = () => {
    Alert.alert(
      t('settings.data.resetTitle'),
      t('settings.data.resetMessage'),
      [
        { text: t('settings.data.resetCancel'), style: 'cancel' },
        {
          text: t('settings.data.resetConfirm'),
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
          title: t('nav.settings'),
          headerStyle: { backgroundColor: theme.colors.surface.default },
          headerTintColor: theme.colors.content.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} testID="settings-screen">

            {/* §テーマ */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('settings.theme.title')}</SettingsSectionLabel>
              <SettingsListCard>
                {THEME_OPTIONS.map((option, i) => {
                  const selected = (settings.themePreference ?? 'system') === option.key;
                  return (
                    <React.Fragment key={option.key}>
                      {i > 0 ? <SettingsDivider /> : null}
                      <SettingsLinkRow
                        label={option.label}
                        showChevron={false}
                        onPress={() => updateSettingsValues({ themePreference: option.key })}
                        trailing={
                          selected ? <Icon name="check" size={18} color={theme.colors.action.text.default} /> : null
                        }
                        testID={`settings-theme-option-${option.key}`}
                      />
                    </React.Fragment>
                  );
                })}
              </SettingsListCard>
            </View>

            {/* §言語 / Language */}
            <View style={styles.section}>
              <SettingsSectionLabel>{`${t('settings.language.title')} / Language`}</SettingsSectionLabel>
              <SettingsListCard>
                {LANGUAGE_OPTIONS.map((option, i) => {
                  const selected = uiLanguage === option.key;
                  return (
                    <React.Fragment key={option.key}>
                      {i > 0 ? <SettingsDivider /> : null}
                      <SettingsLinkRow
                        label={option.label}
                        showChevron={false}
                        onPress={() => setUiLanguage(option.key)}
                        trailing={
                          selected ? <Icon name="check" size={18} color={theme.colors.action.text.default} /> : null
                        }
                        testID={`settings-language-option-${option.key}`}
                      />
                    </React.Fragment>
                  );
                })}
              </SettingsListCard>
            </View>

            {/* §食事DB地域 / Food Region */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('settings.region.title')}</SettingsSectionLabel>
              <SettingsListCard>
                {REGION_OPTIONS.map((option, i) => {
                  const selected = foodRegion === option.key;
                  return (
                    <React.Fragment key={option.key}>
                      {i > 0 ? <SettingsDivider /> : null}
                      <SettingsLinkRow
                        label={t(option.labelKey)}
                        showChevron={false}
                        onPress={() => setFoodRegion(option.key)}
                        trailing={
                          selected ? <Icon name="check" size={18} color={theme.colors.action.text.default} /> : null
                        }
                        testID={`settings-region-option-${option.key}`}
                      />
                    </React.Fragment>
                  );
                })}
              </SettingsListCard>
            </View>

            {/* §単位系 */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('settings.unitSystem.title')}</SettingsSectionLabel>
              <SettingsListCard>
                {(['metric', 'imperial'] as const).map((key, i) => (
                  <React.Fragment key={key}>
                    {i > 0 ? <SettingsDivider /> : null}
                    <SettingsLinkRow
                      label={t(`settings.unitSystem.${key}`)}
                      showChevron={false}
                      onPress={() => setUnitSystem(key)}
                      trailing={
                        unitSystem === key
                          ? <Icon name="check" size={18} color={theme.colors.action.text.default} />
                          : null
                      }
                      testID={`settings-unit-option-${key}`}
                    />
                  </React.Fragment>
                ))}
              </SettingsListCard>
            </View>

            {/* §ハプティクス */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('settings.haptics.title')}</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label={t('settings.haptics.label')}
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
              <SettingsSectionLabel>{t('settings.data.title')}</SettingsSectionLabel>
              <SettingsListCard>
                <View style={{ paddingVertical: 8, gap: 8 }}>
                  <Label>{t('settings.data.aboutLabel')}</Label>
                  <Body size="sm" tone="secondary">{t('settings.data.body1')}</Body>
                  <Body size="sm" tone="secondary">{t('settings.data.body2')}</Body>
                </View>
                <SettingsDivider />
                <SettingsLinkRow
                  label={t('settings.data.resetLabel')}
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
                <SettingsSectionLabel>{t('settings.widget.title')}</SettingsSectionLabel>
                <SettingsListCard>
                  <SettingsLinkRow
                    label={t('settings.widget.addLabel')}
                    showChevron={false}
                    onPress={() => { void widgetRequestPin(); }}
                  />
                </SettingsListCard>
              </View>
            )}

            {/* §情報 */}
            <View style={styles.section}>
              <SettingsSectionLabel>{t('settings.info.title')}</SettingsSectionLabel>
              <SettingsListCard>
                <SettingsLinkRow
                  label={t('settings.info.aboutApp')}
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
