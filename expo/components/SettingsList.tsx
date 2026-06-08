/**
 * 設定系画面 (status / settings / about / subscription) で共有する
 * リスト用の小さな部品群。
 *
 * - SettingsSectionLabel: Card の上に置くセクション見出し
 * - SettingsListCard:     リスト行を入れる薄い Card (内側 padding を抑制)
 * - SettingsLinkRow:      Card 内の 1 行 (chevron 付き / destructive 対応)
 * - SettingsDivider:      行間の hairline divider
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Caption, Card, Icon, useTheme } from '@/design-system';

export function SettingsSectionLabel({ children }: { children: string }) {
  return (
    <Caption tone="tertiary" style={styles.sectionLabel}>
      {children}
    </Caption>
  );
}

/**
 * リスト用 Card。標準の Card は内側 padding 20px だが、
 * リスト行を入れると 1 行カードが膨らんで不自然になるため、
 * 縦方向の padding を抑え、行自身の paddingVertical で高さを決める。
 */
export function SettingsListCard({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <Card variant="raised" style={styles.listCard} testID={testID}>
      {children}
    </Card>
  );
}

export function SettingsLinkRow({
  label,
  sub,
  onPress,
  testID,
  destructive = false,
  showChevron = true,
  trailing,
}: {
  label: string;
  sub?: string;
  onPress?: () => void;
  testID?: string;
  /** @deprecated divider を出さない方法に統一したため不要。互換のため残置。 */
  last?: boolean;
  destructive?: boolean;
  showChevron?: boolean;
  /** 右側に独自要素を出したい場合 (Switch など)。指定時は chevron は出ない */
  trailing?: React.ReactNode;
}) {
  const theme = useTheme();
  const labelStyle = destructive ? { color: theme.colors.status.danger, fontWeight: '600' as const } : undefined;
  const showRightChevron = showChevron && !trailing;
  return (
    <Pressable
      style={styles.linkRow}
      onPress={onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={sub ? `${label} ${sub}` : label}
    >
      <View style={{ flex: 1 }}>
        <Body style={labelStyle}>{label}</Body>
        {sub ? <Caption tone="tertiary">{sub}</Caption> : null}
      </View>
      {trailing ?? null}
      {showRightChevron ? <Icon name="chevronRight" size={16} color={theme.colors.content.tertiary} /> : null}
    </Pressable>
  );
}

export function SettingsDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]} />;
}

const styles = StyleSheet.create({
  sectionLabel: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    gap: 0,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },
});
