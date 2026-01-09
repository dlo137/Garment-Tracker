import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export const FolderCard = ({ folder, itemCount, onDelete, onPress }) => {
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
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(folder.id)}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.folderIcon}>📁</Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>{folder.name}</Text>
            <Text style={styles.itemCount}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  folderIcon: {
    fontSize: 28,
  },
  nameContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  rightSection: {
    paddingLeft: 12,
  },
  chevron: {
    fontSize: 28,
    color: '#ccc',
    fontWeight: '300',
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
    fontSize: 28,
  },
});
