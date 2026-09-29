/**
 * Tests for weekly-recap.ts — 週次振り返り (C レーン) の純ロジック。
 *
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test weekly-recap
 */

import { computeWeeklyRecap, selectDiscoveries } from './weekly-recap';
import type { FoodLog, UserProfile } from '@/types/nutrition';
import { ALL_IDENTITIES, getIdentity } from '@/constants/identity';
import { formatDateKey } from '@/utils/nutrition';

// 基準日: 2026-08-03 (月) を「今週」とする。
// → 直近の完了週は 2026-07-27 (月) 〜 2026-08-02 (日)。
const NOW = new Date('2026-08-03T09:00:00');

function makeLog(
  date: string,
  kcal: number,
  macroOverrides: Partial<{ protein: number; fat: number; carbs: number }> = {},
  identityId?: string,
): FoodLog {
  return {
    id: `log-${date}-${kcal}-${JSON.stringify(macroOverrides)}-${identityId ?? ''}-${Math.random()}`,
    date,
    timestamp: `${date}T12:00:00.000Z`,
    mode: 'ingredient',
    categoryKey: 'staple',
    categoryLabel: '主食',
    macro: { kcal, protein: 0, fat: 0, carbs: 0, ...macroOverrides },
    identityId,
  };
}

function makeProfile(targetCalories: number): UserProfile {
  return {
    id: 'p1',
    heightCm: 170,
    currentWeightKg: 65,
    targetWeightKg: 60,
    goalType: 'balanced',
    targetCalories,
    targetProtein: 100,
    targetFat: 50,
    targetCarbs: 200,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

describe('computeWeeklyRecap — 記録なし', () => {
  it('直近完了週に記録が1件も無ければ null を返す', () => {
    const result = computeWeeklyRecap([], makeProfile(2000), [], undefined, NOW);
    expect(result).toBeNull();
  });

  it('今週 (進行中) の記録だけがあっても対象外で null', () => {
    // 2026-08-03 は今週の月曜。直近完了週 (7/27-8/2) には記録が無い。
    const logs = [makeLog('2026-08-03', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result).toBeNull();
  });

  it('2週間以上前の記録は対象外で null', () => {
    const logs = [makeLog('2026-07-15', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result).toBeNull();
  });
});

describe('computeWeeklyRecap — weekKey', () => {
  it('直近完了週の月曜日を weekKey として返す', () => {
    const logs = [makeLog('2026-07-28', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.weekKey).toBe('2026-07-27');
  });
});

describe('computeWeeklyRecap — daysLogged / avgKcal', () => {
  it('記録日数を正しく数える', () => {
    const logs = [
      makeLog('2026-07-27', 500),
      makeLog('2026-07-29', 600),
      makeLog('2026-08-01', 400),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.daysLogged).toBe(3);
  });

  it('同日複数ログは合算してから平均に使う', () => {
    const logs = [
      makeLog('2026-07-27', 500),
      makeLog('2026-07-27', 300), // 同日 → 800kcal で1日扱い
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.daysLogged).toBe(1);
    expect(result?.avgKcal).toBe(800);
    expect(result?.totalKcal).toBe(800);
  });

  it('totalKcal は記録日の合計 (ヒーロー数字用、平均とは別軸)', () => {
    const logs = [
      makeLog('2026-07-27', 500),
      makeLog('2026-07-28', 600),
      makeLog('2026-07-29', 400),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.totalKcal).toBe(1500);
    expect(result?.avgKcal).toBe(500);
  });

  it('平均カロリーを丸めて返す', () => {
    const logs = [
      makeLog('2026-07-27', 500),
      makeLog('2026-07-28', 501),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    // (500+501)/2 = 500.5 → 500 or 501 (Math.round)
    expect(result?.avgKcal).toBe(501);
  });

  it('週の範囲外の記録 (前後の週) は平均に含めない', () => {
    const logs = [
      makeLog('2026-07-26', 9999), // 前週の日曜 (範囲外)
      makeLog('2026-07-27', 500),  // 対象週の月曜
      makeLog('2026-08-03', 9999), // 次週の月曜 (範囲外)
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.daysLogged).toBe(1);
    expect(result?.avgKcal).toBe(500);
  });
});

describe('computeWeeklyRecap — avgTargetKcal', () => {
  it('targetCalories が 0 以下なら avgTargetKcal は 0', () => {
    const logs = [makeLog('2026-07-27', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(0), [], undefined, NOW);
    expect(result?.avgTargetKcal).toBe(0);
  });

  it('運動ログが無ければ記録日の平均目標 = targetCalories', () => {
    const logs = [
      makeLog('2026-07-27', 500),
      makeLog('2026-07-28', 500),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.avgTargetKcal).toBe(2000);
  });
});

describe('computeWeeklyRecap — days (バーチャート用)', () => {
  it('月〜日の7日分を常に返す (記録有無に関わらず)', () => {
    const logs = [makeLog('2026-07-27', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.days).toHaveLength(7);
    expect(result?.days.map((d) => d.weekdayLabel)).toEqual(['月', '火', '水', '木', '金', '土', '日']);
  });

  it('記録が無い日は logged=false・kcal=0 になる', () => {
    const logs = [makeLog('2026-07-27', 500)]; // 月曜のみ
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    const monday = result?.days[0];
    const tuesday = result?.days[1];
    expect(monday).toMatchObject({ dateKey: '2026-07-27', logged: true, kcal: 500 });
    expect(tuesday).toMatchObject({ dateKey: '2026-07-28', logged: false, kcal: 0 });
  });

  it('各日の targetKcal は adjustedTargetKcal と一致する (運動ログなしなら targetCalories)', () => {
    const logs = [makeLog('2026-07-27', 500)];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.days[0].targetKcal).toBe(2000);
  });
});

describe('computeWeeklyRecap — macroInsight', () => {
  it('targetCalories が 0 以下なら常に null', () => {
    const logs = [makeLog('2026-07-27', 500, { protein: 200 })]; // 大きく乖離させても
    const result = computeWeeklyRecap(logs, makeProfile(0), [], undefined, NOW);
    expect(result?.macroInsight).toBeNull();
  });

  it('乖離が閾値未満 (15%未満) なら null を返す', () => {
    // target protein = 100g。実測 105g → 5% 乖離のみ
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 105, fat: 50, carbs: 200 }),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight).toBeNull();
  });

  it('乖離が閾値以上 (15%以上) なら direction=more で返す', () => {
    // target protein = 100g。実測 140g → 40% 乖離
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 140, fat: 50, carbs: 200 }),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight).toMatchObject({
      axis: 'protein',
      direction: 'more',
      avgActual: 140,
      avgTarget: 100,
    });
  });

  it('実測が目標を下回れば direction=less', () => {
    // target fat = 50g。実測 30g → -40% 乖離
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 100, fat: 30, carbs: 200 }),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight).toMatchObject({ axis: 'fat', direction: 'less' });
  });

  it('複数軸が閾値を超えたら乖離率が最大の1軸だけを返す', () => {
    // protein: 100→130 (30%乖離) / fat: 50→58 (16%乖離) / carbs: 200→200 (0%)
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 130, fat: 58, carbs: 200 }),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight?.axis).toBe('protein');
  });

  it('3軸とも閾値未満なら null (無理に何も言わない)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 102, fat: 51, carbs: 198 }),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight).toBeNull();
  });
});

describe('computeWeeklyRecap — macroBoost.note (観点A は観点Cに従属)', () => {
  it('最有力候補 (candidates[0]) に nutritionNote があれば note に添える', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // protein less
      makeLog('2026-06-01', 300, {}, 'chicken_lean'), // nutritionNote 有り・高密度
      makeLog('2026-06-02', 300, {}, 'chicken_lean'),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates[0].identityId).toBe('chicken_lean');
    expect(result?.macroBoost?.note).toMatchObject({
      identityId: 'chicken_lean',
      identityLabel: '鶏むね・ささみ',
    });
    expect(result?.macroBoost?.note?.note.text).toContain('鶏むね');
    // 出典は UI に出す前提なので必ず伴う (§10.14 追補-1)
    expect(result?.macroBoost?.note?.note.source.label).toBeTruthy();
  });

  // ノート未設定の食材として dish Identity を使う。ingredient 側は順次ノートが埋まるため、
  // 「ノートが無い」ことを ingredient に依存させるとコンテンツ追加のたびに壊れる。
  it('最有力候補に nutritionNote が無くても、候補内の次点に有れば拾う (候補は3件までまとめて「アドバイス」なので)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // protein less
      makeLog('2026-06-01', 300, {}, 'meat_solo'), // nutritionNotes 無し・最頻出
      makeLog('2026-06-02', 300, {}, 'meat_solo'),
      makeLog('2026-06-03', 300, {}, 'meat_solo'),
      makeLog('2026-06-04', 300, {}, 'egg'), // nutritionNotes 有り・2番手
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates[0].identityId).toBe('meat_solo');
    expect(result?.macroBoost?.note?.identityId).toBe('egg');
  });

  it('候補の誰も nutritionNote を持たなければ note は null', () => {
    // 豆知識が未整備の高たんぱく食材: meat_solo / salad_chicken / seafood_lean / protein_drink / protein_bar / cheese_low_fat
    // (そこにノートを足したらここも差し替えること)。履歴側で4件埋めてカタログ補完を発生させない
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // protein less
      makeLog('2026-06-01', 300, {}, 'meat_solo'),
      makeLog('2026-06-02', 300, {}, 'meat_solo'),
      makeLog('2026-06-03', 300, {}, 'salad_chicken'),
      makeLog('2026-06-04', 300, {}, 'seafood_lean'),
      makeLog('2026-06-05', 300, {}, 'protein_drink'), // 履歴に高密度が4件あれば、カタログ補完なしで履歴だけから3件出る
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates).toHaveLength(3);
    expect(result?.macroBoost?.candidates.every((c) => c.fromHistory)).toBe(true); // 週ローテーションで先頭は変わる
    expect(result?.macroBoost?.note).toBeNull();
  });

  it('同じ週なら何度計算しても同じノートを返す (リカップは週内で不変)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }),
      makeLog('2026-06-01', 300, {}, 'beef_pork'), // 複数ノートを持つ食材
      makeLog('2026-06-02', 300, {}, 'beef_pork'),
    ];
    const a = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    const b = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(a?.macroBoost?.note?.note.text).toBe(b?.macroBoost?.note?.note.text);
  });

  it('週が変われば複数ノートのうち別のものが出うる (再会するたび違う角度)', () => {
    // 表示されるのは補強出典 (alsoSources) のあるノートだけ。natto は2件とも照合済み
    const identity = getIdentity('natto');
    expect((identity?.nutritionNotes ?? []).filter((n) => n.alsoSources?.length).length).toBeGreaterThan(1);

    // 26週分を回して、出てくるノートが1種類に固定されていないことを確かめる
    const seen = new Set<string>();
    for (let w = 0; w < 26; w++) {
      const now = new Date(NOW.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekStart = formatDateKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      const logs = [
        makeLog(weekStart, 2000, { protein: 60, fat: 50, carbs: 200 }),
        makeLog('2026-06-01', 300, {}, 'natto'),
        makeLog('2026-06-02', 300, {}, 'natto'),
      ];
      const r = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, now);
      const text = r?.macroBoost?.note?.note.text;
      if (text) seen.add(text);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('macroBoost 自体が無ければ note も無い (アドバイスに従属するため単独では出ない)', () => {
    const logs = [makeLog('2026-07-27', 2000, { protein: 100, fat: 50, carbs: 200 })]; // 乖離なし
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost).toBeNull();
  });
});

describe('computeWeeklyRecap — macroBoost (観点C: 目標接続型・less方向のみ)', () => {
  it('macroInsight が無ければ null', () => {
    const logs = [makeLog('2026-07-27', 2000, { protein: 100, fat: 50, carbs: 200 })]; // 乖離なし
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight).toBeNull();
    expect(result?.macroBoost).toBeNull();
  });

  it("direction='more' のときは候補が条件を満たしても null (非対称・意図的)", () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 140, fat: 50, carbs: 200 }, 'chicken_lean'), // protein 40%乖離・more
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight?.direction).toBe('more');
    expect(result?.macroBoost).toBeNull();
  });

  it("direction='less' のときは全履歴から高密度な Identity を頻度順に返す (fromHistory: true)", () => {
    const logs = [
      // protein 少なめの週 (direction=less)
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }),
      // 全履歴側: chicken_lean (density 0.876) を2回、egg は defaultMacro 的に低密度
      makeLog('2026-06-01', 300, {}, 'chicken_lean'),
      makeLog('2026-06-02', 300, {}, 'chicken_lean'),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight?.direction).toBe('less');
    expect(result?.macroBoost?.axis).toBe('protein');
    expect(result?.macroBoost?.candidates[0]).toMatchObject({
      identityId: 'chicken_lean',
      label: '鶏むね・ささみ',
      fromHistory: true,
    });
  });

  it('履歴に候補が無くても、全カタログから密度が高い Identity を補う (fromHistory: false) — 最も必要な人に候補ゼロを返さないため', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // less だが identityId 無し (履歴側は空)
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroInsight?.direction).toBe('less');
    expect(result?.macroBoost).not.toBeNull();
    expect(result?.macroBoost?.candidates.length).toBeGreaterThan(0);
    expect(result?.macroBoost?.candidates.every((c) => c.fromHistory === false)).toBe(true);
  });

  it('履歴の候補が MAX_BOOST_CANDIDATES に満たない場合、不足分だけ全カタログから補う (履歴分は優先して残る)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }),
      makeLog('2026-06-01', 300, {}, 'chicken_lean'), // 履歴側は1件のみ
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    const candidates = result?.macroBoost?.candidates ?? [];
    expect(candidates[0]).toMatchObject({ identityId: 'chicken_lean', fromHistory: true });
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.slice(1).every((c) => c.fromHistory === false)).toBe(true);
  });

  it('履歴に4件以上あれば履歴だけから3件、週ごとにローテーションする (毎週同じ3品にしない)', () => {
    const history = [
      makeLog('2026-06-01', 300, {}, 'chicken_lean'),
      makeLog('2026-06-02', 300, {}, 'chicken_lean'),
      makeLog('2026-06-03', 300, {}, 'chicken_lean'),
      makeLog('2026-06-04', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-05', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-06', 300, {}, 'egg'), // density 0.33、単発
      makeLog('2026-06-07', 300, {}, 'tofu'), // density 0.36、単発 (4件目の高密度食材)
    ];
    const lowProtein = { protein: 60, fat: 50, carbs: 200 };
    const thisWeek = computeWeeklyRecap(
      [makeLog('2026-07-27', 2000, lowProtein), ...history], makeProfile(2000), [], undefined, NOW,
    );
    const nextWeek = computeWeeklyRecap(
      [makeLog('2026-08-03', 2000, lowProtein), ...history], makeProfile(2000), [], undefined, new Date('2026-08-10T09:00:00'),
    );
    const a = thisWeek?.macroBoost?.candidates ?? [];
    const b = nextWeek?.macroBoost?.candidates ?? [];
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
    expect(a.every((c) => c.fromHistory)).toBe(true);
    expect(a.map((c) => c.identityId)).not.toEqual(b.map((c) => c.identityId));
  });
});

// ─────────────────────────────────────────────────────────────
// 発見プール (PRD v1.8 §6.7.5)
// ─────────────────────────────────────────────────────────────

const kinds = (r: ReturnType<typeof computeWeeklyRecap>) => (r?.discoveries ?? []).map((d) => d.kind);
/** PFC 目標どおり (乖離なし) の1日。macro の発見を出さずに食材系だけを見るため。 */
const onTarget = { protein: 100, fat: 50, carbs: 200 };

describe('computeWeeklyRecap — いつもとの差', () => {
  it('その前の週の記録日数を返す。0日なら null', () => {
    const withPrev = computeWeeklyRecap(
      [makeLog('2026-07-27', 2000), makeLog('2026-07-20', 2000), makeLog('2026-07-21', 2000)],
      makeProfile(2000), [], undefined, NOW,
    );
    expect(withPrev?.prevWeekDaysLogged).toBe(2);
    const without = computeWeeklyRecap([makeLog('2026-07-27', 2000)], makeProfile(2000), [], undefined, NOW);
    expect(without?.prevWeekDaysLogged).toBeNull();
  });

  it('前4週に7日以上の記録があれば基準平均を出し、±10%以上なら方向を持つ', () => {
    const baseline = Array.from({ length: 8 }, (_, i) => makeLog(formatDateKey(new Date(2026, 6, 1 + i)), 2000));
    const more = computeWeeklyRecap([makeLog('2026-07-27', 2400), ...baseline], makeProfile(2000), [], undefined, NOW);
    expect(more?.baselineAvgKcal).toBe(2000);
    expect(more?.kcalVsUsual).toBe('more');
    const same = computeWeeklyRecap([makeLog('2026-07-27', 2100), ...baseline], makeProfile(2000), [], undefined, NOW);
    expect(same?.kcalVsUsual).toBeNull();
  });

  it('基準の記録日が7日未満なら基準平均は null', () => {
    const r = computeWeeklyRecap(
      [makeLog('2026-07-27', 2400), makeLog('2026-07-20', 2000)], makeProfile(2000), [], undefined, NOW,
    );
    expect(r?.baselineAvgKcal).toBeNull();
    expect(r?.kcalVsUsual).toBeNull();
  });
});

describe('computeWeeklyRecap — 食材の発見', () => {
  it('はじめて記録した食材を newFoods に出す (以前の記録があるユーザーのみ)', () => {
    const r = computeWeeklyRecap(
      [makeLog('2026-07-01', 500, onTarget, 'egg'), makeLog('2026-07-28', 2000, onTarget, 'tofu')],
      makeProfile(2000), [], undefined, NOW,
    );
    const d = r?.discoveries.find((x) => x.kind === 'newFoods');
    expect(d && d.kind === 'newFoods' && d.items.map((i) => i.identityId)).toEqual(['tofu']);
  });

  it('記録をはじめた最初の週は newFoods を出さない (全部が初登場になるため)', () => {
    const r = computeWeeklyRecap([makeLog('2026-07-28', 2000, onTarget, 'tofu')], makeProfile(2000), [], undefined, NOW);
    expect(kinds(r)).not.toContain('newFoods');
  });

  it('28日以上空いた食材を comebackFoods に「◯週ぶり」付きで出す', () => {
    const r = computeWeeklyRecap(
      [makeLog('2026-06-01', 500, onTarget, 'egg'), makeLog('2026-07-10', 500, onTarget, 'tofu'),
        makeLog('2026-07-29', 2000, onTarget, 'egg'), makeLog('2026-07-29', 300, onTarget, 'tofu')],
      makeProfile(2000), [], undefined, NOW,
    );
    const d = r?.discoveries.find((x) => x.kind === 'comebackFoods');
    // egg は 58日ぶり (8週)。tofu は 19日なので対象外。
    expect(d && d.kind === 'comebackFoods' && d.items).toEqual([{ identityId: 'egg', label: getIdentity('egg')!.label, weeksSince: 8 }]);
  });

  it('週内で3回以上の食材を topFood に出す。前週と同じ食材なら休ませる', () => {
    const week = ['2026-07-27', '2026-07-28', '2026-07-29'].map((d) => makeLog(d, 2000, onTarget, 'egg'));
    const fresh = computeWeeklyRecap(week, makeProfile(2000), [], undefined, NOW);
    expect(kinds(fresh)).toContain('topFood');

    const prevWeek = ['2026-07-20', '2026-07-21', '2026-07-22'].map((d) => makeLog(d, 2000, onTarget, 'egg'));
    const repeat = computeWeeklyRecap([...week, ...prevWeek], makeProfile(2000), [], undefined, NOW);
    // 前週も egg がトップ → 休ませる。他に発見が無い (1品しか記録が無く内訳も出せない) ので fallback で出る
    expect(kinds(repeat)).toEqual(['topFood']);
    const withNew = computeWeeklyRecap(
      [...week, ...prevWeek, makeLog('2026-07-30', 300, onTarget, 'tofu')], makeProfile(2000), [], undefined, NOW,
    );
    // はじめての tofu がある週は、休ませた topFood は出さない
    expect(kinds(withNew)).toEqual(['newFoods', 'macroSources']);
  });
});

describe('computeWeeklyRecap — PFC の連続週', () => {
  const lowProtein = { protein: 60, fat: 50, carbs: 200 };
  const weekOf = (monday: string) => makeLog(monday, 2000, lowProtein);
  const newFood = [makeLog('2026-06-01', 300, onTarget, 'egg'), makeLog('2026-07-28', 300, onTarget, 'tofu')];

  it('1週目は streakWeeks=1 で出す', () => {
    const r = computeWeeklyRecap([weekOf('2026-07-27'), ...newFood], makeProfile(2000), [], undefined, NOW);
    const m = r?.discoveries.find((d) => d.kind === 'macro');
    expect(m && m.kind === 'macro' && m.streakWeeks).toBe(1);
  });

  it('2週連続は休ませる (他に発見があれば出さない)', () => {
    const r = computeWeeklyRecap(
      [weekOf('2026-07-27'), weekOf('2026-07-20'), ...newFood], makeProfile(2000), [], undefined, NOW,
    );
    expect(kinds(r)).not.toContain('macro');
  });

  it('3週連続なら streakWeeks=3 で出す (「3週続けて」)', () => {
    const r = computeWeeklyRecap(
      [weekOf('2026-07-27'), weekOf('2026-07-20'), weekOf('2026-07-13'), ...newFood], makeProfile(2000), [], undefined, NOW,
    );
    const m = r?.discoveries.find((d) => d.kind === 'macro');
    expect(m && m.kind === 'macro' && m.streakWeeks).toBe(3);
  });
});

describe('computeWeeklyRecap — 栄養素の内訳 (macroSources) と豆知識', () => {
  it('対象栄養素を Identity 別に合算し、上位3件と割合を出す。1品だけなら出さない', () => {
    // 2026-08-03 週の通し番号でローテーションの軸が決まるので、軸に依らず検証できるよう P/F/C を同じ値にする
    const same = { protein: 30, fat: 30, carbs: 30 };
    const logs = [
      makeLog('2026-07-27', 500, same, 'egg'), makeLog('2026-07-28', 500, same, 'egg'),
      makeLog('2026-07-29', 500, same, 'tofu'), makeLog('2026-07-30', 500, { protein: 10, fat: 10, carbs: 10 }, 'rice'),
    ];
    const r = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    const d = r?.discoveries.find((x) => x.kind === 'macroSources');
    expect(d && d.kind === 'macroSources' && d.sources.map((s) => [s.identityId, s.sharePct])).toEqual([['egg', 60 / 100 * 100], ['tofu', 30], ['rice', 10]]);
    const single = computeWeeklyRecap([makeLog('2026-07-27', 500, same, 'egg')], makeProfile(2000), [], undefined, NOW);
    expect(kinds(single)).not.toContain('macroSources');
  });

  it('食材系の発見には、その食材の豆知識 (出典つき) を添える。無ければ null', () => {
    const withNote = getIdentity('egg')!;
    expect(withNote.nutritionNotes?.length).toBeGreaterThan(0);
    const r = computeWeeklyRecap(
      [makeLog('2026-07-01', 500, onTarget, 'rice'), makeLog('2026-07-28', 2000, onTarget, 'egg')],
      makeProfile(2000), [], undefined, NOW,
    );
    const d = r?.discoveries.find((x) => x.kind === 'newFoods');
    expect(d && d.kind === 'newFoods' && d.note?.identityId).toBe('egg');
    expect(d && d.kind === 'newFoods' && d.note?.note.source.label).toBeTruthy();
  });
});

describe('豆知識データ (nutritionNotes) — 出典必須ルール', () => {
  it('全ての Identity の豆知識が、出典ラベルとURLを持つ (§10.14 追補-1)', () => {
    const withNotes = ALL_IDENTITIES.filter((i) => (i.nutritionNotes?.length ?? 0) > 0);
    expect(withNotes.length).toBeGreaterThan(50);
    for (const identity of withNotes) {
      for (const note of identity.nutritionNotes ?? []) {
        expect(note.text.length).toBeGreaterThan(10);
        expect(note.source.label.length).toBeGreaterThan(0);
        expect(note.source.url ?? '').toMatch(/^https:\/\//);
      }
    }
  });

  it('料理 (dishes) の豆知識は、別系統の補強出典 (alsoSources) を必ず持つ — 単一出典では載せない', () => {
    const dishIds = ['ramen_light', 'ramen_heavy', 'ramen_jiro', 'soba', 'udon', 'tempura_noodle', 'curry_class', 'katsu_curry',
      'katsudon_tendon', 'fried_main', 'teishoku', 'bento', 'nabe', 'sashimi', 'sushi_plate', 'sushi_piece',
      'pasta_tomato', 'pasta_oil', 'pasta_cream', 'pasta_meat', 'pasta_japanese', 'yakitori'];
    for (const id of dishIds) {
      const notes = getIdentity(id)?.nutritionNotes ?? [];
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.alsoSources?.length ?? 0).toBeGreaterThan(0);
        for (const src of n.alsoSources ?? []) expect(src.url ?? '').toMatch(/^https:\/\//);
      }
    }
  });

  it('豆知識の出典は、食塩の話に偏らない (料理の豆知識のうち食塩が主題のものは3割以下)', () => {
    const dishNotes = ALL_IDENTITIES.flatMap((i) => (i.nutritionNotes ?? []).map((n) => ({ id: i.id, text: n.text })))
      .filter((n) => getIdentity(n.id)?.primaryHome.tab === 'dish');
    const salty = dishNotes.filter((n) => /食塩|塩分/.test(n.text));
    expect(dishNotes.length).toBeGreaterThan(20);
    expect(salty.length / dishNotes.length).toBeLessThanOrEqual(0.3);
  });
});

describe('豆知識ゲート — 補強出典の無いノートはユーザーに出さない', () => {
  it('食材の豆知識のうち、照合済み (alsoSources あり) のものが十分な数ある', () => {
    const verified = ALL_IDENTITIES.filter((i) => i.primaryHome.tab !== 'dish')
      .flatMap((i) => (i.nutritionNotes ?? []).filter((n) => n.alsoSources?.length));
    expect(verified.length).toBeGreaterThanOrEqual(25);
  });

  it('補強出典の無いノートしか持たない食材では、豆知識は出ない (例: ごはん)', () => {
    const rice = getIdentity('rice');
    expect((rice?.nutritionNotes ?? []).every((n) => !n.alsoSources?.length)).toBe(true);
    const r = computeWeeklyRecap(
      [makeLog('2026-07-01', 500, onTarget, 'egg'), makeLog('2026-07-28', 2000, onTarget, 'rice')],
      makeProfile(2000), [], undefined, NOW,
    );
    const d = r?.discoveries.find((x) => x.kind === 'newFoods');
    expect(d && d.kind === 'newFoods' && d.note).toBeNull();
  });
});

describe('selectDiscoveries', () => {
  const item = { identityId: 'egg', label: 'たまご' };
  const macro = {
    kind: 'macro' as const,
    insight: { axis: 'protein' as const, direction: 'less' as const, avgActual: 60, avgTarget: 100 },
    streakWeeks: 1,
    boost: null,
  };

  it('枠(3枚)に高スコア順で詰め、表示は物語順に並べ直す', () => {
    const picked = selectDiscoveries([
      { discovery: { kind: 'topFood', item, count: 3, note: null }, score: 0.6, cost: 1 },
      { discovery: macro, score: 0.7, cost: 2 },
      { discovery: { kind: 'newFoods', items: [item], note: null }, score: 0.9, cost: 1 },
      { discovery: { kind: 'comebackFoods', items: [{ ...item, weeksSince: 5 }], note: null }, score: 0.8, cost: 1 },
    ]);
    // newFoods(0.9) → comeback(0.8) → macro(2枚)は入らない → topFood(0.6)
    expect(picked.map((d) => d.kind)).toEqual(['topFood', 'newFoods', 'comebackFoods']);
  });

  it('休ませる候補しか無ければ、それを使う', () => {
    const picked = selectDiscoveries([{ discovery: macro, score: 0.05, cost: 1 }]);
    expect(picked.map((d) => d.kind)).toEqual(['macro']);
  });
});
