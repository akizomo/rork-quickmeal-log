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
import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';
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
    borderColor: t.colors.border.focus,
  };

  return (
    <View>
      {/* Column labels (fat axis) */}
      <View style={styles.colHeaderRow}>
        <View style={styles.rowAxisSpacer} />
        <Text style={styles.colHeader}>脂肪{'\n'}少なめ</Text>
        <Text style={styles.colHeader}>脂肪{'\n'}ふつう</Text>
        <Text style={styles.colHeader}>脂肪{'\n'}多め</Text>
      </View>

      {/* Muscle axis rows, rendered top = 多め, bottom = 少なめ */}
      {[2, 1, 0].map((m) => {
        const muscle = m as BodyAxisLevel;
        return (
          <View key={muscle} style={styles.row}>
            <View style={styles.rowAxis}>
              <Text style={styles.rowAxisText}>筋量</Text>
              <Text style={styles.rowAxisValue}>
                {muscle === 0 ? '少なめ' : muscle === 1 ? 'ふつう' : '多め'}
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
                  style={[
                    styles.cell,
                    isSelected ? activeCellStyle : null,
                    isCurrent && !isSelected ? styles.cellCurrent : null,
                  ]}
                  testID={`body-matrix-cell-${muscle}-${fat}`}
                >
                  {isCurrent ? <Text style={styles.currentDot}>●今</Text> : null}
                  <BodyTypeSilhouette basis={basis} stage={stage} active={isSelected} size={42} />
                  {mode === 'target' ? (
                    <>
                      <Text style={styles.refText}>{weightText}</Text>
                      <Text style={styles.refSub}>{bfText}</Text>
                    </>
                  ) : (
                    <Text style={styles.refText}>{bfText}</Text>
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
  colHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  rowAxisSpacer: { width: 44 },
  colHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: palette.textMuted, fontWeight: '600', lineHeight: 13 },
  row: { flexDirection: 'row', marginBottom: 6 },
  rowAxis: { width: 44, justifyContent: 'center', alignItems: 'center' },
  rowAxisText: { fontSize: 10, color: palette.textMuted, fontWeight: '600' },
  rowAxisValue: { fontSize: 11, color: palette.text, fontWeight: '700' },
  cell: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    backgroundColor: palette.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  cellActive: { backgroundColor: palette.accentSoft, borderColor: palette.sageDeep },
  cellCurrent: { borderColor: palette.border },
  currentDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 9,
    color: palette.sageStrong,
    fontWeight: '700',
    zIndex: 2,
  },
  refText: { marginTop: 4, fontSize: 10, color: palette.text, fontWeight: '700' },
  refSub: { fontSize: 10, color: palette.textMuted, fontWeight: '600' },
});
