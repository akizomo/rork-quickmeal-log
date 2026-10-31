import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon, Label, useTheme } from '@/design-system';
import { useT } from '@/hooks/useT';

/**
 * 「計算の根拠と出典」(/sources) への小さなテキストリンク。
 * 目標カロリー・PFC を表示する面の直下に置き、出典を見つけやすくする (App Store Guideline 1.4.1)。
 */
export function SourcesLink({ testID }: { testID?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={() => router.push('/sources')}
      style={[styles.row, { gap: theme.spacing['1'], paddingVertical: theme.spacing['2'] }]}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityLabel={t('common.sourcesLink')}
      testID={testID}
    >
      <Icon name="help" size={16} color={theme.colors.action.text.default} />
      <Label size="sm" tone="link">{t('common.sourcesLink')}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
