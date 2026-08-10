import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BodyTypeSilhouette } from '@/components/BodyTypeSilhouette';
import {
  bodyType9Equal,
  bodyType9ToStage,
  formatBodyFatRange,
  formatWeightRange,
  getCellReferenceWeightRange,
  getMatrix,
} from '@/constants/body-matrix';
import { useTheme } from '@/design-system';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { BiologicalBasis, BodyAxisLevel, BodyType9 } from '@/types/nutrition';

interface Props {
  basis: BiologicalBasis;
  heightCm: number | null;
  selected: BodyType9 | null;
  // If provided, marks the user's current body type on the matrix (used for target selection).
  currentMarker?: BodyType9 | null;
  onSelect: (cell: BodyType9) => void;
  // 'current' = user's current body selection (weight is known input → hide weight, BF% only).
  // 'target'  = goal selection (weight is a goal metric → show weight + BF%).
  mode?: 'current' | 'target';
}

const AXIS_LABELS: Record<BodyAxisLevel, string> = { 0: '少なめ', 1: 'ふつう', 2: '多め' };
const fatLabel = (level: BodyAxisLevel) => AXIS_LABELS[level];
const muscleLabel = (level: BodyAxisLevel) => AXIS_LABELS[level];

export function BodyTypeMatrix({
  basis,
  heightCm,
  selected,
  currentMarker,
  onSelect,
  mode = 'target',
}: Props) {
  const t = useTheme();
  const matrix = getMatrix(basis);
  // 選択 state は SelectCard と同じ DS 意匠 (sage container + focus 枠) に統一。
  const activeCellStyle = {
    backgroundColor: t.colors.action.primary.container,
    borderColor: t.colors.border.selected,
  };

  return (
    <View>
      {/* Column labels (fat axis) */}
      <View style={styles.colHeaderRow}>
        <View style={styles.rowAxisSpacer} />
        {([0, 1, 2] as BodyAxisLevel[]).map((level) => (
          <View key={level} style={styles.colHeaderCell}>
            <Text style={[styles.colHeaderLabel, { color: t.colors.content.secondary }]}>脂肪</Text>
            <Text style={[styles.colHeaderValue, { color: t.colors.content.primary }]}>{fatLabel(level)}</Text>
          </View>
        ))}
      </View>

      {/* Muscle axis rows, rendered top = 多め, bottom = 少なめ */}
      {[2, 1, 0].map((m) => {
        const muscle = m as BodyAxisLevel;
        return (
          <View key={muscle} style={styles.row}>
            <View style={styles.rowAxis}>
              <Text style={[styles.rowAxisText, { color: t.colors.content.secondary }]}>筋量</Text>
              <Text style={[styles.rowAxisValue, { color: t.colors.content.primary }]}>
                {muscleLabel(muscle)}
              </Text>
            </View>
            {[0, 1, 2].map((f) => {
              const fat = f as BodyAxisLevel;
              const cell: BodyType9 = { fat, muscle };
              const isSelected = bodyType9Equal(selected, cell);
              const isCurrent = bodyType9Equal(currentMarker, cell);
              const stage = bodyType9ToStage(cell);
              const ref = matrix[muscle][fat];
              const weightText = heightCm
                ? formatWeightRange(getCellReferenceWeightRange(basis, cell, heightCm))
                : '--';
              const bfText = formatBodyFatRange(ref);
              return (
                <Pressable
                  key={`${muscle}-${fat}`}
                  onPress={() => onSelect(cell)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  // 行/列の軸ラベルは別の View に分かれているため、スクリーンリーダーには
                  // セルが「9分類のどこか」として伝わらない。各セルに軸の値を畳み込む。
                  accessibilityLabel={[
                    `筋量${muscleLabel(muscle)}、脂肪${fatLabel(fat)}`,
                    mode === 'target' ? `体重${weightText}、体脂肪率${bfText}` : `体脂肪率${bfText}`,
                    isCurrent ? '現在のからだ' : null,
                  ]
                    .filter(Boolean)
                    .join('。')}
                  style={[
                    styles.cell,
                    { backgroundColor: t.colors.surface.raised },
                    isSelected ? activeCellStyle : null,
                    isCurrent && !isSelected ? { borderColor: t.colors.border.interactive } : null,
                  ]}
                  testID={`body-matrix-cell-${muscle}-${fat}`}
                >
                  {isCurrent ? <Text style={[styles.currentDot, { color: t.colors.action.text.default }]}>●今</Text> : null}
                  <BodyTypeSilhouette basis={basis} stage={stage} active={isSelected} size={42} />
                  {mode === 'target' ? (
                    <>
                      <Text style={[styles.refText, { color: t.colors.content.primary }]}>{weightText}</Text>
                      <Text style={[styles.refSub, { color: t.colors.content.secondary }]}>{bfText}</Text>
                    </>
                  ) : (
                    <Text style={[styles.refText, { color: t.colors.content.primary }]}>{bfText}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  colHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  rowAxisSpacer: { width: 44 },
  colHeaderCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  colHeaderLabel: { fontSize: fs.xs, fontWeight: '600', textAlign: 'center' },
  colHeaderValue: { fontSize: fs.xs, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', marginBottom: 8 },
  rowAxis: { width: 44, justifyContent: 'center', alignItems: 'center' },
  rowAxisText: { fontSize: fs.xs, fontWeight: '600' },
  rowAxisValue: { fontSize: fs.xs, fontWeight: '700' },
  cell: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  currentDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: fs.xs,
    fontWeight: '700',
    zIndex: 2,
  },
  refText: { marginTop: 4, fontSize: fs.xs, fontWeight: '700' },
  refSub: { fontSize: fs.xs, fontWeight: '600' },
});
