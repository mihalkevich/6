import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Radius, Shadows, Layout, Spacing } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  emoji?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  style,
  textStyle,
  emoji,
}: ButtonProps) {
  const containerStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    variant === 'primary' && !disabled && Shadows.button,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={containerStyles}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} />
      ) : (
        <>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_large: {
    height: Layout.buttonHeight,
    paddingHorizontal: Spacing.xl,
  },
  size_medium: {
    height: 48,
    paddingHorizontal: Spacing.lg,
  },
  size_small: {
    height: 40,
    paddingHorizontal: Spacing.md,
  },
  disabled: {
    backgroundColor: Colors.lockedGrayLight,
    borderColor: Colors.lockedGray,
  },
  text: {
    ...Typography.button,
  },
  text_primary: {
    color: Colors.white,
  },
  text_secondary: {
    color: Colors.primary,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  textSize_large: {
    fontSize: 18,
  },
  textSize_medium: {
    fontSize: 16,
  },
  textSize_small: {
    fontSize: 14,
  },
  textDisabled: {
    color: Colors.lockedGray,
  },
  emoji: {
    fontSize: 20,
  },
});
