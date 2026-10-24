/**
 * 不変条件: どの FoodLog も、タップして開く先が必ず 1 つに決まり、保存済みの数値を壊さない。
 *
 *   - 編集の入口は 'identity' (IdentityLogSheet) か 'numeric' (DirectInputSheet) のどちらか。
 *   - 'identity' に解決されるのは、IdentityLogSheet が自分で保存した記録だけ。
 *   - 直接入力・旧形式・手で数値を確定した記録は必ず 'numeric'。
 *   - 数値で編集した記録は、何度開き直しても 'numeric' のまま、入力した macro を保つ。
 */

import { ALL_IDENTITIES, getIdentity } from '@/constants/identity';
import { lookupLegacyIdentity, LEGACY_TO_IDENTITY_MAP } from '@/constants/identity/migration-map';
import type { FoodLog } from '@/types/nutrition';
import { logDraftToFoodLog } from './identity-log-bridge';
import { resolveLog } from './identity-resolver';
import {
  applyNumericEdit,
  DIRECT_INPUT_CATEGORY_KEY,
  isLegacyFormatLog,
  resolveLogEditRoute,
} from './log-edit-route';
import { createFoodLogFromDish, createFoodLogFromIngredient, getQuickCategories } from './nutrition';

const META = { id: 'log-1', date: '2026-10-22', timestamp: '2026-10-22T12:00:00.000Z' };

function identityNativeLog(identityId: string): FoodLog {
  return logDraftToFoodLog(resolveLog({ originIdentityId: identityId }), META);
}

/** 起動時 backfill (app-state-provider の backfillIdentityIds) と同じ付与。 */
function withBackfill(log: FoodLog): FoodLog {
  const identityId = lookupLegacyIdentity(log.categoryKey, log.subTypeKey);
  return identityId ? { ...log, identityId, originIdentityId: identityId } : log;
}

const directInputLog: FoodLog = {
  ...META,
  mode: 'ingredient',
  categoryKey: DIRECT_INPUT_CATEGORY_KEY,
  categoryLabel: 'プロテインバー',
  macro: { kcal: 187, protein: 15, fat: 6, carbs: 17 },
};

describe('resolveLogEditRoute — Identity で保存した記録', () => {
  it('どの Identity で記録しても identity に解決され、入口が実在する', () => {
    const broken: string[] = [];
    for (const identity of ALL_IDENTITIES) {
      const log = identityNativeLog(identity.id);
      const route = resolveLogEditRoute(log);
      if (route.kind !== 'identity') {
        broken.push(`${identity.id}: ${route.kind}`);
        continue;
      }
      if (!getIdentity(route.identityId)) broken.push(`${identity.id}: origin ${route.identityId} が辞書に無い`);
    }
    expect(broken).toEqual([]);
  });

  it('PFC崩壊遮断で別 Identity に振り替わった記録も identity で開ける', () => {
    // 鶏むね + 揚げ → 唐揚げ (origin !== record)
    const resolved = resolveLog({ originIdentityId: 'chicken_lean', styleKey: 'fried' });
    const log = logDraftToFoodLog(resolved, META);
    expect(log.identityId).not.toBe(log.originIdentityId);
    expect(resolveLogEditRoute(log).kind).toBe('identity');
  });

  it('辞書から消えた Identity を指す記録は numeric に落ちる (開けない入口を作らない)', () => {
    const gone: FoodLog = { ...identityNativeLog('egg'), identityId: 'removed_identity', originIdentityId: 'removed_identity' };
    expect(resolveLogEditRoute(gone).kind).toBe('numeric');
    const goneOrigin: FoodLog = { ...identityNativeLog('egg'), originIdentityId: 'removed_identity' };
    expect(resolveLogEditRoute(goneOrigin).kind).toBe('numeric');
  });
});

describe('resolveLogEditRoute — 数値を再計算させない記録', () => {
  it('直接入力は numeric', () => {
    expect(resolveLogEditRoute(directInputLog).kind).toBe('numeric');
  });

  it('旧カテゴリ記録 (食材・料理の全カテゴリ) は backfill の前後どちらでも numeric', () => {
    const logs: FoodLog[] = [];
    for (const mode of ['ingredient', 'dish'] as const) {
      for (const category of getQuickCategories(mode)) {
        const log = mode === 'ingredient' ? createFoodLogFromIngredient(category.key) : createFoodLogFromDish(category.key);
        if (log) logs.push(log);
      }
    }
    expect(logs.length).toBeGreaterThan(0);
    const wrong = logs.flatMap((log) => [log, withBackfill(log)]).filter((log) => resolveLogEditRoute(log).kind !== 'numeric');
    expect(wrong.map((l) => `${l.categoryKey}/${l.subTypeKey}`)).toEqual([]);
  });

  it('backfill で identityId が付いた旧形式ログ (移行マップの全エントリ) は numeric', () => {
    const wrong: string[] = [];
    for (const key of Object.keys(LEGACY_TO_IDENTITY_MAP)) {
      const [categoryKey, subTypeKey] = key.split('/');
      const legacy: FoodLog = {
        ...META,
        mode: 'ingredient',
        categoryKey,
        categoryLabel: categoryKey,
        subTypeKey,
        portionValue: 1,
        macro: { kcal: 200, protein: 10, fat: 5, carbs: 30 },
      };
      const migrated = withBackfill(legacy);
      expect(migrated.identityId).toBeDefined();
      if (resolveLogEditRoute(migrated).kind !== 'numeric') wrong.push(key);
    }
    expect(wrong).toEqual([]);
  });

  it('旧 QuickIngredientSheet 由来 (partKey / methodKey のみ) も旧形式として numeric', () => {
    const log: FoodLog = {
      ...META,
      mode: 'ingredient',
      categoryKey: 'lean_protein',
      categoryLabel: '肉魚(低脂)',
      subTypeKey: 'chicken_breast',
      identityId: 'chicken_lean',
      originIdentityId: 'chicken_lean',
      partKey: 'breast',
      methodKey: 'grilled',
      amountValue: 150,
      amountUnit: 'g',
      macro: { kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
    };
    expect(isLegacyFormatLog(log)).toBe(true);
    expect(resolveLogEditRoute(log).kind).toBe('numeric');
  });

  it('identityId を持たない記録は numeric', () => {
    expect(resolveLogEditRoute({ ...directInputLog, categoryKey: 'whatever' }).kind).toBe('numeric');
  });
});

describe('applyNumericEdit — 数値で編集した記録は固定される', () => {
  it('Identity 記録を数値で直すと、以後ずっと numeric で、macro は入力値のまま', () => {
    const original = identityNativeLog('chicken_lean');
    expect(resolveLogEditRoute(original).kind).toBe('identity');

    const macro = { kcal: 321, protein: 40, fat: 9, carbs: 2 };
    const edited = applyNumericEdit(original, { macro });
    expect(edited.macro).toEqual(macro);
    expect(edited.macroManual).toBe(true);
    // 数値以外 (名前・日時・Identity) は変えない
    expect(edited.categoryLabel).toBe(original.categoryLabel);
    expect(edited.identityId).toBe(original.identityId);
    expect(edited.timestamp).toBe(original.timestamp);
    expect(resolveLogEditRoute(edited).kind).toBe('numeric');
    // もう一度直しても同じ
    expect(resolveLogEditRoute(applyNumericEdit(edited, { macro })).kind).toBe('numeric');
  });

  it('旧形式ログの macro を変えずに保存しても、値は 1 も動かない', () => {
    const legacy = withBackfill(createFoodLogFromIngredient('staple') as FoodLog);
    const edited = applyNumericEdit(legacy, { macro: legacy.macro });
    expect(edited.macro).toEqual(legacy.macro);
    expect(edited.categoryLabel).toBe(legacy.categoryLabel);
  });

  it('label を渡したときだけ名前が変わる (直接入力)', () => {
    const edited = applyNumericEdit(directInputLog, { macro: directInputLog.macro, label: '新しい名前' });
    expect(edited.categoryLabel).toBe('新しい名前');
    expect(edited.categoryKey).toBe(DIRECT_INPUT_CATEGORY_KEY);
  });
});
