import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ClothingTypeIcon } from './ClothingTypeIcon';

export const FolderCard = ({ folder, itemCount, onDelete, onPress, theme, selected }) => {
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
          onPress={() => onDelete(folder.id)}
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

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={[styles.card, theme === 'dark' && { backgroundColor: '#363738', shadowColor: '#000' }]}
        onPress={() => onPress(folder.id)}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, theme === 'dark' && { backgroundColor: '#23272F' }]}> 
            <ClothingTypeIcon
              type={folder.name}
              theme={theme}
              color={selected ? (theme === 'dark' ? '#188fff' : '#007AFF') : (theme === 'dark' ? '#555' : '#A0A4B8')}
              size={32}
            />
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, theme === 'dark' && { color: '#e0e0e0' }]} numberOfLines={1}>{folder.name}</Text>
            <Text style={[styles.itemCount, theme === 'dark' && { color: '#888' }]}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={[styles.chevron, theme === 'dark' && { color: '#555' }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
    minHeight: 80,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F4F8',
    borderRadius: 16,
  },
  folderIcon: {
    fontSize: 32,
    color: '#A0A4B8',
  },
  nameContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23272F',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  rightSection: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 32,
    color: '#B6BCC8',
    fontWeight: '700',
    marginLeft: 2,
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
});
