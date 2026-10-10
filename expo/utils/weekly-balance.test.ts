/**
 * Tests for weekly-balance.ts — 今週の収支を合わせる (PRD §6.4.5).
 * Run: cd expo && bun test weekly-balance
 */

import { CARRYOVER_HARD_FLOOR_KCAL } from './goals';
import { computeWeeklyBalance, isWeeklyBalanceWorthProposing, type WeeklyBalanceDay } from './weekly-balance';

const day = (dateKey: string, consumedKcal: number, targetKcal = 2000): WeeklyBalanceDay => ({ dateKey, consumedKcal, targetKcal });

describe('computeWeeklyBalance', () => {
  it('spreads an overage across the remaining days (PRD acceptance: +600 by Wed → −150 on Thu)', () => {
    const past = [day('2026-10-05', 2200), day('2026-10-06', 2200), day('2026-10-07', 2200)];
    const b = computeWeeklyBalance(past, 4, 2000, 2000, 'male_basis');
    expect(b.balanceKcal).toBe(600);
    expect(b.countedDays).toBe(3);
    expect(b.todayAdjustmentKcal).toBe(-150);
    expect(b.limitedBy).toBe('none');
  });

  it('gives back room after lighter days', () => {
    const past = [day('2026-10-05', 1800), day('2026-10-06', 1850)];
    const b = computeWeeklyBalance(past, 5, 2000, 2000, 'female_basis');
    expect(b.balanceKcal).toBe(-350);
    expect(b.todayAdjustmentKcal).toBe(70);
  });

  it('offsets over and under days against each other', () => {
    const past = [day('2026-10-05', 2500), day('2026-10-06', 1500)];
    expect(computeWeeklyBalance(past, 5, 2000, 2000, null).todayAdjustmentKcal).toBe(0);
  });

  it('excludes unlogged days so a forgotten day does not count as a light day', () => {
    const past = [day('2026-10-05', 2300), day('2026-10-06', 0), day('2026-10-07', 2300)];
    const b = computeWeeklyBalance(past, 4, 2000, 2000, null);
    expect(b.countedDays).toBe(2);
    expect(b.balanceKcal).toBe(600);
  });

  it('caps room on the lighter side at 15% of the base goal', () => {
    // 2日記録しかなく、どちらも大幅に少ない (つけ忘れの可能性)
    const past = [day('2026-10-05', 800), day('2026-10-06', 900)];
    const b = computeWeeklyBalance(past, 2, 2000, 2000, null);
    expect(b.todayAdjustmentKcal).toBe(300);
    expect(b.limitedBy).toBe('creditCap');
  });

  it('never pushes today below the hard floor', () => {
    const past = [day('2026-10-10', 4000, 1400)];
    const b = computeWeeklyBalance(past, 1, 1400, 1400, 'female_basis');
    expect(1400 + b.todayAdjustmentKcal).toBe(CARRYOVER_HARD_FLOOR_KCAL);
    expect(b.limitedBy).toBe('floor');
    expect(b.verdict).toBe('soft');
  });

  it('flags the soft floor without blocking', () => {
    const past = [day('2026-10-05', 2300, 1500), day('2026-10-06', 2300, 1500)];
    const b = computeWeeklyBalance(past, 5, 1500, 1500, 'male_basis');
    expect(b.todayAdjustmentKcal).toBe(-320);
    expect(b.limitedBy).toBe('none');
    expect(b.verdict).toBe('soft');
  });

  it('is zero on Monday (no past days) and when goals are unset', () => {
    expect(computeWeeklyBalance([], 7, 2000, 2000, null).todayAdjustmentKcal).toBe(0);
    expect(computeWeeklyBalance([day('2026-10-05', 3000)], 6, 0, 0, null).todayAdjustmentKcal).toBe(0);
  });
});

describe('isWeeklyBalanceWorthProposing', () => {
  it('proposes in both directions past 15% of the base goal', () => {
    expect(isWeeklyBalanceWorthProposing(301, 2000)).toBe(true);
    expect(isWeeklyBalanceWorthProposing(-301, 2000)).toBe(true);
    expect(isWeeklyBalanceWorthProposing(300, 2000)).toBe(false);
    expect(isWeeklyBalanceWorthProposing(500, 0)).toBe(false);
  });
});
