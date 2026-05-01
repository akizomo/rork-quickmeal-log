import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { getIdentity } from '@/constants/identity';
import { useAppState } from '@/providers/app-state-provider';
import { FoodLog } from '@/types/nutrition';
import { formatShortDay, isSameDay, logsForDate, sumForDate } from '@/utils/history';
import { getLogDisplayInfo } from '@/utils/log-display';
import { formatDateKey } from '@/utils/nutrition';

type SnapStage = 'peek' | 'half' | 'full';

/**
 * peek は画面サイズに依らず親指圏内 (画面下端から ~120px) で固定。
 * 画面が大きいほど上部に空白ができるが、操作可能エリアが届かない位置に
 * ずれることを防ぐため、ratio ではなく固定 px 値を使う。
 */
export const PEEK_HEIGHT_PX = 120;

const SNAP_RATIOS: Record<Exclude<SnapStage, 'peek'>, number> = {
  half: 0.45,
  full: 0.88,
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillLabel}>{label}</Text>
      <Text style={styles.macroPillValue}>{Math.round(value)}</Text>
    </View>
  );
}

function LogListItem({ log }: { log: FoodLog }) {
  const { deleteLog, setEditorLogId, openIdentityLogSheet } = useAppState();
  const display = getLogDisplayInfo(log);
  const handlePress = () => {
    // New IA log → open IdentityLogSheet in edit mode (preload from log)
    if (log.identityId) {
      const id = getIdentity(log.identityId);
      if (id) {
        openIdentityLogSheet(id.primaryHome.bucket, {
          identityId: log.originIdentityId ?? log.identityId,
          editingLogId: log.id,
        });
        return;
      }
    }
    // Legacy log fallback → old editor
    setEditorLogId(log.id);
  };
  return (
    <Pressable
      style={styles.logItem}
      onPress={handlePress}
      testID={`log-item-${log.id}`}
    >
      <View style={styles.logItemTop}>
        <View style={styles.logItemTopLeft}>
          <View style={styles.logTitleRow}>
            <Text style={styles.logTitle} numberOfLines={1}>
              {display.title}
            </Text>
            {display.bucketHint ? (
              <Text style={styles.logBucketHint} numberOfLines={1}>
                {display.bucketHint}
              </Text>
            ) : null}
          </View>
          {display.subtitle ? (
            <Text style={styles.logSubAttr} numberOfLines={1} testID={`log-attr-${log.id}`}>
              {display.subtitle}
            </Text>
          ) : null}
          {display.addonsText ? (
            <Text style={styles.logTopping} numberOfLines={1} testID={`log-topping-${log.id}`}>
              {display.addonsText}
            </Text>
          ) : null}
          <Text style={styles.logSubtitle}>
            {formatTime(log.timestamp)} · {display.amountText}
          </Text>
        </View>
        <Text style={styles.logKcal}>{Math.round(log.macro.kcal)} kcal</Text>
      </View>
      <View style={styles.logMacroRow}>
        <MacroPill label="P" value={log.macro.protein} />
        <MacroPill label="F" value={log.macro.fat} />
        <MacroPill label="C" value={log.macro.carbs} />
      </View>
      <View style={styles.logActionRow}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => deleteLog(log.id)}
          testID={`log-delete-${log.id}`}
        >
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

interface Props {
  viewedDate: Date;
}

export const DayLogBottomSheet = memo(function DayLogBottomSheet({ viewedDate }: Props) {
  const { logs, todayLogs, todayMacro } = useAppState();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const isToday = isSameDay(viewedDate, today);
  const dateKey = formatDateKey(viewedDate);

  const dayLogs = useMemo(
    () => (isToday ? todayLogs : logsForDate(logs, dateKey)),
    [isToday, todayLogs, logs, dateKey]
  );
  const dayMacro = useMemo(
    () => (isToday ? todayMacro : sumForDate(logs, dateKey)),
    [isToday, todayMacro, logs, dateKey]
  );

  const titleText = isToday ? '今日のログ' : `${formatShortDay(viewedDate)} のログ`;

  const peekHeight = PEEK_HEIGHT_PX;
  const halfHeight = Math.round(screenHeight * SNAP_RATIOS.half);
  const fullHeight = Math.round(screenHeight * SNAP_RATIOS.full);

  const sheetMaxHeight = fullHeight;
  const translateY = useRef(new Animated.Value(sheetMaxHeight - peekHeight)).current;
  const translateYValueRef = useRef<number>(sheetMaxHeight - peekHeight);
  const [stage, setStage] = useState<SnapStage>('peek');

  const snapTargets = useMemo(() => ({
    peek: sheetMaxHeight - peekHeight,
    half: sheetMaxHeight - halfHeight,
    full: 0,
  }), [sheetMaxHeight, peekHeight, halfHeight]);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      translateYValueRef.current = value;
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  const animateTo = useCallback(
    (next: SnapStage) => {
      setStage(next);
      Animated.spring(translateY, {
        toValue: snapTargets[next],
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    },
    [snapTargets, translateY]
  );

  useEffect(() => {
    animateTo(stage);
  }, [snapTargets]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          translateY.stopAnimation((v) => {
            translateYValueRef.current = v;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(0, Math.min(sheetMaxHeight - peekHeight, translateYValueRef.current + gesture.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const current = translateYValueRef.current + gesture.dy;
          const velocity = gesture.vy;
          const targets: { stage: SnapStage; y: number }[] = [
            { stage: 'peek', y: snapTargets.peek },
            { stage: 'half', y: snapTargets.half },
            { stage: 'full', y: snapTargets.full },
          ];

          let chosen: SnapStage = stage;
          if (velocity > 0.9) {
            chosen = stage === 'full' ? 'half' : 'peek';
          } else if (velocity < -0.9) {
            chosen = stage === 'peek' ? 'half' : 'full';
          } else {
            let minDist = Number.POSITIVE_INFINITY;
            for (const t of targets) {
              const d = Math.abs(t.y - current);
              if (d < minDist) {
                minDist = d;
                chosen = t.stage;
              }
            }
          }
          animateTo(chosen);
        },
      }),
    [animateTo, peekHeight, sheetMaxHeight, snapTargets, stage, translateY]
  );

  const overlayOpacity = translateY.interpolate({
    inputRange: [snapTargets.full, snapTargets.half],
    outputRange: [0.35, 0],
    extrapolate: 'clamp',
  });

  const handleHandlePress = () => {
    if (stage === 'peek') animateTo('half');
    else if (stage === 'half') animateTo('full');
    else animateTo('peek');
  };

  return (
    <>
      <Animated.View
        pointerEvents={stage === 'full' ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => animateTo('half')} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetMaxHeight,
            transform: [{ translateY }],
          },
        ]}
        testID="day-log-sheet"
      >
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <Pressable onPress={handleHandlePress} style={styles.handlePressable}>
            <View style={styles.handle} />
          </Pressable>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subtitle}>
                {dayLogs.length}件 · {Math.round(dayMacro.kcal)} kcal
              </Text>
            </View>
            <Pressable
              onPress={handleHandlePress}
              style={styles.stagePill}
              testID="sheet-stage-toggle"
            >
              <Text style={styles.stagePillText}>
                {stage === 'peek' ? '開く' : stage === 'half' ? '全画面' : '閉じる'}
              </Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={stage !== 'peek'}
        >
          {dayLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>まだ記録はありません</Text>
              <Text style={styles.emptyText}>上のボタンから、その日の食事をすばやく残せます。</Text>
            </View>
          ) : (
            dayLogs.map((log) => <LogListItem key={log.id} log={log} />)
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2C23',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#1F2C23',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handleArea: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  handlePressable: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#C6C6BD',
  },
  headerRow: {
    marginTop: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#243228',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: palette.textMuted,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.card,
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 10,
  },
  emptyState: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.textMuted,
  },
  logItem: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  logItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  logItemTopLeft: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#243128',
  },
  logBucketHint: {
    fontSize: 11,
    color: palette.textMuted,
    backgroundColor: '#ECE5D9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  logSubAttr: {
    marginTop: 3,
    fontSize: 12,
    color: palette.text,
    fontWeight: '500',
  },
  logSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: palette.textMuted,
  },
  logTopping: {
    marginTop: 3,
    fontSize: 12,
    color: palette.sageStrong,
    fontWeight: '600',
  },
  logKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.sageDeep,
  },
  logMacroRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECE5D9',
  },
  macroPillLabel: {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: '700',
  },
  macroPillValue: {
    fontSize: 11,
    color: palette.text,
    fontWeight: '700',
  },
  logActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountButtonText: {
    fontSize: 15,
    color: palette.text,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 13,
    color: palette.textMuted,
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
});
