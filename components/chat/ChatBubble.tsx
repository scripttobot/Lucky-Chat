import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Avatar } from '@/components/common/Avatar';
import Colors from '@/constants/colors';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/theme';

interface ChatBubbleProps {
  text: string;
  isOwn: boolean;
  time: string;
  read?: boolean;
  edited?: boolean;
  senderName?: string;
  senderPhoto?: string;
  senderAvatarId?: string;
  senderIsPremium?: boolean;
  showAvatar?: boolean;
  isLastInGroup?: boolean;
  onLongPress?: () => void;
}

export function ChatBubble({
  text,
  isOwn,
  time,
  read,
  edited,
  senderName,
  senderPhoto,
  senderAvatarId,
  senderIsPremium = false,
  showAvatar = false,
  isLastInGroup = true,
  onLongPress,
}: ChatBubbleProps) {
  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            <Avatar
              name={senderName || ''}
              uri={senderPhoto}
              avatarId={senderAvatarId}
              size={28}
              isPremium={senderIsPremium}
            />
          ) : null}
        </View>
      )}
      <View style={styles.bubbleCol}>
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.bubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            isOwn && isLastInGroup && styles.ownBubbleLast,
            !isOwn && isLastInGroup && styles.otherBubbleLast,
            pressed && styles.bubblePressed,
          ]}
        >
          <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>{text}</Text>
        </Pressable>
        {(isLastInGroup || edited) && (
          <View style={[styles.meta, isOwn ? styles.metaOwn : styles.metaOther]}>
            {edited && <Text style={styles.editedText}>edited</Text>}
            {isLastInGroup && <Text style={styles.timeText}>{time}</Text>}
            {isLastInGroup && isOwn && (
              <Text style={[styles.readStatus, read && styles.readStatusRead]}>
                {read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
    alignItems: 'flex-end',
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarSlot: {
    width: 32,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bubbleCol: {
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 18,
  },
  otherBubble: {
    backgroundColor: Colors.gray[100],
    borderBottomLeftRadius: 18,
  },
  ownBubbleLast: {
    borderBottomRightRadius: 4,
  },
  otherBubbleLast: {
    borderBottomLeftRadius: 4,
  },
  bubblePressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  ownText: {
    color: Colors.white,
  },
  otherText: {
    color: Colors.text.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  metaOwn: {
    justifyContent: 'flex-end',
  },
  metaOther: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontFamily: fontWeight.regular,
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  editedText: {
    fontFamily: fontWeight.regular,
    fontSize: 10,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  readStatus: {
    fontFamily: fontWeight.medium,
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  readStatusRead: {
    color: Colors.primary,
  },
});
