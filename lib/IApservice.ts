import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// All react-native-iap access goes through dynamic import() inside async
// functions. Nothing here runs at module parse time. initConnection() is only
// called from user-action handlers (button taps), never from useEffect,
// context providers, or app startup code.
//
// This prevents NitroIap from being touched by JS before the native Nitro
// bridge is ready, which was causing the SIGABRT startup crash.
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_IDS = {
  MONTHLY: 'monthly.plan.id',
  YEARLY:  'yearly.plan.id',
};

const SKUS = [PRODUCT_IDS.YEARLY, PRODUCT_IDS.MONTHLY];
const INFLIGHT_KEY = 'iapPurchaseInFlight';

// Cached module reference — populated only on first user-action call.
let _iap: any = null;

async function loadIAP(): Promise<any | null> {
  if (_iap) return _iap;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    console.warn('[IAP] loadIAP skipped — unsupported platform:', Platform.OS);
    return null;
  }
  try {
    _iap = await import('react-native-iap');
    console.log('[IAP] react-native-iap loaded via dynamic import');
    return _iap;
  } catch (e: any) {
    console.warn('[IAP] dynamic import failed:', e?.message);
    return null;
  }
}

// ── fetchProducts ─────────────────────────────────────────────────────────────
// Call only from a button handler or screen-specific useEffect that runs after
// an explicit user navigation — never from the root layout or a provider.

export async function fetchProducts(): Promise<any[]> {
  const iap = await loadIAP();
  if (!iap) return [];

  if (Platform.OS === 'ios') {
    try {
      await iap.initConnection();
    } catch (e: any) {
      console.warn('[IAP] initConnection failed (ios):', e?.message);
      return [];
    }
  } else {
    try {
      await iap.initConnection();
    } catch (e: any) {
      console.warn('[IAP] initConnection failed (android):', e?.message);
      return [];
    }
  }

  try {
    const subs = await iap.getSubscriptions({ skus: SKUS });
    if (subs?.length) return subs;
  } catch (e: any) {
    console.warn('[IAP] getSubscriptions failed:', e?.message);
  }

  try {
    return (await iap.getProducts({ skus: SKUS })) ?? [];
  } catch (e: any) {
    console.warn('[IAP] getProducts failed:', e?.message);
    return [];
  }
}

// ── purchaseSubscription ──────────────────────────────────────────────────────
// Full purchase flow: connect → register listeners → request → finish → cleanup.
// Listeners are registered AFTER initConnection resolves.
// endConnection is always called in finally, even if the purchase fails.

export async function purchaseSubscription(
  sku: string,
  offerToken?: string,
): Promise<any> {
  const iap = await loadIAP();
  if (!iap) throw new Error('IAP not available on this platform');

  if (Platform.OS === 'ios') {
    try {
      await iap.initConnection();
    } catch (e: any) {
      throw new Error('Could not connect to App Store: ' + (e?.message ?? e));
    }
  } else {
    try {
      await iap.initConnection();
    } catch (e: any) {
      throw new Error('Could not connect to Play Store: ' + (e?.message ?? e));
    }
  }

  await AsyncStorage.setItem(INFLIGHT_KEY, 'true');

  let updateSub: any = null;
  let errorSub: any = null;

  try {
    const purchase = await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Purchase timed out')), 60000);

      // Register purchaseUpdatedListener AFTER initConnection resolves.
      if (Platform.OS === 'ios') {
        try {
          updateSub = iap.purchaseUpdatedListener((p: any) => {
            clearTimeout(timer);
            resolve(p);
          });
        } catch (e: any) {
          console.warn('[IAP] purchaseUpdatedListener failed (ios):', e?.message);
        }

        try {
          errorSub = iap.purchaseErrorListener((err: any) => {
            clearTimeout(timer);
            reject(new Error(err?.message ?? 'Purchase error'));
          });
        } catch (e: any) {
          console.warn('[IAP] purchaseErrorListener failed (ios):', e?.message);
        }

        try {
          iap.requestSubscription({
            sku,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
          });
        } catch (e: any) {
          clearTimeout(timer);
          reject(e);
        }
      } else {
        // Android
        try {
          updateSub = iap.purchaseUpdatedListener((p: any) => {
            clearTimeout(timer);
            resolve(p);
          });
        } catch (e: any) {
          console.warn('[IAP] purchaseUpdatedListener failed (android):', e?.message);
        }

        try {
          errorSub = iap.purchaseErrorListener((err: any) => {
            clearTimeout(timer);
            reject(new Error(err?.message ?? 'Purchase error'));
          });
        } catch (e: any) {
          console.warn('[IAP] purchaseErrorListener failed (android):', e?.message);
        }

        try {
          iap.requestSubscription({
            sku,
            subscriptionOffers: offerToken ? [{ sku, offerToken }] : [],
          });
        } catch (e: any) {
          clearTimeout(timer);
          reject(e);
        }
      }
    });

    // Finish the transaction
    if (Platform.OS === 'ios') {
      try {
        await iap.finishTransaction({ purchase, isConsumable: false });
      } catch (e: any) {
        console.warn('[IAP] finishTransaction failed (ios):', e?.message);
      }
    } else {
      try {
        await iap.finishTransaction({ purchase, isConsumable: false });
      } catch (e: any) {
        console.warn('[IAP] finishTransaction failed (android):', e?.message);
      }
    }

    // Cache entitlement locally
    const planKey = (purchase.productId ?? '').toLowerCase().includes('monthly') ? 'monthly' : 'yearly';
    await AsyncStorage.multiSet([
      ['profile.plan', planKey],
      ['profile.is_pro', 'true'],
      ['profile.purchase_time', new Date().toISOString()],
    ]);

    await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
    return purchase;
  } finally {
    await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
    if (Platform.OS === 'ios') {
      try { updateSub?.remove(); } catch (e: any) { console.warn('[IAP] updateSub.remove failed (ios):', e?.message); }
      try { errorSub?.remove(); } catch (e: any) { console.warn('[IAP] errorSub.remove failed (ios):', e?.message); }
      try { await iap.endConnection(); } catch (e: any) { console.warn('[IAP] endConnection failed (ios):', e?.message); }
    } else {
      try { updateSub?.remove(); } catch (e: any) { console.warn('[IAP] updateSub.remove failed (android):', e?.message); }
      try { errorSub?.remove(); } catch (e: any) { console.warn('[IAP] errorSub.remove failed (android):', e?.message); }
      try { await iap.endConnection(); } catch (e: any) { console.warn('[IAP] endConnection failed (android):', e?.message); }
    }
  }
}

// ── restorePurchases ──────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<any[]> {
  const iap = await loadIAP();
  if (!iap) throw new Error('IAP not available on this platform');

  if (Platform.OS === 'ios') {
    try {
      await iap.initConnection();
    } catch (e: any) {
      throw new Error('Could not connect to App Store: ' + (e?.message ?? e));
    }
  } else {
    try {
      await iap.initConnection();
    } catch (e: any) {
      throw new Error('Could not connect to Play Store: ' + (e?.message ?? e));
    }
  }

  try {
    const purchases = await iap.getAvailablePurchases();
    if (!purchases?.length) throw new Error('No previous purchases found');

    for (const p of purchases) {
      if (Platform.OS === 'ios') {
        try {
          await iap.finishTransaction({ purchase: p, isConsumable: false });
        } catch (e: any) {
          console.warn('[IAP] finishTransaction (restore/ios) failed:', e?.message);
        }
      } else {
        try {
          await iap.finishTransaction({ purchase: p, isConsumable: false });
        } catch (e: any) {
          console.warn('[IAP] finishTransaction (restore/android) failed:', e?.message);
        }
      }
    }

    return purchases;
  } finally {
    if (Platform.OS === 'ios') {
      try { await iap.endConnection(); } catch (e: any) { console.warn('[IAP] endConnection (restore/ios) failed:', e?.message); }
    } else {
      try { await iap.endConnection(); } catch (e: any) { console.warn('[IAP] endConnection (restore/android) failed:', e?.message); }
    }
  }
}
