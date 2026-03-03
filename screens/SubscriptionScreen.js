import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IAPService, { PRODUCT_IDS } from '../lib/IApservice';
import { supabase } from '../lib/supabaseClient';

// Platform-specific product IDs for plan selection
const PLAN_PRODUCT_IDS = {
  yearly: PRODUCT_IDS.YEARLY,
  monthly: PRODUCT_IDS.MONTHLY,
};

export default function SubscriptionScreen({ navigation, theme }) {
  const isDark = theme === 'dark';
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [iapReady, setIapReady] = useState(false);
  const [currentPurchaseAttempt, setCurrentPurchaseAttempt] = useState(null);
  const [isIAPAvailable, setIsIAPAvailable] = useState(false);
  // Android: offerTokens keyed by base plan ID (monthly / yearly)
  const [androidOfferTokens, setAndroidOfferTokens] = useState({});
  const isRestoringRef = useRef(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  // Fetch the user's current plan
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('plan, is_pro_version')
          .eq('user_id', user.id)
          .single();
        if (data?.is_pro_version && data?.plan) {
          setCurrentPlan(data.plan);
        }
      } catch (e) {
        console.log('[SUB] Could not fetch current plan:', e.message);
      }
    };
    fetchCurrentPlan();
  }, []);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      // In Expo Go, IAP native module is unavailable. Enable the buttons in DEV
      // so the simulated purchase flow can be tested without a real build.
      if (!IAPService.isAvailable()) {
        if (__DEV__) {
          setIapReady(true);
          setIsIAPAvailable(false);
        }
        return;
      }

      setLoadingProducts(true);
      try {
        const results = await IAPService.getProducts();
        setProducts(results);
        setIapReady(true);
        setIsIAPAvailable(true);

        // Android: extract per-plan offer tokens from subscriptionOfferDetails
        if (Platform.OS === 'android' && results.length > 0) {
          const tokens = {};
          for (const product of results) {
            const offers = product.subscriptionOfferDetails ?? [];
            for (const offer of offers) {
              if (offer.basePlanId && offer.offerToken) {
                tokens[offer.basePlanId] = offer.offerToken;
              }
            }
          }
          console.log('[SUB] Android offer tokens found:', Object.keys(tokens));
          setAndroidOfferTokens(tokens);
        }
      } catch (err) {
        console.error('[SUB] Product fetch error:', err);
        setProducts([]);
        setIapReady(false);
        setIsIAPAvailable(false);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // ── Expo Go simulation ──────────────────────────────────────────────────────
  const simulatePurchase = async (plan) => {
    setCurrentPurchaseAttempt(plan);
    try {
      // Step 1: Get authenticated user
      const { data: authData, error: userError } = await supabase.auth.getUser();
      console.log('[SUBSCRIPTION] Step 1 - Auth:', { userId: authData?.user?.id, error: userError?.message });

      if (userError || !authData?.user) throw new Error('User not authenticated: ' + (userError?.message || 'no user'));
      const user = authData.user;

      // Step 2: Check if profile row exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id);

      console.log('[SUBSCRIPTION] Step 2 - Existing profile:', {
        found: existingProfile?.length,
        profile: existingProfile?.[0],
        error: fetchError?.message,
      });

      if (fetchError) {
        Alert.alert('Profile Fetch Error', fetchError.message);
        throw fetchError;
      }

      const now = new Date().toISOString();

      // Generate unique incrementing subscription_id (global max + 1)
      const { data: allSubs } = await supabase
        .from('profiles')
        .select('subscription_id')
        .like('subscription_id', '%_plan_%');
      let maxNum = 0;
      if (allSubs) {
        allSubs.forEach(row => {
          const match = row.subscription_id?.match(/_plan_(\d+)$/);
          if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
        });
      }
      const nextPlanNum = maxNum + 1;

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (plan === 'yearly' ? 365 : 30));

      const payload = {
        plan: plan,
        is_pro_version: true,
        purchase_time: now,
        price: plan === 'yearly' ? '$24.99' : '$2.99',
        subscription_id: `${plan}_plan_${nextPlanNum}`,
        product_id: PLAN_PRODUCT_IDS[plan] || plan,
        updated_at: now,
        status: 'active',
        current_period_start: now,
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        provider: Platform.OS === 'ios' ? 'apple' : 'google',
      };

      if (!existingProfile || existingProfile.length === 0) {
        // No profile row — insert one
        console.log('[SUBSCRIPTION] No profile found, inserting...');
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...payload })
          .select();

        console.log('[SUBSCRIPTION] Insert result:', { data: insertData, error: insertError?.message });
        if (insertError) {
          Alert.alert('Insert Error', insertError.message);
          throw insertError;
        }
      } else {
        // Profile exists — update it
        console.log('[SUBSCRIPTION] Step 3 - Updating with:', payload);
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('user_id', user.id)
          .select();

        console.log('[SUBSCRIPTION] Step 4 - Update result:', {
          data: updateData,
          error: updateError?.message,
          rowsAffected: updateData?.length,
        });

        if (updateError) {
          Alert.alert('Update Error', updateError.message);
          throw updateError;
        }
        if (!updateData || updateData.length === 0) {
          Alert.alert('Update Failed', 'Update ran but 0 rows affected. Check RLS policies in Supabase.');
          throw new Error('0 rows updated — possible RLS issue');
        }
      }

      await AsyncStorage.multiSet([
        ['profile.plan', plan],
        ['profile.is_pro', 'true'],
        ['profile.purchase_time', now],
      ]);

      console.log(`[SUBSCRIPTION] ✅ Simulated ${plan} purchase complete`);
      setCurrentPurchaseAttempt(null);
      navigation.goBack();
    } catch (error) {
      console.error('[SUBSCRIPTION] Simulation error:', error);
      setCurrentPurchaseAttempt(null);
      Alert.alert('Simulation Error', 'Could not simulate subscription. Are you logged in?');
    }
  };

  const handleContinue = async () => {
    // Expo Go: IAP JS module loads but Nitro native layer is absent
    if (__DEV__ && products.length === 0) {
      await simulatePurchase(selectedPlan);
      return;
    }

    if (!IAPService.isAvailable()) {
      Alert.alert('Purchases Unavailable', 'In-app purchases are not supported on this device.');
      return;
    }

    const planId = PLAN_PRODUCT_IDS[selectedPlan];
    const product = products.find((p) => (p.id ?? p.productId) === planId);
    if (!product) {
      Alert.alert('Plan not available', 'We couldn\'t find that plan. Please check your internet connection and try again.');
      return;
    }

    // Android: pass the offer token for the selected base plan
    const offerToken = Platform.OS === 'android' ? androidOfferTokens[selectedPlan] : undefined;
    if (Platform.OS === 'android' && !offerToken) {
      console.warn('[SUB] No offer token for plan:', selectedPlan, 'available tokens:', androidOfferTokens);
    }

    setCurrentPurchaseAttempt(selectedPlan);
    try {
      await IAPService.purchaseProduct(product.id ?? product.productId, offerToken);

      // Get the actual transaction details from the completed purchase
      const lastPurchase = IAPService.getLastPurchaseResult();
      const transactionId = lastPurchase?.id ?? lastPurchase?.transactionId ?? '';

      // Update Supabase profile with pro plan + subscription details
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const now = new Date().toISOString();
        const purchasedProductId = product.id ?? product.productId;
        const purchasePrice = product.localizedPrice ?? product.price ?? '';

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + (selectedPlan === 'yearly' ? 365 : 30));

        await supabase
          .from('profiles')
          .update({
            plan: selectedPlan,
            is_pro_version: true,
            purchase_time: now,
            price: String(purchasePrice),
            subscription_id: transactionId,
            product_id: purchasedProductId,
            updated_at: now,
            status: 'active',
            current_period_start: now,
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            canceled_at: null,
            provider: Platform.OS === 'ios' ? 'apple' : 'google',
          })
          .eq('user_id', user.id);
      }

      setCurrentPurchaseAttempt(null);
      navigation.goBack();
    } catch (error) {
      setCurrentPurchaseAttempt(null);
      const msg = String(error?.message || error);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        Alert.alert('Purchase Failed', msg || 'Unable to complete purchase. Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;

    if (!IAPService.isAvailable()) {
      Alert.alert('Restore Failed', 'In-app purchases are not available on this device.');
      isRestoringRef.current = false;
      return;
    }

    try {
      console.log('[SUBSCRIPTION] Attempting to restore purchases...');
      const results = await IAPService.restorePurchases();
      if (results.length > 0) {
        // Determine the plan from the restored purchase
        const restoredProduct = results[0];
        const restoredProductId = (restoredProduct?.productId ?? '').toLowerCase();
        const restoredPlan = restoredProductId.includes('yearly') ? 'yearly' : 'monthly';
        const restoredTxId = restoredProduct?.id ?? restoredProduct?.transactionId ?? '';

        // Update Supabase profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const now = new Date().toISOString();
          const periodEnd = new Date();
          periodEnd.setDate(periodEnd.getDate() + (restoredPlan === 'yearly' ? 365 : 30));

          await supabase
            .from('profiles')
            .update({
              plan: restoredPlan,
              is_pro_version: true,
              purchase_time: now,
              subscription_id: restoredTxId,
              product_id: restoredProduct?.productId ?? '',
              updated_at: now,
              status: 'active',
              current_period_start: now,
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
              canceled_at: null,
              provider: Platform.OS === 'ios' ? 'apple' : 'google',
            })
            .eq('user_id', user.id);
        }

        Alert.alert('Success', 'Your purchases have been restored!', [
          { text: 'Continue', onPress: () => {
              isRestoringRef.current = false;
              navigation.goBack();
            } }
        ]);
      } else {
        isRestoringRef.current = false;
      }
    } catch (err) {
      isRestoringRef.current = false;
      const errorMsg = String(err?.message || err);
      if (errorMsg.includes('No previous purchases')) {
        Alert.alert('No Purchases', 'No previous purchases were found.');
      } else if (errorMsg.includes('Could not connect')) {
        Alert.alert('Restore Failed', 'Could not connect to store.');
      } else {
        Alert.alert('Error', 'Something went wrong while restoring.');
      }
    }
  };

  const formatPrice = (plan, fallbackPrice) => {
    const planId = PLAN_PRODUCT_IDS[plan];
    const product = products.find((p) => (p.id ?? p.productId) === planId);
    if (product) {
      let price = product.localizedPrice;
      if (!price && product.price != null) {
        price = `$${parseFloat(product.price).toFixed(2)}`;
      }
      if (price) return plan === 'yearly' ? `${price}/year` : `${price}/month`;
    }
    return fallbackPrice;
  };

  return (
    <LinearGradient
      colors={isDark ? ['#050810', '#0d1120', '#08091a'] : ['#f0f4ff', '#e8eeff', '#f5f7ff']}
      style={styles.container}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Close Button */}
      <TouchableOpacity style={[styles.closeButton, !isDark && { backgroundColor: 'rgba(0, 0, 0, 0.06)' }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.closeText, !isDark && { color: '#333' }]}>✕</Text>
      </TouchableOpacity>

      {/* Restore Purchases */}
      <TouchableOpacity style={styles.alreadyPurchased} onPress={handleRestore}>
        <Text style={[styles.alreadyPurchasedText, !isDark && { color: '#666' }]}>Restore Purchases</Text>
      </TouchableOpacity>

      {/* Header area - near the top */}
      <Animated.View style={{ opacity: fadeAnim, paddingTop: 140, paddingHorizontal: 24 }}>
        {/* Logo/Icon with Glow */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoGlow, !isDark && { shadowColor: '#1e40af', shadowOpacity: 0.3 }]}>
            <View style={styles.logo}>
              <Image
                source={isDark ? require('../assets/dark-icon.png') : require('../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, !isDark && { color: '#1a1a2e' }]}>Unlock Full Inventory Power</Text>
          <Text style={[styles.subtitle, !isDark && { color: '#666' }]}>
            Stop losing track of what you own. Unlimited folders, items, and more. Organize everything in one place, find anything in seconds, and stay in total control of your inventory.
          </Text>
        </View>
      </Animated.View>

      {/* Spacer pushes plans + button to bottom */}
      <View style={{ flex: 1 }} />

      {/* Plans + Button - Fixed at Bottom */}
      <View style={styles.buttonContainer}>
        {/* Plans */}
        <View style={styles.plansContainer}>
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              !isDark && styles.planCardLight,
              selectedPlan === 'monthly' && styles.selectedPlan,
              selectedPlan === 'monthly' && !isDark && styles.selectedPlanLight,
              currentPlan === 'monthly' && { opacity: 0.4 },
            ]}
            onPress={() => currentPlan !== 'monthly' && setSelectedPlan('monthly')}
            disabled={currentPlan === 'monthly'}
          >
            <View style={[styles.planRadio, !isDark && { borderColor: '#999' }]}>
              {selectedPlan === 'monthly' && <View style={styles.planRadioSelected} />}
            </View>
            <View style={styles.planContent}>
              <Text style={[styles.planName, !isDark && { color: '#1a1a2e' }]}>
                Monthly{currentPlan === 'monthly' ? ' (Current)' : ''}
              </Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={[styles.planPrice, !isDark && { color: '#666' }]}>{formatPrice('monthly', '$2.99/month')}</Text>
            </View>
          </TouchableOpacity>

          {/* Yearly Plan - Best Value */}
          <TouchableOpacity
            style={[
              styles.planCard,
              !isDark && styles.planCardLight,
              selectedPlan === 'yearly' && styles.selectedPlan,
              selectedPlan === 'yearly' && !isDark && styles.selectedPlanLight,
              styles.popularPlan,
              currentPlan === 'yearly' && { opacity: 0.4 },
            ]}
            onPress={() => currentPlan !== 'yearly' && setSelectedPlan('yearly')}
            disabled={currentPlan === 'yearly'}
          >
            <View style={styles.tryFreeBadge}>
              <Text style={styles.tryFreeBadgeText}>BEST VALUE</Text>
            </View>
            <View style={[styles.planRadio, !isDark && { borderColor: '#999' }]}>
              {selectedPlan === 'yearly' && <View style={styles.planRadioSelected} />}
            </View>
            <View style={styles.planContent}>
              <Text style={[styles.planName, !isDark && { color: '#1a1a2e' }]}>
                Yearly{currentPlan === 'yearly' ? ' (Current)' : ''}
              </Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={[styles.planPrice, !isDark && { color: '#666' }]}>{formatPrice('yearly', '$24.99/year')}</Text>
              <Text style={styles.planSubtext}>Save 30%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.continueButton, (!iapReady || loadingProducts || currentPurchaseAttempt) && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={!iapReady || loadingProducts || !!currentPurchaseAttempt}
        >
          <LinearGradient
            colors={['#1e40af', '#1e3a8a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>
              {!iapReady ? 'Connecting...' : loadingProducts ? 'Loading...' : currentPurchaseAttempt ? 'Processing...' : 'Get Started'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={[styles.cancelAnytimeText, !isDark && { color: '#999' }]}>Cancel Anytime. No Commitment.</Text>
      </View>
    </LinearGradient>
  );
}

const TEXT = '#ffffff';
const MUTED = '#a0a8b8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  closeText: {
    fontSize: 24,
    color: TEXT,
    fontWeight: '300',
  },
  alreadyPurchased: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 10,
  },
  alreadyPurchasedText: {
    fontSize: 13,
    color: MUTED,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoGlow: {
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  logo: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#1e40af',
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedPlanLight: {
    borderColor: '#1e40af',
    backgroundColor: 'rgba(30, 64, 175, 0.08)',
  },
  planCardLight: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  popularPlan: {
    // Additional styling for popular plan
  },
  tryFreeBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  tryFreeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MUTED,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planRadioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1e40af',
  },
  planContent: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT,
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
  },
  planSubtext: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cancelAnytimeText: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 12,
  },
});
