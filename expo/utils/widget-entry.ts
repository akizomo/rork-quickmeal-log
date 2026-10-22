/**
 * ウィジェットのボタン ID → 記録する Identity ID。
 *
 * ウィジェットのボタンは、アプリ同期前の既定ボタンや履歴に Identity の無い項目では
 * バケットキー ('staple' 等) を ID として送ってくる。旧実装はこれを旧カテゴリ記録
 * (quickLog) に流して Identity を持たない旧形式ログを作っていた。ホームのバケット
 * ボタンの 1 タップ (QuickLogSection) と同じく、バケット先頭の Identity で記録する。
 * 解決できない ID は null (記録しない)。
 */

import { getIdentity } from '@/constants/identity';

export function resolveWidgetEntryIdentityId(
  categoryId: string,
  identitiesByBucket: Record<string, readonly { id: string }[] | undefined>,
): string | null {
  if (getIdentity(categoryId)) return categoryId;
  return identitiesByBucket[categoryId]?.[0]?.id ?? null;
}
