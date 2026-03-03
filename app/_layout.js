import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../hooks/useTheme';
import { supabase } from '../lib/supabaseClient';
import { initializeProfile } from '../lib/profileService';

export default function RootLayout() {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        console.log('📱 Existing session found:', session.user.id);
        await initializeProfile(session.user.id);
        setIsAuthenticating(false);
      } else {
        console.log('🔐 No session found, signing in anonymously...');
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error('❌ Anonymous sign-in failed:', error.message);
          setAuthError(error.message);
          setIsAuthenticating(false);
          return;
        }

        console.log('✅ Anonymous sign-in successful:', data.user.id);
        await initializeProfile(data.user.id);
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error.message);
      setAuthError(error.message);
      setIsAuthenticating(false);
    }
  };

  if (isAuthenticating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (authError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{authError}</Text>
        <Text style={styles.errorHint}>
          Check your internet connection and restart the app
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="folder/[id]" />
          <Stack.Screen
            name="subscription"
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="profile"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="signup"
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
