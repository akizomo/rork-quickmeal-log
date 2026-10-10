import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useT } from '@/hooks/useT';

import { Body, Button, Icon, IconButton, Label, useTheme } from '@/design-system';
import { duration } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { SegmentedControl } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { useLocale } from '@/hooks/useLocale';
import type { BucketDef, BucketKey } from '@/types/identity';
import { buildRegistry } from '@/constants/identity';
import { deriveDefaultTab, FREQUENT_TAB_MIN_LOGS, rankFrequentIdentities, type RankedIdentity } from '@/utils/quick-log-history';
import type { QuickLogTabKey } from '@/types/quick-log';
import { widgetRequestPin } from '@/utils/widget-bridge';
import { SearchSheet } from '@/components/SearchSheet';

export const QUICK_LOG_TOKENS = {
  sectionPaddingHorizontal: 16,
  sectionPaddingTop: 8,
  sectionPaddingBottom: 8,
  segmentHeight: 36,
  segmentRadius: 18,
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

/**
 * ⭐️ タブ: よく選ぶ Identity を名前だけのピルで並べる。
 * 大きさは全部同じで、並び順が順位 (位置を覚えて押せるように)。
 * タップ = いつもの量で記録 / 長押し = 量シート。
 * 高さは通常グリッドに揃え、収まりきらない行のピルは出さない
 * (タブ切り替えで下のコンテンツが跳ねず、空白も残さない)。
 */
const FrequentPills = memo(function FrequentPills({
  items,
  height,
}: {
  items: RankedIdentity[];
  height: number;
}) {
  const { quickLogIdentity, openIdentityLogSheet } = useAppState();
  const t = useTheme();
  // 各ピルの下端 (container 内の y + 高さ)。測り終えたら収まる数で切る。
  // 折り返しは左から順に詰まるので、後ろを消しても前のピルの位置は動かない。
  const bottomsRef = useRef<number[]>([]);
  // items / height が変わったら測り直す。親が key で作り直すので、ここでは初期値だけ持つ。
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const handlePillLayout = (index: number, e: LayoutChangeEvent) => {
    if (visibleCount !== null) return;
    const { y, height: h } = e.nativeEvent.layout;
    bottomsRef.current[index] = y + h;
    const measured = bottomsRef.current.filter((b) => b !== undefined).length;
    if (measured < items.length) return;
    const firstOverflow = bottomsRef.current.findIndex((b) => b > height);
    setVisibleCount(firstOverflow === -1 ? items.length : firstOverflow);
  };

  const shown = visibleCount === null ? items : items.slice(0, visibleCount);

  return (
    <View
      style={[styles.pillWrap, { gap: t.spacing['2'], height }]}
      testID="frequent-pills"
    >
      {shown.map((item, index) => (
        <View
          key={item.identityId}
          onLayout={(e) => handlePillLayout(index, e)}
          // 測定中は見せない (はみ出す行が一瞬見えるのを防ぐ)
          style={visibleCount === null ? styles.pillMeasuring : null}
        >
          <Button
            label={item.label}
            variant="raised"
            size="sm"
            onPress={() => void quickLogIdentity(item.identityId, 'frequent')}
            onLongPress={() =>
              openIdentityLogSheet(item.bucketKey as BucketKey, {
                identityId: item.identityId,
                sourceTab: 'frequent',
              })
            }
            delayLongPress={320}
            testID={`frequent-pill-${item.identityId}`}
          />
        </View>
      ))}
    </View>
  );
});

export const QuickLogSection = memo(function QuickLogSection() {
  const { selectedMode, setSelectedMode, settings, quickLog, bumpDiagnostic } = useAppState();
  const tr = useT();
  const { foodRegion: locale, uiLanguage } = useLocale();
  const { width: screenWidth } = useWindowDimensions();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleOpenSearch = useCallback(() => {
    bumpDiagnostic('searchOpenCount');
    setSearchOpen(true);
  }, [bumpDiagnostic]);

  const history = settings.quickLogHistory as import('@/types/quick-log').QuickLogHistoryMap | undefined;
  const totalHistoryEntries = useMemo(() => {
    if (!history) return 0;
    return Object.values(history).reduce((sum, arr) => sum + arr.length, 0);
  }, [history]);
  const showFrequentTab = totalHistoryEntries >= FREQUENT_TAB_MIN_LOGS;

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

  // ⭐️ の並びはタブを開いたときに確定させ、表示中は固定する。
  // 記録のたびに並べ替えると、押したピルが指の下で動いてしまう。
  // 空のときだけ history の更新を待って取り直す (起動直後の settings 読み込み待ち)。
  const [frequentItems, setFrequentItems] = useState<RankedIdentity[]>([]);
  useEffect(() => {
    if (selectedTab !== 'frequent') {
      setFrequentItems((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setFrequentItems((prev) =>
      prev.length > 0
        ? prev
        : rankFrequentIdentities(history, { nowISO: new Date().toISOString(), limit: FREQUENT_PILL_CANDIDATES }),
    );
  }, [selectedTab, history]);

  const effectiveMode = selectedTab === 'frequent' ? selectedMode : selectedTab;
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
          value={selectedTab}
          onChange={handleTabChange}
          style={{ flex: 1 }}
          testID="mode-tab"
        />
        <IconButton
          icon="search"
          size="md"
          tone="secondary"
          onPress={handleOpenSearch}
          accessibilityLabel={tr('quicklog.a11y.search')}
          testID="open-search"
        />
      </View>
      <SearchSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpen={() => setSearchOpen(true)}
      />

      {selectedTab === 'frequent' ? (
        <FrequentPills
          key={`${frequentItems.map((i) => i.identityId).join(',')}@${buttonHeight}`}
          items={frequentItems}
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
  pillMeasuring: {
    opacity: 0,
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
