import { format } from 'date-fns';
import type { Child, DailyPlan, PlannedLesson } from '../types';
import { getLessonsForAge } from '../data/lessons';
import { getLessonMeta } from '../data/learningObjectives';
import type { SkillDomain } from '../data/curriculum';

const parentTips = [
  {
    tip: 'Repeat new words with your child during dinner',
    tipRu: 'Повторите новые слова с ребёнком за ужином',
  },
  {
    tip: 'Ask your child to name objects around the house',
    tipRu: 'Попросите ребёнка назвать предметы в доме',
  },
  {
    tip: 'Read a short story together before bed',
    tipRu: 'Прочитайте короткую историю перед сном',
  },
  {
    tip: 'Play a counting game during a walk',
    tipRu: 'Поиграйте в счёт на прогулке',
  },
  {
    tip: 'Ask about colors of things your child sees',
    tipRu: 'Спросите о цветах предметов, которые видит ребёнок',
  },
  {
    tip: 'Name animals together while looking at a book',
    tipRu: 'Называйте животных вместе, рассматривая книгу',
  },
  {
    tip: 'Practice simple greetings together',
    tipRu: 'Практикуйте простые приветствия вместе',
  },
];

export function generateDailyPlan(
  child: Child,
  completedLessonIds: string[]
): DailyPlan {
  const allLessons = getLessonsForAge(child.age);
  const available = allLessons.filter(
    (l) => !completedLessonIds.includes(l.id)
  );
  const completed = allLessons.filter((l) =>
    completedLessonIds.includes(l.id)
  );

  // Determine how many lessons based on daily minutes
  const lessonCount =
    child.dailyMinutes === 5 ? 3 : child.dailyMinutes === 10 ? 4 : 5;

  const planned: PlannedLesson[] = [];

  // 1 main new lesson
  const mainLesson = available.find((l) => {
    const deps = l.requiredLessonIds;
    return deps.every((d) => completedLessonIds.includes(d));
  });
  if (mainLesson) {
    planned.push({
      lessonId: mainLesson.id,
      status: 'pending',
      score: 0,
      isReview: false,
    });
  }

  // Fill remaining with available lessons (not yet completed, deps met)
  const remainingNew = available
    .filter(
      (l) =>
        l.id !== mainLesson?.id &&
        l.requiredLessonIds.every((d) => completedLessonIds.includes(d))
    )
    .slice(0, Math.max(0, lessonCount - planned.length - 1));

  for (const lesson of remainingNew) {
    planned.push({
      lessonId: lesson.id,
      status: 'pending',
      score: 0,
      isReview: false,
    });
  }

  // 1 review lesson from completed
  if (completed.length > 0) {
    const reviewLesson = completed[Math.floor(Math.random() * completed.length)];
    planned.push({
      lessonId: reviewLesson.id,
      status: 'pending',
      score: 0,
      isReview: true,
    });
  }

  // If not enough, add more from available
  while (planned.length < lessonCount && available.length > planned.length) {
    const next = available.find(
      (l) => !planned.some((p) => p.lessonId === l.id)
    );
    if (!next) break;
    planned.push({
      lessonId: next.id,
      status: 'pending',
      score: 0,
      isReview: false,
    });
  }

  const tipIndex = Math.floor(Math.random() * parentTips.length);

  // Collect skills being developed today
  const todaySkills: SkillDomain[] = [];
  for (const p of planned) {
    const m = getLessonMeta(p.lessonId);
    if (!todaySkills.includes(m.primarySkill)) {
      todaySkills.push(m.primarySkill);
    }
  }

  const skillNames = todaySkills
    .slice(0, 3)
    .map((s) => {
      const names: Record<string, string> = {
        vocabulary: 'словарный запас',
        receptive_language: 'понимание речи',
        expressive_language: 'активная речь',
        classification: 'классификация',
        visual_perception: 'восприятие',
        logical_thinking: 'логика',
        attention: 'внимание',
        working_memory: 'память',
        counting: 'счёт',
        emotional_intelligence: 'эмоции',
        spatial_awareness: 'пространство',
        phonological_awareness: 'звуки',
        social_skills: 'общение',
        fine_motor: 'моторика',
      };
      return names[s] || s;
    });

  return {
    id: `plan-${format(new Date(), 'yyyy-MM-dd')}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    lessons: planned,
    parentTip: parentTips[tipIndex].tip,
    parentTipRu: parentTips[tipIndex].tipRu,
    summary: `Today: ${planned.length} lessons for ${child.name}`,
    summaryRu: `Сегодня: ${planned.length} уроков для ${child.name}`,
    completed: false,
    learningFocusRu: `Сегодня развиваем: ${skillNames.join(', ')}`,
    todaySkills,
  };
}
