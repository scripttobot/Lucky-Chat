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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const formatDateOfBirth = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += '/' + digits.slice(2, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.slice(4, 8);
    }
    setDateOfBirth(formatted);
  };

  const validateDateOfBirth = (dob: string): string | null => {
    if (!dob.trim()) return 'Date of birth is required';
    const parts = dob.split('/');
    if (parts.length !== 3) return 'Use DD/MM/YYYY format';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      return 'Use DD/MM/YYYY format';
    }
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Invalid date';
    if (month < 1 || month > 12) return 'Invalid month (01-12)';
    if (day < 1 || day > 31) return 'Invalid day (01-31)';
    if (year < 1900 || year > new Date().getFullYear()) return 'Invalid year';
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return `Month ${parts[1]} has only ${daysInMonth} days`;
    return null;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    const dobError = validateDateOfBirth(dateOfBirth);
    if (dobError) newErrors.dateOfBirth = dobError;
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!email.trim().toLowerCase().endsWith('@gmail.com')) newErrors.email = 'Only @gmail.com emails are allowed';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    else if (password.length > 12) newErrors.password = 'Password must be at most 12 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), dateOfBirth);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error?.code === 'auth/email-already-in-use'
        ? 'This email is already registered'
        : error?.code === 'auth/weak-password'
        ? 'Password is too weak'
        : 'Registration failed. Please try again.';
      Alert.alert('Registration Error', message);
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
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        bottomOffset={20}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.topBarTitle}>Lucky Chat</Text>
          <View style={styles.backButton} />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Lucky Chat and start connecting</Text>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
          />

          <Input
            label="Date of Birth"
            placeholder="DD/MM/YYYY"
            value={dateOfBirth}
            onChangeText={formatDateOfBirth}
            keyboardType="numeric"
            icon="calendar-outline"
            maxLength={10}
            error={errors.dateOfBirth}
          />

          <Input
            label="Email Address"
            placeholder="example@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Password (6-12 characters)"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            isPassword
            maxLength={12}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            maxLength={12}
            error={errors.confirmPassword}
          />

          <Pressable
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={styles.termsText}>
              By registering, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </Pressable>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

          <Button
            title="Register"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
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
              {googleLoading ? 'Signing up...' : 'Continue with Google'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.primary,
  },
  title: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.display,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
    marginBottom: 28,
  },
  form: {
    marginBottom: 28,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontFamily: fontWeight.medium,
  },
  errorText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.danger,
    marginBottom: spacing.sm,
  },
  registerButton: {
    marginTop: 16,
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
  signInText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
});
