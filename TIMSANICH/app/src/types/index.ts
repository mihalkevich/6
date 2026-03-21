import type { SkillDomain } from '../data/curriculum';

export type AgeGroup = 3 | 4 | 5;

export type DevelopmentGoal =
  | 'speech'
  | 'vocabulary'
  | 'logic'
  | 'attention'
  | 'memory'
  | 'parent_activities';

export type FocusArea =
  | 'words'
  | 'speech'
  | 'logic'
  | 'attention'
  | 'parent_tasks';

export type LessonType =
  | 'image_choice'       // выбери правильную картинку
  | 'word_repeat'        // повтори слово
  | 'match_pair'         // соедини слово и картинку
  | 'find_odd'           // найди лишнее
  | 'emotion_pick'       // определи эмоцию
  | 'sequence'           // продолжи последовательность
  | 'memory_cards'       // найди пары
  | 'parent_task'        // задание с родителем
  | 'counting'           // сосчитай предметы
  | 'sorting'            // рассортируй по группам
  | 'first_sound'        // определи первый звук
  | 'syllable_clap'      // посчитай слоги
  | 'spatial'            // где находится предмет
  | 'association'        // что подходит друг к другу
  | 'opposite'           // найди противоположное
  | 'story_order'        // расставь по порядку
  | 'compare_quantity';  // где больше

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export type DailyLessonStatus = 'pending' | 'in_progress' | 'completed';

export interface Child {
  id: string;
  name: string;
  age: AgeGroup;
  avatarEmoji: string;
  goals: DevelopmentGoal[];
  dailyMinutes: 5 | 10 | 15;
  focusAreas: FocusArea[];
  createdAt: string;
}

export interface Streak {
  currentDays: number;
  longestDays: number;
  lastActiveDate: string;
}

export interface Reward {
  id: string;
  type: 'star' | 'badge' | 'milestone';
  name: string;
  emoji: string;
  earnedAt: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  nameRu: string;
  emoji: string;
  color: string;
  ageRange: AgeGroup[];
}

export interface LessonUnit {
  id: string;
  type: LessonType;
  question: string;
  questionRu: string;
  emoji?: string;
  options: LessonOption[];
  correctAnswerId: string;
  hint?: string;
  hintRu?: string;
  parentNote?: string;
  /** Educational context shown to parent after answer */
  teachingNoteRu?: string;
}

export interface LessonOption {
  id: string;
  label: string;
  emoji?: string;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  categoryId: string;
  title: string;
  titleRu: string;
  description: string;
  descriptionRu: string;
  ageMin: AgeGroup;
  ageMax: AgeGroup;
  difficulty: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  type: LessonType;
  units: LessonUnit[];
  requiredLessonIds: string[];
  xpReward: number;
  emoji: string;
  /** Primary skill this lesson develops */
  primarySkill?: SkillDomain;
  /** Secondary skills this lesson touches */
  secondarySkills?: SkillDomain[];
  /** What the child should be able to do after this lesson */
  learningObjectiveRu?: string;
  /** Guidance for parent after lesson */
  parentFollowUpRu?: string;
  /** Words/concepts introduced in this lesson */
  newWords?: string[];
}

export interface PathNode {
  id: string;
  lessonId: string;
  status: LessonStatus;
  position: number;
  sectionTitle?: string;
  sectionTitleRu?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  lessons: PlannedLesson[];
  parentTip: string;
  parentTipRu: string;
  summary: string;
  summaryRu: string;
  completed: boolean;
  /** Learning focus explanation for parent */
  learningFocusRu: string;
  /** Skills being developed today */
  todaySkills: SkillDomain[];
}

export interface PlannedLesson {
  lessonId: string;
  status: DailyLessonStatus;
  score: number;
  completedAt?: string;
  isReview: boolean;
}

export interface Progress {
  totalLessons: number;
  totalXP: number;
  completedLessonIds: string[];
  currentPathPosition: number;
  /** Tracks per-skill progress (0-100) */
  skillLevels: Partial<Record<SkillDomain, number>>;
  /** Words the child has learned */
  learnedWords: string[];
  /** Accuracy history per lesson type for adaptive difficulty */
  accuracyByType: Partial<Record<LessonType, AccuracyRecord>>;
}

export interface AccuracyRecord {
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptDate: string;
}

export interface WeeklyStats {
  weekStart: string;
  lessonsCompleted: number;
  minutesSpent: number;
  newWordsLearned: number;
  streakDays: number;
  skillsImproved: SkillDomain[];
}

/** Spaced repetition item for review scheduling */
export interface ReviewItem {
  /** The lesson unit ID to review */
  unitId: string;
  lessonId: string;
  /** The word or concept being reviewed */
  word: string;
  /** Current interval in days (SM-2 inspired) */
  interval: number;
  /** Ease factor (2.5 default, adjusted by performance) */
  easeFactor: number;
  /** Number of consecutive correct answers */
  repetitionCount: number;
  /** Next scheduled review date */
  nextReviewDate: string;
  /** Last review date */
  lastReviewDate: string;
  /** How many times reviewed total */
  totalReviews: number;
}

export interface OnboardingState {
  step: number;
  childName: string;
  childAge: AgeGroup | null;
  avatarEmoji: string;
  goals: DevelopmentGoal[];
  dailyMinutes: 5 | 10 | 15;
  focusAreas: FocusArea[];
  completed: boolean;
}
