/**
 * Buttons — Button / IconButton の variant・size・tone 一覧。DEV 専用。
 */

import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text, ScrollView, View } from 'react-native';
import {
  Button,
  Caption,
  IconButton,
  useTheme,
  type ButtonSize,
  type ButtonVariant,
  type IconButtonSize,
  type IconButtonTone,
  type IconButtonVariant,
  type Theme,
} from '@/design-system';
import { Section, subTitle } from '../_shared';

export default function ButtonsScreen() {
  const t = useTheme();
  const [counter, setCounter] = useState<number>(0);
  return (
    <>
      <Stack.Screen options={{ title: 'Buttons' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <ButtonSection t={t} counter={counter} onPress={() => setCounter((c) => c + 1)} />
        <IconButtonSection t={t} />
      </ScrollView>
    </>
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

// ---------- IconButton ----------
function IconButtonSection({ t }: { t: Theme }) {
  const variants: IconButtonVariant[] = ['ghost', 'filled'];
  const sizes: IconButtonSize[] = ['sm', 'md', 'lg'];
  const tones: IconButtonTone[] = ['secondary', 'tertiary', 'danger', 'action'];

  return (
    <Section title="IconButton" t={t}>
      <Text style={subTitle(t)}>variant × size (icon: close)</Text>
      {variants.map((variant) => (
        <View key={variant} style={{ gap: t.spacing['1'] }}>
          <Caption tone="secondary">{variant}</Caption>
          <View style={{ flexDirection: 'row', gap: t.spacing['4'], alignItems: 'center' }}>
            {sizes.map((size) => (
              <View key={size} style={{ alignItems: 'center', gap: t.spacing['1'] }}>
                <IconButton
                  icon="close"
                  variant={variant}
                  size={size}
                  onPress={() => undefined}
                  accessibilityLabel={`${variant} ${size}`}
                />
                <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>{size}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={subTitle(t)}>tone (size: lg, icon: delete)</Text>
      <View style={{ flexDirection: 'row', gap: t.spacing['4'], alignItems: 'center' }}>
        {tones.map((tone) => (
          <View key={tone} style={{ alignItems: 'center', gap: t.spacing['1'] }}>
            <IconButton
              icon="delete"
              size="lg"
              tone={tone}
              onPress={() => undefined}
              accessibilityLabel={tone}
            />
            <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>{tone}</Text>
          </View>
        ))}
      </View>

      <Text style={subTitle(t)}>disabled / children (badge overlay)</Text>
      <View style={{ flexDirection: 'row', gap: t.spacing['4'], alignItems: 'center' }}>
        <IconButton icon="close" size="lg" variant="filled" disabled onPress={() => undefined} accessibilityLabel="disabled" />
        <IconButton icon="user" size="lg" variant="filled" onPress={() => undefined} accessibilityLabel="バッジ付き">
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 11,
              height: 11,
              borderRadius: t.radius.full,
              backgroundColor: t.colors.status.danger.default,
              borderWidth: 2,
              borderColor: t.colors.surface.default,
            }}
          />
        </IconButton>
      </View>
    </Section>
  );
}
