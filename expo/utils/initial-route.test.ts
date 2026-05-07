import { decideInitialRoute } from './initial-route';
import { defaultSettings } from '@/constants/nutrition-data';
import { INTRO_VERSION } from '@/constants/onboarding';
import type { AppSettings } from '@/types/nutrition';

const make = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...defaultSettings,
  introSeenVersion: 0,
  onboardingCompleted: false,
  subscriptionStatus: 'none',
  paywallSeenAtISO: null,
  ...overrides,
});

describe('decideInitialRoute', () => {
  it('新規ユーザーは intro へ', () => {
    expect(decideInitialRoute(make())).toBe('intro');
  });

  it('intro 完了 → onboarding 未了 は onboarding へ', () => {
    expect(decideInitialRoute(make({ introSeenVersion: INTRO_VERSION }))).toBe('onboarding');
  });

  it('onboarding 完了 + paywall 未表示 + 未課金 は paywall へ', () => {
    expect(
      decideInitialRoute(
        make({ introSeenVersion: INTRO_VERSION, onboardingCompleted: true })
      )
    ).toBe('paywall');
  });

  it('onboarding 完了 + 課金中 は home へ', () => {
    expect(
      decideInitialRoute(
        make({
          introSeenVersion: INTRO_VERSION,
          onboardingCompleted: true,
          subscriptionStatus: 'active',
        })
      )
    ).toBe('home');
  });

  it('onboarding 完了 + trial 中 は home へ', () => {
    expect(
      decideInitialRoute(
        make({
          introSeenVersion: INTRO_VERSION,
          onboardingCompleted: true,
          subscriptionStatus: 'trialing',
        })
      )
    ).toBe('home');
  });

  it('onboarding 完了 + paywall 表示済み は home へ', () => {
    expect(
      decideInitialRoute(
        make({
          introSeenVersion: INTRO_VERSION,
          onboardingCompleted: true,
          paywallSeenAtISO: new Date().toISOString(),
        })
      )
    ).toBe('home');
  });

  // ★ コア修正: 既存ユーザーは INTRO_VERSION bump で巻き込まれない
  it('onboarding 完了済みユーザーは古い introSeenVersion でも intro を見ない', () => {
    expect(
      decideInitialRoute(
        make({
          introSeenVersion: 1,
          onboardingCompleted: true,
          subscriptionStatus: 'active',
        })
      )
    ).toBe('home');

    expect(
      decideInitialRoute(
        make({
          introSeenVersion: 0,
          onboardingCompleted: true,
          subscriptionStatus: 'active',
        })
      )
    ).toBe('home');
  });

  it('introSeenVersion が古くても onboarding 未了なら intro へ (新規ユーザー扱い)', () => {
    expect(
      decideInitialRoute(make({ introSeenVersion: 1, onboardingCompleted: false }))
    ).toBe('intro');
  });
});
