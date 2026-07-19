import { Link, Stack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';

export default function NotFoundRoute() {
  return (
    <>
      <Stack.Screen options={{ title: '見つかりません' }} />
      <View style={styles.container} testID="not-found-screen">
        <View style={styles.card}>
          <Text style={styles.emoji}>🥣</Text>
          <Text style={styles.title}>このページは見つかりませんでした</Text>
          <Text style={styles.description}>ホームに戻って、今日の記録を続けてください。</Text>
          <Link href="/" asChild>
            <Pressable style={styles.button} testID="not-found-home-link">
              <Text style={styles.buttonText}>ホームへ戻る</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    backgroundColor: palette.surface,
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
    color: palette.text,
    textAlign: 'center',
  },
  description: {
    fontSize: fs.md,
    lineHeight: 22,
    color: palette.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: palette.sageDeep,
  },
  buttonText: {
    color: palette.white,
    fontSize: fs.md,
    fontWeight: '700',
  },
});
