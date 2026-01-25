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

  // Import folders and items from Excel rows
  async function importFromExcel(rows) {
    // Get current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user found');
    // 1) group folders by unique garment type (from r.folder, which is set by normalization)
    const folderNames = [...new Set(rows.map(r => (r.folder && r.folder.trim()) ? r.folder.trim() : 'Unsorted'))];
    // 2) upsert folders (requires UNIQUE on (user_id, name))
    const folderUpserts = folderNames.map(name => ({ user_id: user.id, name }));
    const { data: folderData, error: folderErr } = await supabase
      .from('folders')
      .upsert(folderUpserts, { onConflict: 'user_id,name' })
      .select('id,name');
    if (folderErr) throw folderErr;
    const folderIdByName = new Map(folderData.map(f => [f.name, f.id]));
    // 3) build item inserts, assign to correct folder
    const itemInserts = rows.map(r => {
      const folderName = (r.folder && r.folder.trim()) ? r.folder.trim() : 'Unsorted';
      return {
        user_id: user.id,
        folder_id: folderIdByName.get(folderName),
        name: r.name,
        quantity: r.quantity,
        image_uri: r.image_uri || null,
        brand: r.brand || null,
        color: r.color || null,
        garment_type: r.garment_type || null,
        size: r.size || null,
        notes: r.notes || null,
      };
    });
    // Optional: basic client-side de-dupe (folder+name+size+color+brand)
    const seen = new Set();
    const deduped = [];
    for (const it of itemInserts) {
      const key = `${it.folder_id}::${it.name}::${it.size}::${it.color}::${it.brand}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(it);
      }
    }
    // 4) insert items
    const { error: itemErr } = await supabase
      .from('items')
      .insert(deduped);
    if (itemErr) throw itemErr;
    // Optionally reload data
    await loadFolders();
    await loadItems();
    return { foldersCreatedOrUpdated: folderData.length, itemsInserted: deduped.length };
  }

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
    importFromExcel,
  };
};
