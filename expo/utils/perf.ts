import { Sentry } from '@/utils/sentry';

/**
 * SLO 計測ユーティリティ。
 *
 * Sentry の DSN が未設定でも **完全に no-op** で安全に動く (初期化前/Web 含む)。
 * 各計測は Sentry の span として送られ、ダッシュボードで p50/p95 を集計できる。
 * 対応する SLO 定義は `docs/SLO.md` を参照。
 *
 * 使い方:
 *   const result = await measureAsync('health.sync', async (span) => {
 *     ...
 *     span.setTag('result.workouts', n);
 *     return value;
 *   });
 */

export type PerfSpan = {
  setTag: (key: string, value: string | number | boolean) => void;
  setData: (key: string, value: unknown) => void;
};

const noopSpan: PerfSpan = {
  setTag: () => undefined,
  setData: () => undefined,
};

function startSpan(op: string, name: string): { span: PerfSpan; finish: (status?: 'ok' | 'error') => void } {
  // Sentry.startInactiveSpan は SDK 未初期化時 undefined を返しうる。
  try {
    const native = (Sentry as unknown as {
      startInactiveSpan?: (ctx: { op: string; name: string }) => unknown;
    }).startInactiveSpan?.({ op, name });
    if (!native) return { span: noopSpan, finish: () => undefined };
    const s = native as {
      setAttribute?: (k: string, v: unknown) => void;
      setStatus?: (s: { code: number }) => void;
      end?: () => void;
    };
    const span: PerfSpan = {
      setTag: (k, v) => s.setAttribute?.(k, v),
      setData: (k, v) => s.setAttribute?.(k, v),
    };
    return {
      span,
      finish: (status) => {
        // 1 = OK, 2 = ERROR (Sentry span status codes)
        if (status) s.setStatus?.({ code: status === 'ok' ? 1 : 2 });
        s.end?.();
      },
    };
  } catch {
    return { span: noopSpan, finish: () => undefined };
  }
}

/**
 * 非同期処理の所要時間と成否を span として計測する。
 * 例外は span を error で閉じてから再 throw する (呼び出し側のハンドリングは不変)。
 */
export async function measureAsync<T>(
  name: string,
  fn: (span: PerfSpan) => Promise<T>,
  op = 'app.task'
): Promise<T> {
  const { span, finish } = startSpan(op, name);
  try {
    const out = await fn(span);
    finish('ok');
    return out;
  } catch (err) {
    span.setTag('error', true);
    finish('error');
    throw err;
  }
}

/**
 * 同期処理 (主に起動 TTI など) を計測する軽量版。
 * 終了タイミングを呼び出し側が制御したいケース向けに span ハンドルを返す。
 */
export function beginSpan(name: string, op = 'app.task'): { span: PerfSpan; end: (status?: 'ok' | 'error') => void } {
  const { span, finish } = startSpan(op, name);
  return { span, end: finish };
}
