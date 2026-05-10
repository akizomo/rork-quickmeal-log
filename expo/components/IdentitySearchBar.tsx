/**
 * IdentitySearchBar — マルチエントランス検索バー (Phase 4).
 *
 * ユーザーがバケットを跨いで Identity を検索できる。primary Home 以外でも
 * `searchableFrom` / `searchTags` でヒット可能。タップで該当 Identity の
 * primary home バケットの IdentityLogSheet を pre-select した状態で開く。
 *
 * Spec: docs/IA-identity-spec.md §4
 */

import { Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Body, Caption, useTheme } from '@/design-system';
import {
  getBucketDef,
  searchIdentities,
} from '@/constants/identity';
import { Identity } from '@/types/identity';
import { useAppState } from '@/providers/app-state-provider';

const DEBOUNCE_MS = 200;
const MAX_RESULTS = 8;

export function IdentitySearchBar() {
  const t = useTheme();
  const { openIdentityLogSheet } = useAppState();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce input → search query
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const results = useMemo<Identity[]>(() => {
    if (debounced.trim().length === 0) return [];
    return searchIdentities(debounced).slice(0, MAX_RESULTS);
  }, [debounced]);

  const handleSelect = useCallback(
    (identity: Identity) => {
      openIdentityLogSheet(identity.primaryHome.bucket, { identityId: identity.id });
      setQuery('');
      setDebounced('');
    },
    [openIdentityLogSheet]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebounced('');
  }, []);

  return (
    <View style={styles.wrapper} testID="identity-search-bar">
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: t.colors.surface.raised,
            borderRadius: t.radius.lg,
            paddingHorizontal: t.spacing['3'],
          },
        ]}
      >
        <Search size={18} color={t.colors.content.secondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="食品名で検索 (例: アボカド, プロテイン)"
          placeholderTextColor={t.colors.content.tertiary}
          style={[styles.input, { color: t.colors.content.primary }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          testID="identity-search-input"
        />
        {query.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={10} accessibilityLabel="検索をクリア">
            <X size={16} color={t.colors.content.secondary} />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 ? (
        <View
          style={[
            styles.results,
            {
              backgroundColor: t.colors.surface.default,
              borderRadius: t.radius.lg,
              marginTop: t.spacing['2'],
            },
          ]}
        >
          {results.map((id) => {
            const home = getBucketDef(id.primaryHome.bucket);
            return (
              <Pressable
                key={id.id}
                onPress={() => handleSelect(id)}
                style={({ pressed }) => [
                  styles.resultRow,
                  {
                    paddingHorizontal: t.spacing['4'],
                    paddingVertical: t.spacing['3'],
                    backgroundColor: pressed ? t.colors.surface.sunken : 'transparent',
                  },
                ]}
                testID={`identity-search-result-${id.id}`}
              >
                <Body>{id.label}</Body>
                {home ? (
                  <Caption tone="tertiary">
                    {home.emoji} {home.label}
                  </Caption>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  results: {
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
