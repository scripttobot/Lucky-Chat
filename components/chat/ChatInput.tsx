import React, { useState, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.gray[400]}
          multiline
          maxLength={1000}
          editable={!disabled}
        />
      </View>
      <Pressable
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        style={({ pressed }) => [
          styles.sendButton,
          text.trim() ? styles.sendButtonActive : null,
          pressed && styles.sendButtonPressed,
        ]}
      >
        <Ionicons
          name="send"
          size={20}
          color={text.trim() ? Colors.white : Colors.gray[400]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    maxHeight: 100,
  },
  input: {
    fontFamily: fontWeight.regular,
    fontSize: fontSize.md,
    color: Colors.text.primary,
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
