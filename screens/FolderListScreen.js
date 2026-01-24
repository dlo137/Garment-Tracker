import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ModernThemeSwitch } from '../components/ModernThemeSwitch';
import { StatusBar } from 'expo-status-bar';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { FolderList } from '../components/FolderList';
import { FolderForm } from '../components/FolderForm';

export const FolderListScreen = ({ onFolderPress, theme, toggleTheme }) => {
  const { folders, items, isLoading, addFolder, deleteFolder } = useInventoryStorage();
  const [modalVisible, setModalVisible] = useState(false);

  const handleAddFolder = (name) => {
    addFolder(name);
    setModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, theme === 'dark' && { backgroundColor: '#111' }]}> 
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.header, theme === 'dark' && { backgroundColor: '#181818', borderBottomColor: '#333' }]}> 
        <View style={styles.headerRow}>
          <Text style={[styles.title, theme === 'dark' && { color: '#e0e0e0' }]}>Inventory</Text>
          <View style={{ paddingRight: 12 }}>
            <ModernThemeSwitch value={theme === 'dark'} onToggle={toggleTheme} />
          </View>
        </View>
        <Text style={[styles.subtitle, theme === 'dark' && { color: '#888' }]}>{folders.length} folders</Text>
      </View>
      <FolderList
        folders={folders}
        items={items}
        onDeleteFolder={deleteFolder}
        onFolderPress={onFolderPress}
        theme={theme}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
      <FolderForm
        visible={modalVisible}
        onSubmit={handleAddFolder}
        onCancel={() => setModalVisible(false)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButton: {
    padding: 8,
    marginLeft: 12,
  },
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
    backgroundColor: '#181818',
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
