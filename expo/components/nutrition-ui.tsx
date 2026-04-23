import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { ChevronDown, Settings2 } from 'lucide-react-native';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { CalorieOverflowRing } from '@/components/CalorieOverflowRing';
import { QuickLogSection } from '@/components/QuickLogSection';
import { TodayLogBottomSheet } from '@/components/TodayLogBottomSheet';
import { additionPresets, portionSnapPoints, sizeOptions } from '@/constants/nutrition-data';
import { palette } from '@/constants/theme';
import { useAppState } from '@/providers/app-state-provider';
import { DishDraft, DishSize, IngredientDraft, Macro, PortionValue } from '@/types/nutrition';
import { buildDishMacro, clampPortion, computeIngredient, draftFromLog, formatMacroText, getDailyFeedback, getIngredientSubtypeDef, getIngredientSubtypeDefs, getQuickCategories, getSubtypes, getToppingsForSubtype, summarizeToppings } from '@/utils/nutrition';

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function ProgressRow({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{Math.round(current)}g</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export const Header = memo(function Header() {
  const { profile, settings } = useAppState();
  const router = useRouter();
  const avatarScale = useRef(new Animated.Value(1)).current;
  const trialLeft = useMemo(() => {
    if (!settings.trialStartedAtISO || settings.subscriptionStatus !== 'trialing') return null;
    const started = new Date(settings.trialStartedAtISO).getTime();
    if (!Number.isFinite(started)) return null;
    const endMs = started + 7 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1000));
    return remaining > 0 ? remaining : null;
  }, [settings.trialStartedAtISO, settings.subscriptionStatus]);

  useEffect(() => {
    Animated.spring(avatarScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [avatarScale]);

  const subtitle = profile.currentWeightKg && profile.targetWeightKg
    ? `${profile.currentWeightKg} → ${profile.targetWeightKg} kg`
    : `${profile.name ?? 'You'} の静かな記録`;

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
          <Pressable
            onPress={() => router.push('/status')}
            style={styles.avatarButton}
            testID="avatar-button"
          >
            <Text style={styles.avatarEmoji}>🧑🏻</Text>
          </Pressable>
        </Animated.View>
        <View>
          <Text style={styles.appTitle}>Quiet Nutrition</Text>
          <Text style={styles.appSubtitle}>{subtitle}</Text>
          {trialLeft !== null ? (
            <Text style={styles.trialBadge}>無料トライアル 残り{trialLeft}日</Text>
          ) : null}
        </View>
      </View>
      <Link href="/settings" asChild>
        <Pressable style={styles.iconButton} testID="settings-link">
          <Settings2 color={palette.sageStrong} size={20} />
        </Pressable>
      </Link>
    </View>
  );
});

export const StatusCard = memo(function StatusCard() {
  const { profile, todayMacro, logs } = useAppState();
  const todayLogCount = useMemo(() => {
    const key = new Date().toISOString().slice(0, 10);
    return logs.filter((log) => log.date === key).length;
  }, [logs]);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const feedback = useMemo(
    () => getDailyFeedback(todayMacro, profile, now, todayLogCount),
    [todayMacro, profile, now, todayLogCount]
  );

  return (
    <LinearGradient colors={[palette.surface, palette.card]} style={styles.statusCard}>
      <View style={styles.statusTopRow}>
        <CalorieOverflowRing
          consumedKcal={todayMacro.kcal}
          targetKcal={profile.targetCalories}
          size={148}
          strokeWidth={16}
          trackColor="#E7E0D4"
          progressColor={palette.sage}
          overflowColor={palette.sageDeep}
          centerTextColor={palette.text}
          subTextColor={palette.textMuted}
        />
        <View style={styles.progressColumn}>
          <ProgressRow label="Protein" current={todayMacro.protein} target={profile.targetProtein} color={palette.accent} />
          <ProgressRow label="Fat" current={todayMacro.fat} target={profile.targetFat} color={'#CFC6B6'} />
          <ProgressRow label="Carbs" current={todayMacro.carbs} target={profile.targetCarbs} color={palette.accentSoft} />
        </View>
      </View>
      <View style={styles.feedbackBlock} testID="daily-feedback">
        <Text style={styles.subheaderText} testID="daily-feedback-subheader">{feedback.subheader}</Text>
        <Text style={styles.bodyText} testID="daily-feedback-body">{feedback.body}</Text>
      </View>
    </LinearGradient>
  );
});

const SegmentedTabLegacy = memo(function SegmentedTabLegacy() {
  const { selectedMode, setSelectedMode } = useAppState();
  return (
    <View style={styles.segmentedWrap} testID="mode-tab">
      {([
        { key: 'ingredient', label: '食材' },
        { key: 'dish', label: '一皿料理' },
      ] as const).map((item) => {
        const active = item.key === selectedMode;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSelectedMode(item.key)}
            style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
            testID={`mode-tab-${item.key}`}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

void SegmentedTabLegacy;

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillLabel}>{label}</Text>
      <Text style={styles.macroPillValue}>{Math.round(value)}</Text>
    </View>
  );
}

function LogListItemLegacy({ log }: { log: import('@/types/nutrition').FoodLog }) {
  const { adjustLogAmount, deleteLog, setEditorLogId } = useAppState();
  return (
    <Pressable style={styles.logItem} onPress={() => setEditorLogId(log.id)} testID={`log-item-${log.id}`}>
      <View style={styles.logItemTop}>
        <View>
          <Text style={styles.logTitle}>{log.categoryLabel}{log.subTypeLabel ? ` · ${log.subTypeLabel}` : ''}</Text>
          <Text style={styles.logSubtitle}>{formatTime(log.timestamp)} · {log.mode === 'ingredient' ? '食材' : '一皿料理'}</Text>
        </View>
        <Text style={styles.logKcal}>{Math.round(log.macro.kcal)} kcal</Text>
      </View>
      <View style={styles.logMacroRow}>
        <MacroPill label="P" value={log.macro.protein} />
        <MacroPill label="F" value={log.macro.fat} />
        <MacroPill label="C" value={log.macro.carbs} />
      </View>
      <View style={styles.logActionRow}>
        {log.mode === 'ingredient' ? (
          <View style={styles.amountRow}>
            <Pressable style={styles.amountButton} onPress={() => adjustLogAmount(log.id, 'decrease')} testID={`log-decrease-${log.id}`}>
              <Text style={styles.amountButtonText}>−</Text>
            </Pressable>
            <Text style={styles.amountText}>× {formatNumber(log.amountMultiplier ?? 1)}</Text>
            <Pressable style={styles.amountButton} onPress={() => adjustLogAmount(log.id, 'increase')} testID={`log-increase-${log.id}`}>
              <Text style={styles.amountButtonText}>＋</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.amountText}>サイズ {log.size ?? 'regular'}</Text>
        )}
        <Pressable style={styles.deleteButton} onPress={() => deleteLog(log.id)} testID={`log-delete-${log.id}`}>
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

void LogListItemLegacy;

export const FloatingFeedback = memo(function FloatingFeedback() {
  const { feedback } = useAppState();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!feedback) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: -16, useNativeDriver: true, speed: 18, bounciness: 6 }),
    ]).start();
  }, [feedback, opacity, translateY]);

  if (!feedback) return null;

  return (
    <Animated.View style={[styles.feedbackBubble, { opacity, transform: [{ translateY }] }]} testID="floating-feedback">
      <Text style={styles.feedbackText}>{feedback.label}</Text>
      <Text style={styles.feedbackMacro}>{formatMacroText(feedback.macro)}</Text>
    </Animated.View>
  );
});

export const UndoToast = memo(function UndoToast() {
  const { undoState, undoLastLog } = useAppState();
  if (!undoState) return null;
  return (
    <View style={styles.undoToast} testID="undo-toast">
      <View>
        <Text style={styles.undoTitle}>{undoState.log.categoryLabel} を記録しました</Text>
        <Text style={styles.undoText}>必要なら元に戻せます</Text>
      </View>
      <Pressable onPress={undoLastLog} testID="undo-button">
        <Text style={styles.undoAction}>Undo</Text>
      </Pressable>
    </View>
  );
});

export const MyStatusSheet = memo(function MyStatusSheet() {
  const { profile, statusSheetVisible, setStatusSheetVisible, todayMacro, weights } = useAppState();
  const insets = useSafeAreaInsets();
  const latestDelta = useMemo(() => {
    if (weights.length < 2) return null;
    return Number((weights[0].weightKg - weights[1].weightKg).toFixed(1));
  }, [weights]);

  return (
    <Modal visible={statusSheetVisible} transparent animationType="slide" onRequestClose={() => setStatusSheetVisible(false)}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={styles.modalOverlay} onPress={() => setStatusSheetVisible(false)} testID="status-sheet-overlay">
        <Pressable style={[styles.modalSheet, { paddingBottom: 30 + insets.bottom }]} onPress={() => undefined} testID="status-sheet">
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHero}>
            <View style={styles.statusAvatarLarge}><Text style={styles.statusAvatarEmoji}>🧑🏻</Text></View>
            <Text style={styles.sheetHeroTitle}>My Status</Text>
            <Text style={styles.sheetHeroSubtitle}>今の自分と目標を静かに確認できます。</Text>
          </View>
          <View style={styles.statusInfoGrid}>
            <View style={styles.statusInfoCard}><Text style={styles.infoLabel}>身長</Text><Text style={styles.infoValue}>{formatNumber(profile.heightCm)} cm</Text></View>
            <View style={styles.statusInfoCard}><Text style={styles.infoLabel}>現在体重</Text><Text style={styles.infoValue}>{formatNumber(profile.currentWeightKg)} kg</Text></View>
            <View style={styles.statusInfoCard}><Text style={styles.infoLabel}>目標体重</Text><Text style={styles.infoValue}>{formatNumber(profile.targetWeightKg)} kg</Text></View>
            <View style={styles.statusInfoCard}><Text style={styles.infoLabel}>目標タイプ</Text><Text style={styles.infoValue}>{profile.goalType}</Text></View>
          </View>
          <View style={styles.statusGoalCard}>
            <Text style={styles.goalCardTitle}>Daily Goal</Text>
            <Text style={styles.goalCalories}>{profile.targetCalories.toLocaleString()} kcal</Text>
            <View style={styles.goalMacroRow}>
              <MacroPill label="P" value={profile.targetProtein} />
              <MacroPill label="F" value={profile.targetFat} />
              <MacroPill label="C" value={profile.targetCarbs} />
            </View>
            <Text style={styles.goalHint}>今日の進捗 {Math.round(todayMacro.kcal)} kcal</Text>
            <Text style={styles.goalHint}>最近の体重変化 {latestDelta === null ? '--' : `${latestDelta > 0 ? '+' : ''}${latestDelta} kg`}</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export const LogEditorSheet = memo(function LogEditorSheet() {
  const { editorLog, setEditorLogId, updateDishLog, updateIngredientLog, deleteLog, editorIsPending, commitPendingLog, cancelPendingLog } = useAppState();

  const handleClose = () => {
    if (editorLog && editorIsPending) {
      cancelPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDone = () => {
    if (editorLog && editorIsPending) {
      commitPendingLog(editorLog.id);
    }
    setEditorLogId(null);
  };

  const handleDelete = () => {
    if (!editorLog) return;
    if (editorIsPending) {
      cancelPendingLog(editorLog.id);
    } else {
      deleteLog(editorLog.id);
    }
    setEditorLogId(null);
  };
  const insets = useSafeAreaInsets();
  const ingredientDraft = useMemo<IngredientDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'ingredient') return null;
    return draftFromLog(editorLog);
  }, [editorLog]);
  const dishDraft = useMemo<DishDraft | null>(() => {
    if (!editorLog || editorLog.mode !== 'dish') return null;
    return {
      categoryKey: editorLog.categoryKey,
      subTypeKey: editorLog.subTypeKey,
      additions: editorLog.additions ?? [],
      size: editorLog.size ?? 'regular',
    };
  }, [editorLog]);

  if (!editorLog) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={styles.modalOverlay} onPress={handleClose} testID="log-editor-overlay">
        <Pressable style={[styles.editorSheet, { paddingBottom: 20 + insets.bottom }]} onPress={() => undefined} testID="log-editor-sheet">
          <View style={styles.sheetGrabber} />
          <Text style={styles.editorTitle}>{editorIsPending ? (editorLog.mode === 'ingredient' ? '食材を追加' : '料理を追加') : (editorLog.mode === 'ingredient' ? 'Ingredient Edit' : 'Dish Edit')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorBody}>
            {editorLog.mode === 'ingredient' && ingredientDraft ? (
              <IngredientEditorContent
                draft={ingredientDraft}
                onChange={(next) => updateIngredientLog(editorLog.id, next)}
              />
            ) : null}
            {editorLog.mode === 'dish' && dishDraft ? (
              <DishEditorContent
                draft={dishDraft}
                onChange={(next) => updateDishLog(editorLog.id, next)}
              />
            ) : null}
            <View style={styles.editorFooter}>
              <Pressable style={styles.secondaryButton} onPress={handleDelete} testID="editor-delete-button">
                <Text style={styles.secondaryButtonText}>{editorIsPending ? 'キャンセル' : '削除'}</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleDone} testID="editor-done-button">
                <Text style={styles.primaryButtonText}>{editorIsPending ? '追加' : '完了'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

function IngredientEditorContent({ draft, onChange }: { draft: IngredientDraft; onChange: (draft: IngredientDraft) => void }) {
  const categories = getQuickCategories('ingredient');
  const currentCategory = categories.find((item) => item.key === draft.categoryKey);
  const subtypeDefs = getIngredientSubtypeDefs(draft.categoryKey);
  const subtype = getIngredientSubtypeDef(draft.categoryKey, draft.subTypeKey);
  const toppings = getToppingsForSubtype(subtype);
  const computation = computeIngredient(draft);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);

  const handleCategoryChange = (key: string) => {
    const nextDefs = getIngredientSubtypeDefs(key);
    const nextSubKey = nextDefs[0]?.key ?? '';
    onChange({ categoryKey: key, subTypeKey: nextSubKey, portionValue: draft.portionValue, toppingKeys: [] });
    setCategoryOpen(false);
  };

  const handleSubtypeChange = (key: string) => {
    const nextSub = getIngredientSubtypeDef(draft.categoryKey, key);
    const availableKeys = (nextSub?.toppings ?? []).map((t) => t.key);
    const nextToppingKeys = draft.toppingKeys.filter((k) => availableKeys.includes(k));
    onChange({ ...draft, subTypeKey: key, toppingKeys: nextToppingKeys });
  };

  const handlePortionChange = (portion: PortionValue) => {
    onChange({ ...draft, portionValue: portion });
  };

  const handleToggleTopping = (key: string) => {
    const next = draft.toppingKeys.includes(key)
      ? draft.toppingKeys.filter((k) => k !== key)
      : [...draft.toppingKeys, key];
    onChange({ ...draft, toppingKeys: next });
  };

  const toppingSummary = summarizeToppings(computation.toppings);

  return (
    <View style={styles.editorSection}>
      <Pressable
        style={styles.categoryRow}
        onPress={() => setCategoryOpen((v) => !v)}
        testID="ingredient-category-row"
      >
        <Text style={styles.categoryRowLabel}>カテゴリ</Text>
        <View style={styles.categoryRowValue}>
          <Text style={styles.categoryRowValueText}>
            {currentCategory ? `${currentCategory.emoji} ${currentCategory.label}` : '—'}
          </Text>
          <ChevronDown size={14} color={palette.textMuted} />
        </View>
      </Pressable>
      {categoryOpen ? (
        <View style={styles.categoryDropdown}>
          {categories.map((item) => {
            const active = item.key === draft.categoryKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleCategoryChange(item.key)}
                style={[styles.categoryOption, active ? styles.categoryOptionActive : null]}
                testID={`ingredient-category-option-${item.key}`}
              >
                <Text style={[styles.categoryOptionText, active ? styles.categoryOptionTextActive : null]}>
                  {item.emoji} {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {subtypeDefs.length > 0 ? (
        <View style={styles.subSection}>
          <Text style={styles.editorSectionTitle}>種類</Text>
          <View style={styles.optionWrap}>
            {subtypeDefs.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={draft.subTypeKey === item.key}
                onPress={() => handleSubtypeChange(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.portionSection}>
        <View style={styles.portionHeader}>
          <Text style={styles.portionTitle}>食べた量</Text>
          <Text style={styles.portionBadge}>{draft.portionValue}x</Text>
        </View>
        <Text style={styles.portionNowLine} numberOfLines={1} testID="ingredient-portion-label">
          {computation.portionDisplay.primaryLabel}
          <Text style={styles.portionNowLineMuted}>  ·  {computation.portionDisplay.secondaryLabel}</Text>
        </Text>
        <PortionSlider value={draft.portionValue} onChange={handlePortionChange} />
      </View>

      {toppings.length > 0 ? (
        <View style={styles.subSection}>
          <Text style={styles.editorSectionTitle}>トッピング</Text>
          <View style={styles.optionWrap}>
            {toppings.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={draft.toppingKeys.includes(item.key)}
                onPress={() => handleToggleTopping(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <IngredientPreviewCard
        subLabel={subtype?.label ?? currentCategory?.label ?? ''}
        portionLabel={computation.portionDisplay.primaryLabel}
        portionSecondary={computation.portionDisplay.secondaryLabel}
        toppingSummary={toppingSummary}
        macro={computation.total}
      />
    </View>
  );
}

function PortionSlider({ value, onChange }: { value: PortionValue; onChange: (portion: PortionValue) => void }) {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const points = portionSnapPoints;
  const minVal = points[0];
  const maxVal = points[points.length - 1];
  const range = maxVal - minVal;
  const ratio = trackWidth > 0 ? (value - minVal) / range : 0;
  const thumbX = ratio * trackWidth;

  const snapFromX = (x: number): PortionValue => {
    if (trackWidth <= 0) return value;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    const raw = minVal + (clampedX / trackWidth) * range;
    return clampPortion(raw);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
        onPanResponderMove: (evt) => {
          const next = snapFromX(evt.nativeEvent.locationX);
          if (next !== value) onChange(next);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackWidth, value]
  );

  return (
    <View style={styles.sliderWrap}>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        testID="portion-slider"
      >
        <View style={[styles.sliderFill, { width: thumbX }]} />
        {points.map((p) => {
          const left = trackWidth > 0 ? ((p - minVal) / range) * trackWidth : 0;
          const active = p <= value;
          return (
            <View
              key={p}
              style={[
                styles.sliderTick,
                { left: left - 3 },
                active ? styles.sliderTickActive : null,
              ]}
            />
          );
        })}
        <View style={[styles.sliderThumb, { left: thumbX - 14 }]} pointerEvents="none" />
      </View>
      <View style={styles.sliderLabelsRow}>
        {points.map((p) => (
          <Pressable
            key={p}
            onPress={() => onChange(p as PortionValue)}
            style={styles.sliderLabelTap}
            testID={`portion-snap-${p}`}
          >
            <Text style={[styles.sliderLabelText, p === value ? styles.sliderLabelTextActive : null]} numberOfLines={1}>
              {p}x
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function IngredientPreviewCard({ subLabel, portionLabel, portionSecondary, toppingSummary, macro }: { subLabel: string; portionLabel: string; portionSecondary?: string; toppingSummary: string | null; macro: Macro }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>プレビュー</Text>
      <Text style={styles.previewSummaryText} numberOfLines={2}>
        {subLabel}
        <Text style={styles.previewSummaryDivider}>  ·  </Text>
        {portionLabel}
        {toppingSummary ? (
          <>
            <Text style={styles.previewSummaryDivider}>  ·  </Text>
            {toppingSummary}
          </>
        ) : null}
      </Text>
      {portionSecondary ? (
        <Text style={styles.previewSummarySecondary}>{portionSecondary}</Text>
      ) : null}
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} />
        <MacroPill label="F" value={macro.fat} />
        <MacroPill label="C" value={macro.carbs} />
      </View>
    </View>
  );
}

function DishEditorContent({ draft, onChange }: { draft: DishDraft; onChange: (draft: DishDraft) => void }) {
  const categories = getQuickCategories('dish');
  const subtypes = getSubtypes('dish', draft.categoryKey);
  const preview = buildDishMacro(draft);

  return (
    <View style={styles.editorSection}>
      <Text style={styles.editorSectionTitle}>種類</Text>
      <View style={styles.optionWrap}>
        {categories.map((item) => (
          <Chip key={item.key} label={`${item.emoji} ${item.label}`} active={draft.categoryKey === item.key} onPress={() => onChange({ ...draft, categoryKey: item.key, subTypeKey: undefined })} />
        ))}
      </View>
      {subtypes.length > 0 ? (
        <>
          <Text style={styles.editorSectionTitle}>味・タイプ</Text>
          <View style={styles.optionWrap}>
            {subtypes.map((item) => (
              <Chip key={item.key} label={item.label} active={draft.subTypeKey === item.key} onPress={() => onChange({ ...draft, subTypeKey: item.key })} />
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.editorSectionTitle}>高影響追加</Text>
      <View style={styles.optionWrap}>
        {additionPresets.map((item) => {
          const active = draft.additions.includes(item.key);
          return (
            <Chip
              key={item.key}
              label={item.label}
              active={active}
              onPress={() => {
                if (active) {
                  onChange({ ...draft, additions: draft.additions.filter((value) => value !== item.key) });
                  return;
                }
                if (draft.additions.length >= 2) {
                  return;
                }
                onChange({ ...draft, additions: [...draft.additions, item.key] });
              }}
            />
          );
        })}
      </View>
      <Text style={styles.editorSectionTitle}>サイズ</Text>
      <View style={styles.optionWrap}>
        {sizeOptions.map((size) => (
          <Chip key={size} label={size} active={draft.size === size} onPress={() => onChange({ ...draft, size: size as DishSize })} />
        ))}
      </View>
      <PreviewCard macro={preview} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function PreviewCard({ macro }: { macro: Macro }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>プレビュー</Text>
      <Text style={styles.previewCalories}>{Math.round(macro.kcal)} kcal</Text>
      <View style={styles.goalMacroRow}>
        <MacroPill label="P" value={macro.protein} />
        <MacroPill label="F" value={macro.fat} />
        <MacroPill label="C" value={macro.carbs} />
      </View>
    </View>
  );
}

void PreviewCard;
void getSubtypes;

export function HomeScreen() {
  return (
    <View style={styles.page} testID="home-screen">
      <LinearGradient colors={[palette.background, '#F7F4EE']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topContent}>
          <Header />
          <StatusCard />
          <QuickLogSection />
        </View>
      </SafeAreaView>
      <TodayLogBottomSheet />
      <FloatingFeedback />
      <UndoToast />
      <MyStatusSheet />
      <LogEditorSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 160, gap: 24 },
  topContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center', shadowColor: palette.sageDeep, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  avatarEmoji: { fontSize: 28 },
  appTitle: { fontSize: 18, fontWeight: '700', color: palette.sageDeep },
  appSubtitle: { fontSize: 13, color: palette.textMuted, marginTop: 2 },
  trialBadge: { fontSize: 11, color: palette.sageStrong, marginTop: 2, fontWeight: '600' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  statusCard: { borderRadius: 34, padding: 22, gap: 18, shadowColor: '#6C766A', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  statusTopRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringWrap: { width: 138, height: 138, alignItems: 'center', justifyContent: 'center' },
  ringBackground: { position: 'absolute', width: 138, height: 138, borderRadius: 69, borderWidth: 14, borderColor: '#E7E0D4' },
  ringProgress: { position: 'absolute', width: 138, height: 138, borderRadius: 69, borderWidth: 14, borderColor: palette.sage, borderTopColor: palette.sage, borderRightColor: palette.sage, borderBottomColor: palette.sage, borderLeftColor: 'transparent' },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  kcalValue: { fontSize: 28, fontWeight: '700', color: palette.text },
  kcalTarget: { marginTop: 2, fontSize: 18, color: palette.textMuted },
  progressColumn: { flex: 1, gap: 14 },
  progressRow: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 16, color: palette.text },
  progressValue: { fontSize: 16, color: '#232824' },
  progressTrack: { height: 14, borderRadius: 999, backgroundColor: '#E2DDD4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  messageText: { fontSize: 14, color: palette.textMuted },
  feedbackBlock: { gap: 4 },
  subheaderText: { fontSize: 14, color: palette.text, fontWeight: '600', lineHeight: 20 },
  bodyText: { fontSize: 13, color: palette.textMuted, lineHeight: 19 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2C23', marginBottom: 14 },
  segmentedWrap: { flexDirection: 'row', backgroundColor: palette.card, borderRadius: 18, padding: 5, marginBottom: 14 },
  segmentButton: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: palette.surface },
  segmentText: { color: palette.textMuted, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: palette.text, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  quickButton: { width: '31.5%', aspectRatio: 1, backgroundColor: palette.surface, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#838073', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  quickEmoji: { fontSize: 31 },
  quickLabel: { fontSize: 14, color: '#354137', textAlign: 'center', fontWeight: '500' },
  sheetCard: { marginTop: 6, backgroundColor: palette.sheet, borderRadius: 32, padding: 18, paddingBottom: 22, shadowColor: '#7D7A72', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: -2 }, elevation: 2 },
  sheetHandle: { width: 52, height: 6, borderRadius: 999, backgroundColor: '#C6C6BD', alignSelf: 'center', marginBottom: 18 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#243228' },
  sheetCount: { fontSize: 13, color: palette.textMuted },
  emptyState: { backgroundColor: palette.surface, borderRadius: 24, padding: 22, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  emptyText: { fontSize: 14, lineHeight: 21, color: palette.textMuted },
  logItem: { backgroundColor: palette.surface, borderRadius: 24, padding: 16, marginBottom: 12, gap: 12 },
  logItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  logTitle: { fontSize: 16, fontWeight: '700', color: '#243128' },
  logSubtitle: { marginTop: 4, fontSize: 13, color: palette.textMuted },
  logKcal: { fontSize: 15, fontWeight: '700', color: palette.sageDeep },
  logMacroRow: { flexDirection: 'row', gap: 8 },
  macroPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#ECE5D9' },
  macroPillLabel: { fontSize: 12, color: palette.textMuted, fontWeight: '700' },
  macroPillValue: { fontSize: 12, color: palette.text, fontWeight: '700' },
  logActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  amountButtonText: { fontSize: 16, color: palette.text, fontWeight: '700' },
  amountText: { fontSize: 14, color: palette.textMuted },
  deleteButton: { backgroundColor: '#F0E2DD', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: palette.danger, fontSize: 13, fontWeight: '700' },
  feedbackBubble: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: palette.sageDeep, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, alignItems: 'center', shadowColor: palette.sageDeep, shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  feedbackText: { color: palette.white, fontSize: 16, fontWeight: '700' },
  feedbackMacro: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  undoToast: { position: 'absolute', left: 18, right: 18, bottom: 24, borderRadius: 22, backgroundColor: '#29322C', paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  undoTitle: { color: palette.white, fontSize: 14, fontWeight: '700' },
  undoText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 4 },
  undoAction: { color: '#E9C28F', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 28, 24, 0.32)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, gap: 18 },
  sheetGrabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(49, 83, 71, 0.18)', marginBottom: 8 },
  sheetHero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  statusAvatarLarge: { width: 84, height: 84, borderRadius: 42, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center' },
  statusAvatarEmoji: { fontSize: 42 },
  sheetHeroTitle: { fontSize: 24, fontWeight: '700', color: palette.text },
  sheetHeroSubtitle: { fontSize: 14, color: palette.textMuted },
  statusInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  statusInfoCard: { width: '48%', backgroundColor: palette.card, borderRadius: 22, padding: 16, gap: 8 },
  infoLabel: { color: palette.textMuted, fontSize: 12 },
  infoValue: { color: palette.text, fontSize: 18, fontWeight: '700' },
  statusGoalCard: { backgroundColor: palette.card, borderRadius: 28, padding: 18, gap: 12 },
  goalCardTitle: { fontSize: 13, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  goalCalories: { fontSize: 30, fontWeight: '700', color: palette.sageDeep },
  goalMacroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  goalHint: { fontSize: 13, color: palette.textMuted },
  editorSheet: { maxHeight: '92%', backgroundColor: palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  editorTitle: { fontSize: 22, fontWeight: '700', color: palette.text, marginBottom: 12 },
  editorBody: { gap: 18, paddingBottom: 20 },
  editorSection: { gap: 12 },
  editorSectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: palette.card },
  chipActive: { backgroundColor: palette.sageDeep },
  chipText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  chipTextActive: { color: palette.white },
  previewCard: { backgroundColor: palette.card, borderRadius: 24, padding: 16, gap: 10 },
  previewTitle: { fontSize: 13, color: palette.textMuted },
  previewSummaryText: { fontSize: 14, color: palette.text, fontWeight: '600', lineHeight: 20 },
  previewSummaryDivider: { color: palette.textMuted, fontWeight: '400' },
  previewSummarySecondary: { fontSize: 12, color: palette.textMuted, marginTop: -2 },
  previewCalories: { fontSize: 28, fontWeight: '700', color: palette.sageDeep },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  categoryRowLabel: { fontSize: 13, color: palette.textMuted, fontWeight: '600' },
  categoryRowValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryRowValueText: { fontSize: 15, color: palette.text, fontWeight: '700' },
  categoryDropdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: palette.surface, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: palette.border },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: palette.card },
  categoryOptionActive: { backgroundColor: palette.sageDeep },
  categoryOptionText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  categoryOptionTextActive: { color: palette.white },
  subSection: { gap: 10, marginTop: 4 },
  portionSection: { backgroundColor: palette.surface, borderRadius: 22, padding: 16, gap: 10, borderWidth: 1, borderColor: palette.border },
  portionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portionTitle: { fontSize: 15, fontWeight: '700', color: palette.text },
  portionBadge: { fontSize: 13, fontWeight: '700', color: palette.sageDeep, backgroundColor: palette.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  portionBaseline: { fontSize: 12, color: palette.textMuted },
  portionNowLine: { fontSize: 15, color: palette.text, fontWeight: '700', marginTop: 2 },
  portionNowLineMuted: { color: palette.textMuted, fontWeight: '500', fontSize: 12 },
  sliderWrap: { paddingTop: 10, paddingBottom: 4 },
  sliderTrack: { height: 36, justifyContent: 'center', borderRadius: 999 },
  sliderFill: { position: 'absolute', left: 0, height: 6, backgroundColor: palette.sageStrong, borderRadius: 999, top: 15 },
  sliderTick: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.cardStrong, top: 15 },
  sliderTickActive: { backgroundColor: palette.sageDeep },
  sliderThumb: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: palette.white, borderWidth: 2, borderColor: palette.sageDeep, top: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sliderLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderLabelTap: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  sliderLabelText: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },
  sliderLabelTextActive: { color: palette.sageDeep, fontWeight: '700' },
  editorFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryButton: { flex: 1, backgroundColor: '#F0E2DD', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: palette.danger, fontSize: 14, fontWeight: '700' },
  primaryButton: { flex: 1, backgroundColor: palette.sageDeep, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: palette.white, fontSize: 14, fontWeight: '700' },
});
