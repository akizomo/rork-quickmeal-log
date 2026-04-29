import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { palette } from '@/constants/theme';
import { useTheme } from '@/design-system';
import { BiologicalBasis, BodyStage } from '@/types/nutrition';

interface BodyParams {
  torsoWidth: number;
  torsoTaper: number;
  hipWidth: number;
  shoulderWidth: number;
  bellyBulge: number;
  legWidth: number;
}

const MALE_STAGES: Record<BodyStage, BodyParams> = {
  1: { torsoWidth: 22, torsoTaper: 16, hipWidth: 20, shoulderWidth: 30, bellyBulge: 0, legWidth: 10 },
  2: { torsoWidth: 25, torsoTaper: 19, hipWidth: 22, shoulderWidth: 31, bellyBulge: 1, legWidth: 11 },
  3: { torsoWidth: 28, torsoTaper: 23, hipWidth: 25, shoulderWidth: 32, bellyBulge: 2.5, legWidth: 12.5 },
  4: { torsoWidth: 32, torsoTaper: 28, hipWidth: 29, shoulderWidth: 33, bellyBulge: 5, legWidth: 14.5 },
  5: { torsoWidth: 36, torsoTaper: 33, hipWidth: 33, shoulderWidth: 35, bellyBulge: 8, legWidth: 16 },
};

const FEMALE_STAGES: Record<BodyStage, BodyParams> = {
  1: { torsoWidth: 20, torsoTaper: 14, hipWidth: 24, shoulderWidth: 26, bellyBulge: 0, legWidth: 11 },
  2: { torsoWidth: 22, torsoTaper: 17, hipWidth: 26, shoulderWidth: 27, bellyBulge: 1, legWidth: 12 },
  3: { torsoWidth: 25, torsoTaper: 21, hipWidth: 29, shoulderWidth: 28, bellyBulge: 2.5, legWidth: 13.5 },
  4: { torsoWidth: 29, torsoTaper: 26, hipWidth: 33, shoulderWidth: 29, bellyBulge: 5, legWidth: 15.5 },
  5: { torsoWidth: 33, torsoTaper: 31, hipWidth: 37, shoulderWidth: 31, bellyBulge: 8, legWidth: 17 },
};

export interface BodyTypeSilhouetteProps {
  basis: BiologicalBasis;
  stage: BodyStage;
  active?: boolean;
  size?: number;
  testID?: string;
}

function buildPath(p: BodyParams): string {
  const cx = 60;
  const shoulderY = 42;
  const waistY = 78;
  const hipY = 102;
  const kneeY = 150;
  const ankleY = 188;

  const sL = cx - p.shoulderWidth;
  const sR = cx + p.shoulderWidth;
  const wL = cx - p.torsoTaper;
  const wR = cx + p.torsoTaper;
  const hL = cx - p.hipWidth;
  const hR = cx + p.hipWidth;
  const bellyL = cx - (p.torsoTaper + p.bellyBulge);
  const bellyR = cx + (p.torsoTaper + p.bellyBulge);
  const kL = cx - p.legWidth;
  const kR = cx + p.legWidth;
  const aL = cx - p.legWidth * 0.65;
  const aR = cx + p.legWidth * 0.65;

  return [
    `M ${sL} ${shoulderY}`,
    `C ${sL - 2} ${shoulderY + 10}, ${bellyL} ${waistY - 6}, ${wL} ${waistY}`,
    `C ${bellyL} ${waistY + 10}, ${hL - 2} ${hipY - 6}, ${hL} ${hipY}`,
    `C ${kL - 1} ${kneeY - 20}, ${kL} ${kneeY - 6}, ${kL} ${kneeY}`,
    `L ${aL} ${ankleY}`,
    `L ${cx - 2} ${ankleY + 2}`,
    `L ${cx + 2} ${ankleY + 2}`,
    `L ${aR} ${ankleY}`,
    `L ${kR} ${kneeY}`,
    `C ${kR} ${kneeY - 6}, ${kR + 1} ${kneeY - 20}, ${hR} ${hipY}`,
    `C ${hR + 2} ${hipY - 6}, ${bellyR} ${waistY + 10}, ${wR} ${waistY}`,
    `C ${bellyR} ${waistY - 6}, ${sR + 2} ${shoulderY + 10}, ${sR} ${shoulderY}`,
    `Z`,
  ].join(' ');
}

export const BodyTypeSilhouette = memo(function BodyTypeSilhouette({
  basis,
  stage,
  active = false,
  size = 90,
  testID,
}: BodyTypeSilhouetteProps) {
  const t = useTheme();
  const params = basis === 'male_basis' ? MALE_STAGES[stage] : FEMALE_STAGES[stage];
  const bodyPath = buildPath(params);
  // active 時は SelectCard/Matrix と同じ DS 意匠 (sage focus + sage container fill) に統一。
  const strokeColor = active ? t.colors.border.focus : t.colors.border.default;
  const fillColor = active ? t.colors.action.primary.container : t.colors.surface.overlay;
  const headColor = active ? t.colors.border.focus : t.colors.border.subtle;

  return (
    <View style={{ width: size, height: size * 1.7 }} testID={testID}>
      <Svg width={size} height={size * 1.7} viewBox="0 0 120 200">
        <Ellipse cx={60} cy={22} rx={14} ry={16} fill={fillColor} stroke={headColor} strokeWidth={1.6} />
        <Path d={bodyPath} fill={fillColor} stroke={strokeColor} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    </View>
  );
});

export const silhouetteStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
