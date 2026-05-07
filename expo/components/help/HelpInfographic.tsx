/**
 * HelpInfographic — bucket一覧の精度infographic (help / tour stop で再利用可能)
 *
 * Spec: docs/help-content.md §2 / §3 (食材・料理タブ)
 * Data: constants/identity/modal-sets.ts (`MODAL_SETS` + `resolveBucketHelpView`)
 *
 * 表示要素 (各 row):
 *   - emoji + ボタン表示ラベル (bucket label = 実画面ボタンと完全一致)
 *   - kcal range bar (modal-set min〜max) + dot (default Identityの値)
 *   - kcal数値 (158–234 形式 / 単一なら 75 / 長押し bucket は 「長押し」)
 *   - PFC tag (P主体 / C多め / P+F / バランス 等、ラベル下に固定列で揃う)
 *
 * design-system PFC tokens: rose (P) / cinnamon (F) / olive (C)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design-system';
import {
  type BucketHelpView,
  type PfcTagKey,
  resolveBucketHelpView,
} from '@/constants/identity/modal-sets';
import type { BucketKey } from '@/types/identity';

interface HelpInfographicProps {
  bucketKeys: BucketKey[];
  /** kcal scale 上限。食材タブ=300、料理タブ=1000 想定 */
  scaleMaxKcal: number;
}

export function HelpInfographic({ bucketKeys, scaleMaxKcal }: HelpInfographicProps) {
  const t = useTheme();
  const views = bucketKeys.map((k) => resolveBucketHelpView(k));

  return (
    <View style={[styles.container, { backgroundColor: t.colors.surface.raised }]}>
      <PfcLegend />
      {views.map((v) => (
        <BucketRow key={v.bucketKey} view={v} scaleMaxKcal={scaleMaxKcal} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PFC Legend (top-right, P/F/C colored dots)
// ---------------------------------------------------------------------------

function PfcLegend() {
  const t = useTheme();
  return (
    <View style={styles.legend}>
      <LegendItem color={t.colors.nutrition.protein.default} label="P" />
      <LegendItem color={t.colors.nutrition.fat.default} label="F" />
      <LegendItem color={t.colors.nutrition.carbs.default} label="C" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const t = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: t.colors.content.secondary }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// BucketRow — emoji / label / range bar / kcal text / PFC tag
// ---------------------------------------------------------------------------

function BucketRow({ view, scaleMaxKcal }: { view: BucketHelpView; scaleMaxKcal: number }) {
  const t = useTheme();

  // Range bar geometry (percent positions on the 0–scaleMaxKcal axis)
  const min = view.modalKcalMin ?? 0;
  const max = view.modalKcalMax ?? 0;
  const def = view.defaultIdentityKcal ?? 0;

  const minPct = clamp01(min / scaleMaxKcal) * 100;
  const maxPct = clamp01(max / scaleMaxKcal) * 100;
  const defPct = clamp01(def / scaleMaxKcal) * 100;

  const showRange = !view.isQuickTapDisabled && view.modalIdentityCount >= 1 && max > 0;
  const isSinglePoint = view.modalIdentityCount === 1 && min === max;

  // kcal text
  let kcalText = '';
  if (view.isQuickTapDisabled) {
    kcalText = '長押し';
  } else if (isSinglePoint) {
    kcalText = `${Math.round(min)}`;
  } else {
    kcalText = `${Math.round(min)}–${Math.round(max)}`;
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.emoji}>{view.emoji}</Text>
        <Text style={[styles.label, { color: t.colors.content.primary }]} numberOfLines={1}>
          {view.label}
        </Text>
        <View style={styles.rangeTrack}>
          <View style={[styles.rangeTrackLine, { backgroundColor: t.colors.border.subtle }]} />
          {showRange && !isSinglePoint && (
            <View
              style={[
                styles.rangeBar,
                {
                  left: `${minPct}%`,
                  width: `${Math.max(0.5, maxPct - minPct)}%`,
                  backgroundColor: t.colors.action.primary.container,
                  borderColor: t.colors.action.primary.default,
                },
              ]}
            />
          )}
          {showRange && (
            <View
              style={[
                styles.rangeDot,
                {
                  left: `${defPct}%`,
                  backgroundColor: t.colors.action.primary.default,
                  borderColor: t.colors.surface.default,
                },
              ]}
            />
          )}
          {view.isQuickTapDisabled && (
            <View
              style={[styles.rangeDisabled, { borderColor: t.colors.content.disabled }]}
            />
          )}
        </View>
        <Text
          style={[
            styles.kcal,
            {
              color: view.isQuickTapDisabled
                ? t.colors.content.tertiary
                : t.colors.content.secondary,
              fontSize: view.isQuickTapDisabled ? 10 : 11,
            },
          ]}
          numberOfLines={1}
        >
          {kcalText}
        </Text>
      </View>
      {view.pfcTag && (
        <View style={styles.tagSlot}>
          <PfcTag tagKey={view.pfcTag.key} text={view.pfcTag.label} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PfcTag — small chip below label, color-coded by macro composition
// ---------------------------------------------------------------------------

function PfcTag({ tagKey, text }: { tagKey: PfcTagKey; text: string }) {
  const t = useTheme();
  const protein = t.colors.nutrition.protein;
  const fat = t.colors.nutrition.fat;
  const carbs = t.colors.nutrition.carbs;

  // Single solid background per dominant macro
  let bg = t.colors.border.subtle;
  let fg = t.colors.content.secondary;
  switch (tagKey) {
    case 'tag-c':
      bg = carbs.container;
      fg = carbs.default;
      break;
    case 'tag-c-light':
      bg = carbs.container;
      fg = carbs.default;
      break;
    case 'tag-p':
      bg = protein.container;
      fg = protein.default;
      break;
    case 'tag-f':
      bg = fat.container;
      fg = fat.default;
      break;
    case 'tag-pf':
      // P+F: protein container背景、文言で混合を示す
      bg = protein.container;
      fg = protein.default;
      break;
    case 'tag-fc':
      bg = fat.container;
      fg = fat.default;
      break;
    case 'tag-pc':
      bg = protein.container;
      fg = protein.default;
      break;
    case 'tag-balance':
      bg = t.colors.border.subtle;
      fg = t.colors.content.secondary;
      break;
    default:
      break;
  }

  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 0,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  row: {
    paddingVertical: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  label: {
    width: 80,
    fontSize: 11,
    fontWeight: '600',
  },
  rangeTrack: {
    flex: 1,
    height: 14,
    position: 'relative',
  },
  rangeTrackLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    transform: [{ translateY: -0.5 }],
  },
  rangeBar: {
    position: 'absolute',
    top: '50%',
    height: 5,
    borderWidth: 1,
    borderRadius: 3,
    transform: [{ translateY: -2.5 }],
  },
  rangeDot: {
    position: 'absolute',
    top: '50%',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    transform: [{ translateY: -4.5 }, { translateX: -4.5 }],
  },
  rangeDisabled: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    transform: [{ translateY: -0.5 }],
  },
  kcal: {
    width: 56,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  tagSlot: {
    paddingLeft: 30, // emoji width (22) + gap (8)
    marginTop: 2,
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
