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
  describeSearchEntry,
  getCategoryHints,
  searchEntriesFuzzy,
  type SearchEntry,
  type SearchEntryResult,
} from '@/utils/identity-search';
import type { BucketKey } from '@/types/identity';

const DEBOUNCE_MS = 180;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called to re-open this sheet (e.g. after IdentityLogSheet dismiss). */
  onOpen: () => void;
};

function resultKey(result: SearchEntryResult): string {
  const { identity, attribute, style } = result.entry;
  return `${identity.id}:${attribute?.key ?? ''}:${style?.key ?? ''}`;
}

function SearchResultRow({
  result,
  onPress,
}: {
  result: SearchEntryResult;
  onPress: (entry: SearchEntry) => void;
}) {
  const t = useTheme();
  const { label, identityLabel, bucketEmoji, bucketLabel } = describeSearchEntry(result.entry);
  return (
    <Pressable
      onPress={() => onPress(result.entry)}
      style={({ pressed }) => [
        styles.resultRow,
        {
          paddingVertical: t.spacing['3'],
          paddingHorizontal: t.spacing['2'],
          borderRadius: t.radius.sm,
          backgroundColor: pressed ? t.colors.surface.raised : 'transparent',
        },
      ]}
      testID={`search-result-${resultKey(result)}`}
    >
      <Body>{label}</Body>
      <Caption tone="secondary">
        {identityLabel ? `${identityLabel} · ` : ''}
        {bucketEmoji ? `${bucketEmoji} ${bucketLabel}` : ''}
      </Caption>
    </Pressable>
  );
}

export function SearchSheet({ visible, onClose, onOpen }: Props) {
  const t = useTheme();
  const { openIdentityLogSheet, recordSearchMissEvent, bumpDiagnostic } = useAppState();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [directInputOpen, setDirectInputOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);

  /**
   * 診断 (KPI計装 Layer 1): 直近で「ヒットしなかった」クエリを保持する。
   *
   * 打鍵のたびに記録すると "あ"→"あぼ"→"あぼか" が全部残ってノイズになるため、
   * ここでは ref に上書きし続け、**ユーザーが諦めた瞬間** (シートを閉じる /
   * 数値入力へ逃げる / カテゴリヒントへ逃げる) にだけ確定させる。
   * これは PRD §10.2.1 の `quick_log_unfound_event` の意味論と一致する。
   */
  const pendingMissRef = useRef<{ q: string; hadHints: boolean } | null>(null);

  const commitPendingMiss = useCallback(() => {
    const miss = pendingMissRef.current;
    if (!miss) return;
    pendingMissRef.current = null;
    recordSearchMissEvent(miss.q, miss.hadHints);
  }, [recordSearchMissEvent]);

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

  const { confidentResults, maybeResults } = useMemo(() => {
    if (debounced.trim().length === 0) return { confidentResults: [] as SearchEntryResult[], maybeResults: [] as SearchEntryResult[] };
    const { confident, maybe } = searchEntriesFuzzy(debounced);
    return { confidentResults: confident, maybeResults: maybe };
  }, [debounced]);

  // 層4: 確信度に関わらず常に計算・表示する (SEARCH_SPEC v0.4 §F5) —
  // 誤ヒットがカテゴリへの逃げ道を塞ぐ構造を解消するため、0件時限定にしない。
  const categoryHints = useMemo<BucketKey[]>(() => {
    if (debounced.trim().length === 0) return [];
    return getCategoryHints(debounced);
  }, [debounced]);

  const handleSelect = useCallback(
    (entry: SearchEntry) => {
      Keyboard.dismiss();
      onClose(); // hide search sheet
      openIdentityLogSheet(entry.identity.primaryHome.bucket, {
        identityId: entry.identity.id,
        attributeKey: entry.attribute?.key,
        styleKey: entry.style?.key,
        onDismiss: onOpen, // re-open search sheet if user cancels
      });
    },
    [onClose, onOpen, openIdentityLogSheet]
  );

  const handleCategoryHint = useCallback(
    (bucket: BucketKey) => {
      // 診断: Identity に直接たどり着けずカテゴリへ逃げた = 未発見の確定信号
      commitPendingMiss();
      Keyboard.dismiss();
      onClose();
      openIdentityLogSheet(bucket, { onDismiss: onOpen });
    },
    [commitPendingMiss, onClose, onOpen, openIdentityLogSheet]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebounced('');
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    // 診断: 見つからないまま閉じた = 未発見の確定信号
    commitPendingMiss();
    Keyboard.dismiss();
    onClose();
  }, [commitPendingMiss, onClose]);

  const handleOpenDirectInput = useCallback(() => {
    // 診断: 最終手段へ逃げた = 未発見の確定信号 (DB の穴を最も強く示す)
    commitPendingMiss();
    bumpDiagnostic('directInputOpenCount');
    Keyboard.dismiss();
    onClose(); // hide search sheet — DirectInputSheet replaces it, not stacks on it
    setDirectInputOpen(true);
  }, [bumpDiagnostic, commitPendingMiss, onClose]);

  const isEmpty = debounced.trim().length === 0;
  const hasConfident = confidentResults.length > 0;
  const hasMaybe = maybeResults.length > 0;
  const hasHints = categoryHints.length > 0;
  const noMatch = !isEmpty && !hasConfident && !hasMaybe && !hasHints;

  // 診断 (SEARCH_SPEC v0.4 §F5): 層1 (confident) のヒット有無だけで miss を判定する。
  // 層2 (もしかして) でしか着地しなかったクエリも miss として記録する — これが
  // §5.4.7 の辞書育成ループの入力になる。旧実装は「何かヒットしたか」で判定して
  // いたため、bigram の誤ヒットが miss を握り潰していた。
  useEffect(() => {
    if (isEmpty) return;
    if (hasConfident) {
      pendingMissRef.current = null;
    } else {
      pendingMissRef.current = { q: debounced, hadHints: hasHints };
    }
  }, [debounced, isEmpty, hasConfident, hasHints]);

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title="食品を検索"
        keyboardAware
        expandToFull
        maxHeightRatio={0.96}
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


        {/* 検索結果 (層1: confident) */}
        {hasConfident ? (
          <View style={[styles.resultList, { marginBottom: hasMaybe || hasHints ? t.spacing['4'] : 0 }]}>
            {confidentResults.map((result) => (
              <SearchResultRow key={resultKey(result)} result={result} onPress={handleSelect} />
            ))}
          </View>
        ) : null}

        {/* もしかして (層2: bigram類似度のみのファジー一致) */}
        {hasMaybe ? (
          <View style={{ gap: t.spacing['2'], marginBottom: hasHints ? t.spacing['4'] : 0 }}>
            <Overline tone="secondary">もしかして</Overline>
            <View style={styles.resultList}>
              {maybeResults.map((result) => (
                <SearchResultRow key={resultKey(result)} result={result} onPress={handleSelect} />
              ))}
            </View>
          </View>
        ) : null}

        {/* このカテゴリかも (層4: 常時表示フォールバック) */}
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
            onPress={handleOpenDirectInput}
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
        onDismiss={onOpen}
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
