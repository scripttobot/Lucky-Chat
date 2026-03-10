import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/common/Avatar';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useChatActions, Conversation } from '@/hooks/useChat';

function formatMessageTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(timestamp: any): string {
  if (!timestamp) return 'Offline';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { messages, loading } = useMessages(id || '');
  const { sendMessage, markAsRead, deleteConversation, editMessage, deleteMessage } = useChatActions();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<any>(null);
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'conversations', id), (docSnap) => {
      if (docSnap.exists()) {
        setConversation({ id: docSnap.id, ...docSnap.data() } as Conversation);
      }
    }, () => {});
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!conversation || !user) return;
    const otherId = conversation.participants.find((p) => p !== user.uid);
    if (!otherId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOtherUserOnline(data.isOnline || false);
        setOtherUserLastSeen(data.lastSeen);
        setOtherUserData(data);
      }
    }, () => {});
    return unsubscribe;
  }, [conversation?.participants, user]);

  useEffect(() => {
    if (id && user) {
      markAsRead(id, user.uid);
    }
  }, [id, user]);

  useEffect(() => {
    if (id && user && messages.length > 0) {
      markAsRead(id, user.uid);
    }
  }, [messages.length]);

  const handleSend = useCallback(async (text: string) => {
    if (!id || !user || !userProfile) return;
    try {
      await sendMessage(id, text, user.uid, userProfile.displayName);
    } catch {
      Alert.alert('Error', 'Failed to send message');
    }
  }, [id, user, userProfile, sendMessage]);

  const handleDeleteChat = () => {
    Alert.alert('Delete Conversation', 'This will delete the entire conversation permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(id!);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete conversation');
          }
        },
      },
    ]);
  };

  const otherUserId = conversation?.participants?.find((p) => p !== user?.uid) || '';
  const otherName = conversation?.participantNames?.[otherUserId] || 'Chat';
  const otherPhoto = otherUserData?.avatarId ? '' : (conversation?.participantPhotos?.[otherUserId] || '');
  const otherAvatarId = otherUserData?.avatarId || '';

  const statusText = otherUserOnline
    ? 'Active now'
    : otherUserLastSeen
    ? `Active ${formatLastSeen(otherUserLastSeen)}`
    : 'Offline';

  const handleMessageLongPress = useCallback((message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(message);
    setShowMessageMenu(true);
  }, []);

  const handleEditPress = useCallback(() => {
    setShowMessageMenu(false);
    if (selectedMessage) {
      setEditText(selectedMessage.text);
      setEditModalVisible(true);
    }
  }, [selectedMessage]);

  const handleEditSave = useCallback(async () => {
    if (!editText.trim()) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }
    if (!id || !selectedMessage) return;
    try {
      await editMessage(id, selectedMessage.id, editText.trim());
      setEditModalVisible(false);
      setSelectedMessage(null);
      setEditText('');
    } catch {
      Alert.alert('Error', 'Failed to edit message');
    }
  }, [id, selectedMessage, editText, editMessage]);

  const handleDeleteMessage = useCallback(() => {
    setShowMessageMenu(false);
    Alert.alert('Delete Message', 'This message will be deleted for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id || !selectedMessage) return;
          try {
            await deleteMessage(id, selectedMessage.id);
            setSelectedMessage(null);
          } catch {
            Alert.alert('Error', 'Failed to delete message');
          }
        },
      },
    ]);
  }, [id, selectedMessage, deleteMessage]);

  const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
    const isOwn = item.senderId === user?.uid;
    const prevMsg = messages[index - 1];
    const isLastInGroup = !prevMsg || prevMsg.senderId !== item.senderId;
    const showAvatar = !isOwn && isLastInGroup;

    return (
      <ChatBubble
        text={item.text}
        isOwn={isOwn}
        time={formatMessageTime(item.createdAt)}
        read={item.read}
        edited={item.edited}
        senderName={otherName}
        senderPhoto={otherPhoto}
        senderAvatarId={otherAvatarId}
        showAvatar={showAvatar}
        isLastInGroup={isLastInGroup}
        onLongPress={() => handleMessageLongPress(item)}
      />
    );
  }, [user?.uid, messages, otherName, otherPhoto, otherAvatarId, handleMessageLongPress]);

  if (loading && !conversation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: insets.top + 8 + webTopInset }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={Colors.primary} />
          </Pressable>
          <Pressable style={styles.headerProfile} onPress={() => {}}>
            <Avatar
              name={otherName}
              uri={otherPhoto}
              avatarId={otherAvatarId}
              size={38}
              showOnline
              isOnline={otherUserOnline}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
              <Text style={[styles.headerStatus, otherUserOnline && styles.headerStatusOnline]}>
                {statusText}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.headerAction} onPress={handleDeleteChat}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.chatArea}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messagesList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={styles.emptyChatIcon}>
                  <Avatar
                    name={otherName}
                    uri={otherPhoto}
                    avatarId={otherAvatarId}
                    size={64}
                  />
                </View>
                <Text style={styles.emptyChatName}>{otherName}</Text>
                <Text style={styles.emptyChatText}>Say hello to start chatting</Text>
              </View>
            }
          />
        </View>

        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <ChatInput onSend={handleSend} />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMessageMenu} transparent animationType="fade" onRequestClose={() => setShowMessageMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMessageMenu(false)}>
          <View style={styles.menuContainer}>
            {selectedMessage?.senderId === user?.uid && (
              <Pressable style={styles.menuItem} onPress={handleEditPress}>
                <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                <Text style={styles.menuItemText}>Edit</Text>
              </Pressable>
            )}
            <Pressable style={styles.menuItem} onPress={handleDeleteMessage}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={[styles.menuItemText, { color: Colors.danger }]}>Delete</Text>
            </Pressable>
            <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={() => setShowMessageMenu(false)}>
              <Ionicons name="close-outline" size={20} color={Colors.text.tertiary} />
              <Text style={[styles.menuItemText, { color: Colors.text.tertiary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          <Pressable style={styles.menuOverlay} onPress={() => setEditModalVisible(false)}>
            <Pressable style={styles.editContainer} onPress={() => {}}>
              <Text style={styles.editTitle}>Edit Message</Text>
              <View style={styles.editInputWrapper}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  maxLength={1000}
                />
              </View>
              <View style={styles.editActions}>
                <Pressable style={styles.editCancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.editCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.editSaveBtn} onPress={handleEditSave}>
                  <Text style={styles.editSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  headerStatus: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
  },
  headerStatusOnline: {
    color: Colors.status.online,
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  messagesList: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 6,
    transform: [{ scaleY: -1 }],
  },
  emptyChatIcon: {
    marginBottom: 8,
  },
  emptyChatName: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.primary,
  },
  emptyChatText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
  },
  inputArea: {
    backgroundColor: Colors.white,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    width: 240,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  editContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '85%',
    padding: 20,
  },
  editTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  editInputWrapper: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: Colors.background.secondary,
  },
  editInput: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top' as any,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
  },
  editCancelText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.secondary,
  },
  editSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  editSaveText: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.white,
  },
});
