import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export const ItemCard = ({ item, onUpdateQuantity, onDelete, onPress, onSave, onChangeTracked, onSaveSuccess }) => {
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
          style={styles.card}
          onPress={() => onPress && onPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.uploadedImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.itemIcon}>📦</Text>
              )}
            </View>

            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={styles.quantity}>{tempQuantity}</Text>

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
    marginVertical: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 28,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rightSection: {
    alignItems: 'center',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  controlText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '400',
  },
  quantity: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  incrementButton: {
    backgroundColor: '#d4edda',
  },
  decrementButton: {
    backgroundColor: '#f8d7da',
  },
  deleteContainer: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 6,
    marginRight: 16,
    borderRadius: 12,
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
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
