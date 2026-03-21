import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Button, ProgressBar, EmojiCircle } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { getLessonById } from '../data/lessons';

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
  const [unitIndex, setUnitIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  if (!lesson) return null;

  const unit = lesson.units[unitIndex];
  const progress = (unitIndex + (answerState !== 'unanswered' ? 1 : 0)) / lesson.units.length;

  const handleAnswer = (optionId: string) => {
    if (answerState !== 'unanswered') return;
    setSelectedId(optionId);

    if (optionId === unit.correctAnswerId) {
      setAnswerState('correct');
      setScore((s) => s + 1);
    } else {
      setAnswerState('incorrect');
    }
  };

  const handleContinue = () => {
    if (unitIndex < lesson.units.length - 1) {
      setUnitIndex((i) => i + 1);
      setAnswerState('unanswered');
      setSelectedId(null);
    } else {
      // Lesson complete
      completeLesson(lessonId, lesson.xpReward);
      updateLessonStatus(lessonId, 'completed');
      incrementStreak();

      if (score === lesson.units.length) {
        addReward({
          id: `star-${lessonId}`,
          type: 'star',
          name: 'Perfect!',
          emoji: '⭐',
          earnedAt: new Date().toISOString(),
          description: `Perfect score on ${lesson.titleRu}`,
        });
      }

      setShowComplete(true);
    }
  };

  if (showComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completeContainer}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeTitle}>Молодец!</Text>
          <Text style={styles.completeSubtitle}>{lesson.titleRu}</Text>

          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreEmoji}>⭐</Text>
              <Text style={styles.scoreText}>
                {score}/{lesson.units.length} правильно
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreEmoji}>✨</Text>
              <Text style={styles.scoreText}>+{lesson.xpReward} XP</Text>
            </View>
            {score === lesson.units.length && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreEmoji}>🏆</Text>
                <Text style={styles.scoreText}>Идеальный результат!</Text>
              </View>
            )}
          </View>

          <Button
            title="Продолжить"
            onPress={onComplete}
            style={styles.continueButton}
          />
          <TouchableOpacity onPress={onExit} style={styles.exitLink}>
            <Text style={styles.exitText}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isWordRepeat = unit.type === 'word_repeat';
  const isParentTask = unit.type === 'parent_task';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <ProgressBar progress={progress} height={8} />
        </View>
        <Text style={styles.unitCount}>
          {unitIndex + 1}/{lesson.units.length}
        </Text>
      </View>

      <View style={styles.lessonContent}>
        {/* Question */}
        <View style={styles.questionSection}>
          {unit.emoji && (
            <EmojiCircle
              emoji={unit.emoji}
              size={96}
              backgroundColor={Colors.primaryLight}
              style={styles.questionEmoji}
            />
          )}
          <Text style={styles.questionText}>{unit.questionRu}</Text>
          {isParentTask && unit.parentNote && (
            <View style={styles.parentNote}>
              <Text style={styles.parentNoteLabel}>👨‍👧 Для родителя:</Text>
              <Text style={styles.parentNoteText}>{unit.parentNote}</Text>
            </View>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {unit.options.map((option) => {
            const isSelected = selectedId === option.id;
            const isCorrect = option.id === unit.correctAnswerId;
            const showCorrect =
              answerState !== 'unanswered' && isCorrect;
            const showIncorrect =
              answerState === 'incorrect' && isSelected;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isWordRepeat && styles.optionCardWide,
                  isParentTask && styles.optionCardWide,
                  showCorrect && styles.optionCorrect,
                  showIncorrect && styles.optionIncorrect,
                  isSelected &&
                    answerState === 'unanswered' &&
                    styles.optionSelected,
                ]}
                onPress={() => handleAnswer(option.id)}
                disabled={answerState !== 'unanswered'}
                activeOpacity={0.7}
              >
                {option.emoji && (
                  <Text
                    style={[
                      styles.optionEmoji,
                      (isWordRepeat || isParentTask) &&
                        styles.optionEmojiSmall,
                    ]}
                  >
                    {option.emoji}
                  </Text>
                )}
                <Text
                  style={[
                    styles.optionLabel,
                    showCorrect && styles.optionLabelCorrect,
                    showIncorrect && styles.optionLabelIncorrect,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bottom */}
      {answerState !== 'unanswered' && (
        <View
          style={[
            styles.resultBar,
            answerState === 'correct'
              ? styles.resultBarCorrect
              : styles.resultBarIncorrect,
          ]}
        >
          <Text style={styles.resultText}>
            {answerState === 'correct' ? '✅ Правильно!' : '❌ Не совсем, попробуй ещё!'}
          </Text>
          <Button
            title="Дальше"
            onPress={handleContinue}
            variant={answerState === 'correct' ? 'primary' : 'secondary'}
            size="medium"
            style={styles.nextButton}
          />
        </View>
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
    fontWeight: '600',
  },
  progressBarContainer: {
    flex: 1,
  },
  unitCount: {
    ...Typography.caption,
    minWidth: 36,
    textAlign: 'right',
  },
  lessonContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  questionSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  questionEmoji: {
    marginBottom: Spacing.lg,
  },
  questionText: {
    ...Typography.headingM,
    textAlign: 'center',
    lineHeight: 32,
  },
  parentNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    width: '100%',
  },
  parentNoteLabel: {
    ...Typography.bodyS,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xxs,
  },
  parentNoteText: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  optionCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionCardWide: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  optionCorrect: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successGreen,
  },
  optionIncorrect: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.errorRed,
  },
  optionSelected: {
    borderColor: Colors.primary,
  },
  optionEmoji: {
    fontSize: 44,
    marginBottom: Spacing.xs,
  },
  optionEmojiSmall: {
    fontSize: 32,
    marginBottom: 0,
  },
  optionLabel: {
    ...Typography.bodyL,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionLabelCorrect: {
    color: Colors.successGreen,
  },
  optionLabelIncorrect: {
    color: Colors.errorRed,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  resultBarCorrect: {
    backgroundColor: Colors.successLight,
  },
  resultBarIncorrect: {
    backgroundColor: Colors.errorLight,
  },
  resultText: {
    ...Typography.bodyL,
    fontWeight: '600',
    flex: 1,
  },
  nextButton: {
    minWidth: 100,
  },
  // Complete screen
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  completeTitle: {
    ...Typography.headingXL,
    marginBottom: Spacing.xs,
  },
  completeSubtitle: {
    ...Typography.bodyL,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  scoreCard: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 300,
    marginBottom: Spacing.xxl,
  },
  scoreRow: {
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
    fontWeight: '600',
  },
  continueButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: Spacing.md,
  },
  exitLink: {
    padding: Spacing.sm,
  },
  exitText: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
  },
});
