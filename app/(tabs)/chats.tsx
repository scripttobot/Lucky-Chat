import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/common/Avatar';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useChatRequests, useChatActions, Conversation } from '@/hooks/useChat';
import { BannerAdView } from '@/components/ads/BannerAdView';

function formatTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function useUserData(userId: string) {
  const [data, setData] = useState<{ isOnline: boolean; avatarId: string }>({ isOnline: false, avatarId: '' });

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setData({ isOnline: d.isOnline || false, avatarId: d.avatarId || '' });
      }
    }, () => {});
    return unsubscribe;
  }, [userId]);

  return data;
}

function ConversationItem({
  item,
  userId,
  onPress,
  onDelete,
}: {
  item: Conversation;
  userId: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const otherName = getOtherParticipantName(item, userId);
  const otherPhoto = getOtherParticipantPhoto(item, userId);
  const otherId = item.participants.find((p) => p !== userId) || '';
  const otherData = useUserData(otherId);
  const unread = item.unreadCount?.[userId] || 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <Avatar
        name={otherName}
        uri={!otherData.avatarId ? otherPhoto : undefined}
        avatarId={otherData.avatarId || undefined}
        size={52}
        showOnline
        isOnline={otherData.isOnline}
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatInfoTop}>
          <Text style={[styles.chatName, unread > 0 && styles.chatNameUnread]} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={[styles.chatTime, unread > 0 && styles.chatTimeUnread]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.chatInfoBottom}>
          <Text
            style={[styles.chatLastMessage, unread > 0 && styles.chatLastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessageSenderId === userId ? 'You: ' : ''}
            {item.lastMessage}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations } = useConversations(user?.uid || '');
  const { requests } = useChatRequests(user?.uid || '');
  const { acceptRequest, declineRequest, deleteConversation } = useChatActions();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredConversations = conversations.filter((c) => {
    if (!searchText.trim()) return true;
    const otherName = getOtherParticipantName(c, user?.uid || '');
    return otherName.toLowerCase().includes(searchText.toLowerCase());
  });

  const handleAccept = async (conversationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptRequest(conversationId);
    } catch {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDecline = async (conversationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Decline Request', 'Are you sure you want to decline this chat request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => declineRequest(conversationId),
      },
    ]);
  };

  const handleDeleteChat = (conversationId: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteConversation(conversationId),
      },
    ]);
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationItem
      item={item}
      userId={user?.uid || ''}
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
      onDelete={() => handleDeleteChat(item.id)}
    />
  );

  const renderRequest = ({ item }: { item: Conversation }) => {
    const requesterName = item.participantNames?.[item.requestedBy] || 'Unknown';
    const requesterPhoto = item.participantPhotos?.[item.requestedBy] || '';
    const requesterAvatarId = item.participantAvatarIds?.[item.requestedBy] || '';

    return (
      <View style={styles.requestItem}>
        <Avatar
          name={requesterName}
          uri={!requesterAvatarId ? requesterPhoto : undefined}
          avatarId={requesterAvatarId || undefined}
          size={52}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{requesterName}</Text>
          <Text style={styles.requestSubtext}>Wants to chat with you</Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </Pressable>
          <Pressable
            style={[styles.requestButton, styles.declineButton]}
            onPress={() => handleDecline(item.id)}
          >
            <Ionicons name="close" size={20} color={Colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={styles.headerTitle}>Lucky Chat</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={Colors.gray[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
            </Pressable>
          )}
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>
              Chats
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Requests {requests.length > 0 ? `(${requests.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'chats' ? (
        filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start spinning to find new connections!
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={56} color={Colors.gray[300]} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtext}>
            Chat requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <BannerAdView />
    </View>
  );
}

function getOtherParticipantName(convo: Conversation, userId: string): string {
  const otherId = convo.participants.find((p) => p !== userId) || '';
  return convo.participantNames?.[otherId] || 'Unknown';
}

function getOtherParticipantPhoto(convo: Conversation, userId: string): string {
  const otherId = convo.participants.find((p) => p !== userId) || '';
  return convo.participantPhotos?.[otherId] || '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 0,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaded,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 40,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    height: '100%',
  },
  tabs: {
    flexDirection: 'row',
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: fontWeight.semiBold,
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  chatItemPressed: {
    backgroundColor: Colors.gray[50],
  },
  chatInfo: {
    flex: 1,
  },
  chatInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    flex: 1,
  },
  chatNameUnread: {
    fontFamily: fontWeight.semiBold,
  },
  chatTime: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
  },
  chatTimeUnread: {
    color: Colors.primary,
    fontFamily: fontWeight.medium,
  },
  chatInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    flex: 1,
    marginRight: 8,
  },
  chatLastMessageUnread: {
    color: Colors.text.primary,
    fontFamily: fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.white,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  requestSubtext: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  declineButton: {
    backgroundColor: Colors.dangerLight,
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
