import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Linking,
  Image,
  Keyboard,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
import { getProfile, updateProfile } from '../lib/profileService';
import IAPService, { PRODUCT_IDS } from '../lib/IApservice';

const PLAN_PRODUCT_IDS = {
  yearly: PRODUCT_IDS.YEARLY,
  monthly: PRODUCT_IDS.MONTHLY,
};

export default function ProfileScreen({ navigation, theme, toggleTheme }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '' });

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState('Free');
  const [subscriptionDisplay, setSubscriptionDisplay] = useState({
    plan: 'Free Plan',
    price: '$0.00',
    renewalDate: null,
    status: 'free',
    isCancelled: false,
  });

  // Modals
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [isBillingModalVisible, setIsBillingModalVisible] = useState(false);
  const [isBillingManagementModalVisible, setIsBillingManagementModalVisible] = useState(false);

  // IAP
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [products, setProducts] = useState([]);
  const [iapReady, setIapReady] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [currentPurchaseAttempt, setCurrentPurchaseAttempt] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const isDark = theme === 'dark';

  const settings = [
    { id: 'about', title: 'About', subtitle: 'App information' },
    // { id: 'help', title: 'Help & Support', subtitle: 'Get assistance' },
    { id: 'upgrade', title: 'Plans', subtitle: 'Choose a subscription plan' },
    { id: 'billing', title: 'Billing & Subscription', subtitle: 'Manage your subscription' },
  ];

  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$2.99/month',
      billingPrice: '$2.99',
      description: 'Unlimited folders & items\nCancel anytime',
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$24.99/year',
      billingPrice: '$24.99',
      description: 'Unlimited folders & items\nSave 30%',
    },
  ];

  useEffect(() => {
    loadUserData();
    initializeIAP();

    const timeout = setTimeout(() => {
      setIapReady(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const initializeIAP = async () => {
    if (!IAPService.isAvailable()) {
      setIapReady(true);
      return;
    }

    try {
      const initialized = await IAPService.initialize();
      setIapReady(initialized || true);
      if (initialized) await fetchProducts();
    } catch (error) {
      console.error('[PROFILE] Error initializing IAP:', error);
      setIapReady(true);
    }
  };

  const fetchProducts = async (showErrors = false) => {
    if (!IAPService.isAvailable()) return [];
    try {
      setLoadingProducts(true);
      const results = await IAPService.getProducts();
      if (results?.length) {
        setProducts(results);
        return results;
      }
      setProducts([]);
      return [];
    } catch (err) {
      setProducts([]);
      return [];
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      setUser(authUser);

      const profileData = await getProfile(authUser.id);
      setProfile(profileData);

      if (profileData) {
        setEditForm({ name: profileData.name || '' });

        // Determine plan from profile
        if (profileData.is_pro_version) {
          const plan = profileData.plan || 'pro';
          let planName = 'Pro Plan';
          let price = '';

          if (plan === 'yearly') {
            planName = 'Yearly Plan';
            price = '$24.99/year';
          } else if (plan === 'monthly') {
            planName = 'Monthly Plan';
            price = '$2.99/month';
          }

          setCurrentPlan(planName);
          setSubscriptionDisplay({
            plan: planName,
            price,
            renewalDate: profileData.purchase_time,
            status: 'active',
            isCancelled: false,
          });
        } else {
          setCurrentPlan('Free');
          setSubscriptionDisplay({
            plan: 'Free Plan',
            price: '$0.00',
            renewalDate: null,
            status: 'free',
            isCancelled: false,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updatedProfile = await updateProfile(user.id, { name: editForm.name });
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      Alert.alert('Incomplete Form', 'Please fill in all fields before submitting.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          message: contactForm.message,
        },
      });

      if (error) {
        Alert.alert('Error', 'Failed to send message. Please try again later.');
        return;
      }

      Alert.alert('Message Sent!', "Thank you for your feedback. We'll get back to you as soon as possible.", [
        {
          text: 'OK',
          onPress: () => {
            setIsContactModalVisible(false);
            setContactForm({ name: '', email: '', subject: '', message: '' });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    }
  };

  const handleSubscribe = async (planId) => {
    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return;

    try {
      if (!IAPService.isAvailable()) {
        if (__DEV__) {
          Alert.alert('Development Mode', 'IAP is not available. Simulate a purchase for testing?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Purchase',
              onPress: async () => {
                try {
                  const { data: { user: authUser } } = await supabase.auth.getUser();
                  if (!authUser) throw new Error('Not authenticated');

                  const now = new Date().toISOString();

                  // Generate incrementing subscription_id
                  const { count: planCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .like('subscription_id', `${planId}_plan_%`);
                  const nextPlanNum = (planCount || 0) + 1;

                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                      plan: planId,
                      is_pro_version: true,
                      subscription_id: `${planId}_plan_${nextPlanNum}`,
                      purchase_time: now,
                      price: plan.billingPrice,
                      product_id: PLAN_PRODUCT_IDS[planId] || planId,
                      updated_at: now,
                    })
                    .eq('user_id', authUser.id);

                  if (updateError) throw updateError;

                  setIsBillingModalVisible(false);
                  await loadUserData();
                  Alert.alert('Success (Simulated)', 'Your subscription has been activated.');
                } catch (error) {
                  Alert.alert('Error', 'Failed to activate test subscription.');
                }
              },
            },
          ]);
        } else {
          Alert.alert('Purchases Unavailable', 'In-app purchases are not available on this device.');
        }
        return;
      }

      const list = products.length ? products : await fetchProducts(true);
      const productId = PLAN_PRODUCT_IDS[planId];
      const product = list.find((p) => (p.id ?? p.productId) === productId);

      if (!product) {
        Alert.alert('Plan not available', "We couldn't find that plan. Please try again.");
        return;
      }

      setCurrentPurchaseAttempt(planId);
      await handlePurchase(product.id ?? product.productId);
    } catch (error) {
      setCurrentPurchaseAttempt(null);
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    }
  };

  const handlePurchase = async (productId) => {
    try {
      await IAPService.purchaseProduct(productId);

      const lastPurchase = IAPService.getLastPurchaseResult();
      const txId = lastPurchase?.id ?? lastPurchase?.transactionId ?? '';

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const now = new Date().toISOString();
        const product = products.find((p) => (p.id ?? p.productId) === productId);
        const purchasePrice = product?.localizedPrice ?? product?.price ?? '';
        const planType = productId.includes('yearly') ? 'yearly' : 'monthly';

        await supabase
          .from('profiles')
          .update({
            plan: planType,
            is_pro_version: true,
            purchase_time: now,
            price: String(purchasePrice),
            subscription_id: txId,
            product_id: productId,
            updated_at: now,
          })
          .eq('user_id', authUser.id);
      }

      setIsBillingModalVisible(false);
      setCurrentPurchaseAttempt(null);
      await loadUserData();
      Alert.alert('Success!', 'Your subscription has been activated. Thank you!');
    } catch (e) {
      setCurrentPurchaseAttempt(null);
      const msg = String(e?.message || e);
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        Alert.alert('Purchase Failed', msg);
      }
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will lose access to Pro features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;

              await supabase
                .from('profiles')
                .update({
                  is_pro_version: false,
                  plan: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', authUser.id);

              await loadUserData();

              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.', [
                { text: 'OK', onPress: () => setIsBillingManagementModalVisible(false) },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          },
        },
      ]
    );
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

  const handleSettingPress = (settingId) => {
    switch (settingId) {
      case 'upgrade':
        setIsBillingModalVisible(true);
        break;
      case 'billing':
        setIsBillingManagementModalVisible(true);
        break;
      case 'help':
        setIsContactModalVisible(true);
        break;
      case 'about':
        setIsAboutModalVisible(true);
        break;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: '#0b0f14' }, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, isDark && { color: '#aaa' }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0b0f14' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: '#151a21', borderBottomColor: '#232932' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, isDark && { color: '#e0e0e0' }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#e7ebf0' }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, isDark && { backgroundColor: '#2a3038' }]}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0).toUpperCase() || user?.id?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          
          {isEditing ? (
            <View style={styles.editSection}>
              <TextInput
                style={[styles.editInput, isDark && { backgroundColor: '#1a1f27', borderColor: '#333', color: '#e7ebf0' }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ name: text })}
                placeholder="Enter your name"
                placeholderTextColor={isDark ? '#666' : '#999'}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelButton, isDark && { borderColor: '#333' }]} onPress={() => setIsEditing(false)}>
                  <Text style={[styles.cancelButtonText, isDark && { color: '#aaa' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={[styles.name, isDark && { color: '#e7ebf0' }]}>{profile?.name || 'Tap to set name'}</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.userId, isDark && { color: '#8a9099' }]}>
            {user?.id ? `ID: ${user.id.substring(0, 8)}...` : ''}
          </Text>
          <View style={[styles.planBadge, isDark && { backgroundColor: '#2a3038', borderColor: '#3a4048' }]}>
            <Text style={[styles.planBadgeText, isDark && { color: '#e7ebf0' }]}>{currentPlan}</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, isDark && { color: '#e7ebf0' }]}>Settings</Text>

          {/* Dark Mode Toggle */}
          <View style={[styles.settingItem, isDark && { backgroundColor: '#151a21', borderColor: '#232932' }]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, isDark && { color: '#e7ebf0' }]}>Dark Mode</Text>
              <Text style={[styles.settingSubtitle, isDark && { color: '#8a9099' }]}>Toggle dark appearance</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ddd', true: '#1e40af' }}
              thumbColor={isDark ? '#e7ebf0' : '#fff'}
              ios_backgroundColor="#ddd"
            />
          </View>

          {settings.map((setting) => (
            <TouchableOpacity
              key={setting.id}
              style={[styles.settingItem, isDark && { backgroundColor: '#151a21', borderColor: '#232932' }]}
              onPress={() => handleSettingPress(setting.id)}
            >
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, isDark && { color: '#e7ebf0' }]}>{setting.title}</Text>
                <Text style={[styles.settingSubtitle, isDark && { color: '#8a9099' }]}>{setting.subtitle}</Text>
              </View>
              <Text style={[styles.settingArrow, isDark && { color: '#8a9099' }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* About Modal */}
      <Modal visible={isAboutModalVisible} transparent animationType="fade" onRequestClose={() => setIsAboutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && { backgroundColor: '#151a21', borderColor: '#232932' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, isDark && { color: '#e7ebf0' }]}>About Inventory Tracker</Text>

              <View style={styles.aboutSection}>
                <Text style={[styles.aboutHeading, isDark && { color: '#e7ebf0' }]}>Our Mission</Text>
                <Text style={[styles.aboutText, isDark && { color: '#8a9099' }]}>
                  We're building tools to help you organize and track your inventory effortlessly. Whether it's clothing, collectibles, or any personal items — know what you own, always.
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={[styles.aboutHeading, isDark && { color: '#e7ebf0' }]}>Features</Text>
                <Text style={[styles.aboutText, isDark && { color: '#8a9099' }]}>
                  {'• Organize items into folders\n• Track quantity, brand, color, size\n• Filter and sort your inventory\n• Import from Excel spreadsheets\n• Cloud sync across devices\n• Dark mode support'}
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={[styles.aboutHeading, isDark && { color: '#e7ebf0' }]}>Version</Text>
                <Text style={[styles.aboutText, isDark && { color: '#8a9099' }]}>1.0.2</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsAboutModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact / Help Modal */}
      <Modal visible={isContactModalVisible} transparent animationType="fade" onRequestClose={() => setIsContactModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalCard, isDark && { backgroundColor: '#151a21', borderColor: '#232932' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.modalTitle, isDark && { color: '#e7ebf0' }]}>Help & Support</Text>
                  <Text style={[styles.modalSubtitle, isDark && { color: '#8a9099' }]}>
                    Send us a message and we'll get back to you as soon as possible.
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#e7ebf0' }]}>Name</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: '#1a1f27', borderColor: '#333', color: '#e7ebf0' }]}
                      placeholder="Your name"
                      placeholderTextColor={isDark ? '#555' : '#999'}
                      value={contactForm.name}
                      onChangeText={(text) => setContactForm({ ...contactForm, name: text })}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#e7ebf0' }]}>Email</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: '#1a1f27', borderColor: '#333', color: '#e7ebf0' }]}
                      placeholder="your@email.com"
                      placeholderTextColor={isDark ? '#555' : '#999'}
                      value={contactForm.email}
                      onChangeText={(text) => setContactForm({ ...contactForm, email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#e7ebf0' }]}>Subject</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: '#1a1f27', borderColor: '#333', color: '#e7ebf0' }]}
                      placeholder="What's this about?"
                      placeholderTextColor={isDark ? '#555' : '#999'}
                      value={contactForm.subject}
                      onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#e7ebf0' }]}>Message</Text>
                    <TextInput
                      style={[styles.input, styles.messageInput, isDark && { backgroundColor: '#1a1f27', borderColor: '#333', color: '#e7ebf0' }]}
                      placeholder="Tell us how we can help..."
                      placeholderTextColor={isDark ? '#555' : '#999'}
                      value={contactForm.message}
                      onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>

                <View style={styles.contactActions}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleContactSubmit}>
                    <Text style={styles.submitButtonText}>Send Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cancelModalBtn, isDark && { borderColor: '#333' }]} onPress={() => setIsContactModalVisible(false)}>
                    <Text style={[styles.cancelModalBtnText, isDark && { color: '#8a9099' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Plans / Upgrade Modal */}
      <Modal visible={isBillingModalVisible} transparent animationType="fade" onRequestClose={() => setIsBillingModalVisible(false)}>
        <LinearGradient colors={isDark ? ['#050810', '#0d1120', '#08091a'] : ['#f0f4ff', '#e8eeff', '#f5f7ff']} style={styles.gradientOverlay}>
          <TouchableOpacity style={[styles.closeButton, !isDark && { backgroundColor: 'rgba(0, 0, 0, 0.06)' }]} onPress={() => setIsBillingModalVisible(false)}>
            <Text style={[styles.closeButtonText, !isDark && { color: '#333' }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.plansScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoGlow, !isDark && { shadowOpacity: 0.3 }]}>
                <Image source={isDark ? require('../assets/dark-icon.png') : require('../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
            </View>

            <View style={styles.plansHeader}>
              <Text style={[styles.plansTitle, !isDark && { color: '#1a1a2e' }]}>Unlock Full Inventory Power</Text>
              <Text style={[styles.plansSubtitle, !isDark && { color: '#666' }]}>
                Stop losing track of what you own. Unlimited folders, items, and more. Organize everything in one place.
              </Text>
            </View>

            <View style={styles.plansContainer}>
              {subscriptionPlans.map((plan) => {
                const isActivePlan =
                  subscriptionDisplay.status === 'active' &&
                  subscriptionDisplay.plan.toLowerCase().includes(plan.id);

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      !isDark && styles.planCardLight,
                      selectedPlan === plan.id && styles.selectedPlanCard,
                      selectedPlan === plan.id && !isDark && styles.selectedPlanCardLight,
                      isActivePlan && styles.disabledPlan,
                    ]}
                    onPress={() => !isActivePlan && setSelectedPlan(plan.id)}
                    disabled={isActivePlan}
                  >
                    {isActivePlan && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>CURRENT PLAN</Text>
                      </View>
                    )}
                    {plan.id === 'yearly' && !isActivePlan && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    )}
                    <View style={[styles.planRadio, isActivePlan && { borderColor: '#5a6069' }, !isDark && { borderColor: '#999' }]}>
                      {selectedPlan === plan.id && !isActivePlan && <View style={styles.planRadioSelected} />}
                    </View>
                    <View style={styles.planContent}>
                      <Text style={[styles.planName, isActivePlan && { color: '#5a6069' }, !isDark && !isActivePlan && { color: '#1a1a2e' }]}>{plan.name}</Text>
                    </View>
                    <View style={styles.planPricing}>
                      <Text style={[styles.planPrice, !isDark && { color: '#666' }]}>{formatPrice(plan.id, plan.price)}</Text>
                      {plan.id === 'yearly' && <Text style={styles.planSaveText}>Save 30%</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.subscribeContainer}>
            <TouchableOpacity
              style={[styles.subscribeButton, (!iapReady || loadingProducts || currentPurchaseAttempt) && { opacity: 0.6 }]}
              onPress={() => handleSubscribe(selectedPlan)}
              disabled={!iapReady || loadingProducts || !!currentPurchaseAttempt}
            >
              <LinearGradient colors={['#1e40af', '#1e3a8a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subscribeGradient}>
                <Text style={styles.subscribeText}>
                  {!iapReady ? 'Connecting...' : loadingProducts ? 'Loading...' : currentPurchaseAttempt ? 'Processing...' : 'Get Started'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.cancelAnytimeText, !isDark && { color: '#999' }]}>Cancel Anytime. No Commitment.</Text>
          </View>
        </LinearGradient>
      </Modal>

      {/* Billing Management Modal */}
      <Modal visible={isBillingManagementModalVisible} transparent animationType="fade" onRequestClose={() => setIsBillingManagementModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && { backgroundColor: '#151a21', borderColor: '#232932' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, isDark && { color: '#e7ebf0' }]}>Billing & Subscription</Text>

              <View style={styles.currentPlanSection}>
                <Text style={[styles.currentPlanLabel, isDark && { color: '#e7ebf0' }]}>Current Plan</Text>
                <View style={[styles.planDetailsCard, isDark && { backgroundColor: '#0b0f14', borderColor: '#232932' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planDetailsName, isDark && { color: '#e7ebf0' }]}>{subscriptionDisplay.plan}</Text>
                    <Text style={[styles.planDetailsPrice, isDark && { color: '#8a9099' }]}>{subscriptionDisplay.price}</Text>
                  </View>
                  {subscriptionDisplay.status === 'active' && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>Active</Text>
                    </View>
                  )}
                </View>

                {subscriptionDisplay.renewalDate && (
                  <View style={[styles.renewalCard, isDark && { backgroundColor: '#0b0f14', borderColor: '#232932' }]}>
                    <Text style={[styles.renewalLabel, isDark && { color: '#8a9099' }]}>Purchase Date</Text>
                    <Text style={[styles.renewalDate, isDark && { color: '#e7ebf0' }]}>
                      {new Date(subscriptionDisplay.renewalDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                )}

                <View style={styles.billingActions}>
                  <TouchableOpacity
                    style={styles.upgradeActionBtn}
                    onPress={() => {
                      setIsBillingManagementModalVisible(false);
                      setIsBillingModalVisible(true);
                    }}
                  >
                    <Text style={styles.upgradeActionBtnText}>
                      {subscriptionDisplay.status === 'active' ? 'Change Plan' : 'Upgrade to Pro'}
                    </Text>
                  </TouchableOpacity>

                  {subscriptionDisplay.status === 'active' && (
                    <TouchableOpacity style={styles.cancelSubBtn} onPress={handleCancelSubscription}>
                      <Text style={styles.cancelSubBtnText}>Cancel Subscription</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.billingCloseBtn} onPress={() => setIsBillingManagementModalVisible(false)}>
              <Text style={[styles.billingCloseBtnText, isDark && { color: '#8a9099' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 36,
    color: '#333',
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  editSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  settingArrow: {
    fontSize: 24,
    color: '#999',
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalCloseBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // About
  aboutSection: {
    marginBottom: 20,
  },
  aboutHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },

  // Contact
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  messageInput: {
    height: 110,
    paddingTop: 12,
  },
  contactActions: {
    gap: 10,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelModalBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  // Plans modal
  gradientOverlay: {
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
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  plansScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 20,
    justifyContent: 'center',
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
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  plansHeader: {
    marginBottom: 40,
    alignItems: 'center',
  },
  plansTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 36,
  },
  plansSubtitle: {
    fontSize: 15,
    color: '#a0a8b8',
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
  selectedPlanCard: {
    borderColor: '#1e40af',
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
      },
      android: { elevation: 4 },
    }),
  },
  selectedPlanCardLight: {
    borderColor: '#1e40af',
    backgroundColor: 'rgba(30, 64, 175, 0.08)',
  },
  planCardLight: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  disabledPlan: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  activeBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  bestValueBadge: {
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
  bestValueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.8,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#a0a8b8',
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
    color: '#fff',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0a8b8',
  },
  planSaveText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  subscribeContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  subscribeButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cancelAnytimeText: {
    fontSize: 12,
    color: '#a0a8b8',
    textAlign: 'center',
    marginTop: 12,
  },

  // Billing management
  currentPlanSection: {
    marginBottom: 16,
  },
  currentPlanLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  planDetailsCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planDetailsName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planDetailsPrice: {
    fontSize: 16,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  renewalCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  renewalLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  renewalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  billingActions: {
    gap: 12,
  },
  upgradeActionBtn: {
    backgroundColor: '#1e40af',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  upgradeActionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelSubBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelSubBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  billingCloseBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  billingCloseBtnText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});
