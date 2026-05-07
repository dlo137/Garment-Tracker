import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const SIZES = ['Youth', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Custom'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Gray', 'Navy', 'Beige', 'Cream', 'Custom'];

const CustomDropdown = ({
  value,
  options,
  onSelect,
  theme,
  hasCustomEntry = false,
  customValue = '',
  onCustomValueChange,
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const customInputRef = useRef(null);
  const flatListRef = useRef(null);

  const listOptions = hasCustomEntry ? options.filter((o) => o !== 'Custom') : options;

  const displayValue =
    hasCustomEntry && value === 'Custom' ? customValue || null : value;

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onSelect('Custom');
      setDropdownVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownButton, theme === 'dark' && { backgroundColor: '#23272F', borderColor: '#333' }]}
        onPress={() => setDropdownVisible(true)}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            !displayValue && styles.dropdownPlaceholder,
            theme === 'dark' && { color: '#e0e0e0' },
          ]}
        >
          {displayValue || 'Select an option...'}
        </Text>
        <Text style={[styles.dropdownArrow, theme === 'dark' && { color: '#888' }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={[styles.dropdownMenu, theme === 'dark' && { backgroundColor: '#23272F' }]}>
            <FlatList
              ref={flatListRef}
              data={listOptions}
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
              ListFooterComponent={hasCustomEntry ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => customInputRef.current?.focus()}
                  style={[
                    styles.customEntryRow,
                    value === 'Custom' && styles.customEntryRowSelected,
                    theme === 'dark' && { borderBottomColor: '#333' },
                  ]}
                >
                  <Text style={styles.customEntryIcon}>✏️</Text>
                  <TextInput
                    ref={customInputRef}
                    style={[
                      styles.customEntryInput,
                      value === 'Custom' && styles.dropdownItemSelectedText,
                      theme === 'dark' && { color: value === 'Custom' ? '#188fff' : '#e0e0e0' },
                    ]}
                    value={customValue}
                    onChangeText={onCustomValueChange}
                    placeholder="Enter custom value..."
                    placeholderTextColor={theme === 'dark' ? '#666' : '#aaa'}
                    returnKeyType="done"
                    onSubmitEditing={handleCustomSubmit}
                    onFocus={() => {
                      if (value !== 'Custom') onSelect('Custom');
                      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    }}
                  />
                  {customValue.trim().length > 0 && (
                    <TouchableOpacity onPress={handleCustomSubmit} style={styles.customEntryConfirm}>
                      <Text style={styles.customEntryConfirmText}>✓</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ) : null}
              scrollEnabled={listOptions.length > 6}
              nestedScrollEnabled
            />
          </View>
        </TouchableOpacity>
        </KeyboardAvoidingView>
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
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editMode && itemToEdit) {
      setName(itemToEdit.name);
      setQuantity(String(itemToEdit.quantity));
      setBrand(itemToEdit.brand || '');
      const savedColor = itemToEdit.color || '';
      if (savedColor && !COLORS.slice(0, -1).includes(savedColor)) {
        setColor('Custom');
        setCustomColorInput(savedColor);
      } else {
        setColor(savedColor);
        setCustomColorInput('');
      }
      setGarmentType(itemToEdit.garmentType || '');
      const savedSize = itemToEdit.size || '';
      if (savedSize && !SIZES.slice(0, -1).includes(savedSize)) {
        setSize('Custom');
        setCustomSizeInput(savedSize);
      } else {
        setSize(savedSize);
        setCustomSizeInput('');
      }
      setNotes(itemToEdit.notes || '');
      setImageUri(itemToEdit.imageUri || '');
    } else {
      setName('');
      setQuantity('');
      setBrand('');
      setColor('');
      setCustomColorInput('');
      setGarmentType(folderName || '');
      setSize('');
      setCustomSizeInput('');
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
      setCustomColorInput('');
      setGarmentType('');
      setSize('');
      setCustomSizeInput('');
      console.error('Image picker error:', error);
    }
  };

  const resetForm = () => {
    if (!editMode) {
      setName('');
      setQuantity('');
      setBrand('');
      setColor('');
      setCustomColorInput('');
      setGarmentType('');
      setSize('');
      setCustomSizeInput('');
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
      const sizeValue = size === 'Custom' ? customSizeInput.trim() : size.trim();
      const colorValue = color === 'Custom' ? customColorInput.trim() : color.trim();
      onSubmit(name.trim(), quantity, brand.trim(), colorValue, garmentType.trim(), sizeValue, notes.trim());
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
      <View style={[styles.container, theme === 'dark' && { backgroundColor: '#181818' }]}>
        <View
          style={[
            styles.header,
            theme === 'dark'
              ? { backgroundColor: '#181818', borderBottomColor: '#333' }
              : { backgroundColor: '#fff', borderBottomColor: '#eee' },
          ]}
        >
          <Text style={[styles.title, theme === 'dark' && { color: '#e0e0e0' }]}>
            {editMode
              ? 'Edit Item'
              : folderName
                ? `Add New ${folderName === 'Pants' ? 'Pants' : folderName.replace(/s$/, '').replace(/([A-Z])/g, ' $1').replace(/- /g, '-').replace(/\s+/g, ' ').trim()}`
                : 'Add New Item'}
          </Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Brand</Text>
            <TextInput
              style={[styles.input, theme === 'dark' && { backgroundColor: '#23272F', color: '#e0e0e0', borderColor: '#333' }]}
              value={brand}
              onChangeText={setBrand}
              placeholder="Enter brand"
              placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
            />
          </View>

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
                onSelect={(val) => {
                  setSize(val);
                  if (val !== 'Custom') setCustomSizeInput('');
                }}
                theme={theme}
                hasCustomEntry
                customValue={customSizeInput}
                onCustomValueChange={setCustomSizeInput}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Color</Text>
              <CustomDropdown
                value={color}
                options={COLORS}
                onSelect={(val) => {
                  setColor(val);
                  if (val !== 'Custom') setCustomColorInput('');
                }}
                theme={theme}
                hasCustomEntry
                customValue={customColorInput}
                onCustomValueChange={setCustomColorInput}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, theme === 'dark' && { color: '#e0e0e0' }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput, theme === 'dark' && { backgroundColor: '#23272F', color: '#e0e0e0', borderColor: '#333' }]}
              value={notes}
              onChangeText={setNotes}
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

        <View style={[styles.footer, theme === 'dark' && { borderTopColor: '#222' }]}>
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
            <Text style={[styles.submitButtonText, theme === 'dark' && { color: '#fff' }]}>
              {editMode ? 'Save Changes' : 'Add Item'}
            </Text>
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
    paddingTop: 8,
    paddingBottom: 32,
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
  customEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customEntryRowSelected: {
    backgroundColor: '#f0f0f0',
  },
  customEntryIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.5,
  },
  customEntryInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  customEntryConfirm: {
    marginLeft: 8,
    backgroundColor: '#188fff',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEntryConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
