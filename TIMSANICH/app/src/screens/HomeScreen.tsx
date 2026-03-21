import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Card, DuoButton, AnimatedProgressBar, StreakBadge, EmojiCircle } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { getLessonById } from '../data/lessons';
import { hapticTap, hapticPress } from '../utils/haptics';

interface HomeScreenProps {
  onStartLesson: (lessonId: string) => void;
}

export function HomeScreen({ onStartLesson }: HomeScreenProps) {
  const { child, streak, currentPlan, progress, generateTodayPlan } = useAppStore();

  useEffect(() => {
    if (child && !currentPlan) {
      generateTodayPlan();
    }
  }, [child]);

  if (!child) return null;

  const completedToday = currentPlan?.lessons.filter(
    (l) => l.status === 'completed'
  ).length ?? 0;
  const totalToday = currentPlan?.lessons.length ?? 0;
  const dailyProgress = totalToday > 0 ? completedToday / totalToday : 0;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? 'Доброе утро'
      : greetingHour < 18
      ? 'Добрый день'
      : 'Добрый вечер';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <View style={styles.nameRow}>
              <Text style={styles.childEmoji}>{child.avatarEmoji}</Text>
              <Text style={styles.childName}>{child.name}</Text>
            </View>
          </View>
          <StreakBadge days={streak.currentDays} />
        </View>

        {/* Daily Progress */}
        <Card style={styles.dailyCard} elevated>
          <View style={styles.dailyHeader}>
            <Text style={styles.dailyTitle}>Сегодня</Text>
            <Text style={styles.dailyCount}>
              {completedToday}/{totalToday}
            </Text>
          </View>
          <AnimatedProgressBar
            progress={dailyProgress}
            color={dailyProgress >= 1 ? Colors.successGreen : Colors.primary}
            height={12}
          />
          {dailyProgress >= 1 ? (
            <Text style={styles.dailyComplete}>Все уроки выполнены! 🎉</Text>
          ) : (
            <Text style={styles.dailyRemaining}>
              Осталось {totalToday - completedToday} {totalToday - completedToday === 1 ? 'урок' : 'урока'}
            </Text>
          )}
        </Card>

        {/* Learning Focus */}
        {currentPlan?.learningFocusRu && (
          <View style={styles.focusBadge}>
            <Text style={styles.focusText}>🎯 {currentPlan.learningFocusRu}</Text>
          </View>
        )}

        {/* Today's Lessons */}
        <Text style={styles.sectionTitle}>Уроки на сегодня</Text>
        {currentPlan?.lessons.map((planned, index) => {
          const lesson = getLessonById(planned.lessonId);
          if (!lesson) return null;

          const isCompleted = planned.status === 'completed';
          const isNext =
            !isCompleted &&
            currentPlan.lessons
              .slice(0, index)
              .every((l) => l.status === 'completed');

          return (
            <TouchableOpacity
              key={planned.lessonId}
              onPress={() => !isCompleted && onStartLesson(planned.lessonId)}
              activeOpacity={isCompleted ? 1 : 0.7}
              disabled={isCompleted}
            >
              <Card
                style={[
                  styles.lessonCard,
                  isCompleted && styles.lessonCardCompleted,
                  isNext && styles.lessonCardNext,
                ]}
              >
                <View style={styles.lessonRow}>
                  <EmojiCircle
                    emoji={isCompleted ? '✅' : lesson.emoji}
                    size={52}
                    backgroundColor={
                      isCompleted
                        ? Colors.successLight
                        : isNext
                        ? Colors.primaryLight
                        : Colors.cream
                    }
                  />
                  <View style={styles.lessonInfo}>
                    <Text
                      style={[
                        styles.lessonTitle,
                        isCompleted && styles.lessonTitleCompleted,
                      ]}
                    >
                      {lesson.titleRu}
                    </Text>
                    <Text style={styles.lessonMeta}>
                      {planned.isReview ? '🔄 Повторение' : lesson.descriptionRu} · {lesson.durationMinutes} мин
                    </Text>
                  </View>
                  {isNext && (
                    <View style={styles.playButton}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Start CTA */}
        {dailyProgress < 1 && (
          <DuoButton
            title="Начать урок"
            emoji="🚀"
            onPress={() => {
              const next = currentPlan?.lessons.find(
                (l) => l.status !== 'completed'
              );
              if (next) onStartLesson(next.lessonId);
            }}
            variant="primary"
            heavy
            style={styles.startButton}
          />
        )}

        {/* Parent Tip */}
        <Card style={styles.tipCard}>
          <Text style={styles.tipLabel}>💡 Совет для родителя</Text>
          <Text style={styles.tipText}>
            {currentPlan?.parentTipRu || 'Повторяйте новые слова в течение дня'}
          </Text>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.totalXP}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.totalLessons}</Text>
            <Text style={styles.statLabel}>Уроков</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{streak.currentDays}</Text>
            <Text style={styles.statLabel}>Дней</Text>
          </View>
        </View>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...Typography.bodyM,
    marginBottom: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  childEmoji: {
    fontSize: 28,
  },
  childName: {
    ...Typography.headingL,
  },
  dailyCard: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyTitle: {
    ...Typography.headingS,
  },
  dailyCount: {
    ...Typography.headingS,
    color: Colors.primary,
  },
  focusBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  focusText: {
    ...Typography.bodyS,
    color: Colors.primary,
    fontWeight: '600',
  },
  dailyComplete: {
    ...Typography.bodyS,
    color: Colors.successGreen,
    fontWeight: '600',
    marginTop: Spacing.xxs,
  },
  dailyRemaining: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  sectionTitle: {
    ...Typography.headingM,
    marginBottom: Spacing.md,
  },
  lessonCard: {
    marginBottom: Spacing.sm,
  },
  lessonCardCompleted: {
    opacity: 0.7,
  },
  lessonCardNext: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.headingS,
    fontSize: 16,
  },
  lessonTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  lessonMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: Colors.white,
    fontSize: 16,
    marginLeft: 2,
  },
  startButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tipCard: {
    backgroundColor: Colors.primaryLight,
    marginBottom: Spacing.lg,
  },
  tipLabel: {
    ...Typography.bodyS,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xxs,
  },
  tipText: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.headingL,
    color: Colors.primary,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xxs,
  },
});
