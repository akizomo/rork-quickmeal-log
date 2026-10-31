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
  Button,
  Caption,
  Card,
  Chip,
  Icon,
  IconButton,
  Label,
  Overline,
  useTheme,
} from '@/design-system';
import { buildRegistry, getBucketDef, getIdentity, presetAddonInputs } from '@/constants/identity';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import { findNegligible } from '@/utils/negligible-foods';
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
import { formatMyFoodSummary } from '@/utils/my-food-format';
import { SEARCH_RECENT_VISIBLE, searchMyFoods } from '@/utils/my-foods';
import type { MyFood } from '@/types/my-food';

const DEBOUNCE_MS = 180;

/** 「記録不要」案内の文言キー (動的に組み立てない: i18n の未使用キー検査が追えなくなる)。 */
const NEGLIGIBLE_MESSAGE_KEY = {
  zero: 'search.negligibleZero',
  small: 'search.negligibleSmall',
  inDish: 'search.negligibleInDish',
} as const;

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

/** My食品の行 (検索結果・「最近」)。名前 + 1回分の kcal。タップ = 倍率の記録シート。 */
function MyFoodRow({ food, onPress }: { food: MyFood; onPress: (food: MyFood) => void }) {
  const t = useTheme();
  const tr = useT();
  // 行 (押せる領域) と「+」は兄弟にする。Pressable の中に Pressable を入れ子にしない (Web で button の入れ子になる)
  return (
    <View style={[styles.resultRow, { paddingLeft: t.spacing['2'], paddingRight: t.spacing['1'], gap: t.spacing['2'] }]}>
      <Pressable
        onPress={() => onPress(food)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.resultRowMain,
          {
            paddingVertical: t.spacing['3'],
            borderRadius: t.radius.sm,
            backgroundColor: pressed ? t.colors.surface.raised : 'transparent',
          },
        ]}
        testID={`search-my-food-${food.id}`}
      >
        <Body numberOfLines={1} style={{ flexShrink: 1 }}>{food.name}</Body>
        <Caption tone="secondary">{formatMyFoodSummary(food)}</Caption>
      </Pressable>
      {/* 押すと記録の画面が開く = 「追加」の入口だと分かるように */}
      <IconButton
        icon="add"
        variant="outlined"
        size="sm"
        tone="action"
        onPress={() => onPress(food)}
        accessibilityLabel={tr('search.myFoodAddA11y', { name: food.name })}
      />
    </View>
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
  // 検索から記録したらホームまで戻すのは、記録シート側の hooks/useCloseAfterRecord.ts が1回のナビゲーションで行う
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

  // My食品 (PRD §6.5.4): 検索結果に**別の塊**として出す。Identity の順位・件数は My食品の有無で変えない
  const myFoodResults = useMemo(
    () => (debounced.trim().length === 0 ? [] : searchMyFoods(settings.myFoods, debounced)),
    [debounced, settings.myFoods],
  );
  const myFoodCount = settings.myFoods?.length ?? 0;

  // 入力前の「最近」: 検索で選んで記録した Identity と My食品 (新しい順)。辞書・My食品から消えたものは出さない
  const recents = useMemo(() => {
    const out: { key: string; kind: 'identity' | 'myFood'; id: string }[] = [];
    for (const r of settings.searchRecents ?? []) {
      const exists = r.kind === 'identity' ? !!getIdentity(r.id) : (settings.myFoods ?? []).some((f) => f.id === r.id);
      if (!exists) continue;
      out.push({ key: `${r.kind}:${r.id}`, kind: r.kind, id: r.id });
      if (out.length >= SEARCH_RECENT_VISIBLE) break;
    }
    return out;
  }, [settings.searchRecents, settings.myFoods]);

  const handleOpenMyFood = useCallback(
    (food: MyFood) => {
      Keyboard.dismiss();
      router.push({ pathname: '/my-food-log', params: { id: food.id, source: 'search' } });
    },
    [router],
  );

  const handleSelectRecentIdentity = useCallback(
    (id: string) => {
      const identity = getIdentity(id);
      if (!identity) return;
      Keyboard.dismiss();
      openIdentityLogSheet(identity.primaryHome.bucket, { identityId: identity.id, viaSearch: true });
    },
    [openIdentityLogSheet],
  );

  const handleSelect = useCallback(
    (entry: SearchEntry) => {
      Keyboard.dismiss();
      openIdentityLogSheet(entry.identity.primaryHome.bucket, {
        viaSearch: true,
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
      openIdentityLogSheet(bucket, { viaSearch: true });
    },
    [commitPendingMiss, openIdentityLogSheet]
  );

  const handleVocabularyMatch = useCallback(
    (match: VocabularyMatch) => {
      // 診断: 主辞辞書/料理名辞書 (層2/3) 止まり = DB に文字列として存在しない
      // ことを示す確定信号。カテゴリヒント選択と同じ意味論で扱う。
      commitPendingMiss();
      Keyboard.dismiss();
      openIdentityLogSheet(match.bucket, { identityId: match.identity, viaSearch: true });
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
  const noMatch = !isEmpty && !hasConfident && !hasMaybe && !hasHints && myFoodResults.length === 0 && !findNegligible(debounced, locale);
  // 「記録しなくていい」語 (お茶・ブラックコーヒー・調味料…) は、見つからなかったのではなく
  // 記録不要と案内する。完全一致のみ。未ヒット診断にも数えない (DB拡張の候補ではないため)。
  const negligible = useMemo(() => (isEmpty ? null : findNegligible(debounced, locale)), [debounced, isEmpty, locale]);

  // 診断 (SEARCH_SPEC v0.4 §F5): 層1 (confident) のヒット有無だけで miss を判定する。
  // 層2 (もしかして) でしか着地しなかったクエリも miss として記録する — これが
  // §5.4.7 の辞書育成ループの入力になる。旧実装は「何かヒットしたか」で判定して
  // いたため、bigram の誤ヒットが miss を握り潰していた。
  useEffect(() => {
    if (isEmpty) return;
    // My食品に着地した語は、すでに解決している (自分で付けた名前) ので未ヒット語に数えない (PRD §6.5.4)
    if (hasConfident || negligible || myFoodResults.length > 0) {
      pendingMissRef.current = null;
    } else {
      pendingMissRef.current = { q: debounced, hadHints: hasHints };
    }
  }, [debounced, isEmpty, hasConfident, hasHints, negligible, myFoodResults.length]);

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
            // Android: 色を指定しないと、入力欄の文字・プレースホルダー・検索 / 閉じるアイコンが白で、
            // 明るいヘッダーの上に出て見えなかった (2026-10-27)。iOS は textColor だけが効く
            textColor: t.colors.content.primary,
            hintTextColor: t.colors.content.tertiary,
            headerIconColor: t.colors.content.primary,
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

        {/* 入力前: 最近 → My食品 N件 › (→ 下の「数値で入力する」)。何も無ければ区画ごと出さない */}
        {isEmpty && recents.length > 0 ? (
          <View style={{ gap: t.spacing['2'], marginBottom: t.spacing['4'] }} testID="search-recents">
            <Overline tone="secondary">{tr('search.recents')}</Overline>
            <View style={styles.resultList}>
              {recents.map((r) => {
                if (r.kind === 'myFood') {
                  const food = (settings.myFoods ?? []).find((f) => f.id === r.id);
                  return food ? <MyFoodRow key={r.key} food={food} onPress={handleOpenMyFood} /> : null;
                }
                const identity = getIdentity(r.id);
                const bucket = identity ? getBucketDef(identity.primaryHome.bucket) : undefined;
                if (!identity) return null;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => handleSelectRecentIdentity(r.id)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.resultRow,
                      {
                        paddingVertical: t.spacing['3'],
                        paddingHorizontal: t.spacing['2'],
                        borderRadius: t.radius.sm,
                        backgroundColor: pressed ? t.colors.surface.raised : 'transparent',
                      },
                    ]}
                    testID={`search-recent-${r.id}`}
                  >
                    <Body>{identity.label}</Body>
                    <Caption tone="secondary">{bucket ? `${bucket.emoji} ${bucket.label}` : ''}</Caption>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isEmpty && myFoodCount > 0 ? (
          <Pressable
            onPress={() => router.push('/my-foods')}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.resultRow,
              {
                paddingVertical: t.spacing['3'],
                paddingHorizontal: t.spacing['2'],
                borderRadius: t.radius.sm,
                backgroundColor: pressed ? t.colors.surface.raised : 'transparent',
                marginBottom: t.spacing['2'],
              },
            ]}
            testID="search-my-foods-link"
          >
            <Label>{tr('search.myFoodsLink', { count: myFoodCount })}</Label>
            <Icon name="chevronRight" size={16} color={t.colors.content.tertiary} />
          </Pressable>
        ) : null}

        {negligible ? (
          <Card variant="outlined" style={{ marginBottom: t.spacing['4'] }} testID="search-negligible-notice">
            <Body>{tr(NEGLIGIBLE_MESSAGE_KEY[negligible])}</Body>
          </Card>
        ) : null}

        {/* 検索結果 (層1: confident) */}
        {hasConfident ? (
          <View style={[styles.resultList, { marginBottom: hasMaybe || hasHints ? t.spacing['4'] : 0 }]}>
            {confidentResults.map((result) => (
              <SearchResultRow key={resultKey(result)} result={result} onPress={handleSelect} />
            ))}
          </View>
        ) : null}

        {/* My食品 (別の塊。確実な一致 (層1) の直後 — 自分で付けた名前は確実な一致になりやすい。Identity の順位は変えない) */}
        {myFoodResults.length > 0 ? (
          <View style={{ gap: t.spacing['2'], marginBottom: hasMaybe || hasHints ? t.spacing['4'] : 0 }} testID="search-my-food-results">
            <Overline tone="secondary">{tr('search.myFoodsHeading')}</Overline>
            <View style={styles.resultList}>
              {myFoodResults.map((food) => (
                <MyFoodRow key={food.id} food={food} onPress={handleOpenMyFood} />
              ))}
            </View>
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

        {/* 数値で入力する — 見つからなかったときも、見つかっているときも同じボタン (見た目を揃える) */}
        <View style={{ marginTop: t.spacing['5'], gap: t.spacing['2'], alignItems: 'flex-start' }}>
          <Body size="sm" tone="secondary">{tr('search.notFoundPrompt')}</Body>
          <Button
            variant="secondary"
            size="sm"
            label={tr('search.enterManually')}
            leading={<Icon name="edit" size={16} color={t.colors.content.primary} />}
            onPress={handleOpenDirectInput}
            accessibilityLabel={tr('search.enterManuallyA11y')}
            testID="search-direct-input-cta"
          />
        </View>
      </ScrollView>
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
  resultRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
