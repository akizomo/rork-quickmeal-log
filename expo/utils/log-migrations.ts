/**
 * log-migrations.ts — 保存済みの記録・履歴の「量」を、DB 修正に合わせて移行する。
 *
 * なぜ要るか: FoodLog は `amountValue` (数) と `attrKey` だけを保存し、単位の解釈は
 * 「いまの DB の amount spec」に委ねている。種類の既定量・単位を入れ替える DB 修正
 * (例: ロースかつ「3個」→「1枚」) をすると、保存済みの `amountValue: 3` が 3枚 = 3倍の
 * kcal として読まれ、記録を開いて保存し直しただけで数値が壊れる。
 * そこで **値を新しい単位に換算し直す**。保存済みの macro (kcal/PFC) は変えない
 * (記録した時点の事実なので)。換算が正しければ、新しい spec で再計算しても macro は変わらない。
 *
 * 冪等性: `settings.appliedMigrations` に適用済みIDを残す。同じ移行は二度と走らない。
 *   (値の換算は「1回だけ」が前提で、二重に掛けると壊れる)
 *
 * 新しい移行の足し方:
 *   1. DB の amount spec を直す (constants/identity/*.ts)
 *   2. ここに AmountRescaleRule を持つ移行を足し、MIGRATIONS に登録する (IDは新規に)
 *   3. db-invariants.test.ts の KNOWN_ANCHOR_VIOLATIONS から該当項目を外す
 *   4. log-migrations.test.ts に「旧データ → 新データ」のケースを足す
 */
import { getIdentity } from '@/constants/identity';
import type { AppSettings, FoodLog } from '@/types/nutrition';
import type { QuickLogHistoryMap, QuickLogSelection } from '@/types/quick-log';
import { buildAmountLabel } from './identity-log-bridge';

/** 旧い amountValue に scale を掛けると、新しい amount spec での値になる。 */
export interface AmountRescaleRule {
  identityId: string;
  attrKey: string;
  /** 新しい値 = 旧い値 × scale (新既定量 / 旧既定量) */
  scale: number;
}

export interface DataMigration {
  id: string;
  description: string;
  amountRescale: AmountRescaleRule[];
}

export const MIGRATIONS: DataMigration[] = [
  {
    id: 'amount-units-2026-10-22',
    description:
      '揚げもの・粉ものの数える単位を実物に合わせる。ロースかつ/ヒレかつ 3個→1枚、メンチカツ/コロッケ 3個→1個、たこ焼き 1枚→8個 (macro は据え置き)', // i18n-ignore: 開発者向けの説明 (UI には出さない)
    amountRescale: [
      // 旧: 既定 3個 = 1枚ぶんの macro (501kcal)。新: 既定 1枚。3個 → 1枚。
      { identityId: 'fried_main', attrKey: 'tonkatsu', scale: 1 / 3 },
      { identityId: 'fried_main', attrKey: 'tonkatsu_hire', scale: 1 / 3 },
      // 旧: 既定 3個 の macro は実は1個ぶんの値。新: 既定 1個。
      { identityId: 'fried_main', attrKey: 'menchi', scale: 1 / 3 },
      { identityId: 'fried_main', attrKey: 'korokke', scale: 1 / 3 },
      // 旧: 既定 1枚 = たこ焼き8個ぶん (418kcal)。新: 既定 8個。1枚 → 8個。
      { identityId: 'okonomi', attrKey: 'takoyaki', scale: 8 },
    ],
  },
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

function findRule(rules: AmountRescaleRule[], identityId: string | undefined, attrKey: string | undefined): AmountRescaleRule | undefined {
  if (!identityId || !attrKey) return undefined;
  return rules.find((r) => r.identityId === identityId && r.attrKey === attrKey);
}

function relabel(identityId: string, attrKey: string, value: number, fallback: string | undefined): string | undefined {
  const identity = getIdentity(identityId);
  // 表示ラベルは再生成する。DB に無い Identity (廃止済み等) は触らない。
  return identity ? buildAmountLabel(identity, attrKey, value, 'ja') : fallback;
}

export function migrateLog(log: FoodLog, rules: AmountRescaleRule[]): FoodLog {
  const rule = findRule(rules, log.identityId, log.attrKey);
  // amountValue 無し = 既定量で記録した古いログ。既定量は新 spec の既定と同じ macro を指すので換算不要。
  if (!rule || log.amountValue === undefined) return log;
  const value = round2(log.amountValue * rule.scale);
  return { ...log, amountValue: value, amountLabel: relabel(rule.identityId, rule.attrKey, value, log.amountLabel) };
}

export function migrateHistory(history: QuickLogHistoryMap, rules: AmountRescaleRule[]): QuickLogHistoryMap {
  const out: QuickLogHistoryMap = {};
  for (const [key, list] of Object.entries(history)) {
    out[key] = list.map((sel: QuickLogSelection) => {
      // Identity-first 由来のエントリは subcategoryKey = recordIdentity.id
      const rule = findRule(rules, sel.subcategoryKey, sel.attrKey);
      if (!rule) return sel;
      const value = round2(sel.amountValue * rule.scale);
      return { ...sel, amountValue: value, amountLabel: relabel(rule.identityId, rule.attrKey, value, sel.amountLabel) };
    });
  }
  return out;
}

export interface MigratableState {
  logs: FoodLog[];
  settings: AppSettings;
}

/**
 * 未適用の移行を順に適用する。1つも適用しなければ入力をそのまま返し、changed=false。
 * changed=true のときは、呼び出し側が**直ちに永続化**すること (永続化前に落ちると、次回起動で
 * 同じ換算を二重に掛ける)。
 */
export function applyDataMigrations<T extends MigratableState>(state: T, migrations: DataMigration[] = MIGRATIONS): { state: T; changed: boolean } {
  const applied = new Set(state.settings.appliedMigrations ?? []);
  const pending = migrations.filter((m) => !applied.has(m.id));
  if (pending.length === 0) return { state, changed: false };

  let logs = state.logs;
  let history = (state.settings.quickLogHistory ?? {}) as QuickLogHistoryMap;
  for (const m of pending) {
    logs = logs.map((l) => migrateLog(l, m.amountRescale));
    history = migrateHistory(history, m.amountRescale);
    applied.add(m.id);
  }
  return {
    state: {
      ...state,
      logs,
      settings: { ...state.settings, quickLogHistory: history, appliedMigrations: [...applied] },
    },
    changed: true,
  };
}
