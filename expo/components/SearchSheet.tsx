/**
 * SearchSheet — Identity 検索ボトムシート (SEARCH_SPEC v0.3 §F1–F5)
 *
 * 動線:
 *   QuickLogSection の 🔍 ボタン → SearchSheet 表示
 *   → Identity 選択 → IdentityLogSheet (onDismiss で検索に戻る)
 *   → フッター「数値で入力する」→ DirectInputSheet
 *
 * 0件ヒット時: カテゴリヒントチップ (§F5a) を最大4件表示。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  Body,
  BottomSheet,
  Caption,
  Chip,
  Icon,
  IconButton,
  Label,
  Overline,
  useTheme,
} from '@/design-system';
import { DirectInputSheet } from '@/components/DirectInputSheet';
import { getBucketDef } from '@/constants/identity';
import { useAppState } from '@/providers/app-state-provider';
import {
  getCategoryHints,
  searchIdentitiesFuzzy,
  type IdentitySearchResult,
} from '@/utils/identity-search';
import type { BucketKey, Identity } from '@/types/identity';

const DEBOUNCE_MS = 180;
const MAX_RESULTS = 8;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called to re-open this sheet (e.g. after IdentityLogSheet dismiss). */
  onOpen: () => void;
};

export function SearchSheet({ visible, onClose, onOpen }: Props) {
  const t = useTheme();
  const { openIdentityLogSheet } = useAppState();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [directInputOpen, setDirectInputOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Focus input when sheet opens; clear query when it closes
  useEffect(() => {
    if (visible) {
      const id = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(id);
    } else {
      setQuery('');
      setDebounced('');
    }
  }, [visible]);

  // Debounce
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const results = useMemo<IdentitySearchResult[]>(() => {
    if (debounced.trim().length === 0) return [];
    return searchIdentitiesFuzzy(debounced).slice(0, MAX_RESULTS);
  }, [debounced]);

  const categoryHints = useMemo<BucketKey[]>(() => {
    if (debounced.trim().length === 0 || results.length > 0) return [];
    return getCategoryHints(debounced);
  }, [debounced, results.length]);

  const handleSelect = useCallback(
    (identity: Identity) => {
      Keyboard.dismiss();
      onClose(); // hide search sheet
      openIdentityLogSheet(identity.primaryHome.bucket, {
        identityId: identity.id,
        onDismiss: onOpen, // re-open search sheet if user cancels
      });
    },
    [onClose, onOpen, openIdentityLogSheet]
  );

  const handleCategoryHint = useCallback(
    (bucket: BucketKey) => {
      Keyboard.dismiss();
      onClose();
      openIdentityLogSheet(bucket, { onDismiss: onOpen });
    },
    [onClose, onOpen, openIdentityLogSheet]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebounced('');
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const isEmpty = debounced.trim().length === 0;
  const hasResults = results.length > 0;
  const hasHints = categoryHints.length > 0;
  const noMatch = !isEmpty && !hasResults && !hasHints;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title="食品を検索"
        testID="search-sheet"
      >
        {/* 検索バー */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: t.colors.surface.raised,
              borderRadius: t.radius.md,
              paddingHorizontal: t.spacing['3'],
              marginBottom: t.spacing['4'],
            },
          ]}
        >
          <Icon name="search" size={18} color={t.colors.content.secondary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="例: アボカド、チキン、ラーメン"
            placeholderTextColor={t.colors.content.tertiary}
            style={[
              styles.searchInput,
              { color: t.colors.content.primary, fontSize: t.typography.fontSize.md },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            testID="search-input"
          />
          {query.length > 0 ? (
            <IconButton
              icon="close"
              size="sm"
              onPress={handleClear}
              accessibilityLabel="検索をクリア"
            />
          ) : null}
        </View>


        {/* 検索結果 */}
        {hasResults ? (
          <View style={styles.resultList}>
            {results.map(({ identity }) => {
              const bucket = getBucketDef(identity.primaryHome.bucket);
              return (
                <Pressable
                  key={identity.id}
                  onPress={() => handleSelect(identity)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    {
                      paddingVertical: t.spacing['3'],
                      paddingHorizontal: t.spacing['2'],
                      borderRadius: t.radius.sm,
                      backgroundColor: pressed ? t.colors.surface.raised : 'transparent',
                    },
                  ]}
                  testID={`search-result-${identity.id}`}
                >
                  <Body>{identity.label}</Body>
                  {bucket ? (
                    <Caption tone="secondary">
                      {bucket.emoji} {bucket.label}
                    </Caption>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* カテゴリヒント (0件フォールバック) */}
        {hasHints ? (
          <View style={{ gap: t.spacing['3'] }}>
            <Overline tone="secondary">このカテゴリかも</Overline>
            <View style={styles.hintChips}>
              {categoryHints.map((bucket) => {
                const def = getBucketDef(bucket);
                if (!def) return null;
                return (
                  <Chip
                    key={bucket}
                    label={`${def.emoji} ${def.label}`}
                    onPress={() => handleCategoryHint(bucket)}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {/* 完全0件 */}
        {noMatch ? (
          <Body tone="secondary" style={{ textAlign: 'center', paddingVertical: t.spacing['4'] }}>
            見つかりませんでした
          </Body>
        ) : null}

        {/* 数値で入力する — 常設テキストリンク (最終手段、目立たせない) */}
        <View style={{ marginTop: t.spacing['5'], flexDirection: 'row', alignItems: 'center', gap: t.spacing['1'] }}>
          <Body size="sm" tone="secondary">食品が見つかりませんか？</Body>
          <Pressable
            onPress={() => setDirectInputOpen(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="数値で直接入力する"
          >
            <Label size="sm" tone="link">数値で入力する</Label>
          </Pressable>
        </View>
      </BottomSheet>

      <DirectInputSheet
        visible={directInputOpen}
        onClose={() => setDirectInputOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  resultList: {
    gap: 0,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hintChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
