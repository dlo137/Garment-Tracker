import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, FlatList, Alert } from 'react-native';
import IAPService, { PRODUCT_IDS } from '../lib/IApservice';

export default function SubscriptionScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    IAPService.init();
    fetchProducts();
    return () => IAPService.destroy();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const subs = await IAPService.fetchSubscriptions();
    setProducts(subs);
    setLoading(false);
  };

  const handlePurchase = async (productId) => {
    try {
      await IAPService.purchaseSubscription(productId);
      Alert.alert('Success', 'Purchase successful!');
    } catch (e) {
      Alert.alert('Error', 'Purchase failed.');
    }
  };

  const handleRestore = async () => {
    await IAPService.restorePurchases();
    Alert.alert('Restored', 'Purchases restored.');
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Subscriptions</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.productId}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <Text>{item.title}</Text>
            <Text>{item.localizedPrice}</Text>
            <Button title="Subscribe" onPress={() => handlePurchase(item.productId)} />
          </View>
        )}
      />
      <Button title="Restore Purchases" onPress={handleRestore} />
    </View>
  );
}
