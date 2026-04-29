import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { defaultBodyFatEntries, defaultProfile, defaultSettings, defaultWeightEntries } from '@/constants/nutrition-data';
import { getDishTopCategory } from '@/constants/dish-master';
import { getQuickLogCategory, getQuickLogSubcategory } from '@/constants/quick-log-master';
import type { CustomerInfo } from 'react-native-purchases';

import { AppSettings, BodyFatEntry, DishDraft, DishQuickEntryPayload, FoodLog, IngredientDraft, LogMode, SubscriptionStatus, UserProfile, WeightEntry } from '@/types/nutrition';
import { ENTITLEMENT_ID } from '@/constants/iap';
import { addCustomerInfoListener, getCustomerInfo, restorePurchases as iapRestore } from '@/utils/iap';
import { IngredientQuickDraft, QuickLogHistoryMap } from '@/types/quick-log';
import { buildDishMacro, clampPortion, computeIngredient, createFoodLogFromDish, createFoodLogFromDishQuickEntry, createFoodLogFromIngredient, formatDateKey, generateId, getDefaultModeByTime, getMealSlot, getQuickCategories, getSubType, sumToday } from '@/utils/nutrition';
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
}

interface FeedbackState {
  id: string;
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
  }>({ visible: false });
  const [pendingLogIds, setPendingLogIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
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
      });
    } else {
      setLogs(persistedQuery.data.logs);
    }
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
        if (prev.subscriptionStatus === next) return prev;
        const updated: AppSettings = { ...prev, subscriptionStatus: next };
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
      nextBodyFatEntries: BodyFatEntry[]
    ) => {
      persistMutation.mutate({
        profile: nextProfile,
        logs: nextLogs,
        settings: nextSettings,
        weights: nextWeights,
        bodyFatEntries: nextBodyFatEntries,
      });
    },
    [persistMutation]
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

  const openIdentityLogSheet = useCallback((bucketKey: BucketKey, identityId?: string) => {
    setIdentityLogSheet({ visible: true, bucketKey, identityId });
  }, []);

  const closeIdentityLogSheet = useCallback(() => {
    setIdentityLogSheet({ visible: false });
  }, []);

  /**
   * Persist a resolved IdentityLogDraft as a FoodLog. The Identity registry
   * is the source of truth — `submitIdentityLog` only handles persistence
   * and history bookkeeping.
   */
  const submitIdentityLog = useCallback(
    async (resolved: ResolveResult) => {
      const now = new Date();
      const baseLog = logDraftToFoodLog(resolved, {
        id: generateId('log'),
        date: formatDateKey(now),
        timestamp: now.toISOString(),
        mealSlot: getMealSlot(now),
      });
      const log = applyLoggingDate(baseLog);
      await pushLog(log);
      setIdentityLogSheet({ visible: false });
      return log;
    },
    [applyLoggingDate, pushLog]
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
      subscriptionStatus: 'none',
      trialStartedAtISO: null,
    };
    setSettings(next);
    persist(profile, logs, next, weights, bodyFatEntries);
  }, [bodyFatEntries, logs, persist, profile, settings, weights]);

  const addWeightEntry = useCallback(
    (weightKg: number) => {
      const now = new Date();
      const nextEntry: WeightEntry = {
        id: `w-${now.getTime()}`,
        date: formatDateKey(now),
        weightKg,
        createdAt: now.toISOString(),
      };
      const nextWeights = [nextEntry, ...weights.filter((item) => item.date !== nextEntry.date)];
      setWeights(nextWeights);
      updateProfileValues({ currentWeightKg: weightKg });
      persist(profile, logs, settings, nextWeights, bodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, updateProfileValues, weights]
  );

  const addBodyFatEntry = useCallback(
    (bodyFatPct: number) => {
      const now = new Date();
      const nextEntry: BodyFatEntry = {
        id: `bf-${now.getTime()}`,
        date: formatDateKey(now),
        bodyFatPct,
        createdAt: now.toISOString(),
      };
      const nextBodyFatEntries = [nextEntry, ...bodyFatEntries.filter((item) => item.date !== nextEntry.date)];
      setBodyFatEntries(nextBodyFatEntries);
      updateProfileValues({ currentBodyFatPct: bodyFatPct });
      persist(profile, logs, settings, weights, nextBodyFatEntries);
    },
    [bodyFatEntries, logs, persist, profile, settings, updateProfileValues, weights]
  );

  const todayKey = formatDateKey(new Date());
  const todayLogs = useMemo(() => logs.filter((item) => item.date === todayKey), [logs, todayKey]);
  const todayMacro = useMemo(() => sumToday(logs, todayKey), [logs, todayKey]);
  const editorLog = useMemo(() => logs.find((item) => item.id === editorLogId) ?? null, [editorLogId, logs]);
  const editorIsPending = useMemo(() => (editorLogId ? pendingLogIds.includes(editorLogId) : false), [editorLogId, pendingLogIds]);

  return {
    profile,
    logs,
    todayLogs,
    todayMacro,
    settings,
    weights,
    bodyFatEntries,
    selectedMode,
    editorLog,
    feedback,
    undoState,
    isHydrating: persistedQuery.isLoading,
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
    startTrial,
    restorePurchase,
    setOnboardingStep,
    completeOnboarding,
    resetOnboarding,
    noop,
  };
});
