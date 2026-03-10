import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send reset email. Please check your email address.');
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

        {sent ? (
          <View style={styles.sentContainer}>
            <View style={styles.sentIcon}>
              <Ionicons name="mail-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to {email}
            </Text>
            <Button
              title="Back to Sign In"
              onPress={() => router.back()}
              style={styles.backToLoginButton}
            />
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button
                title="Send Reset Link"
                onPress={handleReset}
                loading={loading}
                style={styles.resetButton}
              />
            </View>
          </>
        )}
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
    marginBottom: 32,
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
    fontSize: fontSize.xxl,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {},
  resetButton: {
    marginTop: 8,
    borderRadius: borderRadius.md,
    height: 52,
  },
  sentContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  backToLoginButton: {
    marginTop: 24,
    minWidth: 200,
  },
});
