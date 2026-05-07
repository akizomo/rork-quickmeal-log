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
 */
export function decideInitialRoute(settings: AppSettings): InitialRoute {
  const onboardingDone = settings.onboardingCompleted === true;

  // 既存ユーザー (onboarding 完了済み) は intro を絶対に見ない
  if (!onboardingDone) {
    const introSeen = (settings.introSeenVersion ?? 0) >= INTRO_VERSION;
    if (!introSeen) return 'intro';
    return 'onboarding';
  }

  const paid =
    settings.subscriptionStatus === 'active' ||
    settings.subscriptionStatus === 'trialing';
  const paywallSeen = settings.paywallSeenAtISO != null;
  if (!paid && !paywallSeen) return 'paywall';

  return 'home';
}
