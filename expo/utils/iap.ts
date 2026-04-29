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
