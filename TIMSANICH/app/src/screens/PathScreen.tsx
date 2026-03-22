/**
 * PathScreen — Duolingo-style learning path
 *
 * A vertical scrolling path with:
 * - Bouncing 3D node buttons for each lesson
 * - Smooth curved connecting lines
 * - Crown/star decorations on completed nodes
 * - Pulsing glow on current (available) lesson
 * - Locked nodes with shake animation when tapped
 * - Category banners as section dividers
 * - Haptic feedback throughout
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
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
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { lessons } from '../data/lessons';
import { categories } from '../data/categories';
import { hapticTap, hapticPress, hapticError } from '../utils/haptics';
import type { LessonStatus } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width } = Dimensions.get('window');
const NODE_SIZE = 72;
const NODE_DEPTH = 5;
const PATH_WIDTH = width - Spacing.lg * 2;
const VERTICAL_GAP = 110;

interface PathScreenProps {
  onStartLesson: (lessonId: string) => void;
}

// === Path Node Component ===
function PathNode({
  lesson,
  status,
  index,
  x,
  onPress,
  isFirstAvailable,
}: {
  lesson: { id: string; emoji: string; titleRu: string };
  status: LessonStatus;
  index: number;
  x: number;
  onPress: () => void;
  isFirstAvailable: boolean;
}) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(0);
  const glow = useSharedValue(0);
  const shake = useSharedValue(0);
  const crown = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance
    scale.value = withDelay(
      index * 60,
      withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 })
    );

    // Pulsing glow for current lesson
    if (isFirstAvailable) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    // Crown bounce for completed
    if (status === 'completed') {
      crown.value = withDelay(
        index * 60 + 300,
        withSpring(1, { damping: 8, stiffness: 250 })
      );
    }
  }, []);

  const handlePressIn = useCallback(() => {
    if (status === 'locked') return;
    pressed.value = withTiming(1, { duration: 60 });
  }, [status]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 400, mass: 0.4 });
  }, []);

  const handlePress = useCallback(() => {
    if (status === 'locked') {
      hapticError();
      shake.value = withSequence(
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(-3, { duration: 40 }),
        withTiming(3, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
      return;
    }
    hapticPress();
    onPress();
  }, [status, onPress]);

  const colors = getNodeColors(status);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, NODE_DEPTH - 1]) },
      { translateX: shake.value },
    ],
    borderBottomWidth: interpolate(pressed.value, [0, 1], [NODE_DEPTH, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.4]) }],
  }));

  const crownStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: crown.value },
      { translateY: interpolate(crown.value, [0, 1], [10, 0]) },
    ],
    opacity: crown.value,
  }));

  return (
    <View style={[styles.nodeWrapper, { left: x - NODE_SIZE / 2, top: index * VERTICAL_GAP }]}>
      {/* Glow ring for available lesson */}
      {isFirstAvailable && (
        <Animated.View style={[styles.glowRing, glowStyle]} />
      )}

      {/* Crown for completed */}
      {status === 'completed' && (
        <Animated.View style={[styles.crownContainer, crownStyle]}>
          <Text style={styles.crownEmoji}>👑</Text>
        </Animated.View>
      )}

      {/* Main node */}
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.node,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderBottomColor: colors.bottomBorder,
          },
          nodeStyle,
        ]}
      >
        <Text style={styles.nodeEmoji}>
          {status === 'locked' ? '🔒' : lesson.emoji}
        </Text>
      </AnimatedPressable>

      {/* Star count for completed */}
      {status === 'completed' && (
        <Animated.View style={[styles.starBadge, crownStyle]}>
          <Text style={styles.starBadgeText}>⭐</Text>
        </Animated.View>
      )}

      {/* Label */}
      <Text
        style={[
          styles.nodeLabel,
          status === 'locked' && styles.nodeLabelLocked,
          isFirstAvailable && styles.nodeLabelActive,
        ]}
        numberOfLines={2}
      >
        {lesson.titleRu}
      </Text>
    </View>
  );
}

// === Connecting Line Component ===
function ConnectingLine({
  fromX,
  fromY,
  toX,
  toY,
  completed,
  index,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  completed: boolean;
  index: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 60 + 200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  // Calculate line angle and length
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <Animated.View
      style={[
        styles.connectingLine,
        {
          width: length,
          left: fromX,
          top: fromY,
          transform: [{ rotate: `${angle}deg` }],
          backgroundColor: completed ? Colors.successGreen : Colors.lockedGrayLight,
        },
        lineStyle,
      ]}
    />
  );
}

// === Section Banner ===
function SectionBanner({
  emoji,
  title,
  completedCount,
  totalCount,
  index,
}: {
  emoji: string;
  title: string;
  completedCount: number;
  totalCount: number;
  index: number;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 14, stiffness: 200 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const isComplete = completedCount === totalCount;

  return (
    <Animated.View style={[styles.sectionBanner, isComplete && styles.sectionBannerComplete, style]}>
      <Text style={styles.bannerEmoji}>{emoji}</Text>
      <View style={styles.bannerTextBlock}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={[styles.bannerProgress, isComplete && styles.bannerProgressComplete]}>
          {completedCount}/{totalCount} {isComplete ? '✅' : ''}
        </Text>
      </View>
      {/* Mini progress bar */}
      <View style={styles.bannerProgressBar}>
        <View
          style={[
            styles.bannerProgressFill,
            {
              width: `${(completedCount / Math.max(totalCount, 1)) * 100}%`,
              backgroundColor: isComplete ? Colors.successGreen : Colors.primary,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// === Main PathScreen ===
export function PathScreen({ onStartLesson }: PathScreenProps) {
  const { child, progress } = useAppStore();

  if (!child) return null;

  const ageLessons = lessons.filter(
    (l) => child.age >= l.ageMin && child.age <= l.ageMax
  );

  // Group by category
  const grouped = categories
    .map((cat) => ({
      category: cat,
      lessons: ageLessons.filter((l) => l.categoryId === cat.id),
    }))
    .filter((g) => g.lessons.length > 0);

  const getStatus = (lessonId: string, requiredIds: string[]): LessonStatus => {
    if (progress.completedLessonIds.includes(lessonId)) return 'completed';
    const allDepsMet = requiredIds.every((id) =>
      progress.completedLessonIds.includes(id)
    );
    return allDepsMet ? 'available' : 'locked';
  };

  // Find first available lesson globally
  let firstAvailableId: string | null = null;
  for (const group of grouped) {
    for (const lesson of group.lessons) {
      const status = getStatus(lesson.id, lesson.requiredLessonIds);
      if (status === 'available') {
        firstAvailableId = lesson.id;
        break;
      }
    }
    if (firstAvailableId) break;
  }

  // Zigzag pattern positions
  const getNodeX = (index: number): number => {
    const positions = [0.3, 0.55, 0.75, 0.55];
    return PATH_WIDTH * positions[index % positions.length];
  };

  const totalCompleted = progress.completedLessonIds.length;
  const totalLessons = ageLessons.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Путь знаний</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              ⭐ {totalCompleted}/{totalLessons}
            </Text>
          </View>
        </View>
        {/* Overall progress bar */}
        <View style={styles.overallProgress}>
          <View
            style={[
              styles.overallProgressFill,
              { width: `${(totalCompleted / Math.max(totalLessons, 1)) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {grouped.map((group, groupIndex) => {
          const completedInGroup = group.lessons.filter((l) =>
            progress.completedLessonIds.includes(l.id)
          ).length;

          return (
            <View key={group.category.id} style={styles.section}>
              {/* Section Banner */}
              <SectionBanner
                emoji={group.category.emoji}
                title={group.category.nameRu}
                completedCount={completedInGroup}
                totalCount={group.lessons.length}
                index={groupIndex}
              />

              {/* Path with nodes */}
              <View style={[styles.nodesContainer, { height: group.lessons.length * VERTICAL_GAP + 40 }]}>
                {/* Connecting lines */}
                {group.lessons.map((lesson, i) => {
                  if (i === 0) return null;
                  const prevStatus = getStatus(
                    group.lessons[i - 1].id,
                    group.lessons[i - 1].requiredLessonIds
                  );

                  const fromX = getNodeX(i - 1);
                  const toX = getNodeX(i);
                  const fromY = (i - 1) * VERTICAL_GAP + NODE_SIZE / 2;
                  const toY = i * VERTICAL_GAP + NODE_SIZE / 2;

                  return (
                    <ConnectingLine
                      key={`line-${lesson.id}`}
                      fromX={fromX}
                      fromY={fromY}
                      toX={toX}
                      toY={toY}
                      completed={prevStatus === 'completed'}
                      index={i}
                    />
                  );
                })}

                {/* Nodes */}
                {group.lessons.map((lesson, i) => {
                  const status = getStatus(lesson.id, lesson.requiredLessonIds);
                  const nodeX = getNodeX(i);

                  return (
                    <PathNode
                      key={lesson.id}
                      lesson={lesson}
                      status={status}
                      index={i}
                      x={nodeX}
                      onPress={() => onStartLesson(lesson.id)}
                      isFirstAvailable={lesson.id === firstAvailableId}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getNodeColors(status: LessonStatus) {
  switch (status) {
    case 'completed':
      return {
        bg: Colors.successGreen,
        border: '#5AB869',
        bottomBorder: '#4A9855',
      };
    case 'available':
      return {
        bg: Colors.primary,
        border: '#3D8BCB',
        bottomBorder: '#2D6FA3',
      };
    case 'locked':
    default:
      return {
        bg: Colors.lockedGrayLight,
        border: Colors.lockedGray,
        bottomBorder: '#B0B0B0',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.headingL,
  },
  headerBadge: {
    backgroundColor: Colors.rewardGoldLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  headerBadgeText: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.warningAmber,
  },
  overallProgress: {
    height: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  // Section banner
  sectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionBannerComplete: {
    borderColor: Colors.successGreen,
    borderBottomColor: '#4DAF5C',
    backgroundColor: Colors.successLight,
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerTextBlock: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    ...Typography.headingS,
  },
  bannerProgress: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bannerProgressComplete: {
    color: Colors.successGreen,
    fontWeight: '700',
  },
  bannerProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
  },
  bannerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Nodes
  nodesContainer: {
    position: 'relative',
    width: '100%',
  },
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: NODE_SIZE + 40,
    marginLeft: -20,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderBottomWidth: NODE_DEPTH,
    ...Shadows.elevated,
  },
  nodeEmoji: {
    fontSize: 32,
  },
  nodeLabel: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textPrimary,
    marginTop: Spacing.xxs,
    fontWeight: '600',
    width: NODE_SIZE + 40,
  },
  nodeLabelLocked: {
    color: Colors.lockedGray,
  },
  nodeLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  // Glow
  glowRing: {
    position: 'absolute',
    width: NODE_SIZE + 16,
    height: NODE_SIZE + 16,
    borderRadius: (NODE_SIZE + 16) / 2,
    backgroundColor: Colors.primaryLight,
    left: -8,
    top: -8,
    zIndex: -1,
  },
  // Crown
  crownContainer: {
    position: 'absolute',
    top: -18,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 20,
  },
  // Star badge
  starBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    zIndex: 10,
  },
  starBadgeText: {
    fontSize: 16,
  },
  // Connecting line
  connectingLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
});
