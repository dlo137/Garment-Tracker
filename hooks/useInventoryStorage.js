import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useInventoryStorage = () => {
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading folders:', error.message);
        return;
      }

      // Transform database results to camelCase for React state
      const transformedFolders = (data || []).map((folder) => ({
        id: folder.id,
        name: folder.name,
        createdAt: new Date(folder.created_at).getTime(),
      }));

      setFolders(transformedFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items:', error.message);
        return;
      }

      // Transform database results to camelCase for React state
      const transformedItems = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        brand: item.brand,
        color: item.color,
        garmentType: item.garment_type,
        size: item.size,
        notes: item.notes,
        imageUri: item.image_uri,
        folderId: item.folder_id,
        createdAt: new Date(item.created_at).getTime(),
      }));

      setItems(transformedItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  }, []);

  const addFolder = useCallback(async (name) => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding folder:', error.message);
        return;
      }

      // Add to local state
      const newFolder = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at).getTime(),
      };

      setFolders((prevFolders) => [newFolder, ...prevFolders]);
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  }, []);

  const deleteFolder = useCallback(async (folderId) => {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) {
        console.error('Error deleting folder:', error.message);
        return;
      }

      // Remove from local state
      setFolders((prevFolders) => prevFolders.filter((f) => f.id !== folderId));

      // Remove associated items from local state (cascade delete handles database)
      setItems((prevItems) => prevItems.filter((item) => item.folderId !== folderId));
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  }, []);

  const addItem = useCallback(async (name, quantity, brand, color, garmentType, size, notes, folderId) => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .insert({
          name,
          quantity: parseInt(quantity, 10),
          brand: brand || null,
          color: color || null,
          garment_type: garmentType || null,
          size: size || null,
          notes: notes || null,
          folder_id: folderId,
          user_id: user.id,
          image_uri: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding item:', error.message);
        return;
      }

      // Add to local state
      const newItem = {
        id: data.id,
        name: data.name,
        quantity: data.quantity,
        brand: data.brand,
        color: data.color,
        garmentType: data.garment_type,
        size: data.size,
        notes: data.notes,
        imageUri: data.image_uri,
        folderId: data.folder_id,
        createdAt: new Date(data.created_at).getTime(),
      };

      setItems((prevItems) => [newItem, ...prevItems]);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting item:', error.message);
        return;
      }

      // Remove from local state
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    // Update local state only (no Supabase call)
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) } 
          : item
      )
    );
  }, []);

  const saveQuantity = useCallback(async (id, newQuantity) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) {
        console.error('Error saving quantity:', error.message);
        return;
      }

      // Local state already updated, no need to update again
    } catch (error) {
      console.error('Error saving quantity:', error);
    }
  }, []);

  const updateItem = useCallback(async (id, name, quantity, brand, color, garmentType, size, notes) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name,
          quantity: parseInt(quantity, 10),
          brand: brand || null,
          color: color || null,
          garment_type: garmentType || null,
          size: size || null,
          notes: notes || null,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating item:', error.message);
        return;
      }

      // Update local state
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? { ...item, name, quantity: parseInt(quantity, 10), brand, color, garmentType, size, notes }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }, []);

  const updateItemImage = useCallback(async (id, imageUri) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ image_uri: imageUri })
        .eq('id', id);

      if (error) {
        console.error('Error updating item image:', error.message);
        return;
      }

      // Update local state
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? { ...item, imageUri }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating item image:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await loadFolders();
      await loadItems();
      setIsLoading(false);
    };
    loadData();
  }, [loadFolders, loadItems]);

  return {
    folders,
    items,
    isLoading,
    addFolder,
    deleteFolder,
    addItem,
    deleteItem,
    updateQuantity,
    saveQuantity,
    updateItem,
    updateItemImage,
  };
};
