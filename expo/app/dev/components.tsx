/**
 * Component Preview — DS コンポーネントの視覚確認。
 * DEV 専用。`/dev/components` から開く。
 */

import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  Badge,
  Body,
  BottomSheet,
  Button,
  Caption,
  Card,
  Chip,
  Heading,
  NumberField,
  SelectCard,
  useTheme,
  type ButtonSize,
  type ButtonVariant,
  type CardVariant,
  type Theme,
} from '@/design-system';

export default function ComponentsScreen() {
  const t = useTheme();
  const [counter, setCounter] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<string>('172');
  const [selectedBasis, setSelectedBasis] = useState<'male' | 'female' | null>(null);
  const [chipTags, setChipTags] = useState<string[]>(['ごはんもの']);

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
    >
      <TypographySection t={t} />
      <NumberFieldSection t={t} value={heightCm} onChange={setHeightCm} />
      <SelectCardSection
        t={t}
        selected={selectedBasis}
        onSelect={setSelectedBasis}
      />
      <ChipSection t={t} selected={chipTags} onToggle={(tag) =>
        setChipTags((prev) => prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag])
      } />
      <BadgeSection t={t} />
      <ButtonSection t={t} counter={counter} onPress={() => setCounter((c) => c + 1)} />
      <CardSection t={t} />
      <BottomSheetSection t={t} />
    </ScrollView>
  );
}

// ---------- BottomSheet ----------
function BottomSheetSection({ t }: { t: Theme }) {
  const [basicOpen, setBasicOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [headerlessOpen, setHeaderlessOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <Section title="BottomSheet" t={t}>
      <Caption>
        Material 3 / HIG 準拠 — 退場アニメ完走を待ってから unmount。drag handle から
        下スワイプで dismiss、scrim タップでも dismiss。
      </Caption>

      <View style={{ gap: t.spacing['2'] }}>
        <Button label="basic (title + close)" variant="secondary" onPress={() => setBasicOpen(true)} />
        <Button label="with actions (cancel / save)" variant="secondary" onPress={() => setActionsOpen(true)} />
        <Button label="no header / no footer" variant="secondary" onPress={() => setHeaderlessOpen(true)} />
        <Button label="long content (scroll)" variant="secondary" onPress={() => setLongOpen(true)} />
      </View>

      <BottomSheet
        visible={basicOpen}
        onClose={() => setBasicOpen(false)}
        title="シートのタイトル"
        testID="bs-basic"
      >
        <Body>
          シートの本文。スワイプダウン、× ボタン、scrim タップ、Android back の
          いずれでも同じ退場アニメを通って閉じる。
        </Body>
      </BottomSheet>

      <BottomSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="量を選ぶ"
        primaryAction={{
          label: '保存して追加',
          onPress: () => {
            setCount((c) => c + 1);
            setActionsOpen(false);
          },
        }}
        secondaryAction={{
          label: 'キャンセル',
          onPress: () => setActionsOpen(false),
        }}
        testID="bs-actions"
      >
        <Body>左に secondary (ghost)、右に primary。各 flex:1 で均等に並ぶ。</Body>
        <Caption tone="secondary">保存ボタンを押した回数: {count}</Caption>
      </BottomSheet>

      <BottomSheet
        visible={headerlessOpen}
        onClose={() => setHeaderlessOpen(false)}
        testID="bs-minimal"
      >
        <Heading size="xl">ミニマル構成</Heading>
        <Body>title / actions を渡さずに children だけで完結するパターン。</Body>
        <View style={{ height: t.spacing['3'] }} />
        <Button label="閉じる" variant="primary" onPress={() => setHeaderlessOpen(false)} fullWidth />
      </BottomSheet>

      <BottomSheet
        visible={longOpen}
        onClose={() => setLongOpen(false)}
        title="スクロール可能な内容"
        primaryAction={{ label: '完了', onPress: () => setLongOpen(false) }}
        secondaryAction={{ label: '戻る', onPress: () => setLongOpen(false) }}
        testID="bs-long"
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={{
              padding: t.spacing['3'],
              marginBottom: t.spacing['2'],
              backgroundColor: t.colors.surface.raised,
              borderRadius: t.radius.md,
            }}
          >
            <Body>項目 {i + 1}</Body>
            <Caption tone="secondary">行きを越えても drag handle 領域からだけ dismiss できる</Caption>
          </View>
        ))}
      </BottomSheet>
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

// ---------- Chip ----------
function ChipSection({
  t,
  selected,
  onToggle,
}: {
  t: Theme;
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const tags = ['ごはんもの', 'カレー', '中華麺', '和麺', 'パスタ', '寿司', 'サンド', 'ピザ', '定食・弁当'];
  return (
    <Section title="Chip" t={t}>
      <Caption>multi-select (toggle)</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            selected={selected.includes(tag)}
            onPress={() => onToggle(tag)}
          />
        ))}
      </View>
      <Caption>disabled / single badge</Caption>
      <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
        <Chip label="disabled" disabled />
        <Chip label="disabled (selected)" selected disabled />
        <Chip label="おすすめ" selected />
      </View>
    </Section>
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

// ---------- NumberField ----------
function NumberFieldSection({
  t,
  value,
  onChange,
}: {
  t: Theme;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Section title="NumberField" t={t}>
      <Caption>display サイズ × suffix</Caption>
      <NumberField value={value} onChangeText={onChange} suffix="cm" size="display" />
      <Caption>4xl サイズ × align=right</Caption>
      <NumberField value={value} onChangeText={onChange} suffix="kg" size="4xl" align="right" />
    </Section>
  );
}

// ---------- SelectCard ----------
function SelectCardSection({
  t,
  selected,
  onSelect,
}: {
  t: Theme;
  selected: 'male' | 'female' | null;
  onSelect: (v: 'male' | 'female') => void;
}) {
  return (
    <Section title="SelectCard" t={t}>
      <SelectCard
        label="男性基準"
        hint="体脂肪率やカロリー目安の男性基準で計算"
        selected={selected === 'male'}
        onPress={() => onSelect('male')}
      />
      <SelectCard
        label="女性基準"
        hint="体脂肪率やカロリー目安の女性基準で計算"
        selected={selected === 'female'}
        onPress={() => onSelect('female')}
      />
      <SelectCard label="hint なし" selected={false} />
      <SelectCard label="disabled" disabled />
    </Section>
  );
}

// ---------- Button ----------
function ButtonSection({
  t,
  counter,
  onPress,
}: {
  t: Theme;
  counter: number;
  onPress: () => void;
}) {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost'];
  const sizes: ButtonSize[] = ['sm', 'md', 'lg'];

  return (
    <Section title="Button" t={t}>
      <Text style={subTitle(t)}>variants × md</Text>
      <View style={{ gap: t.spacing['2'] }}>
        {variants.map((v) => (
          <Button
            key={v}
            label={`${v} (${counter})`}
            variant={v}
            onPress={onPress}
            fullWidth
          />
        ))}
      </View>

      <Text style={subTitle(t)}>sizes × primary</Text>
      <View style={{ gap: t.spacing['2'], alignItems: 'flex-start' }}>
        {sizes.map((s) => (
          <Button key={s} label={`size: ${s}`} size={s} variant="primary" />
        ))}
      </View>

      <Text style={subTitle(t)}>states</Text>
      <View style={{ gap: t.spacing['2'] }}>
        <Button label="disabled" variant="primary" disabled fullWidth />
        <Button label="loading" variant="primary" loading fullWidth />
        <Button label="secondary disabled" variant="secondary" disabled fullWidth />
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

// ---------- Section wrapper ----------
function Section({
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

const subTitle = (t: Theme) => ({
  color: t.colors.content.secondary,
  fontSize: t.typography.fontSize.sm,
  fontWeight: t.typography.fontWeight.semibold,
});
