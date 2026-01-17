import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { ItemList } from '../components/ItemList';
import { ItemForm } from '../components/ItemForm';

export const FolderItemsScreen = ({ folderId, onBack }) => {
  const { folders, items, addItem, deleteItem, updateQuantity, saveQuantity, updateItem, updateItemImage } = useInventoryStorage();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const unsavedChangesRef = useRef({});

  const folder = useMemo(() => {
    return folders.find((f) => f.id === folderId);
  }, [folders, folderId]);

  const folderItems = useMemo(() => {
    return items.filter((item) => item.folderId === folderId);
  }, [items, folderId]);

  const handleAddItem = (name, quantity, brand, color, garmentType, size, notes) => {
    addItem(name, quantity, brand, color, garmentType, size, notes, folderId);
    setModalVisible(false);
  };

  const handleEditItem = (name, quantity, brand, color, garmentType, size, notes) => {
    if (selectedItem) {
      updateItem(selectedItem.id, name, quantity, brand, color, garmentType, size, notes);
      setModalVisible(false);
      setEditMode(false);
      setSelectedItem(null);
    }
  };

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setEditMode(true);
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditMode(false);
    setSelectedItem(null);
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedItem(null);
    setModalVisible(true);
  };

  const handleBackPress = useCallback(() => {
    const unsavedItems = Object.keys(unsavedChangesRef.current);
    
    if (unsavedItems.length === 0) {
      onBack();
      return;
    }

    // Build the changes display string
    const changesDisplay = unsavedItems.map((itemId) => {
      const change = unsavedChangesRef.current[itemId];
      return `${change.oldQuantity} → ${change.newQuantity} ${change.itemName}`;
    }).join('\n');

    Alert.alert(
      'Unsaved Changes',
      `Do you want to save your changes?\n\n${changesDisplay}`,
      [
        {
          text: 'Discard',
          onPress: () => {
            unsavedChangesRef.current = {};
            onBack();
          },
          style: 'destructive',
        },
        {
          text: 'Save',
          onPress: async () => {
            // Save all unsaved changes
            for (const itemId of unsavedItems) {
              const change = unsavedChangesRef.current[itemId];
              await saveQuantity(itemId, change.newQuantity);
            }
            unsavedChangesRef.current = {};
            onBack();
          },
        },
      ]
    );
  }, [onBack, saveQuantity]);

  const handleChangeTracked = useCallback((itemId, oldQuantity, newQuantity, itemName) => {
    if (newQuantity !== oldQuantity) {
      unsavedChangesRef.current[itemId] = {
        oldQuantity,
        newQuantity,
        itemName,
      };
    } else {
      delete unsavedChangesRef.current[itemId];
    }
  }, []);

  const handleSaveQuantitySuccess = useCallback((itemId) => {
    // Clear the unsaved change once save is confirmed
    delete unsavedChangesRef.current[itemId];
  }, []);

  if (!folder) {
    return (
      <View style={styles.container}>
        <Text>Folder not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{folder.name}</Text>
          <Text style={styles.subtitle}>{folderItems.length} items</Text>
        </View>
      </View>

      <ItemList
        items={folderItems}
        onUpdateQuantity={updateQuantity}
        onDeleteItem={deleteItem}
        onItemPress={handleItemPress}
        onSaveQuantity={saveQuantity}
        onChangeTracked={handleChangeTracked}
        onSaveSuccess={handleSaveQuantitySuccess}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleOpenAddModal}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <ItemForm
        visible={modalVisible}
        onSubmit={editMode ? handleEditItem : handleAddItem}
        onCancel={handleCancel}
        editMode={editMode}
        itemToEdit={selectedItem}
        onImageUpdate={updateItemImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 40,
    color: '#007AFF',
    fontWeight: '300',
    lineHeight: 40,
  },
  headerContent: {
    flex: 1,
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
