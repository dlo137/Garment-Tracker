import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ClothingTypeIcon } from './ClothingTypeIcon';
import { Swipeable } from 'react-native-gesture-handler';

export const ItemCard = ({ item, onUpdateQuantity, onDelete, onPress, onSave, onChangeTracked, onSaveSuccess, theme }) => {
  const [tempQuantity, setTempQuantity] = useState(item.quantity);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Update tempQuantity when item.quantity changes (from parent/hook)
    setTempQuantity(item.quantity);
    setHasChanges(false);
  }, [item.quantity]);

  useEffect(() => {
    if (hasChanges && onChangeTracked) {
      onChangeTracked(item.id, item.quantity, tempQuantity, item.name);
    }
  }, [hasChanges, tempQuantity]);

  const handleSave = () => {
    onSave(item.id, tempQuantity);
    setHasChanges(false);
    setShowSuccess(true);
    if (onSaveSuccess) {
      onSaveSuccess(item.id);
    }
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.deleteContainer,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Image
            source={require('../assets/trash.png')}
            style={styles.deleteIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleIncrement = () => {
    const newQuantity = Math.max(0, tempQuantity + 1);
    setTempQuantity(newQuantity);
    setHasChanges(true);
  };

  const handleDecrement = () => {
    const newQuantity = Math.max(0, tempQuantity - 1);
    setTempQuantity(newQuantity);
    setHasChanges(true);
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[styles.card, theme === 'dark' && { backgroundColor: '#363738', shadowColor: '#000' }]}
          onPress={() => onPress && onPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, theme === 'dark' && { backgroundColor: '#23272F' }] }>
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.uploadedImage}
                  resizeMode="cover"
                />
              ) : (
                <ClothingTypeIcon type={item.garmentType} theme={theme} size={32} />
              )}
            </View>

            <View style={styles.nameContainer}>
              <Text style={[styles.itemLabel, theme === 'dark' && { color: '#b0b4c0' }]}>Brand: <Text style={[styles.itemValue, theme === 'dark' && { color: '#e0e0e0' }]}>{item.brand || '—'}</Text></Text>
              <Text style={[styles.itemLabel, theme === 'dark' && { color: '#b0b4c0' }]}>Color: <Text style={[styles.itemValue, theme === 'dark' && { color: '#e0e0e0' }]}>{item.color || '—'}</Text></Text>
              <Text style={[styles.itemLabel, theme === 'dark' && { color: '#b0b4c0' }]}>Type: <Text style={[styles.itemValue, theme === 'dark' && { color: '#e0e0e0' }]}>{item.garmentType || '—'}</Text></Text>
              <Text style={[styles.itemLabel, theme === 'dark' && { color: '#b0b4c0' }]}>Size: <Text style={[styles.itemValue, theme === 'dark' && { color: '#e0e0e0' }]}>{item.size || '—'}</Text></Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={[styles.quantity, theme === 'dark' && { color: '#fff' }]}>{tempQuantity}</Text>

            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.incrementButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleIncrement();
                }}
              >
                <Text style={styles.controlText}>+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.decrementButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDecrement();
                }}
              >
                <Text style={styles.controlText}>−</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        
        {hasChanges && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}

        {showSuccess && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>✓ Inventory updated</Text>
          </View>
        )}
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
    minHeight: 90,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#F2F4F8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemIcon: {
    fontSize: 32,
    color: '#A0A4B8',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  nameContainer: {
    flex: 1,
    gap: 4,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 1,
  },
  itemValue: {
    fontWeight: '700',
    color: '#23272F',
  },
  rightSection: {
    alignItems: 'center',
    gap: 10,
    minWidth: 70,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  controlText: {
    color: '#3A5AFF',
    fontSize: 20,
    fontWeight: '700',
  },
  quantity: {
    fontSize: 20,
    fontWeight: '800',
    color: '#23272F',
    minWidth: 32,
    textAlign: 'center',
    marginBottom: 2,
  },
  incrementButton: {
    backgroundColor: '#E8F0FE',
    borderColor: '#B6CCFE',
  },
  decrementButton: {
    backgroundColor: '#FDE8E8',
    borderColor: '#FBCACA',
  },
  deleteContainer: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 8,
    marginRight: 16,
    borderRadius: 20,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#3A5AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-end',
    shadowColor: '#3A5AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  successMessage: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  successText: {
    color: '#3A5AFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
