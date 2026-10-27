/**
 * ユーザーが削除したヘルス由来の運動ログを、次の同期で取り込み直さないための照合。
 *
 * 同期は「healthSyncId が手元に無いワークアウト = 未取込」と判定するため、削除しただけだと
 * 次の同期 (起動時・5分以上空けた復帰時) で同じワークアウトが復活し、消費カロリーに再び加算される。
 * 削除時に印を残し、取込時にここで弾く。ネイティブモジュールに依存しない純粋関数。
 */
import type { DeletedHealthWorkout, ExerciseLog } from '@/types/nutrition';

/**
 * ID が違っても同じワークアウトとみなす開始時刻の許容差。種別と長さ (分) も同じことを条件にするので、
 * 秒の丸め程度のずれだけを吸収できればよい。
 * ここを広げると、ヘルス側で直されたワークアウト (時間・開始がずれる) まで「削除済み」と誤判定して
 * 取り込まなくなる。そうなると画面には何も出ず、消費kcalが少ないままになるので広げない。
 */
const START_TOLERANCE_MS = 60 * 1000;

/**
 * 印の保持日数。同期は直近7日 (HEALTH_SYNC_RANGE_DAYS) しか読まないので、それより古い印は
 * 照合に使われない。端末時刻のずれ等の余裕を見て長めに持ち、溜まり続けないよう刈る。
 */
const RETENTION_DAYS = 30;

/** 削除する運動ログから印を作る。ヘルス由来でなければ null (手動ログは同期で戻らない) */
export function toDeletedHealthWorkout(log: ExerciseLog): DeletedHealthWorkout | null {
  if (log.source !== 'health' || !log.healthSyncId) return null;
  return {
    healthSyncId: log.healthSyncId,
    date: log.date,
    exerciseType: log.exerciseType,
    timestamp: log.timestamp,
    minutes: log.minutes,
  };
}

/** 同期で届いたワークアウトが、ユーザーが削除したものか */
export function isDeletedHealthWorkout(
  deleted: readonly DeletedHealthWorkout[],
  workout: { healthSyncId: string; exerciseTypeKey: string; startedAt: string; minutes: number }
): boolean {
  const startMs = new Date(workout.startedAt).getTime();
  return deleted.some((d) => {
    if (d.healthSyncId === workout.healthSyncId) return true;
    // ID が違うときは、種別・開始・長さがすべて同じ場合だけ同じワークアウトとみなす
    if (d.exerciseType !== workout.exerciseTypeKey || d.minutes !== workout.minutes) return false;
    const t = new Date(d.timestamp).getTime();
    if (!Number.isFinite(t) || !Number.isFinite(startMs)) return false;
    return Math.abs(t - startMs) <= START_TOLERANCE_MS;
  });
}

/** 保持期間を過ぎた印を落とす。変化が無ければ同じ配列を返す */
export function pruneDeletedHealthWorkouts(
  deleted: readonly DeletedHealthWorkout[],
  now: Date
): readonly DeletedHealthWorkout[] {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const next = deleted.filter((d) => {
    const t = new Date(d.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  return next.length === deleted.length ? deleted : next;
}
