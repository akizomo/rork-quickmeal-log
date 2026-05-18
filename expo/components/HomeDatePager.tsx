import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { MAX_PAST_LOGGING_DAYS, useAppState } from '@/providers/app-state-provider';
import {
  addDays,
  diffInDays,
  getHistoryStartDate,
  startOfDay,
} from '@/utils/history';
import { formatDateKey } from '@/utils/nutrition';

import { PEEK_HEIGHT_PX } from '@/components/DayLogBottomSheet';
import { getQuickLogButtonHeight, QUICK_LOG_TOKENS, QuickLogSection } from '@/components/QuickLogSection';
import { StatusCard } from '@/components/nutrition-ui';

// QuickLog と BottomSheet peek の間のギャップ (左右パディングと揃える)
const QUICKLOG_BOTTOM_GAP = 16;

// QuickLogSection の自然高さ (search bar コメントアウト中の前提):
// sectionPaddingTop + segmentHeight + segmentBottomSpacing
// + 3 * buttonHeight + 2 * gridGap + sectionPaddingBottom
function computeQuickLogHeight(screenWidth: number): number {
  const buttonH = getQuickLogButtonHeight(screenWidth);
  const t = QUICK_LOG_TOKENS;
  return (
    t.sectionPaddingTop +
    t.segmentHeight +
    t.segmentBottomSpacing +
    3 * buttonH +
    2 * t.gridGap +
    t.sectionPaddingBottom
  );
}

interface HomeDatePagerProps {
  onViewedDateChange?: (date: Date) => void;
  /** StatusCard 左「食事」エリアタップ時の callback (DayLogBottomSheet を開く用途) */
  onFoodPress?: () => void;
}

interface DayPageProps {
  date: Date;
  width: number;
  height: number;
  bottomReserve: number;
  onFoodPress?: () => void;
}

const DayPage = memo(function DayPage({ date, width, height, bottomReserve, onFoodPress }: DayPageProps) {
  // height === 0 (初回 layout 前) は flex:1 にフォールバック。
  // 確定したら明示 height + 中央寄せ + 下端リザーブで StatusCard を画面中央に配置。
  if (height <= 0) {
    return (
      <View style={[styles.page, { width }]}>
        <StatusCard viewedDate={date} onFoodPress={onFoodPress} />
      </View>
    );
  }
  return (
    <View
      style={{
        width,
        height,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: bottomReserve,
        justifyContent: 'center',
      }}
    >
      <StatusCard viewedDate={date} onFoodPress={onFoodPress} />
    </View>
  );
});

export const HomeDatePager = memo(function HomeDatePager({ onViewedDateChange, onFoodPress }: HomeDatePagerProps) {
  // Defensive default — useAppState() can momentarily return undefined during
  // ErrorBoundary recovery / fast HMR re-mounts before the provider context is
  // wired up. Read each field through optional chaining + per-field fallbacks
  // (instead of one wide `as never` cast) so downstream type inference is
  // preserved.
  const appState = useAppState() as ReturnType<typeof useAppState> | undefined;
  const settings = appState?.settings ?? ({ onboardingCompletedAtISO: null } as ReturnType<typeof useAppState>['settings']);
  const logs = appState?.logs ?? [];
  const setLoggingDate = appState?.setLoggingDate ?? ((_: Date | null) => undefined);
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ date?: string }>();

  const today = useMemo(() => startOfDay(new Date()), []);

  // HOME pager は編集可能ウィンドウ (今日 〜 MAX_PAST_LOGGING_DAYS 日前) のみを対象とする。
  // それより古いログは Stats ページから振り返る。新規ユーザー (onboarding 直後) で
  // まだ 7 日経っていないケースは onboarding 開始日を起点にする。
  const startDate = useMemo(() => {
    const historyStart = getHistoryStartDate(settings.onboardingCompletedAtISO ?? null, logs);
    const earliestEditable = addDays(today, -MAX_PAST_LOGGING_DAYS);
    return historyStart > earliestEditable ? historyStart : earliestEditable;
  }, [settings.onboardingCompletedAtISO, logs, today]);

  // Total number of pages (start ... today inclusive)
  const totalDays = useMemo(() => Math.max(1, diffInDays(today, startDate) + 1), [today, startDate]);

  // Build dates array (oldest -> today)
  const dates = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(startDate, i)),
    [startDate, totalDays]
  );

  // initialIndex: today (last) by default, or matching ?date= param
  const initialIndex = useMemo(() => {
    if (params.date) {
      const target = new Date(params.date);
      if (!Number.isNaN(target.getTime())) {
        const idx = diffInDays(target, startDate);
        if (idx >= 0 && idx < totalDays) return idx;
      }
    }
    return totalDays - 1;
  }, [params.date, startDate, totalDays]);

  const listRef = useRef<FlatList<Date>>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  // FlatList の親コンテナ高さ実測値。FlatList horizontal の item は RN-Web 上で
  // 親 height を継承しないため、measured height を DayPage に明示的に渡す。
  const [pagerHeight, setPagerHeight] = useState<number>(0);
  const onContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      setPagerHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
    },
    []
  );

  // QuickLog の自然高さ + peek 領域 = DayPage 下端で空けておくべきエリア
  const quickLogHeight = useMemo(() => computeQuickLogHeight(width), [width]);
  const bottomReserve = PEEK_HEIGHT_PX + QUICKLOG_BOTTOM_GAP + quickLogHeight;

  // Notify parent and sync loggingDate so QuickLog writes to the viewed day.
  useEffect(() => {
    const viewed = dates[currentIndex];
    if (!viewed) return;
    if (onViewedDateChange) onViewedDateChange(viewed);
    const daysAgo = diffInDays(today, viewed);
    if (daysAgo === 0) {
      setLoggingDate(null); // log to today (default)
    } else {
      // pager 範囲はクランプ済みなので、ここに来るのは編集可能日のみ
      setLoggingDate(viewed);
    }
  }, [currentIndex, dates, onViewedDateChange, setLoggingDate, today]);

  // Reset loggingDate on unmount
  useEffect(() => {
    return () => {
      setLoggingDate(null);
    };
  }, [setLoggingDate]);

  // Re-snap when initialIndex changes (e.g., new ?date= param)
  useEffect(() => {
    if (initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      if (idx !== currentIndex && idx >= 0 && idx < dates.length) {
        setCurrentIndex(idx);
      }
    },
    [currentIndex, dates.length, width]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Date>) => (
      <DayPage
        date={item}
        width={width}
        height={pagerHeight}
        bottomReserve={bottomReserve}
        onFoodPress={onFoodPress}
      />
    ),
    [width, pagerHeight, bottomReserve, onFoodPress]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Date> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width]
  );

  const keyExtractor = useCallback((d: Date) => formatDateKey(d), []);

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        windowSize={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews
        testID="home-date-pager"
      />
      {/* QuickLog は FlatList の兄弟として absolute で画面下端に固定する。
          bottom = PEEK_HEIGHT_PX + 余白 で DayLogBottomSheet の peek (画面下端 120px)
          に隠れないようにする。日付スワイプとは独立して常に同じ位置に表示される。 */}
      <View style={styles.quickLogPin}>
        <QuickLogSection />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  quickLogPin: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: PEEK_HEIGHT_PX + QUICKLOG_BOTTOM_GAP,
  },
});
