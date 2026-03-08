import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, Modal, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { FolderList } from '../components/FolderList';
import { FolderForm } from '../components/FolderForm';
import excelIcon from '../assets/excel.png';
import profileIcon from '../assets/profile-icon.png';
import profileIconDark from '../assets/profile-icon-dark.png';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabaseClient';
import { restorePurchases as iapRestorePurchases } from '../lib/IApservice';
import { updateProfile } from '../lib/profileService';

export const FolderListScreen = ({ onFolderPress, theme, toggleTheme, onNavigateToSubscription, onNavigateToProfile, onNavigateToSignUp, onNavigateToSignIn }) => {
  const { folders, items, isLoading, addFolder, renameFolder, deleteFolder, importFromExcel, profile, refreshAll, refreshProfile } = useInventoryStorage();
  const isPro = profile?.is_pro_version === true;
  const atFolderLimit = !isPro && folders.length >= 1;
  const [modalVisible, setModalVisible] = useState(false);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [lockedFolder, setLockedFolder] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // Refresh profile when screen regains focus (e.g., returning from SubscriptionScreen)
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  // When the user upgrades to pro, unlock the locked folder and save it
  useEffect(() => {
    if (isPro && lockedFolder) {
      const folderName = lockedFolder.name;
      setLockedFolder(null);
      addFolder(folderName);
    }
  }, [isPro]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);
    };
    fetchUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAnonymous = !authUser?.email;
  const userEmail = authUser?.email;

  const handleSignOut = async () => {
    setAccountMenuVisible(false);
    try {
      await supabase.auth.signOut();
      // Sign back in anonymously so app still works
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // Initialize profile for the new anonymous user
      if (data?.user) {
        const { initializeProfile } = require('../lib/profileService');
        await initializeProfile(data.user.id);
      }
      // Refresh all data to reflect the new empty guest account
      await refreshAll();
      Alert.alert('Signed Out', 'You have been successfully signed out.');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleRestorePurchases = async () => {
    setAccountMenuVisible(false);
    try {
      const results = await iapRestorePurchases();
      if (results.length > 0) {
        const restoredProduct = results[0];
        const restoredProductId = (restoredProduct?.productId ?? '').toLowerCase();
        const restoredPlan = restoredProductId.includes('yearly') ? 'yearly' : 'monthly';
        const restoredTxId = restoredProduct?.id ?? restoredProduct?.transactionId ?? '';
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const now = new Date().toISOString();
          const periodEnd = new Date();
          periodEnd.setDate(periodEnd.getDate() + (restoredPlan === 'yearly' ? 365 : 30));

          await supabase.from('profiles').update({
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
          }).eq('user_id', user.id);
        }
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases', 'No previous purchases were found.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'Could not connect to store.');
    }
  };

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState(null);
  const [renameText, setRenameText] = useState('');

  const handleRenameFolder = async (folderId, newName) => {
    // iOS passes newName directly from Alert.prompt; Android uses modal
    if (newName) {
      const result = await renameFolder(folderId, newName);
      if (result?.error === 'duplicate') {
        Alert.alert('Folder Exists', 'A folder with this name already exists. Please choose a different name.');
      }
    } else {
      const folder = folders.find(f => f.id === folderId);
      setRenameFolderId(folderId);
      setRenameText(folder?.name || '');
      setRenameModalVisible(true);
    }
  };

  const confirmRename = async () => {
    if (renameText.trim()) {
      const result = await renameFolder(renameFolderId, renameText.trim());
      if (result?.error === 'duplicate') {
        Alert.alert('Folder Exists', 'A folder with this name already exists. Please choose a different name.');
        return;
      }
    }
    setRenameModalVisible(false);
    setRenameFolderId(null);
    setRenameText('');
  };

  const handleAddFolder = async (name) => {
    if (atFolderLimit) {
      setModalVisible(false);
      setLockedFolder({ id: `locked-${Date.now()}`, name, locked: true });
      Alert.alert(
        'Upgrade to Pro',
        'Get unlimited folders, items, and more when upgrading',
        [
          { text: 'Upgrade', onPress: onNavigateToSubscription, style: 'default' },
          { text: 'Maybe Later' },
        ]
      );
      return;
    }

    const result = await addFolder(name);

    if (result?.success) {
      setModalVisible(false);
    } else if (result?.error === 'duplicate') {
      Alert.alert('Folder Exists', 'A folder with this name already exists. Please choose a different name.');
    } else {
      Alert.alert('Error', result?.message || 'Failed to create folder. Please try again.');
    }
  };

  const displayFolders = lockedFolder ? [...folders, lockedFolder] : folders;

  // Reads an Excel file at the given URI and returns an array of row objects
  async function readSpreadsheetToRows(uri, ext) {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    // For .ods, .xlsx, .xls: xlsx can parse all
    const wb = XLSX.read(b64, { type: 'base64' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows;
  }

  // --- Normalization helpers ---
  const normalizeKey = (k) =>
    String(k || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  function normalizeRow(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[normalizeKey(k)] = v;
    // Smart folder assignment: use garment_type/type/clothing_type as folder
    const garmentType = out.garment_type || out.type || out.clothing_type || "Unsorted";
    const name = out.name || out.item || out.item_name || '';
    return {
      folder: String(garmentType).trim() || "Unsorted",
      name: name ? String(name).trim() : "",
      quantity: Number(out.quantity ?? 0) || 0,
      brand: String(out.brand || "").trim(),
      color: String(out.color || "").trim(),
      garment_type: String(garmentType).trim(),
      size: String(out.size || "").trim(),
      notes: String(out.notes || "").trim(),
      image_uri: String(out.image_uri || out.image || "").trim(),
    };
  }

  function sanitizeRows(rows) {
    // Allow all rows, even if name is missing or empty
    return rows.map(normalizeRow);
  }

  // Replace the TODO with the import pipeline
  const handleExcelUpload = async () => {
    // Show alert before file picker
    alert('Your Excel spreadsheet must contain columns for brand, color, type, and size.');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'application/vnd.oasis.opendocument.spreadsheet', // .ods
          'application/pdf', // .pdf
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      console.log('DocumentPicker result:', result);
      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;
      const fileName = asset.name || asset.uri.split('/').pop() || '';
      const ext = fileName.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        alert('PDF import is not supported. Please upload an Excel (.xlsx, .xls) or OpenDocument Spreadsheet (.ods) file.');
        return;
      }
      if (['xlsx', 'xls', 'ods'].includes(ext)) {
        const raw = await readSpreadsheetToRows(asset.uri, ext);
        console.log('Raw spreadsheet rows:', raw);
        const rows = sanitizeRows(raw);
        console.log('Sanitized rows:', rows);
        if (typeof importFromExcel === 'function') {
          const summary = await importFromExcel(rows);
          console.log('Import done:', summary);
        } else {
          console.warn('importFromExcel not available from useInventoryStorage');
        }
      } else {
        alert('Unsupported file type. Please upload an Excel (.xlsx, .xls) or OpenDocument Spreadsheet (.ods) file.');
      }
    } catch (e) {
      console.error('Spreadsheet import failed:', e);
      alert('Failed to import file. Please check the file format and try again.');
    }
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
          <TouchableOpacity
            style={styles.accountButton}
            onPress={() => setAccountMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Image source={theme === 'dark' ? profileIcon : profileIconDark} style={styles.accountIconImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, theme === 'dark' && { color: '#888' }]}>{folders.length} folders</Text>
      </View>
      <FolderList
        folders={displayFolders}
        items={items}
        onDeleteFolder={deleteFolder}
        onRenameFolder={handleRenameFolder}
        onFolderPress={onFolderPress}
        theme={theme}
        onUpgrade={onNavigateToSubscription}
      />
      {/* Floating action buttons: Excel icon only, raised position */}
      <View style={{ position: 'absolute', right: 20, bottom: 36, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={{ marginRight: 90, width: 44, height: 90, justifyContent: 'center', alignItems: 'center' }}
          onPress={handleExcelUpload}
        >
          <Image source={excelIcon} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <FolderForm
        visible={modalVisible}
        onSubmit={handleAddFolder}
        onCancel={() => setModalVisible(false)}
        theme={theme}
        headerColor={theme === 'dark' ? '#181818' : undefined}
        atFolderLimit={atFolderLimit}
        onUpgrade={onNavigateToSubscription}
      />

      {/* Account dropdown menu */}
      <Modal
        visible={accountMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setAccountMenuVisible(false)}
        >
          <View style={[styles.menuCard, theme === 'dark' && { backgroundColor: '#23272F', borderColor: '#333' }]}>
            {(isAnonymous ? [
              { label: 'Guest Profile', onPress: () => { setAccountMenuVisible(false); onNavigateToProfile && onNavigateToProfile(); } },
              { label: 'Upgrade', onPress: () => { setAccountMenuVisible(false); onNavigateToSubscription && onNavigateToSubscription(); } },
              { label: 'Create Account', onPress: () => { setAccountMenuVisible(false); onNavigateToSignUp && onNavigateToSignUp(); } },
              { label: 'Sign In', onPress: () => { setAccountMenuVisible(false); onNavigateToSignIn && onNavigateToSignIn(); } },
            ] : [
              { label: `Profile (${profile?.name || 'User'})`, onPress: () => { setAccountMenuVisible(false); onNavigateToProfile && onNavigateToProfile(); } },
              { label: 'Manage Subscription', onPress: () => { setAccountMenuVisible(false); onNavigateToSubscription && onNavigateToSubscription(); } },
              { label: 'Sign Out', onPress: handleSignOut, isDestructive: true },
            ]).map((item, index, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  index < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme === 'dark' ? '#333' : '#f0f0f0' },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.menuItemLabel,
                  theme === 'dark' && { color: '#e0e0e0' },
                  item.isEmail && { fontSize: 14, color: theme === 'dark' ? '#aaa' : '#666' },
                  item.isDestructive && { color: '#ff3b30' },
                ]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Folder Modal (Android) */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.renameOverlay}
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
        >
          <View style={[styles.renameModal, theme === 'dark' && { backgroundColor: '#2c2c2e' }]}>
            <Text style={[styles.renameTitle, theme === 'dark' && { color: '#fff' }]}>Rename Folder</Text>
            <TextInput
              style={[styles.renameInput, theme === 'dark' && { backgroundColor: '#3a3a3c', color: '#fff', borderColor: '#555' }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Folder name"
              placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => { setRenameModalVisible(false); setRenameFolderId(null); setRenameText(''); }}
              >
                <Text style={[styles.renameCancelText, theme === 'dark' && { color: '#aaa' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameConfirmBtn, !renameText.trim() && { opacity: 0.4 }]}
                onPress={confirmRename}
                disabled={!renameText.trim()}
              >
                <Text style={styles.renameConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  accountIconImage: {
    width: 34,
    height: 34,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 110,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#23272F',
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
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 340,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#23272F',
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    color: '#23272F',
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  renameCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  renameCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  renameConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  renameConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});
