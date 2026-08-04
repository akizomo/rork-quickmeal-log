import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

export default function NotFoundRoute() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '見つかりません' }} />
      <View style={[styles.container, { backgroundColor: t.colors.surface.default }]} testID="not-found-screen">
        <View style={[styles.card, { backgroundColor: t.colors.surface.raised }]}>
          <Text style={styles.emoji}>🥣</Text>
          <Text style={[styles.title, { color: t.colors.content.primary }]}>このページは見つかりませんでした</Text>
          <Text style={[styles.description, { color: t.colors.content.secondary }]}>ホームに戻って、今日の記録を続けてください。</Text>
          <Link href="/" asChild>
            <Button label="ホームへ戻る" style={styles.button} testID="not-found-home-link" />
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    padding: 28,
    gap: 12,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: fs['2xl'],
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: fs.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});
