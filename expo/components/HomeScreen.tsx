import { useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';

import { DayLogBottomSheet, type DayLogBottomSheetRef } from '@/components/DayLogBottomSheet';
import { FloatingFeedback } from '@/components/FloatingFeedback';
import { HomeDatePager, type HomeDatePagerRef } from '@/components/HomeDatePager';
import { LogEditorSheet } from '@/components/LogEditorSheet';
import { UndoToast } from '@/components/UndoToast';
import { Icon, IconButton, Label, useTheme, type Theme } from '@/design-system';
import { spring } from '@/design-system/tokens/primitives/motion';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useAppState } from '@/providers/app-state-provider';
import { useHealthSyncContext } from '@/providers/health-sync-provider';
import { TRIAL_DURATION_DAYS } from '@/constants/onboarding';
import { getEffectiveSubscriptionStatus, trialDaysRemaining, adjustedTargetKcal, calcBaselineActiveKcal, stepsToActiveKcal } from '@/utils/goals';
import { formatDateKey } from '@/utils/nutrition';
import { formatDayLabel, sumForDate } from '@/utils/history';

const WEEK_DAYS_JA = ['月', '火', '水', '木', '金', '土', '日'];
const TOLERANCE = 0.15;

const Header = memo(function Header({ viewedDate }: { viewedDate?: Date }) {
  const router = useRouter();
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { settings } = useAppState();
  const avatarScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.spring(avatarScale, {
      toValue: 1,
      useNativeDriver: true,
      ...spring.pop,
    }).start();
  }, [avatarScale]);

  const dateLabel = useMemo(
    () => (viewedDate ? formatDayLabel(viewedDate) : tr('home.today')),
    [viewedDate, tr]
  );

  const showTrialBadge = useMemo(() => {
    if (getEffectiveSubscriptionStatus(settings, TRIAL_DURATION_DAYS) !== 'trialing') return false;
    const remaining = trialDaysRemaining(settings.trialStartedAtISO, TRIAL_DURATION_DAYS);
    return remaining > 0 && remaining <= 2;
  }, [settings]);

  return (
    <View style={styles.headerRow}>
      <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
        <IconButton
          icon="user"
          size="lg"
          variant="ghost"
          onPress={() => router.push('/status')}
          testID="avatar-button"
          accessibilityLabel={tr('home.a11y.profile')}
        >
          {showTrialBadge ? <View style={styles.avatarBadge} testID="avatar-trial-badge" /> : null}
        </IconButton>
      </Animated.View>
      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.headerDate} testID="header-date-label">{dateLabel}</Text>
      </View>
      <View style={styles.headerRight}>
        <IconButton
          icon="help"
          size="lg"
          variant="ghost"
          onPress={() => router.push('/help')}
          testID="help-link"
          accessibilityLabel={tr('home.a11y.help')}
        />
        <IconButton
          icon="barChart"
          size="lg"
          variant="ghost"
          onPress={() => router.push('/stats')}
          testID="stats-link"
          accessibilityLabel={tr('home.a11y.stats')}
        />
      </View>
    </View>
  );
});

function WeeklyRingsRow({
  today,
  viewedDate,
  logs,
  exerciseLogs,
  baseTargetKcal,
  profile,
  dailyActivities,
  carryoverDeductionKcal,
  onDayPress,
}: {
  today: Date;
  viewedDate: Date;
  logs: import('@/types/nutrition').FoodLog[];
  exerciseLogs: import('@/types/nutrition').ExerciseLog[];
  baseTargetKcal: number;
  profile: import('@/types/nutrition').UserProfile;
  dailyActivities?: import('@/types/nutrition').DailyActivitySummary[];
  carryoverDeductionKcal: number;
  onDayPress?: (dateKey: string) => void;
}) {
  const t = useTheme();
  const tr = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const weekDayLabels = tr('home.weekDays', { returnObjects: true }) as string[];

  const weekDays = useMemo(() => {
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  const todayKey = formatDateKey(today);
  const viewedDateKey = formatDateKey(viewedDate);
  const baselineActiveKcal = useMemo(() => calcBaselineActiveKcal(profile), [profile]);

  return (
    <View style={styles.weeklyRingsRow}>
      {weekDays.map((day, i) => {
        const dk = formatDateKey(day);
        const isToday = dk === todayKey;
        const isViewed = dk === viewedDateKey;
        const isFuture = dk > todayKey;
        const consumed = sumForDate(logs, dk).kcal;
        const da = (dailyActivities ?? []).find((d) => d.date === dk);
        const measuredActiveKcal = da
          ? da.activeKcal > 0
            ? da.activeKcal
            : stepsToActiveKcal(da.steps, profile.currentWeightKg)
          : null;
        const activityCtx = {
          measuredActiveKcal,
          baselineActiveKcal,
          rawActiveKcal: da?.activeKcal ?? 0,
        };
        const target = adjustedTargetKcal(baseTargetKcal, exerciseLogs, dk, activityCtx)
          - (isToday ? carryoverDeductionKcal : 0);

        const size = 36;
        const stroke = 5;
        const cx = size / 2;
        const r = (size - stroke) / 2;
        const circ = 2 * Math.PI * r;
        const rot = `rotate(-90 ${cx} ${cx})`;

        const ratio = !isFuture && consumed > 0 && target > 0 ? consumed / target : 0;
        const firstLap = Math.min(ratio, 1);
        const secondLap = ratio > 1 ? Math.min(ratio - 1, 1) : 0;
        const isPastTolerance = ratio > 1 + TOLERANCE;
        const progressColor = t.colors.nutrition.calorie.within.graphic;
        const toleranceColor = t.colors.nutrition.calorie.within.text;
        const overflowColor = t.colors.nutrition.calorie.severeExceed.graphic;

        const labelColor = isToday ? t.colors.action.text.default : t.colors.content.secondary;
        const dotColor = isToday ? t.colors.action.primary.default : t.colors.content.secondary;
        const fontSize = 11;

        const tappable = !isFuture;
        return (
          <Pressable
            key={dk}
            style={({ pressed }) => [styles.weeklyRingItem, pressed && tappable && { opacity: 0.6 }]}
            onPress={tappable ? () => onDayPress?.(dk) : undefined}
            accessibilityRole={tappable ? 'button' : undefined}
            accessibilityLabel={tappable ? tr('home.a11y.dayRecord', { day: weekDayLabels[i] }) : undefined}
          >
            <Svg width={size} height={size}>
              {/* track */}
              <Circle cx={cx} cy={cx} r={r} fill="none" stroke={t.colors.nutrition.calorie.track} strokeWidth={stroke} />
              {/* first lap */}
              {firstLap > 0 && (
                <Circle
                  cx={cx} cy={cx} r={r} fill="none"
                  stroke={progressColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  strokeDashoffset={circ * (1 - firstLap)}
                  transform={rot}
                />
              )}
              {/* overflow second lap */}
              {secondLap > 0 && (
                <Circle
                  cx={cx} cy={cx} r={r} fill="none"
                  stroke={isPastTolerance ? overflowColor : toleranceColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${circ} ${circ}`}
                  strokeDashoffset={circ * (1 - secondLap)}
                  transform={rot}
                />
              )}
              <SvgText
                x={cx}
                y={cx + fontSize * 0.38}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="600"
                fontFamily='PlusJakartaSans_400Regular, "Plus Jakarta Sans", -apple-system, sans-serif'
                fill={labelColor}
              >
                {weekDayLabels[i]}
              </SvgText>
            </Svg>
            <View style={styles.weeklyRingDot}>
              {isViewed && <View style={[styles.weeklyRingDotInner, { backgroundColor: dotColor }]} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HomeScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [viewedDate, setViewedDate] = useState<Date>(() => new Date());
  const dayLogSheetRef = useRef<DayLogBottomSheetRef>(null);
  const homeDatePagerRef = useRef<HomeDatePagerRef>(null);
  const openDayLogSheet = useCallback(() => {
    dayLogSheetRef.current?.snapToHalf();
  }, []);
  const { logs, exerciseLogs, profile, dailyActivities, carryoverDeductionKcal } = useAppState();
  const today = useMemo(() => new Date(), []);
  const handleDayPress = useCallback((dateKey: string) => {
    homeDatePagerRef.current?.jumpToDate(new Date(dateKey));
  }, []);

  const healthSync = useHealthSyncContext();
  useFocusEffect(
    useCallback(() => {
      healthSync.syncIfDue().catch(() => undefined);
    }, [healthSync])
  );

  return (
    <View style={styles.page} testID="home-screen">
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <Header viewedDate={viewedDate} />
          <WeeklyRingsRow
            today={today}
            viewedDate={viewedDate}
            logs={logs}
            exerciseLogs={exerciseLogs}
            baseTargetKcal={profile.targetCalories}
            profile={profile}
            dailyActivities={dailyActivities}
            carryoverDeductionKcal={carryoverDeductionKcal}
            onDayPress={handleDayPress}
          />
        </View>
        <HomeDatePager ref={homeDatePagerRef} onViewedDateChange={setViewedDate} onFoodPress={openDayLogSheet} />
      </SafeAreaView>
      <DayLogBottomSheet ref={dayLogSheetRef} viewedDate={viewedDate} />
      <FloatingFeedback />
      <UndoToast />
      <LogEditorSheet />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.surface.default },
  safeArea: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDate: { fontSize: fs.md, fontWeight: '700', color: t.colors.action.text.default },
  avatarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: radius.full,
    backgroundColor: t.colors.status.danger.default,
    borderWidth: 2,
    borderColor: t.colors.surface.default,
  },
  weeklyRingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  weeklyRingItem: { alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, borderRadius: radius.md },
  weeklyRingDot: { height: 5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weeklyRingDotInner: { width: 4, height: 4, borderRadius: 2 },
});
