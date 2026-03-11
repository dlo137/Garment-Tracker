import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { updateProfile } from '../lib/profileService';

export default function SignUpScreen({ navigation, theme, fromPurchase }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (fromPurchase) {
      Alert.alert(
        'Protect your purchase — create an account.',
        'This ensures you can restore your Pro access if you change devices.',
      );
    }
  }, [fromPurchase]);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Get current anonymous user
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (currentUser?.is_anonymous) {
        // Convert anonymous user to permanent account
        // This preserves all existing data (folders, items, profile)
        const { data, error } = await supabase.auth.updateUser({
          email,
          password,
          data: { name },
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            Alert.alert('Account Exists', 'This email is already registered. Please sign in instead.');
          } else {
            Alert.alert('Sign Up Error', error.message);
          }
          return;
        }

        // Update the profile with the name (single retry on failure)
        if (data?.user) {
          try {
            await updateProfile(data.user.id, { name, email });
          } catch (profileError) {
            console.warn('Profile update failed, retrying once:', profileError.message);
            try {
              await updateProfile(data.user.id, { name, email });
            } catch (retryError) {
              console.error('Profile update retry failed:', retryError.message);
              // Auth account was created successfully — profile will sync on next app launch
            }
          }
          Alert.alert(
            'Account Created!',
            'Your account has been created.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        // Fresh signup (no anonymous session)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            Alert.alert('Account Exists', 'This email is already registered. Please sign in instead.');
          } else {
            Alert.alert('Sign Up Error', error.message);
          }
          return;
        }

        if (data?.user) {
          try {
            await updateProfile(data.user.id, { name, email });
          } catch (profileError) {
            console.warn('Profile update failed, retrying once:', profileError.message);
            try {
              await updateProfile(data.user.id, { name, email });
            } catch (retryError) {
              console.error('Profile update retry failed:', retryError.message);
            }
          }
          Alert.alert(
            'Account Created!',
            'Your account has been created.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Sign Up Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
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
          <Text style={[styles.title, !isDark && styles.titleLight]}>Create Account</Text>
          <Text style={[styles.subtitle, !isDark && styles.subtitleLight]}>
            Sign up to sync your inventory across devices and unlock your full account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, !isDark && styles.labelLight]}>Name</Text>
            <TextInput
              style={[styles.input, !isDark && styles.inputLight]}
              placeholder="Enter your name"
              placeholderTextColor={isDark ? '#8a9099' : '#999'}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

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
                placeholder="Enter your password (min 6 chars)"
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
            style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.signUpButtonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, !isDark && styles.loginTextLight]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => {
              navigation.goBack();
              setTimeout(() => navigation.navigate('Login'), 100);
            }}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, !isDark && styles.termsTextLight]}>
              By creating an account, you agree to our{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://dlo137.github.io/Privacy-Policy-Thumbnail-Generator/')}
              >
                privacy policy
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              >
                terms of use
              </Text>
            </Text>
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
    marginTop: 60,
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
  signUpButton: {
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
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 16,
    color: '#8a9099',
  },
  loginTextLight: {
    color: '#666',
  },
  loginLink: {
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
  termsContainer: {
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#8a9099',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsTextLight: {
    color: '#999',
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: '#007AFF',
  },
});
