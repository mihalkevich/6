/**
 * DuoButton — Duolingo-style 3D button
 *
 * Creates a physical "raised" button effect with:
 * - Thick bottom border that acts as a "depth shadow"
 * - Press-down animation on touch (moves down, border shrinks)
 * - Haptic feedback on press
 * - Spring-back animation on release
 * - Different states: default, correct, incorrect, disabled
 */

import React, { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap, hapticHeavy } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DEPTH = 5; // Bottom border depth in px

export type DuoButtonVariant = 'primary' | 'option' | 'correct' | 'incorrect' | 'selected';

interface DuoButtonProps {
  title: string;
  onPress: () => void;
  variant?: DuoButtonVariant;
  emoji?: string;
  emojiSize?: number;
  disabled?: boolean;
  size?: 'large' | 'medium' | 'compact';
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** Use heavy haptic (for main CTA buttons) */
  heavy?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
  mass: 0.4,
};

export function DuoButton({
  title,
  onPress,
  variant = 'primary',
  emoji,
  emojiSize,
  disabled = false,
  size = 'large',
  style,
  textStyle,
  heavy = false,
}: DuoButtonProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 80 });
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, SPRING_CONFIG);
  }, []);

  const handlePress = useCallback(() => {
    if (heavy) {
      hapticHeavy();
    } else {
      hapticTap();
    }
    onPress();
  }, [onPress, heavy]);

  const colors = getColors(variant);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(pressed.value, [0, 1], [0, DEPTH - 1]) },
      ],
      borderBottomWidth: interpolate(pressed.value, [0, 1], [DEPTH, 1]),
    };
  });

  const heights: Record<string, number> = {
    large: 56,
    medium: 48,
    compact: 44,
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? Colors.lockedGrayLight : colors.bg,
          borderColor: disabled ? Colors.lockedGray : colors.border,
          borderBottomColor: disabled ? Colors.lockedGray : colors.bottomBorder,
          minHeight: heights[size],
        },
        animatedStyle,
        style,
      ]}
    >
      {emoji && (
        <Text style={[styles.emoji, emojiSize ? { fontSize: emojiSize } : null]}>
          {emoji}
        </Text>
      )}
      <Text
        style={[
          styles.text,
          {
            color: disabled ? Colors.lockedGray : colors.text,
            fontSize: size === 'large' ? 18 : size === 'medium' ? 16 : 15,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

function getColors(variant: DuoButtonVariant) {
  switch (variant) {
    case 'primary':
      return {
        bg: Colors.primary,
        border: '#3D8BCB',
        bottomBorder: '#2D6FA3',
        text: Colors.white,
      };
    case 'option':
      return {
        bg: Colors.white,
        border: Colors.border,
        bottomBorder: '#D1D5DB',
        text: Colors.textPrimary,
      };
    case 'correct':
      return {
        bg: Colors.successLight,
        border: Colors.successGreen,
        bottomBorder: '#4DAF5C',
        text: '#1B5E20',
      };
    case 'incorrect':
      return {
        bg: Colors.errorLight,
        border: Colors.errorRed,
        bottomBorder: '#C0392B',
        text: '#B71C1C',
      };
    case 'selected':
      return {
        bg: Colors.primaryLight,
        border: Colors.primary,
        bottomBorder: '#3D8BCB',
        text: Colors.primary,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderBottomWidth: DEPTH,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emoji: {
    fontSize: 22,
  },
});
