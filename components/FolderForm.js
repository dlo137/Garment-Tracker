import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

export const FolderForm = ({ visible, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const clothingTypes = [
    'T-Shirts',
    'Long Sleeves',
    'Hoodies',
    'Crew Necks',
    'Pants',
    'Shorts',
    'Dresses',
    'Skirts',
    'Jackets',
    'Sweaters',
    'Shirts',
    'Jeans',
    'Coats',
    'Suits',
    'Blazers',
    'Activewear',
    'Underwear',
    'Socks',
    'Accessories',
    'Other',
  ];
  const [error, setError] = useState('');

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Stock</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clothing Type *</Text>
            <Picker
              selectedValue={name}
              onValueChange={(itemValue) => {
                setName(itemValue);
                if (error) setError('');
              }}
              style={[styles.picker, error && styles.inputError]}
              dropdownIconColor="#000000"
            >
              <Picker.Item label="Select clothing type..." value="" color="#999" />
              {clothingTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Create Folder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
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
