/**
 * HomeScreen — Widget-based dashboard
 *
 * Completely rebuilt with Duolingo-style widget cards:
 * - MascotWidget: Dynamic character that reacts to activity
 * - StreakWidget: Fire streak with week progress
 * - DailyProgressWidget: Circular ring with lesson count
 * - SkillsWidget: Compact skill bars
 * - ParentTipWidget: Expandable parent guidance
 * - ReminderOverlay: Smart popup based on context
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Card, DuoButton, EmojiCircle } from '../components/ui';
import {
  MascotWidget,
  StreakWidget,
  DailyProgressWidget,
  SkillsWidget,
  ParentTipWidget,
  ReminderOverlay,
} from '../components/widgets';
import type { ReminderType } from '../components/widgets/ReminderOverlay';
import { useAppStore } from '../store/useAppStore';
import { getLessonById } from '../data/lessons';
import { getMascotState } from '../utils/mascot';
import { syncWidgetData } from '../utils/widgetData';
import { hapticTap } from '../utils/haptics';

interface HomeScreenProps {
  onStartLesson: (lessonId: string) => void;
}

export function HomeScreen({ onStartLesson }: HomeScreenProps) {
  const { child, streak, currentPlan, progress, rewards, generateTodayPlan } = useAppStore();
  const [showReminder, setShowReminder] = useState<ReminderType | null>(null);

  useEffect(() => {
    if (child && !currentPlan) {
      generateTodayPlan();
    }
  }, [child]);

  // Sync widget data on load and state changes
  useEffect(() => {
    if (child && currentPlan) {
      const completedToday = currentPlan.lessons.filter(
        (l) => l.status === 'completed'
      ).length;
      const totalToday = currentPlan.lessons.length;
      const mascot = getMascotState({
        streakDays: streak.currentDays,
        lessonsCompletedToday: completedToday,
        totalLessonsToday: totalToday,
        hoursSinceLastLesson: 1,
        lastActiveDate: streak.lastActiveDate,
        childName: child.name,
      });

      syncWidgetData({
        childName: child.name,
        streakDays: streak.currentDays,
        longestStreak: streak.longestDays,
        lessonsToday: completedToday,
        totalToday: totalToday,
        totalXP: progress.totalXP,
        lastActive: streak.lastActiveDate,
        mascotEmoji: mascot.emoji,
        mascotMessage: mascot.messageRu,
        todayDone: completedToday >= totalToday,
        avatarEmoji: child.avatarEmoji,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [child, streak, currentPlan, progress]);

  // Determine if reminder overlay should show
  useEffect(() => {
    if (!child || !currentPlan) return;

    const completedToday = currentPlan.lessons.filter(
      (l) => l.status === 'completed'
    ).length;
    const totalToday = currentPlan.lessons.length;
    const today = new Date().toISOString().slice(0, 10);
    const daysSince = streak.lastActiveDate
      ? Math.floor(
          (Date.now() - new Date(streak.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;
    const hour = new Date().getHours();

    // Show reminder based on context (only once per session)
    const timer = setTimeout(() => {
      if (daysSince >= 2) {
        setShowReminder('comeback');
      } else if (
        streak.currentDays > 0 &&
        completedToday === 0 &&
        hour >= 17 &&
        streak.lastActiveDate !== today
      ) {
        setShowReminder('streak_risk');
      } else if (totalToday - completedToday === 1 && completedToday > 0) {
        setShowReminder('almost_done');
      } else if (streak.currentDays > 0 && streak.currentDays % 7 === 0) {
        setShowReminder('milestone');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!child) return null;

  const completedToday = currentPlan?.lessons.filter(
    (l) => l.status === 'completed'
  ).length ?? 0;
  const totalToday = currentPlan?.lessons.length ?? 0;

  // Mascot state
  const mascotState = useMemo(() => getMascotState({
    streakDays: streak.currentDays,
    lessonsCompletedToday: completedToday,
    totalLessonsToday: totalToday,
    hoursSinceLastLesson: 1,
    lastActiveDate: streak.lastActiveDate,
    childName: child.name,
  }), [streak, completedToday, totalToday, child.name]);

  // Next lesson
  const nextPlanned = currentPlan?.lessons.find((l) => l.status !== 'completed');
  const nextLesson = nextPlanned ? getLessonById(nextPlanned.lessonId) : null;

  // Minutes remaining
  const minutesRemaining = currentPlan?.lessons
    .filter((l) => l.status !== 'completed')
    .reduce((sum, l) => {
      const lesson = getLessonById(l.lessonId);
      return sum + (lesson?.durationMinutes || 2);
    }, 0) || 0;

  // Skills data
  const skills = [
    { name: 'Словарный запас', emoji: '📚', level: 3, maxLevel: 10 },
    { name: 'Понимание речи', emoji: '👂', level: 2, maxLevel: 10 },
    { name: 'Логика', emoji: '🧩', level: 2, maxLevel: 10 },
    { name: 'Восприятие', emoji: '🎨', level: 4, maxLevel: 10 },
  ];

  const handleStartNext = useCallback(() => {
    if (nextPlanned) {
      onStartLesson(nextPlanned.lessonId);
    }
  }, [nextPlanned, onStartLesson]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? 'Доброе утро'
      : greetingHour < 18
      ? 'Добрый день'
      : 'Добрый вечер';

  // Today's skills names for parent widget
  const todaySkillNames = (currentPlan as any)?.todaySkills?.map((s: string) => {
    const names: Record<string, string> = {
      vocabulary: 'Словарный запас',
      receptive_language: 'Понимание речи',
      expressive_language: 'Активная речь',
      classification: 'Классификация',
      visual_perception: 'Восприятие',
      logical_thinking: 'Логика',
      attention: 'Внимание',
      working_memory: 'Память',
    };
    return names[s] || s;
  }) || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <View style={styles.nameRow}>
              <Text style={styles.childEmoji}>{child.avatarEmoji}</Text>
              <Text style={styles.childName}>{child.name}</Text>
            </View>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>⭐ {progress.totalXP}</Text>
          </View>
        </Animated.View>

        {/* Mascot Widget */}
        <Animated.View entering={FadeIn.delay(100).springify()}>
          <MascotWidget
            state={mascotState}
            onTap={() => {
              if (nextPlanned && mascotState.mood !== 'celebrating') {
                handleStartNext();
              }
            }}
          />
        </Animated.View>

        {/* Streak Widget */}
        <Animated.View entering={FadeIn.delay(200).springify()}>
          <StreakWidget
            currentDays={streak.currentDays}
            longestDays={streak.longestDays}
            todayDone={completedToday > 0}
          />
        </Animated.View>

        {/* Daily Progress Widget */}
        <Animated.View entering={FadeIn.delay(300).springify()}>
          <DailyProgressWidget
            completed={completedToday}
            total={totalToday}
            xpToday={completedToday * 10} // Approximate
            nextLessonTitle={nextLesson?.titleRu}
            nextLessonEmoji={nextLesson?.emoji}
            onStartLesson={nextPlanned ? handleStartNext : undefined}
            minutesRemaining={minutesRemaining}
          />
        </Animated.View>

        {/* Today's Lessons */}
        <Animated.View entering={FadeIn.delay(400)}>
          <Text style={styles.sectionTitle}>Уроки на сегодня</Text>
        </Animated.View>
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
            <Animated.View
              key={planned.lessonId}
              entering={FadeIn.delay(450 + index * 60)}
            >
              <Pressable
                onPress={() => {
                  if (!isCompleted) {
                    hapticTap();
                    onStartLesson(planned.lessonId);
                  }
                }}
                disabled={isCompleted}
              >
                <View style={[
                  styles.lessonCard,
                  isCompleted && styles.lessonCardCompleted,
                  isNext && styles.lessonCardNext,
                ]}>
                  <EmojiCircle
                    emoji={isCompleted ? '✅' : lesson.emoji}
                    size={48}
                    backgroundColor={
                      isCompleted
                        ? Colors.successLight
                        : isNext
                        ? Colors.primaryLight
                        : Colors.cream
                    }
                  />
                  <View style={styles.lessonInfo}>
                    <Text style={[
                      styles.lessonTitle,
                      isCompleted && styles.lessonTitleCompleted,
                    ]}>
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
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Skills Widget */}
        <Animated.View entering={FadeIn.delay(600).springify()}>
          <SkillsWidget
            skills={skills}
            totalWordsLearned={progress.learnedWords?.length || 12}
          />
        </Animated.View>

        {/* Parent Tip Widget */}
        <Animated.View entering={FadeIn.delay(700).springify()}>
          <ParentTipWidget
            tipRu={currentPlan?.parentTipRu || 'Повторяйте новые слова в течение дня'}
            learningFocusRu={currentPlan?.learningFocusRu}
            todaySkills={todaySkillNames}
          />
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Reminder Overlay */}
      {showReminder && (
        <ReminderOverlay
          type={showReminder}
          childName={child.name}
          streakDays={streak.currentDays}
          lessonsRemaining={totalToday - completedToday}
          onAction={handleStartNext}
          onDismiss={() => setShowReminder(null)}
        />
      )}
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
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
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
  xpBadge: {
    backgroundColor: Colors.rewardGoldLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  xpText: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.warningAmber,
  },
  sectionTitle: {
    ...Typography.headingM,
    marginTop: Spacing.xs,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
    gap: Spacing.md,
  },
  lessonCardCompleted: {
    opacity: 0.6,
    borderColor: Colors.successGreen + '40',
    borderBottomColor: Colors.successGreen + '60',
  },
  lessonCardNext: {
    borderColor: Colors.primary,
    borderBottomColor: '#3D8BCB',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.bodyM,
    fontWeight: '700',
  },
  lessonTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  lessonMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#3D8BCB',
  },
  playIcon: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 2,
  },
});
