import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const DEVICE_UUID_KEY = '@device_uuid';

/**
 * Profile Service
 *
 * Handles:
 * - Generating/storing a persistent device UUID locally
 * - Syncing profile data to Supabase
 * - Upsert logic for insert-or-update behavior
 */

/**
 * Generate a UUID v4 (RFC 4122 compliant)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a persistent device UUID
 * This UUID persists in AsyncStorage across app restarts
 * Note: Will be lost if app is uninstalled
 */
export async function getOrCreateDeviceUUID() {
  try {
    // Try to get existing UUID
    let deviceUUID = await AsyncStorage.getItem(DEVICE_UUID_KEY);

    if (!deviceUUID) {
      // Generate new UUID and store it
      deviceUUID = generateUUID();
      await AsyncStorage.setItem(DEVICE_UUID_KEY, deviceUUID);
      console.log('📱 Generated new device UUID:', deviceUUID);
    } else {
      console.log('📱 Retrieved existing device UUID:', deviceUUID);
    }

    return deviceUUID;
  } catch (error) {
    console.error('❌ Error getting/creating device UUID:', error);
    throw error;
  }
}

/**
 * Sync profile to Supabase
 * Uses upsert to insert new profile or update existing one
 *
 * @param {Object} profileData - Profile data to sync
 * @param {string} profileData.userId - The Supabase auth user ID
 * @param {string} [profileData.name] - Optional display name (auto-generated as User1, User2, etc.)
 * @param {string} [profileData.username] - Optional username
 * @param {string} [profileData.email] - Optional email
 */
export async function syncProfile({ userId, name = null, username = null, email = null }) {
  try {
    const profileData = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Only include fields that have values
    if (name) profileData.name = name;
    if (username) profileData.username = username;
    if (email) profileData.email = email;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'user_id', // Update if user_id already exists
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error syncing profile:', error.message);
      throw error;
    }

    console.log('✅ Profile synced successfully:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Profile sync failed:', error);
    throw error;
  }
}

/**
 * Get the current user's profile from Supabase
 *
 * @param {string} userId - The Supabase auth user ID
 */
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (profile doesn't exist yet)
      console.error('❌ Error fetching profile:', error.message);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Get profile failed:', error);
    throw error;
  }
}

/**
 * Update profile fields
 *
 * @param {string} userId - The Supabase auth user ID
 * @param {Object} updates - Fields to update
 */
export async function updateProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating profile:', error.message);
      throw error;
    }

    console.log('✅ Profile updated successfully');
    return data;
  } catch (error) {
    console.error('❌ Profile update failed:', error);
    throw error;
  }
}

/**
 * Get the next user number for auto-generated names
 * Uses a database function that bypasses RLS to count all profiles
 */
async function getNextUserNumber() {
  try {
    const { data, error } = await supabase.rpc('get_next_user_number');

    if (error) {
      console.error('❌ Error getting next user number:', error.message);
      // Fallback: generate a random suffix if function fails
      return Math.floor(Math.random() * 10000);
    }

    return data;
  } catch (error) {
    console.error('❌ Get next user number failed:', error);
    return Math.floor(Math.random() * 10000);
  }
}

/**
 * Initialize profile for a user
 * Call this after successful authentication
 * Auto-generates username as "User1", "User2", etc.
 *
 * @param {string} userId - The Supabase auth user ID
 */
export async function initializeProfile(userId) {
  try {
    // Get or create device UUID (for local reference)
    const deviceUUID = await getOrCreateDeviceUUID();

    // Check if profile exists
    const existingProfile = await getProfile(userId);

    if (existingProfile) {
      console.log('📋 Existing profile found:', existingProfile.id);

      // If profile exists but has no name, generate one and update
      if (!existingProfile.name) {
        console.log('📋 Profile has no name, generating one...');
        const userNumber = await getNextUserNumber();
        const generatedName = `User${userNumber}`;
        const updatedProfile = await updateProfile(userId, { name: generatedName });
        return updatedProfile;
      }

      return existingProfile;
    }

    // Get next user number for auto-generated name
    const userNumber = await getNextUserNumber();
    const generatedName = `User${userNumber}`;

    // Create new profile with auto-generated name
    console.log('📋 Creating new profile for user:', userId, 'with name:', generatedName);
    const profile = await syncProfile({ userId, name: generatedName });

    return profile;
  } catch (error) {
    // Don't block app startup if profile sync fails
    console.error('⚠️ Profile initialization failed (non-blocking):', error);
    return null;
  }
}
