import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useT } from '@/hooks/useT';

import { Body, Button, Icon, IconButton, Label, Overline, useTheme } from '@/design-system';
import { duration } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { SegmentedControl } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import type { BucketDef, BucketKey } from '@/types/identity';
import { buildRegistry } from '@/constants/identity';
import { deriveDefaultTab, FREQUENT_TAB_MIN_LOGS } from '@/utils/quick-log-history';
import { composeFrequentItems, shouldShowFrequentTab, type FrequentItem } from '@/utils/frequent-pins';
import type { MyFood } from '@/types/my-food';
import { MY_FOOD_SHELF_LIMIT, recentMyFoods } from '@/utils/my-foods';
import type { QuickLogTabKey } from '@/types/quick-log';
import { widgetRequestPin } from '@/utils/widget-bridge';

export const QUICK_LOG_TOKENS = {
  sectionPaddingHorizontal: 16,
  sectionPaddingTop: 8,
  sectionPaddingBottom: 8,
  segmentHeight: 42, // 右の検索ボタン (IconButton lg = 42) と高さをそろえる
  segmentRadius: 21,
  segmentBottomSpacing: 8,
  gridColumns: 3,
  gridGap: 8,
  buttonHeightCompact: 52,
  buttonHeightDefault: 56,
  buttonHeightLarge: 68,
  buttonRadius: 15,
  iconContainerSize: 24,
  iconContainerRadius: 12,
  iconSize: 19,
  iconLabelSpacing: 5,
  labelFontSize: 11,
  labelLineHeight: 14,
};

/** ウィジェット追加ナッジバナーの高さ (paddingTop + content + paddingBottom + marginBottom)。
 *  HomeDatePager の bottomReserve 計算に使う。 */
export const WIDGET_NUDGE_HEIGHT = 84;

function WidgetNudgeBanner() {
  const t = useTheme();
  const tr = useT();
  const { settings, updateSettingsValues } = useAppState();

  const history = settings.quickLogHistory as Record<string, unknown[]> | undefined;
  const totalEntries = history
    ? Object.values(history).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  if (
    Platform.OS !== 'android' ||
    !!settings.widgetNudgeDismissedAtISO ||
    totalEntries < FREQUENT_TAB_MIN_LOGS
  ) {
    return null;
  }

  const handleDismiss = () => {
    updateSettingsValues({ widgetNudgeDismissedAtISO: new Date().toISOString() });
  };

  const handleAdd = () => {
    void widgetRequestPin();
    updateSettingsValues({ widgetNudgeDismissedAtISO: new Date().toISOString() });
  };

  return (
    <View
      style={{
        backgroundColor: t.colors.action.primary.container,
        borderRadius: t.radius.md,
        paddingHorizontal: t.spacing['4'],
        paddingTop: t.spacing['3'],
        paddingBottom: t.spacing['2'],
        marginBottom: t.spacing['2'],
      }}
      accessibilityRole="alert"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing['2'] }}>
        <Icon name="widget" size={18} color={t.colors.action.primary.default} />
        <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
          <Label tone="primary">{tr('quicklog.widget.title')}</Label>
          <Body size="sm" tone="secondary">{tr('quicklog.widget.body')}</Body>
          <Pressable
            onPress={handleAdd}
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1, marginTop: t.spacing['0.5'] })}
            accessibilityRole="button"
            accessibilityLabel={tr('quicklog.widget.title')}
          >
            <Label size="sm" tone="link">{tr('quicklog.widget.add')}</Label>
          </Pressable>
        </View>
        <IconButton icon="close" size="sm" tone="tertiary" onPress={handleDismiss} accessibilityLabel={tr('common.close')} />
      </View>
    </View>
  );
}

export function getQuickLogButtonHeight(screenWidth: number): number {
  if (screenWidth <= 360) return QUICK_LOG_TOKENS.buttonHeightCompact;
  if (screenWidth <= 414) return QUICK_LOG_TOKENS.buttonHeightDefault;
  return QUICK_LOG_TOKENS.buttonHeightLarge;
}

function getIconSize(screenWidth: number): number {
  if (screenWidth <= 360) return 15;
  if (screenWidth <= 414) return 17;
  return 19;
}

function getLabelFontSize(screenWidth: number): number {
  // Identity-first labels can run up to 7 chars, so base size is one step
  // smaller than before to keep numberOfLines: 1 honored on narrow screens.
  if (screenWidth <= 360) return 9;
  if (screenWidth <= 414) return 10;
  return 11;
}

function getIconContainerSize(screenWidth: number): number {
  if (screenWidth <= 360) return 20;
  if (screenWidth <= 414) return 20;
  return 24;
}

function QuickLogButton({
  item,
  mode,
  height,
  iconSize,
  iconContainerSize,
  labelFontSize,
}: {
  item: BucketDef;
  mode: 'ingredient' | 'dish';
  height: number;
  iconSize: number;
  iconContainerSize: number;
  labelFontSize: number;
}) {
  const { openIdentityLogSheet, quickLogIdentity } = useAppState();
  const t = useTheme();
  const tr = useT();
  const { foodRegion: locale, uiLanguage } = useLocale();
  const scale = useRef(new Animated.Value(1)).current;

  const registry = useMemo(() => buildRegistry(locale, uiLanguage), [locale, uiLanguage]);
  const bucketKey = item.key;
  const bucketIdentities = registry.byBucket[bucketKey] ?? [];
  const hasIdentities = bucketIdentities.length > 0;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (hasIdentities) {
      const first = bucketIdentities[0];
      if (item.quickTapDisabled || first?.quickTapDisabled) {
        openIdentityLogSheet(bucketKey, { sourceTab: mode });
        return;
      }
      if (first) void quickLogIdentity(first.id, mode);
    }
  };

  const handleLongPress = () => {
    if (hasIdentities) {
      openIdentityLogSheet(bucketKey, { sourceTab: mode });
    }
  };

  return (
    <Animated.View style={[styles.cell, { transform: [{ scale }], height }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={tr('quicklog.a11y.addItem', { label: item.label })}
        style={[styles.button, { ...t.elevation.xs, height, backgroundColor: t.colors.surface.raised }]}
        testID={`quick-log-button-${item.key}`}
      >
        <View
          style={[
            styles.iconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: radius.full,
            },
          ]}
        >
          <Text style={[styles.iconEmoji, { fontSize: iconSize, lineHeight: iconSize + 2 }]}>
            {item.emoji}
          </Text>
        </View>
        <Text style={[styles.label, { fontSize: labelFontSize, color: t.colors.content.primary }]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const FREQUENT_TAB_OPTION = { key: 'frequent' as const, label: '⭐️' };

/**
 * ⭐️ の候補数の上限。実際に並ぶ数は「9ボタングリッドの高さに収まる行まで」で、
 * 画面幅と名前の長さで変わる (ROADMAP §3.0 2026-10-10)。
 */
const FREQUENT_PILL_CANDIDATES = 20;

const EMPTY_FREQUENT_LAYOUT = { pinned: [] as FrequentItem[], auto: [] as FrequentItem[], shelfIds: [] as string[], settingsKey: '' };

/**
 * ⭐️ タブ: ピン留め (ユーザーが決めた順) → 自動 (よく選ぶ順) を、区切りなしで続けて名前だけのピルで並べる (ピン留めかどうかは編集シートで分かる)。
 * 大きさは全部同じで、並び順が位置の目印 (位置を覚えて押せるように)。
 * タップ = いつもの量で記録 / 長押し = 量シート。末尾の「編集」は編集シートを開く (PRD §6.5.3)。
 *
 * 高さは通常グリッドに揃えて**固定**する (お気に入りが増えても、ホームの高さは変わらない)。
 * **自動分だけ**、収まりきらない行のピルを出さない (空白も残さない)。**ピン留めは枠を超えても全部出し**
 * (自分で選んだものを隠さない)、枠を超えたぶんは**縦スクロール**で見る。
 * 横スワイプで頁を分けない: ホームの日付ページャー (横スワイプで日が変わる) と操作がぶつかるため。
 *
 * 収まる数は実測で決める: 自動分を全部並べて測り、末尾の「編集」まで収まらなければ
 * 自動分を減らして測り直す (測定中は見せない)。
 */
const FrequentPills = memo(function FrequentPills({
  pinned,
  auto,
  height,
}: {
  pinned: FrequentItem[];
  auto: FrequentItem[];
  height: number;
}) {
  const { quickLogIdentity, openIdentityLogSheet } = useAppState();
  const router = useRouter();
  const t = useTheme();
  const tr = useT();
  // 測定の進行。親が key で作り直すので、ここでは初期値だけ持つ。
  // autoCount: いま並べている自動分の数 / pass: 測り直しの回数 (子を作り直すための key)
  const [autoCount, setAutoCount] = useState(auto.length);
  const [pass, setPass] = useState(0);
  const [settledBottom, setSettledBottom] = useState<number | null>(null);
  // 各項目の下端 (container 内の y + 高さ)。項目番号 = ピン留め → 自動 → 編集
  const bottomsRef = useRef<Record<number, number>>({});

  const total = pinned.length + autoCount + 1; // +1 は「編集」
  const editIndex = total - 1;
  const shownAuto = auto.slice(0, autoCount);

  const handleLayout = (index: number, e: LayoutChangeEvent) => {
    if (settledBottom !== null) return;
    const { y, height: h } = e.nativeEvent.layout;
    bottomsRef.current[index] = y + h;
    const measured = Object.keys(bottomsRef.current).length;
    if (measured < total) return;
    const bottoms = bottomsRef.current;
    if (bottoms[editIndex] <= height || autoCount === 0) {
      // 収まった。自動分が 0 でも収まらないのはピン留めが枠を超えているとき (縦スクロールで見る)
      setSettledBottom(bottoms[editIndex]);
      return;
    }
    // 自動分が単独で収まる数まで減らし、「編集」の分も残すため最低 1 つは減らして測り直す
    let fit = 0;
    while (fit < autoCount && bottoms[pinned.length + fit] <= height) fit += 1;
    bottomsRef.current = {};
    setAutoCount(Math.min(autoCount - 1, fit));
    setPass((p) => p + 1);
  };

  const measuring = settledBottom === null;
  const hiddenWhileMeasuring = measuring ? styles.pillMeasuring : null;

  const renderPill = (item: FrequentItem, index: number) => (
    <View
      key={item.identityId}
      onLayout={(e) => handleLayout(index, e)}
      // 測定中は見せない (はみ出す行が一瞬見えるのを防ぐ)
      style={[styles.pillItem, hiddenWhileMeasuring]}
      pointerEvents={measuring ? 'none' : 'auto'}
    >
      <Button
        label={item.label}
        variant="raised"
        size="sm"
        onPress={() => void quickLogIdentity(item.identityId, 'frequent', { frequentSource: item.source })}
        onLongPress={() =>
          openIdentityLogSheet(item.bucketKey as BucketKey, {
            identityId: item.identityId,
            sourceTab: 'frequent',
            frequentSource: item.source,
          })
        }
        delayLongPress={320}
        testID={`frequent-pill-${item.identityId}`}
      />
    </View>
  );

  return (
    <ScrollView
      style={{ height }}
      contentContainerStyle={[styles.pillWrap, { gap: t.spacing['2'] }]}
      // 枠を超えたぶんだけ縦に動く。収まっているときは動かさない (日付ページャーの横スワイプとも干渉しない)
      scrollEnabled={settledBottom !== null && settledBottom > height}
      showsVerticalScrollIndicator={settledBottom !== null && settledBottom > height}
      nestedScrollEnabled
      testID="frequent-pills"
    >
      <React.Fragment key={pass}>
        {pinned.map((item, i) => renderPill(item, i))}
        {shownAuto.map((item, i) => renderPill(item, pinned.length + i))}
        <View
          onLayout={(e) => handleLayout(editIndex, e)}
          style={[styles.pillItem, hiddenWhileMeasuring]}
          pointerEvents={measuring ? 'none' : 'auto'}
        >
          <Button
            label={tr('quicklog.frequent.edit')}
            variant="plain"
            size="sm"
            onPress={() => router.push('/frequent-edit')}
            accessibilityLabel={tr('quicklog.frequent.editA11y')}
            testID="frequent-edit-open"
          />
        </View>
      </React.Fragment>
    </ScrollView>
  );
});

/** ⭐️のピル1つ。タップ = いつもの量で記録 / 長押し = 量シート。ピン留め由来か自動由来かを計測に引き継ぐ。 */
function FrequentPillButton({ item }: { item: FrequentItem }) {
  const { quickLogIdentity, openIdentityLogSheet } = useAppState();
  return (
    <Button
      label={item.label}
      variant="raised"
      size="sm"
      onPress={() => void quickLogIdentity(item.identityId, 'frequent', { frequentSource: item.source })}
      onLongPress={() =>
        openIdentityLogSheet(item.bucketKey as BucketKey, {
          identityId: item.identityId,
          sourceTab: 'frequent',
          frequentSource: item.source,
        })
      }
      delayLongPress={320}
      testID={`frequent-pill-${item.identityId}`}
    />
  );
}

/** 下段 (棚) の1行の高さ。4行 + 見出しでも、ホームが窮屈にならない範囲に収める。 */
const SHELF_ROW_HEIGHT = 40;

/**
 * ⭐️タブの2段レイアウト (My食品が1件以上のとき。PRD §6.5.3)。
 *   上段: 食材ピル (ピン留め → 自動) を1行の横スクロールで。縦に伸びず、枠を超えて見えなくなることもない
 *   下段: My食品の棚 = 最近使った順の数件。行のタップ = 1回分 ×1 で即記録 / 長押し = 倍率の記録シート。「すべて N件 ›」で倉庫 (My食品ページ)
 * 通常グリッドより背が高くなるので、増えたぶんの高さをホームへ伝える (onExtraHeightChange)。
 */
const FrequentTwoTier = memo(function FrequentTwoTier({
  pinned,
  auto,
  shelf,
  myFoodCount,
  baseHeight,
  onExtraHeightChange,
}: {
  pinned: FrequentItem[];
  auto: FrequentItem[];
  shelf: MyFood[];
  myFoodCount: number;
  baseHeight: number;
  onExtraHeightChange?: (extra: number) => void;
}) {
  const { recordMyFood } = useAppState();
  const router = useRouter();
  const t = useTheme();
  const tr = useT();
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    onExtraHeightChange?.(extra);
    return () => onExtraHeightChange?.(0);
  }, [extra, onExtraHeightChange]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = Math.max(0, Math.round(e.nativeEvent.layout.height - baseHeight));
    setExtra((prev) => (prev === next ? prev : next));
  };

  return (
    <View onLayout={handleLayout} style={{ gap: t.spacing['2'] }} testID="frequent-two-tier">
      {/* 上段: よく記録する食材 */}
      <View style={styles.tierHeader}>
        <Overline>{tr('quicklog.frequent.ingredientsHeading')}</Overline>
        <Pressable
          onPress={() => router.push('/frequent-edit')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={tr('quicklog.frequent.editA11y')}
          testID="frequent-edit-open"
        >
          <Label size="sm" tone="link">{tr('quicklog.frequent.edit')}</Label>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // 影 (elevation.xs) が切れないよう、縦に少しだけ余白を持たせる
        contentContainerStyle={{ gap: t.spacing['2'], paddingVertical: t.spacing['1'] }}
        testID="frequent-pills"
      >
        {[...pinned, ...auto].map((item) => (
          <FrequentPillButton key={item.identityId} item={item} />
        ))}
      </ScrollView>

      {/* 下段: My食品 (最近使った順の棚) */}
      <View style={[styles.tierHeader, { marginTop: t.spacing['1'] }]}>
        <Overline>{tr('quicklog.frequent.myFoodsHeading')}</Overline>
        <Pressable
          onPress={() => router.push('/my-foods')}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.allLink}
          testID="frequent-my-foods-all"
        >
          <Label size="sm" tone="link">{tr('quicklog.frequent.myFoodsAll', { count: myFoodCount })}</Label>
          <Icon name="chevronRight" size={16} color={t.colors.action.text.default} />
        </Pressable>
      </View>
      <View
        style={{ backgroundColor: t.colors.surface.raised, borderRadius: t.radius.md, ...t.elevation.xs }}
        testID="frequent-my-foods"
      >
        {shelf.map((food, index) => (
          <Pressable
            key={food.id}
            onPress={() => void recordMyFood(food.id, 1, 'frequent')}
            onLongPress={() => router.push({ pathname: '/my-food-log', params: { id: food.id, source: 'list' } })}
            delayLongPress={320}
            accessibilityRole="button"
            accessibilityHint={tr('quicklog.frequent.myFoodHint')}
            style={({ pressed }) => [
              styles.shelfRow,
              {
                borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0,
                borderTopColor: t.colors.border.subtle,
                paddingHorizontal: t.spacing['4'],
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            testID={`frequent-my-food-${food.id}`}
          >
            <Label size="sm" numberOfLines={1} style={{ flex: 1 }}>{food.name}</Label>
            <Body size="sm" tone="secondary" numberOfLines={1}>
              {food.unitLabel ? `1${food.unitLabel} · ` : ''}{`${Math.round(food.kcal)} kcal`}
            </Body>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

export const QuickLogSection = memo(function QuickLogSection({
  onExtraHeightChange,
}: {
  /** ⭐️ のピン留めが枠を超えて縦に伸びたぶんの高さ (px)。ホームが下の余白に足す。 */
  onExtraHeightChange?: (extra: number) => void;
}) {
  const { selectedMode, setSelectedMode, settings, bumpDiagnostic } = useAppState();
  const tr = useT();
  const { foodRegion: locale, uiLanguage } = useLocale();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();

  const handleOpenSearch = useCallback(() => {
    bumpDiagnostic('searchOpenCount');
    router.push('/search');
  }, [bumpDiagnostic, router]);

  const history = settings.quickLogHistory as import('@/types/quick-log').QuickLogHistoryMap | undefined;
  const totalHistoryEntries = useMemo(() => {
    if (!history) return 0;
    return Object.values(history).reduce((sum, arr) => sum + arr.length, 0);
  }, [history]);
  // 記録が一定数たまるか、ピン留めが1件でもあれば出す (PRD §6.5.3)。
  const myFoodCount = settings.myFoods?.length ?? 0;
  const showFrequentTab = shouldShowFrequentTab(totalHistoryEntries, settings.frequentPins, myFoodCount);

  const [selectedTab, setSelectedTab] = useState<QuickLogTabKey>(() =>
    deriveDefaultTab(history, settings.tabUsageCounts, settings.currentDefaultTab)
  );

  const handleTabChange = useCallback((tab: QuickLogTabKey) => {
    setSelectedTab(tab);
    if (tab === 'ingredient' || tab === 'dish') setSelectedMode(tab);
  }, [setSelectedMode]);

  const segmentOptions = useMemo(() => {
    const base = [
      { key: 'ingredient' as const, label: tr('quicklog.tabs.ingredient') },
      { key: 'dish' as const, label: tr('quicklog.tabs.dish') },
    ];
    return showFrequentTab ? [...base, FREQUENT_TAB_OPTION] : base;
  }, [showFrequentTab, tr]);

  // ⭐️ タブに出ていなければ (ピン留めを外して 0 件になった等)、食材/一皿料理へ戻す
  const activeTab: QuickLogTabKey = selectedTab === 'frequent' && !showFrequentTab ? selectedMode : selectedTab;

  // ⭐️ の並びはタブを開いたときに確定させ、表示中は固定する。
  // 記録のたびに並べ替えると、押したピルが指の下で動いてしまう。
  // 取り直すのは ①空のとき (起動直後の settings 読み込み待ち) ②ピン留め・「表示しない」を変えたとき
  // (編集シートから戻った直後に反映する)。記録 (history の更新) では取り直さない。
  const frequentPins = settings.frequentPins;
  const frequentHidden = settings.frequentHidden;
  const myFoods = settings.myFoods;
  const [frequentLayout, setFrequentLayout] = useState<{
    pinned: FrequentItem[];
    auto: FrequentItem[];
    /** ⭐️タブの下段 (My食品の棚) に出す id。開いたときに確定し、表示中は動かさない (押した行が動かないように) */
    shelfIds: string[];
    settingsKey: string;
  }>(EMPTY_FREQUENT_LAYOUT);
  useEffect(() => {
    if (activeTab !== 'frequent') {
      setFrequentLayout((prev) => (prev === EMPTY_FREQUENT_LAYOUT ? prev : EMPTY_FREQUENT_LAYOUT));
      return;
    }
    // My食品は、増減したとき (保存・削除) だけ取り直す。記録して最近使った時刻が変わっても並びは動かさない
    const settingsKey = `${(frequentPins ?? []).join(',')}|${(frequentHidden ?? []).join(',')}|${(myFoods ?? []).map((f) => f.id).sort().join(',')}`;
    setFrequentLayout((prev) => {
      const isEmpty = prev.pinned.length + prev.auto.length + prev.shelfIds.length === 0;
      if (!isEmpty && prev.settingsKey === settingsKey) return prev;
      return {
        ...composeFrequentItems(history, {
          pins: frequentPins,
          hidden: frequentHidden,
          nowISO: new Date().toISOString(),
          autoLimit: FREQUENT_PILL_CANDIDATES,
        }),
        shelfIds: recentMyFoods(myFoods, MY_FOOD_SHELF_LIMIT).map((f) => f.id),
        settingsKey,
      };
    });
  }, [activeTab, history, frequentPins, frequentHidden, myFoods]);

  const effectiveMode = activeTab === 'frequent' ? selectedMode : activeTab;
  const categories = useMemo(
    () => buildRegistry(locale, uiLanguage).buckets.filter((b: BucketDef) => b.tab === effectiveMode),
    [locale, uiLanguage, effectiveMode],
  );

  const { gridGap, gridColumns } = QUICK_LOG_TOKENS;
  const buttonHeight = getQuickLogButtonHeight(screenWidth);
  const iconSize = getIconSize(screenWidth);
  const iconContainerSize = getIconContainerSize(screenWidth);
  const labelFontSize = getLabelFontSize(screenWidth);

  const rows: BucketDef[][] = [];
  for (let i = 0; i < categories.length; i += gridColumns) {
    rows.push(categories.slice(i, i + gridColumns));
  }

  return (
    <View style={styles.section} testID="quick-log-section">
      <WidgetNudgeBanner />
      <View style={styles.segmentRow}>
        <SegmentedControl
          options={segmentOptions}
          value={activeTab}
          onChange={handleTabChange}
          height={QUICK_LOG_TOKENS.segmentHeight}
          borderRadius={QUICK_LOG_TOKENS.segmentRadius}
          style={{ flex: 1 }}
          testID="mode-tab"
        />
        {/* 検索は記録の主要な入口なので、アイコンだけの ghost では見つけにくかった (2026-10-19 フィードバック)。
            塗りほど主張させず、枠線で「押せるボタン」だと分かるようにし、アイコンも一段大きくする */}
        <IconButton
          icon="search"
          size="lg"
          variant="outlined"
          tone="secondary"
          onPress={handleOpenSearch}
          accessibilityLabel={tr('quicklog.a11y.search')}
          testID="open-search"
        />
      </View>

      {activeTab === 'frequent' && myFoodCount > 0 ? (
        // My食品が1件以上のときは2段 (上段 = ピル1行の横スクロール / 下段 = My食品の棚)。PRD §6.5.3
        <FrequentTwoTier
          key={`${frequentLayout.settingsKey}@${buttonHeight}`}
          pinned={frequentLayout.pinned}
          auto={frequentLayout.auto}
          shelf={frequentLayout.shelfIds
            .map((id) => (myFoods ?? []).find((f) => f.id === id))
            .filter((f): f is MyFood => !!f)}
          myFoodCount={myFoodCount}
          baseHeight={buttonHeight * 3 + gridGap * 2}
          onExtraHeightChange={onExtraHeightChange}
        />
      ) : activeTab === 'frequent' ? (
        <FrequentPills
          key={`${frequentLayout.pinned.map((i) => i.identityId).join(',')}/${frequentLayout.auto.map((i) => i.identityId).join(',')}@${buttonHeight}`}
          pinned={frequentLayout.pinned}
          auto={frequentLayout.auto}
          height={buttonHeight * 3 + gridGap * 2}
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[styles.row, rowIndex < rows.length - 1 ? { marginBottom: gridGap } : null]}
            >
              {row.map((item, colIndex) => (
                <View
                  key={item.key}
                  style={[
                    styles.cellWrap,
                    colIndex < row.length - 1 ? { marginRight: gridGap } : null,
                  ]}
                >
                  <QuickLogButton
                    item={item}
                    mode={effectiveMode}
                    height={buttonHeight}
                    iconSize={iconSize}
                    iconContainerSize={iconContainerSize}
                    labelFontSize={labelFontSize}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingTop: QUICK_LOG_TOKENS.sectionPaddingTop,
    paddingBottom: QUICK_LOG_TOKENS.sectionPaddingBottom,
    backgroundColor: 'transparent',
    width: '100%',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: QUICK_LOG_TOKENS.segmentBottomSpacing,
    gap: 8,
  },
  grid: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  cellWrap: {
    flex: 1,
    minWidth: 0,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    // 影 (elevation.xs) が切れないよう overflow は既定のまま。はみ出しは visibleCount で落とす
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillMeasuring: {
    opacity: 0,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shelfRow: {
    height: SHELF_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cell: {
    width: '100%',
  },
  button: {
    width: '100%',
    borderRadius: QUICK_LOG_TOKENS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: QUICK_LOG_TOKENS.iconLabelSpacing,
  },
  iconEmoji: {
    fontSize: QUICK_LOG_TOKENS.iconSize,
    lineHeight: QUICK_LOG_TOKENS.iconSize + 2,
  },
  label: {
    lineHeight: QUICK_LOG_TOKENS.labelLineHeight,
    fontWeight: '600',
    textAlign: 'center',
  },
});
