import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, Modal, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useInventoryStorage } from '../hooks/useInventoryStorage';
import { FolderList } from '../components/FolderList';
import { FolderForm } from '../components/FolderForm';
import importExportIcon from '../assets/import-export.png';
import profileIcon from '../assets/profile-icon.png';
import profileIconDark from '../assets/profile-icon-dark.png';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { supabase } from '../lib/supabaseClient';
import { restorePurchases as iapRestorePurchases } from '../lib/IApservice';
import { updateProfile } from '../lib/profileService';

export const FolderListScreen = ({ onFolderPress, theme, toggleTheme, onNavigateToSubscription, onNavigateToManageSubscription, onNavigateToProfile, onNavigateToSignUp, onNavigateToSignIn }) => {
  const { folders, items, isLoading, loadItems, addFolder, renameFolder, deleteFolder, importFromExcel, profile, refreshAll, refreshProfile } = useInventoryStorage();
  const isPro = profile?.is_pro_version === true;
  const atFolderLimit = !isPro && folders.length >= 1;
  const [modalVisible, setModalVisible] = useState(false);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [importExportSheetVisible, setImportExportSheetVisible] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const isPickingFileRef = useRef(false);
  const [lockedFolder, setLockedFolder] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // Refresh profile and item counts when screen regains focus
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      loadItems();
    }, [refreshProfile, loadItems])
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
    if (isPickingFileRef.current) return;
    isPickingFileRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'application/vnd.oasis.opendocument.spreadsheet', // .ods
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      setImportExportSheetVisible(false);
      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) return;
      const fileName = asset.name || asset.uri.split('/').pop() || '';
      const ext = fileName.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'ods'].includes(ext)) {
        const raw = await readSpreadsheetToRows(asset.uri, ext);
        const rows = sanitizeRows(raw);
        if (typeof importFromExcel === 'function') {
          await importFromExcel(rows);
        }
      } else {
        Alert.alert('Unsupported File', 'Please upload an Excel (.xlsx, .xls) or OpenDocument (.ods) file.');
      }
    } catch (e) {
      console.error('Spreadsheet import failed:', e);
      Alert.alert('Import Failed', 'Could not read the file. Please check the format and try again.');
    } finally {
      isPickingFileRef.current = false;
    }
  };

  const buildExportRows = () => {
    return items.map((item) => {
      const folder = folders.find((f) => f.id === item.folderId);
      return {
        Folder: folder?.name || '',
        Name: item.name || '',
        Brand: item.brand || '',
        Color: item.color || '',
        Size: item.size || '',
        Quantity: item.quantity ?? 0,
        Type: item.garmentType || '',
        Notes: item.notes || '',
      };
    });
  };

  const buildSummary = () => {
    const totalQuantity = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    const byFolder = {}, byType = {}, byColor = {}, bySize = {}, byBrand = {};
    items.forEach((item) => {
      const qty = item.quantity ?? 0;
      const folder = folders.find((f) => f.id === item.folderId)?.name || 'Uncategorized';
      const type   = item.garmentType || 'Unknown';
      const color  = item.color       || 'Unknown';
      const size   = item.size        || 'Unknown';
      const brand  = item.brand       || 'Unknown';
      byFolder[folder] = (byFolder[folder] || 0) + qty;
      byType[type]     = (byType[type]     || 0) + qty;
      byColor[color]   = (byColor[color]   || 0) + qty;
      bySize[size]     = (bySize[size]     || 0) + qty;
      byBrand[brand]   = (byBrand[brand]   || 0) + qty;
    });
    const sorted = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return { totalQuantity, byFolder, byType, byColor, bySize, byBrand, sorted };
  };

  const runExport = async (generateFn, shareOptions) => {
    setExportingFormat(shareOptions.format);
    let fileUri;
    try {
      [fileUri] = await Promise.all([generateFn(), new Promise((r) => setTimeout(r, 1500))]);
      setExportingFormat(null);
      await Sharing.shareAsync(fileUri, {
        mimeType: shareOptions.mimeType,
        dialogTitle: 'Save Inventory',
        UTI: shareOptions.UTI,
      });
      setImportExportSheetVisible(false);
    } catch (e) {
      console.error('Export failed:', e);
      setExportingFormat(null);
      Alert.alert('Export Failed', 'Could not generate the file. Please try again.');
    }
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      Alert.alert('Nothing to Export', 'Add some items to your folders first.');
      return;
    }
    runExport(
      async () => {
        const { totalQuantity, byFolder, byType, byColor, bySize, byBrand, sorted } = buildSummary();
        const wb = XLSX.utils.book_new();

        // Sheet 1 — inventory grouped by folder with per-folder totals
        const header = ['Folder', 'Name', 'Brand', 'Color', 'Size', 'Quantity', 'Type', 'Notes'];
        const inventoryAoa = [header];
        const grouped = {};
        items.forEach((item) => {
          const folderName = folders.find((f) => f.id === item.folderId)?.name || 'Uncategorized';
          if (!grouped[folderName]) grouped[folderName] = [];
          grouped[folderName].push(item);
        });
        Object.entries(grouped).forEach(([folderName, folderItems]) => {
          folderItems.forEach((item) => {
            inventoryAoa.push([folderName, item.name || '', item.brand || '', item.color || '', item.size || '', item.quantity ?? 0, item.garmentType || '', item.notes || '']);
          });
          const folderTotal = folderItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
          inventoryAoa.push([`Total — ${folderName}`, '', '', '', '', folderTotal, '', '']);
          inventoryAoa.push([]); // blank spacer row between folders
        });
        const wsInventory = XLSX.utils.aoa_to_sheet(inventoryAoa);
        XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');

        // Folder summary rows
        const folderSummaryRows = Object.entries(grouped).map(([folderName, folderItems]) => [
          folderName,
          folderItems.length,
          folderItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
        ]);

        // Sheet 2 — summary
        const summaryAoa = [
          ['INVENTORY SUMMARY'],
          ['Generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
          [],
          ['OVERVIEW', '', ''],
          ['Total Unique Items', items.length, ''],
          ['Total Quantity', totalQuantity, ''],
          ['Total Folders', folders.length, ''],
          [],
          ['FOLDER SUMMARY', '', ''],
          ['Folder', 'Unique Items', 'Total Quantity'],
          ...folderSummaryRows,
          ['GRAND TOTAL', items.length, totalQuantity],
          [],
          ['BY TYPE', 'Total Qty', ''],
          ...sorted(byType).map(([k, v]) => [k, v, '']),
          [],
          ['BY COLOR', 'Total Qty', ''],
          ...sorted(byColor).map(([k, v]) => [k, v, '']),
          [],
          ['BY SIZE', 'Total Qty', ''],
          ...sorted(bySize).map(([k, v]) => [k, v, '']),
          [],
          ['BY BRAND', 'Total Qty', ''],
          ...sorted(byBrand).map(([k, v]) => [k, v, '']),
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + `inventory_export_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
        return fileUri;
      },
      {
        format: 'excel',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        UTI: 'com.microsoft.excel.xlsx',
      }
    );
  };

  const handleExportPDF = () => {
    if (items.length === 0) {
      Alert.alert('Nothing to Export', 'Add some items to your folders first.');
      return;
    }
    runExport(
      async () => {
        const { totalQuantity, byFolder, byType, byColor, bySize, byBrand, sorted } = buildSummary();

        const grouped = {};
        items.forEach((item) => {
          const folderName = folders.find((f) => f.id === item.folderId)?.name || 'Uncategorized';
          if (!grouped[folderName]) grouped[folderName] = [];
          grouped[folderName].push(item);
        });

        const inventoryRows = Object.entries(grouped).map(([folderName, folderItems]) => {
          const folderTotal = folderItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
          const rows = folderItems.map((item) => `
            <tr>
              <td>${item.name || '—'}</td>
              <td>${item.brand || '—'}</td>
              <td>${item.color || '—'}</td>
              <td>${item.size || '—'}</td>
              <td style="text-align:center">${item.quantity ?? 0}</td>
              <td>${item.notes || '—'}</td>
            </tr>`).join('');
          const totalRow = `<tr class="folder-total">
            <td colspan="4">Total — ${folderName}</td>
            <td style="text-align:center">${folderTotal}</td>
            <td></td>
          </tr>`;
          return `<tr><td colspan="6" class="folder-header">${folderName}</td></tr>${rows}${totalRow}`;
        }).join('');

        // Per-folder stats for the summary table
        const folderStatRows = Object.entries(grouped).map(([folderName, folderItems]) => {
          const qty = folderItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
          return `<tr>
            <td style="font-weight:600">${folderName}</td>
            <td style="text-align:center">${folderItems.length}</td>
            <td style="text-align:center;font-weight:700">${qty}</td>
          </tr>`;
        }).join('');

        const breakdownTable = (title, data) => `
          <div class="breakdown">
            <div class="breakdown-title">${title}</div>
            <table class="btable">
              <thead><tr><th>Name</th><th style="text-align:right">Total Qty</th></tr></thead>
              <tbody>
                ${sorted(data).map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>`;

        const html = `<!DOCTYPE html>
          <html><head><meta charset="utf-8"/>
            <style>
              body { font-family: -apple-system, Arial, sans-serif; padding: 32px; color: #23272F; font-size: 12px; }
              h1 { font-size: 24px; font-weight: 800; margin-bottom: 2px; }
              h2 { font-size: 17px; font-weight: 800; margin: 28px 0 12px; color: #23272F; }
              .sub { font-size: 12px; color: #888; margin-bottom: 8px; }
              .headline { font-size: 18px; font-weight: 800; color: #23272F; margin-bottom: 20px; }
              .stats { display: flex; gap: 14px; margin-bottom: 28px; flex-wrap: wrap; }
              .stat { background: #3A5AFF; border-radius: 12px; padding: 18px 24px; min-width: 130px; flex: 1; }
              .stat-val { font-size: 36px; font-weight: 900; color: #ffffff; line-height: 1; }
              .stat-label { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.75); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
              .folder-summary-section { background: #f8f9ff; border: 2px solid #3A5AFF; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
              .folder-summary-section h2 { margin: 0 0 14px 0; color: #3A5AFF; font-size: 16px; }
              .ftable { width: 100%; border-collapse: collapse; }
              .ftable th { background: #3A5AFF; color: #fff; padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: left; }
              .ftable th:not(:first-child) { text-align: center; }
              .ftable td { padding: 10px 12px; border-bottom: 1px solid #e0e7ff; font-size: 13px; }
              .ftable tr.grand-total td { background: #3A5AFF; color: #fff; font-weight: 800; font-size: 14px; border-bottom: none; }
              .ftable tr.grand-total td:not(:first-child) { text-align: center; }
              .breakdowns { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
              .breakdown { flex: 1; min-width: 160px; }
              .breakdown-title { font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
              table { width: 100%; border-collapse: collapse; }
              .btable th { background: #f5f5f5; color: #555; padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: left; }
              .btable td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
              th { background: #3A5AFF; color: #fff; padding: 9px 10px; text-align: left; font-weight: 600; }
              td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
              .folder-header { background: #f0f4ff; font-weight: 700; font-size: 13px; color: #3A5AFF; padding: 10px; }
              .folder-total td { background: #f0f4ff; font-weight: 700; font-size: 12px; color: #23272F; border-top: 2px solid #3A5AFF; }
              .divider { border: none; border-top: 1px solid #eee; margin: 28px 0; }
            </style>
          </head>
          <body>
            <h1>Inventory Export</h1>
            <p class="sub">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p class="headline">${items.length} item${items.length !== 1 ? 's' : ''} across ${folders.length} folder${folders.length !== 1 ? 's' : ''}</p>

            <div class="stats">
              <div class="stat"><div class="stat-val">${items.length}</div><div class="stat-label">Unique Items</div></div>
              <div class="stat"><div class="stat-val">${totalQuantity}</div><div class="stat-label">Total Quantity</div></div>
              <div class="stat"><div class="stat-val">${folders.length}</div><div class="stat-label">Folders</div></div>
              <div class="stat"><div class="stat-val">${Object.keys(byBrand).filter(b => b !== 'Unknown').length}</div><div class="stat-label">Brands</div></div>
            </div>

            <div class="folder-summary-section">
              <h2>Folder Summary</h2>
              <table class="ftable">
                <thead>
                  <tr><th>Folder</th><th>Items</th><th>Total Qty</th></tr>
                </thead>
                <tbody>
                  ${folderStatRows}
                  <tr class="grand-total">
                    <td>GRAND TOTAL</td>
                    <td style="text-align:center">${items.length}</td>
                    <td style="text-align:center">${totalQuantity}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="breakdowns">
              ${breakdownTable('By Type', byType)}
              ${breakdownTable('By Color', byColor)}
              ${breakdownTable('By Size', bySize)}
              ${breakdownTable('By Brand', byBrand)}
            </div>

            <hr class="divider"/>
            <h2>Full Inventory</h2>
            <table>
              <thead><tr><th>Name</th><th>Brand</th><th>Color</th><th>Size</th><th>Qty</th><th>Notes</th></tr></thead>
              <tbody>${inventoryRows}</tbody>
            </table>
          </body></html>`;

        const { uri } = await Print.printToFileAsync({ html });
        return uri;
      },
      {
        format: 'pdf',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      }
    );
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
            onPress={async () => { await refreshProfile(); setAccountMenuVisible(true); }}
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
          onPress={() => setImportExportSheetVisible(true)}
        >
          <Image source={importExportIcon} style={{ width: 32, height: 32 }} resizeMode="contain" />
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

      {/* Import / Export bottom sheet */}
      <Modal
        visible={importExportSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportExportSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setImportExportSheetVisible(false)}
        >
          <View style={[styles.sheetContainer, theme === 'dark' && { backgroundColor: '#1e1e1e' }]}>
            <View style={[styles.sheetHandle, theme === 'dark' && { backgroundColor: '#444' }]} />
            <Text style={[styles.sheetTitle, theme === 'dark' && { color: '#e0e0e0' }]}>Data</Text>

            <TouchableOpacity
              style={[styles.sheetOption, theme === 'dark' && { borderBottomColor: '#333' }]}
              onPress={handleExcelUpload}
            >
              <Text style={styles.sheetOptionIcon}>📥</Text>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, theme === 'dark' && { color: '#e0e0e0' }]}>Import</Text>
                <Text style={[styles.sheetOptionSub, theme === 'dark' && { color: '#888' }]}>Spreadsheet must include brand, color, type & size columns</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOption, theme === 'dark' && { borderBottomColor: '#333' }]}
              onPress={handleExportExcel}
              disabled={exportingFormat !== null}
            >
              {exportingFormat === 'excel'
                ? <ActivityIndicator size="small" color="#3A5AFF" style={{ marginRight: 16, width: 26 }} />
                : <Text style={styles.sheetOptionIcon}>📊</Text>}
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, theme === 'dark' && { color: '#e0e0e0' }]}>
                  {exportingFormat === 'excel' ? 'Generating…' : 'Export as Excel'}
                </Text>
                <Text style={[styles.sheetOptionSub, theme === 'dark' && { color: '#888' }]}>Save your inventory as a .xlsx spreadsheet</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOption, { borderBottomWidth: 0 }, theme === 'dark' && { borderBottomColor: '#333' }]}
              onPress={handleExportPDF}
              disabled={exportingFormat !== null}
            >
              {exportingFormat === 'pdf'
                ? <ActivityIndicator size="small" color="#3A5AFF" style={{ marginRight: 16, width: 26 }} />
                : <Text style={styles.sheetOptionIcon}>📄</Text>}
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, theme === 'dark' && { color: '#e0e0e0' }]}>
                  {exportingFormat === 'pdf' ? 'Generating…' : 'Export as PDF'}
                </Text>
                <Text style={[styles.sheetOptionSub, theme === 'dark' && { color: '#888' }]}>Save a formatted PDF of your inventory</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
            {(isAnonymous && !isPro ? [
              { label: 'Guest Profile', onPress: () => { setAccountMenuVisible(false); onNavigateToProfile && onNavigateToProfile(); } },
              { label: 'Upgrade', onPress: () => { setAccountMenuVisible(false); onNavigateToSubscription && onNavigateToSubscription(); } },
              { label: 'Create Account', onPress: () => { setAccountMenuVisible(false); onNavigateToSignUp && onNavigateToSignUp(); } },
              { label: 'Sign In', onPress: () => { setAccountMenuVisible(false); onNavigateToSignIn && onNavigateToSignIn(); } },
            ] : isAnonymous && isPro ? [
              { label: 'Profile', onPress: () => { setAccountMenuVisible(false); onNavigateToProfile && onNavigateToProfile(); } },
              { label: `Pro Plan (${profile?.plan === 'yearly' ? 'Yearly' : 'Monthly'})`, isHighlight: true, onPress: () => { setAccountMenuVisible(false); (onNavigateToManageSubscription ?? onNavigateToSubscription)?.(); } },
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
                  item.isHighlight && { color: '#22c55e', fontWeight: '700' },
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23272F',
    marginBottom: 12,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sheetOptionIcon: {
    fontSize: 26,
    marginRight: 16,
  },
  sheetOptionText: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#23272F',
    marginBottom: 2,
  },
  sheetOptionSub: {
    fontSize: 13,
    color: '#6B7280',
  },
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
