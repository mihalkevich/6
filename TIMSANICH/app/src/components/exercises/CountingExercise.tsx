/**
 * CountingExercise — Tap to count objects
 *
 * Shows a grid of emoji objects. Child taps each one to count.
 * Each tap: haptic + number appears + object bounces.
 * Then selects the correct total from options.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap, hapticSuccess } from '../../utils/haptics';
import { DuoOptionCard } from '../ui/DuoOptionCard';
import type { LessonOption } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CountingExerciseProps {
  questionRu: string;
  /** The emoji to count */
  emoji: string;
  /** How many objects to show */
  count: number;
  /** Answer options */
  options: LessonOption[];
  correctAnswerId: string;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
  selectedId: string | null;
}

export function CountingExercise({
  questionRu,
  emoji,
  count,
  options,
  correctAnswerId,
  onAnswer,
  answered,
  selectedId,
}: CountingExerciseProps) {
  const [tappedIndices, setTappedIndices] = useState<Set<number>>(new Set());
  const itemScales = Array.from({ length: count }, () => useSharedValue(1));

  const handleTapItem = useCallback((index: number) => {
    if (tappedIndices.has(index)) return;
    hapticTap();

    // Bounce animation
    itemScales[index].value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );

    setTappedIndices((prev) => new Set(prev).add(index));
  }, [tappedIndices]);

  const handleSelectAnswer = (optionId: string) => {
    const correct = optionId === correctAnswerId;
    if (correct) hapticSuccess();
    onAnswer(correct);
  };

  const getOptionState = (optionId: string) => {
    if (!answered) return selectedId === optionId ? 'selected' : 'default';
    if (optionId === correctAnswerId) return 'correct';
    if (optionId === selectedId) return 'incorrect';
    return 'disabled';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{questionRu}</Text>

      {/* Counting grid */}
      <View style={styles.countingGrid}>
        {Array.from({ length: count }, (_, i) => {
          const isTapped = tappedIndices.has(i);
          const scaleStyle = useAnimatedStyle(() => ({
            transform: [{ scale: itemScales[i].value }],
          }));

          return (
            <AnimatedPressable
              key={i}
              onPress={() => handleTapItem(i)}
              style={[styles.countItem, isTapped && styles.countItemTapped, scaleStyle]}
            >
              <Text style={styles.countEmoji}>{emoji}</Text>
              {isTapped && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {Array.from(tappedIndices).sort().indexOf(i) + 1}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <Text style={styles.countLabel}>
        Посчитано: {tappedIndices.size} из {count}
      </Text>

      {/* Answer options */}
      <View style={styles.options}>
        {options.map((opt, i) => (
          <DuoOptionCard
            key={opt.id}
            label={opt.label}
            emoji={opt.emoji}
            onPress={() => handleSelectAnswer(opt.id)}
            state={getOptionState(opt.id) as any}
            layout="grid"
            index={i}
            disabled={answered}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  question: {
    ...Typography.headingM,
    textAlign: 'center',
  },
  countingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    maxWidth: 280,
  },
  countItem: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  countItemTapped: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  countEmoji: {
    fontSize: 36,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  countLabel: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
});
