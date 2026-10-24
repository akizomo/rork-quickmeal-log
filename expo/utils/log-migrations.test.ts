/**
 * 保存済みの記録・履歴の量の移行 (utils/log-migrations.ts)。
 * 「旧データ → 新データ」の実物のケースで、(1) macro を変えずに量だけ換算する、
 * (2) 新しい DB 仕様で再計算しても macro が変わらない (= 換算が正しい)、(3) 冪等、を検査する。
 */
import { getIdentity } from '@/constants/identity';
import type { AppSettings, FoodLog } from '@/types/nutrition';
import type { QuickLogHistoryMap } from '@/types/quick-log';
import { applyDataMigrations, MIGRATIONS, migrateHistory, migrateLog } from './log-migrations';
import { resolveLog } from './identity-resolver';

const RULES = MIGRATIONS.flatMap((m) => m.amountRescale);

function oldLog(over: Partial<FoodLog>): FoodLog {
  return {
    id: 'l1',
    date: '2026-10-01',
    timestamp: '2026-10-01T12:00:00.000Z',
    mealSlot: 'lunch',
    mode: 'dish',
    categoryKey: 'misc_dish',
    categoryLabel: '定食・単品・汁',
    macro: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    ...over,
  } as FoodLog;
}

const settings = (over: Partial<AppSettings> = {}) => ({ ...over }) as AppSettings;

describe('量の移行 — 旧データを新しい単位に換算する', () => {
  it.each([
    // [Identity, 種類, 旧amountValue, 新amountValue, 新しいラベル]
    ['fried_main', 'tonkatsu', 3, 1, '1枚'],
    ['fried_main', 'tonkatsu', 6, 2, '2枚'],
    ['fried_main', 'tonkatsu_hire', 3, 1, '1枚'],
    ['fried_main', 'menchi', 3, 1, '1個'],
    ['fried_main', 'menchi', 9, 3, '3個'],
    ['fried_main', 'korokke', 3, 1, '1個'],
    ['okonomi', 'takoyaki', 1, 8, '8個'],
    ['okonomi', 'takoyaki', 0.5, 4, '4個'],
    ['maki', 'maki_thin', 1, 6, '6切'],
    ['maki', 'maki_thin', 2, 12, '12切'],
    ['okonomi', 'takoyaki', 2, 16, '16個'],
  ])('%s/%s: %s → %s', (identityId, attrKey, from, to, label) => {
    const migrated = migrateLog(oldLog({ identityId, attrKey, amountValue: from, amountLabel: 'OLD' }), RULES);
    expect(migrated.amountValue).toBe(to);
    expect(migrated.amountLabel).toBe(label);
  });

  it('保存済みの macro / baseMacro は変えない (記録した時点の事実)', () => {
    const macro = { kcal: 501, protein: 22, fat: 30, carbs: 18 };
    const log = oldLog({ identityId: 'fried_main', attrKey: 'tonkatsu', amountValue: 3, macro, baseMacro: macro });
    const migrated = migrateLog(log, RULES);
    expect(migrated.macro).toEqual(macro);
    expect(migrated.baseMacro).toEqual(macro);
  });

  it('換算後の値を新しい DB で再計算すると、旧い記録時の macro と一致する (換算の正しさ)', () => {
    // 旧仕様で記録された値 (旧 spec: 既定 3個 で resolver が出した値) を再現できる必要があるので、
    // 旧い「3個 × 係数」と同じ macro = 新しい「1枚」の macro であることを、macro の基準で確認する。
    for (const [identityId, attrKey, oldAmount, oldDefault] of [
      ['fried_main', 'tonkatsu', 3, 3],
      ['fried_main', 'menchi', 3, 3],
      ['fried_main', 'korokke', 3, 3],
      ['okonomi', 'takoyaki', 1, 1],
    ] as const) {
      const identity = getIdentity(identityId)!;
      const base = identity.defaultMacro;
      const attr = identity.attributes!.find((a) => a.key === attrKey)!;
      // 旧: macro = defaultMacro × factor × (旧量 / 旧既定)。旧量=旧既定のとき defaultMacro × factor
      const oldKcal = base.kcal * (attr.factor?.kcal ?? 1) * (oldAmount / oldDefault);
      const migrated = migrateLog(oldLog({ identityId, attrKey, amountValue: oldAmount }), RULES);
      const redo = resolveLog({ originIdentityId: identityId, attributeKey: attrKey, amountValue: migrated.amountValue }).baseMacro.kcal;
      expect(redo).toBeCloseTo(oldKcal, 0);
    }
  });

  it('対象外の種類・Identity・amountValue 無しのログは変えない', () => {
    const untouched = [
      oldLog({ identityId: 'fried_main', attrKey: 'karaage_momo', amountValue: 150 }),
      oldLog({ identityId: 'fried_main', attrKey: 'tonkatsu' }), // amountValue 無し = 既定量
      oldLog({ identityId: 'okonomi', attrKey: 'okonomiyaki', amountValue: 1 }),
      oldLog({ categoryKey: 'direct_input' }),
    ];
    for (const l of untouched) expect(migrateLog(l, RULES)).toBe(l);
  });

  it('履歴 (quickLogHistory) の amountValue も同じ規則で換算する', () => {
    const history: QuickLogHistoryMap = {
      'dish:misc_dish': [
        { categoryKey: 'misc_dish', subcategoryKey: 'fried_main', attrKey: 'tonkatsu' as never, amountValue: 3, amountUnit: 'piece', amountLabel: '3個', loggedAtISO: 'x', mode: 'dish' },
        { categoryKey: 'misc_dish', subcategoryKey: 'fried_main', attrKey: 'karaage_momo' as never, amountValue: 150, amountUnit: 'g', amountLabel: '150g', loggedAtISO: 'x', mode: 'dish' },
      ],
    };
    const out = migrateHistory(history, RULES);
    expect(out['dish:misc_dish'][0]).toMatchObject({ amountValue: 1, amountLabel: '1枚' });
    expect(out['dish:misc_dish'][1]).toMatchObject({ amountValue: 150, amountLabel: '150g' });
  });
});

describe('applyDataMigrations — 冪等性と印', () => {
  const logs = [oldLog({ id: 'a', identityId: 'fried_main', attrKey: 'tonkatsu', amountValue: 3 })];

  it('未適用なら換算し、適用済みIDを残す (changed=true)', () => {
    const { state, changed } = applyDataMigrations({ logs, settings: settings() });
    expect(changed).toBe(true);
    expect(state.logs[0].amountValue).toBe(1);
    expect(state.settings.appliedMigrations).toEqual(MIGRATIONS.map((m) => m.id));
  });

  it('2回目は何もしない (二重に換算しない)', () => {
    const first = applyDataMigrations({ logs, settings: settings() });
    const second = applyDataMigrations(first.state);
    expect(second.changed).toBe(false);
    expect(second.state).toBe(first.state);
    expect(second.state.logs[0].amountValue).toBe(1);
  });

  it('適用済みの印がある状態 (新規インストール等) では、新仕様の値に触らない', () => {
    const fresh = { logs: [oldLog({ id: 'b', identityId: 'fried_main', attrKey: 'tonkatsu', amountValue: 1 })], settings: settings({ appliedMigrations: MIGRATIONS.map((m) => m.id) }) };
    const { state, changed } = applyDataMigrations(fresh);
    expect(changed).toBe(false);
    expect(state.logs[0].amountValue).toBe(1);
  });

  it('移行IDが重複していない', () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('規則が指す Identity / 種類が DB に実在する (規則の腐敗防止)', () => {
    const bad = RULES.filter((r) => !getIdentity(r.identityId)?.attributes?.some((a) => a.key === r.attrKey));
    expect(bad).toEqual([]);
  });
});
