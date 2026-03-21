/**
 * CelebrationOverlay — Full-screen celebration moment
 *
 * Shows when:
 * - Lesson completed
 * - Streak milestone
 * - Badge unlocked
 * - Daily goal achieved
 *
 * Features:
 * - Star burst animation
 * - Floating particles
 * - Pulsing emoji
 * - Haptic celebration pattern
 * - Auto-dismiss after delay
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { hapticCelebration, hapticReward, hapticStreak } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

interface CelebrationOverlayProps {
  type: 'lesson_complete' | 'streak' | 'badge' | 'daily_goal' | 'perfect_score';
  emoji?: string;
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
}

const PARTICLE_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '💛'];

export function CelebrationOverlay({
  type,
  emoji = '🎉',
  title,
  subtitle,
  onDismiss,
}: CelebrationOverlayProps) {
  const mainScale = useSharedValue(0);
  const mainOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);
  const titleY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Particles
  const particles = Array.from({ length: 12 }, (_, i) => {
    const scale = useSharedValue(0);
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(0);
    return { scale, x, y, rotate, opacity, emoji: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length] };
  });

  useEffect(() => {
    // Trigger haptic
    switch (type) {
      case 'lesson_complete':
      case 'daily_goal':
        hapticCelebration();
        break;
      case 'badge':
      case 'perfect_score':
        hapticReward();
        break;
      case 'streak':
        hapticStreak();
        break;
    }

    // Background fade in
    bgOpacity.value = withTiming(1, { duration: 200 });

    // Main emoji — spring in with overshoot
    mainScale.value = withDelay(100, withSpring(1, {
      damping: 8,
      stiffness: 200,
      mass: 0.6,
    }));
    mainOpacity.value = withDelay(100, withTiming(1, { duration: 150 }));

    // Pulsing effect
    pulse.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    ));

    // Title slide in
    titleY.value = withDelay(300, withSpring(0, { damping: 14, stiffness: 200 }));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));

    // Particles burst
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const distance = 80 + Math.random() * 60;
      const startDelay = 200 + i * 30;

      p.opacity.value = withDelay(startDelay, withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(800, withTiming(0, { duration: 400 }))
      ));

      p.scale.value = withDelay(startDelay, withSequence(
        withSpring(1, { damping: 10, stiffness: 300 }),
        withDelay(600, withTiming(0.3, { duration: 300 }))
      ));

      p.x.value = withDelay(startDelay, withSpring(
        Math.cos(angle) * distance,
        { damping: 12, stiffness: 100 }
      ));

      p.y.value = withDelay(startDelay, withSpring(
        Math.sin(angle) * distance - 20,
        { damping: 12, stiffness: 100 }
      ));

      p.rotate.value = withDelay(startDelay, withTiming(
        (Math.random() - 0.5) * 720,
        { duration: 1200 }
      ));
    });
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const mainStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mainScale.value * pulse.value },
    ],
    opacity: mainOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, bgStyle]}>
      {/* Particles */}
      {particles.map((p, i) => {
        const pStyle = useAnimatedStyle(() => ({
          transform: [
            { translateX: p.x.value },
            { translateY: p.y.value },
            { scale: p.scale.value },
            { rotate: `${p.rotate.value}deg` },
          ],
          opacity: p.opacity.value,
        }));

        return (
          <Animated.Text
            key={i}
            style={[styles.particle, pStyle]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}

      {/* Main emoji */}
      <Animated.Text style={[styles.mainEmoji, mainStyle]}>
        {emoji}
      </Animated.Text>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    fontSize: 28,
  },
  mainEmoji: {
    fontSize: 96,
    marginBottom: Spacing.lg,
  },
  titleContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.headingXL,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyL,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
