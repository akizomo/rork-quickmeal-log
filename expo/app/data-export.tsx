import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Caption, Chip, Label, SelectCard, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import {
  buildExportCsv,
  countRows,
  type ExportFormat,
  type ExportPeriod,
} from '@/utils/data-export';

const PERIODS: (7 | 30 | 90 | 'all')[] = [7, 30, 90, 'all'];

/**
 * データを書き出す — 記録を CSV にして OS の共有シートへ渡す (PRD §6.9)。
 *
 * 他の AI や表計算に渡して振り返る用途。**ユーザーが押したときだけ**共有し、自動送信はしない。
 * 共有の入口は1つ: 共有シートに CSV ファイルを渡す。メール (添付)・ファイルに保存・Drive・AI アプリは
 * 共有シートの側で選べるので、メール専用の入口や宛先の入力は持たない。AI に貼る用にテキストでも渡せる。
 */
export default function DataExportRoute() {
  const theme = useTheme();
  const t = useT();
  const { logs, weights, bodyFatEntries, exerciseLogs, dailyActivities, settings } = useAppState();
  const [format, setFormat] = useState<ExportFormat>('food');
  // 週次ふり返りから来たときは、その週 (from〜to) に固定する。設定から来たときは期間を選べる
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const fixedWeek = params.from && params.to ? { from: params.from, to: params.to } : null;
  const [period, setPeriod] = useState<ExportPeriod>(fixedWeek ?? 30);

  const csv = useMemo(
    () =>
      buildExportCsv(
        format,
        { logs, weights, bodyFatEntries, exerciseLogs, dailyActivities: dailyActivities ?? [] },
        period,
        new Date(),
        settings.uiLanguage,
      ),
    [format, period, logs, weights, bodyFatEntries, exerciseLogs, dailyActivities, settings.uiLanguage],
  );
  const rows = countRows(csv);

  const periodLabel = (p: 7 | 30 | 90 | 'all') => t(p === 'all' ? 'dataExport.periodAll' : `dataExport.period${p}`);

  const handleShare = useCallback(() => {
    void Share.share({ message: csv });
  }, [csv]);

  // CSV を一時ファイルに書く (キャッシュ領域。OS が消してよい場所)。ファイル共有で使う
  const writeCsvFile = useCallback(async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const file = new File(Paths.cache, `hachibu-${format}-${stamp}.csv`);
    file.create({ overwrite: true });
    await file.write(csv);
    return file;
  }, [format, csv]);

  // ファイルで共有: 共有シートに CSV ファイルそのものを渡す。
  // メール (添付)・「ファイルに保存」・Drive・AI アプリなどは、この共有シートから選べる。
  const handleFile = useCallback(async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
      const file = await writeCsvFile();
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: t('dataExport.fileDialogTitle'),
      });
    } catch {
      Alert.alert(t('dataExport.fileFailedTitle'), t('dataExport.fileFailedMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('dataExport.share'), onPress: handleShare },
      ]);
    }
  }, [writeCsvFile, t, handleShare]);

  return (
    <>
      <Stack.Screen options={{ title: t('nav.dataExport') }} />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView style={styles.page} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Body tone="secondary">{t('dataExport.lead')}</Body>

            <View style={styles.group}>
              <Label>{t('dataExport.formatTitle')}</Label>
              <SelectCard
                label={t('dataExport.formatFood')}
                hint={t('dataExport.formatFoodSub')}
                selected={format === 'food'}
                onPress={() => setFormat('food')}
                testID="data-export-format-food"
              />
              <SelectCard
                label={t('dataExport.formatDaily')}
                hint={t('dataExport.formatDailySub')}
                selected={format === 'daily'}
                onPress={() => setFormat('daily')}
                testID="data-export-format-daily"
              />
            </View>

            <View style={styles.group}>
              <Label>{t('dataExport.periodTitle')}</Label>
              {fixedWeek ? (
                <Body tone="secondary" testID="data-export-fixed-week">
                  {t('dataExport.thisWeek', { from: fixedWeek.from, to: fixedWeek.to })}
                </Body>
              ) : (
              <View style={styles.chips}>
                {PERIODS.map((p) => (
                  <Chip
                    key={String(p)}
                    label={periodLabel(p)}
                    selected={period === p}
                    onPress={() => setPeriod(p)}
                    testID={`data-export-period-${p}`}
                  />
                ))}
              </View>
              )}
              <Caption tone="secondary" testID="data-export-rows">
                {rows > 0 ? t('dataExport.rows', { count: rows }) : t('dataExport.empty')}
              </Caption>
            </View>

            <Caption tone="secondary">{t('dataExport.privacy')}</Caption>
            <Caption tone="secondary">{t('dataExport.destinations')}</Caption>

            <View style={styles.group}>
              <Button
                label={t('dataExport.shareFile')}
                onPress={() => { void handleFile(); }}
                disabled={rows === 0}
                testID="data-export-file"
              />
              <Button
                label={t('dataExport.share')}
                variant="ghost"
                onPress={handleShare}
                disabled={rows === 0}
                testID="data-export-share"
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
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
