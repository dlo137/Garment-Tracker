import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { FolderCard } from './FolderCard';

export const FolderList = ({ folders, items, onDeleteFolder, onFolderPress }) => {
  const getFolderItemCount = (folderId) => {
    return items.filter((item) => item.folderId === folderId).length;
  };

  if (folders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No folders yet</Text>
        <Text style={styles.emptySubtext}>Tap the + button to create your first folder</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={folders}
      renderItem={({ item }) => (
        <FolderCard
          folder={item}
          itemCount={getFolderItemCount(item.id)}
          onDelete={onDeleteFolder}
          onPress={onFolderPress}
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
