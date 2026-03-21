import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';

interface EmojiCircleProps {
  emoji: string;
  size?: number;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function EmojiCircle({
  emoji,
  size = 64,
  backgroundColor = Colors.primaryLight,
  style,
}: EmojiCircleProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.45 }]}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  emoji: {
    textAlign: 'center',
  },
});
