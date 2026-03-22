/**
 * Widget Data Provider
 *
 * Syncs app state to shared storage for native widgets.
 * Data is written after every lesson completion and on app open.
 *
 * Native widgets (iOS WidgetKit / Android AppWidget) will read this
 * data to display streak, progress, and mascot state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
  /** Child's name */
  childName: string;
  /** Current streak days */
  streakDays: number;
  /** Longest streak ever */
  longestStreak: number;
  /** Lessons completed today */
  lessonsToday: number;
  /** Total lessons for today */
  totalToday: number;
  /** Total XP */
  totalXP: number;
  /** Last active ISO date */
  lastActive: string;
  /** Mascot mood emoji */
  mascotEmoji: string;
  /** Mascot message */
  mascotMessage: string;
  /** Whether today's goal is complete */
  todayDone: boolean;
  /** Child avatar emoji */
  avatarEmoji: string;
  /** Updated timestamp */
  updatedAt: string;
}

const WIDGET_DATA_KEY = 'TIMSANICH_WIDGET_DATA';

/**
 * Write widget data to shared storage.
 * Called after lesson completion and on app open.
 */
export async function syncWidgetData(data: WidgetData): Promise<void> {
  try {
    const json = JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    // Write to AsyncStorage (accessible by native modules)
    await AsyncStorage.setItem(WIDGET_DATA_KEY, json);

    // TODO: When native widgets are implemented, also write to:
    // iOS: App Groups shared container (UserDefaults(suiteName:))
    // Android: SharedPreferences
  } catch (error) {
    console.warn('Failed to sync widget data:', error);
  }
}

/**
 * Read latest widget data.
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const json = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Clear widget data (on logout/reset).
 */
export async function clearWidgetData(): Promise<void> {
  await AsyncStorage.removeItem(WIDGET_DATA_KEY);
}
