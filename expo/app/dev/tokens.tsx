/**
 * Token Preview — primitive / semantic / component トークンの視覚確認。
 * DEV 専用。`/dev/tokens` から開く。
 */

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tokens, useTheme, type Theme } from '@/design-system';

export default function TokensScreen() {
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
    >
      <PrimitiveColors t={t} />
      <SemanticColors t={t} />
      <NutritionColors t={t} />
      <SpacingScale t={t} />
      <RadiusScale t={t} />
      <TypographyScale t={t} />
      <ElevationScale t={t} />
    </ScrollView>
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

  return (
    <Section title="Nutrition — domain colors (PFC / calorie / trend)" t={t}>
      {/* macros */}
      <View style={{ gap: t.spacing['2'] }}>
        <Text style={labelStyle(t)}>macros (default + container)</Text>
        {macros.map((m) => (
          <View key={m.name} style={{ gap: t.spacing['1'] }}>
            <Text style={{ fontSize: 12, color: t.colors.content.secondary }}>{m.name}</Text>
            <View style={{ flexDirection: 'row', gap: t.spacing['2'], alignItems: 'center' }}>
              <View
                style={{
                  height: 20,
                  backgroundColor: m.container,
                  flex: 1,
                  borderRadius: t.radius.sm,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: '62%',
                    backgroundColor: m.default,
                  }}
                />
              </View>
              <Text style={{ fontSize: 11, color: t.colors.content.tertiary, width: 64 }}>
                62 / 100
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* calorie 3-stage */}
      <View style={{ gap: t.spacing['1.5'] }}>
        <Text style={labelStyle(t)}>calorie (within / mildExceed / severeExceed / track)</Text>
        <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
          <ColorChip name="within" value={calorie.within} t={t} />
          <ColorChip name="mildExceed" value={calorie.mildExceed} t={t} />
          <ColorChip name="severeExceed" value={calorie.severeExceed} t={t} />
          <ColorChip name="track" value={calorie.track} t={t} />
        </View>
      </View>

      {/* trend */}
      <View style={{ gap: t.spacing['1.5'] }}>
        <Text style={labelStyle(t)}>trend (improve / worsen / stable)</Text>
        <View style={{ flexDirection: 'row', gap: t.spacing['2'] }}>
          <ColorChip name="improve" value={trend.improve} t={t} />
          <ColorChip name="worsen" value={trend.worsen} t={t} />
          <ColorChip name="stable" value={trend.stable} t={t} />
        </View>
      </View>
    </Section>
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
        <View key={hueName} style={{ gap: t.spacing['1.5'] }}>
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
                    fontSize: 10,
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
    ['status', t.colors.status],
    ['accent', t.colors.accent],
  ];
  return (
    <Section title="Semantic — Colors (role)" t={t}>
      {groups.map(([groupName, group]) => (
        <View key={groupName} style={{ gap: t.spacing['1.5'] }}>
          <Text style={labelStyle(t)}>{groupName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['2'] }}>
            {Object.entries(group).map(([k, v]) => (
              <ColorChip key={k} name={k} value={v} t={t} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ gap: t.spacing['1.5'] }}>
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
      <Text style={{ fontSize: 11, color: t.colors.content.primary }}>{name}</Text>
      <Text style={{ fontSize: 10, color: t.colors.content.tertiary }}>{value}</Text>
    </View>
  );
}

// ---------- Spacing ----------
function SpacingScale({ t }: { t: Theme }) {
  const steps = Object.entries(t.spacing) as [string, number][];
  return (
    <Section title="Spacing (px)" t={t}>
      {steps.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['3'] }}>
          <Text style={{ width: 40, color: t.colors.content.secondary, fontSize: 12 }}>{k}</Text>
          <View
            style={{
              height: 12,
              width: v || 1,
              backgroundColor: t.colors.action.primary.default,
              borderRadius: 2,
            }}
          />
          <Text style={{ color: t.colors.content.tertiary, fontSize: 11 }}>{v}px</Text>
        </View>
      ))}
    </Section>
  );
}

// ---------- Radius ----------
function RadiusScale({ t }: { t: Theme }) {
  const steps = Object.entries(t.radius) as [string, number][];
  return (
    <Section title="Radius" t={t}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing['3'] }}>
        {steps.map(([k, v]) => (
          <View key={k} style={{ alignItems: 'center', gap: t.spacing['1'] }}>
            <View
              style={{
                width: 64,
                height: 64,
                backgroundColor: t.colors.surface.raised,
                borderRadius: Math.min(v, 32),
                borderWidth: 1,
                borderColor: t.colors.border.default,
              }}
            />
            <Text style={{ fontSize: 11, color: t.colors.content.primary }}>{k}</Text>
            <Text style={{ fontSize: 10, color: t.colors.content.tertiary }}>
              {v === 9999 ? 'full' : `${v}px`}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

// ---------- Typography ----------
function TypographyScale({ t }: { t: Theme }) {
  const sizes = Object.entries(t.typography.fontSize) as [string, number][];
  return (
    <Section title="Typography — fontSize" t={t}>
      {sizes.map(([k, v]) => (
        <View key={k} style={{ gap: 2 }}>
          <Text style={{ fontSize: v, color: t.colors.content.primary }}>
            {k} — あいうAa 123
          </Text>
          <Text style={{ fontSize: 10, color: t.colors.content.tertiary }}>
            {v}px / line {t.typography.lineHeight[k as keyof typeof t.typography.lineHeight]}px
          </Text>
        </View>
      ))}
    </Section>
  );
}

// ---------- Elevation ----------
function ElevationScale({ t }: { t: Theme }) {
  const levels = Object.entries(t.elevation) as [string, (typeof t.elevation)['sm']][];
  return (
    <Section title="Elevation" t={t}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: t.spacing['4'],
          padding: t.spacing['3'],
        }}
      >
        {levels.map(([k, v]) => (
          <View key={k} style={{ alignItems: 'center', gap: t.spacing['2'] }}>
            <View
              style={{
                width: 72,
                height: 72,
                backgroundColor: t.colors.surface.raised,
                borderRadius: t.radius.lg,
                ...v,
              }}
            />
            <Text style={{ fontSize: 11, color: t.colors.content.primary }}>{k}</Text>
          </View>
        ))}
      </View>
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

const labelStyle = (t: Theme) => ({
  color: t.colors.content.secondary,
  fontSize: t.typography.fontSize.sm,
  fontWeight: t.typography.fontWeight.semibold,
});

const subLabelStyle = (t: Theme) => ({
  color: t.colors.content.tertiary,
  fontSize: 11,
});

