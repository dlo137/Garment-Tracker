import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Gray', 'Navy', 'Beige', 'Cream'];

const CustomDropdown = ({ value, options, onSelect, theme }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownButton, theme === 'dark' && { backgroundColor: '#23272F', borderColor: '#333' }]}
        onPress={() => setDropdownVisible(true)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.dropdownPlaceholder, theme === 'dark' && { color: '#e0e0e0' }]}> 
          {value || 'Select an option...'}
        </Text>
        <Text style={[styles.dropdownArrow, theme === 'dark' && { color: '#888' }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={[styles.dropdownMenu, theme === 'dark' && { backgroundColor: '#23272F' }] }>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    value === item && styles.dropdownItemSelected,
                    theme === 'dark' && { borderBottomColor: '#333' },
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === item && styles.dropdownItemSelectedText,
                      theme === 'dark' && { color: value === item ? '#188fff' : '#e0e0e0' },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={options.length > 6}
              nestedScrollEnabled
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const ItemForm = ({ visible, onSubmit, onCancel, editMode = false, itemToEdit = null, onImageUpdate, folderName = '', theme }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [size, setSize] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editMode && itemToEdit) {
      setName(itemToEdit.name);
      setQuantity(String(itemToEdit.quantity));
      setBrand(itemToEdit.brand || '');
      setColor(itemToEdit.color || '');
      setGarmentType(itemToEdit.garmentType || '');
      setSize(itemToEdit.size || '');
      setNotes(itemToEdit.notes || '');
      setImageUri(itemToEdit.imageUri || '');
    } else {
      setName('');
      setQuantity('');
      setBrand('');
      setColor('');
      setGarmentType('');
      setSize('');
      setNotes('');
      setImageUri('');
    }
    setErrors({});
  }, [editMode, itemToEdit, visible]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setBrand('');
      setColor('');
      setGarmentType('');
      setSize('');
      console.error('Image picker error:', error);
    }
  };

  const resetForm = () => {
    if (!editMode) {
      setName('');
      setQuantity('');
      setBrand('');
      setColor('');
      setGarmentType('');
      setSize('');
      setNotes('');
    }
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (parseInt(quantity, 10) <= 0 || isNaN(parseInt(quantity, 10))) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(name.trim(), quantity, brand.trim(), color.trim(), garmentType.trim(), size.trim(), notes.trim());
      if (editMode && itemToEdit && imageUri && onImageUpdate) {
        onImageUpdate(itemToEdit.id, imageUri);
      }
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
      <View style={[styles.container, theme === 'dark' && { backgroundColor: '#181818' }] }>
        <View style={[styles.header, { backgroundColor: '#181818' }, theme === 'dark' && { borderBottomColor: '#333' }] }>
          <Text style={[styles.title, theme === 'dark' && { color: '#e0e0e0' }] }>
            {editMode
              ? 'Edit Item'
              : folderName
                ? `Add New ${folderName === 'Pants' ? 'Pants' : folderName.replace(/s$/,'').replace(/([A-Z])/g, ' $1').replace(/- /g, '-').replace(/\s+/g, ' ').trim()}`
                : 'Add New Item'}
          </Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* Brand input at the top */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Brand</Text>
            <TextInput
              style={[styles.input, theme === 'dark' && { backgroundColor: '#23272F', color: '#e0e0e0', borderColor: '#333' }]}
              value={brand}
              onChangeText={(text) => {
                setBrand(text);
              }}
              placeholder="Enter brand"
              placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
            />
          </View>

          {/* Row for Quantity only */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Quantity *</Text>
              <TextInput
                style={[styles.input, errors.quantity && styles.inputError, theme === 'dark' && { backgroundColor: '#23272F', color: '#e0e0e0', borderColor: '#333' }]}
                value={quantity}
                onChangeText={(text) => {
                  setQuantity(text);
                  if (errors.quantity) setErrors({ ...errors, quantity: null });
                }}
                placeholder="Enter quantity"
                placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
                keyboardType="numeric"
              />
              {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
            </View>
          </View>

          {/* Row for Size and Color */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Size</Text>
              <CustomDropdown
                value={size}
                options={SIZES}
                onSelect={setSize}
                theme={theme}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Color</Text>
              <CustomDropdown
                value={color}
                options={COLORS}
                onSelect={setColor}
                theme={theme}
              />
            </View>
          </View>


          <View style={styles.inputGroup}>
            <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput, theme === 'dark' && { backgroundColor: '#23272F', color: '#e0e0e0', borderColor: '#333' }]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
              }}
              placeholder="Add any notes about this item"
              placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
              multiline
              numberOfLines={4}
            />
          </View>

          {editMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Photo</Text>
              <TouchableOpacity
                style={[styles.imagePickerContainer, theme === 'dark' && { backgroundColor: '#23272F', borderColor: '#333' }]}
                onPress={pickImage}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderIcon}>🖼️</Text>
                    <Text style={styles.placeholderText}>Tap to select photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, theme === 'dark' && { borderTopColor: '#222' }] }>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, theme === 'dark' && { backgroundColor: '#23272F' }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, theme === 'dark' && { color: '#bebfc1' }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, theme === 'dark' && { backgroundColor: '#188fff' }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitButtonText, theme === 'dark' && { color: '#fff' }]}>{editMode ? 'Save Changes' : 'Add Item'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
    // ...existing code...
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
    backgroundColor: '#181818',
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
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  imagePickerContainer: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  notesInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
    minHeight: 144,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 48,
    width: '100%',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  dropdownPlaceholder: {
    color: '#999',
    fontSize: 13,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '60%',
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemSelectedText: {
    color: '#188fff',
    fontWeight: '600',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 40,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
});
