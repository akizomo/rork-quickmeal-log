import {
  type PendingEvent,
  MAX_PENDING_EVENTS,
  daysSince,
  isForbiddenPropKey,
  pushPending,
  sanitizeProps,
  screenNameFromPathname,
} from './analytics-core';

describe('isForbiddenPropKey', () => {
  it.each([
    'weight', 'weight_kg', 'kcal', 'goal_value', 'food_name', 'query', 'identity_id', 'amount_label',
    'height_cm', 'age', 'bmi', 'email',
  ])('%s は載せられない', (key) => {
    expect(isForbiddenPropKey(key)).toBe(true);
  });

  it.each(['screen', 'source', 'tab', 'is_first', 'had_hints', 'landed_layer1', 'count', 'plan', 'duration_s', 'placement', 'result', 'step'])(
    '%s は載せてよい',
    (key) => {
      expect(isForbiddenPropKey(key)).toBe(false);
    },
  );

  it('語の一部が一致しただけでは禁止しない (page は age ではない)', () => {
    expect(isForbiddenPropKey('page')).toBe(false);
    expect(isForbiddenPropKey('message_count')).toBe(false);
  });
});

describe('sanitizeProps', () => {
  it('区分値・数値・真偽値を残す', () => {
    const { props, dropped } = sanitizeProps({ source: 'frequent_pinned', is_first: true, count: 3 });
    expect(props).toEqual({ source: 'frequent_pinned', is_first: true, count: 3 });
    expect(dropped).toEqual([]);
  });

  it('禁止キーは値が何であれ落とす', () => {
    const { props, dropped } = sanitizeProps({ source: 'search', weight_kg: 60.5, food_name: 'rice' });
    expect(props).toEqual({ source: 'search' });
    expect(dropped.sort()).toEqual(['food_name', 'weight_kg']);
  });

  it('自由入力らしい文字列 (日本語・空白・長文) は落とす', () => {
    const { props, dropped } = sanitizeProps({ tab: 'おにぎり', step: 'a b', screen: 'x'.repeat(40) });
    expect(props).toEqual({});
    expect(dropped.sort()).toEqual(['screen', 'step', 'tab']);
  });

  it('undefined は黙って捨て、NaN とオブジェクトは落とす', () => {
    const { props, dropped } = sanitizeProps({ tab: undefined, count: NaN, obj: { a: 1 } as unknown });
    expect(props).toEqual({});
    expect(dropped.sort()).toEqual(['count', 'obj']);
  });

  it('入力が無ければ空', () => {
    expect(sanitizeProps(undefined)).toEqual({ props: {}, dropped: [] });
  });
});

describe('screenNameFromPathname', () => {
  it('ルートはホーム', () => {
    expect(screenNameFromPathname('/')).toBe('home');
    expect(screenNameFromPathname('/?x=1')).toBe('home');
  });

  it('クエリとハッシュを捨てる (検索語・食品名を載せない)', () => {
    expect(screenNameFromPathname('/search?q=%E3%81%94%E3%81%AF%E3%82%93#x')).toBe('search');
  });

  it('動的セグメントは :id にする', () => {
    expect(screenNameFromPathname('/my-food-edit/123')).toBe('my-food-edit/:id');
    expect(screenNameFromPathname('/x/3f2a9c1e-77ab-4c0d')).toBe('x/:id');
  });

  it('日本語などの安全でないセグメントは :id にする', () => {
    expect(screenNameFromPathname('/foods/ごはん')).toBe('foods/:id');
  });

  it('/dev と /spike は送らない', () => {
    expect(screenNameFromPathname('/dev/diagnostics')).toBeNull();
    expect(screenNameFromPathname('/spike/foo')).toBeNull();
  });

  it('null / undefined は null', () => {
    expect(screenNameFromPathname(null)).toBeNull();
    expect(screenNameFromPathname(undefined)).toBeNull();
  });
});

describe('daysSince', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('日数を切り捨てる', () => {
    expect(daysSince('2026-11-04T09:00:00Z', now)).toBe(6);
    expect(daysSince('2026-11-10T00:00:00Z', now)).toBe(0);
  });
  it('不正・未来・未設定は 0', () => {
    expect(daysSince(undefined, now)).toBe(0);
    expect(daysSince('not-a-date', now)).toBe(0);
    expect(daysSince('2027-01-01T00:00:00Z', now)).toBe(0);
  });
});

describe('pushPending', () => {
  it('上限を超えたら古いものから捨てる', () => {
    let q: PendingEvent[] = [];
    for (let i = 0; i < MAX_PENDING_EVENTS + 5; i++) q = pushPending(q, { name: `e${i}`, props: {} });
    expect(q).toHaveLength(MAX_PENDING_EVENTS);
    expect(q[0].name).toBe('e5');
    expect(q[q.length - 1].name).toBe(`e${MAX_PENDING_EVENTS + 4}`);
  });
});
