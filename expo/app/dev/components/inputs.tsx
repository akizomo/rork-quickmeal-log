/**
 * Inputs — NumberField / SelectCard / Chip の入力系コンポーネント。DEV 専用。
 */

import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Caption, Chip, NumberField, SelectCard, useTheme, type Theme } from '@/design-system';
import { Section } from '../_shared';

export default function InputsScreen() {
  const t = useTheme();
  const [heightCm, setHeightCm] = useState<string>('172');
  const [selectedBasis, setSelectedBasis] = useState<'male' | 'female' | null>(null);
  const [chipTags, setChipTags] = useState<string[]>(['ごはんもの']);

  return (
    <>
      <Stack.Screen options={{ title: 'Inputs' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <NumberFieldSection t={t} value={heightCm} onChange={setHeightCm} />
        <SelectCardSection t={t} selected={selectedBasis} onSelect={setSelectedBasis} />
        <ChipSection
          t={t}
          selected={chipTags}
          onToggle={(tag) =>
            setChipTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))
          }
        />
      </ScrollView>
    </>
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
