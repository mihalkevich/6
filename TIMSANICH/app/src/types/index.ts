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
  | 'image_choice'
  | 'word_repeat'
  | 'match_pair'
  | 'find_odd'
  | 'emotion_pick'
  | 'sequence'
  | 'memory_cards'
  | 'parent_task';

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
  parentNote?: string;
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
}

export interface WeeklyStats {
  weekStart: string;
  lessonsCompleted: number;
  minutesSpent: number;
  newWordsLearned: number;
  streakDays: number;
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
