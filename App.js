import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from './lib/supabaseClient';
import { FolderListScreen } from './screens/FolderListScreen';
import { FolderItemsScreen } from './screens/FolderItemsScreen';
import { ThemeProvider, useTheme } from './hooks/useTheme';

function MainApp() {
  const { theme, toggleTheme } = useTheme(); // Always call hooks at the top
  const [screen, setScreen] = useState('folders');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Anonymous Authentication Flow
   *
   * On app launch:
   * 1. Check if user already has a session (stored in AsyncStorage)
   * 2. If no session, automatically sign in anonymously
   * 3. Session persists across app restarts - users keep their data
   *
   * Why anonymous auth?
   * - No signup/login UI needed
   * - Users get a permanent UUID on first launch
   * - Data syncs to cloud but stays private
   * - If user uninstalls, they get NEW identity on reinstall (trade-off)
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if there's an existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User already has an active session - they're authenticated
        console.log('📱 Existing session found:', session.user.id);
        setIsAuthenticating(false);
      } else {
        // No session - sign in anonymously
        console.log('🔐 No session found, signing in anonymously...');
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error('❌ Anonymous sign-in failed:', error.message);
          setAuthError(error.message);
          setIsAuthenticating(false);
          return;
        }

        console.log('✅ Anonymous sign-in successful:', data.user.id);
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error.message);
      setAuthError(error.message);
      setIsAuthenticating(false);
    }
  };

  const handleFolderPress = (folderId) => {
    setSelectedFolderId(folderId);
    setScreen('folderItems');
  };

  const handleBack = () => {
    setScreen('folders');
    setSelectedFolderId(null);
  };

  // Show loading screen while authenticating
  if (isAuthenticating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  // Show error screen if auth failed
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      {screen === 'folders' && (
        <FolderListScreen onFolderPress={handleFolderPress} theme={theme} toggleTheme={toggleTheme} />
      )}
      {screen === 'folderItems' && selectedFolderId && (
        <FolderItemsScreen
          folderId={selectedFolderId}
          onBack={handleBack}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
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
