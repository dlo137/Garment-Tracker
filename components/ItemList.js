import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { ItemCard } from './ItemCard';

export const ItemList = ({ items, onUpdateQuantity, onDeleteItem, onItemPress, onSaveQuantity, onChangeTracked, onSaveSuccess }) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No items in your inventory</Text>
        <Text style={styles.emptySubtext}>Start by tapping the <Text style={{color:'#3A5AFF',fontWeight:'700'}}>+</Text> button below to add your first item!</Text>
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
    paddingTop: 16,
    paddingBottom: 120,
    paddingHorizontal: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#23272F',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 22,
  },
});
