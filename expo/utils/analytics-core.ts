/**
 * analytics-core.ts — 利用状況イベントの純ロジック (KPI計装 Layer 2)。
 *
 * 副作用なし・ベンダー非依存。送信口 (PostHog) は utils/analytics.ts に分けてあり、
 * ここは「載せてはいけないものを落とす」「画面名を作る」「同意が決まるまで溜める」だけを持つ。
 * 設計は docs/ANALYTICS.md。
 */

import type { AnalyticsProps } from '@/types/analytics';

/**
 * props のキーとして使えない語 (単語単位。`snake_case` を `_` で割って判定)。
 * 型 (AnalyticsEventMap) で閉じてあるが、型を迂回した追加への最後の砦。
 * docs/ANALYTICS.md §3: 数値・食事の中身・自由入力は載せない。
 */
export const FORBIDDEN_PROP_WORDS: readonly string[] = [
  'weight', 'kg', 'kcal', 'calorie', 'calories', 'protein', 'fat', 'carb', 'carbs', 'macro',
  'height', 'age', 'birth', 'gender', 'sex', 'bmi',
  'goal', 'target', 'name', 'label', 'query', 'text', 'note', 'memo', 'comment',
  'food', 'identity', 'email', 'phone', 'amount',
];

/** 文字列 props の上限長。長い文字列は自由入力の疑いがあるので捨てる。 */
export const MAX_STRING_PROP_LENGTH = 32;

/** 文字列 props に使える文字 (区分値のみ)。日本語・空白・記号の混じる文章は通さない。 */
const SAFE_STRING = /^[A-Za-z0-9_:\-./]+$/;

export function isForbiddenPropKey(key: string): boolean {
  const words = key.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => FORBIDDEN_PROP_WORDS.includes(w));
}

export interface SanitizeResult {
  props: AnalyticsProps;
  /** 落としたキー (開発時の警告・テスト用)。 */
  dropped: string[];
}

/** 送ってよい形だけを残す。 */
export function sanitizeProps(input: Record<string, unknown> | undefined): SanitizeResult {
  const props: AnalyticsProps = {};
  const dropped: string[] = [];
  if (!input) return { props, dropped };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (isForbiddenPropKey(key)) {
      dropped.push(key);
      continue;
    }
    if (typeof value === 'boolean') {
      props[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      props[key] = value;
    } else if (typeof value === 'string' && value.length <= MAX_STRING_PROP_LENGTH && SAFE_STRING.test(value)) {
      props[key] = value;
    } else {
      dropped.push(key);
    }
  }
  return { props, dropped };
}

/**
 * ルートのパスから送ってよい画面名を作る。
 * - クエリ・ハッシュは捨てる (食品名などが入りうる)
 * - 動的セグメント (数字・長い ID) は `:id` に置き換える
 * - 開発者用の `/dev` 配下は null (送らない)
 */
export function screenNameFromPathname(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const path = pathname.split(/[?#]/)[0].trim().toLowerCase();
  if (path === '' || path === '/') return 'home';
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) || /^[0-9a-f-]{12,}$/.test(s) || !SAFE_STRING.test(s) ? ':id' : s));
  if (segments[0] === 'dev' || segments[0] === 'spike') return null;
  return segments.join('/').slice(0, MAX_STRING_PROP_LENGTH);
}

/** 導入からの日数 (同意した日を 0)。不正な値は 0。 */
export function daysSince(firstSeenISO: string | undefined, now: Date): number {
  if (!firstSeenISO) return 0;
  const t = Date.parse(firstSeenISO);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** 同意が決まる前のイベントを溜めておく上限。超えたら古いものから捨てる。 */
export const MAX_PENDING_EVENTS = 50;

export interface PendingEvent {
  name: string;
  props: AnalyticsProps;
}

export function pushPending(queue: PendingEvent[], event: PendingEvent): PendingEvent[] {
  const next = [...queue, event];
  return next.length > MAX_PENDING_EVENTS ? next.slice(next.length - MAX_PENDING_EVENTS) : next;
}
