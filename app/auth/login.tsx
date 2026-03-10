import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [_request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        setGoogleLoading(true);
        signInWithGoogle(id_token)
          .then(() => router.replace('/(tabs)'))
          .catch((error: any) => {
            Alert.alert('Google Sign In Error', error?.message || 'Failed to sign in with Google');
          })
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error?.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : error?.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Error', message);
    } finally {
      setLoading(false);
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 40 + webTopInset,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        bottomOffset={20}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble" size={32} color={Colors.white} />
          </View>
          <Text style={styles.title}>Lucky Chat</Text>
          <Text style={styles.subtitle}>Welcome back! Please enter your details.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="name@company.com"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View>
            <View style={styles.passwordHeader}>
              <Text style={styles.passwordLabel}>Password</Text>
              <Pressable onPress={() => router.push('/auth/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
            <Input
              placeholder="Enter your password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
            />
          </View>

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            style={styles.signInButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </Pressable>

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Pressable onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerText}>Register now</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxl,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  passwordLabel: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.text.primary,
  },
  forgotText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  signInButton: {
    marginTop: 8,
    borderRadius: borderRadius.md,
    height: 52,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  dividerText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.white,
    gap: 10,
  },
  googleButtonText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
  },
  registerText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
});
