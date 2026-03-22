/**
 * ProgressScreen — Animated stats with skill visualization
 *
 * Features:
 * - Animated counting numbers
 * - 3D stat cards with depth
 * - Skill level bars with staggered animation
 * - Weekly activity calendar with haptic
 * - Reward showcase with bounce-in
 * - Category progress with animated bars
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  FadeIn,
  SlideInRight,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { AnimatedProgressBar, Card, StreakBadge } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { categories } from '../data/categories';
import { lessons } from '../data/lessons';
import { hapticTap, hapticCelebration } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// === Animated Counter ===
function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withDelay(
      delay,
      withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [value]);

  const style = useAnimatedStyle(() => ({
    // Using opacity as a proxy — actual number display below
  }));

  // For simplicity, show the final number with a scale animation
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
  }, []);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.Text style={[styles.statNumber, scaleStyle]}>
      {value}
    </Animated.Text>
  );
}

// === 3D Stat Card ===
function StatCard3D({
  emoji,
  value,
  label,
  color,
  index,
}: {
  emoji: string;
  value: number;
  label: string;
  color: string;
  index: number;
}) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 })
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, 3]) },
    ],
    borderBottomWidth: interpolate(pressed.value, [0, 1], [4, 1]),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = withTiming(1, { duration: 60 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 400 }); }}
      onPress={() => hapticTap()}
      style={[
        styles.statCard,
        { borderBottomColor: color + '80' },
        cardStyle,
      ]}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <AnimatedNumber value={value} delay={index * 100 + 200} />
      <Text style={styles.statLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

// === Skill Level Bar ===
function SkillBar({
  name,
  emoji,
  level,
  maxLevel,
  index,
}: {
  name: string;
  emoji: string;
  level: number;
  maxLevel: number;
  index: number;
}) {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(
      300 + index * 80,
      withTiming(level / maxLevel, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [level]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 60).springify()}
      style={styles.skillRow}
    >
      <Text style={styles.skillEmoji}>{emoji}</Text>
      <View style={styles.skillInfo}>
        <View style={styles.skillLabelRow}>
          <Text style={styles.skillName}>{name}</Text>
          <Text style={styles.skillLevel}>{level}/{maxLevel}</Text>
        </View>
        <View style={styles.skillTrack}>
          <Animated.View
            style={[
              styles.skillFill,
              {
                backgroundColor: level >= maxLevel
                  ? Colors.successGreen
                  : level >= maxLevel * 0.6
                  ? Colors.primary
                  : Colors.warningAmber,
              },
              fillStyle,
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

// === Week Activity ===
function WeekActivity({
  currentDays,
  onDayPress,
}: {
  currentDays: number;
  onDayPress?: (day: number) => void;
}) {
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <View style={styles.weekRow}>
      {weekDays.map((day, i) => {
        const isActive = i < todayIndex || (i === todayIndex && currentDays > 0);
        const isToday = i === todayIndex;

        const dotScale = useSharedValue(0);

        useEffect(() => {
          dotScale.value = withDelay(
            i * 60,
            withSpring(1, { damping: 10, stiffness: 250 })
          );
        }, []);

        const dotStyle = useAnimatedStyle(() => ({
          transform: [{ scale: dotScale.value }],
        }));

        return (
          <Pressable
            key={day}
            onPress={() => {
              hapticTap();
              onDayPress?.(i);
            }}
            style={styles.weekDay}
          >
            <Animated.View
              style={[
                styles.weekDot,
                isActive && styles.weekDotActive,
                isToday && styles.weekDotToday,
                dotStyle,
              ]}
            >
              {isActive && <Text style={styles.weekCheck}>✓</Text>}
            </Animated.View>
            <Text
              style={[
                styles.weekLabel,
                isToday && styles.weekLabelToday,
              ]}
            >
              {day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// === Reward Badge ===
function RewardBadge({
  emoji,
  name,
  index,
}: {
  emoji: string;
  name: string;
  index: number;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withSpring(1, { damping: 8, stiffness: 250, mass: 0.5 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={() => hapticTap()}>
      <Animated.View style={[styles.rewardItem, style]}>
        <View style={styles.rewardCircle}>
          <Text style={styles.rewardEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.rewardName} numberOfLines={1}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
}

// === Main ProgressScreen ===
export function ProgressScreen() {
  const { child, streak, progress, rewards } = useAppStore();

  if (!child) return null;

  const ageLessons = lessons.filter(
    (l) => child.age >= l.ageMin && child.age <= l.ageMax
  );
  const totalLessons = ageLessons.length;
  const overallProgress =
    totalLessons > 0 ? progress.completedLessonIds.length / totalLessons : 0;

  // Category breakdown
  const categoryProgress = categories
    .map((cat) => {
      const catLessons = ageLessons.filter((l) => l.categoryId === cat.id);
      const completed = catLessons.filter((l) =>
        progress.completedLessonIds.includes(l.id)
      ).length;
      return {
        category: cat,
        total: catLessons.length,
        completed,
        progress: catLessons.length > 0 ? completed / catLessons.length : 0,
      };
    })
    .filter((c) => c.total > 0);

  // Skill levels from completed lessons
  const skills = [
    { name: 'Словарный запас', emoji: '📚', key: 'vocabulary' },
    { name: 'Понимание речи', emoji: '👂', key: 'receptive_language' },
    { name: 'Активная речь', emoji: '🗣️', key: 'expressive_language' },
    { name: 'Логика', emoji: '🧩', key: 'logical_thinking' },
    { name: 'Внимание', emoji: '👀', key: 'attention' },
    { name: 'Память', emoji: '🧠', key: 'working_memory' },
    { name: 'Восприятие', emoji: '🎨', key: 'visual_perception' },
    { name: 'Эмоции', emoji: '💛', key: 'emotional_intelligence' },
  ];

  // Calculate skill levels from real progress data
  const skillLevels = skills.map((skill) => {
    const rawLevel = (progress.skillLevels as Record<string, number>)?.[skill.key] || 0;
    const level = Math.min(10, Math.round(rawLevel));
    return { ...skill, level, maxLevel: 10 };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeIn.duration(300)} style={styles.title}>
          Прогресс
        </Animated.Text>

        {/* Streak Card — 3D */}
        <Animated.View
          entering={FadeIn.delay(100).springify()}
          style={styles.streakCard}
        >
          <View style={styles.streakRow}>
            <View>
              <Text style={styles.streakTitle}>Серия дней</Text>
              <Text style={styles.streakDays}>
                {streak.currentDays} {streak.currentDays === 1 ? 'день' : 'дней'}
              </Text>
              <Text style={styles.streakRecord}>
                Рекорд: {streak.longestDays} дней 🏅
              </Text>
            </View>
            <StreakBadge days={streak.currentDays} />
          </View>
          <WeekActivity currentDays={streak.currentDays} />
        </Animated.View>

        {/* Overall Progress — with animated bar */}
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          style={styles.overallCard}
        >
          <Text style={styles.overallTitle}>Общий прогресс</Text>
          <View style={styles.overallRow}>
            <AnimatedNumber value={Math.round(overallProgress * 100)} delay={300} />
            <Text style={styles.percentSign}>%</Text>
            <View style={styles.overallBarContainer}>
              <AnimatedProgressBar
                progress={overallProgress}
                color={Colors.successGreen}
                height={14}
              />
            </View>
          </View>
          <Text style={styles.overallSubtext}>
            {progress.completedLessonIds.length} из {totalLessons} уроков пройдено
          </Text>
        </Animated.View>

        {/* Stats Grid — 3D cards */}
        <View style={styles.statsGrid}>
          <StatCard3D emoji="⭐" value={progress.totalXP} label="Очков XP" color={Colors.rewardGold} index={0} />
          <StatCard3D emoji="📚" value={progress.totalLessons} label="Уроков" color={Colors.primary} index={1} />
          <StatCard3D emoji="🏆" value={rewards.filter((r) => r.type === 'star').length} label="Звёзд" color={Colors.warningAmber} index={2} />
          <StatCard3D emoji="🔥" value={streak.longestDays} label="Макс. серия" color={Colors.errorRed} index={3} />
        </View>

        {/* Skills Section */}
        <Animated.Text entering={FadeIn.delay(500)} style={styles.sectionTitle}>
          Навыки развития
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(500)} style={styles.skillsCard}>
          {skillLevels.map((skill, i) => (
            <SkillBar
              key={skill.key}
              name={skill.name}
              emoji={skill.emoji}
              level={skill.level}
              maxLevel={skill.maxLevel}
              index={i}
            />
          ))}
        </Animated.View>

        {/* Category Breakdown */}
        <Animated.Text entering={FadeIn.delay(700)} style={styles.sectionTitle}>
          По категориям
        </Animated.Text>
        {categoryProgress.map((cp, i) => (
          <Animated.View
            key={cp.category.id}
            entering={SlideInRight.delay(700 + i * 60).springify()}
            style={styles.categoryCard}
          >
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryEmoji}>{cp.category.emoji}</Text>
              <Text style={styles.categoryName}>{cp.category.nameRu}</Text>
              <Text style={[
                styles.categoryCount,
                cp.progress >= 1 && styles.categoryCountComplete,
              ]}>
                {cp.completed}/{cp.total} {cp.progress >= 1 ? '✅' : ''}
              </Text>
            </View>
            <AnimatedProgressBar
              progress={cp.progress}
              color={cp.progress >= 1 ? Colors.successGreen : Colors.primary}
              height={8}
            />
          </Animated.View>
        ))}

        {/* Rewards */}
        {rewards.length > 0 && (
          <>
            <Animated.Text entering={FadeIn.delay(900)} style={styles.sectionTitle}>
              Награды 🎖️
            </Animated.Text>
            <View style={styles.rewardsGrid}>
              {rewards.map((reward, i) => (
                <RewardBadge
                  key={reward.id}
                  emoji={reward.emoji}
                  name={reward.name}
                  index={i}
                />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.headingL,
    marginBottom: Spacing.lg,
  },
  // Streak Card
  streakCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakTitle: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
  },
  streakDays: {
    ...Typography.headingL,
  },
  streakRecord: {
    ...Typography.caption,
    color: Colors.warningAmber,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  weekDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weekDotActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successGreen,
  },
  weekDotToday: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  weekCheck: {
    color: Colors.successGreen,
    fontWeight: '800',
    fontSize: 16,
  },
  weekLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  weekLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  // Overall
  overallCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  overallTitle: {
    ...Typography.headingS,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  percentSign: {
    ...Typography.headingL,
    color: Colors.successGreen,
    marginRight: Spacing.sm,
  },
  overallBarContainer: {
    flex: 1,
  },
  overallSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  statEmoji: {
    fontSize: 28,
  },
  statNumber: {
    ...Typography.headingM,
    color: Colors.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  // Skills
  sectionTitle: {
    ...Typography.headingM,
    marginBottom: Spacing.md,
  },
  skillsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skillEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  skillInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  skillLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    ...Typography.bodyS,
    fontWeight: '600',
  },
  skillLevel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  skillTrack: {
    height: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Categories
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryName: {
    ...Typography.bodyM,
    fontWeight: '600',
    flex: 1,
  },
  categoryCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  categoryCountComplete: {
    color: Colors.successGreen,
    fontWeight: '700',
  },
  // Rewards
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  rewardItem: {
    width: 80,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  rewardCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.rewardGoldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.rewardGold,
    borderBottomWidth: 4,
    borderBottomColor: '#DAB800',
  },
  rewardEmoji: {
    fontSize: 28,
  },
  rewardName: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
});
