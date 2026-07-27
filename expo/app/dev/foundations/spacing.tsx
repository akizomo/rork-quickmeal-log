/**
 * Spacing scale (4px グリッド) — DEV 専用。
 */

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/design-system';
import { Section } from '../_shared';

export default function SpacingScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Spacing' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <SpacingScale t={t} />
        <SpacingRules t={t} />
      </ScrollView>
    </>
  );
}

const USAGE_ROWS: { token: string; px: number; usage: string }[] = [
  { token: '0.5', px: 2, usage: 'ごく僅かな微調整 (Badge sm の paddingV 等)' },
  { token: '1', px: 4, usage: 'インライン要素間の詰めたgap (アイコン+ラベル、Chip内部のgap)' },
  { token: '2', px: 8, usage: '標準の行内/リスト項目内gap。Dialog/BottomSheetの「隣接chromeがある側」の余白' },
  { token: '3', px: 12, usage: 'リスト項目間のgap。Footerのtop padding。Chip/Badgeの横paddingの下限(sm)' },
  { token: '4', px: 16, usage: 'カード内側の小要素のpadding。Footerの横/下padding。Button(sm)の横padding' },
  { token: '5', px: 20, usage: '画面全体の外側padding (contentContainerStyle)。Cardコンポーネント公式paddingそのもの。Dialog/BottomSheetの横paddingと「隣接chromeが無い側」の余白' },
  { token: '6', px: 24, usage: 'より余裕を持たせた画面padding。Button(lg)の横padding' },
  { token: '8', px: 32, usage: '画面内の独立したセクション同士の縦rhythm (このDEV画面のセクション間隔など)' },
];

// 2026-07-25 に app全体 (約80箇所) を解消済み。これらの非グリッド値は隣接グリッド点が等距離(±2px)
// のため、縮めるとcontent clipリスクがある分「大きい側へ+2px丸め」で統一した。新規実装では使わないこと。
const DRIFT_ROWS: { value: number; snapped: string }[] = [
  { value: 6, snapped: 'spacing.2 (8)' },
  { value: 10, snapped: 'spacing.3 (12)' },
  { value: 14, snapped: 'spacing.4 (16)' },
  { value: 18, snapped: 'spacing.5 (20)' },
  { value: 22, snapped: 'spacing.6 (24)' },
];

/** 実際の使用箇所 (design-system本体のCard/Button/Chip/Badge/Dialog/BottomSheet + 各画面) を集計して逆算したルール。 */
function SpacingRules({ t }: { t: Theme }) {
  return (
    <>
      <Section title="使い分けルール（実運用パターンから逆算）" t={t}>
        <View style={{ gap: t.spacing['3'] }}>
          {USAGE_ROWS.map((row) => (
            <View key={row.token} style={{ flexDirection: 'row', gap: t.spacing['3'] }}>
              <Text style={{ width: 90, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, color: t.colors.content.primary }}>
                {row.token} ({row.px}px)
              </Text>
              <Text style={{ flex: 1, fontSize: t.typography.fontSize.sm, lineHeight: t.typography.lineHeight.sm, color: t.colors.content.secondary }}>
                {row.usage}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border.subtle }} />

        <View style={{ gap: t.spacing['1'] }}>
          <Text style={{ color: t.colors.content.primary, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold }}>
            Dialog / BottomSheet のコンテンツ余白 (header/footer 有無で強弱)
          </Text>
          <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm, lineHeight: t.typography.lineHeight.sm }}>
            header/footer が「ある」側は控えめ (spacing.2 = 8px、header/footer 自体が余白を担うため)。
            「無い」側はカード端に直接触れるので広め (spacing.5 = 20px)。titleもfooterも無いDialog
            (例: BalanceModal) は上下とも20pxで対称になる。
          </Text>
        </View>
      </Section>

      <Section title="旧ドリフト値のスナップ表（2026-07-25 解消済み）" t={t}>
        <Text style={{ fontSize: t.typography.fontSize.sm, lineHeight: t.typography.lineHeight.sm, color: t.colors.content.secondary, marginBottom: t.spacing['2'] }}>
          非グリッド値は隣接グリッド点が等距離(±2px)のため、縮めるとcontent clipリスクがある分「大きい側へ+2px丸め」で統一。新規実装ではこれらを使わない。
        </Text>
        <View style={{ gap: t.spacing['3'] }}>
          {DRIFT_ROWS.map((row) => (
            <View key={row.value} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['2'] }}>
              <Text style={{ width: 44, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, color: t.colors.content.tertiary }}>
                {row.value}px
              </Text>
              <Text style={{ fontSize: t.typography.fontSize.sm, color: t.colors.content.tertiary }}>→</Text>
              <Text style={{ flex: 1, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, color: t.colors.content.primary }}>
                {row.snapped}
              </Text>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

function SpacingScale({ t }: { t: Theme }) {
  const steps = Object.entries(t.spacing) as [string, number][];
  return (
    <Section title="Spacing (px)" t={t}>
      {steps.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing['3'] }}>
          <Text style={{ width: 40, color: t.colors.content.secondary, fontSize: t.typography.fontSize.caption1 }}>{k}</Text>
          <View
            style={{
              height: 12,
              width: v || 1,
              backgroundColor: t.colors.action.primary.default,
              borderRadius: 2,
            }}
          />
          <Text style={{ color: t.colors.content.tertiary, fontSize: t.typography.fontSize.xs }}>{v}px</Text>
        </View>
      ))}
    </Section>
  );
}
