import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Colors from '@/constants/colors';
import { borderRadius, fontSize, fontWeight } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text` as keyof typeof styles],
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: Colors.white,
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
  },
  secondary: {
    backgroundColor: Colors.primaryLight,
  },
  secondaryText: {
    color: Colors.primary,
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineText: {
    color: Colors.primary,
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  dangerText: {
    color: Colors.white,
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
  },
  text: {},
});
