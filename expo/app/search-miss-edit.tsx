/**
 * 見つからなかった食品の1行を直す / 消すシート (ネイティブ formSheet)。`/search-miss-edit?q=元の言葉`
 * 2026-10-18: search-misses.tsx の中央 Dialog から移行。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Caption, NumberField, SheetScreen, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import { MAX_MISS_COUNT, MIN_MISS_QUERY_LENGTH, sortedSearchMisses } from '@/utils/diagnostics';

export default function SearchMissEditRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { settings, editSearchMissEvent, removeSearchMissEvent } = useAppState();
  const { q: originalQ = '' } = useLocalSearchParams<{ q?: string }>();
  const initialCount = useMemo(
    () => sortedSearchMisses(settings.diagnostics).find((m) => m.q === originalQ)?.count ?? 1,
    // 開いた時点の回数で初期化する (編集中に回数が増えても入力欄を書き換えない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalQ],
  );
  const [q, setQ] = useState(originalQ);
  const [count, setCount] = useState(String(initialCount));
  const canSave = q.trim().length >= MIN_MISS_QUERY_LENGTH;

  const save = () => {
    if (!canSave) return;
    editSearchMissEvent(originalQ, { q, count: Number.parseInt(count, 10) });
    router.back();
  };

  const remove = () => {
    removeSearchMissEvent(originalQ);
    router.back();
  };

  return (
    <SheetScreen
      title={t('searchMisses.editTitle')}
      cancelLabel={t('common.cancel')}
      confirmAction={{ label: t('searchMisses.editSave'), onPress: save, disabled: !canSave }}
      testID="search-misses-edit"
    >
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
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          maxLength={40}
          returnKeyType="done"
          testID="search-misses-edit-word"
        />
      </View>
      <View style={styles.field}>
        <Caption tone="secondary">{t('searchMisses.editCount')}</Caption>
        <NumberField
          value={count}
          onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, String(MAX_MISS_COUNT).length))}
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
        onPress={remove}
        testID="search-misses-edit-delete"
      />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fs.lg,
  },
});
