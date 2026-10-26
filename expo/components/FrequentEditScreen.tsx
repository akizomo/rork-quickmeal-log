/**
 * ⭐️ タブの編集ページ (PRD §6.5.3)。`/frequent-edit`。通常の下層ページ (シートではない)。
 *
 * 2026-10-26: 当初は formSheet だったが、つまみのドラッグ (縦) がシートのスワイプ閉じと重なって
 * 並べ替えにならなかったため、下層ページにした。戻るのは左端スワイプか左上の戻るボタン。
 *
 * 並べ替え・ピン留めを外す・自動分を「表示しない」・「表示しない」を戻す、をここにまとめる。
 * 普段のホームには操作を増やさず、整えたい人だけがここへ来る。
 *
 * - 並べ替えは「上へ / 下へ」(ドラッグ用ライブラリを足さない。2026-10-25 の合意で可)
 * - 自動分は、ホームと同じランキングをシートを開いた時点で確定して並べる。「表示しない」にしても
 *   並びは動かず、そのぶん下の候補が繰り上がるだけ
 * - ドラッグ中は ScrollView のスクロールを止める (縦ドラッグとスクロールが取り合わないように)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Icon,
  Label,
  SettingsDivider,
  SettingsLinkRow,
  SettingsListCard,
  SettingsSectionLabel,
  useTheme,
} from '@/design-system';
import { duration, easing } from '@/design-system/tokens/primitives/motion';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import {
  FREQUENT_EDIT_AUTO_LIMIT,
  type FrequentItem,
  resolveHiddenItems,
  resolvePinnedItems,
} from '@/utils/frequent-pins';
import { rankFrequentIdentities } from '@/utils/quick-log-history';
import type { QuickLogHistoryMap } from '@/types/quick-log';

/** ピン留めの1行の高さ。ドラッグで「何行ぶん動いたか」を数えるので固定にする。 */
const PIN_ROW_HEIGHT = 56;

/**
 * ピン留めの並べ替えリスト。行の右端のつまみ (≡) をドラッグして順番を変える。
 * ドラッグ用ライブラリは足さず、RN の PanResponder + Animated で組む (依存を増やさない)。
 *
 * - 動かしている行は指に追従し、ほかの行は1行ぶんずつ道を空ける
 * - 離したところで順番を確定する (`onMoveTo`)。ドラッグ中は本文のスクロールを止める (`onDraggingChange`)
 * - スクリーンリーダーでは、つまみに「上へ / 下へ」の操作を付ける (ドラッグできない人のため)
 */
function PinnedList({
  items,
  onMoveTo,
  onMoveStep,
  onRemove,
  onDraggingChange,
}: {
  items: FrequentItem[];
  onMoveTo: (id: string, toIndex: number) => void;
  onMoveStep: (id: string, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const t = useTheme();
  const tr = useT();
  const [drag, setDrag] = useState<{ id: string; from: number; to: number } | null>(null);
  const [dragY] = useState(() => new Animated.Value(0));

  // ドラッグ中の位置に応じて、ほかの行が道を空ける量 (1行ぶん)
  const shiftTargetOf = (id: string, index: number): number => {
    if (!drag || id === drag.id) return 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -PIN_ROW_HEIGHT;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return PIN_ROW_HEIGHT;
    return 0;
  };

  const finish = (id: string, from: number, dy: number, commit: boolean) => {
    const to = Math.max(0, Math.min(items.length - 1, Math.round(from + dy / PIN_ROW_HEIGHT)));
    dragY.setValue(0);
    setDrag(null);
    onDraggingChange(false);
    if (commit && to !== from) onMoveTo(id, to);
  };

  return (
    <SettingsListCard testID="frequent-edit-pinned">
      {items.map((item, index) => {
        const dragging = drag?.id === item.identityId;
        return (
          <PinRow
            key={item.identityId}
            item={item}
            index={index}
            last={index === items.length - 1}
            dragging={dragging}
            dragY={dragY}
            shiftTarget={shiftTargetOf(item.identityId, index)}
            anyDragging={drag !== null}
            onDragStart={() => {
              onDraggingChange(true);
              setDrag({ id: item.identityId, from: index, to: index });
            }}
            onDragMove={(dy) => {
              dragY.setValue(dy);
              const to = Math.max(0, Math.min(items.length - 1, Math.round(index + dy / PIN_ROW_HEIGHT)));
              setDrag((d) => (d && d.to !== to ? { ...d, to } : d));
            }}
            onDragEnd={(dy, commit) => finish(item.identityId, index, dy, commit)}
            onMoveStep={(dir) => onMoveStep(item.identityId, dir)}
            onRemove={() => onRemove(item.identityId)}
            t={t}
            tr={tr}
          />
        );
      })}
    </SettingsListCard>
  );
}

function PinRow({
  item,
  index,
  last,
  dragging,
  dragY,
  shiftTarget,
  anyDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMoveStep,
  onRemove,
  t,
  tr,
}: {
  item: FrequentItem;
  index: number;
  last: boolean;
  dragging: boolean;
  /** 動かしている行が指に追従するぶん (動かしている行だけが使う) */
  dragY: Animated.Value;
  /** ほかの行を動かしているとき、この行が道を空けるぶん */
  shiftTarget: number;
  anyDragging: boolean;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: (dy: number, commit: boolean) => void;
  onMoveStep: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  t: ReturnType<typeof useTheme>;
  tr: ReturnType<typeof useT>;
}) {
  // PanResponder は作り直さないので、最新のコールバックは ref 経由で呼ぶ
  const handlers = useRef({ onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    handlers.current = { onDragStart, onDragMove, onDragEnd };
  });
  const [shift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!anyDragging) {
      // ドラッグが終わったら、新しい並びの位置に即座に戻す (動かすと確定後にもう一度滑って見える)
      shift.setValue(0);
      return;
    }
    Animated.timing(shift, {
      toValue: shiftTarget,
      duration: duration.fast,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: true,
    }).start();
  }, [anyDragging, shiftTarget, shift]);
  // ref は PanResponder の各コールバック (ジェスチャー中) でだけ読む。render 中には読まない
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 本文の ScrollView やシートに、ドラッグを横取りさせない
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => handlers.current.onDragStart(),
      onPanResponderMove: (_, g) => handlers.current.onDragMove(g.dy),
      onPanResponderRelease: (_, g) => handlers.current.onDragEnd(g.dy, true),
      onPanResponderTerminate: (_, g) => handlers.current.onDragEnd(g.dy, false),
    }),
  );

  return (
    <Animated.View
      style={[
        styles.pinRow,
        {
          height: PIN_ROW_HEIGHT,
          borderBottomWidth: last || dragging ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: t.colors.border.subtle,
          transform: [{ translateY: dragging ? dragY : shift }],
          zIndex: dragging ? 1 : 0,
        },
        // 持ち上げている行は、ほかの行の上に浮かせる (影は覆いかぶさるものにだけ付ける)
        dragging ? { backgroundColor: t.colors.surface.raised, borderRadius: t.radius.md, ...t.elevation.md } : null,
      ]}
      testID={`frequent-edit-pin-${item.identityId}`}
    >
      <View style={{ flex: 1 }}>
        <Body numberOfLines={1}>{item.label}</Body>
      </View>
      <Button
        label={tr('frequentEdit.pinned.remove')}
        variant="plain"
        size="sm"
        onPress={onRemove}
        accessibilityLabel={tr('frequentEdit.pinned.removeA11y', { label: item.label })}
        testID={`frequent-edit-unpin-${item.identityId}`}
      />
      <View
        {...pan.panHandlers}
        style={styles.handle}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={tr('frequentEdit.pinned.handleA11y', { label: item.label })}
        accessibilityActions={[
          ...(index > 0 ? [{ name: 'decrement' as const, label: tr('frequentEdit.pinned.moveUpA11y', { label: item.label }) }] : []),
          ...(!last ? [{ name: 'increment' as const, label: tr('frequentEdit.pinned.moveDownA11y', { label: item.label }) }] : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'decrement') onMoveStep('up');
          if (e.nativeEvent.actionName === 'increment') onMoveStep('down');
        }}
        testID={`frequent-edit-handle-${item.identityId}`}
      >
        <Icon name="dragHandle" size={22} color={t.colors.content.tertiary} />
      </View>
    </Animated.View>
  );
}

export function FrequentEditScreen() {
  const t = useTheme();
  const tr = useT();
  const { settings, setFrequentPinned, moveFrequentPin, moveFrequentPinTo, setFrequentHidden } = useAppState();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pins = settings.frequentPins;
  const hidden = settings.frequentHidden;
  const history = settings.quickLogHistory as QuickLogHistoryMap | undefined;

  // 候補の順位は履歴から求め、「表示しない」などの操作では並べ替えない (編集中に行が跳ねないように)。
  // 履歴が変わるのは記録したときだけなので、編集シートを開いている間は実質固定。
  const rankedCandidates = useMemo(
    () => rankFrequentIdentities(history, { nowISO: new Date().toISOString(), limit: Infinity }),
    [history],
  );

  const pinnedItems = resolvePinnedItems(pins);
  const pinnedIds = new Set(pinnedItems.map((i) => i.identityId));
  const hiddenItems = resolveHiddenItems(hidden);
  const hiddenIds = new Set(hiddenItems.map((i) => i.identityId));
  const autoItems = rankedCandidates
    .filter((i) => !pinnedIds.has(i.identityId) && !hiddenIds.has(i.identityId))
    .slice(0, FREQUENT_EDIT_AUTO_LIMIT);

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: t.spacing['5'], paddingBottom: t.spacing['8'] }}
      scrollEnabled={!dragging}
      testID="frequent-edit"
    >
      <View style={{ gap: t.spacing['6'] }}>
        <Body size="sm" tone="secondary">
          {tr('frequentEdit.intro')}
        </Body>

        {/* 自分で選んだもの (ピン留め) */}
        <View style={{ gap: t.spacing['2'] }}>
          <SettingsSectionLabel>{tr('frequentEdit.pinned.title')}</SettingsSectionLabel>
          {pinnedItems.length === 0 ? (
            <Body size="sm" tone="secondary" style={styles.hint}>
              {tr('frequentEdit.pinned.empty')}
            </Body>
          ) : (
            <PinnedList
              items={pinnedItems}
              onMoveTo={moveFrequentPinTo}
              onMoveStep={moveFrequentPin}
              onRemove={(id) => setFrequentPinned(id, false)}
              onDraggingChange={setDragging}
            />
          )}
        </View>

        {/* 自動で入るもの */}
        <View style={{ gap: t.spacing['2'] }}>
          <SettingsSectionLabel>{tr('frequentEdit.auto.title')}</SettingsSectionLabel>
          <Body size="sm" tone="secondary" style={styles.hint}>
            {tr('frequentEdit.auto.hint')}
          </Body>
          {autoItems.length === 0 ? (
            <Body size="sm" tone="secondary" style={styles.hint}>
              {tr('frequentEdit.auto.empty')}
            </Body>
          ) : (
            <SettingsListCard testID="frequent-edit-auto">
              {autoItems.map((item, index) => (
                <React.Fragment key={item.identityId}>
                  {index > 0 ? <SettingsDivider /> : null}
                  <SettingsLinkRow
                    label={item.label}
                    showChevron={false}
                    testID={`frequent-edit-auto-${item.identityId}`}
                    trailing={
                      <Button
                        label={tr('frequentEdit.auto.hide')}
                        variant="plain"
                        size="sm"
                        onPress={() => setFrequentHidden(item.identityId, true)}
                        accessibilityLabel={tr('frequentEdit.auto.hideA11y', { label: item.label })}
                        testID={`frequent-edit-hide-${item.identityId}`}
                      />
                    }
                  />
                </React.Fragment>
              ))}
            </SettingsListCard>
          )}
        </View>

        {/* 表示しないもの (戻せる) */}
        {hiddenItems.length > 0 ? (
          <View style={{ gap: t.spacing['2'] }}>
            <Pressable
              onPress={() => setHiddenOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: hiddenOpen }}
              style={styles.hiddenHeader}
              testID="frequent-edit-hidden-toggle"
            >
              <Label size="sm" tone="secondary">
                {tr('frequentEdit.hidden.title', { count: hiddenItems.length })}
              </Label>
              <Icon
                name={hiddenOpen ? 'chevronUp' : 'chevronDown'}
                size={18}
                color={t.colors.content.secondary}
              />
            </Pressable>
            {hiddenOpen ? (
              <SettingsListCard testID="frequent-edit-hidden">
                {hiddenItems.map((item, index) => (
                  <React.Fragment key={item.identityId}>
                    {index > 0 ? <SettingsDivider /> : null}
                    <SettingsLinkRow
                      label={item.label}
                      showChevron={false}
                      testID={`frequent-edit-hidden-${item.identityId}`}
                      trailing={
                        <Button
                          label={tr('frequentEdit.hidden.restore')}
                          variant="plain"
                          size="sm"
                          onPress={() => setFrequentHidden(item.identityId, false)}
                          accessibilityLabel={tr('frequentEdit.hidden.restoreA11y', { label: item.label })}
                          testID={`frequent-edit-restore-${item.identityId}`}
                        />
                      }
                    />
                  </React.Fragment>
                ))}
              </SettingsListCard>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { paddingHorizontal: 4 },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  handle: {
    width: 44,
    height: PIN_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  hiddenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    minHeight: 44,
  },
});
