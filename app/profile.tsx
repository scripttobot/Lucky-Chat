import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { AVATAR_PRESETS } from '@/constants/avatars';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile, updateUserProfile } = useAuth();
  const { isPremium } = usePremium();
  const [name, setName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    userProfile?.avatarId || ''
  );
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateUserProfile({
        displayName: name.trim(),
        bio: bio.trim(),
        avatarId: selectedAvatar || '',
      });
      Alert.alert('Success', 'Profile updated!');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAvatar = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAvatar(id === selectedAvatar ? '' : id);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.currentAvatarSection}>
          <Avatar
            name={name || userProfile?.displayName || ''}
            uri={!selectedAvatar ? userProfile?.photoURL : undefined}
            avatarId={selectedAvatar || undefined}
            size={100}
            isPremium={isPremium}
          />
          <Text style={styles.currentAvatarLabel}>
            {selectedAvatar ? 'Built-in Avatar' : 'Current Avatar'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choose Avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_PRESETS.map((preset) => {
            const locked = !!preset.isPremium && !isPremium;
            return (
              <Pressable
                key={preset.id}
                onPress={() => {
                  if (locked) {
                    Alert.alert('Premium Avatar', 'Upgrade to Premium to unlock this avatar.');
                    return;
                  }
                  handleSelectAvatar(preset.id);
                }}
                style={[
                  styles.avatarOption,
                  selectedAvatar === preset.id && styles.avatarOptionSelected,
                ]}
              >
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: preset.bgColor },
                    selectedAvatar === preset.id && styles.avatarCircleSelected,
                    locked && { opacity: 0.45 },
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{preset.emoji}</Text>
                  {locked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selectedAvatar && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedAvatar('');
            }}
            style={styles.clearAvatarButton}
          >
            <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
            <Text style={styles.clearAvatarText}>Remove avatar</Text>
          </Pressable>
        )}

        <View style={styles.formSection}>
          <Input
            label="Display Name"
            value={name}
            onChangeText={setName}
            icon="person-outline"
          />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            icon="document-text-outline"
            multiline
            style={{ height: 80, textAlignVertical: 'top' as any }}
          />
          <Input
            label="Email"
            value={user?.email || ''}
            editable={false}
            icon="mail-outline"
          />
        </View>

        <View style={styles.saveSection}>
          <Button title="Save Changes" onPress={handleSave} loading={loading} />
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
  },
  currentAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  currentAvatarLabel: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarOption: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: Colors.primary,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSelected: {
    transform: [{ scale: 1.05 }],
  },
  avatarEmoji: {
    fontSize: 26,
  },
  clearAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  clearAvatarText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
  },
  formSection: {
    marginTop: 16,
  },
  saveSection: {
    marginTop: 24,
  },
  lockOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
