import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PhotoSessionState } from '../types/imagePresets';

interface PresetsState {
  // Active photo session
  activeSession: PhotoSessionState | null;

  // History of completed sessions
  completedSessions: PhotoSessionState[];

  // Favorite preset IDs
  favoritePresetIds: string[];

  // Actions
  startSession: (presetId: string) => void;
  nextPrompt: () => void;
  previousPrompt: () => void;
  markPromptComplete: (promptId: string) => void;
  saveGeneratedImage: (promptId: string, imageUri: string) => void;
  completeSession: () => void;
  cancelSession: () => void;
  toggleFavorite: (presetId: string) => void;
  getSessionCount: () => number;
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set, get) => ({
      // State
      activeSession: null,
      completedSessions: [],
      favoritePresetIds: [],

      // Actions
      startSession: (presetId) =>
        set({
          activeSession: {
            presetId,
            startedAt: new Date().toISOString(),
            currentPromptIndex: 0,
            completedPromptIds: [],
            generatedImages: {},
            isComplete: false,
          },
        }),

      nextPrompt: () =>
        set((s) => {
          if (!s.activeSession) return s;
          return {
            activeSession: {
              ...s.activeSession,
              currentPromptIndex: s.activeSession.currentPromptIndex + 1,
            },
          };
        }),

      previousPrompt: () =>
        set((s) => {
          if (!s.activeSession || s.activeSession.currentPromptIndex <= 0) return s;
          return {
            activeSession: {
              ...s.activeSession,
              currentPromptIndex: s.activeSession.currentPromptIndex - 1,
            },
          };
        }),

      markPromptComplete: (promptId) =>
        set((s) => {
          if (!s.activeSession) return s;
          if (s.activeSession.completedPromptIds.includes(promptId)) return s;
          return {
            activeSession: {
              ...s.activeSession,
              completedPromptIds: [
                ...s.activeSession.completedPromptIds,
                promptId,
              ],
            },
          };
        }),

      saveGeneratedImage: (promptId, imageUri) =>
        set((s) => {
          if (!s.activeSession) return s;
          return {
            activeSession: {
              ...s.activeSession,
              generatedImages: {
                ...s.activeSession.generatedImages,
                [promptId]: imageUri,
              },
            },
          };
        }),

      completeSession: () =>
        set((s) => {
          if (!s.activeSession) return s;
          const completedSession: PhotoSessionState = {
            ...s.activeSession,
            isComplete: true,
          };
          return {
            activeSession: null,
            completedSessions: [...s.completedSessions, completedSession],
          };
        }),

      cancelSession: () =>
        set({ activeSession: null }),

      toggleFavorite: (presetId) =>
        set((s) => {
          const favoritePresetIds = s.favoritePresetIds.includes(presetId)
            ? s.favoritePresetIds.filter((id) => id !== presetId)
            : [...s.favoritePresetIds, presetId];
          return { favoritePresetIds };
        }),

      getSessionCount: () => get().completedSessions.length,
    }),
    {
      name: 'nanabanana-presets-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        completedSessions: state.completedSessions,
        favoritePresetIds: state.favoritePresetIds,
      }),
    }
  )
);
