import React, { memo, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import { QuickCategory } from '@/types/nutrition';
import { getQuickCategories } from '@/utils/nutrition';
import type { BucketKey } from '@/types/identity';
import { getIdentitiesInBucket, getBucketDef } from '@/constants/identity';
// MVP では非表示 (PRD v1.5 §4.2 / §13 P0)。P1-C 再有効化時に import コメントを外す。
// import { IdentitySearchBar } from '@/components/IdentitySearchBar';

export const QUICK_LOG_TOKENS = {
  sectionPaddingHorizontal: 16,
  sectionPaddingTop: 8,
  sectionPaddingBottom: 8,
  segmentHeight: 36,
  segmentRadius: 18,
  segmentBottomSpacing: 8,
  gridColumns: 3,
  gridGap: 8,
  buttonHeightCompact: 52,
  buttonHeightDefault: 56,
  buttonHeightLarge: 68,
  buttonRadius: 15,
  iconContainerSize: 32,
  iconContainerRadius: 16,
  iconSize: 19,
  iconLabelSpacing: 5,
  labelFontSize: 11,
  labelLineHeight: 14,
};

const QUICK_LOG_COLORS = {
  segmentBg: '#EEE8DA',
  segmentSelectedBg: '#FFFDF8',
  segmentText: '#7B857E',
  segmentSelectedText: '#315347',
  buttonBg: '#FBF8F1',
  buttonBorder: 'rgba(49, 83, 71, 0.06)',
  iconBg: '#FFFFFF',
  labelText: '#2E3B35',
};

// Identity-first IA bucket labels (PRD-aligned ≤6 char names).
// Mirrors `INGREDIENT_BUCKETS` / `DISH_BUCKETS` from constants/identity/index.ts;
// kept inline here so the home grid stays decoupled from full registry imports.
const INGREDIENT_SHORT_LABEL: Record<string, string> = {
  staple: 'ごはんパン麺',
  lean_protein: '肉魚(低脂)',
  egg: '卵',
  fatty_protein: '脂あり肉魚',
  dairy_soy: '乳・大豆',
  veggies: '野菜・汁物',
  fruit: '果物',
  added_fat: '油・調味',
  snack_drink: 'おやつ甘飲',
};

const DISH_SHORT_LABEL: Record<string, string> = {
  rice_dish: 'どんぶり',
  curry: 'カレー',
  chinese_noodles: 'ラーメン',
  japanese_noodles: 'うどん蕎麦',
  pasta: 'パスタ',
  sushi: '寿司',
  sandwich: 'サンドバーガー',
  pizza: 'ピザ',
  set_meal: '定食・単品',
  misc_dish: '定食・単品',
};

export function getQuickLogButtonHeight(screenWidth: number): number {
  if (screenWidth <= 360) return QUICK_LOG_TOKENS.buttonHeightCompact;
  if (screenWidth <= 414) return QUICK_LOG_TOKENS.buttonHeightDefault;
  return QUICK_LOG_TOKENS.buttonHeightLarge;
}

function getIconSize(screenWidth: number): number {
  if (screenWidth <= 360) return 15;
  if (screenWidth <= 414) return 17;
  return 19;
}

function getLabelFontSize(screenWidth: number): number {
  // Identity-first labels can run up to 7 chars (e.g. サンドバーガー /
  // ラーメン中華麺), so the base size is one step smaller than before to keep
  // numberOfLines: 1 honored on narrow screens.
  if (screenWidth <= 360) return 9;
  if (screenWidth <= 414) return 10;
  return 11;
}

function getIconContainerSize(screenWidth: number): number {
  if (screenWidth <= 360) return 26;
  if (screenWidth <= 414) return 30;
  return 32;
}

function QuickLogButton({
  item,
  mode,
  height,
  iconSize,
  iconContainerSize,
  labelFontSize,
}: {
  item: QuickCategory;
  mode: 'ingredient' | 'dish';
  height: number;
  iconSize: number;
  iconContainerSize: number;
  labelFontSize: number;
}) {
  const { openDraftEditor, openIdentityLogSheet, quickLogIdentity } = useAppState();
  const scale = useRef(new Animated.Value(1)).current;

  const shortLabel = mode === 'ingredient'
    ? INGREDIENT_SHORT_LABEL[item.key] ?? item.label
    : DISH_SHORT_LABEL[item.key] ?? item.label;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };

  // Most legacy `QuickCategory.key` values align 1-to-1 with the new
  // Identity-first BucketKey set. The one renamed bucket — legacy `set_meal`
  // is now `misc_dish` (定食・単品) — needs a small translation so the new
  // sheet can resolve it.
  const LEGACY_TO_NEW_BUCKET: Record<string, BucketKey> = { set_meal: 'misc_dish' };
  const bucketKey = (LEGACY_TO_NEW_BUCKET[item.key] ?? item.key) as BucketKey;
  const hasNewBucket = getIdentitiesInBucket(bucketKey).length > 0;

  const handlePress = () => {
    // Per PRD §6.5 / IA spec: tap = instant record at default amount on the
    // bucket's representative Identity (first chip in the bucket).
    // Exception: if the bucket OR its first Identity has quickTapDisabled
    // (overly wide Attribute / Identity diversity), open the detail sheet
    // so the user picks consciously.
    if (hasNewBucket) {
      const bucketDef = getBucketDef(bucketKey);
      const first = getIdentitiesInBucket(bucketKey)[0];
      if (bucketDef?.quickTapDisabled || first?.quickTapDisabled) {
        openIdentityLogSheet(bucketKey);
        return;
      }
      if (first) void quickLogIdentity(first.id);
    }
  };

  const handleLongPress = () => {
    // Long-press = open detail sheet so the user can pick an Identity / adjust
    // Attribute, Style, amount, and add-ons.
    if (hasNewBucket) {
      openIdentityLogSheet(bucketKey);
    } else if (mode === 'dish') {
      // Fallback to legacy dish editor for buckets not yet in the new IA.
      void openDraftEditor(item.key);
    }
  };

  return (
    <Animated.View style={[styles.cell, { transform: [{ scale }], height }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}を追加。長押しで詳細入力`}
        style={[styles.button, { height }]}
        testID={`quick-log-button-${item.key}`}
      >
        <View
          style={[
            styles.iconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 2,
            },
          ]}
        >
          <Text style={[styles.iconEmoji, { fontSize: iconSize, lineHeight: iconSize + 2 }]}>
            {item.emoji}
          </Text>
        </View>
        <Text style={[styles.label, { fontSize: labelFontSize }]} numberOfLines={1}>
          {shortLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function SegmentedControl() {
  const { selectedMode, setSelectedMode } = useAppState();
  return (
    <View style={styles.segmentWrap}>
      {([
        { key: 'ingredient', label: '食材' },
        { key: 'dish', label: '一皿料理' },
      ] as const).map((item) => {
        const active = item.key === selectedMode;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSelectedMode(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${item.label}${active ? '、選択中' : ''}`}
            style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
            testID={`mode-tab-${item.key}`}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const QuickLogSection = memo(function QuickLogSection() {
  const { selectedMode } = useAppState();
  const { width: screenWidth } = useWindowDimensions();

  const categories = useMemo(() => getQuickCategories(selectedMode), [selectedMode]);

  const { gridGap, gridColumns } = QUICK_LOG_TOKENS;
  const buttonHeight = getQuickLogButtonHeight(screenWidth);
  const iconSize = getIconSize(screenWidth);
  const iconContainerSize = getIconContainerSize(screenWidth);
  const labelFontSize = getLabelFontSize(screenWidth);

  const rows: QuickCategory[][] = [];
  for (let i = 0; i < categories.length; i += gridColumns) {
    rows.push(categories.slice(i, i + gridColumns));
  }

  return (
    <View style={styles.section} testID="quick-log-section">
      {/*
        Identity 検索バーは MVP では非表示 (PRD v1.5 §4.2 / §13 P0)。
        9 ボタン × 自動学習の効果を純粋に計測するため一旦オフ。
        P1-C で `quick_log_unfound_event` (§10.2.1) を見て再有効化を判断する。
        開発時の動作確認は app/dev/identity-log.tsx 経由で可能。
      */}
      {/* <View style={{ marginBottom: QUICK_LOG_TOKENS.segmentBottomSpacing }}>
        <IdentitySearchBar />
      </View> */}
      <SegmentedControl />
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View
            key={`row-${rowIndex}`}
            style={[styles.row, rowIndex < rows.length - 1 ? { marginBottom: gridGap } : null]}
          >
            {row.map((item, colIndex) => (
              <View
                key={item.key}
                style={[
                  styles.cellWrap,
                  colIndex < row.length - 1 ? { marginRight: gridGap } : null,
                ]}
              >
                <QuickLogButton
                  item={item}
                  mode={selectedMode}
                  height={buttonHeight}
                  iconSize={iconSize}
                  iconContainerSize={iconContainerSize}
                  labelFontSize={labelFontSize}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingTop: QUICK_LOG_TOKENS.sectionPaddingTop,
    paddingBottom: QUICK_LOG_TOKENS.sectionPaddingBottom,
    backgroundColor: 'transparent',
    width: '100%',
  },
  segmentWrap: {
    flexDirection: 'row',
    height: QUICK_LOG_TOKENS.segmentHeight,
    borderRadius: QUICK_LOG_TOKENS.segmentRadius,
    backgroundColor: QUICK_LOG_COLORS.segmentBg,
    padding: 3,
    marginBottom: QUICK_LOG_TOKENS.segmentBottomSpacing,
  },
  segmentButton: {
    flex: 1,
    borderRadius: QUICK_LOG_TOKENS.segmentRadius - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: QUICK_LOG_COLORS.segmentSelectedBg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: QUICK_LOG_COLORS.segmentText,
  },
  segmentTextActive: {
    color: QUICK_LOG_COLORS.segmentSelectedText,
    fontWeight: '700',
  },
  grid: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  cellWrap: {
    flex: 1,
    minWidth: 0,
  },
  cell: {
    width: '100%',
  },
  button: {
    width: '100%',
    backgroundColor: QUICK_LOG_COLORS.buttonBg,
    borderRadius: QUICK_LOG_TOKENS.buttonRadius,
    borderWidth: 1,
    borderColor: QUICK_LOG_COLORS.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconContainer: {
    backgroundColor: QUICK_LOG_COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: QUICK_LOG_TOKENS.iconLabelSpacing,
  },
  iconEmoji: {
    fontSize: QUICK_LOG_TOKENS.iconSize,
    lineHeight: QUICK_LOG_TOKENS.iconSize + 2,
  },
  label: {
    lineHeight: QUICK_LOG_TOKENS.labelLineHeight,
    fontWeight: '600',
    color: QUICK_LOG_COLORS.labelText,
    textAlign: 'center',
  },
});

// Re-export palette import sanity (unused direct import removed)
void palette;
