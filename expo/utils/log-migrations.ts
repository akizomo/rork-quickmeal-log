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

/**
 * 廃止した Identity を別 Identity の「種類」に回収したときの付け替え。
 * 量の単位と数値は据え置く (回収先の種類が同じ単位・同じ既定量を持つ前提)。
 * 保存済みの macro は変えない。
 */
export interface IdentityRemapRule {
  fromIdentityId: string;
  toIdentityId: string;
  toAttrKey: string;
}

export interface DataMigration {
  id: string;
  description: string;
  amountRescale: AmountRescaleRule[];
  /** 廃止した Identity の付け替え。省略 = なし。amountRescale より先に適用する。 */
  identityRemap?: IdentityRemapRule[];
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
  {
    id: 'maki-thin-cut-2026-10-24',
    description: '細巻を「本」から「切」で数える。1本 = 6切 (macro は据え置き)', // i18n-ignore: 開発者向けの説明 (UI には出さない)
    amountRescale: [{ identityId: 'maki', attrKey: 'maki_thin', scale: 6 }],
  },
  {
    id: 'fold-oden-fresh-roll-2026-11-21',
    description: '「定食・単品・汁」の一覧を整理するため、おでんを鍋もの、生春巻きを点心の種類に回収する (量・macro は据え置き)', // i18n-ignore: 開発者向けの説明 (UI には出さない)
    amountRescale: [],
    identityRemap: [
      { fromIdentityId: 'oden', toIdentityId: 'nabe', toAttrKey: 'oden' },
      { fromIdentityId: 'fresh_roll', toIdentityId: 'tenshin', toAttrKey: 'fresh_roll' },
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

function findRemap(remaps: IdentityRemapRule[], identityId: string | undefined): IdentityRemapRule | undefined {
  return identityId ? remaps.find((r) => r.fromIdentityId === identityId) : undefined;
}

export function remapLog(log: FoodLog, remaps: IdentityRemapRule[]): FoodLog {
  const to = findRemap(remaps, log.identityId);
  const originTo = findRemap(remaps, log.originIdentityId);
  if (!to && !originTo) return log;
  const next: FoodLog = { ...log };
  if (to) {
    next.identityId = to.toIdentityId;
    next.attrKey = to.toAttrKey;
  }
  if (originTo) next.originIdentityId = originTo.toIdentityId;
  return next;
}

export function remapHistory(history: QuickLogHistoryMap, remaps: IdentityRemapRule[]): QuickLogHistoryMap {
  const out: QuickLogHistoryMap = {};
  for (const [key, list] of Object.entries(history)) {
    out[key] = list.map((sel: QuickLogSelection) => {
      const to = findRemap(remaps, sel.subcategoryKey);
      if (!to) return sel;
      return { ...sel, subcategoryKey: to.toIdentityId, attrKey: to.toAttrKey as QuickLogSelection['attrKey'] };
    });
  }
  return out;
}

/** ⭐️ のピン留め・非表示の Identity ID を付け替える。付け替えで重複したら先に出た方を残す。 */
export function remapIdList(ids: string[] | undefined, remaps: IdentityRemapRule[]): string[] | undefined {
  if (!ids) return ids;
  const mapped = ids.map((id) => findRemap(remaps, id)?.toIdentityId ?? id);
  return mapped.filter((id, i) => mapped.indexOf(id) === i);
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
  let pins = state.settings.frequentPins;
  let hidden = state.settings.frequentHidden;
  for (const m of pending) {
    const remaps = m.identityRemap ?? [];
    if (remaps.length > 0) {
      logs = logs.map((l) => remapLog(l, remaps));
      history = remapHistory(history, remaps);
      pins = remapIdList(pins, remaps);
      hidden = remapIdList(hidden, remaps);
    }
    logs = logs.map((l) => migrateLog(l, m.amountRescale));
    history = migrateHistory(history, m.amountRescale);
    applied.add(m.id);
  }
  return {
    state: {
      ...state,
      logs,
      settings: {
        ...state.settings,
        quickLogHistory: history,
        frequentPins: pins,
        frequentHidden: hidden,
        appliedMigrations: [...applied],
      },
    },
    changed: true,
  };
}
