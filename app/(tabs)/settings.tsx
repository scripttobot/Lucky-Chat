import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  Platform,
  Modal,
  Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import Colors from '@/constants/colors';
import { fontWeight, fontSize, spacing, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { showRewardedAd, initializeAds } from '@/lib/ads';
import { AVATAR_PRESETS } from '@/constants/avatars';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile, logout, updateUserProfile, changePassword, deleteAccount } = useAuth();
  const premium = usePremium();
  const isPremium = premium.isPremium;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);

  React.useEffect(() => {
    initializeAds().catch(() => {});
  }, []);

  const handleBoostProfile = async () => {
    if (premium.isPremium) {
      Alert.alert('Already Boosted', 'Premium users are always boosted in search results.');
      return;
    }
    if (premium.isBoosted) {
      const remaining = premium.boostEndTime
        ? Math.ceil((premium.boostEndTime.getTime() - Date.now()) / 60000)
        : 0;
      Alert.alert('Already Boosted', `Your profile is boosted for ${remaining} more minutes.`);
      return;
    }
    setBoostLoading(true);
    const rewarded = await showRewardedAd();
    if (rewarded) {
      await premium.boostProfile(30);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile Boosted!', 'You will appear first in search results for 30 minutes.');
    }
    setBoostLoading(false);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await updateUserProfile({ notificationsEnabled: value } as any);
    } catch {}
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        try {
          await logout();
          router.replace('/auth/login');
        } catch {
          alert('Failed to logout');
        }
      }
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/auth/login');
          } catch {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === 'web') {
      if (window.confirm('This will permanently remove all your data. This action cannot be undone. Continue?')) {
        try {
          await deleteAccount();
          router.replace('/auth/login');
        } catch {
          alert('Failed to delete account. You may need to re-login first.');
        }
      }
      return;
    }
    Alert.alert(
      'Delete Account',
      'This will permanently remove all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/auth/login');
            } catch {
              Alert.alert('Error', 'Failed to delete account. You may need to re-login first.');
            }
          },
        },
      ]
    );
  };

  const joinDate = userProfile?.createdAt
    ? (userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt))
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12 + webTopInset,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={userProfile?.displayName || ''}
              uri={!userProfile?.avatarId ? userProfile?.photoURL : undefined}
              avatarId={userProfile?.avatarId || undefined}
              size={90}
              isPremium={isPremium}
            />
            <Pressable
              style={styles.editAvatarButton}
              onPress={() => setEditProfileVisible(true)}
            >
              <Ionicons name="pencil" size={16} color={Colors.white} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.profileName}>{userProfile?.displayName || 'User'}</Text>
            {isPremium && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Ionicons name="star" size={12} color="#FFB300" />
                <Text style={{ fontFamily: fontWeight.semiBold, fontSize: 11, color: '#FFB300', marginLeft: 3 }}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileEmail}>@{user?.email?.split('@')[0] || 'user'}</Text>
          {userProfile?.bio ? (
            <Text style={styles.profileBio}>{userProfile.bio}</Text>
          ) : null}
          {joinDate ? (
            <Text style={styles.joinDate}>Joined {joinDate}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>PREMIUM</Text>
        <View style={styles.sectionCard}>
          {!isPremium ? (
            <SettingsItem
              icon="diamond-outline"
              title="Go Premium"
              subtitle="Unlimited matches, no ads, and more"
              onPress={() => router.push('/premium')}
              iconBg="#FFF8E1"
              iconColor="#FFB300"
            />
          ) : (
            <View style={styles.settingsItem}>
              <View style={[styles.settingsIconContainer, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="diamond" size={20} color="#FFB300" />
              </View>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>Premium Active</Text>
                <Text style={styles.settingsSubtitle}>All premium features unlocked</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            </View>
          )}
          <View style={styles.divider} />
          <SettingsItem
            icon="rocket-outline"
            title={boostLoading ? 'Loading Ad...' : premium.isBoosted ? 'Boost Active' : 'Boost Profile'}
            subtitle={premium.isBoosted ? 'You are boosted in search results' : 'Watch ad to appear first in search'}
            onPress={handleBoostProfile}
            iconBg={premium.isBoosted ? Colors.primaryLight : '#E3F2FD'}
            iconColor={premium.isBoosted ? Colors.primary : '#1976D2'}
          />
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
        <View style={styles.sectionCard}>
          <SettingsItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Name, bio, and profile picture"
            onPress={() => setEditProfileVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Security and authentication"
            onPress={() => setChangePasswordVisible(true)}
            iconBg={Colors.primaryLight}
          />
        </View>

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsTitle}>Push Notifications</Text>
              <Text style={styles.settingsSubtitle}>Alerts for new messages</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: Colors.gray[300], true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>INFO</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsTitle}>App Version</Text>
              <Text style={styles.settingsSubtitle}>1.0.0</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingsItem}>
            <View style={[styles.settingsIconContainer, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsTitle}>Email</Text>
              <Text style={styles.settingsSubtitle}>{user?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: Colors.danger }]}>DANGER ZONE</Text>
        <View style={styles.sectionCard}>
          <SettingsItem
            icon="log-out-outline"
            title="Logout"
            subtitle=""
            onPress={handleLogout}
            titleColor={Colors.primary}
            iconBg={Colors.primaryLight}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="close-circle-outline"
            title="Delete Account"
            subtitle="Permanently remove all your data"
            onPress={handleDeleteAccount}
            titleColor={Colors.danger}
            iconBg={Colors.dangerLight}
            iconColor={Colors.danger}
          />
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        userProfile={userProfile}
        onSave={updateUserProfile}
        isPremium={isPremium}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onChangePassword={changePassword}
      />
    </View>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  titleColor,
  iconBg,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  titleColor?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsItem, pressed && styles.settingsItemPressed]}
      onPress={onPress}
    >
      <View style={[styles.settingsIconContainer, { backgroundColor: iconBg || Colors.gray[100] }]}>
        <Ionicons name={icon} size={20} color={iconColor || Colors.primary} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsTitle, titleColor ? { color: titleColor } : null]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.settingsSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  onClose,
  userProfile,
  onSave,
  isPremium = false,
}: {
  visible: boolean;
  onClose: () => void;
  userProfile: any;
  onSave: (data: any) => Promise<void>;
  isPremium?: boolean;
}) {
  const [name, setName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatarId || '');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setName(userProfile?.displayName || '');
      setBio(userProfile?.bio || '');
      setSelectedAvatar(userProfile?.avatarId || '');
    }
  }, [visible, userProfile]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { displayName: name.trim(), bio: bio.trim() };
      if (selectedAvatar !== (userProfile?.avatarId || '')) {
        payload.avatarId = selectedAvatar || '';
      }
      await onSave(payload);
      onClose();
      Alert.alert('Success', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
          <Pressable style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalAvatarPreview}>
                <Avatar
                  name={name || userProfile?.displayName || ''}
                  uri={!selectedAvatar ? userProfile?.photoURL : undefined}
                  avatarId={selectedAvatar || undefined}
                  size={80}
                />
              </View>
              <Text style={styles.avatarSectionLabel}>Choose Avatar</Text>
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedAvatar(preset.id === selectedAvatar ? '' : preset.id);
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
                            <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {selectedAvatar ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAvatar('');
                  }}
                  style={styles.clearAvatarButton}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.text.tertiary} />
                  <Text style={styles.clearAvatarText}>Remove avatar</Text>
                </Pressable>
              ) : null}
              <Input label="Full Name" value={name} onChangeText={setName} />
              <Input
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others about yourself"
                multiline
                style={{ height: 80, textAlignVertical: 'top' as any }}
              />
              <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ marginTop: 8, marginBottom: 16 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
  onChangePassword,
}: {
  visible: boolean;
  onClose: () => void;
  onChangePassword: (current: string, newPass: string) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleChange = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword.length > 12) {
      Alert.alert('Error', 'Password must be at most 12 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      onClose();
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      Alert.alert('Error', 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
          <Pressable style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                isPassword
              />
              <Input
                label="New Password (6-12 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                isPassword
                maxLength={12}
              />
              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                maxLength={12}
              />
              <Button title="Change Password" onPress={handleChange} loading={loading} style={{ marginBottom: 16 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
  },
  headerTitle: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileName: {
    fontFamily: fontWeight.bold,
    fontSize: fontSize.xl,
    color: Colors.text.primary,
  },
  profileEmail: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  profileBio: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  joinDate: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.xs,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  settingsItemPressed: {
    backgroundColor: Colors.gray[50],
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontFamily: fontWeight.medium,
    fontSize: fontSize.md,
    color: Colors.text.primary,
  },
  settingsSubtitle: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginLeft: 68,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.lg,
    color: Colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  modalScrollBody: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },
  modalAvatarPreview: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarSectionLabel: {
    fontFamily: fontWeight.semiBold,
    fontSize: fontSize.sm,
    color: Colors.text.primary,
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarOption: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: Colors.primary,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSelected: {
    transform: [{ scale: 1.05 }],
  },
  avatarEmoji: {
    fontSize: 22,
  },
  clearAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 8,
  },
  clearAvatarText: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.xs,
    color: Colors.text.tertiary,
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
