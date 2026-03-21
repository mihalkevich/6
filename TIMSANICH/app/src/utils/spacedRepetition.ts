/**
 * Spaced Repetition Engine — SM-2 inspired algorithm
 * adapted for children 3-5 years old.
 *
 * Key adaptations for kids:
 * - Shorter intervals (kids forget faster, need more repetition)
 * - Simpler scoring (correct / incorrect instead of 0-5 scale)
 * - More generous ease factor adjustments
 * - Maximum interval capped at 14 days (not months like adults)
 * - Review is always positive, never punitive
 */

import { format, addDays, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import type { ReviewItem } from '../types';

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 14; // Kids need frequent review

/**
 * Process a review result and return updated ReviewItem.
 * @param item - Current review item
 * @param correct - Whether the child answered correctly
 * @returns Updated review item with new interval and next review date
 */
export function processReview(item: ReviewItem, correct: boolean): ReviewItem {
  const today = format(new Date(), 'yyyy-MM-dd');

  if (correct) {
    // Correct answer — increase interval
    let newInterval: number;
    const newRepCount = item.repetitionCount + 1;

    if (newRepCount === 1) {
      newInterval = 1; // Review tomorrow
    } else if (newRepCount === 2) {
      newInterval = 2; // Review in 2 days
    } else if (newRepCount === 3) {
      newInterval = 4; // Review in 4 days
    } else {
      // After 3rd correct: interval * easeFactor, capped
      newInterval = Math.min(
        Math.round(item.interval * item.easeFactor),
        MAX_INTERVAL_DAYS
      );
    }

    // Slightly increase ease factor on correct answer
    const newEase = Math.min(item.easeFactor + 0.1, 3.0);

    return {
      ...item,
      interval: newInterval,
      easeFactor: newEase,
      repetitionCount: newRepCount,
      nextReviewDate: format(addDays(new Date(), newInterval), 'yyyy-MM-dd'),
      lastReviewDate: today,
      totalReviews: item.totalReviews + 1,
    };
  } else {
    // Incorrect — reset to short interval, lower ease
    return {
      ...item,
      interval: 1, // Review tomorrow
      easeFactor: Math.max(item.easeFactor - 0.2, MIN_EASE_FACTOR),
      repetitionCount: 0, // Reset consecutive count
      nextReviewDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      lastReviewDate: today,
      totalReviews: item.totalReviews + 1,
    };
  }
}

/**
 * Create a new ReviewItem for a word/concept just learned.
 */
export function createReviewItem(
  unitId: string,
  lessonId: string,
  word: string
): ReviewItem {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    unitId,
    lessonId,
    word,
    interval: 1,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitionCount: 0,
    nextReviewDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    lastReviewDate: today,
    totalReviews: 0,
  };
}

/**
 * Get items that are due for review today or overdue.
 */
export function getDueReviews(items: ReviewItem[]): ReviewItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    const reviewDate = parseISO(item.nextReviewDate);
    return isBefore(reviewDate, today) || isToday(reviewDate);
  });
}

/**
 * Prioritize review items:
 * 1. Overdue items first (sorted by most overdue)
 * 2. Items with low ease factor (struggling concepts)
 * 3. Items with fewer total reviews (newer concepts)
 */
export function prioritizeReviews(items: ReviewItem[]): ReviewItem[] {
  return [...items].sort((a, b) => {
    // Overdue items first
    const aDate = parseISO(a.nextReviewDate).getTime();
    const bDate = parseISO(b.nextReviewDate).getTime();
    if (aDate !== bDate) return aDate - bDate;

    // Lower ease factor = more struggling = higher priority
    if (a.easeFactor !== b.easeFactor) return a.easeFactor - b.easeFactor;

    // Fewer reviews = newer = higher priority
    return a.totalReviews - b.totalReviews;
  });
}

/**
 * Get review statistics for parent dashboard.
 */
export function getReviewStats(items: ReviewItem[]) {
  const due = getDueReviews(items);
  const mastered = items.filter(
    (i) => i.repetitionCount >= 4 && i.easeFactor >= 2.3
  );
  const struggling = items.filter(
    (i) => i.easeFactor < 1.8 || (i.totalReviews > 3 && i.repetitionCount === 0)
  );
  const learning = items.filter(
    (i) => !mastered.includes(i) && !struggling.includes(i)
  );

  return {
    total: items.length,
    dueToday: due.length,
    mastered: mastered.length,
    learning: learning.length,
    struggling: struggling.length,
    masteredWords: mastered.map((i) => i.word),
    strugglingWords: struggling.map((i) => i.word),
  };
}
