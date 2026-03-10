import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { usePremium } from '@/contexts/PremiumContext';
import { initializeAds, isAdsAvailable, getAdComponents, AD_CONFIG } from '@/lib/ads';
import Colors from '@/constants/colors';
import { fontWeight, fontSize } from '@/constants/theme';

export function BannerAdView() {
  const { isPremium } = usePremium();
  const [adReady, setAdReady] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      initializeAds().then((ok) => setAdReady(ok));
    }
  }, [isPremium]);

  if (isPremium) return null;

  if (adReady && Platform.OS !== 'web') {
    const { BannerAdComponent, BannerAdSize } = getAdComponents();
    if (BannerAdComponent && BannerAdSize) {
      return (
        <View style={styles.container}>
          <BannerAdComponent
            unitId={AD_CONFIG.BANNER_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      );
    }
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Ad Space</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    paddingVertical: 2,
  },
  placeholder: {
    height: 50,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  placeholderText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
  },
});
