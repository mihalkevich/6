/**
 * Adaptive Difficulty Engine
 *
 * Adjusts lesson difficulty based on child's performance.
 * Goal: keep the child in "flow state" — not too easy, not too hard.
 *
 * Research basis:
 * - Optimal challenge point: ~80% success rate
 * - Zone of Proximal Development (Vygotsky)
 * - Below 60% → too hard, reduce difficulty
 * - Above 90% → too easy, increase challenge
 * - 60-90% → optimal learning zone
 */

import type { AccuracyRecord, LessonType, AgeGroup } from '../types';

export interface DifficultyRecommendation {
  /** Recommended difficulty level 1-5 */
  level: 1 | 2 | 3 | 4 | 5;
  /** Whether to add more options (4 → 6) */
  moreOptions: boolean;
  /** Whether to reduce hints */
  reduceHints: boolean;
  /** Whether to add time pressure (not for age 3) */
  addTimePressure: boolean;
  /** Mix ratio: how much new vs review (0-1, where 1 = all new) */
  newContentRatio: number;
  /** Message for parent about current level */
  parentMessageRu: string;
}

/**
 * Calculate accuracy percentage for a lesson type.
 */
function getAccuracy(record: AccuracyRecord | undefined): number {
  if (!record || record.totalAttempts === 0) return 0.7; // Default: assume average
  return record.correctAttempts / record.totalAttempts;
}

/**
 * Get difficulty recommendation based on performance history.
 */
export function getDifficultyRecommendation(
  age: AgeGroup,
  lessonType: LessonType,
  accuracyHistory: Partial<Record<LessonType, AccuracyRecord>>,
  currentDifficulty: number
): DifficultyRecommendation {
  const accuracy = getAccuracy(accuracyHistory[lessonType]);
  const attempts = accuracyHistory[lessonType]?.totalAttempts ?? 0;

  // Need at least 5 attempts before adjusting
  if (attempts < 5) {
    return {
      level: Math.max(1, Math.min(5, currentDifficulty)) as 1 | 2 | 3 | 4 | 5,
      moreOptions: false,
      reduceHints: false,
      addTimePressure: false,
      newContentRatio: 0.4,
      parentMessageRu: 'Мы ещё изучаем, как ваш ребёнок справляется с заданиями.',
    };
  }

  let level = currentDifficulty;
  let moreOptions = false;
  let reduceHints = false;
  let addTimePressure = false;
  let newContentRatio = 0.3;
  let parentMessageRu = '';

  if (accuracy >= 0.9) {
    // Too easy — increase challenge
    level = Math.min(5, currentDifficulty + 1);
    moreOptions = currentDifficulty >= 2;
    reduceHints = true;
    addTimePressure = age >= 5 && currentDifficulty >= 3;
    newContentRatio = 0.5; // More new content
    parentMessageRu = `Отлично! ${getAccuracyPercent(accuracy)}% правильных ответов. Увеличиваем сложность для лучшего развития.`;
  } else if (accuracy >= 0.6) {
    // Optimal zone — stay at current level
    newContentRatio = 0.35;
    parentMessageRu = `Хороший темп! ${getAccuracyPercent(accuracy)}% правильных ответов — это оптимальная зона обучения.`;
  } else {
    // Too hard — decrease difficulty
    level = Math.max(1, currentDifficulty - 1);
    moreOptions = false;
    reduceHints = false;
    newContentRatio = 0.2; // More review, less new
    parentMessageRu = `Пока сложновато (${getAccuracyPercent(accuracy)}%). Мы добавим больше повторений и упростим задания.`;
  }

  return {
    level: Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5,
    moreOptions,
    reduceHints,
    addTimePressure,
    newContentRatio,
    parentMessageRu,
  };
}

function getAccuracyPercent(accuracy: number): number {
  return Math.round(accuracy * 100);
}

/**
 * Determine how many options to show based on age and difficulty.
 */
export function getOptionCount(age: AgeGroup, difficulty: number): number {
  if (age === 3) return difficulty <= 2 ? 2 : 3;
  if (age === 4) return difficulty <= 2 ? 3 : 4;
  return difficulty <= 1 ? 3 : 4;
}

/**
 * Calculate the ideal session length based on age.
 * Research-based attention spans for young children.
 */
export function getIdealSessionLength(age: AgeGroup): {
  minMinutes: number;
  maxMinutes: number;
  breakAfterMinutes: number;
} {
  switch (age) {
    case 3:
      return { minMinutes: 3, maxMinutes: 7, breakAfterMinutes: 4 };
    case 4:
      return { minMinutes: 5, maxMinutes: 10, breakAfterMinutes: 6 };
    case 5:
      return { minMinutes: 7, maxMinutes: 15, breakAfterMinutes: 8 };
  }
}

/**
 * Check if a break should be suggested.
 */
export function shouldSuggestBreak(
  age: AgeGroup,
  minutesElapsed: number,
  consecutiveErrors: number
): { shouldBreak: boolean; messageRu: string } {
  const session = getIdealSessionLength(age);

  if (consecutiveErrors >= 3) {
    return {
      shouldBreak: true,
      messageRu: 'Может, отдохнём немножко? Мы можем продолжить позже! 🌟',
    };
  }

  if (minutesElapsed >= session.breakAfterMinutes) {
    return {
      shouldBreak: true,
      messageRu: 'Ты отлично поработал! Давай сделаем маленький перерыв. 🎉',
    };
  }

  return { shouldBreak: false, messageRu: '' };
}
