import { create } from 'zustand';
import type {
  Child,
  Streak,
  Reward,
  Progress,
  DailyPlan,
  OnboardingState,
  DevelopmentGoal,
  FocusArea,
  AgeGroup,
  DailyLessonStatus,
} from '../types';
import { generateDailyPlan } from '../utils/dailyEngine';
import { format } from 'date-fns';

interface AppState {
  // Onboarding
  onboarding: OnboardingState;
  setOnboardingStep: (step: number) => void;
  setChildName: (name: string) => void;
  setChildAge: (age: AgeGroup) => void;
  setAvatarEmoji: (emoji: string) => void;
  toggleGoal: (goal: DevelopmentGoal) => void;
  setDailyMinutes: (minutes: 5 | 10 | 15) => void;
  toggleFocusArea: (area: FocusArea) => void;
  completeOnboarding: () => void;

  // Child
  child: Child | null;

  // Streak
  streak: Streak;
  incrementStreak: () => void;

  // Progress
  progress: Progress;
  completeLesson: (lessonId: string, xp: number) => void;

  // Rewards
  rewards: Reward[];
  addReward: (reward: Reward) => void;

  // Daily Plan
  currentPlan: DailyPlan | null;
  generateTodayPlan: () => void;
  updateLessonStatus: (lessonId: string, status: DailyLessonStatus) => void;

  // Lesson state
  currentLessonId: string | null;
  setCurrentLesson: (id: string | null) => void;
  currentUnitIndex: number;
  setCurrentUnitIndex: (index: number) => void;
  lessonScore: number;
  addLessonScore: (points: number) => void;
  resetLessonState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Onboarding
  onboarding: {
    step: 0,
    childName: '',
    childAge: null,
    avatarEmoji: '🧒',
    goals: [],
    dailyMinutes: 10,
    focusAreas: [],
    completed: false,
  },
  setOnboardingStep: (step) =>
    set((s) => ({ onboarding: { ...s.onboarding, step } })),
  setChildName: (name) =>
    set((s) => ({ onboarding: { ...s.onboarding, childName: name } })),
  setChildAge: (age) =>
    set((s) => ({ onboarding: { ...s.onboarding, childAge: age } })),
  setAvatarEmoji: (emoji) =>
    set((s) => ({ onboarding: { ...s.onboarding, avatarEmoji: emoji } })),
  toggleGoal: (goal) =>
    set((s) => {
      const goals = s.onboarding.goals.includes(goal)
        ? s.onboarding.goals.filter((g) => g !== goal)
        : [...s.onboarding.goals, goal];
      return { onboarding: { ...s.onboarding, goals } };
    }),
  setDailyMinutes: (minutes) =>
    set((s) => ({ onboarding: { ...s.onboarding, dailyMinutes: minutes } })),
  toggleFocusArea: (area) =>
    set((s) => {
      const focusAreas = s.onboarding.focusAreas.includes(area)
        ? s.onboarding.focusAreas.filter((a) => a !== area)
        : [...s.onboarding.focusAreas, area];
      return { onboarding: { ...s.onboarding, focusAreas } };
    }),
  completeOnboarding: () =>
    set((s) => {
      const child: Child = {
        id: '1',
        name: s.onboarding.childName,
        age: s.onboarding.childAge || 3,
        avatarEmoji: s.onboarding.avatarEmoji,
        goals: s.onboarding.goals,
        dailyMinutes: s.onboarding.dailyMinutes,
        focusAreas: s.onboarding.focusAreas,
        createdAt: new Date().toISOString(),
      };
      return {
        child,
        onboarding: { ...s.onboarding, completed: true },
      };
    }),

  // Child
  child: null,

  // Streak
  streak: {
    currentDays: 0,
    longestDays: 0,
    lastActiveDate: '',
  },
  incrementStreak: () =>
    set((s) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (s.streak.lastActiveDate === today) return s;
      const newCurrent = s.streak.currentDays + 1;
      return {
        streak: {
          currentDays: newCurrent,
          longestDays: Math.max(newCurrent, s.streak.longestDays),
          lastActiveDate: today,
        },
      };
    }),

  // Progress
  progress: {
    totalLessons: 0,
    totalXP: 0,
    completedLessonIds: [],
    currentPathPosition: 0,
    skillLevels: {},
    learnedWords: [],
    accuracyByType: {},
  },
  completeLesson: (lessonId, xp) =>
    set((s) => {
      if (s.progress.completedLessonIds.includes(lessonId)) return s;
      return {
        progress: {
          ...s.progress,
          totalLessons: s.progress.totalLessons + 1,
          totalXP: s.progress.totalXP + xp,
          completedLessonIds: [...s.progress.completedLessonIds, lessonId],
          currentPathPosition: s.progress.currentPathPosition + 1,
        },
      };
    }),

  // Rewards
  rewards: [],
  addReward: (reward) =>
    set((s) => ({ rewards: [...s.rewards, reward] })),

  // Daily Plan
  currentPlan: null,
  generateTodayPlan: () => {
    const state = get();
    if (!state.child) return;
    const plan = generateDailyPlan(
      state.child,
      state.progress.completedLessonIds
    );
    set({ currentPlan: plan });
  },
  updateLessonStatus: (lessonId, status) =>
    set((s) => {
      if (!s.currentPlan) return s;
      const lessons = s.currentPlan.lessons.map((l) =>
        l.lessonId === lessonId
          ? {
              ...l,
              status,
              completedAt:
                status === 'completed' ? new Date().toISOString() : l.completedAt,
            }
          : l
      );
      const allCompleted = lessons.every((l) => l.status === 'completed');
      return {
        currentPlan: {
          ...s.currentPlan,
          lessons,
          completed: allCompleted,
        },
      };
    }),

  // Lesson state
  currentLessonId: null,
  setCurrentLesson: (id) => set({ currentLessonId: id }),
  currentUnitIndex: 0,
  setCurrentUnitIndex: (index) => set({ currentUnitIndex: index }),
  lessonScore: 0,
  addLessonScore: (points) =>
    set((s) => ({ lessonScore: s.lessonScore + points })),
  resetLessonState: () =>
    set({ currentLessonId: null, currentUnitIndex: 0, lessonScore: 0 }),
}));
