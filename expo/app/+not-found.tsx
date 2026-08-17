import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';

export default function NotFoundRoute() {
  const t = useTheme();
  const tr = useT();
  return (
    <>
      <Stack.Screen options={{ title: tr('nav.notFound') }} />
      <View style={[styles.container, { backgroundColor: t.colors.surface.default }]} testID="not-found-screen">
        <View style={[styles.card, { backgroundColor: t.colors.surface.raised }]}>
          <Text style={styles.emoji}>🥣</Text>
          <Text style={[styles.title, { color: t.colors.content.primary }]}>{tr('notFound.title')}</Text>
          <Text style={[styles.description, { color: t.colors.content.secondary }]}>{tr('notFound.description')}</Text>
          <Link href="/" asChild>
            <Button label={tr('notFound.homeButton')} style={styles.button} testID="not-found-home-link" />
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
