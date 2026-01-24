import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';


export const FolderForm = (props) => {
  // Always destructure with fallback for theme
  const { visible, onSubmit, onCancel, theme = 'light' } = props;
  // All hooks at top level
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const clothingTypes = [
    'T-Shirts', 'Long Sleeves', 'Hoodies', 'Crew Necks', 'Pants', 'Shorts', 'Dresses', 'Skirts', 'Jackets', 'Sweaters', 'Suits', 'Activewear', 'Underwear', 'Socks', 'Accessories', 'Other',
  ];

  // Helper functions
  const resetForm = () => {
    setName('');
    setError('');
  };
  const validateForm = () => {
    if (!name.trim()) {
      setError('Folder name is required');
      return false;
    }
    setError('');
    return true;
  };
  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(name.trim());
      resetForm();
    }
  };
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={[styles.container,
        theme === 'dark'
          ? { backgroundColor: '#181818' }
          : { backgroundColor: '#F7F8FA' }
      ]}>
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={theme === 'dark' ? ['#23272F', '#23272F'] : ['#f8fafc', '#e9e9ef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Text style={[styles.title, theme === 'dark' ? { color: '#e0e0e0' } : { color: '#23272F' }]}>New Stock</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={[styles.closeText, theme === 'dark' ? { color: '#888' } : { color: '#6B7280' }]}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, theme === 'dark' ? { color: '#bebfc1' } : { color: '#23272F' }]}>Clothing Type *</Text>
            <Picker
              selectedValue={name}
              onValueChange={(itemValue) => {
                setName(itemValue);
                if (error) setError('');
              }}
              style={[styles.picker, error && styles.inputError, { backgroundColor: 'transparent', borderWidth: 0 }, theme === 'dark' ? { color: '#e0e0e0' } : { color: '#23272F' }]}
              dropdownIconColor={theme === 'dark' ? '#e0e0e0' : '#3A5AFF'}
            >
              <Picker.Item label="Select clothing type..." value="" color={theme === 'dark' ? '#888' : '#6B7280'} />
              {clothingTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} color={theme === 'dark' ? '#e0e0e0' : '#23272F'} />
              ))}
            </Picker>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </ScrollView>

        <View style={[styles.footer, theme === 'dark'
          ? { borderTopColor: '#222', backgroundColor: '#23272F' }
          : { borderTopColor: '#e9e9ef', backgroundColor: '#f8fafc' }
        ]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, theme === 'dark'
              ? { backgroundColor: '#23272F' }
              : { backgroundColor: '#f0f0f0' }
            ]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, theme === 'dark' ? { color: '#bebfc1' } : { color: '#23272F' }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, theme === 'dark'
              ? { backgroundColor: '#3A5AFF' }
              : { backgroundColor: '#3A5AFF' }
            ]}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitButtonText, { color: '#fff' }]}>Create Folder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  headerGradient: {
    width: '100%',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#23272F',
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 28,
    color: '#999',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  // Add dark mode label style in component
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  pickerWrapper: {},
  picker: {
    width: '100%',
    height: 48,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    paddingLeft: 0,
    paddingRight: 0,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#188fff',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
