/**
 * ⭐️ タブの編集シート (ネイティブ formSheet、PRD §6.5.3)。`/frequent-edit`
 *
 * 並べ替え・ピン留めを外す・自動分を「表示しない」・「表示しない」を戻す、をここにまとめる。
 * 普段のホームには操作を増やさず、整えたい人だけがここへ来る。
 *
 * - 並べ替えは「上へ / 下へ」(ドラッグ用ライブラリを足さない。2026-10-25 の合意で可)
 * - 自動分は、ホームと同じランキングをシートを開いた時点で確定して並べる。「表示しない」にしても
 *   並びは動かず、そのぶん下の候補が繰り上がるだけ
 * - 中身がスクロールするので TallSheetScreen。ScrollView の作法は docs/SHEET_MIGRATION.md
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Icon,
  IconButton,
  Label,
  SettingsDivider,
  SettingsLinkRow,
  SettingsListCard,
  SettingsSectionLabel,
  TallSheetScreen,
  useTheme,
} from '@/design-system';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';
import {
  FREQUENT_EDIT_AUTO_LIMIT,
  resolveHiddenItems,
  resolvePinnedItems,
} from '@/utils/frequent-pins';
import { rankFrequentIdentities } from '@/utils/quick-log-history';
import type { QuickLogHistoryMap } from '@/types/quick-log';

export function FrequentEditSheet() {
  const t = useTheme();
  const tr = useT();
  const { settings, setFrequentPinned, moveFrequentPin, setFrequentHidden } = useAppState();
  const [hiddenOpen, setHiddenOpen] = useState(false);

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
    <TallSheetScreen title={tr('frequentEdit.title')} testID="frequent-edit">
      <View style={{ gap: t.spacing['6'] }}>
        {/* 自分で選んだもの (ピン留め) */}
        <View style={{ gap: t.spacing['2'] }}>
          <SettingsSectionLabel>{tr('frequentEdit.pinned.title')}</SettingsSectionLabel>
          {pinnedItems.length === 0 ? (
            <Body size="sm" tone="secondary" style={styles.hint}>
              {tr('frequentEdit.pinned.empty')}
            </Body>
          ) : (
            <SettingsListCard testID="frequent-edit-pinned">
              {pinnedItems.map((item, index) => (
                <React.Fragment key={item.identityId}>
                  {index > 0 ? <SettingsDivider /> : null}
                  <SettingsLinkRow
                    label={item.label}
                    showChevron={false}
                    testID={`frequent-edit-pin-${item.identityId}`}
                    trailing={
                      <View style={styles.actions}>
                        <IconButton
                          icon="chevronUp"
                          size="md"
                          disabled={index === 0}
                          onPress={() => moveFrequentPin(item.identityId, 'up')}
                          accessibilityLabel={tr('frequentEdit.pinned.moveUpA11y', { label: item.label })}
                          testID={`frequent-edit-up-${item.identityId}`}
                        />
                        <IconButton
                          icon="chevronDown"
                          size="md"
                          disabled={index === pinnedItems.length - 1}
                          onPress={() => moveFrequentPin(item.identityId, 'down')}
                          accessibilityLabel={tr('frequentEdit.pinned.moveDownA11y', { label: item.label })}
                          testID={`frequent-edit-down-${item.identityId}`}
                        />
                        <Button
                          label={tr('frequentEdit.pinned.remove')}
                          variant="plain"
                          size="sm"
                          onPress={() => setFrequentPinned(item.identityId, false)}
                          accessibilityLabel={tr('frequentEdit.pinned.removeA11y', { label: item.label })}
                          testID={`frequent-edit-unpin-${item.identityId}`}
                        />
                      </View>
                    }
                  />
                </React.Fragment>
              ))}
            </SettingsListCard>
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
    </TallSheetScreen>
  );
}

const styles = StyleSheet.create({
  hint: { paddingHorizontal: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  hiddenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    minHeight: 44,
  },
});
