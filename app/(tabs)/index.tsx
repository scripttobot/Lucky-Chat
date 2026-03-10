import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/common/Avatar';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMatch } from '@/hooks/useMatch';
import { useChatRequests } from '@/hooks/useChat';
import { usePremium, FREE_DAILY_MATCH_LIMIT, REWARD_AD_MATCH_BONUS } from '@/contexts/PremiumContext';
import { shouldShowInterstitial, showInterstitialAd, showRewardedAd, initializeAds } from '@/lib/ads';

function RadarPulse({ delay, size }: { delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.8, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.primaryLight,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function FloatingDot({ top, left, delay }: { top: string; left: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: top as any,
        left: left as any,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function CountdownTimer({ onComplete }: { onComplete: () => void }) {
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <View style={matchStyles.countdownRow}>
      <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primary} />
      <Text style={matchStyles.countdownText}>Starting Chat in {seconds}s...</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const match = useMatch(user?.uid || '', userProfile?.displayName || '', userProfile?.photoURL || '', userProfile?.avatarId || '');
  const { requests } = useChatRequests(user?.uid || '');
  const premium = usePremium();
  const notifCount = requests.length;

  const [onlineCount, setOnlineCount] = useState(0);
  const [adLoading, setAdLoading] = useState(false);
  const matchConsumedRef = useRef(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (!user) return;
    initializeAds().catch(() => {});
    const q = query(collection(db, 'users'), where('isOnline', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => setOnlineCount(snap.size), () => {});
    return unsubscribe;
  }, [user]);

  const handleStartMatching = async () => {
    if (!premium.canMatch) return;
    matchConsumedRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    match.startScanning();
  };

  const openChatWithAd = async (convoId: string) => {
    if (!premium.isPremium && shouldShowInterstitial()) {
      await showInterstitialAd();
    }
    router.push({ pathname: '/chat/[id]', params: { id: convoId } });
  };

  const consumeMatchAndChat = async (convoId: string) => {
    if (matchConsumedRef.current) return;
    matchConsumedRef.current = true;
    const allowed = await premium.useMatch();
    if (!allowed) {
      matchConsumedRef.current = false;
      return;
    }
    await openChatWithAd(convoId);
  };

  const handleSayHello = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const convoId = await match.acceptMatch();
    if (convoId) {
      await consumeMatchAndChat(convoId);
    }
  };

  const handleAutoChat = async () => {
    const convoId = await match.acceptMatch();
    if (convoId) {
      await consumeMatchAndChat(convoId);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    match.skipMatch();
  };

  const handleWatchAd = async () => {
    setAdLoading(true);
    const rewarded = await showRewardedAd();
    if (rewarded) {
      premium.addBonusMatches(REWARD_AD_MATCH_BONUS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      premium.addBonusMatches(REWARD_AD_MATCH_BONUS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setAdLoading(false);
  };

  const formatOnlineCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
    return count.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.content, { paddingTop: insets.top + 12 + webTopInset }]}>
        {match.phase === 'idle' && (
          <View style={styles.header}>
            <Pressable onPress={() => router.push('/profile')} style={styles.headerIconBtn} testID="profile-button">
              <Avatar
                name={userProfile?.displayName || ''}
                uri={!userProfile?.avatarId ? userProfile?.photoURL : undefined}
                avatarId={userProfile?.avatarId || undefined}
                size={36}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Lucky Chat</Text>
            <Pressable onPress={() => router.push('/notifications')} style={styles.headerIconBtn} testID="notifications-button">
              <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
              {notifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {(match.phase === 'scanning' || match.phase === 'matched') && (
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                if (match.phase === 'scanning') match.stopScanning();
              }}
              style={styles.headerIconBtn}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>Lucky Chat</Text>
            <View style={styles.headerIconBtn} />
          </View>
        )}

        <View style={styles.centerArea}>
          {match.phase === 'idle' && (
            <>
              <Text style={styles.heroTitle}>Ready for a</Text>
              <Text style={styles.heroTitleGreen}>new connection?</Text>
              <Text style={styles.heroSubtitle}>
                Tap Start to find someone random to chat with right now.
              </Text>

              {!premium.isPremium && (
                <View style={styles.matchCounterBadge}>
                  <Ionicons name="flash" size={16} color={premium.canMatch ? Colors.primary : Colors.danger} />
                  <Text style={[styles.matchCounterText, !premium.canMatch && styles.matchCounterDanger]}>
                    {premium.matchesRemaining}/{FREE_DAILY_MATCH_LIMIT} matches today
                  </Text>
                </View>
              )}

              <View style={styles.startContainer}>
                <View style={styles.startOuterRing} />
                <Pressable
                  onPress={handleStartMatching}
                  style={({ pressed }) => [
                    styles.startButton,
                    pressed && styles.startButtonPressed,
                    !premium.canMatch && styles.startButtonDisabled,
                  ]}
                  testID="start-button"
                  disabled={!premium.canMatch}
                >
                  <Ionicons name="play" size={48} color={Colors.white} />
                  <Text style={styles.startText}>{premium.canMatch ? 'START' : 'LIMIT'}</Text>
                </Pressable>
              </View>

              {!premium.canMatch && (
                <View style={styles.limitActions}>
                  <Pressable
                    style={({ pressed }) => [styles.watchAdButton, pressed && { opacity: 0.8 }]}
                    onPress={handleWatchAd}
                    disabled={adLoading}
                  >
                    <Ionicons name="play-circle" size={20} color={Colors.white} />
                    <Text style={styles.watchAdText}>
                      {adLoading ? 'Loading...' : `Watch Ad for ${REWARD_AD_MATCH_BONUS} Matches`}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.goPremiumButton, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/premium')}
                  >
                    <Ionicons name="diamond" size={18} color="#FFD700" />
                    <Text style={styles.goPremiumText}>Go Premium - Unlimited</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineBadgeText}>{onlineCount} people online</Text>
              </View>
            </>
          )}

          {match.phase === 'scanning' && (
            <View style={styles.scanFullArea}>
              <View style={styles.radarContainer}>
                <RadarPulse delay={0} size={280} />
                <RadarPulse delay={500} size={240} />
                <RadarPulse delay={1000} size={200} />

                <View style={styles.radarOuterRing} />
                <View style={styles.radarMiddleRing} />

                <View style={styles.radarCenter}>
                  <Ionicons name="search" size={36} color={Colors.white} />
                </View>

                <FloatingDot top="15%" left="75%" delay={0} />
                <FloatingDot top="70%" left="20%" delay={300} />
                <FloatingDot top="25%" left="15%" delay={600} />
                <FloatingDot top="80%" left="70%" delay={900} />
              </View>

              <Text style={styles.scanTitle}>Searching for your lucky{'\n'}match...</Text>

              <View style={styles.onlineRow}>
                <View style={styles.onlineDotScan} />
                <Text style={styles.onlineCountText}>
                  {onlineCount.toLocaleString()} People Online
                </Text>
              </View>

              <View style={styles.avatarStack}>
                <View style={[styles.stackAvatar, { backgroundColor: '#D4A373' }]}>
                  <Text style={styles.stackEmoji}>😊</Text>
                </View>
                <View style={[styles.stackAvatar, { backgroundColor: '#E8C9A0', marginLeft: -10 }]}>
                  <Text style={styles.stackEmoji}>😎</Text>
                </View>
                <View style={[styles.stackAvatar, { backgroundColor: '#C9A87C', marginLeft: -10 }]}>
                  <Text style={styles.stackEmoji}>🤩</Text>
                </View>
                <View style={[styles.stackCountBadge, { marginLeft: -8 }]}>
                  <Text style={styles.stackCountText}>+{formatOnlineCount(onlineCount)}</Text>
                </View>
              </View>

              <View style={styles.cancelContainer}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    match.stopScanning();
                  }}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
                  testID="stop-button"
                >
                  <Text style={styles.cancelText}>Cancel Search</Text>
                </Pressable>
              </View>
            </View>
          )}

          {match.phase === 'matched' && (
            <View style={styles.matchFullArea}>
              <Text style={matchStyles.title}>Match Found!</Text>
              <Text style={matchStyles.subtitle}>It's your lucky day!</Text>

              <View style={matchStyles.avatarsRow}>
                <View style={matchStyles.myAvatarWrap}>
                  <Avatar
                    name={userProfile?.displayName || ''}
                    uri={!userProfile?.avatarId ? userProfile?.photoURL : undefined}
                    avatarId={userProfile?.avatarId || undefined}
                    size={90}
                  />
                </View>
                <View style={matchStyles.matchBadge}>
                  <Ionicons name="flower" size={22} color={Colors.white} />
                </View>
                <View style={matchStyles.otherAvatarWrap}>
                  <Avatar
                    name={match.matchedUserName || 'Stranger'}
                    uri={match.matchedUserPhoto || undefined}
                    size={90}
                  />
                </View>
              </View>

              <Text style={matchStyles.matchedName}>{match.matchedUserName}</Text>

              <CountdownTimer onComplete={handleAutoChat} />

              <View style={matchStyles.bottomActions}>
                <Pressable
                  onPress={handleSayHello}
                  style={({ pressed }) => [matchStyles.sayHelloBtn, pressed && matchStyles.sayHelloBtnPressed]}
                  testID="chat-button"
                >
                  <Text style={matchStyles.sayHelloText}>Say Hello!</Text>
                  <Ionicons name="send" size={20} color={Colors.white} />
                </Pressable>

                <Pressable onPress={handleSkip} testID="skip-button">
                  <Text style={matchStyles.skipText}>Skip for now</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const matchStyles = StyleSheet.create({
  title: {
    fontFamily: fontWeight.bold,
    fontSize: 32,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.lg,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  myAvatarWrap: {
    borderWidth: 3,
    borderColor: Colors.white,
    borderRadius: 48,
    ...shadow.md,
  },
  otherAvatarWrap: {
    borderWidth: 3,
    borderColor: Colors.white,
    borderRadius: 48,
    marginLeft: -20,
    ...shadow.md,
  },
  matchBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginRight: -14,
    zIndex: 10,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  matchedName: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxl,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  countdownText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.primary,
  },
  bottomActions: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: spacing.xxl,
  },
  sayHelloBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    width: '100%',
    ...shadow.md,
  },
  sayHelloBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  sayHelloText: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.lg,
    color: Colors.white,
  },
  skipText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.tertiary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  notifBadgeText: {
    fontFamily: fontWeight.bold,
    fontSize: 9,
    color: Colors.white,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  heroTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxxl,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 38,
  },
  heroTitleGreen: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxxl,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  startContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  startOuterRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  startButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
  startButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  startText: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.lg,
    color: Colors.white,
    letterSpacing: 2,
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  onlineBadgeText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  scanFullArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  radarContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  radarMiddleRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  radarCenter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
  scanTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xxl,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  onlineDotScan: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  onlineCountText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  stackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  stackEmoji: {
    fontSize: 18,
  },
  stackCountBadge: {
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  stackCountText: {
    fontFamily: fontWeight.bold,
    fontSize: 12,
    color: Colors.white,
  },
  cancelContainer: {
    width: '100%',
    paddingHorizontal: spacing.xxl,
  },
  cancelButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.primary,
  },
  matchFullArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  matchCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: 16,
  },
  matchCounterText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.sm,
    color: Colors.primary,
  },
  matchCounterDanger: {
    color: Colors.danger,
  },
  startButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  limitActions: {
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  watchAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  watchAdText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.white,
  },
  goPremiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goPremiumText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: '#B8860B',
  },
});
