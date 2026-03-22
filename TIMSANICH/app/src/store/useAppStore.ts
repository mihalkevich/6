import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  LessonType,
} from '../types';
import { generateDailyPlan } from '../utils/dailyEngine';
import { getLessonMeta } from '../data/learningObjectives';
import { getLessonById } from '../data/lessons';
import { format } from 'date-fns';
import type { SkillDomain } from '../data/curriculum';

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
  completeLesson: (lessonId: string, xp: number, accuracy?: number) => void;

  // Rewards
  rewards: Reward[];
  addReward: (reward: Reward) => void;

  // Daily Plan
  currentPlan: DailyPlan | null;
  generateTodayPlan: () => void;
  updateLessonStatus: (lessonId: string, status: DailyLessonStatus) => void;

  // Reset
  resetProgress: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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
      completeLesson: (lessonId, xp, accuracy) =>
        set((s) => {
          if (s.progress.completedLessonIds.includes(lessonId)) return s;

          // Update skill levels and learned words from lesson meta
          const meta = getLessonMeta(lessonId);
          const lesson = getLessonById(lessonId);
          const newSkillLevels = { ...s.progress.skillLevels };
          const primarySkill = meta.primarySkill as SkillDomain;
          if (primarySkill) {
            newSkillLevels[primarySkill] = ((newSkillLevels[primarySkill] as number) || 0) + 1;
          }
          for (const sec of (meta.secondarySkills || [])) {
            newSkillLevels[sec as SkillDomain] = ((newSkillLevels[sec as SkillDomain] as number) || 0) + 0.5;
          }

          // Track new words
          const newWords = [...s.progress.learnedWords];
          for (const word of (meta.newWords || [])) {
            if (!newWords.includes(word)) newWords.push(word);
          }

          // Track accuracy by lesson type
          const newAccuracy = { ...s.progress.accuracyByType };
          if (lesson && accuracy != null) {
            const key = lesson.type as LessonType;
            const existing = newAccuracy[key] || { totalAttempts: 0, correctAttempts: 0, lastAttemptDate: '' };
            newAccuracy[key] = {
              correctAttempts: existing.correctAttempts + Math.round(accuracy * (lesson.units?.length || 1)),
              totalAttempts: existing.totalAttempts + (lesson.units?.length || 1),
              lastAttemptDate: new Date().toISOString(),
            };
          }

          return {
            progress: {
              ...s.progress,
              totalLessons: s.progress.totalLessons + 1,
              totalXP: s.progress.totalXP + xp,
              completedLessonIds: [...s.progress.completedLessonIds, lessonId],
              currentPathPosition: s.progress.currentPathPosition + 1,
              skillLevels: newSkillLevels,
              learnedWords: newWords,
              accuracyByType: newAccuracy,
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

        // Check if current plan is for today
        const today = format(new Date(), 'yyyy-MM-dd');
        if (state.currentPlan && state.currentPlan.date === today) return;

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

      // Reset actions
      resetProgress: () =>
        set((s) => ({
          progress: {
            totalLessons: 0,
            totalXP: 0,
            completedLessonIds: [],
            currentPathPosition: 0,
            skillLevels: {},
            learnedWords: [],
            accuracyByType: {},
          },
          streak: { currentDays: 0, longestDays: 0, lastActiveDate: '' },
          rewards: [],
          currentPlan: null,
        })),
      resetAll: () =>
        set({
          child: null,
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
          progress: {
            totalLessons: 0,
            totalXP: 0,
            completedLessonIds: [],
            currentPathPosition: 0,
            skillLevels: {},
            learnedWords: [],
            accuracyByType: {},
          },
          streak: { currentDays: 0, longestDays: 0, lastActiveDate: '' },
          rewards: [],
          currentPlan: null,
        }),
    }),
    {
      name: 'timsanich-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        child: state.child,
        onboarding: state.onboarding,
        streak: state.streak,
        progress: state.progress,
        rewards: state.rewards,
        currentPlan: state.currentPlan,
      }),
    }
  )
);
