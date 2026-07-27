/**
 * DEV ショーケース画面 (`/dev/foundations/*`, `/dev/components/*`) 共通の
 * 見た目ヘルパー。ルーティング対象外 (`_` prefix で expo-router から除外)。
 */

import { Link } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Theme } from '@/design-system';

export type NavItem = { label: string; href: string; desc: string };

/** ハブ画面 (`/dev`, `/dev/foundations`, `/dev/components`) 共通のカード型ナビ一覧。 */
export function NavList({ t, items }: { t: Theme; items: NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <Link key={item.href} href={item.href as never} asChild>
          <Pressable
            style={{
              backgroundColor: t.colors.surface.raised,
              borderRadius: t.radius['2xl'],
              padding: t.spacing['5'],
              gap: t.spacing['1'],
              ...t.elevation.sm,
            }}
          >
            <Text
              style={{
                color: t.colors.content.primary,
                fontSize: t.typography.fontSize.xl,
                fontWeight: t.typography.fontWeight.semibold,
                lineHeight: t.typography.lineHeight.xl,
              }}
            >
              {item.label}
            </Text>
            <Text
              style={{
                color: t.colors.content.secondary,
                fontSize: t.typography.fontSize.sm,
                lineHeight: t.typography.lineHeight.sm,
              }}
            >
              {item.desc}
            </Text>
          </Pressable>
        </Link>
      ))}
    </>
  );
}

export function Section({
  title,
  t,
  children,
}: {
  title: string;
  t: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: t.spacing['3'] }}>
      <Text
        style={{
          color: t.colors.content.primary,
          fontSize: t.typography.fontSize.xl,
          fontWeight: t.typography.fontWeight.semibold,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: t.colors.surface.overlay,
          borderRadius: t.radius['2xl'],
          padding: t.spacing['4'],
          gap: t.spacing['4'],
        }}
      >
        {children}
      </View>
    </View>
  );
}

export const labelStyle = (t: Theme) => ({
  color: t.colors.content.secondary,
  fontSize: t.typography.fontSize.sm,
  fontWeight: t.typography.fontWeight.semibold,
});

export const subLabelStyle = (t: Theme) => ({
  color: t.colors.content.tertiary,
  fontSize: t.typography.fontSize.xs,
});

export const subTitle = (t: Theme) => ({
  color: t.colors.content.secondary,
  fontSize: t.typography.fontSize.sm,
  fontWeight: t.typography.fontWeight.semibold,
});
