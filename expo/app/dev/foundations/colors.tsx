/**
 * Colors — primitive / semantic / nutrition domain の視覚確認。DEV 専用。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tokens, useTheme, type Theme } from '@/design-system';
import { Section, labelStyle, subLabelStyle } from '../_shared';

export default function ColorsScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Colors' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <PrimitiveColors t={t} />
        <SemanticColors t={t} />
        <NutritionColors t={t} />
      </ScrollView>
    </>
  );
}

// ---------- Nutrition domain ----------
function NutritionColors({ t }: { t: Theme }) {
  const macros = [
    { name: 'protein', ...t.colors.nutrition.protein },
    { name: 'fat',     ...t.colors.nutrition.fat },
    { name: 'carbs',   ...t.colors.nutrition.carbs },
  ];
  const calorie = t.colors.nutrition.calorie;
  const trend = t.colors.nutrition.trend;
  const calorieStates = [
    { name: 'within', ...calorie.within },
    { name: 'mildExceed', ...calorie.mildExceed },
    { name: 'severeExceed', ...calorie.severeExceed },
  ];
  const trendStates = [
    { name: 'improve', ...trend.improve },
    { name: 'worsen', ...trend.worsen },
    { name: 'stable', ...trend.stable },
  ];

  return (
    <Section title="Nutrition — domain colors (PFC / calorie / trend)" t={t}>
      {/* macros */}
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>macros (text / graphic / background)</Text>
        <SwatchRows states={macros} t={t} />
      </View>

      {/* calorie 3-stage */}
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>calorie (text / graphic / background)</Text>
        <SwatchRows states={calorieStates} t={t} />
        <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
          <ColorChip name="track" value={calorie.track} t={t} />
        </View>
      </View>

      {/* trend */}
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>trend (text / graphic / background)</Text>
        <SwatchRows states={trendStates} t={t} />
      </View>
    </Section>
  );
}

/** text/graphic/background の3値セットを macros と同じミニバー表現で並べる。 */
function SwatchRows({
  states,
  t,
}: {
  states: { name: string; text: string; graphic: string; background: string }[];
  t: Theme;
}) {
  return (
    <>
      {states.map((s) => (
        <View key={s.name} style={{ gap: t.spacing['1'] }}>
          <Text style={subLabelStyle(t)}>{s.name}</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing['2'], alignItems: 'center' }}>
            <View
              style={{
                height: 20,
                backgroundColor: s.background,
                flex: 1,
                borderRadius: t.radius.sm,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: '62%',
                  backgroundColor: s.graphic,
                }}
              />
            </View>
            <Text style={{ fontSize: t.typography.fontSize.xs, color: s.text, width: 64 }}>
              62 / 100
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

// ---------- Primitive Colors ----------
function PrimitiveColors({ t }: { t: Theme }) {
  const hues = Object.entries(tokens.colors).filter(
    ([, v]) => typeof v === 'object',
  ) as [string, Record<string, string>][];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

  return (
    <Section title="Primitive — Colors (hue-only)" t={t}>
      {hues.map(([hueName, scale]) => (
        <View key={hueName} style={{ gap: t.spacing['2'] }}>
          <Text style={labelStyle(t)}>{hueName}</Text>
          <View style={{ flexDirection: 'row', borderRadius: t.radius.md, overflow: 'hidden' }}>
            {shades.map((s) => (
              <View key={s} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 56,
                    backgroundColor: scale[s],
                  }}
                />
                <Text
                  style={{
                    fontSize: t.typography.fontSize.xs,
                    color: t.colors.content.tertiary,
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Section>
  );
}

// ---------- Semantic Colors ----------
function SemanticColors({ t }: { t: Theme }) {
  const groups: [string, Record<string, string | Record<string, string>>][] = [
    ['surface', t.colors.surface],
    ['content', t.colors.content],
    ['border', t.colors.border],
    ['accent', t.colors.accent],
  ];
  return (
    <Section title="Semantic — Colors (role)" t={t}>
      {groups.map(([groupName, group]) => (
        <View key={groupName} style={{ gap: t.spacing['2'] }}>
          <Text style={labelStyle(t)}>{groupName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
            {Object.entries(group).map(([k, v]) => (
              <ColorChip key={k} name={k} value={v} t={t} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>status</Text>
        {(['success', 'warning', 'danger', 'info'] as const).map((role) => (
          <View key={role} style={{ gap: t.spacing['1'] }}>
            <Text style={subLabelStyle(t)}>{role}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
              {Object.entries(t.colors.status[role]).map(([state, v]) => (
                <ColorChip key={state} name={state} value={v} t={t} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>action</Text>
        {(['primary', 'secondary', 'ghost'] as const).map((role) => (
          <View key={role} style={{ gap: t.spacing['1'] }}>
            <Text style={subLabelStyle(t)}>{role}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
              {Object.entries(t.colors.action[role]).map(([state, v]) => (
                <ColorChip key={state} name={state} value={v} t={t} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

function ColorChip({
  name,
  value,
  t,
}: {
  name: string;
  value: string | Record<string, string>;
  t: Theme;
}) {
  if (typeof value !== 'string') return null;
  return (
    <View style={{ width: 96, gap: 4 }}>
      <View
        style={{
          height: 40,
          backgroundColor: value,
          borderRadius: t.radius.sm,
          borderWidth: 1,
          borderColor: t.colors.border.subtle,
        }}
      />
      <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.primary }}>{name}</Text>
      <Text style={{ fontSize: t.typography.fontSize.xs, color: t.colors.content.tertiary }}>{value}</Text>
    </View>
  );
}
