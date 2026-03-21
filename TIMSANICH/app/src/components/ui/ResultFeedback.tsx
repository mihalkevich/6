/**
 * ResultFeedback — Bottom bar after answering
 *
 * Slides up with haptic feedback showing:
 * - Correct: green bar + success haptic + encouraging text
 * - Incorrect: red bar + warning haptic + correct answer
 * - Teaching note for parent
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { DuoButton } from './DuoButton';
import { hapticSuccess, hapticError } from '../../utils/haptics';

interface ResultFeedbackProps {
  correct: boolean;
  onContinue: () => void;
  correctAnswer?: string;
  teachingNote?: string;
}

const SPRING = { damping: 16, stiffness: 200, mass: 0.5 };

export function ResultFeedback({
  correct,
  onContinue,
  correctAnswer,
  teachingNote,
}: ResultFeedbackProps) {
  const translateY = useSharedValue(200);

  useEffect(() => {
    // Fire haptic
    if (correct) {
      hapticSuccess();
    } else {
      hapticError();
    }
    // Slide in
    translateY.value = withSpring(0, SPRING);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const encouragements = [
    'Молодец!', 'Отлично!', 'Супер!', 'Здорово!',
    'Правильно!', 'Умница!', 'Класс!', 'Браво!',
  ];
  const randomEncouragement =
    encouragements[Math.floor(Math.random() * encouragements.length)];

  return (
    <Animated.View
      style={[
        styles.container,
        correct ? styles.containerCorrect : styles.containerIncorrect,
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Text style={[styles.icon]}>
            {correct ? '✅' : '❌'}
          </Text>
          <View style={styles.textBlock}>
            <Text style={[styles.title, correct ? styles.titleCorrect : styles.titleIncorrect]}>
              {correct ? randomEncouragement : 'Попробуй ещё раз'}
            </Text>
            {!correct && correctAnswer && (
              <Text style={styles.correctAnswer}>
                Правильный ответ: {correctAnswer}
              </Text>
            )}
            {teachingNote && (
              <Text style={styles.teachingNote}>
                💡 {teachingNote}
              </Text>
            )}
          </View>
        </View>
        <DuoButton
          title="Дальше"
          onPress={onContinue}
          variant={correct ? 'primary' : 'option'}
          size="medium"
          style={styles.button}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  containerCorrect: {
    backgroundColor: '#E8F8EA',
  },
  containerIncorrect: {
    backgroundColor: '#FDECEC',
  },
  content: {
    gap: Spacing.md,
  },
  textSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  titleCorrect: {
    color: '#1B5E20',
  },
  titleIncorrect: {
    color: '#B71C1C',
  },
  correctAnswer: {
    ...Typography.bodyM,
    color: '#B71C1C',
    fontWeight: '600',
  },
  teachingNote: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    fontStyle: 'italic',
  },
  button: {
    width: '100%',
  },
});
