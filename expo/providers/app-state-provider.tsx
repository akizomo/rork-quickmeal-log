import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { defaultBodyFatEntries, defaultProfile, defaultSettings, defaultWeightEntries } from '@/constants/nutrition-data';
import { getDishTopCategory } from '@/constants/dish-master';
import { getQuickLogCategory, getQuickLogSubcategory } from '@/constants/quick-log-master';
import type { CustomerInfo } from 'react-native-purchases';

import { AppSettings, BodyFatEntry, DailyActivitySummary, DishDraft, DishQuickEntryPayload, ExerciseLog, FoodLog, IngredientDraft, LogMode, SubscriptionStatus, UserProfile, WeightEntry } from '@/types/nutrition';
import { ENTITLEMENT_ID } from '@/constants/iap';
import { addCustomerInfoListener, getCustomerInfo, restorePurchases as iapRestore } from '@/utils/iap';
import { IngredientQuickDraft, QuickLogHistoryMap } from '@/types/quick-log';
import { buildDishMacro, clampPortion, computeIngredient, createFoodLogFromDish, createFoodLogFromDishQuickEntry, createFoodLogFromIngredient, formatDateKey, generateId, getDefaultModeByTime, getMealSlot, getQuickCategories, getSubType, sumToday } from '@/utils/nutrition';
import { adjustedTargetKcal, calcExerciseGrossKcal, calcExerciseNetKcal, EXERCISE_TYPES } from '@/utils/goals';
import { isSameDay } from '@/utils/history';
import { castHistoryMap, recordSelection, selectionFromDraft } from '@/utils/quick-log-history';
import { computeQuickLogMacro } from '@/utils/quick-log-macro';
import { resolveLog, ResolveInput, ResolveResult } from '@/utils/identity-resolver';
import { logDraftToFoodLog } from '@/utils/identity-log-bridge';
import { getIdentity } from '@/constants/identity';
import { lookupLegacyIdentity } from '@/constants/identity/migration-map';
import type { BucketKey } from '@/types/identity';
void getSubType;

export const MAX_PAST_LOGGING_DAYS = 7;

/** Bump when LEGACY_TO_IDENTITY_MAP changes and we want to re-run backfill.
 *  Aligned with docs/IA-identity-spec.md §7.2 (target schema version = 2). */
const IA_SCHEMA_VERSION = 2;

/**
 * Opportunistic backfill: walk legacy logs and add `identityId` /
 * `originIdentityId` when we have a known mapping. Old fields stay intact
 * for backward compatibility (per "旧キーはそのまま残す" decision).
 * Returns a new array only if anything actually changed.
 */
function backfillIdentityIds(logs: FoodLog[]): { logs: FoodLog[]; changed: boolean } {
  let changed = false;
  const next = logs.map((log) => {
    if (log.identityId) return log;
    const newId = lookupLegacyIdentity(log.categoryKey, log.subTypeKey);
    if (!newId) return log;
    changed = true;
    return { ...log, identityId: newId, originIdentityId: log.originIdentityId ?? newId };
  });
  return { logs: changed ? next : logs, changed };
}

const noop = () => undefined;

interface PersistedState {
  profile: UserProfile;
  logs: FoodLog[];
  settings: AppSettings;
  weights: WeightEntry[];
  bodyFatEntries: BodyFatEntry[];
  exerciseLogs: ExerciseLog[];
  /** v1.7+: Health 由来の日次活動サマリ (歩数 + アクティブエネ) */
  dailyActivities?: DailyActivitySummary[];
}

interface FeedbackState {
  id: string;
  label: string;
  macro: FoodLog['macro'];
}

/**
 * Live preview state shown while the IdentityLogSheet is open.
 * Renders at the same position as FloatingFeedback (under calorie ring),
 * but in a "tentative" style (cream/sage pale) until the user saves —
 * at which point it transitions to the green confirmed feedback.
 */
interface LivePreviewState {
  label: string;
  macro: FoodLog['macro'];
}

interface UndoState {
  log: FoodLog;
  expiresAt: number;
}

const STORAGE_KEY = 'quiet-nutrition-state-v1';

const defaultPersistedState: PersistedState = {
  profile: defaultProfile,
  logs: [],
  settings: defaultSettings,
  weights: defaultWeightEntries,
  bodyFatEntries: defaultBodyFatEntries,
  exerciseLogs: [],
  dailyActivities: [],
};

function migrateSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  const base = { ...defaultSettings, ...(raw ?? {}) };
  return {
    ...base,
    mealStyleBySlot: { ...defaultSettings.mealStyleBySlot!, ...(raw?.mealStyleBySlot ?? {}) },
    favoriteItemIds: raw?.favoriteItemIds ?? [],
    introSeenVersion: raw?.introSeenVersion ?? 0,
    onboardingCompleted: raw?.onboardingCompleted ?? false,
    onboardingStep: raw?.onboardingStep ?? 0,
    portionTendency: raw?.portionTendency ?? 'normal',
    trialStartedAtISO: raw?.trialStartedAtISO ?? null,
    subscriptionStatus: raw?.subscriptionStatus ?? 'none',
    onboardingCompletedAtISO: raw?.onboardingCompletedAtISO ?? null,
    paywallSeenAtISO: raw?.paywallSeenAtISO ?? null,
    healthConnectSeenAtISO: raw?.healthConnectSeenAtISO ?? null,
    quickLogHistory: castHistoryMap(raw?.quickLogHistory),
  };
}

function migrateProfile(raw: Partial<UserProfile> | undefined): UserProfile {
  return { ...defaultProfile, ...(raw ?? {}) };
}

function mapCustomerInfoToStatus(info: CustomerInfo): SubscriptionStatus {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (ent) {
    if (ent.periodType === 'TRIAL' || ent.periodType === 'INTRO') return 'trialing';
    return 'active';
  }
  // Active not present — check if previously held entitlement
  const all = info.entitlements.all[ENTITLEMENT_ID];
  if (all && all.expirationDate) return 'expired';
  return 'none';
}

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [weights, setWeights] = useState<WeightEntry[]>(defaultWeightEntries);
  const [bodyFatEntries, setBodyFatEntries] = useState<BodyFatEntry[]>(defaultBodyFatEntries);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [dailyActivities, setDailyActivities] = useState<DailyActivitySummary[]>([]);
  // Becomes true only after AsyncStorage data has been fully applied to local state.
  // Must NOT use persistedQuery.isLoading because setSettings() runs in a separate useEffect,
  // meaning isLoading=false but settings is still defaultSettings — causing onboarding/paywall loops.
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LogMode>(getDefaultModeByTime());
  // When logging on a past day (within MAX_PAST_LOGGING_DAYS), this is set to that day.
  // null = log to today (default).
  const [loggingDate, setLoggingDate] = useState<Date | null>(null);
  const [editorLogId, setEditorLogId] = useState<string | null>(null);
  const [dishQuickEntryKey, setDishQuickEntryKey] = useState<string | null>(null);
  const [quickIngredientSheetCategory, setQuickIngredientSheetCategory] = useState<string | null>(null);
  const [identityLogSheet, setIdentityLogSheet] = useState<{
    visible: boolean;
    bucketKey?: BucketKey;
    identityId?: string;
    /** When set, the sheet edits this existing FoodLog instead of creating new. */
    editingLogId?: string;
  }>({ visible: false });
  const [pendingLogIds, setPendingLogIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [livePreview, setLivePreview] = useState<LivePreviewState | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistedQuery = useQuery<PersistedState>({
    queryKey: ['quiet-nutrition-state'],
    queryFn: async () => {
      console.log('[app-state] Loading persisted state');
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultPersistedState;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        return {
          profile: migrateProfile(parsed.profile),
          logs: parsed.logs ?? [],
          settings: migrateSettings(parsed.settings),
          weights: parsed.weights ?? defaultWeightEntries,
          bodyFatEntries: parsed.bodyFatEntries ?? defaultBodyFatEntries,
          exerciseLogs: parsed.exerciseLogs ?? [],
          dailyActivities: parsed.dailyActivities ?? [],
        };
      } catch (error) {
        console.log('[app-state] Failed to parse persisted state', error);
        return defaultPersistedState;
      }
    },
  });

  const persistMutation = useMutation({
    mutationFn: async (nextState: PersistedState) => {
      console.log('[app-state] Persisting state', {
        logs: nextState.logs.length,
        weights: nextState.weights.length,
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    },
  });

  useEffect(() => {
    if (!persistedQuery.data) {
      return;
    }

    console.log('[app-state] Hydrating state from storage');
    setProfile(persistedQuery.data.profile);
    setSettings(persistedQuery.data.settings);
    setWeights(persistedQuery.data.weights);
    setBodyFatEntries(persistedQuery.data.bodyFatEntries);
    setExerciseLogs(persistedQuery.data.exerciseLogs ?? []);
    setDailyActivities(persistedQuery.data.dailyActivities ?? []);

    // Identity-first IA backfill (Phase 5). Runs once per schema bump.
    const needsMigration =
      (persistedQuery.data.settings.iaSchemaVersion ?? 0) < IA_SCHEMA_VERSION;
    if (needsMigration) {
      const { logs: migratedLogs, changed } = backfillIdentityIds(persistedQuery.data.logs);
      const nextSettings: AppSettings = {
        ...persistedQuery.data.settings,
        iaSchemaVersion: IA_SCHEMA_VERSION,
      };
      setLogs(migratedLogs);
      setSettings(nextSettings);
      console.log('[app-state] IA backfill', { changed, count: migratedLogs.length });
      // Persist the bumped schema version + (possibly) updated logs.
      persistMutation.mutate({
        profile: persistedQuery.data.profile,
        logs: migratedLogs,
        settings: nextSettings,
        weights: persistedQuery.data.weights,
        bodyFatEntries: persistedQuery.data.bodyFatEntries,
        exerciseLogs: persistedQuery.data.exerciseLogs ?? [],
      });
    } else {
      setLogs(persistedQuery.data.logs);
    }
    setIsHydrated(true);
    // persistMutation intentionally omitted from deps — it's stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedQuery.data]);

  // Subscribe to RevenueCat customer info updates and sync subscriptionStatus
  useEffect(() => {
    let mounted = true;

    const sync = (info: CustomerInfo | null) => {
      if (!mounted || !info) return;
      const next = mapCustomerInfoToStatus(info);
      setSettings((prev) => {
        // RC がサーバー側処理遅延で 'none' を返すことがある。
        // trialing/active を持つユーザーを 'none' でダウングレードしない。
        // 'expired' は明示的な失効信号なので許可する。
        if (
          next === 'none' &&
          (prev.subscriptionStatus === 'trialing' || prev.subscriptionStatus === 'active')
        ) {
          return prev;
        }
        // status 不変だが、trialing で trialStartedAtISO 未記録なら best-effort で補完
        // (修正前に発行されたトライアルの後方互換)。
        if (prev.subscriptionStatus === next) {
          if (next === 'trialing' && !prev.trialStartedAtISO) {
            console.log('[app-state] Backfilling trialStartedAtISO');
            return { ...prev, trialStartedAtISO: new Date().toISOString() };
          }
          return prev;
        }
        const updated: AppSettings = {
          ...prev,
          subscriptionStatus: next,
          trialStartedAtISO:
            next === 'trialing' && !prev.trialStartedAtISO
              ? new Date().toISOString()
              : prev.trialStartedAtISO,
        };
        console.log('[app-state] Subscription status →', next);
        return updated;
      });
    };

    getCustomerInfo().then(sync).catch(() => undefined);
    const unsub = addCustomerInfoListener((info) => sync(info));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const persist = useCallback(
    (
      nextProfile: UserProfile,
      nextLogs: FoodLog[],
      nextSettings: AppSettings,
      nextWeights: WeightEntry[],
      nextBodyFatEntries: BodyFatEntry[],
      nextExerciseLogs?: ExerciseLog[],
      nextDailyActivities?: DailyActivitySummary[]
    ) => {
      persistMutation.mutate({
        profile: nextProfile,
        logs: nextLogs,
        settings: nextSettings,
        weights: nextWeights,
        bodyFatEntries: nextBodyFatEntries,
        exerciseLogs: nextExerciseLogs ?? exerciseLogs,
        dailyActivities: nextDailyActivities ?? dailyActivities,
      });
    },
    [persistMutation, exerciseLogs, dailyActivities]
  );

  const triggerFeedback = useCallback((log: FoodLog) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    setFeedback({
      id: log.id,
      label: `+${Math.round(log.macro.kcal)} kcal`,
      macro: log.macro,
    });

    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1200);
  }, []);

  const triggerUndo = useCallback((log: FoodLog) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    const expiresAt = Date.now() + 4000;
    setUndoState({ log, expiresAt });
    undoTimerRef.current = setTimeout(() => {
      setUndoState((current) => (current?.log.id === log.id ? null : current));
    }, 4000);
  }, []);

  const pushLog = useCallback(
    async (log: FoodLog) => {
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) => {
          console.log('[app-state] Haptics error', error);
        });
      }

      const nextLogs = [log, ...logs];
      setLogs(nextLogs);
      triggerFeedback(log);
      triggerUndo(log);
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, triggerFeedback, triggerUndo, weights]
  );

  /** Replace an existing log in place (edit mode), preserving its position in the list. */
  const replaceLog = useCallback(
    async (updated: FoodLog) => {
      const idx = logs.findIndex((l) => l.id === updated.id);
      if (idx < 0) {
        console.log('[app-state] replaceLog: log not found', updated.id);
        return;
      }
      const nextLogs = [...logs.slice(0, idx), updated, ...logs.slice(idx + 1)];
      setLogs(nextLogs);
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const pushPendingLog = useCallback(
    async (log: FoodLog) => {
      if (settings.hapticsEnabled) {
        Haptics.selectionAsync().catch((error) => {
          console.log('[app-state] Haptics error', error);
        });
      }
      const nextLogs = [log, ...logs];
      setLogs(nextLogs);
      setPendingLogIds((prev) => [...prev, log.id]);
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  // Rewrite a freshly-created log so it lands on `loggingDate` (a past day) when
  // the user is viewing a past page. Keeps the time-of-day from "now" so the meal
  // slot inference still feels natural.
  const applyLoggingDate = useCallback(
    (log: FoodLog): FoodLog => {
      if (!loggingDate) return log;
      const now = new Date();
      if (isSameDay(loggingDate, now)) return log;
      const t = new Date(loggingDate);
      t.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      return {
        ...log,
        date: formatDateKey(t),
        timestamp: t.toISOString(),
        mealSlot: getMealSlot(t),
      };
    },
    [loggingDate]
  );

  const quickLog = useCallback(
    async (categoryKey: string) => {
      if (selectedMode === 'dish') {
        const topCat = getDishTopCategory(categoryKey);
        if (topCat && topCat.quickEntry.kind !== 'instant_save') {
          console.log('[app-state] Opening dish quick entry sheet', categoryKey);
          setDishQuickEntryKey(categoryKey);
          return null;
        }
      }

      const baseLog = selectedMode === 'ingredient'
        ? createFoodLogFromIngredient(categoryKey)
        : createFoodLogFromDish(categoryKey);

      if (!baseLog) {
        console.log('[app-state] Failed to create quick log', { categoryKey, selectedMode });
        return null;
      }

      const log = applyLoggingDate(baseLog);
      await pushLog(log);
      return log;
    },
    [applyLoggingDate, pushLog, selectedMode]
  );

  const openQuickIngredientSheet = useCallback((categoryKey: string) => {
    setQuickIngredientSheetCategory(categoryKey);
  }, []);

  const closeQuickIngredientSheet = useCallback(() => {
    setQuickIngredientSheetCategory(null);
  }, []);

  const submitQuickIngredient = useCallback(
    async (draft: IngredientQuickDraft) => {
      const category = getQuickLogCategory(draft.categoryKey);
      const sub = getQuickLogSubcategory(draft.categoryKey, draft.subcategoryKey);
      const computation = computeQuickLogMacro(draft);
      if (!category || !sub || !computation) {
        console.log('[app-state] Failed to compute quick ingredient', draft);
        return null;
      }

      const now = new Date();
      const baseLog: FoodLog = {
        id: generateId('log'),
        date: formatDateKey(now),
        timestamp: now.toISOString(),
        mealSlot: getMealSlot(now),
        mode: 'ingredient',
        categoryKey: category.key,
        categoryLabel: category.label,
        subTypeKey: sub.key,
        subTypeLabel: sub.label,
        baseMacro: computation.baseMacro,
        macro: computation.total,
        attrKey: draft.attrKey,
        partKey: draft.partKey,
        methodKey: draft.methodKey,
        amountValue: draft.amountValue,
        amountUnit: draft.amountUnit,
        amountLabel: draft.amountLabel,
      };
      const log = applyLoggingDate(baseLog);
      await pushLog(log);

      // Record selection in history (recent + frequency)
      const sel = selectionFromDraft(draft);
      if (sel) {
        const currentHistory = (settings.quickLogHistory ?? {}) as QuickLogHistoryMap;
        const nextHistory = recordSelection(currentHistory, sel);
        const nextSettings: AppSettings = { ...settings, quickLogHistory: nextHistory };
        setSettings(nextSettings);
        // Persist with the freshly-pushed log already in `logs`. pushLog has
        // updated the in-memory state, but we re-persist with the new settings
        // here. Read the latest logs through the closure used by pushLog.
        // Note: pushLog persists itself; this second persist captures the
        // updated history map.
        persist(profile, [log, ...logs], nextSettings, weights, bodyFatEntries);
      }

      setQuickIngredientSheetCategory(null);
      return log;
    },
    [applyLoggingDate, bodyFatEntries, logs, persist, profile, pushLog, settings, weights]
  );

  // ----- Identity-first IA (Phase 2+) -----

  const openIdentityLogSheet = useCallback(
    (bucketKey: BucketKey, opts?: { identityId?: string; editingLogId?: string }) => {
      setIdentityLogSheet({
        visible: true,
        bucketKey,
        identityId: opts?.identityId,
        editingLogId: opts?.editingLogId,
      });
    },
    []
  );

  const closeIdentityLogSheet = useCallback(() => {
    setIdentityLogSheet({ visible: false });
    setLivePreview(null); // clear preview when sheet is dismissed without saving
  }, []);

  /**
   * Live preview push — called by IdentityLogSheet as the user edits.
   * Pass null to clear (e.g. on save complete).
   */
  const updateLivePreview = useCallback((next: LivePreviewState | null) => {
    setLivePreview(next);
  }, []);

  /**
   * Persist a resolved IdentityLogDraft as a FoodLog. The Identity registry
   * is the source of truth — `submitIdentityLog` only handles persistence
   * and history bookkeeping.
   */
  const submitIdentityLog = useCallback(
    async (resolved: ResolveResult, opts?: { editingLogId?: string; wasShortTap?: boolean }) => {
      const editingLogId = opts?.editingLogId ?? identityLogSheet.editingLogId;

      // Edit-mode: update the existing FoodLog in place (preserve id/date/timestamp/mealSlot).
      if (editingLogId) {
        const existing = logs.find((l) => l.id === editingLogId);
        if (existing) {
          const updated = logDraftToFoodLog(resolved, {
            id: existing.id,
            date: existing.date,
            timestamp: existing.timestamp,
            mealSlot: existing.mealSlot,
            wasShortTap: existing.wasShortTap, // preserve original origin flag
          });
          await replaceLog(updated);
          setIdentityLogSheet({ visible: false });
          return updated;
        }
        // Fall through to insert if the original is missing (shouldn't happen).
      }

      const now = new Date();
      const baseLog = logDraftToFoodLog(resolved, {
        id: generateId('log'),
        date: formatDateKey(now),
        timestamp: now.toISOString(),
        mealSlot: getMealSlot(now),
        wasShortTap: opts?.wasShortTap,
      });
      const log = applyLoggingDate(baseLog);
      await pushLog(log);
      setIdentityLogSheet({ visible: false });
      return log;
    },
    [identityLogSheet.editingLogId, logs, replaceLog, applyLoggingDate, pushLog]
  );

  /**
   * Tap-to-record at default amount (no detail editing).
   * Used by single-tap on a chip outside the bottom sheet.
   */
  const quickLogIdentity = useCallback(
    async (identityId: string) => {
      const identity = getIdentity(identityId);
      if (!identity) {
        console.log('[app-state] quickLogIdentity: unknown identity', identityId);
        return null;
      }
      const input: ResolveInput = { originIdentityId: identityId };
      const resolved = resolveLog(input);
      return submitIdentityLog(resolved);
    },
    [submitIdentityLog]
  );

  const submitDishQuickEntry = useCallback(
    async (payload: DishQuickEntryPayload) => {
      const baseLog = createFoodLogFromDishQuickEntry(payload);
      if (!baseLog) {
        console.log('[app-state] Failed to create dish quick entry');
        return null;
      }
      const log = applyLoggingDate(baseLog);
      await pushLog(log);
      setDishQuickEntryKey(null);
      return log;
    },
    [applyLoggingDate, pushLog]
  );

  const openDraftEditor = useCallback(
    async (categoryKey: string) => {
      if (selectedMode === 'dish') {
        const topCat = getDishTopCategory(categoryKey);
        if (topCat && topCat.quickEntry.kind !== 'instant_save') {
          setDishQuickEntryKey(categoryKey);
          return null;
        }
      }

      const baseLog = selectedMode === 'ingredient'
        ? createFoodLogFromIngredient(categoryKey)
        : createFoodLogFromDish(categoryKey);

      if (!baseLog) return null;
      const log = applyLoggingDate(baseLog);
      await pushPendingLog(log);
      setEditorLogId(log.id);
      return log;
    },
    [applyLoggingDate, pushPendingLog, selectedMode]
  );

  const commitPendingLog = useCallback(
    (id: string) => {
      setPendingLogIds((prev) => {
        if (!prev.includes(id)) return prev;
        const target = logs.find((item) => item.id === id);
        if (target) {
          triggerFeedback(target);
          triggerUndo(target);
        }
        return prev.filter((p) => p !== id);
      });
    },
    [logs, triggerFeedback, triggerUndo]
  );

  const cancelPendingLog = useCallback(
    (id: string) => {
      setPendingLogIds((prev) => {
        if (!prev.includes(id)) return prev;
        const nextLogs = logs.filter((item) => item.id !== id);
        console.log('[app-state] Canceling pending log', id);
        setLogs(nextLogs);
        persist(profile, nextLogs, settings, weights, bodyFatEntries);
        return prev.filter((p) => p !== id);
      });
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const undoLastLog = useCallback(() => {
    if (!undoState) {
      return;
    }

    const nextLogs = logs.filter((item) => item.id !== undoState.log.id);
    console.log('[app-state] Undoing log', undoState.log.id);
    setLogs(nextLogs);
    setUndoState(null);
    persist(profile, nextLogs, settings, weights, bodyFatEntries);
  }, [bodyFatEntries, logs, persist, profile, settings, undoState, weights]);

  const deleteLog = useCallback(
    (id: string) => {
      const target = logs.find((item) => item.id === id);
      const nextLogs = logs.filter((item) => item.id !== id);
      console.log('[app-state] Deleting log', id);
      setLogs(nextLogs);
      if (target) {
        triggerUndo(target);
      }
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, triggerUndo, weights]
  );

  const updateIngredientLog = useCallback(
    (id: string, draft: IngredientDraft) => {
      const category = getQuickCategories('ingredient').find((item) => item.key === draft.categoryKey);
      if (!category) {
        return;
      }

      const computation = computeIngredient(draft);
      const nextLogs = logs.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          categoryKey: draft.categoryKey,
          categoryLabel: category.label,
          subTypeKey: draft.subTypeKey,
          subTypeLabel: computation.subtype?.label,
          portionValue: draft.portionValue,
          portionLabel: computation.portionLabel,
          amountMultiplier: draft.portionValue,
          baseMacro: computation.baseMacro,
          toppings: computation.toppings,
          toppingMacroDelta: computation.toppingMacroDelta,
          macro: computation.total,
        } satisfies FoodLog;
      });

      console.log('[app-state] Updating ingredient log', { id, draft });
      setLogs(nextLogs);
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const updateDishLog = useCallback(
    (id: string, draft: DishDraft) => {
      const category = getQuickCategories('dish').find((item) => item.key === draft.categoryKey);
      if (!category) {
        return;
      }

      const subType = getSubType('dish', draft.categoryKey, draft.subTypeKey);
      const nextLogs = logs.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          categoryKey: draft.categoryKey,
          categoryLabel: category.label,
          subTypeKey: draft.subTypeKey,
          subTypeLabel: subType?.label,
          additions: draft.additions,
          size: draft.size,
          macro: buildDishMacro(draft),
        } satisfies FoodLog;
      });

      console.log('[app-state] Updating dish log', { id, draft });
      setLogs(nextLogs);
      persist(profile, nextLogs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const adjustLogAmount = useCallback(
    (id: string, direction: 'increase' | 'decrease') => {
      const target = logs.find((item) => item.id === id);
      if (!target || target.mode !== 'ingredient') {
        return;
      }

      const current = target.portionValue ?? target.amountMultiplier ?? 1;
      const nextAmount = clampPortion(direction === 'increase' ? current + 0.5 : current - 0.5);
      updateIngredientLog(id, {
        categoryKey: target.categoryKey,
        subTypeKey: target.subTypeKey ?? '',
        portionValue: nextAmount,
        toppingKeys: (target.toppings ?? []).map((t) => t.id),
      });
    },
    [logs, updateIngredientLog]
  );

  const updateProfileValues = useCallback(
    (partial: Partial<UserProfile>) => {
      const nextProfile: UserProfile = {
        ...profile,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      console.log('[app-state] Updating profile');
      setProfile(nextProfile);
      persist(nextProfile, logs, settings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const updateSettingsValues = useCallback(
    (partial: Partial<AppSettings>) => {
      const nextSettings: AppSettings = {
        ...settings,
        ...partial,
      };
      console.log('[app-state] Updating settings');
      setSettings(nextSettings);
      persist(profile, logs, nextSettings, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const markIntroSeen = useCallback(
    (version: number) => {
      const next: AppSettings = { ...settings, introSeenVersion: version };
      setSettings(next);
      persist(profile, logs, next, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const markPaywallSeen = useCallback(() => {
    const next: AppSettings = { ...settings, paywallSeenAtISO: new Date().toISOString() };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const markHealthConnectSeen = useCallback(() => {
    const next: AppSettings = { ...settings, healthConnectSeenAtISO: new Date().toISOString() };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const startTrial = useCallback(() => {
    const startedAtISO = new Date().toISOString();
    const next: AppSettings = {
      ...settings,
      trialStartedAtISO: startedAtISO,
      subscriptionStatus: 'trialing',
    };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
    console.log('[app-state] Trial started', startedAtISO);
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const completePurchase = useCallback(
    (info: CustomerInfo) => {
      const mapped = mapCustomerInfoToStatus(info);
      // RC のレスポンスにエンタイトルメントがまだ反映されていない場合 (遅延)、
      // 'none'/'expired' になることがある。購入直後は trialing に fallback する。
      const status: SubscriptionStatus =
        mapped === 'none' || mapped === 'expired' ? 'trialing' : mapped;
      // 'trialing' に遷移するなら開始時刻を必ず記録する (ローカル時刻ベースの満了判定に必要)。
      const nextTrialStartedAtISO =
        status === 'trialing' && !settings.trialStartedAtISO
          ? new Date().toISOString()
          : settings.trialStartedAtISO;
      const next: AppSettings = {
        ...settings,
        subscriptionStatus: status,
        paywallSeenAtISO: new Date().toISOString(),
        trialStartedAtISO: nextTrialStartedAtISO,
      };
      setSettings(next);
      persist(profile, logs, next, weights, bodyFatEntries);
      console.log('[app-state] Purchase completed, status →', status, '(mapped:', mapped, ')');
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const restorePurchase = useCallback(async () => {
    console.log('[app-state] Restoring purchases via RevenueCat');
    const info = await iapRestore();
    if (!info) return false;
    const status = mapCustomerInfoToStatus(info);
    const next: AppSettings = { ...settings, subscriptionStatus: status };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
    return status === 'active' || status === 'trialing';
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const setOnboardingStep = useCallback(
    (step: number) => {
      const next: AppSettings = { ...settings, onboardingStep: step };
      setSettings(next);
      persist(profile, logs, next, weights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, weights]
  );

  const completeOnboarding = useCallback(() => {
    const next: AppSettings = {
      ...settings,
      onboardingCompleted: true,
      onboardingStep: 0,
      onboardingCompletedAtISO: settings.onboardingCompletedAtISO ?? new Date().toISOString(),
    };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
    console.log('[app-state] Onboarding complete');
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const resetOnboarding = useCallback(() => {
    const next: AppSettings = {
      ...settings,
      onboardingCompleted: false,
      onboardingStep: 0,
      introSeenVersion: 0,
      paywallSeenAtISO: null,
      onboardingCompletedAtISO: null,
      healthConnectSeenAtISO: null,
      subscriptionStatus: 'none',
      trialStartedAtISO: null,
    };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const addWeightEntry = useCallback(
    (
      weightKg: number,
      options?: {
        /** Default: 'manual' */
        source?: 'manual' | 'health';
        /** Stable ID from Health SDK to dedupe re-imports */
        healthSyncId?: string;
        /** ISO timestamp; default = now */
        recordedAt?: string;
      }
    ) => {
      const source = options?.source ?? 'manual';
      const now = options?.recordedAt ? new Date(options.recordedAt) : new Date();
      const dateKey = formatDateKey(now);
      // Skip duplicate Health re-imports
      if (options?.healthSyncId && weights.some((w) => w.healthSyncId === options.healthSyncId)) {
        return;
      }
      const nextEntry: WeightEntry = {
        id: `w-${now.getTime()}`,
        date: dateKey,
        weightKg,
        createdAt: now.toISOString(),
        source,
        healthSyncId: options?.healthSyncId,
      };
      // Same-day "後勝ち": replace any existing entry for the same date
      const nextWeights = [nextEntry, ...weights.filter((item) => item.date !== nextEntry.date)];
      setWeights(nextWeights);
      updateProfileValues({ currentWeightKg: weightKg });
      persist(profile, logs, settings, nextWeights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, updateProfileValues, weights]
  );

  const addBodyFatEntry = useCallback(
    (
      bodyFatPct: number,
      options?: {
        source?: 'manual' | 'health';
        healthSyncId?: string;
        recordedAt?: string;
      }
    ) => {
      const source = options?.source ?? 'manual';
      const now = options?.recordedAt ? new Date(options.recordedAt) : new Date();
      const dateKey = formatDateKey(now);
      if (
        options?.healthSyncId &&
        bodyFatEntries.some((bf) => bf.healthSyncId === options.healthSyncId)
      ) {
        return;
      }
      const nextEntry: BodyFatEntry = {
        id: `bf-${now.getTime()}`,
        date: dateKey,
        bodyFatPct,
        createdAt: now.toISOString(),
        source,
        healthSyncId: options?.healthSyncId,
      };
      const nextBodyFatEntries = [nextEntry, ...bodyFatEntries.filter((item) => item.date !== nextEntry.date)];
      setBodyFatEntries(nextBodyFatEntries);
      updateProfileValues({ currentBodyFatPct: bodyFatPct });
      persist(profile, logs, settings, weights, nextBodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, updateProfileValues, weights]
  );

  const logExercise = useCallback(
    (exerciseType: string, minutes: number) => {
      const type = EXERCISE_TYPES.find((t) => t.key === exerciseType);
      if (!type) {
        console.log('[app-state] logExercise: unknown type', exerciseType);
        return;
      }
      const weightKg = profile.currentWeightKg ?? 60;
      const activityLevel = profile.activityLevel ?? 1;
      const grossKcal = calcExerciseGrossKcal(type.met, weightKg, minutes);
      const netKcal = calcExerciseNetKcal(grossKcal, activityLevel);
      const now = new Date();
      const entry: ExerciseLog = {
        id: generateId('ex'),
        date: formatDateKey(loggingDate ?? now),
        timestamp: now.toISOString(),
        exerciseType,
        exerciseLabel: type.label,
        minutes,
        grossKcal,
        netKcal,
      };
      const nextExerciseLogs = [entry, ...exerciseLogs];
      setExerciseLogs(nextExerciseLogs);
      persist(profile, logs, settings, weights, bodyFatEntries, nextExerciseLogs);
      console.log('[app-state] Exercise logged', entry);
    },
    [bodyFatEntries, exerciseLogs, logs, loggingDate, persist, profile, settings, weights]
  );

  const deleteExerciseLog = useCallback(
    (id: string) => {
      const nextExerciseLogs = exerciseLogs.filter((e) => e.id !== id);
      setExerciseLogs(nextExerciseLogs);
      persist(profile, logs, settings, weights, bodyFatEntries, nextExerciseLogs);
      console.log('[app-state] Exercise log deleted', id);
    },
    [bodyFatEntries, exerciseLogs, logs, persist, profile, settings, weights]
  );

  /**
   * v1.7+: Health 由来のワークアウトを ExerciseLog として取り込む。
   *   - 同 `healthSyncId` の重複保存をスキップ
   *   - 同日 × 同種別 × ±15分以内 の手動エントリは Health 側で置換 (Health 優先)
   *   - 統計 / 動的TDEE は既存ロジックがそのまま利用 (source は内部区別のみ)
   */
  const addExerciseLogFromHealth = useCallback(
    (input: {
      exerciseType: string;
      exerciseLabel: string;
      startedAt: string;
      minutes: number;
      grossKcal: number;
      healthSyncId: string;
    }) => {
      const startedAt = input.startedAt;
      const startMs = new Date(startedAt).getTime();
      if (!Number.isFinite(startMs)) return;
      // すでに同期済みならスキップ
      if (exerciseLogs.some((e) => e.healthSyncId === input.healthSyncId)) return;
      const dateKey = formatDateKey(new Date(startedAt));
      const activityLevel = profile.activityLevel ?? 1;
      const netKcal = calcExerciseNetKcal(input.grossKcal, activityLevel);
      const dedupWindowMs = 15 * 60 * 1000; // ±15分
      // 同日 × 同種別 × 近い時刻 の手動エントリは Health で置換
      const filtered = exerciseLogs.filter((e) => {
        if (e.date !== dateKey) return true;
        if (e.exerciseType !== input.exerciseType) return true;
        if (e.source === 'health') return true;
        const t = new Date(e.timestamp).getTime();
        if (!Number.isFinite(t)) return true;
        return Math.abs(t - startMs) > dedupWindowMs;
      });
      const entry: ExerciseLog = {
        id: generateId('ex-h'),
        date: dateKey,
        timestamp: startedAt,
        exerciseType: input.exerciseType,
        exerciseLabel: input.exerciseLabel,
        minutes: input.minutes,
        grossKcal: input.grossKcal,
        netKcal,
        source: 'health',
        healthSyncId: input.healthSyncId,
      };
      const nextExerciseLogs = [entry, ...filtered];
      setExerciseLogs(nextExerciseLogs);
      persist(profile, logs, settings, weights, bodyFatEntries, nextExerciseLogs);
    },
    [bodyFatEntries, exerciseLogs, logs, persist, profile, settings, weights]
  );

  /**
   * v1.7+: 日次活動サマリ (歩数 + アクティブエネ) を上書き保存する。
   * 同日付のエントリは置換 (Health 取得は冪等にしたいので最新値が常に正)。
   *
   * 注: 単発の手動更新用。Health 由来のバッチ取込には `ingestHealthSyncResult` を使う。
   */
  const upsertDailyActivity = useCallback(
    (input: { date: string; steps: number; activeKcal: number; syncedAt: string }) => {
      const nextEntry: DailyActivitySummary = {
        date: input.date,
        steps: input.steps,
        activeKcal: input.activeKcal,
        source: 'health',
        syncedAt: input.syncedAt,
      };
      const next = [nextEntry, ...dailyActivities.filter((d) => d.date !== input.date)];
      setDailyActivities(next);
      // exerciseLogs を明示渡し: closure 経由の暗黙 fallback による
      // stale-state リスクを回避する。
      persist(profile, logs, settings, weights, bodyFatEntries, exerciseLogs, next);
    },
    [bodyFatEntries, dailyActivities, exerciseLogs, logs, persist, profile, settings, weights]
  );

  /**
   * v1.7+: Health 同期結果 (weights / bodyFats / workouts / dailyActivities) を
   * **1 つのトランザクションで** 全て取り込む。
   *
   * このメソッドは、useHealthSync のループ内で個別の `addExerciseLogFromHealth`
   * 等を順番に呼ぶことによる **stale closure バグ** を回避するために存在する。
   *
   * 仕様:
   *   - 全ての差分計算を closure の現在値から開始
   *   - 取込結果の同期 ID を見て既存とマージ
   *   - 同日 × 同種別 × ±15分 の手動運動は Health 側で置換 (Health 優先)
   *   - 体重/体脂肪は同日後勝ち + profile 同期更新
   *   - dailyActivities は同日付上書き
   *   - state 更新は 4 つまとめて、persist は 1 度だけ呼ぶ
   */
  const ingestHealthSyncResult = useCallback(
    (result: {
      weights: { date: string; recordedAt: string; weightKg: number; healthSyncId: string }[];
      bodyFats: { date: string; recordedAt: string; bodyFatPct: number; healthSyncId: string }[];
      workouts: {
        startedAt: string;
        exerciseTypeKey: string;
        exerciseLabel: string;
        minutes: number;
        grossKcal: number;
        healthSyncId: string;
      }[];
      dailyActivities: { date: string; steps: number; activeKcal: number }[];
      syncedAt: string;
    }) => {
      // 1) weights — 同 healthSyncId スキップ + 同日後勝ち
      const newestWeightsPerDate = (() => {
        const seen = new Set<string>();
        const out: typeof result.weights = [];
        for (const w of result.weights) {
          if (seen.has(w.date)) continue;
          seen.add(w.date);
          out.push(w);
        }
        return out;
      })();
      let nextWeights = weights;
      // 古い順から処理して today を最後に書く ("後勝ち" 一貫性)
      for (const w of [...newestWeightsPerDate].reverse()) {
        if (nextWeights.some((item) => item.healthSyncId === w.healthSyncId)) continue;
        const recordedAt = w.recordedAt;
        const entry: WeightEntry = {
          id: `w-${new Date(recordedAt).getTime()}`,
          date: w.date,
          weightKg: w.weightKg,
          createdAt: recordedAt,
          source: 'health',
          healthSyncId: w.healthSyncId,
        };
        nextWeights = [entry, ...nextWeights.filter((item) => item.date !== entry.date)];
      }

      // 2) bodyFats — 同様
      const newestBodyFatsPerDate = (() => {
        const seen = new Set<string>();
        const out: typeof result.bodyFats = [];
        for (const bf of result.bodyFats) {
          if (seen.has(bf.date)) continue;
          seen.add(bf.date);
          out.push(bf);
        }
        return out;
      })();
      let nextBodyFatEntries = bodyFatEntries;
      for (const bf of [...newestBodyFatsPerDate].reverse()) {
        if (nextBodyFatEntries.some((item) => item.healthSyncId === bf.healthSyncId)) continue;
        const recordedAt = bf.recordedAt;
        const entry: BodyFatEntry = {
          id: `bf-${new Date(recordedAt).getTime()}`,
          date: bf.date,
          bodyFatPct: bf.bodyFatPct,
          createdAt: recordedAt,
          source: 'health',
          healthSyncId: bf.healthSyncId,
        };
        nextBodyFatEntries = [entry, ...nextBodyFatEntries.filter((item) => item.date !== entry.date)];
      }

      // 3) workouts — ExerciseLog として加算。同 healthSyncId スキップ + 同日同種±15分の手動置換
      let nextExerciseLogs = exerciseLogs;
      const activityLevel = profile.activityLevel ?? 1;
      const weightKg = profile.currentWeightKg ?? 60;
      const dedupWindowMs = 15 * 60 * 1000;
      for (const w of result.workouts) {
        if (nextExerciseLogs.some((e) => e.healthSyncId === w.healthSyncId)) continue;
        const startMs = new Date(w.startedAt).getTime();
        if (!Number.isFinite(startMs)) continue;
        const dateKey = formatDateKey(new Date(w.startedAt));
        const met = EXERCISE_TYPES.find((t) => t.key === w.exerciseTypeKey)?.met ?? 5.0;
        const grossKcal =
          w.grossKcal > 0 ? w.grossKcal : calcExerciseGrossKcal(met, weightKg, w.minutes);
        const netKcal = calcExerciseNetKcal(grossKcal, activityLevel);
        const filtered = nextExerciseLogs.filter((e) => {
          if (e.date !== dateKey) return true;
          if (e.exerciseType !== w.exerciseTypeKey) return true;
          if (e.source === 'health') return true;
          const t = new Date(e.timestamp).getTime();
          if (!Number.isFinite(t)) return true;
          return Math.abs(t - startMs) > dedupWindowMs;
        });
        const entry: ExerciseLog = {
          id: generateId('ex-h'),
          date: dateKey,
          timestamp: w.startedAt,
          exerciseType: w.exerciseTypeKey,
          exerciseLabel: w.exerciseLabel,
          minutes: w.minutes,
          grossKcal,
          netKcal,
          source: 'health',
          healthSyncId: w.healthSyncId,
        };
        nextExerciseLogs = [entry, ...filtered];
      }

      // 4) dailyActivities — 同日付上書き
      let nextDailyActivities = dailyActivities;
      for (const da of result.dailyActivities) {
        const entry: DailyActivitySummary = {
          date: da.date,
          steps: da.steps,
          activeKcal: da.activeKcal,
          source: 'health',
          syncedAt: result.syncedAt,
        };
        nextDailyActivities = [entry, ...nextDailyActivities.filter((d) => d.date !== entry.date)];
      }

      // 5) profile の current weight/BF% は最新の体重/体脂肪エントリと同期
      let nextProfile = profile;
      if (nextWeights.length > 0 && nextWeights[0].weightKg !== profile.currentWeightKg) {
        nextProfile = { ...nextProfile, currentWeightKg: nextWeights[0].weightKg };
      }
      if (
        nextBodyFatEntries.length > 0 &&
        nextBodyFatEntries[0].bodyFatPct !== profile.currentBodyFatPct
      ) {
        nextProfile = { ...nextProfile, currentBodyFatPct: nextBodyFatEntries[0].bodyFatPct };
      }

      // 6) 4 state まとめて更新 + persist は 1 回 (全て明示的に渡す)
      setProfile(nextProfile);
      setWeights(nextWeights);
      setBodyFatEntries(nextBodyFatEntries);
      setExerciseLogs(nextExerciseLogs);
      setDailyActivities(nextDailyActivities);
      persist(
        nextProfile,
        logs,
        settings,
        nextWeights,
        nextBodyFatEntries,
        nextExerciseLogs,
        nextDailyActivities
      );
      console.log('[app-state] ingestHealthSyncResult', {
        weights: newestWeightsPerDate.length,
        bodyFats: newestBodyFatsPerDate.length,
        workouts: result.workouts.length,
        dailyActivities: result.dailyActivities.length,
      });
    },
    [
      bodyFatEntries,
      dailyActivities,
      exerciseLogs,
      logs,
      persist,
      profile,
      settings,
      weights,
    ]
  );

  const todayKey = formatDateKey(new Date());
  const todayLogs = useMemo(() => logs.filter((item) => item.date === todayKey), [logs, todayKey]);
  const todayMacro = useMemo(() => sumToday(logs, todayKey), [logs, todayKey]);
  const todayExerciseLogs = useMemo(() => exerciseLogs.filter((e) => e.date === todayKey), [exerciseLogs, todayKey]);
  const todayGrossExerciseKcal = useMemo(() => todayExerciseLogs.reduce((s, e) => s + e.grossKcal, 0), [todayExerciseLogs]);
  const todayNetExerciseKcal = useMemo(() => todayExerciseLogs.reduce((s, e) => s + e.netKcal, 0), [todayExerciseLogs]);
  const todayAdjustedTargetKcal = useMemo(
    () => adjustedTargetKcal(profile.targetCalories, exerciseLogs, todayKey),
    [exerciseLogs, profile.targetCalories, todayKey]
  );
  const todayDailyActivity = useMemo<DailyActivitySummary | null>(
    () => dailyActivities.find((d) => d.date === todayKey) ?? null,
    [dailyActivities, todayKey]
  );
  const editorLog = useMemo(() => logs.find((item) => item.id === editorLogId) ?? null, [editorLogId, logs]);
  const editorIsPending = useMemo(() => (editorLogId ? pendingLogIds.includes(editorLogId) : false), [editorLogId, pendingLogIds]);

  return {
    profile,
    logs,
    todayLogs,
    todayMacro,
    exerciseLogs,
    todayExerciseLogs,
    todayGrossExerciseKcal,
    todayNetExerciseKcal,
    todayAdjustedTargetKcal,
    dailyActivities,
    todayDailyActivity,
    logExercise,
    deleteExerciseLog,
    addExerciseLogFromHealth,
    upsertDailyActivity,
    ingestHealthSyncResult,
    settings,
    weights,
    bodyFatEntries,
    selectedMode,
    editorLog,
    feedback,
    livePreview,
    updateLivePreview,
    undoState,
    isHydrating: !isHydrated,
    isPersisting: persistMutation.isPending,
    setSelectedMode,
    loggingDate,
    setLoggingDate,
    setEditorLogId,
    dishQuickEntryKey,
    setDishQuickEntryKey,
    submitDishQuickEntry,
    quickIngredientSheetCategory,
    openQuickIngredientSheet,
    closeQuickIngredientSheet,
    submitQuickIngredient,
    identityLogSheet,
    openIdentityLogSheet,
    closeIdentityLogSheet,
    submitIdentityLog,
    quickLogIdentity,
    quickLog,
    openDraftEditor,
    commitPendingLog,
    cancelPendingLog,
    editorIsPending,
    undoLastLog,
    deleteLog,
    adjustLogAmount,
    updateIngredientLog,
    updateDishLog,
    updateProfileValues,
    updateSettingsValues,
    addWeightEntry,
    addBodyFatEntry,
    getMealSlot,
    markIntroSeen,
    markPaywallSeen,
    markHealthConnectSeen,
    completePurchase,
    startTrial,
    restorePurchase,
    setOnboardingStep,
    completeOnboarding,
    resetOnboarding,
    noop,
  };
});
