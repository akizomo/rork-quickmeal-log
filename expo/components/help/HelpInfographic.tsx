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
import { fontSize as fs, letterSpacing as ls } from '@/design-system/tokens/primitives/typography';
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
      <RangeLegend />
      {views.map((v) => (
        <BucketRow key={v.bucketKey} view={v} scaleMaxKcal={scaleMaxKcal} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Range legend (top-right, ● 代表値 / ▬ 食材の幅)
//
// バーは「1つの食材をどれだけ食べるか」の量の幅ではなく、そのボタンに集約された
// 複数食材 (例: ごはん/パン/うどん/パスタ/ラーメン麺) それぞれの1人前kcalの、
// 食材違いによる幅 (modal-sets.ts の min/max)。「よく食べる範囲」だと量の幅に
// 誤読されるため「食材の幅」とする。
//
// PFC の色分けは各行の PfcTag が文言 (P主体/C多め 等) で明示しているため不要。
// ● とバーは行内に文言が無く意味が読み取れないため、こちらを凡例にする。
// ---------------------------------------------------------------------------

function RangeLegend() {
  const t = useTheme();
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.legendDot,
            { backgroundColor: t.colors.action.primary.default, borderColor: t.colors.surface.raised },
          ]}
        />
        <Text style={[styles.legendText, { color: t.colors.content.secondary }]}>代表値</Text>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.legendBar,
            { backgroundColor: t.colors.action.primary.container, borderColor: t.colors.action.primary.default },
          ]}
        />
        <Text style={[styles.legendText, { color: t.colors.content.secondary }]}>食材の幅</Text>
      </View>
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
      bg = carbs.background;
      fg = carbs.text;
      break;
    case 'tag-c-light':
      bg = carbs.background;
      fg = carbs.text;
      break;
    case 'tag-p':
      bg = protein.background;
      fg = protein.text;
      break;
    case 'tag-f':
      bg = fat.background;
      fg = fat.text;
      break;
    case 'tag-pf':
      // P+F: protein background背景、文言で混合を示す
      bg = protein.background;
      fg = protein.text;
      break;
    case 'tag-fc':
      bg = fat.background;
      fg = fat.text;
      break;
    case 'tag-pc':
      bg = protein.background;
      fg = protein.text;
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
    paddingHorizontal: 16,
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
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  legendBar: {
    width: 16,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: fs.xs,
    fontWeight: '600',
  },
  row: {
    paddingVertical: 8,
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
    fontSize: fs.xs,
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
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: fs.xs,
    fontWeight: '700',
    letterSpacing: ls.wide,
  },
});
