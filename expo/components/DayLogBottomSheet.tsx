import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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

import { getIdentity } from '@/constants/identity';
import { MealLogCard, useTheme } from '@/design-system';
import { spring } from '@/design-system/tokens/primitives/motion';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { radius } from '@/design-system/tokens/primitives/radius';
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
export const PEEK_HEIGHT_PX = 88;

const SNAP_RATIOS: Record<Exclude<SnapStage, 'peek'>, number> = {
  half: 0.45,
  full: 0.88,
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
    <MealLogCard onPress={handlePress} testID={`log-item-${log.id}`}>
      <MealLogCard.Header
        title={display.title}
        bucket={display.bucketHint}
        kcal={log.macro.kcal}
        time={formatTime(log.timestamp)}
        onDelete={() => deleteLog(log.id)}
        deleteTestID={`log-delete-${log.id}`}
      />
      <MealLogCard.Body
        amount={display.amountText}
        subtitle={display.subtitle}
        addons={display.addonsText}
        protein={log.macro.protein}
        fat={log.macro.fat}
        carbs={log.macro.carbs}
        subtitleTestID={`log-attr-${log.id}`}
        addonsTestID={`log-topping-${log.id}`}
      />
    </MealLogCard>
  );
}

interface Props {
  viewedDate: Date;
}

export interface DayLogBottomSheetRef {
  /** half スナップを呼び出す (親からのタップで開く用途) */
  snapToHalf: () => void;
}

export const DayLogBottomSheet = memo(
  forwardRef<DayLogBottomSheetRef, Props>(function DayLogBottomSheet({ viewedDate }, ref) {
  const t = useTheme();
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
        ...spring.enter,
      }).start();
    },
    [snapTargets, translateY]
  );

  useImperativeHandle(ref, () => ({
    snapToHalf: () => animateTo('half'),
  }), [animateTo]);

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
            // full からの素早い下スワイプは half を経由せず一気に peek (閉じる) へ。
            chosen = 'peek';
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

  // half スナップでは sheet 自体は fullHeight 固定で translateY で隠しているため、
  // ScrollView のビューポート下端が画面外 (fullHeight - 可視高さ ぶん下) に伸びる。
  // そのままだと最大スクロール時に最後の項目が画面外領域に留まり可達できないので、
  // はみ出し量ぶんだけ paddingBottom を足し、末尾を可視窓まで引き上げられるようにする。
  const visibleHeight =
    stage === 'peek' ? peekHeight : stage === 'half' ? halfHeight : fullHeight;
  const listBottomPad = insets.bottom + 24 + (fullHeight - visibleHeight);

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
        // scrim(暗幕)は常に黒固定 (Dialog.tsx/BottomSheet.tsx と同じ規約)。
        // surface.inverse を使うとdarkテーマでほぼ白(ivory[50])に反転し、
        // シートを開くと逆に背景が明転するバグだった (2026-08-07指摘)。
        style={[styles.backdrop, { backgroundColor: '#000', opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => animateTo('half')} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            ...t.elevation.xl,
            // シートは画面下端から立ち上がるので、影は上方向に出す (t.elevation.xlの
            // shadowColorは既にテーマ対応済みなので上書きしない。旧実装は
            // surface.inverse で上書きしており、darkでは意図せず正しく見えていただけの
            // 偶然の一致だった)。
            shadowOffset: { width: 0, height: -6 },
            backgroundColor: t.colors.surface.default,
            height: sheetMaxHeight,
            transform: [{ translateY }],
          },
        ]}
        testID="day-log-sheet"
      >
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <Pressable onPress={handleHandlePress} style={styles.handlePressable}>
            <View style={[styles.handle, { backgroundColor: t.colors.content.disabled }]} />
          </Pressable>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: t.colors.content.primary }]}>{titleText}</Text>
              <Text style={[styles.subtitle, { color: t.colors.content.secondary }]}>
                {dayLogs.length}件 · {Math.round(dayMacro.kcal)} kcal
              </Text>
            </View>
            <Pressable
              onPress={handleHandlePress}
              style={[styles.stagePill, { backgroundColor: t.colors.surface.raised }]}
              testID="sheet-stage-toggle"
            >
              <Text style={[styles.stagePillText, { color: t.colors.action.text.default }]}>
                {stage === 'peek' ? 'ひらく' : stage === 'half' ? '全画面' : 'とじる'}
              </Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: listBottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={stage !== 'peek'}
        >
          {dayLogs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: t.colors.surface.raised }]}>
              <Text style={[styles.emptyTitle, { color: t.colors.content.primary }]}>まだ記録はありません</Text>
              <Text style={[styles.emptyText, { color: t.colors.content.secondary }]}>上のボタンから、その日の食事をすばやく残せます。</Text>
            </View>
          ) : (
            dayLogs.map((log) => <LogListItem key={log.id} log={log} />)
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}));
DayLogBottomSheet.displayName = 'DayLogBottomSheet';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleArea: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  handlePressable: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  headerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fs.md,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
    fontSize: fs.sm,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  // Badge md 相当のジオメトリ (paddingH 12 / radius full) なのでサイズも Badge md に揃える
  stagePillText: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  emptyState: {
    borderRadius: radius.xl,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: fs.md,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: fs.sm,
    lineHeight: 19,
  },
});
