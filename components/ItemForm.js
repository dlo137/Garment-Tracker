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

const CustomDropdown = ({ value, options, onSelect }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setDropdownVisible(true)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.dropdownPlaceholder]}>
          {value || 'Select an option...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
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
          <View style={styles.dropdownMenu}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    value === item && styles.dropdownItemSelected,
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

export const ItemForm = ({ visible, onSubmit, onCancel, editMode = false, itemToEdit = null, onImageUpdate }) => {
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{editMode ? 'Edit Item' : 'Add New Item'}</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={(text) => {
                setBrand(text);
              }}
              placeholder="Enter brand"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              value={quantity}
              onChangeText={(text) => {
                setQuantity(text);
                if (errors.quantity) setErrors({ ...errors, quantity: null });
              }}
              placeholder="Enter quantity"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Size</Text>
            <CustomDropdown
              value={size}
              options={SIZES}
              onSelect={setSize}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <CustomDropdown
              value={color}
              options={COLORS}
              onSelect={setColor}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Garment Type</Text>
            <TextInput
              style={styles.input}
              value={garmentType}
              onChangeText={(text) => {
                setGarmentType(text);
              }}
              placeholder="Enter garment type"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              placeholder="Enter item name"
              placeholderTextColor="#999"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
              }}
              placeholder="Add any notes about this item"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {editMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Photo</Text>
              <TouchableOpacity
                style={styles.imagePickerContainer}
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
            <Text style={styles.submitButtonText}>{editMode ? 'Save Changes' : 'Add Item'}</Text>
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
    marginBottom: 24,
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
    backgroundColor: '#34C759',
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
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 32,
    width: '50%',
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
    color: '#34C759',
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
