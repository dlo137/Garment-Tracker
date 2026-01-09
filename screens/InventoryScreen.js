import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>{items.length} items</Text>
      </View>

      <ItemList
        items={items}
        onUpdateQuantity={updateQuantity}
        onDeleteItem={deleteItem}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
});
