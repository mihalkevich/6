/**
 * SortingExercise — Sort items into two categories
 *
 * Two "buckets" at the top. Items appear one at a time.
 * Child taps the correct bucket. Haptic + animation on each sort.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap, hapticSuccess, hapticError } from '../../utils/haptics';

interface SortItem {
  id: string;
  emoji: string;
  label: string;
  bucketId: string; // which bucket it belongs to
}

interface SortBucket {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface SortingExerciseProps {
  questionRu: string;
  buckets: SortBucket[];
  items: SortItem[];
  onComplete: (accuracy: number) => void;
}

export function SortingExercise({
  questionRu,
  buckets,
  items,
  onComplete,
}: SortingExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sorted, setSorted] = useState<Record<string, string[]>>({});
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const itemScale = useSharedValue(1);
  const itemOpacity = useSharedValue(1);
  const bucketScales = buckets.map(() => useSharedValue(1));

  const currentItem = items[currentIndex];
  const isComplete = currentIndex >= items.length;

  const handleSort = useCallback((bucketId: string) => {
    if (!currentItem || isComplete) return;

    const isCorrect = currentItem.bucketId === bucketId;
    const bucketIndex = buckets.findIndex((b) => b.id === bucketId);

    if (isCorrect) {
      hapticSuccess();
      // Bounce bucket
      if (bucketIndex >= 0) {
        bucketScales[bucketIndex].value = withSequence(
          withTiming(1.1, { duration: 100 }),
          withSpring(1, { damping: 10, stiffness: 300 })
        );
      }
      setCorrect((c) => c + 1);
    } else {
      hapticError();
      // Shake item
      itemScale.value = withSequence(
        withTiming(0.9, { duration: 80 }),
        withSpring(1, { damping: 12 })
      );
    }

    setTotal((t) => t + 1);

    // Animate item out
    itemOpacity.value = withTiming(0, { duration: 150 }, () => {
      // Reset for next item
      itemOpacity.value = withTiming(1, { duration: 150 });
    });

    // Update sorted items
    setSorted((prev) => ({
      ...prev,
      [bucketId]: [...(prev[bucketId] || []), currentItem.emoji],
    }));

    setTimeout(() => {
      if (currentIndex + 1 >= items.length) {
        onComplete((correct + (isCorrect ? 1 : 0)) / items.length);
      }
      setCurrentIndex((i) => i + 1);
    }, 200);
  }, [currentItem, currentIndex, correct, isComplete]);

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: itemScale.value }],
    opacity: itemOpacity.value,
  }));

  if (isComplete) {
    return (
      <View style={styles.container}>
        <Text style={styles.question}>Всё рассортировано!</Text>
        <View style={styles.bucketsRow}>
          {buckets.map((bucket) => (
            <View key={bucket.id} style={[styles.bucket, { borderColor: bucket.color }]}>
              <Text style={styles.bucketEmoji}>{bucket.emoji}</Text>
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
              <View style={styles.sortedItems}>
                {(sorted[bucket.id] || []).map((emoji, i) => (
                  <Text key={i} style={styles.sortedEmoji}>{emoji}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.scoreText}>
          {correct}/{items.length} правильно
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{questionRu}</Text>

      {/* Buckets */}
      <View style={styles.bucketsRow}>
        {buckets.map((bucket, bi) => {
          const bStyle = useAnimatedStyle(() => ({
            transform: [{ scale: bucketScales[bi].value }],
          }));

          return (
            <Pressable
              key={bucket.id}
              onPress={() => handleSort(bucket.id)}
            >
              <Animated.View style={[
                styles.bucket,
                { borderColor: bucket.color, backgroundColor: bucket.color + '15' },
                bStyle,
              ]}>
                <Text style={styles.bucketEmoji}>{bucket.emoji}</Text>
                <Text style={styles.bucketLabel}>{bucket.label}</Text>
                <View style={styles.sortedItems}>
                  {(sorted[bucket.id] || []).map((emoji, i) => (
                    <Text key={i} style={styles.sortedEmojiSmall}>{emoji}</Text>
                  ))}
                </View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {/* Current item */}
      <Animated.View style={[styles.currentItem, itemStyle]}>
        <Text style={styles.currentEmoji}>{currentItem.emoji}</Text>
        <Text style={styles.currentLabel}>{currentItem.label}</Text>
      </Animated.View>

      <Text style={styles.progressText}>
        {currentIndex + 1} из {items.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  question: {
    ...Typography.headingM,
    textAlign: 'center',
  },
  bucketsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  bucket: {
    width: 150,
    minHeight: 120,
    borderRadius: Radius.xl,
    borderWidth: 3,
    borderStyle: 'dashed',
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bucketEmoji: {
    fontSize: 32,
  },
  bucketLabel: {
    ...Typography.bodyS,
    fontWeight: '700',
    textAlign: 'center',
  },
  sortedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  sortedEmoji: {
    fontSize: 24,
  },
  sortedEmojiSmall: {
    fontSize: 18,
  },
  currentItem: {
    width: 120,
    height: 120,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    borderBottomWidth: 6,
    borderBottomColor: '#3D8BCB',
    gap: Spacing.xxs,
  },
  currentEmoji: {
    fontSize: 48,
  },
  currentLabel: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  scoreText: {
    ...Typography.headingM,
    color: Colors.successGreen,
  },
});
