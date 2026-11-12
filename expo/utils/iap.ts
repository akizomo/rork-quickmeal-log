import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

import { ENTITLEMENT_ID, getRevenueCatApiKey, OFFERING_ID } from '@/constants/iap';

let initialized = false;

/** RevenueCat SDK の初期化。アプリ起動時に1回だけ呼ぶ。 */
export async function initIap(): Promise<void> {
  if (initialized) return;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey || apiKey.includes('REPLACE_ME')) {
    console.log('[iap] RevenueCat API key not set; skipping init');
    return;
  }
  try {
    Purchases.configure({ apiKey });
    initialized = true;
    console.log('[iap] RevenueCat initialized');
  } catch (e) {
    console.log('[iap] init failed', e);
  }
}

/** デフォルト Offering (monthly + annual パッケージを含む) を取得 */
export async function fetchOffering(): Promise<PurchasesOffering | null> {
  if (!initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all[OFFERING_ID] ?? offerings.current ?? null;
  } catch (e) {
    console.log('[iap] fetchOffering failed', e);
    return null;
  }
}

/** 指定パッケージを購入。成功時に CustomerInfo を返す。 */
export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const result = await Purchases.purchasePackage(pkg);
    return result.customerInfo;
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      console.log('[iap] purchase cancelled by user');
      return null;
    }
    console.log('[iap] purchase failed', e);
    throw e;
  }
}

/** 購入の復元。CustomerInfo を返す。 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.log('[iap] restore failed', e);
    return null;
  }
}

/** 現在の CustomerInfo を取得 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.log('[iap] getCustomerInfo failed', e);
    return null;
  }
}

/** customerInfo にプレミアムエンタイトルメントが付与されているか */
export function isPremiumActive(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/** customerInfo の更新を購読 (購入完了時/期限切れ時などに発火) */
export function addCustomerInfoListener(cb: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

/**
 * パッケージが「今このユーザーに」提示できる無料トライアルの日数。無ければ 0。
 *
 * 文言は固定値ではなく、ストアが返す導入オファーから決める (App Store 審査 3.1.2(c)):
 * 商品に無料の導入オファーが無い、またはこの Apple ID が既に使い切っている場合に
 * 「7日間無料」と出すと、実際には課金されるのに無料と誤認させるため。
 * 判定できない (取得失敗・未初期化・Web) ときも 0 = トライアルを謳わない側に倒す。
 */
export async function fetchFreeTrialDays(pkg: PurchasesPackage | undefined | null): Promise<number> {
  const intro = pkg?.product.introPrice;
  if (!pkg || !intro || intro.price !== 0) return 0;
  if (!initialized) return 0;
  try {
    // iOS は Apple ID ごとにトライアルを使い切ったか分かる。Android は常に UNKNOWN を返すので、
    // 商品に無料オファーがあることだけで判断する (Play 側は購入時に資格を自動判定する)
    if (Platform.OS === 'ios') {
      const res = await Purchases.checkTrialOrIntroductoryPriceEligibility([pkg.product.identifier]);
      const status = res[pkg.product.identifier]?.status;
      if (status !== Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return 0;
    }
  } catch (e) {
    console.log('[iap] trial eligibility check failed', e);
    return 0;
  }
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY':
      return n;
    case 'WEEK':
      return n * 7;
    case 'MONTH':
      return n * 30;
    case 'YEAR':
      return n * 365;
    default:
      return 0;
  }
}
