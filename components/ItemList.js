import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { ItemCard } from './ItemCard';

export const ItemList = ({ items, onUpdateQuantity, onDeleteItem, onItemPress, onSaveQuantity, onChangeTracked, onSaveSuccess }) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No items yet</Text>
        <Text style={styles.emptySubtext}>Tap the + button to add your first item</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <ItemCard
          item={item}
          onUpdateQuantity={onUpdateQuantity}
          onDelete={onDeleteItem}
          onPress={onItemPress}
          onSave={onSaveQuantity}
          onChangeTracked={onChangeTracked}
          onSaveSuccess={onSaveSuccess}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
});
