import { Stack } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Caption, Label, useTheme } from '@/design-system';
import { SettingsDivider, SettingsListCard } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { buildSearchMissShareText, sortedSearchMisses } from '@/utils/diagnostics';

/**
 * 見つからなかった食品 — 検索で見つからなかった言葉の一覧と、共有の入口。
 *
 * クローズドテストでは `/dev/diagnostics` が本番ビルドから開けず、端末に貯めた未ヒット語を誰も
 * 取り出せなかった。ここは一般の画面として、**ユーザーが押したときだけ**共有できるようにする。
 * 共有されるのは画面に出ている言葉と回数だけ (食事の記録は含まない)。自動送信はしない。
 */
export default function SearchMissesRoute() {
  const theme = useTheme();
  const t = useT();
  const { settings, resetDiagnostics } = useAppState();

  const misses = useMemo(() => sortedSearchMisses(settings.diagnostics), [settings.diagnostics]);

  const handleShare = useCallback(() => {
    const message = buildSearchMissShareText(settings.diagnostics, new Date().toISOString());
    void Share.share({ message });
  }, [settings.diagnostics]);

  const handleReset = useCallback(() => {
    Alert.alert(t('searchMisses.resetTitle'), t('searchMisses.resetMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('searchMisses.reset'), style: 'destructive', onPress: () => resetDiagnostics() },
    ]);
  }, [resetDiagnostics, t]);

  return (
    <>
      <Stack.Screen options={{ title: t('nav.searchMisses') }} />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView style={styles.page} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Body tone="secondary">{t('searchMisses.lead')}</Body>

            {misses.length === 0 ? (
              <Body tone="secondary" testID="search-misses-empty">{t('searchMisses.empty')}</Body>
            ) : (
              <SettingsListCard>
                {misses.map((m, i) => (
                  <View key={m.q}>
                    {i > 0 ? <SettingsDivider /> : null}
                    <View style={styles.row}>
                      <Label style={styles.word}>{m.q}</Label>
                      <Caption tone="secondary">{t('searchMisses.count', { count: m.count })}</Caption>
                    </View>
                  </View>
                ))}
              </SettingsListCard>
            )}

            <Caption tone="secondary">{t('searchMisses.privacy')}</Caption>

            <View style={styles.actions}>
              <Button
                label={t('searchMisses.share')}
                onPress={handleShare}
                disabled={misses.length === 0}
                testID="search-misses-share"
              />
              <Button
                label={t('searchMisses.reset')}
                variant="ghost"
                onPress={handleReset}
                disabled={misses.length === 0}
                testID="search-misses-reset"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  word: { flex: 1 },
  actions: { gap: 8 },
});
