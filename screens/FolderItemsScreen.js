import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { ItemList } from '../components/ItemList';
import { ItemForm } from '../components/ItemForm';

export const FolderItemsScreen = ({ folderId, onBack, theme, toggleTheme }) => {
  const { folders, items, addItem, deleteItem, updateQuantity, saveQuantity, updateItem, updateItemImage } = useInventoryStorage();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filter, setFilter] = useState({ brands: [], colors: [], sizes: [] });
  const [sort, setSort] = useState('newest');
  const [pendingFilter, setPendingFilter] = useState({ brands: [], colors: [], sizes: [] });
  const [pendingSort, setPendingSort] = useState('newest');
  const unsavedChangesRef = useRef({});

  const folder = useMemo(() => {
    return folders.find((f) => f.id === folderId);
  }, [folders, folderId]);

  const folderItems = useMemo(() => {
    return items.filter((item) => item.folderId === folderId);
  }, [items, folderId]);

  // Unique filter options from items
  const colorOptions = useMemo(() => {
    const set = new Set();
    folderItems.forEach(item => { if (item.color) set.add(item.color); });
    return Array.from(set);
  }, [folderItems]);
  const sizeOptions = useMemo(() => {
    const set = new Set();
    folderItems.forEach(item => { if (item.size) set.add(item.size); });
    return Array.from(set);
  }, [folderItems]);
  const brandOptions = useMemo(() => {
    const set = new Set();
    folderItems.forEach(item => { if (item.brand) set.add(item.brand); });
    return Array.from(set);
  }, [folderItems]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = folderItems.filter((item) => {
      if (filter.brands.length && (!item.brand || !filter.brands.includes(item.brand))) return false;
      if (filter.colors.length && (!item.color || !filter.colors.includes(item.color))) return false;
      if (filter.sizes.length && (!item.size || !filter.sizes.includes(item.size))) return false;
      return true;
    });
    switch (sort) {
      case 'name-az':
        result = result.slice().sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-za':
        result = result.slice().sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result = result.slice().sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        result = result.slice().sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'qty-high':
        result = result.slice().sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
        break;
      case 'qty-low':
        result = result.slice().sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        break;
      default:
        break;
    }
    return result;
  }, [folderItems, filter, sort]);

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
    <View style={[styles.container, theme === 'dark' && { backgroundColor: '#181818' }] }>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, theme === 'dark' ? { backgroundColor: '#181818', borderBottomColor: '#333' } : { backgroundColor: '#fff' }] }>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={[styles.backText, theme === 'dark' && { color: '#e0e0e0' }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, theme === 'dark' && { color: '#e0e0e0' }]}>{folder.name}</Text>
          <Text style={[styles.subtitle, theme === 'dark' && { color: '#888' }]}>{folderItems.length} items</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Text style={[styles.filterButtonText, theme === 'dark' && { color: '#e0e0e0' }]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bottom Sheet */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheet, theme === 'dark' && { backgroundColor: '#23272F' }] }>
            <Text style={[styles.filterTitle, theme === 'dark' && { color: '#e0e0e0' }]}>Sort</Text>
            <View style={styles.sortSection}>
              {[
                { key: 'name-az', label: 'Name (A–Z)' },
                { key: 'name-za', label: 'Name (Z–A)' },
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
                { key: 'qty-high', label: 'Quantity (high → low)' },
                { key: 'qty-low', label: 'Quantity (low → high)' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortOption, pendingSort === opt.key && styles.sortOptionSelected, theme === 'dark' && { borderColor: '#333' }]}
                  onPress={() => setPendingSort(opt.key)}
                >
                  <Text style={[styles.sortOptionText, pendingSort === opt.key && styles.sortOptionTextSelected, theme === 'dark' && { color: '#e0e0e0' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterTitle, theme === 'dark' && { color: '#e0e0e0', marginTop: 16 }]}>Quick Filters</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {/* Color chips */}
              {colorOptions.length > 0 && <Text style={[styles.filterLabel, theme === 'dark' && { color: '#e0e0e0' }]}>Color</Text>}
              <View style={styles.chipRow}>
                {colorOptions.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.chip,
                      pendingFilter.colors.includes(color) && styles.chipSelected,
                      { borderColor: pendingFilter.colors.includes(color) ? '#23272F' : 'transparent', borderWidth: 2 }
                    ]}
                    onPress={() => setPendingFilter(f => ({ ...f, colors: f.colors.includes(color) ? f.colors.filter(c => c !== color) : [...f.colors, color] }))}
                  >
                    <Text style={[styles.chipText, { color: '#23272F' }]}>{color}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Size chips */}
              {sizeOptions.length > 0 && <Text style={[styles.filterLabel, theme === 'dark' && { color: '#e0e0e0' }]}>Size</Text>}
              <View style={styles.chipRow}>
                {sizeOptions.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.chip, pendingFilter.sizes.includes(size) && styles.chipSelected]}
                    onPress={() => setPendingFilter(f => ({ ...f, sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size] }))}
                  >
                    <Text style={[styles.chipText, pendingFilter.sizes.includes(size) && styles.chipTextSelected]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Brand chips */}
              {brandOptions.length > 0 && <Text style={[styles.filterLabel, theme === 'dark' && { color: '#e0e0e0' }]}>Brand</Text>}
              <View style={styles.chipRow}>
                {brandOptions.map(brand => (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.chip, pendingFilter.brands.includes(brand) && styles.chipSelected]}
                    onPress={() => setPendingFilter(f => ({ ...f, brands: f.brands.includes(brand) ? f.brands.filter(b => b !== brand) : [...f.brands, brand] }))}
                  >
                    <Text style={[styles.chipText, pendingFilter.brands.includes(brand) && styles.chipTextSelected]}>{brand}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.bottomActionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton, theme === 'dark' && { borderColor: '#444' }]}
                onPress={() => {
                  setPendingFilter({ brands: [], colors: [], sizes: [] });
                  setPendingSort('newest');
                }}
              >
                <Text style={[styles.clearButtonText, theme === 'dark' && { color: '#bebfc1' }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.applyButton, theme === 'dark' && { backgroundColor: '#3A5AFF' }]}
                onPress={() => {
                  setFilter(pendingFilter);
                  setSort(pendingSort);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={[styles.applyButtonText, theme === 'dark' && { color: '#fff' }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ItemList
        items={filteredItems}
        onUpdateQuantity={updateQuantity}
        onDeleteItem={deleteItem}
        onItemPress={handleItemPress}
        onSaveQuantity={saveQuantity}
        onChangeTracked={handleChangeTracked}
        onSaveSuccess={handleSaveQuantitySuccess}
        theme={theme}
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
        folderName={folder?.name || ''}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bottomActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  actionButton: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    borderWidth: 2,
    borderColor: '#3A5AFF',
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: '#3A5AFF',
    fontWeight: '700',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#3A5AFF',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    alignSelf: 'center',
    backgroundColor: '#3A5AFF',
    borderRadius: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: '#23272F',
  },
  chipText: {
    color: '#23272F',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#23272F',
    fontWeight: 'bold',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 340,
    maxHeight: '80%',
  },
  sortSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sortOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 6,
    marginBottom: 6,
  },
  sortOptionSelected: {
    borderColor: '#3A5AFF',
  },
  sortOptionText: {
    color: '#23272F',
    fontWeight: '600',
  },
  sortOptionTextSelected: {
    color: '#23272F',
    fontWeight: 'bold',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#23272F',
    textAlign: 'center',
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    color: '#23272F',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#23272F',
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
