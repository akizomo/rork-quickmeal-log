import { Stack } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Caption, Dialog, Label, NumberField, useTheme } from '@/design-system';
import { SettingsDivider, SettingsListCard } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import {
  buildSearchMissShareText,
  MAX_MISS_COUNT,
  MIN_MISS_QUERY_LENGTH,
  sortedSearchMisses,
} from '@/utils/diagnostics';

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
  const { settings, resetDiagnostics, editSearchMissEvent, removeSearchMissEvent } = useAppState();

  // 編集中の行。originalQ は元の言葉 (言葉を直しても元の行を特定できるように別に持つ)
  const [editing, setEditing] = useState<{ originalQ: string; q: string; count: string } | null>(null);

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

  const closeEdit = useCallback(() => setEditing(null), []);

  const handleSave = useCallback(() => {
    if (!editing) return;
    editSearchMissEvent(editing.originalQ, {
      q: editing.q,
      count: Number.parseInt(editing.count, 10),
    });
    setEditing(null);
  }, [editing, editSearchMissEvent]);

  const handleDelete = useCallback(() => {
    if (!editing) return;
    removeSearchMissEvent(editing.originalQ);
    setEditing(null);
  }, [editing, removeSearchMissEvent]);

  const canSave = editing !== null && editing.q.trim().length >= MIN_MISS_QUERY_LENGTH;

  return (
    <>
      <Stack.Screen options={{ title: t('nav.searchMisses') }} />
      <View style={[styles.page, { backgroundColor: theme.colors.surface.default }]}>
        <SafeAreaView style={styles.page} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Body tone="secondary">{t('searchMisses.lead')}</Body>
            {misses.length > 0 ? <Caption tone="secondary">{t('searchMisses.editHint')}</Caption> : null}

            {misses.length === 0 ? (
              <Body tone="secondary" testID="search-misses-empty">{t('searchMisses.empty')}</Body>
            ) : (
              <SettingsListCard>
                {misses.map((m, i) => (
                  <View key={m.q}>
                    {i > 0 ? <SettingsDivider /> : null}
                    <Pressable
                      style={styles.row}
                      onPress={() => setEditing({ originalQ: m.q, q: m.q, count: String(m.count) })}
                      accessibilityRole="button"
                      accessibilityHint={t('searchMisses.editHint')}
                      testID={`search-miss-row-${i}`}
                    >
                      <Label style={styles.word}>{m.q}</Label>
                      <Caption tone="secondary">{t('searchMisses.count', { count: m.count })}</Caption>
                    </Pressable>
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

      {/* TextInput を含むので Dialog (CLAUDE.md: auto-focus しない入力 Dialog は BottomSheet 化しない) */}
      <Dialog
        visible={editing !== null}
        onClose={closeEdit}
        title={t('searchMisses.editTitle')}
        primaryAction={{ label: t('searchMisses.editSave'), onPress: handleSave, disabled: !canSave }}
        secondaryAction={{ label: t('common.cancel'), onPress: closeEdit }}
        testID="search-misses-edit"
      >
        <View style={styles.editBody}>
          <View style={styles.field}>
            <Caption tone="secondary">{t('searchMisses.editWord')}</Caption>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.content.primary,
                  borderColor: theme.colors.border.subtle,
                  backgroundColor: theme.colors.surface.sunken,
                },
              ]}
              value={editing?.q ?? ''}
              onChangeText={(q) => setEditing((e) => (e ? { ...e, q } : e))}
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
              testID="search-misses-edit-word"
            />
          </View>
          <View style={styles.field}>
            <Caption tone="secondary">{t('searchMisses.editCount')}</Caption>
            <NumberField
              value={editing?.count ?? ''}
              onChangeText={(v) =>
                setEditing((e) => (e ? { ...e, count: v.replace(/\D/g, '').slice(0, String(MAX_MISS_COUNT).length) } : e))
              }
              decimal={false}
              size="2xl"
              align="left"
              suffix={t('searchMisses.countUnit')}
              testID="search-misses-edit-count"
            />
          </View>
          <Button
            label={t('searchMisses.editDelete')}
            variant="ghost"
            onPress={handleDelete}
            testID="search-misses-edit-delete"
          />
        </View>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  word: { flex: 1 },
  actions: { gap: 8 },
  editBody: { gap: 16 },
  field: { gap: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fs.lg,
  },
});
