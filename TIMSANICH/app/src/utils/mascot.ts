/**
 * Mascot System — Dynamic character that reacts to child's activity
 *
 * Like Duolingo's owl, but with emoji-based characters.
 * The mascot changes mood/expression based on:
 * - Time since last lesson
 * - Current streak
 * - Daily progress
 * - Time of day
 *
 * Moods affect: expression, message, animation, haptic
 */

export type MascotMood =
  | 'happy'          // Just completed a lesson
  | 'excited'        // Streak milestone or perfect score
  | 'encouraging'    // Hasn't started today but still time
  | 'worried'        // Getting late, no lessons done
  | 'sad'            // Missed yesterday, streak in danger
  | 'sleeping'       // Late night/early morning
  | 'celebrating'    // All daily lessons done
  | 'proud'          // Multi-day streak
  | 'comeback'       // Returning after absence
  ;

export interface MascotState {
  mood: MascotMood;
  emoji: string;
  messageRu: string;
  subtitleRu?: string;
  animation: 'bounce' | 'pulse' | 'shake' | 'wave' | 'spin' | 'none';
  backgroundColor: string;
  accentColor: string;
}

interface MascotInput {
  streakDays: number;
  lessonsCompletedToday: number;
  totalLessonsToday: number;
  hoursSinceLastLesson: number;
  lastActiveDate: string; // YYYY-MM-DD
  childName: string;
}

const HAPPY_MESSAGES = [
  (name: string) => `Отлично, ${name}! Ты молодец!`,
  (name: string) => `Супер, ${name}! Так держать!`,
  (name: string) => `${name}, ты звезда! ⭐`,
  (name: string) => `Круто, ${name}! Ещё чуть-чуть!`,
];

const ENCOURAGING_MESSAGES = [
  (name: string) => `Привет, ${name}! Готов учиться?`,
  (name: string) => `${name}, давай позанимаемся!`,
  (name: string) => `Новые уроки ждут тебя, ${name}!`,
  (name: string) => `${name}, всего пара минут — и ты узнаешь новое!`,
];

const WORRIED_MESSAGES = [
  (name: string) => `${name}, не забудь позаниматься!`,
  (name: string) => `День почти закончился, ${name}...`,
  (name: string) => `${name}, ещё есть время!`,
  (name: string) => `Я жду тебя, ${name}! 🥺`,
];

const SAD_MESSAGES = [
  (name: string) => `${name}, я скучал! Давай начнём?`,
  (name: string) => `${name}, вернись! Серия в опасности...`,
  (name: string) => `Мы давно не занимались, ${name} 😢`,
];

const CELEBRATING_MESSAGES = [
  (name: string) => `${name}, все уроки на сегодня сделаны! 🎉`,
  (name: string) => `Ура, ${name}! Можно отдыхать!`,
  (name: string) => `${name} — чемпион дня! 🏆`,
];

const PROUD_MESSAGES = [
  (name: string, days: number) => `${name}, ${days} дней подряд! Невероятно!`,
  (name: string, days: number) => `${days} дней серии! Ты герой, ${name}!`,
  (name: string, days: number) => `Wow, ${name}! Серия ${days} дней! 🔥`,
];

const COMEBACK_MESSAGES = [
  (name: string) => `${name}, с возвращением! 🎊`,
  (name: string) => `Мы снова вместе, ${name}! Поехали!`,
  (name: string) => `${name}! Давно не виделись, начнём заново?`,
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getMascotState(input: MascotInput): MascotState {
  const {
    streakDays,
    lessonsCompletedToday,
    totalLessonsToday,
    hoursSinceLastLesson,
    lastActiveDate,
    childName,
  } = input;

  const hour = new Date().getHours();
  const today = new Date().toISOString().slice(0, 10);
  const isToday = lastActiveDate === today;
  const daysSinceActive = lastActiveDate
    ? Math.floor((Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const allDone = lessonsCompletedToday >= totalLessonsToday && totalLessonsToday > 0;

  // === Late night / early morning ===
  if (hour < 6 || hour >= 22) {
    return {
      mood: 'sleeping',
      emoji: '😴',
      messageRu: `Спокойной ночи, ${childName}!`,
      subtitleRu: 'Увидимся завтра утром',
      animation: 'none',
      backgroundColor: '#E8E0F0',
      accentColor: '#9B8EC4',
    };
  }

  // === All daily lessons done ===
  if (allDone) {
    return {
      mood: 'celebrating',
      emoji: '🥳',
      messageRu: randomFrom(CELEBRATING_MESSAGES)(childName),
      subtitleRu: streakDays > 1 ? `Серия: ${streakDays} дней 🔥` : undefined,
      animation: 'bounce',
      backgroundColor: '#E8F8EA',
      accentColor: '#6BCB77',
    };
  }

  // === Streak milestone ===
  if (streakDays >= 7 && isToday && lessonsCompletedToday > 0) {
    return {
      mood: 'proud',
      emoji: '🤩',
      messageRu: randomFrom(PROUD_MESSAGES)(childName, streakDays),
      subtitleRu: `Осталось ${totalLessonsToday - lessonsCompletedToday} уроков`,
      animation: 'spin',
      backgroundColor: '#FFF4E3',
      accentColor: '#F5B461',
    };
  }

  // === Just completed a lesson ===
  if (isToday && lessonsCompletedToday > 0 && hoursSinceLastLesson < 0.5) {
    return {
      mood: 'happy',
      emoji: '😊',
      messageRu: randomFrom(HAPPY_MESSAGES)(childName),
      subtitleRu: `${lessonsCompletedToday}/${totalLessonsToday} уроков`,
      animation: 'bounce',
      backgroundColor: '#E8F3FC',
      accentColor: '#4A9FE5',
    };
  }

  // === Returning after absence (2+ days) ===
  if (daysSinceActive >= 2) {
    return {
      mood: 'comeback',
      emoji: '🥹',
      messageRu: randomFrom(COMEBACK_MESSAGES)(childName),
      subtitleRu: 'Начнём с лёгкого урока?',
      animation: 'wave',
      backgroundColor: '#E8F3FC',
      accentColor: '#4A9FE5',
    };
  }

  // === Streak at risk (didn't do lessons yesterday and none today) ===
  if (daysSinceActive === 1 && !isToday && streakDays > 0) {
    return {
      mood: 'sad',
      emoji: '😢',
      messageRu: randomFrom(SAD_MESSAGES)(childName),
      subtitleRu: `Серия ${streakDays} дней в опасности!`,
      animation: 'shake',
      backgroundColor: '#FDECEC',
      accentColor: '#EF6461',
    };
  }

  // === Getting late in the day, no lessons ===
  if (hour >= 18 && lessonsCompletedToday === 0) {
    return {
      mood: 'worried',
      emoji: '😟',
      messageRu: randomFrom(WORRIED_MESSAGES)(childName),
      subtitleRu: `${totalLessonsToday} уроков на сегодня`,
      animation: 'shake',
      backgroundColor: '#FFF4E3',
      accentColor: '#F5B461',
    };
  }

  // === Excited (streak and did some lessons) ===
  if (streakDays >= 3 && lessonsCompletedToday > 0) {
    return {
      mood: 'excited',
      emoji: '🤗',
      messageRu: `${childName}, ты на ходу! 🔥`,
      subtitleRu: `Серия ${streakDays} дней • ${lessonsCompletedToday}/${totalLessonsToday}`,
      animation: 'bounce',
      backgroundColor: '#E8F8EA',
      accentColor: '#6BCB77',
    };
  }

  // === Default: encouraging ===
  return {
    mood: 'encouraging',
    emoji: '🤗',
    messageRu: randomFrom(ENCOURAGING_MESSAGES)(childName),
    subtitleRu: totalLessonsToday > 0
      ? `${totalLessonsToday} уроков на сегодня`
      : 'Начни первый урок!',
    animation: 'wave',
    backgroundColor: '#E8F3FC',
    accentColor: '#4A9FE5',
  };
}
