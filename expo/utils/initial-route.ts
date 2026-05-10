import type { AppSettings } from '@/types/nutrition';
import { INTRO_VERSION } from '@/constants/onboarding';

export type InitialRoute = 'home' | 'intro' | 'onboarding' | 'paywall';

/**
 * 起動直後のリダイレクト先を決定する純粋関数。
 *
 * 不変条件:
 *   - onboardingCompleted=true のユーザーは intro を二度と見ない
 *     (INTRO_VERSION が bump されても影響を受けない)
 *   - 新規ユーザーは intro → onboarding → paywall → home の順で進む
 *   - **強制課金型** (PRD §6.1): 未課金/未トライアルのユーザーは毎回 paywall に戻される。
 *     paywallSeenAtISO によるスキップ動線は撤廃済み (旧フリーミアム想定の遺物)。
 */
export function decideInitialRoute(settings: AppSettings): InitialRoute {
  const onboardingDone = settings.onboardingCompleted === true;

  // 既存ユーザー (onboarding 完了済み) は intro を絶対に見ない
  if (!onboardingDone) {
    const introSeen = (settings.introSeenVersion ?? 0) >= INTRO_VERSION;
    if (!introSeen) return 'intro';
    return 'onboarding';
  }

  // 強制課金: trialing or active 以外は必ず paywall
  const paid =
    settings.subscriptionStatus === 'active' ||
    settings.subscriptionStatus === 'trialing';
  if (!paid) return 'paywall';

  return 'home';
}
