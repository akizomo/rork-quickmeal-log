import { router, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Dialog, Overline, useTheme } from '@/design-system';
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
        <Overline tone="link" style={styles.eyebrow}>Hachibu</Overline>
        <Text style={[styles.title, { color: t.colors.content.primary }]}>迷わず記録できる食事ログ</Text>
        <Text style={[styles.description, { color: t.colors.content.secondary }]}>1タップ入力、取り消し、再編集までを静かに気持ちよくまとめたMVPです。</Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  // ブランド名の1語だけ強調するための uppercase 付与。letterSpacing/fontSize/weight は Overline 既定に委ねる。
  eyebrow: {
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
