import { StyleSheet } from 'react-native';
import Colors from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 34,
};

export const fontWeight = {
  regular: 'Inter_400Regular' as const,
  medium: 'Inter_500Medium' as const,
  semiBold: 'Inter_600SemiBold' as const,
  bold: 'Inter_700Bold' as const,
};

export const shadow = StyleSheet.create({
  sm: {
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  md: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  lg: {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
    elevation: 6,
  },
});
