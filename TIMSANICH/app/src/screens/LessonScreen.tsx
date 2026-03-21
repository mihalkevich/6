import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import {
  DuoButton,
  DuoOptionCard,
  AnimatedProgressBar,
  EmojiCircle,
  CelebrationOverlay,
  ResultFeedback,
} from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { getLessonById } from '../data/lessons';
import { getLessonMeta } from '../data/learningObjectives';
import { hapticTap, hapticCelebration, hapticHeavy } from '../utils/haptics';

const { width } = Dimensions.get('window');

interface LessonScreenProps {
  lessonId: string;
  onComplete: () => void;
  onExit: () => void;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function LessonScreen({ lessonId, onComplete, onExit }: LessonScreenProps) {
  const {
    completeLesson,
    updateLessonStatus,
    incrementStreak,
    addReward,
  } = useAppStore();

  const lesson = getLessonById(lessonId);
  const meta = getLessonMeta(lessonId);
  const [unitIndex, setUnitIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  // Animation values
  const questionOpacity = useSharedValue(0);
  const questionY = useSharedValue(20);

  useEffect(() => {
    // Animate question in on each new unit
    questionOpacity.value = 0;
    questionY.value = 20;
    questionOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    questionY.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 200 }));
  }, [unitIndex]);

  if (!lesson) return null;

  const unit = lesson.units[unitIndex];
  const progress = (unitIndex + (answerState !== 'unanswered' ? 1 : 0)) / lesson.units.length;

  const handleAnswer = useCallback((optionId: string) => {
    if (answerState !== 'unanswered') return;
    setSelectedId(optionId);

    if (optionId === unit.correctAnswerId) {
      setAnswerState('correct');
      setScore((s) => s + 1);
      setConsecutiveErrors(0);
    } else {
      setAnswerState('incorrect');
      setConsecutiveErrors((c) => c + 1);
    }
  }, [answerState, unit]);

  const handleContinue = useCallback(() => {
    if (unitIndex < lesson.units.length - 1) {
      setUnitIndex((i) => i + 1);
      setAnswerState('unanswered');
      setSelectedId(null);
    } else {
      // Lesson complete
      completeLesson(lessonId, lesson.xpReward);
      updateLessonStatus(lessonId, 'completed');
      incrementStreak();

      const isPerfect = score + (answerState === 'correct' ? 0 : -1) + 1 === lesson.units.length;

      if (isPerfect) {
        addReward({
          id: `star-${lessonId}-${Date.now()}`,
          type: 'star',
          name: 'Идеально!',
          emoji: '⭐',
          earnedAt: new Date().toISOString(),
          description: `Идеальный результат: ${lesson.titleRu}`,
        });
      }

      // Show celebration first
      setShowCelebration(true);
      hapticCelebration();
      setTimeout(() => {
        setShowCelebration(false);
        setShowComplete(true);
      }, 2000);
    }
  }, [unitIndex, lesson, score, answerState, lessonId]);

  const getOptionState = (optionId: string) => {
    if (answerState === 'unanswered') {
      return selectedId === optionId ? 'selected' : 'default';
    }
    if (optionId === unit.correctAnswerId) return 'correct';
    if (optionId === selectedId && answerState === 'incorrect') return 'incorrect';
    return 'disabled';
  };

  const getCorrectLabel = () => {
    const correct = unit.options.find((o) => o.id === unit.correctAnswerId);
    return correct ? correct.label : '';
  };

  const questionStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
    transform: [{ translateY: questionY.value }],
  }));

  // Celebration overlay
  if (showCelebration) {
    const isPerfect = score === lesson.units.length;
    return (
      <SafeAreaView style={styles.container}>
        <CelebrationOverlay
          type={isPerfect ? 'perfect_score' : 'lesson_complete'}
          emoji={isPerfect ? '🏆' : '🎉'}
          title={isPerfect ? 'Идеально!' : 'Молодец!'}
          subtitle={`${lesson.titleRu} пройден`}
        />
      </SafeAreaView>
    );
  }

  // Completion screen
  if (showComplete) {
    const isPerfect = score === lesson.units.length;
    const stars = score === lesson.units.length ? 3 : score >= lesson.units.length * 0.7 ? 2 : 1;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completeContainer}>
          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3].map((star) => (
              <Animated.Text
                key={star}
                entering={FadeIn.delay(star * 200).springify()}
                style={[
                  styles.starIcon,
                  star <= stars ? styles.starActive : styles.starInactive,
                ]}
              >
                ⭐
              </Animated.Text>
            ))}
          </View>

          <Animated.Text entering={FadeIn.delay(600)} style={styles.completeTitle}>
            {isPerfect ? 'Идеально!' : 'Отлично!'}
          </Animated.Text>

          <Animated.Text entering={FadeIn.delay(800)} style={styles.completeSubtitle}>
            {lesson.titleRu}
          </Animated.Text>

          {/* Score card */}
          <Animated.View entering={SlideInDown.delay(1000).springify()} style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreEmoji}>✅</Text>
              <Text style={styles.scoreText}>
                {score}/{lesson.units.length} правильно
              </Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreEmoji}>✨</Text>
              <Text style={styles.scoreText}>+{lesson.xpReward} XP</Text>
            </View>
            {isPerfect && (
              <>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreEmoji}>🏆</Text>
                  <Text style={styles.scoreText}>Бонус за идеальный результат!</Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Learning objective */}
          {(lesson.learningObjectiveRu || meta.learningObjectiveRu) && (
            <Animated.View entering={FadeIn.delay(1200)} style={styles.objectiveCard}>
              <Text style={styles.objectiveLabel}>📘 Чему мы научились:</Text>
              <Text style={styles.objectiveText}>{(lesson.learningObjectiveRu || meta.learningObjectiveRu)}</Text>
            </Animated.View>
          )}

          {/* Parent follow-up */}
          {(lesson.parentFollowUpRu || meta.parentFollowUpRu) && (
            <Animated.View entering={FadeIn.delay(1400)} style={styles.parentCard}>
              <Text style={styles.parentLabel}>👨‍👧 Совет родителю:</Text>
              <Text style={styles.parentText}>{(lesson.parentFollowUpRu || meta.parentFollowUpRu)}</Text>
            </Animated.View>
          )}

          {/* Buttons */}
          <Animated.View entering={FadeIn.delay(1600)} style={styles.completeButtons}>
            <DuoButton
              title="Продолжить"
              emoji="🚀"
              onPress={onComplete}
              variant="primary"
              heavy
              style={styles.continueBtn}
            />
            <TouchableOpacity onPress={onExit} style={styles.exitLink}>
              <Text style={styles.exitText}>На главную</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // === Main lesson view ===
  const isWordRepeat = unit.type === 'word_repeat';
  const isParentTask = unit.type === 'parent_task';
  const useListLayout = isWordRepeat || isParentTask || unit.options.length <= 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { hapticTap(); onExit(); }}
          style={styles.closeButton}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <AnimatedProgressBar progress={progress} height={12} />
        </View>
      </View>

      <View style={styles.lessonContent}>
        {/* Question Section */}
        <Animated.View style={[styles.questionSection, questionStyle]}>
          {unit.emoji && (
            <EmojiCircle
              emoji={unit.emoji}
              size={100}
              backgroundColor={Colors.primaryLight}
              style={styles.questionEmojiCircle}
            />
          )}
          <Text style={styles.questionText}>{unit.questionRu}</Text>

          {/* Hint */}
          {unit.hintRu && answerState === 'unanswered' && (
            <View style={styles.hintBadge}>
              <Text style={styles.hintText}>💡 {unit.hintRu}</Text>
            </View>
          )}

          {/* Parent note for parent_task */}
          {isParentTask && unit.parentNote && (
            <View style={styles.parentNoteInline}>
              <Text style={styles.parentNoteLabel}>👨‍👧 Для родителя:</Text>
              <Text style={styles.parentNoteText}>{unit.parentNote}</Text>
            </View>
          )}
        </Animated.View>

        {/* Options */}
        <View style={[
          styles.optionsContainer,
          useListLayout ? styles.optionsList : styles.optionsGrid,
        ]}>
          {unit.options.map((option, i) => (
            <DuoOptionCard
              key={option.id}
              emoji={option.emoji}
              label={option.label}
              onPress={() => handleAnswer(option.id)}
              state={getOptionState(option.id) as any}
              layout={useListLayout ? 'list' : 'grid'}
              index={i}
              disabled={answerState !== 'unanswered'}
            />
          ))}
        </View>
      </View>

      {/* Result Feedback Bar */}
      {answerState !== 'unanswered' && (
        <ResultFeedback
          correct={answerState === 'correct'}
          onContinue={handleContinue}
          correctAnswer={answerState === 'incorrect' ? getCorrectLabel() : undefined}
          teachingNote={unit.teachingNoteRu}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  progressBarContainer: {
    flex: 1,
  },
  lessonContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  questionSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  questionEmojiCircle: {
    marginBottom: Spacing.lg,
  },
  questionText: {
    ...Typography.headingM,
    textAlign: 'center',
    lineHeight: 32,
  },
  hintBadge: {
    backgroundColor: Colors.rewardGoldLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    marginTop: Spacing.sm,
  },
  hintText: {
    ...Typography.bodyS,
    color: Colors.warningAmber,
    fontWeight: '600',
  },
  parentNoteInline: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    width: '100%',
    gap: Spacing.xxs,
  },
  parentNoteLabel: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.primary,
  },
  parentNoteText: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  optionsList: {
    flexDirection: 'column',
  },
  // Complete screen
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  starIcon: {
    fontSize: 48,
  },
  starActive: {
    opacity: 1,
  },
  starInactive: {
    opacity: 0.2,
  },
  completeTitle: {
    ...Typography.headingXL,
    marginBottom: Spacing.xs,
  },
  completeSubtitle: {
    ...Typography.bodyL,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  scoreCard: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scoreEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  scoreText: {
    ...Typography.bodyL,
    fontWeight: '700',
    flex: 1,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  objectiveCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 320,
    gap: Spacing.xxs,
    marginBottom: Spacing.sm,
  },
  objectiveLabel: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.primary,
  },
  objectiveText: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
  },
  parentCard: {
    backgroundColor: Colors.rewardGoldLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 320,
    gap: Spacing.xxs,
    marginBottom: Spacing.lg,
  },
  parentLabel: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.warningAmber,
  },
  parentText: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
  },
  completeButtons: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  continueBtn: {
    width: '100%',
  },
  exitLink: {
    padding: Spacing.sm,
  },
  exitText: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
  },
});
