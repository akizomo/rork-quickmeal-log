import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/design-system';
import { duration } from '@/design-system/tokens/primitives/motion';
import { fontSize, fontWeight, letterSpacing } from '@/design-system/tokens/primitives/typography';

export type RingStatusMode = 'auto' | 'remaining' | 'over' | 'percent';

/** Controls what number is displayed large in the ring center.
 *  'consumed' (default) — shows consumed kcal (legacy behaviour).
 *  'remaining'          — shows remaining kcal (max 0); target shown as secondary. */
export type RingCenterMode = 'consumed' | 'remaining';

export interface CalorieOverflowRingProps {
  consumedKcal: number;
  targetKcal: number;

  size?: number;
  strokeWidth?: number;
  startAngle?: number;
  maxVisualLaps?: number;

  animate?: boolean;
  animationDurationMs?: number;
  numberAnimationDurationMs?: number;

  showCenterLabel?: boolean;
  showStatusText?: boolean;
  statusMode?: RingStatusMode;
  centerMode?: RingCenterMode;

  /** デフォルトは theme.colors.nutrition.calorie.track */
  trackColor?: string;
  /** デフォルトは theme.colors.nutrition.calorie.within */
  progressColor?: string;
  /** デフォルトは theme.colors.nutrition.calorie.severeExceed */
  overflowColor?: string;
  /** デフォルトは theme.colors.content.primary */
  centerTextColor?: string;
  /** デフォルトは theme.colors.content.secondary */
  subTextColor?: string;

  accessibilityLabel?: string;
  testID?: string;
}

const SHAPE_DEFAULTS = {
  size: 164,
  strokeWidth: 18,
  startAngle: -90,
  maxVisualLaps: 2,
  animate: true,
  animationDurationMs: duration.long,     // 450ms: プログレスリング入場
  numberAnimationDurationMs: duration.medium, // 300ms: 数値カウントアップ
  showCenterLabel: true,
  showStatusText: true,
  statusMode: 'auto' as RingStatusMode,
  centerMode: 'consumed' as RingCenterMode,
};

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export const CalorieOverflowRing = memo(function CalorieOverflowRing(props: CalorieOverflowRingProps) {
  const t = useTheme();
  const {
    consumedKcal,
    targetKcal,
    size = SHAPE_DEFAULTS.size,
    strokeWidth = SHAPE_DEFAULTS.strokeWidth,
    startAngle = SHAPE_DEFAULTS.startAngle,
    maxVisualLaps = SHAPE_DEFAULTS.maxVisualLaps,
    animate = SHAPE_DEFAULTS.animate,
    animationDurationMs = SHAPE_DEFAULTS.animationDurationMs,
    numberAnimationDurationMs = SHAPE_DEFAULTS.numberAnimationDurationMs,
    showCenterLabel = SHAPE_DEFAULTS.showCenterLabel,
    showStatusText = SHAPE_DEFAULTS.showStatusText,
    statusMode = SHAPE_DEFAULTS.statusMode,
    centerMode = SHAPE_DEFAULTS.centerMode,
    trackColor = t.colors.nutrition.calorie.track,
    progressColor = t.colors.nutrition.calorie.within,
    overflowColor = t.colors.nutrition.calorie.severeExceed,
    centerTextColor = t.colors.content.primary,
    subTextColor = t.colors.content.secondary,
    accessibilityLabel,
    testID,
  } = props;

  const safeTarget = Math.max(targetKcal, 1);
  const safeConsumed = Math.max(consumedKcal, 0);
  const rawProgress = safeConsumed / safeTarget;

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const isOver = safeConsumed > safeTarget;
  const safeRemaining = Math.max(safeTarget - safeConsumed, 0);
  const overAmount = Math.max(safeConsumed - safeTarget, 0);
  // In remaining mode: show over amount when exceeded, remaining otherwise
  const centerValue = centerMode === 'remaining'
    ? (isOver ? overAmount : safeRemaining)
    : safeConsumed;

  const progressAnim = useRef(new Animated.Value(rawProgress)).current;
  const centerAnim = useRef(new Animated.Value(centerValue)).current;
  const [animatedProgress, setAnimatedProgress] = useState<number>(rawProgress);
  const [animatedCenter, setAnimatedCenter] = useState<number>(centerValue);
  // Keep consumedAnim for statusText calculation (legacy)
  const [animatedConsumed, setAnimatedConsumed] = useState<number>(safeConsumed);
  const statusOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });
    return () => {
      progressAnim.removeListener(id);
    };
  }, [progressAnim]);

  useEffect(() => {
    const id = centerAnim.addListener(({ value }) => {
      setAnimatedCenter(value);
      if (centerMode === 'consumed') setAnimatedConsumed(value);
      else setAnimatedConsumed(safeTarget - value); // remaining → consumed
    });
    return () => {
      centerAnim.removeListener(id);
    };
  }, [centerAnim, centerMode, safeTarget]);

  useEffect(() => {
    if (!animate) {
      progressAnim.setValue(rawProgress);
      centerAnim.setValue(centerValue);
      return;
    }
    Animated.timing(progressAnim, {
      toValue: rawProgress,
      duration: animationDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(centerAnim, {
      toValue: centerValue,
      duration: numberAnimationDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    statusOpacity.setValue(0);
    Animated.timing(statusOpacity, {
      toValue: 1,
      duration: duration.short,
      useNativeDriver: true,
    }).start();
  }, [animate, animationDurationMs, centerAnim, centerValue, numberAnimationDurationMs, progressAnim, rawProgress, statusOpacity]);

  const visibleLapCount = Math.min(Math.floor(animatedProgress), maxVisualLaps);
  const firstLapProgress = Math.min(animatedProgress, 1);
  const secondLapProgress = animatedProgress > 1 ? Math.min(animatedProgress - 1, 1) : 0;

  const firstOffset = circumference * (1 - firstLapProgress);
  const secondOffset = circumference * (1 - secondLapProgress);

  const rotation = `rotate(${startAngle} ${center} ${center})`;

  const statusText = useMemo(() => {
    if (!showStatusText) return '';
    const consumedInt = Math.round(animatedConsumed);
    const targetInt = Math.round(safeTarget);
    if (statusMode === 'percent') {
      return `${Math.round((consumedInt / targetInt) * 100)}%`;
    }
    if (statusMode === 'remaining') {
      return `${Math.max(targetInt - consumedInt, 0).toLocaleString()} kcal left`;
    }
    if (statusMode === 'over') {
      return `${Math.max(consumedInt - targetInt, 0).toLocaleString()} kcal over`;
    }
    const over = consumedInt - targetInt;
    if (over <= 0) {
      return over === 0
        ? '目標達成'
        : `あと ${Math.abs(over).toLocaleString()} kcal`;
    }
    const overRatio = over / safeTarget;
    if (overRatio <= 0.10) {
      return `+${over.toLocaleString()} kcal`;
    }
    if (overRatio <= 0.25) {
      return `+${over.toLocaleString()} kcal 多め`;
    }
    return `+${over.toLocaleString()} kcal`;
  }, [animatedConsumed, safeTarget, showStatusText, statusMode]);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityLabel={accessibilityLabel ?? `${formatKcal(safeConsumed)} of ${formatKcal(safeTarget)} kilocalories`}
      testID={testID ?? 'calorie-overflow-ring'}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {visibleLapCount >= 1 || firstLapProgress > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={firstOffset}
            transform={rotation}
          />
        ) : null}
        {secondLapProgress > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={overflowColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={secondOffset}
            transform={rotation}
          />
        ) : null}
      </Svg>

      {showCenterLabel ? (
        <View style={styles.centerWrap} pointerEvents="none">
          {centerMode === 'remaining' ? (
            <Text style={[styles.centerModeLabel, { color: isOver ? overflowColor : subTextColor }]} numberOfLines={1}>
              {isOver ? 'オーバー' : 'のこり'}
            </Text>
          ) : null}
          <Text style={[styles.kcalValue, { color: isOver && centerMode === 'remaining' ? overflowColor : centerTextColor }]} numberOfLines={1}>
            {formatKcal(animatedCenter)}
          </Text>
          <Text style={[styles.kcalTarget, { color: subTextColor }]} numberOfLines={1}>
            / {formatKcal(safeTarget)} kcal
          </Text>
          {showStatusText && centerMode === 'consumed' ? (
            <Animated.Text
              style={[styles.statusText, { color: subTextColor, opacity: statusOpacity }]}
              numberOfLines={1}
            >
              {statusText}
            </Animated.Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerModeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: 1,
  },
  kcalValue: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tighter,
  },
  kcalTarget: {
    marginTop: 4,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
});
