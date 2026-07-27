/**
 * Data Display — Typography(Heading/Body/Caption) / Card / Badge。DEV 専用。
 * fontSize の生スケールは `/dev/foundations/typography` 参照。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  useTheme,
  type CardVariant,
  type Theme,
} from '@/design-system';
import { Section } from '../_shared';

export default function DataDisplayScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Data Display' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <TypographySection t={t} />
        <BadgeSection t={t} />
        <CardSection t={t} />
      </ScrollView>
    </>
  );
}

// ---------- Typography ----------
function TypographySection({ t }: { t: Theme }) {
  return (
    <Section title="Typography" t={t}>
      <View style={{ gap: t.spacing['2'] }}>
        <Heading size="display">Display</Heading>
        <Heading size="4xl">Heading 4xl</Heading>
        <Heading size="3xl">Heading 3xl</Heading>
        <Heading size="2xl">Heading 2xl</Heading>
        <Heading size="xl">Heading xl</Heading>
        <Heading size="lg">Heading lg</Heading>
      </View>
      <View style={{ gap: t.spacing['1'] }}>
        <Body size="lg">Body lg — 本文のサンプルです。</Body>
        <Body size="md">Body md — 本文のサンプルです。</Body>
        <Body size="sm" tone="secondary">Body sm secondary — 補助テキスト。</Body>
        <Body size="xs" tone="tertiary">Body xs tertiary — さらに弱いテキスト。</Body>
      </View>
      <View style={{ gap: t.spacing['1'] }}>
        <Caption>Caption — 注釈や凡例。</Caption>
        <Body size="sm" tone="link" weight="semibold">→ Text link (sage)</Body>
      </View>
    </Section>
  );
}

// ---------- Badge ----------
function BadgeSection({ t }: { t: Theme }) {
  return (
    <Section title="Badge" t={t}>
      <Caption>tones (sm)</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
        <Badge tone="accent">おすすめ</Badge>
        <Badge tone="brand">1.0x</Badge>
        <Badge tone="neutral">optional</Badge>
        <Badge tone="success">完了</Badge>
        <Badge tone="warning">注意</Badge>
        <Badge tone="danger">エラー</Badge>
        <Badge tone="info">info</Badge>
      </View>
      <Caption>size md</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
        <Badge tone="accent" size="md">7日間無料</Badge>
        <Badge tone="brand" size="md">Active</Badge>
        <Badge tone="success" size="md">記録済</Badge>
      </View>
    </Section>
  );
}

// ---------- Card ----------
function CardSection({ t }: { t: Theme }) {
  const variants: CardVariant[] = ['raised', 'flat', 'outlined'];
  return (
    <Section title="Card" t={t}>
      {variants.map((v) => (
        <Card key={v} variant={v}>
          <Text
            style={{
              fontSize: t.typography.fontSize.lg,
              fontWeight: t.typography.fontWeight.semibold,
              color: t.colors.content.primary,
            }}
          >
            Card — {v}
          </Text>
          <Text
            style={{
              fontSize: t.typography.fontSize.sm,
              lineHeight: t.typography.lineHeight.sm,
              color: t.colors.content.secondary,
            }}
          >
            本文テキストのサンプル。カードのパディングと影・枠線の組み合わせを確認できる。
          </Text>
          <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
            <Button label="主CTA" variant="primary" size="sm" />
            <Button label="補助" variant="ghost" size="sm" />
          </View>
        </Card>
      ))}
    </Section>
  );
}
