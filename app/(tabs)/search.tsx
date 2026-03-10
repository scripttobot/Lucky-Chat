import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, limit as fbLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/common/Avatar';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useChatActions, usePendingSentRequests } from '@/hooks/useChat';
import * as Haptics from 'expo-haptics';

interface SearchUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isOnline: boolean;
  bio: string;
  avatarId?: string;
  isPremium?: boolean;
  boostedUntil?: any;
}

function sortByBoost(users: SearchUser[]): SearchUser[] {
  const now = new Date();
  return [...users].sort((a, b) => {
    const aBoosted = a.isPremium || (a.boostedUntil && (a.boostedUntil.toDate ? a.boostedUntil.toDate() : new Date(a.boostedUntil)) > now);
    const bBoosted = b.isPremium || (b.boostedUntil && (b.boostedUntil.toDate ? b.boostedUntil.toDate() : new Date(b.boostedUntil)) > now);
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;
    return 0;
  });
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { sendChatRequest } = useChatActions();
  const pendingSentTo = usePendingSentRequests(user?.uid || '');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [sendingTo, setSendingTo] = useState<Set<string>>(new Set());

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    loadSuggestedUsers();
  }, [user]);

  const loadSuggestedUsers = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users'),
        fbLimit(30)
      );
      const snapshot = await getDocs(q);
      const users: SearchUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SearchUser;
        if (data.uid !== user.uid) {
          users.push(data);
        }
      });
      setSuggestedUsers(sortByBoost(users));
    } catch {
      setSuggestedUsers([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(collection(db, 'users'), fbLimit(50));
      const snapshot = await getDocs(q);
      const users: SearchUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SearchUser;
        if (
          data.uid !== user?.uid &&
          data.displayName?.toLowerCase().includes(text.toLowerCase())
        ) {
          users.push(data);
        }
      });
      setResults(sortByBoost(users));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleChatRequest = async (targetUser: SearchUser) => {
    if (!user || !userProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSendingTo((prev) => new Set(prev).add(targetUser.uid));

    try {
      await sendChatRequest(
        user.uid,
        userProfile.displayName,
        userProfile.photoURL || '',
        targetUser.uid,
        targetUser.displayName,
        targetUser.photoURL || '',
        userProfile.avatarId || '',
        targetUser.avatarId || ''
      );
      Alert.alert('Request Sent', `Chat request sent to ${targetUser.displayName}!`);
    } catch {
      Alert.alert('Error', 'Failed to send chat request');
    } finally {
      setSendingTo((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.uid);
        return next;
      });
    }
  };

  const displayUsers = hasSearched ? results : suggestedUsers;

  const renderUser = ({ item }: { item: SearchUser }) => {
    const isPending = pendingSentTo.has(item.uid) || sendingTo.has(item.uid);

    return (
      <View style={styles.userItem}>
        <Avatar
          name={item.displayName}
          uri={!item.avatarId ? item.photoURL : undefined}
          avatarId={item.avatarId || undefined}
          size={52}
          showOnline
          isOnline={item.isOnline}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio || 'New to Lucky Chat'}
          </Text>
        </View>
        <Pressable
          onPress={() => handleChatRequest(item)}
          disabled={isPending}
          style={({ pressed }) => [
            styles.chatButton,
            isPending ? styles.chatButtonPending : null,
            pressed && !isPending && styles.chatButtonPressed,
          ]}
        >
          <Text style={[styles.chatButtonText, isPending && styles.chatButtonTextPending]}>
            {isPending ? 'Pending' : 'Chat'}
          </Text>
        </Pressable>
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
            placeholder="Search users by name"
            placeholderTextColor={Colors.gray[400]}
            value={searchText}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {loading || initialLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : displayUsers.length === 0 && hasSearched ? (
        <View style={styles.centerContent}>
          <Ionicons name="search-outline" size={48} color={Colors.gray[300]} />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : displayUsers.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={48} color={Colors.gray[300]} />
          <Text style={styles.emptyText}>Find new connections</Text>
          <Text style={styles.emptySubtext}>Search for users to start chatting</Text>
        </View>
      ) : (
        <FlatList
          data={displayUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {hasSearched ? 'SEARCH RESULTS' : 'SUGGESTED USERS'}
            </Text>
          }
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
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
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
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    height: '100%',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
  },
  listContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.xs,
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  userBio: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  chatButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  chatButtonPending: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chatButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  chatButtonText: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.sm,
    color: Colors.white,
  },
  chatButtonTextPending: {
    color: Colors.primary,
  },
});
