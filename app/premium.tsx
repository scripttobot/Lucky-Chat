import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius, shadow } from '@/constants/theme';
import { usePremium } from '@/contexts/PremiumContext';

const FEATURES = [
  { icon: 'infinite-outline' as const, title: 'Unlimited Matches', desc: 'No daily limit on random matching' },
  { icon: 'ban-outline' as const, title: 'Ad-Free Experience', desc: 'No banner, interstitial, or rewarded ads' },
  { icon: 'rocket-outline' as const, title: 'Profile Boost', desc: 'Always appear first in search results' },
  { icon: 'checkmark-done-outline' as const, title: 'Read Receipts', desc: 'See when your messages are read' },
  { icon: 'pencil-outline' as const, title: 'Typing Indicator', desc: 'See when someone is typing to you' },
  { icon: 'happy-outline' as const, title: 'Premium Avatars', desc: '30+ exclusive emoji avatars' },
  { icon: 'star-outline' as const, title: 'Premium Badge', desc: 'Stand out with a star badge on your profile' },
  { icon: 'heart-outline' as const, title: 'Message Reactions', desc: 'React to messages with emojis' },
  { icon: 'image-outline' as const, title: 'Photo Sharing', desc: 'Send photos in your chats' },
  { icon: 'mic-outline' as const, title: 'Voice Messages', desc: 'Record and send voice messages' },
  { icon: 'color-palette-outline' as const, title: 'Chat Themes', desc: 'Customize chat background colors' },
  { icon: 'arrow-undo-outline' as const, title: 'Undo Delete', desc: 'Recover deleted messages within 5 minutes' },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleSubscribe = (plan: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Coming Soon',
      `Premium ${plan} subscription will be available soon via RevenueCat. Stay tuned!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Lucky Premium</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.crownBadge}>
            <Ionicons name="diamond" size={40} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Unlock Everything</Text>
          <Text style={styles.heroSubtitle}>
            Get the ultimate Lucky Chat experience with Premium
          </Text>
        </View>

        {isPremium && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.activeBadgeText}>Premium Active</Text>
          </View>
        )}

        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isPremium && (
          <View style={styles.pricingSection}>
            <Pressable
              style={({ pressed }) => [styles.planCard, styles.yearlyPlan, pressed && styles.planPressed]}
              onPress={() => handleSubscribe('Yearly')}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planName}>Yearly</Text>
              <Text style={styles.planPrice}>$19.99/year</Text>
              <Text style={styles.planSavings}>Save 44%</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.planCard, pressed && styles.planPressed]}
              onPress={() => handleSubscribe('Monthly')}
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>$2.99/month</Text>
              <Text style={styles.planSavings}>Cancel anytime</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew. Cancel anytime in your app store settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  crownBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadow.md,
  },
  heroTitle: {
    fontFamily: fontWeight.bold,
    fontSize: 28,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: 20,
  },
  activeBadgeText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
  featuresSection: {
    gap: 16,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  featureDesc: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  pricingSection: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    borderWidth: 2,
    borderColor: Colors.border.medium,
    borderRadius: borderRadius.lg,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  yearlyPlan: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  planPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  bestValueText: {
    fontFamily: fontWeight.bold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 1,
  },
  planName: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.primary,
    marginBottom: 4,
  },
  planSavings: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
  },
  disclaimer: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
