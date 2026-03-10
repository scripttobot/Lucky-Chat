import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  isPassword,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? Colors.primary : Colors.gray[400]}
            style={styles.icon}
          />
        )}
        <TextInput
          {...props}
          style={[styles.input, props.style]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={Colors.gray[400]}
          secureTextEntry={isPassword && !showPassword}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.gray[400]}
            />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    height: '100%',
  },
  eyeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.danger,
    marginTop: spacing.xs,
  },
});
