/**
 * DailyProgressWidget — Today's learning progress card
 *
 * Shows:
 * - Circular progress ring (animated fill)
 * - Lessons completed / total
 * - XP earned today
 * - Time estimate for remaining
 * - Next lesson preview
 * - CTA button to start/continue
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { DuoButton } from '../ui/DuoButton';
import { hapticTap, hapticProgressComplete } from '../../utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DailyProgressWidgetProps {
  completed: number;
  total: number;
  xpToday: number;
  nextLessonTitle?: string;
  nextLessonEmoji?: string;
  onStartLesson?: () => void;
  minutesRemaining?: number;
}

const RING_SIZE = 80;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function DailyProgressWidget({
  completed,
  total,
  xpToday,
  nextLessonTitle,
  nextLessonEmoji,
  onStartLesson,
  minutesRemaining,
}: DailyProgressWidgetProps) {
  const progress = total > 0 ? completed / total : 0;
  const ringProgress = useSharedValue(0);
  const cardScale = useSharedValue(0.95);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    ringProgress.value = withDelay(
      400,
      withTiming(progress, { duration: 1000, easing: Easing.out(Easing.cubic) })
    );

    if (progress >= 1) {
      setTimeout(() => hapticProgressComplete(), 1400);
    }
  }, [progress]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const isDone = completed >= total && total > 0;

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Animated.View style={[styles.content, contentStyle]}>
        {/* Left — Ring */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={Colors.primaryLight}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={isDone ? Colors.successGreen : Colors.primary}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              animatedProps={ringProps}
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.ringCenter}>
            <Text style={styles.ringNumber}>{completed}</Text>
            <Text style={styles.ringTotal}>/{total}</Text>
          </View>
        </View>

        {/* Right — Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>
            {isDone ? 'Все уроки сделаны! 🎉' : 'Сегодня'}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>⭐ {xpToday} XP</Text>
            </View>
            {minutesRemaining != null && minutesRemaining > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>⏱ ~{minutesRemaining} мин</Text>
              </View>
            )}
          </View>

          {/* Next lesson or CTA */}
          {!isDone && nextLessonTitle && (
            <View style={styles.nextLesson}>
              <Text style={styles.nextLessonLabel}>Следующий:</Text>
              <Text style={styles.nextLessonTitle} numberOfLines={1}>
                {nextLessonEmoji} {nextLessonTitle}
              </Text>
            </View>
          )}

          {!isDone && onStartLesson && (
            <DuoButton
              title={completed > 0 ? 'Продолжить' : 'Начать'}
              emoji={completed > 0 ? '▶️' : '🚀'}
              onPress={onStartLesson}
              variant="primary"
              size="compact"
              style={styles.ctaButton}
            />
          )}

          {isDone && (
            <Text style={styles.doneMessage}>
              Отдыхай и играй! Увидимся завтра 🌈
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ringNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  ringTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  infoSection: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.headingS,
    fontSize: 17,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statChip: {
    backgroundColor: Colors.cream,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextLesson: {
    gap: 1,
  },
  nextLessonLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
  },
  nextLessonTitle: {
    ...Typography.bodyS,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ctaButton: {
    marginTop: Spacing.xxs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  doneMessage: {
    ...Typography.bodyS,
    color: Colors.successGreen,
    fontWeight: '600',
  },
});
