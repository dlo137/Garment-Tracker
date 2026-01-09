import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase Configuration
 *
 * IMPORTANT: Replace 'YOUR_ANON_KEY' with your actual anonymous key from:
 * Supabase Dashboard → Settings → API → Project API keys → anon/public
 *
 * The anon key is safe to expose in client code - it works with Row Level Security
 */
const supabaseUrl = 'https://gaaexoiiosqgwtpxshzp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYWV4b2lpb3NxZ3d0cHhzaHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjE1NTQsImV4cCI6MjA4MzQ5NzU1NH0.KEej6DSc6aW3fY0tGPsdGp8uAcegRO7HOry1_d-Pzv4'; // TODO: Replace with your actual anon key

/**
 * Supabase Client with AsyncStorage for session persistence
 *
 * Why AsyncStorage?
 * - Stores the anonymous auth session locally
 * - Session persists across app restarts
 * - Users keep their data even after closing the app
 * - Auto-refreshes expired sessions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage to persist the session
    storage: AsyncStorage,
    // Auto-refresh the session before it expires
    autoRefreshToken: true,
    // Persist the session across app restarts
    persistSession: true,
    // Detect when user is online/offline for session management
    detectSessionInUrl: false,
  },
});
