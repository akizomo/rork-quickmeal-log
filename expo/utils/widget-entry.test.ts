import { buildRegistry } from '@/constants/identity';
import { resolveWidgetEntryIdentityId } from './widget-entry';

describe('resolveWidgetEntryIdentityId', () => {
  const byBucket: Record<string, { id: string }[]> = buildRegistry('ja', 'ja').byBucket;

  it('Identity ID はそのまま記録先になる', () => {
    expect(resolveWidgetEntryIdentityId('egg', byBucket)).toBe('egg');
  });

  it('ウィジェット既定ボタンのバケットキー (全9個) はバケット先頭の Identity になる', () => {
    const buckets = ['staple', 'lean_protein', 'egg', 'fatty_protein', 'dairy_soy', 'veggies', 'fruit', 'added_fat', 'snack_drink'];
    for (const b of buckets) {
      const id = resolveWidgetEntryIdentityId(b, byBucket);
      expect(id).toBe(byBucket[b]?.[0]?.id);
      expect(id).not.toBeNull();
    }
  });

  it('解決できない ID は記録しない (旧形式ログを作らない)', () => {
    expect(resolveWidgetEntryIdentityId('unknown_thing', byBucket)).toBeNull();
  });
});
