/**
 * SearchScreen — Identity 検索ページ (SEARCH_SPEC v0.3 §F1–F5)
 *
 * 2026-10-18: ボトムシートから下層ページ (app/search.tsx) に移行。検索欄は iOS 標準の
 * ナビゲーションバー検索 (headerSearchBarOptions / UISearchController)。
 *
 * 動線:
 *   QuickLogSection の 🔍 ボタン → 検索ページへ push
 *   → Identity 選択 → 記録シート (formSheet) がこのページの上に出る。閉じると検索語が残ったまま戻る
 *   → 「数値で入力する」→ 直接入力シート (formSheet /direct-input)
 *
 * 0件ヒット時: カテゴリヒントチップ (§F5a) を最大4件表示。
 */

import { Stack, useRouter } from 'expo-router';
import type { SearchBarCommands } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Body,
  Caption,
  Chip,
  Label,
  Overline,
  useTheme,
} from '@/design-system';
import { buildRegistry, getBucketDef, getIdentity, presetAddonInputs } from '@/constants/identity';
import { UndoToast } from '@/components/UndoToast';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import { useT } from '@/hooks/useT';
import {
  describeSearchEntry,
  getCategoryHints,
  getVocabularyMatches,
  searchEntriesFuzzy,
  type SearchEntry,
  type SearchEntryResult,
  type VocabularyMatch,
} from '@/utils/identity-search';
import type { BucketKey } from '@/types/identity';
import type { QuickLogHistoryMap } from '@/types/quick-log';

const DEBOUNCE_MS = 180;

function resultKey(result: SearchEntryResult): string {
  const { identity, attribute, style, preset } = result.entry;
  if (preset) return `preset:${preset.id}`;
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
  // Preset のサブラベルは「サラダ・生野菜 + チーズ + クルトン …」と長く、右側に置くと
  // 名前が「シーザーサラ/ダ」のように途中で折り返される (モバイル幅で実測)。名前の下に出す。
  const stacked = !!result.entry.preset;
  return (
    <Pressable
      onPress={() => onPress(result.entry)}
      style={({ pressed }) => [
        styles.resultRow,
        stacked && styles.resultRowStacked,
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

export function SearchScreen() {
  const router = useRouter();
  const t = useTheme();
  const tr = useT();
  const { openIdentityLogSheet, recordSearchMissEvent, bumpDiagnostic, settings } = useAppState();
  const { foodRegion: locale } = useLocale();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

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

  // 診断: 見つからないままページを離れた = 未発見の確定信号
  const commitPendingMissRef = useRef(commitPendingMiss);
  useEffect(() => {
    commitPendingMissRef.current = commitPendingMiss;
  });
  useEffect(() => () => commitPendingMissRef.current(), []);

  // iOS は headerSearchBarOptions.autoFocus が効かない (Android 専用) ので、ページ表示後に focus() で検索欄を選択状態にする
  const searchBarRef = useRef<SearchBarCommands>(null);
  const insets = useSafeAreaInsets();
  // 検索中はキーボードが出ている (記録シートから戻ってもそのまま)。トーストを画面下に固定すると
  // キーボードの裏に隠れて記録できたか分からないので、キーボードの高さぶん持ち上げる
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    const id = setTimeout(() => searchBarRef.current?.focus(), 800); // 画面遷移 (約500ms) が終わってからでないと focus が効かない
    return () => clearTimeout(id);
  }, []);

  // Debounce
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // 層内ランキング (SEARCH_SPEC v0.4 §5.3 P4): 同じ確信度の中でユーザーの選択
  // 頻度が高いものを優先する。history は ⭐️タブ/自動学習と同じ quickLogHistory。
  const { confidentResults, maybeResults } = useMemo(() => {
    if (debounced.trim().length === 0) return { confidentResults: [] as SearchEntryResult[], maybeResults: [] as SearchEntryResult[] };
    const { confident, maybe } = searchEntriesFuzzy(debounced, {
      history: settings.quickLogHistory as QuickLogHistoryMap | undefined,
      locale,
    });
    return { confidentResults: confident, maybeResults: maybe };
  }, [debounced, locale, settings.quickLogHistory]);

  // 層2/3: 主辞辞書・料理名辞書によるバケット/Identity推測 (SEARCH_SPEC v0.4
  // §5.4.5 / §5.4.6)。DB に文字列として存在しない語 (グラタン/ハムカツ等) を
  // 「もしかして」に着地させる。
  const vocabularyMatches = useMemo<VocabularyMatch[]>(() => {
    if (debounced.trim().length === 0) return [];
    return getVocabularyMatches(debounced, locale);
  }, [debounced, locale]);

  // 層4: 確信度に関わらず常に計算・表示する (SEARCH_SPEC v0.4 §F5) —
  // 誤ヒットがカテゴリへの逃げ道を塞ぐ構造を解消するため、0件時限定にしない。
  // 層2/3 (もしかして) に既出のバケットは層4で重複表示しない (両者とも
  // DISH_VOCABULARY を参照するため、同じ語で両方が一致すると同じチップが
  // 二度出てしまう)。
  const categoryHints = useMemo<BucketKey[]>(() => {
    if (debounced.trim().length === 0) return [];
    const vocabBuckets = new Set(vocabularyMatches.map((m) => m.bucket));
    return getCategoryHints(debounced, locale).filter((b) => !vocabBuckets.has(b));
  }, [debounced, locale, vocabularyMatches]);

  const handleSelect = useCallback(
    (entry: SearchEntry) => {
      Keyboard.dismiss();
      openIdentityLogSheet(entry.identity.primaryHome.bucket, {
        identityId: entry.identity.id,
        attributeKey: entry.attribute?.key,
        styleKey: entry.style?.key,
        // Preset: 組み合わせ (Add-on・量) を選択済みで開く。ユーザーは量を直して保存するだけ。
        ...(entry.preset
          ? { amountValue: entry.preset.amountValue, addons: presetAddonInputs(entry.preset) }
          : {}),
      });
    },
    [openIdentityLogSheet]
  );

  const handleCategoryHint = useCallback(
    (bucket: BucketKey) => {
      // 診断: Identity に直接たどり着けずカテゴリへ逃げた = 未発見の確定信号
      commitPendingMiss();
      Keyboard.dismiss();
      openIdentityLogSheet(bucket);
    },
    [commitPendingMiss, openIdentityLogSheet]
  );

  const handleVocabularyMatch = useCallback(
    (match: VocabularyMatch) => {
      // 診断: 主辞辞書/料理名辞書 (層2/3) 止まり = DB に文字列として存在しない
      // ことを示す確定信号。カテゴリヒント選択と同じ意味論で扱う。
      commitPendingMiss();
      Keyboard.dismiss();
      openIdentityLogSheet(match.bucket, { identityId: match.identity });
    },
    [commitPendingMiss, openIdentityLogSheet]
  );

  const handleOpenDirectInput = useCallback(() => {
    // 診断: 最終手段へ逃げた = 未発見の確定信号 (DB の穴を最も強く示す)
    commitPendingMiss();
    bumpDiagnostic('directInputOpenCount');
    Keyboard.dismiss();
    router.push('/direct-input');
  }, [bumpDiagnostic, commitPendingMiss, router]);

  const isEmpty = debounced.trim().length === 0;
  const hasConfident = confidentResults.length > 0;
  const hasMaybe = maybeResults.length > 0 || vocabularyMatches.length > 0;
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
      <Stack.Screen
        options={{
          title: tr('search.title'),
          headerSearchBarOptions: {
            placeholder: tr('search.placeholder'),
            ref: searchBarRef,
            autoFocus: true, // Android のみ。iOS は下の useEffect で focus() する
            hideWhenScrolling: false,
            autoCapitalize: 'none',
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => {
              setQuery('');
              setDebounced('');
            },
          },
        }}
      />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: t.spacing['5'] }}
        testID="search-screen"
      >
        {/* 検索結果 (層1: confident) */}
        {hasConfident ? (
          <View style={[styles.resultList, { marginBottom: hasMaybe || hasHints ? t.spacing['4'] : 0 }]}>
            {confidentResults.map((result) => (
              <SearchResultRow key={resultKey(result)} result={result} onPress={handleSelect} />
            ))}
          </View>
        ) : null}

        {/* もしかして (層2/3: 主辞辞書・料理名辞書 + bigram類似度のファジー一致) */}
        {hasMaybe ? (
          <View style={{ gap: t.spacing['2'], marginBottom: hasHints ? t.spacing['4'] : 0 }}>
            <Overline tone="secondary">{tr('search.suggestions')}</Overline>
            {vocabularyMatches.length > 0 ? (
              <View style={styles.hintChips}>
                {vocabularyMatches.map((match, i) => {
                  const identity = match.identity ? getIdentity(match.identity) : undefined;
                  const bucket = getBucketDef(match.bucket);
                  if (!bucket) return null;
                  const label = identity ? identity.label : `${bucket.emoji} ${bucket.label}`;
                  return (
                    <Chip
                      key={`${match.bucket}-${match.identity ?? i}`}
                      label={label}
                      onPress={() => handleVocabularyMatch(match)}
                    />
                  );
                })}
              </View>
            ) : null}
            {maybeResults.length > 0 ? (
              <View style={styles.resultList}>
                {maybeResults.map((result) => (
                  <SearchResultRow key={resultKey(result)} result={result} onPress={handleSelect} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* このカテゴリかも (層4: 常時表示フォールバック) */}
        {hasHints ? (
          <View style={{ gap: t.spacing['3'] }}>
            <Overline tone="secondary">{tr('search.categoryHint')}</Overline>
            <View style={styles.hintChips}>
              {categoryHints.map((bucket) => {
                const def = getBucketDef(bucket);
                if (!def) return null;
                const label = buildRegistry('ja', settings.uiLanguage).buckets.find((b) => b.key === bucket)?.label ?? def.label;
                return (
                  <Chip
                    key={bucket}
                    label={`${def.emoji} ${label}`}
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
            {tr('search.noResults')}
          </Body>
        ) : null}

        {/* 数値で入力する — 常設テキストリンク (最終手段、目立たせない) */}
        <View style={{ marginTop: t.spacing['5'], flexDirection: 'row', alignItems: 'center', gap: t.spacing['1'] }}>
          <Body size="sm" tone="secondary">{tr('search.notFoundPrompt')}</Body>
          <Pressable
            onPress={handleOpenDirectInput}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            accessibilityRole="button"
            accessibilityLabel={tr('search.enterManuallyA11y')}
          >
            <Label size="sm" tone="link">{tr('search.enterManually')}</Label>
          </Pressable>
        </View>
      </ScrollView>
      {/* 記録シートを閉じて戻ってきたとき、ここで記録の取り消しトーストを出す (ホームのトーストは裏で見えない)。
          下の検索バー (iOS 26 は画面下) にかぶらない高さに置く */}
      <UndoToast bottom={Math.max(keyboardHeight, insets.bottom) + 72} />
    </>
  );
}

const styles = StyleSheet.create({
  resultList: {
    gap: 0,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  hintChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
