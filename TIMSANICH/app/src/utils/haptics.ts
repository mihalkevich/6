/**
 * Haptic Feedback System
 *
 * Provides tactile responses throughout the app:
 * - Button taps: light impact
 * - Correct answer: success notification
 * - Wrong answer: warning notification
 * - Lesson complete: heavy celebration
 * - Streak milestone: pattern sequence
 * - Reward unlock: triple burst
 * - Navigation tap: selection feedback
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap — button press, option select */
export function hapticTap() {
  if (!isHapticsAvailable) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — card press, important selection */
export function hapticPress() {
  if (!isHapticsAvailable) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy tap — big button, start lesson */
export function hapticHeavy() {
  if (!isHapticsAvailable) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Correct answer — success notification */
export function hapticSuccess() {
  if (!isHapticsAvailable) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Wrong answer — gentle warning */
export function hapticError() {
  if (!isHapticsAvailable) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Selection change — toggle, tab switch */
export function hapticSelection() {
  if (!isHapticsAvailable) return;
  Haptics.selectionAsync();
}

/** Celebration — lesson complete, streak milestone */
export async function hapticCelebration() {
  if (!isHapticsAvailable) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await delay(100);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await delay(80);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Reward unlock — triple burst pattern */
export async function hapticReward() {
  if (!isHapticsAvailable) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await delay(120);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await delay(120);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Streak milestone — ascending pattern */
export async function hapticStreak() {
  if (!isHapticsAvailable) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await delay(80);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await delay(80);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(150);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Progress bar fill complete */
export async function hapticProgressComplete() {
  if (!isHapticsAvailable) return;
  for (let i = 0; i < 3; i++) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await delay(60);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
