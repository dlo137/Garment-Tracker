import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { FolderCard } from './FolderCard';

export const FolderList = ({ folders, items, onDeleteFolder, onFolderPress, theme }) => {
  const getFolderItemCount = (folderId) => {
    return items.filter((item) => item.folderId === folderId).length;
  };

  if (folders.length === 0) {
    return (
      <View style={[styles.emptyContainer, theme === 'dark' && { backgroundColor: 'transparent' }]}> 
        <Text style={[styles.emptyText, theme === 'dark' && { color: '#bbb' }]}>No folders created</Text>
        <Text style={[styles.emptySubtext, theme === 'dark' && { color: '#555' }]}>Tap the <Text style={{color:'#3A5AFF',fontWeight:'700'}}>+</Text> button below to create your first folder!</Text>
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
          theme={theme}
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
