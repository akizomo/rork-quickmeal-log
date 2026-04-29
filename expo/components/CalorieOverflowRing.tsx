import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/design-system';

export type RingStatusMode = 'auto' | 'remaining' | 'over' | 'percent';

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
  animationDurationMs: 450,
  numberAnimationDurationMs: 350,
  showCenterLabel: true,
  showStatusText: true,
  statusMode: 'auto' as RingStatusMode,
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

  const progressAnim = useRef(new Animated.Value(rawProgress)).current;
  const consumedAnim = useRef(new Animated.Value(safeConsumed)).current;
  const [animatedProgress, setAnimatedProgress] = useState<number>(rawProgress);
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
    const id = consumedAnim.addListener(({ value }) => {
      setAnimatedConsumed(value);
    });
    return () => {
      consumedAnim.removeListener(id);
    };
  }, [consumedAnim]);

  useEffect(() => {
    if (!animate) {
      progressAnim.setValue(rawProgress);
      consumedAnim.setValue(safeConsumed);
      return;
    }
    Animated.timing(progressAnim, {
      toValue: rawProgress,
      duration: animationDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(consumedAnim, {
      toValue: safeConsumed,
      duration: numberAnimationDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    statusOpacity.setValue(0);
    Animated.timing(statusOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [animate, animationDurationMs, consumedAnim, numberAnimationDurationMs, progressAnim, rawProgress, safeConsumed, statusOpacity]);

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
    if (consumedInt < targetInt) {
      return `${(targetInt - consumedInt).toLocaleString()} kcal left`;
    }
    if (consumedInt === targetInt) {
      return 'Goal reached';
    }
    return `${(consumedInt - targetInt).toLocaleString()} kcal over`;
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
          <Text style={[styles.kcalValue, { color: centerTextColor }]} numberOfLines={1}>
            {formatKcal(animatedConsumed)}
          </Text>
          <Text style={[styles.kcalTarget, { color: subTextColor }]} numberOfLines={1}>
            / {formatKcal(safeTarget)} kcal
          </Text>
          {showStatusText ? (
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
  kcalValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kcalTarget: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
});
