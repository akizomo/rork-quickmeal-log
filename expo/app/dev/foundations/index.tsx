/**
 * Foundations hub — トークン系ショーケースの一覧。DEV 専用。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/design-system';
import { NavList, type NavItem } from '../_shared';

const ITEMS: NavItem[] = [
  { label: 'Colors', href: '/dev/foundations/colors', desc: 'Primitive hue / Semantic role / Nutrition domain' },
  { label: 'Typography', href: '/dev/foundations/typography', desc: 'fontSize scale (xs 〜 display)' },
  { label: 'Spacing', href: '/dev/foundations/spacing', desc: '4px グリッド (0 〜 32)' },
  { label: 'Radius', href: '/dev/foundations/radius', desc: 'xs 〜 3xl / full' },
  { label: 'Elevation', href: '/dev/foundations/elevation', desc: 'shadow xs 〜 xl' },
  { label: 'Motion', href: '/dev/foundations/motion', desc: 'duration / easing / spring を再生して比較' },
];

export default function FoundationsHub() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Foundations' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['6'], gap: t.spacing['3'] }}
      >
        <NavList t={t} items={ITEMS} />
      </ScrollView>
    </>
  );
}
