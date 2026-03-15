import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// react-native-iap v14 API (Nitro-based)
//
// Key v14 changes from v12/v13:
//   • getSubscriptions/getProducts → fetchProducts({ skus, type })
//   • requestSubscription          → requestPurchase({ type:'subs', request:{apple/google:{...}} })
//     requestPurchase is now PROMISE-BASED — no purchaseUpdatedListener needed in the buy flow
//   • andDangerouslyFinishTransactionAutomaticallyIOS → andDangerouslyFinishTransactionAutomatically
//   • Product identifier field is `id` (not `productId`)
//
// Dynamic import guards: nothing runs at module parse time. initConnection() is
// called only from user-action handlers, never from startup / providers.
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_IDS = {
  MONTHLY: 'monthly.plan.id',
  YEARLY:  'yearly.plan.id',
};

const SKUS = [PRODUCT_IDS.YEARLY, PRODUCT_IDS.MONTHLY];
const INFLIGHT_KEY = 'iapPurchaseInFlight';

// Cached module reference — populated only on first user-action call.
let _iap: any = null;

// ── Debug log collector (ring buffer, last 100 entries) ─────────────────────
const MAX_LOGS = 100;
const _debugLogs: string[] = [];

export function iapLog(msg: string): void {
  const entry = `[${new Date().toISOString().slice(11, 23)}] ${msg}`;
  _debugLogs.push(entry);
  if (_debugLogs.length > MAX_LOGS) _debugLogs.shift();
  console.log('[IAP]', msg);
}

export function getIapLogs(): string[] {
  return [..._debugLogs];
}

export function clearIapLogs(): void {
  _debugLogs.length = 0;
}

async function loadIAP(): Promise<any | null> {
  if (_iap) return _iap;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    iapLog(`loadIAP skipped — unsupported platform: ${Platform.OS}`);
    return null;
  }
  try {
    _iap = await import('react-native-iap');
    iapLog('react-native-iap loaded via dynamic import');
    return _iap;
  } catch (e: any) {
    iapLog(`dynamic import FAILED: ${e?.message}`);
    return null;
  }
}

// ── fetchProducts ─────────────────────────────────────────────────────────────
// v14: uses iap.fetchProducts({ skus, type }) — getSubscriptions/getProducts removed.

export async function fetchProducts(): Promise<any[]> {
  const iap = await loadIAP();
  if (!iap) return [];

  try {
    iapLog('initConnection...');
    await iap.initConnection();
    iapLog('initConnection OK');
  } catch (e: any) {
    iapLog(`initConnection FAILED: ${e?.message}`);
    return [];
  }

  // v14: fetchProducts replaces both getSubscriptions and getProducts
  try {
    iapLog(`fetchProducts (type=subs) skus=${JSON.stringify(SKUS)}`);
    const subs = await iap.fetchProducts({ skus: SKUS, type: 'subs' });
    iapLog(`fetchProducts subs result: ${JSON.stringify(subs?.map((p: any) => p.id))}`);
    if (subs?.length) return subs;
  } catch (e: any) {
    iapLog(`fetchProducts subs FAILED: ${e?.message}`);
  }

  // Fallback: try inapp type (unlikely for subscriptions but defensive)
  try {
    iapLog(`fetchProducts (type=inapp) skus=${JSON.stringify(SKUS)}`);
    const products = await iap.fetchProducts({ skus: SKUS, type: 'inapp' });
    iapLog(`fetchProducts inapp result: ${JSON.stringify(products?.map((p: any) => p.id))}`);
    return products ?? [];
  } catch (e: any) {
    iapLog(`fetchProducts inapp FAILED: ${e?.message}`);
    return [];
  }
}

// ── purchaseSubscription ──────────────────────────────────────────────────────
// v14: requestPurchase() is promise-based — resolves with Purchase directly.
// No purchaseUpdatedListener / purchaseErrorListener needed in the buy flow.

export async function purchaseSubscription(
  sku: string,
  offerToken?: string,
): Promise<any> {
  const iap = await loadIAP();
  if (!iap) throw new Error('IAP not available on this platform');

  try {
    iapLog('purchaseSubscription: initConnection...');
    await iap.initConnection();
    iapLog('purchaseSubscription: initConnection OK');
  } catch (e: any) {
    const store = Platform.OS === 'ios' ? 'App Store' : 'Play Store';
    iapLog(`purchaseSubscription: initConnection FAILED: ${e?.message}`);
    throw new Error(`Could not connect to ${store}: ${e?.message ?? e}`);
  }

  await AsyncStorage.setItem(INFLIGHT_KEY, 'true');

  try {
    iapLog(`purchaseSubscription: requestPurchase sku=${sku} offerToken=${offerToken}`);

    let purchase: any;

    if (Platform.OS === 'ios') {
      // v14 iOS: type:'subs', request.apple.sku
      purchase = await iap.requestPurchase({
        type: 'subs',
        request: {
          apple: {
            sku,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      });
    } else {
      // v14 Android: type:'subs', request.google.skus (array), subscriptionOffers
      purchase = await iap.requestPurchase({
        type: 'subs',
        request: {
          google: {
            skus: [sku],
            subscriptionOffers: offerToken ? [{ sku, offerToken }] : undefined,
          },
        },
      });
    }

    // requestPurchase may return Purchase | Purchase[] | null
    const resolved = Array.isArray(purchase) ? purchase[0] : purchase;
    if (!resolved) throw new Error('Purchase returned null/empty');

    iapLog(`purchaseSubscription: purchase OK productId=${resolved.id ?? resolved.productId}`);

    // Finish the transaction
    try {
      iapLog('purchaseSubscription: finishTransaction...');
      await iap.finishTransaction({ purchase: resolved, isConsumable: false });
      iapLog('purchaseSubscription: finishTransaction OK');
    } catch (e: any) {
      iapLog(`purchaseSubscription: finishTransaction FAILED (non-fatal): ${e?.message}`);
    }

    // Cache entitlement locally
    const planKey = (resolved.id ?? resolved.productId ?? '').toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
    await AsyncStorage.multiSet([
      ['profile.plan', planKey],
      ['profile.is_pro', 'true'],
      ['profile.purchase_time', new Date().toISOString()],
    ]);

    await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
    return resolved;
  } catch (e: any) {
    iapLog(`purchaseSubscription: FAILED: ${e?.message}`);
    throw e;
  } finally {
    await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
    try { await iap.endConnection(); } catch (e: any) { iapLog(`endConnection FAILED (non-fatal): ${e?.message}`); }
  }
}

// ── restorePurchases ──────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<any[]> {
  const iap = await loadIAP();
  if (!iap) throw new Error('IAP not available on this platform');

  try {
    iapLog('restorePurchases: initConnection...');
    await iap.initConnection();
    iapLog('restorePurchases: initConnection OK');
  } catch (e: any) {
    const store = Platform.OS === 'ios' ? 'App Store' : 'Play Store';
    iapLog(`restorePurchases: initConnection FAILED: ${e?.message}`);
    throw new Error(`Could not connect to ${store}: ${e?.message ?? e}`);
  }

  try {
    iapLog('restorePurchases: getAvailablePurchases...');
    const purchases = await iap.getAvailablePurchases();
    iapLog(`restorePurchases: found ${purchases?.length ?? 0} purchases`);
    if (!purchases?.length) throw new Error('No previous purchases found');

    for (const p of purchases) {
      try {
        await iap.finishTransaction({ purchase: p, isConsumable: false });
        iapLog(`restorePurchases: finishTransaction OK for ${p.id ?? p.productId}`);
      } catch (e: any) {
        iapLog(`restorePurchases: finishTransaction FAILED (non-fatal): ${e?.message}`);
      }
    }

    return purchases;
  } finally {
    try { await iap.endConnection(); } catch (e: any) { iapLog(`restorePurchases: endConnection FAILED: ${e?.message}`); }
  }
}
