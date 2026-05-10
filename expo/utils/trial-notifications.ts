/**
 * Trial expiry local notification utility.
 *
 * 7日間トライアル終了の48時間前 (= 開始から5日後) にローカル通知を1回発火する。
 * 文言は中立トーンで「だまし討ち感」を回避 (PRD §6.1 準拠)。
 *
 * 設計判断:
 *   - expo-notifications を使用 (要 `bun add expo-notifications`)。
 *     未インストール環境でも TS / runtime ともに壊れないよう、dynamic require
 *     で参照し、無ければ no-op になる。
 *   - 通知許諾は paywall 購入完了直後のフォアグラウンドタイミングで取得 (文脈一致)。
 *   - schedule ID は固定 (`hachibu_trial_expiry`) — 既存通知を上書きする想定。
 *   - subscriptionStatus が active/cancelled に変わった時はキャンセル必要 (呼び出し側で対応)。
 *
 * 現状: expo-notifications 未インストール時は console.log のみで no-op。
 * 後追いタスク: `bun add expo-notifications` 実行 + Android 通知チャネル設定。
 */

const TRIAL_NOTIFY_SCHEDULE_ID = 'hachibu_trial_expiry';
const TRIAL_NOTIFY_CHANNEL_ID = 'trial_expiry';

/** トライアル終了 48時間前のタイミング (= 開始から5日後) を返す。 */
function calcNotifyDate(trialStartedAtISO: string, trialDays = 7): Date {
  const start = new Date(trialStartedAtISO);
  // 終了 48h 前 = 開始 + (trialDays - 2) 日
  const target = new Date(start.getTime() + (trialDays - 2) * 24 * 60 * 60 * 1000);
  return target;
}

/**
 * expo-notifications の動的読み込み。
 * 未インストール時は null を返し、呼び出し側は安全に no-op になる。
 */
function loadNotificationsModule(): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

/**
 * 通知許諾を要求する。許諾されれば true。
 * iOS では provisional 許諾も true 扱い。
 */
export async function requestTrialNotificationPermission(): Promise<boolean> {
  const N = loadNotificationsModule() as
    | {
        getPermissionsAsync: () => Promise<{ status: string; granted?: boolean }>;
        requestPermissionsAsync: () => Promise<{ status: string; granted?: boolean }>;
      }
    | null;
  if (!N) {
    console.log('[trial-notify] expo-notifications not installed; skipping permission request');
    return false;
  }
  try {
    const existing = await N.getPermissionsAsync();
    if (existing.granted || existing.status === 'granted') return true;
    const result = await N.requestPermissionsAsync();
    return result.granted || result.status === 'granted';
  } catch (e) {
    console.log('[trial-notify] permission request failed', e);
    return false;
  }
}

/**
 * トライアル終了 48時間前にローカル通知をスケジュールする。
 * 既存スケジュールがあれば上書き (cancel + schedule)。
 */
export async function scheduleTrialExpiryNotification(
  trialStartedAtISO: string,
  trialDays = 7
): Promise<void> {
  const N = loadNotificationsModule() as
    | {
        cancelScheduledNotificationAsync: (id: string) => Promise<void>;
        scheduleNotificationAsync: (cfg: {
          identifier?: string;
          content: { title: string; body: string };
          trigger: { date: Date } | { type: string; date: Date };
        }) => Promise<string>;
        setNotificationChannelAsync?: (
          id: string,
          cfg: { name: string; importance: number }
        ) => Promise<unknown>;
      }
    | null;
  if (!N) {
    console.log('[trial-notify] expo-notifications not installed; skipping schedule');
    return;
  }
  const fireAt = calcNotifyDate(trialStartedAtISO, trialDays);
  // 既に過ぎたタイミングならスケジュールしない
  if (fireAt.getTime() <= Date.now()) {
    console.log('[trial-notify] target time already passed; not scheduling', fireAt.toISOString());
    return;
  }
  try {
    // Android: チャネル登録 (初回のみ。既存ならno-op)
    if (N.setNotificationChannelAsync) {
      await N.setNotificationChannelAsync(TRIAL_NOTIFY_CHANNEL_ID, {
        name: 'トライアル終了のお知らせ',
        importance: 4, // DEFAULT
      }).catch(() => undefined);
    }
    // 既存通知を念のためキャンセル
    await N.cancelScheduledNotificationAsync(TRIAL_NOTIFY_SCHEDULE_ID).catch(() => undefined);
    // schedule
    await N.scheduleNotificationAsync({
      identifier: TRIAL_NOTIFY_SCHEDULE_ID,
      content: {
        title: 'Hachibu トライアル残り2日',
        body: '7日間の無料体験はあと2日で終了します。継続される場合は何もしなくてOK、解約は Google Play から。',
      },
      trigger: { date: fireAt },
    });
    console.log('[trial-notify] scheduled for', fireAt.toISOString());
  } catch (e) {
    console.log('[trial-notify] schedule failed', e);
  }
}

/**
 * トライアル終了通知をキャンセル (本登録 / 解約 / 復元成功時に呼ぶ)。
 */
export async function cancelTrialExpiryNotification(): Promise<void> {
  const N = loadNotificationsModule() as
    | {
        cancelScheduledNotificationAsync: (id: string) => Promise<void>;
      }
    | null;
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(TRIAL_NOTIFY_SCHEDULE_ID);
    console.log('[trial-notify] cancelled');
  } catch (e) {
    console.log('[trial-notify] cancel failed', e);
  }
}

// ---------------------------------------------------------------------------
// Pure helper: trial 残り日数計算 (UI で使用)
// ---------------------------------------------------------------------------

/**
 * トライアル残り日数 (整数、最低0)。
 * trial 開始日から trialDays 日後を期限とし、現在から期限までの残日数 (繰り上げ) を返す。
 *
 * 使用例:
 *   - 0日: 今日終了 / 既に終了
 *   - 1日: 残り1日 (24h以内に切り替わる)
 *   - 7日: 開始直後
 */
export function calcTrialRemainingDays(
  trialStartedAtISO: string | null | undefined,
  trialDays = 7,
  now: Date = new Date()
): number | null {
  if (!trialStartedAtISO) return null;
  const start = new Date(trialStartedAtISO);
  if (Number.isNaN(start.getTime())) return null;
  const expiresAt = new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const remainMs = expiresAt.getTime() - now.getTime();
  if (remainMs <= 0) return 0;
  return Math.ceil(remainMs / (24 * 60 * 60 * 1000));
}
