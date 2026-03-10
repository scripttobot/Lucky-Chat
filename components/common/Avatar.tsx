import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fontWeight } from '@/constants/theme';
import { getAvatarPreset } from '@/constants/avatars';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  avatarId?: string;
  isPremium?: boolean;
}

export function Avatar({ uri, name = '', size = 48, showOnline = false, isOnline = false, avatarId, isPremium = false }: AvatarProps) {
  const preset = avatarId ? getAvatarPreset(avatarId) : undefined;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColor = getColorFromName(name);

  const badgeSize = Math.max(14, size * 0.28);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {preset ? (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: preset.bgColor },
          ]}
        >
          <Text style={{ fontSize: size * 0.5 }}>{preset.emoji}</Text>
        </View>
      ) : uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineBadge,
            {
              backgroundColor: isOnline ? Colors.status.online : Colors.status.offline,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderWidth: size * 0.06,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
      {isPremium && (
        <View
          style={[
            styles.premiumBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: -2,
              top: -2,
            },
          ]}
        >
          <Ionicons name="star" size={badgeSize * 0.65} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

function getColorFromName(name: string): string {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#607D8B'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: Colors.gray[200],
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fontWeight.semiBold,
    color: Colors.white,
  },
  onlineBadge: {
    position: 'absolute',
    borderColor: Colors.white,
  },
  premiumBadge: {
    position: 'absolute',
    backgroundColor: '#FFB300',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});
