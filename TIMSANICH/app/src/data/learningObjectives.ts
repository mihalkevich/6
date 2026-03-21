/**
 * Learning Objectives — Educational metadata for each lesson
 *
 * Maps lesson IDs to:
 * - Primary and secondary skills
 * - Learning objectives (what child should know after)
 * - Parent follow-up suggestions
 * - New words introduced
 * - Teaching notes shown during exercises
 */

import type { SkillDomain } from './curriculum';

interface LessonMeta {
  primarySkill: SkillDomain;
  secondarySkills: SkillDomain[];
  learningObjectiveRu: string;
  parentFollowUpRu: string;
  newWords: string[];
}

export const lessonMeta: Record<string, LessonMeta> = {
  // === ANIMALS ===
  'animals-1': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language', 'classification'],
    learningObjectiveRu: 'Ребёнок узнаёт и называет домашних животных: корова, лошадь, курица.',
    parentFollowUpRu: 'Посмотрите вместе книгу о ферме. Спросите: «Какие звуки издаёт корова? А лошадь?»',
    newWords: ['корова', 'лошадь', 'курица'],
  },
  'animals-2': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language', 'classification'],
    learningObjectiveRu: 'Ребёнок различает диких животных: лев, слон, медведь.',
    parentFollowUpRu: 'Обсудите: «Где живёт лев? А медведь?» Покажите картинки или видео.',
    newWords: ['лев', 'слон', 'медведь'],
  },
  'animals-3': {
    primarySkill: 'classification',
    secondarySkills: ['vocabulary', 'logical_thinking'],
    learningObjectiveRu: 'Ребёнок знает морских обитателей и понимает, кто живёт в воде.',
    parentFollowUpRu: 'Нарисуйте вместе аквариум и «поселите» туда рыб.',
    newWords: ['рыба', 'кит', 'краб', 'осьминог'],
  },
  'animals-4': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language'],
    learningObjectiveRu: 'Ребёнок узнаёт птиц: сова, пингвин, попугай.',
    parentFollowUpRu: 'На прогулке обращайте внимание на птиц. Спросите: «Это ворона или голубь?»',
    newWords: ['сова', 'пингвин', 'попугай', 'утка'],
  },
  'animals-5': {
    primarySkill: 'vocabulary',
    secondarySkills: ['visual_perception'],
    learningObjectiveRu: 'Ребёнок знакомится с насекомыми: бабочка, пчела, муравей.',
    parentFollowUpRu: 'На прогулке поищите вместе муравьёв или бабочек.',
    newWords: ['бабочка', 'пчела', 'муравей', 'божья коровка'],
  },
  // === FOOD ===
  'food-1': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language', 'classification'],
    learningObjectiveRu: 'Ребёнок называет фрукты: яблоко, банан, клубника.',
    parentFollowUpRu: 'Возьмите фрукт из холодильника. Спросите: «Какой это цвет? Какой на вкус?»',
    newWords: ['яблоко', 'банан', 'клубника', 'виноград'],
  },
  'food-2': {
    primarySkill: 'classification',
    secondarySkills: ['vocabulary', 'logical_thinking'],
    learningObjectiveRu: 'Ребёнок различает фрукты и овощи, называет морковь, помидор, огурец.',
    parentFollowUpRu: 'На кухне попросите ребёнка помочь: «Найди все овощи!»',
    newWords: ['морковь', 'помидор', 'огурец', 'кукуруза'],
  },
  'food-3': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language'],
    learningObjectiveRu: 'Ребёнок знает названия напитков: молоко, сок, вода.',
    parentFollowUpRu: 'Спросите за обедом: «Что ты хочешь пить — сок или молоко?»',
    newWords: ['молоко', 'сок', 'вода', 'чай'],
  },
  // === COLORS ===
  'colors-1': {
    primarySkill: 'visual_perception',
    secondarySkills: ['vocabulary', 'receptive_language'],
    learningObjectiveRu: 'Ребёнок узнаёт и называет красный, синий и зелёный цвета.',
    parentFollowUpRu: 'Поиграйте: «Найди в комнате что-то красное!» Потом синее, зелёное.',
    newWords: ['красный', 'синий', 'зелёный'],
  },
  'colors-2': {
    primarySkill: 'visual_perception',
    secondarySkills: ['vocabulary'],
    learningObjectiveRu: 'Ребёнок узнаёт жёлтый, оранжевый и фиолетовый цвета.',
    parentFollowUpRu: 'Рисуйте вместе! Попросите ребёнка выбрать жёлтый карандаш.',
    newWords: ['жёлтый', 'оранжевый', 'фиолетовый'],
  },
  'colors-3': {
    primarySkill: 'visual_perception',
    secondarySkills: ['vocabulary', 'classification'],
    learningObjectiveRu: 'Ребёнок различает чёрный, белый и розовый.',
    parentFollowUpRu: 'Сортируйте одежду: «Где тёмные вещи? А где светлые?»',
    newWords: ['чёрный', 'белый', 'розовый', 'серый'],
  },
  // === SHAPES ===
  'shapes-1': {
    primarySkill: 'visual_perception',
    secondarySkills: ['spatial_awareness', 'vocabulary'],
    learningObjectiveRu: 'Ребёнок узнаёт круг, квадрат и треугольник.',
    parentFollowUpRu: 'Поищите формы в доме: тарелка — круг, окно — квадрат, крыша — треугольник.',
    newWords: ['круг', 'квадрат', 'треугольник'],
  },
  'shapes-2': {
    primarySkill: 'visual_perception',
    secondarySkills: ['vocabulary'],
    learningObjectiveRu: 'Ребёнок узнаёт звезду, сердце и ромб.',
    parentFollowUpRu: 'Нарисуйте вместе звёздочку и сердечко.',
    newWords: ['звезда', 'сердце', 'ромб'],
  },
  // === EMOTIONS ===
  'emotions-1': {
    primarySkill: 'emotional_intelligence',
    secondarySkills: ['receptive_language', 'social_skills'],
    learningObjectiveRu: 'Ребёнок узнаёт радость и грусть на лицах.',
    parentFollowUpRu: 'Спросите: «Когда ты радуешься? А когда грустишь?» Обсудите чувства.',
    newWords: ['радость', 'грусть', 'весёлый', 'грустный'],
  },
  'emotions-2': {
    primarySkill: 'emotional_intelligence',
    secondarySkills: ['receptive_language', 'social_skills'],
    learningObjectiveRu: 'Ребёнок различает злость и удивление.',
    parentFollowUpRu: 'Покажите мимикой разные эмоции и попросите ребёнка угадать.',
    newWords: ['злость', 'удивление', 'злой', 'удивлённый'],
  },
  // === COMPARISONS ===
  'comp-1': {
    primarySkill: 'classification',
    secondarySkills: ['logical_thinking', 'vocabulary'],
    learningObjectiveRu: 'Ребёнок сравнивает предметы по размеру: большой и маленький.',
    parentFollowUpRu: 'Сравнивайте: «Кто больше — папа или ребёнок? А кто меньше?»',
    newWords: ['большой', 'маленький'],
  },
  'comp-2': {
    primarySkill: 'classification',
    secondarySkills: ['logical_thinking', 'vocabulary'],
    learningObjectiveRu: 'Ребёнок понимает понятия быстрый и медленный.',
    parentFollowUpRu: 'Побегайте вместе! «Кто быстрее — ты или черепаха?»',
    newWords: ['быстрый', 'медленный'],
  },
  // === HOME OBJECTS ===
  'home-1': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language'],
    learningObjectiveRu: 'Ребёнок называет предметы на кухне: чашка, ложка, тарелка.',
    parentFollowUpRu: 'На кухне попросите: «Дай мне, пожалуйста, ложку. А где тарелка?»',
    newWords: ['чашка', 'ложка', 'тарелка', 'вилка'],
  },
  'home-2': {
    primarySkill: 'vocabulary',
    secondarySkills: ['receptive_language', 'spatial_awareness'],
    learningObjectiveRu: 'Ребёнок знает предметы в спальне: кровать, стул, лампа.',
    parentFollowUpRu: 'Поиграйте: «Покажи, где в комнате стул? А лампа?»',
    newWords: ['кровать', 'стул', 'стол', 'лампа'],
  },
  // === LOGIC ===
  'logic-1': {
    primarySkill: 'logical_thinking',
    secondarySkills: ['classification', 'attention'],
    learningObjectiveRu: 'Ребёнок находит лишний предмет в группе по категории.',
    parentFollowUpRu: 'Разложите игрушки и добавьте один «лишний» предмет. Пусть ребёнок найдёт его!',
    newWords: ['лишний', 'подходит', 'не подходит'],
  },
  'logic-2': {
    primarySkill: 'logical_thinking',
    secondarySkills: ['attention', 'visual_perception'],
    learningObjectiveRu: 'Ребёнок продолжает простую последовательность (паттерн АБ).',
    parentFollowUpRu: 'Выложите цветные кубики: красный-синий-красный-? Пусть ребёнок продолжит.',
    newWords: ['дальше', 'потом', 'по порядку'],
  },
  // === MEMORY ===
  'memory-1': {
    primarySkill: 'working_memory',
    secondarySkills: ['attention', 'visual_perception'],
    learningObjectiveRu: 'Ребёнок запоминает и вспоминает 3 показанных предмета.',
    parentFollowUpRu: 'Поиграйте в «Что пропало?»: положите 3 игрушки, уберите одну, пусть ребёнок угадает.',
    newWords: ['запомни', 'вспомни', 'было', 'не было'],
  },
  // === SPEECH ===
  'speech-1': {
    primarySkill: 'expressive_language',
    secondarySkills: ['vocabulary', 'phonological_awareness'],
    learningObjectiveRu: 'Ребёнок повторяет простые слова чётко и уверенно.',
    parentFollowUpRu: 'Повторяйте новые слова вместе 3-5 раз. Хвалите за попытки!',
    newWords: ['мама', 'папа', 'кот'],
  },
  'speech-2': {
    primarySkill: 'expressive_language',
    secondarySkills: ['vocabulary', 'social_skills'],
    learningObjectiveRu: 'Ребёнок использует простые фразы из 3-4 слов.',
    parentFollowUpRu: 'Попросите ребёнка рассказать, что он видит за окном целым предложением.',
    newWords: ['я хочу', 'доброе утро', 'спасибо'],
  },
  // === TRANSPORT ===
  'transport-1': {
    primarySkill: 'vocabulary',
    secondarySkills: ['classification', 'receptive_language'],
    learningObjectiveRu: 'Ребёнок называет наземный транспорт: машина, автобус, поезд.',
    parentFollowUpRu: 'На прогулке считайте машины: «Какого цвета этот автобус?»',
    newWords: ['машина', 'автобус', 'поезд'],
  },
  'transport-2': {
    primarySkill: 'classification',
    secondarySkills: ['vocabulary', 'logical_thinking'],
    learningObjectiveRu: 'Ребёнок различает воздушный и водный транспорт.',
    parentFollowUpRu: 'Спросите: «Что летает? А что плавает? Может ли машина плавать?»',
    newWords: ['самолёт', 'корабль', 'лодка'],
  },
  // === PARENT TASKS ===
  'parent-1': {
    primarySkill: 'expressive_language',
    secondarySkills: ['vocabulary', 'social_skills'],
    learningObjectiveRu: 'Ребёнок практикует активную речь, называя животных самостоятельно.',
    parentFollowUpRu: 'Продолжайте игру: «Какие ещё животные ты знаешь? Нарисуй своё любимое!»',
    newWords: [],
  },
  'parent-2': {
    primarySkill: 'visual_perception',
    secondarySkills: ['vocabulary', 'attention'],
    learningObjectiveRu: 'Ребёнок находит предметы заданного цвета в реальном мире.',
    parentFollowUpRu: 'Усложните: «Найди что-то красное И круглое!»',
    newWords: [],
  },
};

/**
 * Get learning metadata for a lesson.
 * Returns defaults if no specific metadata exists.
 */
export function getLessonMeta(lessonId: string): LessonMeta {
  return lessonMeta[lessonId] || {
    primarySkill: 'vocabulary' as SkillDomain,
    secondarySkills: ['receptive_language'] as SkillDomain[],
    learningObjectiveRu: 'Ребёнок узнаёт новые слова и понятия.',
    parentFollowUpRu: 'Повторите новые слова вместе с ребёнком.',
    newWords: [],
  };
}
