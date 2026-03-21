/**
 * Notification System — Daily reminders and streaks
 *
 * Manages local push notifications:
 * - Daily lesson reminder (configurable time)
 * - Streak warning (about to lose streak)
 * - Celebration notification (milestone reached)
 * - Gentle re-engagement (haven't opened in 2 days)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule daily lesson reminder.
 * @param hour - Hour of day (0-23)
 * @param minute - Minute (0-59)
 * @param childName - Child's name for personalization
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  childName: string
) {
  // Cancel existing daily reminders
  await cancelDailyReminders();

  const messages = [
    `${childName}, пора учиться! 🌟 Новые уроки уже ждут.`,
    `Привет, ${childName}! 📚 Готов к новым открытиям?`,
    `${childName}, давай продолжим! ✨ Сегодня будет интересно.`,
    `Время учиться, ${childName}! 🎯 Короткий урок — всего пара минут.`,
    `${childName}, не забудь позаниматься! 🚀 Ты молодец!`,
  ];

  // Schedule 5 rotating messages for the week
  for (let i = 0; i < 5; i++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TIMSANICH Kids Edu',
        body: messages[i],
        sound: 'default',
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

/**
 * Schedule streak warning — fires if child hasn't completed lessons today.
 */
export async function scheduleStreakWarning(
  childName: string,
  streakDays: number
) {
  if (streakDays < 2) return; // Only warn if there's a streak to protect

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Не потеряй серию!',
      body: `${childName}, у тебя ${streakDays} дней подряд! Завершить урок займёт всего 2 минуты.`,
      sound: 'default',
      badge: 1,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 20 * 60 * 60, // 20 hours from now
      repeats: false,
    },
  });
}

/**
 * Schedule gentle re-engagement after 2 days of inactivity.
 */
export async function scheduleReengagement(childName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Мы скучаем, ${childName}! 🌈`,
      body: 'Новые уроки готовы. Всего 3 минуты — и ты узнаешь что-то новое!',
      sound: 'default',
      badge: 1,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60, // 48 hours
      repeats: false,
    },
  });
}

/**
 * Send immediate celebration notification.
 */
export async function sendCelebrationNotification(
  title: string,
  body: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}

/**
 * Cancel all daily reminder notifications.
 */
export async function cancelDailyReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get count of scheduled notifications.
 */
export async function getScheduledCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}
