import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/common/Avatar';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChatRequests, useChatActions, Conversation } from '@/hooks/useChat';

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function useRequesterAvatarIds(requests: Conversation[]) {
  const [avatarIds, setAvatarIds] = useState<Record<string, string>>({});

  useEffect(() => {
    const uids = requests.map((r) => r.requestedBy).filter(Boolean);
    const missing = uids.filter((uid) => !(uid in avatarIds));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          return { uid, avatarId: snap.exists() ? snap.data().avatarId || '' : '' };
        } catch {
          return { uid, avatarId: '' };
        }
      })
    ).then((results) => {
      setAvatarIds((prev) => {
        const next = { ...prev };
        results.forEach(({ uid, avatarId }) => { next[uid] = avatarId; });
        return next;
      });
    });
  }, [requests]);

  return avatarIds;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requests } = useChatRequests(user?.uid || '');
  const { acceptRequest, declineRequest } = useChatActions();
  const requesterAvatarIds = useRequesterAvatarIds(requests);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleAccept = async (conversationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptRequest(conversationId);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    } catch {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDecline = (conversationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Decline Request', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => declineRequest(conversationId),
      },
    ]);
  };

  const renderNotification = ({ item }: { item: Conversation }) => {
    const senderName = item.participantNames?.[item.requestedBy] || 'Someone';
    const senderPhoto = item.participantPhotos?.[item.requestedBy] || '';
    const senderAvatarId = requesterAvatarIds[item.requestedBy] || '';

    return (
      <View style={styles.notifItem}>
        <Avatar
          name={senderName}
          uri={!senderAvatarId ? senderPhoto : undefined}
          avatarId={senderAvatarId || undefined}
          size={52}
        />
        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.notifName}>{senderName}</Text>
            {' sent you a message request'}
          </Text>
          <Text style={styles.notifTime}>{formatTimeAgo(item.createdAt)}</Text>
          <View style={styles.notifActions}>
            <Pressable
              onPress={() => handleAccept(item.id)}
              style={({ pressed }) => [styles.acceptBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDecline(item.id)}
              style={({ pressed }) => [styles.declineBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={56} color={Colors.gray[300]} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtext}>
            Message requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.primary,
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  notifItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    backgroundColor: Colors.primaryFaded,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  notifName: {
    fontFamily: fontWeight.semiBold,
  },
  notifTime: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  notifActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  acceptBtnText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.sm,
    color: Colors.white,
  },
  declineBtn: {
    backgroundColor: Colors.gray[200],
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  declineBtnText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.sm,
    color: Colors.text.primary,
  },
  btnPressed: {
    opacity: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
