import type { FoodLog } from '@/types/nutrition';
import { getLogAmountSummary } from './log-display';

function log(identityId: string | undefined, amountValue?: number, extra: Partial<FoodLog> = {}): FoodLog {
  return {
    id: 'l1',
    date: '2026-11-10',
    timestamp: '2026-11-10T12:00:00.000Z',
    mode: 'ingredient',
    categoryKey: 'x',
    categoryLabel: 'x',
    identityId,
    amountValue,
    ...extra,
  } as FoodLog;
}

describe('getLogAmountSummary (記録トーストの量)', () => {
  it('g: 名前のあるチップに当たれば数値に添える', () => {
    expect(getLogAmountSummary(log('rice', 150))).toBe('150g（普通）');
    expect(getLogAmountSummary(log('rice', 220))).toBe('220g（大）');
  });

  it('量が未指定なら既定の量で出す', () => {
    expect(getLogAmountSummary(log('rice'))).toBe('150g（普通）');
  });

  it('g: チップに当たらない量は数値だけ', () => {
    expect(getLogAmountSummary(log('rice', 180))).toBe('180g');
  });

  it('g: 数字だけのチップや数値を含むチップは添えない (同じことを2回言わない)', () => {
    expect(getLogAmountSummary(log('chicken_lean', 150))).toBe('150g');
    expect(getLogAmountSummary(log('noodle_pasta', 80))).toBe('80g');
  });

  it('数え物: チップ名がそのまま量なのでチップ名だけ', () => {
    expect(getLogAmountSummary(log('tofu', 0.5))).toBe('半丁');
    expect(getLogAmountSummary(log('tofu', 2))).toBe('2丁');
  });

  it('%: 意味のあるチップ名で出す', () => {
    expect(getLogAmountSummary(log('protein_drink', 100))).toBe('P15 (200ml)');
  });

  it('英語は単位の前に空白、括弧は半角', () => {
    expect(getLogAmountSummary(log('rice', 180), 'en-US')).toBe('180 g');
  });

  it('Identity の無い旧ログで量の手がかりも無ければ undefined', () => {
    expect(getLogAmountSummary(log(undefined))).toBeUndefined();
    expect(getLogAmountSummary(log(undefined, undefined, { amountLabel: '1杯' }))).toBe('1杯');
  });
});
