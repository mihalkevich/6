/**
 * ReminderOverlay — Smart popup on app open
 *
 * Like Duolingo's "Don't break your streak!" overlay.
 * Appears when:
 * - Streak is at risk (no lessons today, getting late)
 * - Returning after 2+ days
 * - Milestone reached
 * - Daily goal almost complete
 *
 * Features:
 * - Slide up from bottom with spring
 * - Large animated mascot emoji
 * - Contextual message
 * - Urgency-colored border
 * - CTA button with haptic
 * - Dismiss gesture
 * - Auto-dismiss after 10s
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { DuoButton } from '../ui/DuoButton';
import { hapticPress, hapticError, hapticHeavy } from '../../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ReminderType =
  | 'streak_risk'
  | 'comeback'
  | 'milestone'
  | 'almost_done'
  | 'daily_reminder';

interface ReminderOverlayProps {
  type: ReminderType;
  childName: string;
  streakDays: number;
  lessonsRemaining?: number;
  onAction: () => void;
  onDismiss: () => void;
}

const REMINDER_CONFIG: Record<ReminderType, {
  emoji: string;
  title: (name: string, streak: number, remaining?: number) => string;
  subtitle: (name: string, streak: number, remaining?: number) => string;
  ctaTitle: string;
  ctaEmoji: string;
  borderColor: string;
  bgColor: string;
  animation: 'shake' | 'bounce' | 'pulse';
}> = {
  streak_risk: {
    emoji: '😰',
    title: (_, streak) => `Серия ${streak} дней в опасности!`,
    subtitle: (name) => `${name}, быстрый урок — и серия сохранена!`,
    ctaTitle: 'Спасти серию',
    ctaEmoji: '🔥',
    borderColor: '#EF6461',
    bgColor: '#FDECEC',
    animation: 'shake',
  },
  comeback: {
    emoji: '🥹',
    title: (name) => `${name}, мы скучали!`,
    subtitle: () => 'Давай начнём заново с лёгкого урока?',
    ctaTitle: 'Вернуться',
    ctaEmoji: '💪',
    borderColor: '#4A9FE5',
    bgColor: '#E8F3FC',
    animation: 'bounce',
  },
  milestone: {
    emoji: '🏆',
    title: (_, streak) => `${streak} дней подряд!`,
    subtitle: (name) => `${name}, ты невероятный! Продолжай!`,
    ctaTitle: 'Продолжить',
    ctaEmoji: '🚀',
    borderColor: '#F5B461',
    bgColor: '#FFF4E3',
    animation: 'bounce',
  },
  almost_done: {
    emoji: '🎯',
    title: (_, __, remaining) => `Ещё ${remaining || 1} ${(remaining || 1) === 1 ? 'урок' : 'урока'}!`,
    subtitle: (name) => `${name}, ты почти у цели! Осталось чуть-чуть!`,
    ctaTitle: 'Закончить',
    ctaEmoji: '⭐',
    borderColor: '#6BCB77',
    bgColor: '#E8F8EA',
    animation: 'pulse',
  },
  daily_reminder: {
    emoji: '📚',
    title: (name) => `Привет, ${name}!`,
    subtitle: () => 'Время для коротких занятий! Всего пара минут.',
    ctaTitle: 'Начать урок',
    ctaEmoji: '▶️',
    borderColor: '#4A9FE5',
    bgColor: '#E8F3FC',
    animation: 'bounce',
  },
};

export function ReminderOverlay({
  type,
  childName,
  streakDays,
  lessonsRemaining,
  onAction,
  onDismiss,
}: ReminderOverlayProps) {
  const config = REMINDER_CONFIG[type];
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const emojiAnim = useSharedValue(0);

  useEffect(() => {
    // Fire haptic based on type
    if (type === 'streak_risk') {
      hapticError();
    } else if (type === 'milestone') {
      hapticHeavy();
    } else {
      hapticPress();
    }

    // Backdrop fade
    backdropOpacity.value = withTiming(1, { duration: 300 });

    // Card slide up
    translateY.value = withSpring(0, { damping: 16, stiffness: 140, mass: 0.6 });

    // Emoji entrance
    emojiScale.value = withDelay(
      300,
      withSpring(1, { damping: 8, stiffness: 200, mass: 0.5 })
    );

    // Emoji animation loop
    switch (config.animation) {
      case 'shake':
        emojiAnim.value = withDelay(500, withRepeat(
          withSequence(
            withTiming(-6, { duration: 60 }),
            withTiming(6, { duration: 60 }),
            withTiming(-4, { duration: 60 }),
            withTiming(4, { duration: 60 }),
            withTiming(0, { duration: 60 }),
            withTiming(0, { duration: 2000 }),
          ),
          -1,
          false
        ));
        break;
      case 'bounce':
        emojiAnim.value = withDelay(500, withRepeat(
          withSequence(
            withTiming(-8, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true
        ));
        break;
      case 'pulse':
        emojiScale.value = withDelay(500, withRepeat(
          withSequence(
            withTiming(1.15, { duration: 600 }),
            withTiming(1, { duration: 600 }),
          ),
          -1,
          true
        ));
        break;
    }

    // Auto-dismiss after 10s
    const timer = setTimeout(handleDismiss, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss]);

  const handleAction = useCallback(() => {
    hapticHeavy();
    handleDismiss();
    setTimeout(onAction, 350);
  }, [onAction, handleDismiss]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { translateY: config.animation === 'bounce' ? emojiAnim.value : 0 },
      { translateX: config.animation === 'shake' ? emojiAnim.value : 0 },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Pressable onPress={handleDismiss} style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
          cardStyle,
        ]}
      >
        {/* Dismiss handle */}
        <View style={styles.handle} />

        {/* Emoji */}
        <Animated.Text style={[styles.emoji, emojiStyle]}>
          {config.emoji}
        </Animated.Text>

        {/* Title */}
        <Text style={styles.title}>
          {config.title(childName, streakDays, lessonsRemaining)}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {config.subtitle(childName, streakDays, lessonsRemaining)}
        </Text>

        {/* CTA */}
        <DuoButton
          title={config.ctaTitle}
          emoji={config.ctaEmoji}
          onPress={handleAction}
          variant="primary"
          heavy
          style={styles.ctaButton}
        />

        {/* Dismiss link */}
        <Pressable onPress={handleDismiss} style={styles.dismissLink}>
          <Text style={styles.dismissText}>Позже</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 2,
    borderBottomWidth: 0,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl + 20,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    ...Typography.headingL,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyL,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaButton: {
    width: '100%',
    maxWidth: 280,
    marginTop: Spacing.sm,
  },
  dismissLink: {
    padding: Spacing.sm,
  },
  dismissText: {
    ...Typography.bodyM,
    color: Colors.textLight,
  },
});
