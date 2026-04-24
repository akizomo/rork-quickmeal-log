import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { palette } from '@/constants/theme';
import { MAX_PAST_LOGGING_DAYS, useAppState } from '@/providers/app-state-provider';
import type { FoodLog } from '@/types/nutrition';
import {
  addDays,
  diffInDays,
  formatShortDay,
  getHistoryStartDate,
  logsForDate,
  startOfDay,
} from '@/utils/history';
import { formatDateKey } from '@/utils/nutrition';

import { QuickLogSection } from '@/components/QuickLogSection';
import { StatusCard } from '@/components/nutrition-ui';

interface HomeDatePagerProps {
  onViewedDateChange?: (date: Date) => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

const PastDayLogItem = memo(function PastDayLogItem({
  log,
  editable,
}: {
  log: FoodLog;
  editable: boolean;
}) {
  const { setEditorLogId, deleteLog } = useAppState();
  const inner = (
    <View style={styles.logItem} testID={`past-log-${log.id}`}>
      <View style={styles.logTopRow}>
        <Text style={styles.logTitle} numberOfLines={1}>
          {log.subTypeLabel ?? log.categoryLabel}
        </Text>
        <Text style={styles.logKcal}>{Math.round(log.macro.kcal)} kcal</Text>
      </View>
      <Text style={styles.logSub}>
        {formatTime(log.timestamp)} · P{Math.round(log.macro.protein)} F{Math.round(log.macro.fat)} C{Math.round(log.macro.carbs)}
      </Text>
      {editable ? (
        <View style={styles.logActionRow}>
          <Pressable
            style={styles.deleteButton}
            onPress={() => deleteLog(log.id)}
            testID={`past-log-delete-${log.id}`}
          >
            <Text style={styles.deleteButtonText}>削除</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
  if (!editable) return inner;
  return (
    <Pressable onPress={() => setEditorLogId(log.id)} testID={`past-log-press-${log.id}`}>
      {inner}
    </Pressable>
  );
});

const DayLogList = memo(function DayLogList({
  date,
  editable,
}: {
  date: Date;
  editable: boolean;
}) {
  const { logs } = useAppState();
  const dateKey = formatDateKey(date);
  const dayLogs = useMemo(() => logsForDate(logs, dateKey), [logs, dateKey]);
  const totalKcal = useMemo(
    () => dayLogs.reduce((acc, log) => acc + log.macro.kcal, 0),
    [dayLogs]
  );

  return (
    <View style={styles.dayListWrap}>
      <View style={styles.pastListHeader}>
        <Text style={styles.pastListTitle}>{formatShortDay(date)} の記録</Text>
        <Text style={styles.pastListMeta}>
          {dayLogs.length}件 · {Math.round(totalKcal)} kcal
        </Text>
      </View>
      {dayLogs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>この日の記録はありません</Text>
          <Text style={styles.emptyText}>
            {editable
              ? '下のボタンからこの日の食事を追加できます。'
              : '記録は当日と直近7日のみ追加できます。'}
          </Text>
        </View>
      ) : (
        dayLogs.map((log) => (
          <PastDayLogItem key={log.id} log={log} editable={editable} />
        ))
      )}
    </View>
  );
});

interface DayPageProps {
  date: Date;
  daysAgo: number;
  width: number;
}

const DayPage = memo(function DayPage({ date, daysAgo, width }: DayPageProps) {
  const isToday = daysAgo === 0;
  const editable = daysAgo >= 0 && daysAgo <= MAX_PAST_LOGGING_DAYS;

  if (isToday) {
    return (
      <View style={[styles.page, { width }]}>
        <View style={styles.statusCardWrap}>
          <StatusCard viewedDate={date} />
        </View>
        <QuickLogSection />
      </View>
    );
  }

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        style={styles.pastScroll}
        contentContainerStyle={styles.pastScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StatusCard viewedDate={date} />
        {editable ? (
          <View style={styles.pastBanner} testID={`past-banner-${formatDateKey(date)}`}>
            <Text style={styles.pastBannerText}>
              {formatShortDay(date)} に記録します
            </Text>
          </View>
        ) : (
          <View style={styles.pastBannerReadonly}>
            <Text style={styles.pastBannerReadonlyText}>
              {MAX_PAST_LOGGING_DAYS}日以上前の日付には記録を追加できません
            </Text>
          </View>
        )}
        {editable ? <QuickLogSection /> : null}
        <DayLogList date={date} editable={editable} />
      </ScrollView>
    </View>
  );
});

export const HomeDatePager = memo(function HomeDatePager({ onViewedDateChange }: HomeDatePagerProps) {
  const { settings, logs, setLoggingDate } = useAppState();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ date?: string }>();

  const today = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(
    () => getHistoryStartDate(settings.onboardingCompletedAtISO ?? null, logs),
    [settings.onboardingCompletedAtISO, logs]
  );

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

  // Notify parent and sync loggingDate so QuickLog writes to the viewed day.
  useEffect(() => {
    const viewed = dates[currentIndex];
    if (!viewed) return;
    if (onViewedDateChange) onViewedDateChange(viewed);
    const daysAgo = diffInDays(today, viewed);
    if (daysAgo === 0) {
      setLoggingDate(null); // log to today (default)
    } else if (daysAgo > 0 && daysAgo <= MAX_PAST_LOGGING_DAYS) {
      setLoggingDate(viewed);
    } else {
      setLoggingDate(null); // outside editable range, no logging anyway
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
      <DayPage date={item} daysAgo={diffInDays(today, item)} width={width} />
    ),
    [today, width]
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
    <View style={styles.container}>
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
  statusCardWrap: {},
  pastScroll: {
    flex: 1,
  },
  pastScrollContent: {
    paddingTop: 6,
    paddingBottom: 40,
    gap: 8,
  },
  pastListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  pastListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  pastListMeta: {
    fontSize: 12,
    color: palette.textMuted,
  },
  dayListWrap: {
    gap: 8,
  },
  pastBanner: {
    backgroundColor: '#E9E2D2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  pastBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  pastBannerReadonly: {
    backgroundColor: '#F0E8D8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pastBannerReadonlyText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  logActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#F0E2DD',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  logItem: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  logTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  logKcal: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  logSub: {
    fontSize: 12,
    color: palette.textMuted,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  emptyText: {
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 18,
  },
});
