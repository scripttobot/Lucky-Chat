import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fontWeight, fontSize } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashScreenPage() {
  const { user, loading } = useAuth();
  const [progress] = useState(new Animated.Value(0));
  const [progressText, setProgressText] = useState(0);
  const [statusText, setStatusText] = useState('Initializing secure connection...');

  useEffect(() => {
    const statuses = [
      'Initializing secure connection...',
      'Loading user data...',
      'Setting up chat engine...',
      'Almost ready...',
    ];

    let currentIndex = 0;
    const statusInterval = setInterval(() => {
      currentIndex++;
      if (currentIndex < statuses.length) {
        setStatusText(statuses[currentIndex]);
      }
    }, 600);

    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const listenerId = progress.addListener(({ value }) => {
      setProgressText(Math.round(value * 100));
    });

    const timeout = setTimeout(() => {
      if (!loading) {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/auth/login');
        }
      }
    }, 2800);

    return () => {
      clearInterval(statusInterval);
      clearTimeout(timeout);
      progress.removeListener(listenerId);
    };
  }, [loading, user]);

  useEffect(() => {
    if (!loading && progressText >= 95) {
      const t = setTimeout(() => {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/auth/login');
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, progressText, user]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.rippleContainer}>
        <View style={[styles.ripple, styles.ripple3]} />
        <View style={[styles.ripple, styles.ripple2]} />
        <View style={[styles.ripple, styles.ripple1]} />
        <View style={styles.iconBox}>
          <Ionicons name="leaf" size={48} color={Colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>Lucky Chat</Text>
      <Text style={styles.subtitle}>CONNECT WITH LUCK</Text>

      <View style={styles.bottomSection}>
        <View style={styles.progressRow}>
          <Text style={styles.statusText}>{statusText}</Text>
          <Text style={styles.percentText}>{progressText}%</Text>
        </View>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ripple: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(45, 181, 83, 0.08)',
  },
  ripple1: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(45, 181, 83, 0.06)',
  },
  ripple2: {
    width: 165,
    height: 165,
    backgroundColor: 'rgba(45, 181, 83, 0.03)',
  },
  ripple3: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(45, 181, 83, 0.015)',
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  title: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxl,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
    letterSpacing: 2,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 100,
    left: 40,
    right: 40,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.secondary,
  },
  percentText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
