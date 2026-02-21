import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseErrorListener,
  purchaseUpdatedListener,
  finishTransaction,
  getAvailablePurchases,
} from 'react-native-iap';
import { Platform } from 'react-native';

export const PRODUCT_IDS = {
  MONTHLY: 'com.yourapp.subscription.monthly',
  YEARLY: 'com.yourapp.subscription.yearly',
};

const productIds = Object.values(PRODUCT_IDS);

class IAPService {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  async init(): Promise<void> {
    try {
      await initConnection();
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: any) => {
          if (purchase.transactionReceipt) {
            await finishTransaction({ purchase, isConsumable: false });
          }
        }
      );
      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: any) => {
          console.warn('[IAP] Purchase error:', error);
        }
      );
    } catch (err) {
      console.error('[IAP] Init error:', err);
    }
  }

  async fetchSubscriptions(): Promise<any[]> {
    try {
      return await fetchProducts({ skus: productIds });
    } catch {
      return [];
    }
  }

  async purchaseSubscription(productId: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await requestPurchase({ request: { apple: { sku: productId } }, type: 'subs' });
    } else {
      await requestPurchase({ request: { google: { skus: [productId] } }, type: 'subs' });
    }
  }

  async restorePurchases(): Promise<any[]> {
    return await getAvailablePurchases();
  }

  destroy(): void {
    this.purchaseUpdateSubscription?.remove();
    this.purchaseErrorSubscription?.remove();
    endConnection();
  }
}

export default new IAPService();
