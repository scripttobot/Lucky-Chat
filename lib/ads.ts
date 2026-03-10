import { Platform } from 'react-native';

export const AD_CONFIG = {
  BANNER_ID: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: 'ca-app-pub-3940256099942544/6300978111',
  }) as string,
  INTERSTITIAL_ID: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }) as string,
  REWARDED_ID: Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
    default: 'ca-app-pub-3940256099942544/5224354917',
  }) as string,
};

let interstitialMatchCount = 0;
const INTERSTITIAL_FREQUENCY = 3;

export function shouldShowInterstitial(): boolean {
  interstitialMatchCount++;
  return interstitialMatchCount % INTERSTITIAL_FREQUENCY === 0;
}

export function resetInterstitialCount(): void {
  interstitialMatchCount = 0;
}

let mobileAds: any = null;
let BannerAdComponent: any = null;
let BannerAdSize: any = null;
let InterstitialAdClass: any = null;
let RewardedAdClass: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;

let adsInitialized = false;

export async function initializeAds(): Promise<boolean> {
  if (adsInitialized) return true;
  try {
    const mod = require('react-native-google-mobile-ads');
    mobileAds = mod.default;
    BannerAdComponent = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
    InterstitialAdClass = mod.InterstitialAd;
    RewardedAdClass = mod.RewardedAd;
    AdEventType = mod.AdEventType;
    RewardedAdEventType = mod.RewardedAdEventType;
    await mobileAds().initialize();
    adsInitialized = true;
    return true;
  } catch {
    console.log('AdMob not available (Expo Go / Web)');
    return false;
  }
}

export function getAdComponents() {
  return { BannerAdComponent, BannerAdSize, InterstitialAdClass, RewardedAdClass, AdEventType, RewardedAdEventType };
}

export function isAdsAvailable(): boolean {
  return adsInitialized;
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!adsInitialized || !InterstitialAdClass || !AdEventType) return false;
  return new Promise((resolve) => {
    try {
      const ad = InterstitialAdClass.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID);
      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        ad.show();
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubLoaded();
        unsubClosed();
        resolve(true);
      });
      ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubLoaded();
        unsubClosed();
        resolve(false);
      });
      ad.load();
    } catch {
      resolve(false);
    }
  });
}

export async function showRewardedAd(): Promise<boolean> {
  if (!adsInitialized || !RewardedAdClass || !RewardedAdEventType || !AdEventType) return false;
  return new Promise((resolve) => {
    try {
      const ad = RewardedAdClass.createForAdRequest(AD_CONFIG.REWARDED_ID);
      let rewarded = false;
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        ad.show();
      });
      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewarded = true;
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        resolve(rewarded);
      });
      ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        resolve(false);
      });
      ad.load();
    } catch {
      resolve(false);
    }
  });
}
