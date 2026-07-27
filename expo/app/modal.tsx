import { router, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Dialog, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

export default function AboutModalRoute() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'アプリについて', presentation: 'modal' }} />
      <Dialog
        visible
        onClose={() => router.back()}
        primaryAction={{ label: '閉じる', onPress: () => router.back() }}
        testID="about-modal"
      >
        <Text style={[styles.eyebrow, { color: t.colors.action.text.default }]}>Hachibu</Text>
        <Text style={[styles.title, { color: t.colors.content.primary }]}>迷わず記録できる食事ログ</Text>
        <Text style={[styles.description, { color: t.colors.content.secondary }]}>1タップ入力、取り消し、再編集までを静かに気持ちよくまとめたMVPです。</Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: fs.sm,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    lineHeight: 32,
    marginTop: 8,
  },
  description: {
    fontSize: fs.md,
    lineHeight: 24,
    marginTop: 8,
  },
});
