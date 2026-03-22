/**
 * MascotWidget — Dynamic character card
 *
 * The "soul" of the app, like Duolingo's owl.
 * Shows an animated emoji character that:
 * - Bounces when happy
 * - Shakes when worried/sad
 * - Waves when encouraging
 * - Spins on milestones
 * - Pulses glow ring matching mood color
 * - Displays contextual message
 * - Tap to get random encouragement + haptic
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { hapticTap, hapticSuccess, hapticReward } from '../../utils/haptics';
import type { MascotState } from '../../utils/mascot';

interface MascotWidgetProps {
  state: MascotState;
  onTap?: () => void;
}

export function MascotWidget({ state, onTap }: MascotWidgetProps) {
  const emojiScale = useSharedValue(0);
  const emojiY = useSharedValue(0);
  const emojiX = useSharedValue(0);
  const emojiRotate = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const [tapCount, setTapCount] = useState(0);

  // Entrance animation
  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    emojiScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 200, mass: 0.5 }));

    // Start mood animation
    startMoodAnimation();

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [state.mood]);

  const startMoodAnimation = () => {
    switch (state.animation) {
      case 'bounce':
        emojiY.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        break;

      case 'shake':
        emojiX.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 100 }),
            withTiming(3, { duration: 100 }),
            withTiming(-2, { duration: 100 }),
            withTiming(2, { duration: 100 }),
            withTiming(0, { duration: 100 }),
            withTiming(0, { duration: 1500 }), // pause
          ),
          -1,
          false
        );
        break;

      case 'wave':
        emojiRotate.value = withRepeat(
          withSequence(
            withTiming(10, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(-10, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(8, { duration: 250 }),
            withTiming(-8, { duration: 250 }),
            withTiming(0, { duration: 200 }),
            withTiming(0, { duration: 2000 }), // pause
          ),
          -1,
          false
        );
        break;

      case 'spin':
        emojiRotate.value = withRepeat(
          withSequence(
            withTiming(360, { duration: 1000, easing: Easing.inOut(Easing.cubic) }),
            withTiming(360, { duration: 3000 }), // pause at 360
          ),
          -1,
          false
        );
        break;

      case 'pulse':
        emojiScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 600 }),
            withTiming(1, { duration: 600 })
          ),
          -1,
          true
        );
        break;

      case 'none':
      default:
        // Reset
        emojiY.value = 0;
        emojiX.value = 0;
        emojiRotate.value = 0;
        break;
    }
  };

  const handleTap = useCallback(() => {
    // Bounce on tap
    emojiScale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );

    if (state.mood === 'celebrating' || state.mood === 'excited') {
      hapticReward();
    } else {
      hapticTap();
    }

    setTapCount((c) => c + 1);
    onTap?.();
  }, [state.mood, onTap]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { translateY: emojiY.value },
      { translateX: emojiX.value },
      { rotate: `${emojiRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  // Easter egg messages on multiple taps
  const getExtraMessage = (): string | null => {
    if (tapCount === 3) return '🤭 Щекотно!';
    if (tapCount === 5) return '😂 Хватит тыкать!';
    if (tapCount === 10) return '🥴 Голова кружится...';
    if (tapCount === 15) return '🏆 Ты нашёл секрет!';
    return null;
  };

  const extraMessage = getExtraMessage();

  return (
    <Pressable onPress={handleTap}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: state.backgroundColor },
          cardStyle,
        ]}
      >
        {/* Glow ring behind emoji */}
        <View style={styles.emojiContainer}>
          <Animated.View
            style={[
              styles.glowRing,
              { backgroundColor: state.accentColor },
              glowStyle,
            ]}
          />
          <Animated.Text style={[styles.emoji, emojiStyle]}>
            {state.emoji}
          </Animated.Text>
        </View>

        {/* Messages */}
        <View style={styles.messageContainer}>
          <Text style={styles.message} numberOfLines={2}>
            {extraMessage || state.messageRu}
          </Text>
          {state.subtitleRu && !extraMessage && (
            <Text style={[styles.subtitle, { color: state.accentColor }]}>
              {state.subtitleRu}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    gap: Spacing.md,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  emoji: {
    fontSize: 44,
  },
  messageContainer: {
    flex: 1,
    gap: 2,
  },
  message: {
    ...Typography.bodyL,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  subtitle: {
    ...Typography.bodyS,
    fontWeight: '600',
  },
});
