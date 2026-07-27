/**
 * Components hub — コンポーネント系ショーケースの一覧。DEV 専用。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/design-system';
import { NavList, type NavItem } from '../_shared';

const ITEMS: NavItem[] = [
  { label: 'Buttons', href: '/dev/components/buttons', desc: 'Button / IconButton' },
  { label: 'Inputs', href: '/dev/components/inputs', desc: 'NumberField / SelectCard / Chip' },
  { label: 'Data Display', href: '/dev/components/data-display', desc: 'Typography / Card / Badge' },
  { label: 'Overlays', href: '/dev/components/overlays', desc: 'Dialog / BottomSheet' },
];

export default function ComponentsHub() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Components' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['6'], gap: t.spacing['3'] }}
      >
        <NavList t={t} items={ITEMS} />
      </ScrollView>
    </>
  );
}
