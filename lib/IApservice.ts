import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// react-native-iap v14 (Nitro JSI). This is the only version that builds with
// React Native 0.81.5 + New Architecture. v13 fails pod install because it
// depends on `RCT-Folly` as a standalone CocoaPod, which is no longer available
// in RN 0.81.5's prebuilt binary mode (it's bundled in ReactNativeDependencies).
//
// Runtime crash risk: StoreKit ObjC exceptions can escape through the C++
// TurboModule boundary → SIGABRT. Mitigated by deferred require (below) and
// only initializing IAP when the user opens the Subscription screen.
// ─────────────────────────────────────────────────────────────────────────────

let iapAvailable = false;
let iapModule: any = null;
let iapLoadAttempted = false;

// react-native-iap requires a native build (not available in Expo Go).
// Gate the import behind an Expo Go check so the error never surfaces —
// the subscription screen will use the simulated purchase flow instead.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Deferred import — do NOT load at module parse time.
// Avoids loading the native module in Expo Go where it is unavailable.
function ensureIAPLoaded() {
  if (iapLoadAttempted) return;
  iapLoadAttempted = true;

  if (!isExpoGo) {
    try {
      iapModule = require('react-native-iap');
      if (typeof iapModule.initConnection === 'function') {
        iapAvailable = true;
        console.log('[IAP] ✅ Module loaded, initConnection present');
      } else {
        console.log('[IAP] ❌ initConnection missing — module may not be linked');
      }
    } catch (e: any) {
      console.log('[IAP] require failed:', e?.message);
    }
  } else {
    console.log('[IAP] Expo Go detected — skipping IAP import, simulation mode active');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product ID constants
// ─────────────────────────────────────────────────────────────────────────────
export const PRODUCT_IDS = {
  MONTHLY: 'monthly.plan.id',
  YEARLY: 'yearly.plan.id',
};

const IOS_PRODUCT_IDS = [PRODUCT_IDS.YEARLY, PRODUCT_IDS.MONTHLY];
const ANDROID_PRODUCT_IDS = [PRODUCT_IDS.YEARLY, PRODUCT_IDS.MONTHLY];

const INFLIGHT_KEY = 'iapPurchaseInFlight';

// ─────────────────────────────────────────────────────────────────────────────
// IAPService singleton
// ─────────────────────────────────────────────────────────────────────────────
class IAPService {
  private static instance: IAPService;
  private isConnected = false;
  private hasListener = false;
  private processedIds = new Set<string>();
  private lastPurchaseResult: any = null;
  private debugCallback: ((info: any) => void) | null = null;
  private currentPurchaseProductId: string | null = null;
  private purchasePromiseResolve: ((value: void) => void) | null = null;
  private purchasePromiseReject: ((reason?: any) => void) | null = null;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private productFetchLogs: string[] = [];
  private purchaseLogs: string[] = [];

  private constructor() {}

  getPurchaseLogs(): string[] {
    return [...this.purchaseLogs];
  }

  clearPurchaseLogs() {
    this.purchaseLogs = [];
  }

  private plog(msg: string) {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    this.purchaseLogs.push(entry);
    console.log('[IAP-PURCHASE]', msg);
    this.debugCallback?.({ purchaseLog: entry, allPurchaseLogs: [...this.purchaseLogs] });
  }

  static getInstance(): IAPService {
    if (!IAPService.instance) IAPService.instance = new IAPService();
    return IAPService.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  isAvailable(): boolean {
    ensureIAPLoaded();
    return iapAvailable && iapModule !== null;
  }

  getLastPurchaseResult() {
    return this.lastPurchaseResult;
  }

  setDebugCallback(cb: (info: any) => void) {
    this.debugCallback = cb;
  }

  getProductFetchLogs(): string[] {
    return [...this.productFetchLogs];
  }

  getConnectionStatus() {
    return { isConnected: this.isConnected, hasListener: this.hasListener };
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  async initialize(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('[IAP] Not available — skipping init');
      return false;
    }

    try {
      console.log('[IAP] Initializing... platform:', Platform.OS);

      if (!this.isConnected) {
        const result = await iapModule.initConnection();
        console.log('[IAP] initConnection result:', result);
        this.isConnected = true;
      }

      if (!this.hasListener) {
        this.setupPurchaseListeners();
        this.hasListener = true;
      }

      await this.checkForPendingPurchases();
      return true;
    } catch (e: any) {
      console.error('[IAP] initialize failed:', e?.message);
      return false;
    }
  }

  // ── Product fetching ───────────────────────────────────────────────────────

  async getProducts(): Promise<any[]> {
    this.productFetchLogs = [];
    this.log('========== PRODUCT FETCH ==========');
    this.log(`Platform: ${Platform.OS}`);

    if (!this.isAvailable()) {
      this.log('❌ IAP not available');
      return [];
    }

    if (!this.isConnected) {
      this.log('Not connected — initializing...');
      const ok = await this.initialize();
      if (!ok) {
        this.log('❌ Initialization failed');
        return [];
      }
    }

    // Brief pause to let StoreKit settle after connection
    await new Promise(r => setTimeout(r, 500));

    const productIds = Platform.OS === 'ios' ? IOS_PRODUCT_IDS : ANDROID_PRODUCT_IDS;
    this.log(`Requesting SKUs: ${productIds.join(', ')}`);

    if (typeof iapModule.getSubscriptions !== 'function') {
      this.log('❌ getSubscriptions not available — check react-native-iap linkage');
      return [];
    }

    // Attempt 1: subscriptions (the correct type for all our products)
    this.log('ATTEMPT 1: getSubscriptions({ skus })');
    try {
      const results = await iapModule.getSubscriptions({ skus: productIds });
      if (results?.length > 0) {
        this.log(`✅ Got ${results.length} products`);
        return results;
      }
      this.log('Returned 0 — trying getProducts fallback');
    } catch (e: any) {
      this.log(`getSubscriptions failed: ${e?.message}`);
    }

    // Attempt 2: one-time products fallback (catches misclassified SKUs)
    this.log('ATTEMPT 2: getProducts({ skus })');
    try {
      const results = await iapModule.getProducts({ skus: productIds });
      if (results?.length > 0) {
        this.log(`✅ Got ${results.length} products via getProducts`);
        return results;
      }
      this.log('Returned 0');
    } catch (e: any) {
      this.log(`getProducts failed: ${e?.message}`);
    }

    this.log('========== ALL ATTEMPTS FAILED ==========');
    this.log('Checklist:');
    this.log('  1. Product IDs match App Store Connect / Google Play exactly');
    this.log('  2. Products are in "Ready to Submit" or "Approved" state');
    this.log('  3. Sandbox account is signed into the device');
    this.log('  4. Bundle ID matches provisioning profile');
    this.log(`  Requested: ${productIds.join(', ')}`);
    return [];
  }

  // ── Purchase flow ──────────────────────────────────────────────────────────

  // offerToken is required on Android (from subscriptionOfferDetails in the fetched product)
  async purchaseProduct(productId: string, offerToken?: string): Promise<void> {
    if (!this.isAvailable()) throw new Error('IAP not available');
    if (!this.isConnected) await this.initialize();

    this.currentPurchaseProductId = productId;
    await AsyncStorage.setItem(INFLIGHT_KEY, 'true');

    const purchasePromise = new Promise<void>((resolve, reject) => {
      this.purchasePromiseResolve = resolve;
      this.purchasePromiseReject = reject;
      setTimeout(async () => {
        if (this.purchasePromiseReject) {
          await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
          this.purchasePromiseReject(new Error('Purchase timeout'));
          this.purchasePromiseResolve = null;
          this.purchasePromiseReject = null;
        }
      }, 60000);
    });

    try {
      console.log('[IAP] requestPurchase:', productId, offerToken ? `offerToken: ${offerToken.substring(0, 20)}...` : '');

      if (Platform.OS === 'ios') {
        await iapModule.requestSubscription({
          sku: productId,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });
      } else {
        // Android requires subscriptionOffers with the offerToken from getSubscriptions
        const subscriptionOffers = offerToken
          ? [{ sku: productId, offerToken }]
          : [];
        this.plog(`Android purchase — sku: ${productId} offers: ${subscriptionOffers.length}`);
        await iapModule.requestSubscription({
          sku: productId,
          subscriptionOffers,
        });
      }

      this.debugCallback?.({ listenerStatus: 'PURCHASE INITIATED — WAITING ⏳', productId });
      await purchasePromise;
      console.log('[IAP] ✅ Purchase complete');
    } catch (e: any) {
      console.error('[IAP] purchaseProduct error:', e?.message);
      await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
      this.currentPurchaseProductId = null;
      this.purchasePromiseResolve = null;
      this.purchasePromiseReject = null;
      this.debugCallback?.({ listenerStatus: 'PURCHASE FAILED ❌' });

      if (e?.code === 'E_USER_CANCELLED' || e?.message?.includes('cancel')) {
        throw new Error('User cancelled purchase');
      }
      throw e;
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────────

  async restorePurchases(): Promise<any[]> {
    if (!this.isAvailable()) throw new Error('IAP not available');
    if (!this.isConnected) await this.initialize();

    await AsyncStorage.setItem(INFLIGHT_KEY, 'true');
    try {
      const purchases = await iapModule.getAvailablePurchases();
      if (!purchases?.length) {
        await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
        throw new Error('No previous purchases found');
      }
      for (const p of purchases) await this.processPurchase(p, 'restore');
      await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
      return purchases;
    } catch (e) {
      await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
      throw e;
    }
  }

  // ── Orphan check ───────────────────────────────────────────────────────────

  async checkForOrphanedTransactions(): Promise<void> {
    if (!this.isAvailable()) return;
    if (!this.isConnected) await this.initialize();
    await this.checkForPendingPurchases();
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  async cleanup() {
    if (!this.isAvailable()) return;
    this.purchaseUpdateSubscription?.remove();
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription?.remove();
    this.purchaseErrorSubscription = null;
    if (this.isConnected) {
      await iapModule.endConnection();
      this.isConnected = false;
    }
    this.hasListener = false;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private log(msg: string) {
    const ts = new Date().toLocaleTimeString();
    this.productFetchLogs.push(`[${ts}] ${msg}`);
    console.log('[IAP]', msg);
  }

  private setupPurchaseListeners() {
    if (!this.isAvailable()) return;

    this.purchaseUpdateSubscription = iapModule.purchaseUpdatedListener(
      async (purchase: any) => {
        this.plog(`🎉 purchaseUpdatedListener fired — productId=${purchase?.productId} id=${purchase?.id} transactionId=${purchase?.transactionId}`);
        this.lastPurchaseResult = purchase;
        this.debugCallback?.({ lastPurchase: purchase, listenerStatus: 'PURCHASE RECEIVED ✅' });
        await this.handlePurchaseUpdate(purchase);
      }
    );

    this.purchaseErrorSubscription = iapModule.purchaseErrorListener(
      (error: any) => {
        this.plog(`❌ purchaseErrorListener: ${error?.message} (code=${error?.code})`);
        this.debugCallback?.({ listenerStatus: `PURCHASE ERROR ❌: ${error.message}` });
        this.currentPurchaseProductId = null;
        AsyncStorage.setItem(INFLIGHT_KEY, 'false');
        if (this.purchasePromiseReject) {
          this.purchasePromiseReject(new Error(error.message));
          this.purchasePromiseResolve = null;
          this.purchasePromiseReject = null;
        }
      }
    );

    console.log('[IAP] Purchase listeners registered');
  }

  private async handlePurchaseUpdate(purchase: any) {
    try {
      await this.processPurchase(purchase, 'listener');
      if (this.purchasePromiseResolve) {
        this.purchasePromiseResolve();
        this.purchasePromiseResolve = null;
        this.purchasePromiseReject = null;
      }
    } catch (e) {
      console.error('[IAP] handlePurchaseUpdate error:', e);
      if (this.purchasePromiseReject) {
        this.purchasePromiseReject(e);
        this.purchasePromiseResolve = null;
        this.purchasePromiseReject = null;
      }
    }
  }

  private async checkForPendingPurchases() {
    try {
      const purchases = await iapModule.getAvailablePurchases();
      if (purchases?.length > 0) {
        console.log(`[IAP] Found ${purchases.length} pending purchase(s)`);
        for (const p of purchases) {
          const txId = p.id ?? p.transactionId;
          if (txId && !this.processedIds.has(txId)) {
            await this.processPurchase(p, 'orphan');
          }
        }
      } else {
        console.log('[IAP] No pending purchases');
      }
    } catch (e) {
      console.error('[IAP] checkForPendingPurchases error:', e);
    }
  }

  private async processPurchase(purchase: any, source: 'listener' | 'restore' | 'orphan'): Promise<boolean> {
    const txId = purchase.id ?? purchase.transactionId;

    this.plog(`processPurchase called — source=${source} txId=${txId} productId=${purchase?.productId}`);
    this.plog(`  purchase keys: ${Object.keys(purchase || {}).join(', ')}`);

    if (!txId) {
      this.plog('❌ txId is null/undefined — cannot process');
      return false;
    }

    if (this.processedIds.has(txId)) {
      this.plog(`⚠️ txId already in processedIds — skipping`);
      return false;
    }

    try {
      const productId = (purchase.productId ?? '').toLowerCase();
      let planToUse: 'yearly' | 'monthly' = 'yearly';
      if (productId.includes('monthly')) planToUse = 'monthly';

      const inFlightRaw = await AsyncStorage.getItem(INFLIGHT_KEY);
      const inFlight = inFlightRaw === 'true';
      const shouldEntitle =
        (source === 'listener' && inFlight) ||
        source === 'restore' ||
        source === 'orphan';

      this.plog(`  inFlightRaw="${inFlightRaw}" inFlight=${inFlight} shouldEntitle=${shouldEntitle} plan=${planToUse}`);

      if (source === 'listener' && !inFlight) {
        this.plog('⚠️ inFlight=false — no active purchase. Finishing transaction to clear queue.');
        try {
          await iapModule.finishTransaction({ purchase, isConsumable: false });
          this.plog('✅ finishTransaction (cleanup, no entitlement)');
        } catch (cleanupErr: any) {
          this.plog(`⚠️ finishTransaction cleanup failed: ${cleanupErr?.message}`);
        }
        return false;
      }

      // Mark as processed
      this.processedIds.add(txId);
      this.plog(`  txId added to processedIds. Set size=${this.processedIds.size}`);

      if (shouldEntitle) {
        // Store subscription locally via AsyncStorage
        const subscriptionId = `${purchase.productId}_${Date.now()}`;
        await AsyncStorage.multiSet([
          ['profile.plan', planToUse],
          ['profile.subscription_id', subscriptionId],
          ['profile.is_pro', 'true'],
          ['profile.purchase_time', new Date().toISOString()],
        ]);
        this.plog('✅ AsyncStorage local cache updated with pro entitlement');
      }

      this.plog('→ Calling finishTransaction...');
      await iapModule.finishTransaction({ purchase, isConsumable: false });
      this.plog('✅ finishTransaction complete');

      if (shouldEntitle) {
        await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
        this.currentPurchaseProductId = null;

        this.debugCallback?.({
          listenerStatus: 'PURCHASE SUCCESS! ✅',
          shouldNavigate: true,
          purchaseComplete: true,
          purchaseSource: source,
        });
        this.plog('🎉 Entitlement granted and INFLIGHT cleared');
      }

      return shouldEntitle;
    } catch (e: any) {
      this.plog(`❌ processPurchase threw: ${e?.message ?? String(e)}`);
      await AsyncStorage.setItem(INFLIGHT_KEY, 'false');
      throw e;
    }
  }
}

export default IAPService.getInstance();
