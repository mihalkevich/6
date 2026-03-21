import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Card, ProgressBar, StreakBadge } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { categories } from '../data/categories';
import { lessons } from '../data/lessons';

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

  // Week activity (mock)
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Прогресс</Text>

        {/* Streak Card */}
        <Card style={styles.streakCard} elevated>
          <View style={styles.streakRow}>
            <View>
              <Text style={styles.streakTitle}>Серия дней</Text>
              <Text style={styles.streakDays}>
                {streak.currentDays} {streak.currentDays === 1 ? 'день' : 'дней'}
              </Text>
            </View>
            <StreakBadge days={streak.currentDays} />
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((day, i) => {
              const isActive = i < todayIndex || (i === todayIndex && streak.currentDays > 0);
              const isToday = i === todayIndex;
              return (
                <View key={day} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekDot,
                      isActive && styles.weekDotActive,
                      isToday && styles.weekDotToday,
                    ]}
                  >
                    {isActive && <Text style={styles.weekCheck}>✓</Text>}
                  </View>
                  <Text
                    style={[
                      styles.weekLabel,
                      isToday && styles.weekLabelToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Overall Progress */}
        <Card style={styles.overallCard}>
          <Text style={styles.overallTitle}>Общий прогресс</Text>
          <View style={styles.overallRow}>
            <Text style={styles.overallPercent}>
              {Math.round(overallProgress * 100)}%
            </Text>
            <View style={styles.overallBarContainer}>
              <ProgressBar
                progress={overallProgress}
                color={Colors.successGreen}
                height={12}
              />
            </View>
          </View>
          <Text style={styles.overallSubtext}>
            {progress.completedLessonIds.length} из {totalLessons} уроков пройдено
          </Text>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statNumber}>{progress.totalXP}</Text>
            <Text style={styles.statLabel}>Очков XP</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📚</Text>
            <Text style={styles.statNumber}>{progress.totalLessons}</Text>
            <Text style={styles.statLabel}>Уроков</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={styles.statNumber}>
              {rewards.filter((r) => r.type === 'star').length}
            </Text>
            <Text style={styles.statLabel}>Звёзд</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statNumber}>{streak.longestDays}</Text>
            <Text style={styles.statLabel}>Макс. серия</Text>
          </Card>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>По категориям</Text>
        {categoryProgress.map((cp) => (
          <Card key={cp.category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryEmoji}>{cp.category.emoji}</Text>
              <Text style={styles.categoryName}>{cp.category.nameRu}</Text>
              <Text style={styles.categoryCount}>
                {cp.completed}/{cp.total}
              </Text>
            </View>
            <ProgressBar
              progress={cp.progress}
              color={cp.progress >= 1 ? Colors.successGreen : Colors.primary}
              height={6}
            />
          </Card>
        ))}

        {/* Rewards */}
        {rewards.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Награды</Text>
            <View style={styles.rewardsGrid}>
              {rewards.map((reward) => (
                <View key={reward.id} style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
                  <Text style={styles.rewardName} numberOfLines={1}>
                    {reward.name}
                  </Text>
                </View>
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
  streakCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
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
    ...Typography.headingM,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotActive: {
    backgroundColor: Colors.successLight,
  },
  weekDotToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  weekCheck: {
    color: Colors.successGreen,
    fontWeight: '700',
    fontSize: 16,
  },
  weekLabel: {
    ...Typography.caption,
  },
  weekLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  overallCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  overallTitle: {
    ...Typography.headingS,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  overallPercent: {
    ...Typography.headingL,
    color: Colors.successGreen,
    minWidth: 56,
  },
  overallBarContainer: {
    flex: 1,
  },
  overallSubtext: {
    ...Typography.caption,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
    padding: Spacing.md,
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
  },
  sectionTitle: {
    ...Typography.headingM,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    ...Typography.bodyM,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryCount: {
    ...Typography.caption,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  rewardItem: {
    width: 80,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  rewardEmoji: {
    fontSize: 40,
  },
  rewardName: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
