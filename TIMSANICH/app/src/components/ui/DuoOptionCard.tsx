/**
 * DuoOptionCard — Duolingo-style answer option
 *
 * A card with 3D raised effect that:
 * - Pops up on appear
 * - Presses down on touch with haptic
 * - Turns green/red on correct/incorrect with haptic
 * - Shows emoji + label in clean layout
 * - Bounces on correct answer
 */

import React, { useCallback, useEffect } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap, hapticSuccess, hapticError } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DEPTH = 4;

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'disabled';

interface DuoOptionCardProps {
  emoji?: string;
  label: string;
  onPress: () => void;
  state: OptionState;
  layout?: 'grid' | 'list';
  index?: number;
  disabled?: boolean;
}

const SPRING = { damping: 12, stiffness: 350, mass: 0.5 };

export function DuoOptionCard({
  emoji,
  label,
  onPress,
  state,
  layout = 'grid',
  index = 0,
  disabled = false,
}: DuoOptionCardProps) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(0);
  const shake = useSharedValue(0);
  const bounce = useSharedValue(0);

  // Entrance animation — staggered pop in
  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withSpring(1, { damping: 14, stiffness: 300, mass: 0.5 })
    );
  }, []);

  // Bounce on correct
  useEffect(() => {
    if (state === 'correct') {
      bounce.value = withSequence(
        withTiming(-8, { duration: 100 }),
        withSpring(0, { damping: 8, stiffness: 400 })
      );
    } else if (state === 'incorrect') {
      shake.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [state]);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 60 });
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, SPRING);
  }, []);

  const handlePress = useCallback(() => {
    hapticTap();
    onPress();
  }, [onPress]);

  const colors = getStateColors(state);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, DEPTH - 1]) + bounce.value },
      { translateX: shake.value },
    ],
    borderBottomWidth: interpolate(pressed.value, [0, 1], [DEPTH, 1]),
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || state === 'correct' || state === 'incorrect'}
      style={[
        layout === 'grid' ? styles.gridCard : styles.listCard,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderBottomColor: colors.bottomBorder,
        },
        animatedStyle,
      ]}
    >
      {emoji && (
        <Text style={[
          styles.emoji,
          layout === 'list' && styles.emojiList,
        ]}>
          {emoji}
        </Text>
      )}
      <Text
        style={[
          styles.label,
          layout === 'list' && styles.labelList,
          { color: colors.text },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function getStateColors(state: OptionState) {
  switch (state) {
    case 'selected':
      return {
        bg: Colors.primaryLight,
        border: Colors.primary,
        bottomBorder: '#3D8BCB',
        text: Colors.primary,
      };
    case 'correct':
      return {
        bg: '#E8F8EA',
        border: '#6BCB77',
        bottomBorder: '#4DAF5C',
        text: '#1B5E20',
      };
    case 'incorrect':
      return {
        bg: '#FDECEC',
        border: '#EF6461',
        bottomBorder: '#C0392B',
        text: '#B71C1C',
      };
    case 'disabled':
      return {
        bg: Colors.lockedGrayLight,
        border: Colors.lockedGray,
        bottomBorder: '#B0B0B0',
        text: Colors.textLight,
      };
    default:
      return {
        bg: Colors.white,
        border: '#E5E7EB',
        bottomBorder: '#D1D5DB',
        text: Colors.textPrimary,
      };
  }
}

const styles = StyleSheet.create({
  gridCard: {
    width: '47%',
    minHeight: 120,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderBottomWidth: DEPTH,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  listCard: {
    width: '100%',
    minHeight: 60,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderBottomWidth: DEPTH,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 44,
  },
  emojiList: {
    fontSize: 32,
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  labelList: {
    textAlign: 'left',
    flex: 1,
  },
});
