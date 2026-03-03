import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { initializeProfile } from '../lib/profileService';

export default function SignInScreen({ navigation, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isDark = theme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Sign In Error', error.message || 'Invalid email or password.');
        return;
      }

      if (data?.user) {
        // Re-initialize profile for the signed-in user
        await initializeProfile(data.user.id);
        Alert.alert('Welcome Back!', 'You have been signed in successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Sign In Error', error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first, then tap Forgot Password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      Alert.alert('Check Your Email', 'A password reset link has been sent to your email address.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, !isDark && styles.containerLight]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backButtonText, !isDark && styles.backButtonTextLight]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, !isDark && styles.titleLight]}>Welcome Back</Text>
          <Text style={[styles.subtitle, !isDark && styles.subtitleLight]}>
            Sign in to sync your inventory and access your account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, !isDark && styles.labelLight]}>Email</Text>
            <TextInput
              style={[styles.input, !isDark && styles.inputLight]}
              placeholder="Enter your email"
              placeholderTextColor={isDark ? '#8a9099' : '#999'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, !isDark && styles.labelLight]}>Password</Text>
            <View style={[styles.passwordContainer, !isDark && styles.passwordContainerLight]}>
              <TextInput
                style={[styles.passwordInput, !isDark && styles.passwordInputLight]}
                placeholder="Enter your password"
                placeholderTextColor={isDark ? '#8a9099' : '#999'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.signInButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, !isDark && styles.signUpTextLight]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => {
              navigation.goBack();
              setTimeout(() => navigation.navigate('SignUp'), 100);
            }}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f14',
  },
  containerLight: {
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: '100%',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e7ebf0',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleLight: {
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#8a9099',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleLight: {
    color: '#666',
  },
  form: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e7ebf0',
    marginBottom: 8,
  },
  labelLight: {
    color: '#333',
  },
  input: {
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: '#232932',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#e7ebf0',
  },
  inputLight: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: '#232932',
    borderRadius: 12,
  },
  passwordContainerLight: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#e7ebf0',
  },
  passwordInputLight: {
    color: '#333',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  eyeIconText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  forgotPasswordLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 16,
    color: '#8a9099',
  },
  signUpTextLight: {
    color: '#666',
  },
  signUpLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 54,
    left: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
  },
  backButtonTextLight: {
    color: '#007AFF',
  },
});
