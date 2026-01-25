import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { ItemList } from '../components/ItemList';
import { ItemForm } from '../components/ItemForm';

export const InventoryScreen = () => {
  const { items, isLoading, addItem, deleteItem, updateQuantity } = useInventoryStorage();
  const [modalVisible, setModalVisible] = useState(false);

  const handleAddItem = (name, quantity, imageUri) => {
    addItem(name, quantity, imageUri);
    setModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A5AFF" />
        <Text style={styles.loadingText}>Loading your inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Modern Top Bar with Blur/Gradient */}
      <View style={styles.topBarWrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint="light" style={styles.topBarBlur}>
            <LinearGradient
              colors={["#f8fafc", "#e9e9ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topBarGradient}
            >
              <Text style={styles.title}>Inventory</Text>
              <Text style={styles.subtitle}>{items.length} items</Text>
            </LinearGradient>
          </BlurView>
        ) : (
          <LinearGradient
            colors={["#f8fafc", "#e9e9ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topBarGradient}
          >
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>{items.length} items</Text>
          </LinearGradient>
        )}
      </View>

      <View style={styles.listWrapper}>
        <ItemList
          items={items}
          onUpdateQuantity={updateQuantity}
          onDeleteItem={deleteItem}
          theme={theme}
        />
      </View>

      {/* Premium Floating Action Button */}
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.addButtonGlass}>
          <Text style={styles.addButtonText}>+</Text>
        </View>
      </TouchableOpacity>

      <ItemForm
        visible={modalVisible}
        onSubmit={handleAddItem}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  topBarWrapper: {
    width: '100%',
    overflow: 'hidden',
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  topBarBlur: {
    width: '100%',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  topBarGradient: {
    width: '100%',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#23272F',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 0,
    letterSpacing: 0.1,
  },
  listWrapper: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 72,
    height: 72,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  addButtonGlass: {
    width: 72,
    height: 72,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(220,220,230,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { backdropFilter: 'blur(16px)' },
      android: {},
    }),
  },
  addButtonText: {
    color: '#3A5AFF',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 44,
    textShadowColor: 'rgba(58,90,255,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
