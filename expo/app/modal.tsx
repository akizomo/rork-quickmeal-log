import { router, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Dialog, Label, useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';

export default function AboutModalRoute() {
  const t = useTheme();
  const tr = useT();
  return (
    <>
      <Stack.Screen options={{ title: tr('nav.modal'), presentation: 'modal' }} />
      <Dialog
        visible
        onClose={() => router.back()}
        primaryAction={{ label: tr('modal.close'), onPress: () => router.back() }}
        testID="about-modal"
      >
        <Label tone="link" style={styles.eyebrow}>Hachibu</Label>
        <Text style={[styles.title, { color: t.colors.content.primary }]}>{tr('modal.title')}</Text>
        <Text style={[styles.description, { color: t.colors.content.secondary }]}>{tr('modal.description')}</Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  // ブランド名の uppercase 付与。Label(single element name) が正しい役割。
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
