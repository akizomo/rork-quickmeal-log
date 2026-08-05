/**
 * Tests for weekly-recap.ts — 週次振り返り (C レーン) の純ロジック。
 *
 * Pure-logic layer, Node environment (no React Native APIs).
 * Run: cd expo && bun test weekly-recap
 */

import { computeWeeklyRecap } from './weekly-recap';
import type { FoodLog, UserProfile } from '@/types/nutrition';

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
    expect(result?.macroBoost?.note?.note).toContain('鶏むね');
  });

  it('最有力候補に nutritionNote が無くても、候補内の次点に有れば拾う (候補は3件までまとめて「アドバイス」なので)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // protein less
      makeLog('2026-06-01', 300, {}, 'chicken_thigh'), // nutritionNote 無し・最頻出
      makeLog('2026-06-02', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-03', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-04', 300, {}, 'egg'), // nutritionNote 有り・2番手
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates[0].identityId).toBe('chicken_thigh');
    expect(result?.macroBoost?.note?.identityId).toBe('egg');
  });

  it('候補の誰も nutritionNote を持たなければ note は null', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }), // protein less
      makeLog('2026-06-01', 300, {}, 'chicken_thigh'), // nutritionNote 無し
      makeLog('2026-06-02', 300, {}, 'chicken_thigh'),
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates[0].identityId).toBe('chicken_thigh');
    expect(result?.macroBoost?.note).toBeNull();
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

  it('候補は最大3件まで頻度順 (4件以上の高密度食材があっても上位3件に切り詰める)', () => {
    const logs = [
      makeLog('2026-07-27', 2000, { protein: 60, fat: 50, carbs: 200 }),
      makeLog('2026-06-01', 300, {}, 'chicken_lean'),
      makeLog('2026-06-02', 300, {}, 'chicken_lean'),
      makeLog('2026-06-03', 300, {}, 'chicken_lean'),
      makeLog('2026-06-04', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-05', 300, {}, 'chicken_thigh'),
      makeLog('2026-06-06', 300, {}, 'egg'), // density 0.33、単発
      makeLog('2026-06-07', 300, {}, 'tofu'), // density 0.36、単発 (4件目の高密度食材)
    ];
    const result = computeWeeklyRecap(logs, makeProfile(2000), [], undefined, NOW);
    expect(result?.macroBoost?.candidates).toHaveLength(3);
    expect(result?.macroBoost?.candidates[0].identityId).toBe('chicken_lean');
    expect(result?.macroBoost?.candidates[1].identityId).toBe('chicken_thigh');
  });
});
