/**
 * Data Display — Typography(Heading/Body/Label/Caption/Overline) / Card / Badge。DEV 専用。
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
  Label,
  Overline,
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
        <Caption tone="tertiary">Body — 読ませる文章</Caption>
        <Body size="lg">Body lg — 本文のサンプルです。</Body>
        <Body size="md">Body md — 本文のサンプルです。</Body>
        <Body size="sm" tone="secondary">Body sm secondary — 補助テキスト。</Body>
      </View>
      <View style={{ gap: t.spacing['1'] }}>
        <Caption tone="tertiary">Label — UI要素の名前 (文章ではない短い名詞句)</Caption>
        <Label size="lg">Label lg — Button のラベルと同じ大きさ (稀なケース)</Label>
        <Label size="md">Label md — リスト行の主見出し・トグル名</Label>
        <Label size="sm" tone="secondary">Label sm — フォーム項目名・カード内の項目名</Label>
      </View>
      <View style={{ gap: t.spacing['1'] }}>
        <Caption tone="tertiary">Overline / Caption</Caption>
        <Overline>Overline — 後続の複数項目をまとめるグループ見出し</Overline>
        <Caption>Caption — 単位・軸ラベル・数値の添え字専用 (文章には使わない)</Caption>
        <Label size="sm" tone="link">→ Text link (sage)</Label>
      </View>
      <RoleGuide t={t} />
    </Section>
  );
}

// ---------- Role guide ----------
// 迷いが起きるのは常に Body / Label / Caption の3者間なので、その境界だけを対比で示す。
const ROLE_RULES: { q: string; a: string }[] = [
  { q: '読ませる文章か？', a: 'Body — 説明文・注釈文。短くても Caption にしない' },
  { q: 'UI要素の名前か？', a: 'Label — トグル名・項目名。太字にしたい Body は Label' },
  { q: '複数項目をまとめる見出しか？', a: 'Overline — 単一要素に付く名前なら Label' },
  { q: '隣の主要素の添え物か？', a: 'Caption — 単位・軸ラベル・数値の添え字のみ' },
];

function RoleGuide({ t }: { t: Theme }) {
  return (
    <View style={{ gap: t.spacing['3'] }}>
      <Overline>役割の決め方 (上から順に判定)</Overline>
      {ROLE_RULES.map(({ q, a }) => (
        <View key={q} style={{ gap: t.spacing['1'] }}>
          <Label size="sm">{q}</Label>
          <Body size="sm" tone="secondary">{a}</Body>
        </View>
      ))}
    </View>
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
