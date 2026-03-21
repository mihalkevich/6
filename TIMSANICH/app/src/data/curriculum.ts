/**
 * TIMSANICH Kids Edu — Curriculum Framework
 *
 * Developmental milestones and learning objectives for ages 3–5,
 * based on early childhood education research.
 *
 * Each age group has specific skills targets mapped to lesson categories.
 */

import type { AgeGroup } from '../types';

export interface DevelopmentalMilestone {
  id: string;
  skill: SkillDomain;
  title: string;
  titleRu: string;
  description: string;
  descriptionRu: string;
  ageGroup: AgeGroup;
  indicators: string[];
  indicatorsRu: string[];
}

export type SkillDomain =
  | 'receptive_language'    // понимание речи
  | 'expressive_language'   // активная речь
  | 'vocabulary'            // словарный запас
  | 'phonological_awareness'// фонематический слух
  | 'visual_perception'     // зрительное восприятие
  | 'logical_thinking'      // логическое мышление
  | 'attention'             // внимание
  | 'working_memory'        // рабочая память
  | 'classification'        // классификация
  | 'counting'              // счёт
  | 'spatial_awareness'     // пространственное мышление
  | 'emotional_intelligence'// эмоциональный интеллект
  | 'fine_motor'            // мелкая моторика (будущее)
  | 'social_skills';        // социальные навыки

export const skillDomainLabels: Record<SkillDomain, { name: string; nameRu: string; emoji: string }> = {
  receptive_language:     { name: 'Listening', nameRu: 'Понимание речи', emoji: '👂' },
  expressive_language:    { name: 'Speaking', nameRu: 'Активная речь', emoji: '🗣️' },
  vocabulary:             { name: 'Vocabulary', nameRu: 'Словарный запас', emoji: '📚' },
  phonological_awareness: { name: 'Phonics', nameRu: 'Фонематический слух', emoji: '🔤' },
  visual_perception:      { name: 'Visual Perception', nameRu: 'Зрительное восприятие', emoji: '👁️' },
  logical_thinking:       { name: 'Logic', nameRu: 'Логическое мышление', emoji: '🧩' },
  attention:              { name: 'Attention', nameRu: 'Внимание', emoji: '🎯' },
  working_memory:         { name: 'Memory', nameRu: 'Рабочая память', emoji: '🧠' },
  counting:               { name: 'Counting', nameRu: 'Счёт', emoji: '🔢' },
  classification:         { name: 'Classification', nameRu: 'Классификация', emoji: '📦' },
  spatial_awareness:      { name: 'Spatial Awareness', nameRu: 'Пространство', emoji: '📐' },
  emotional_intelligence: { name: 'Emotions', nameRu: 'Эмоциональный интеллект', emoji: '💛' },
  fine_motor:             { name: 'Fine Motor', nameRu: 'Мелкая моторика', emoji: '✋' },
  social_skills:          { name: 'Social Skills', nameRu: 'Социальные навыки', emoji: '🤝' },
};

/**
 * Age-specific developmental milestones.
 * Based on early childhood education standards.
 */
export const milestones: DevelopmentalMilestone[] = [
  // === AGE 3 ===
  {
    id: 'ms-3-vocab-50',
    skill: 'vocabulary',
    title: 'Core 50 Words',
    titleRu: 'Базовые 50 слов',
    description: 'Recognizes and names 50 common objects',
    descriptionRu: 'Узнаёт и называет 50 обычных предметов',
    ageGroup: 3,
    indicators: ['Points to named objects', 'Names objects when shown'],
    indicatorsRu: ['Показывает названные предметы', 'Называет предметы при показе'],
  },
  {
    id: 'ms-3-colors-basic',
    skill: 'visual_perception',
    title: 'Basic Colors',
    titleRu: 'Основные цвета',
    description: 'Identifies and names 6 basic colors',
    descriptionRu: 'Различает и называет 6 основных цветов',
    ageGroup: 3,
    indicators: ['Names red, blue, green, yellow', 'Matches objects by color'],
    indicatorsRu: ['Называет красный, синий, зелёный, жёлтый', 'Сортирует предметы по цвету'],
  },
  {
    id: 'ms-3-shapes',
    skill: 'visual_perception',
    title: 'Basic Shapes',
    titleRu: 'Основные формы',
    description: 'Recognizes circle, square, triangle',
    descriptionRu: 'Узнаёт круг, квадрат, треугольник',
    ageGroup: 3,
    indicators: ['Names 3 shapes', 'Matches shapes to outlines'],
    indicatorsRu: ['Называет 3 формы', 'Сопоставляет формы с контурами'],
  },
  {
    id: 'ms-3-counting',
    skill: 'counting',
    title: 'Count to 3',
    titleRu: 'Счёт до 3',
    description: 'Counts objects up to 3',
    descriptionRu: 'Считает предметы до 3',
    ageGroup: 3,
    indicators: ['Counts 1-2-3', 'Shows correct number of fingers'],
    indicatorsRu: ['Считает 1-2-3', 'Показывает правильное количество пальцев'],
  },
  {
    id: 'ms-3-emotions',
    skill: 'emotional_intelligence',
    title: 'Basic Emotions',
    titleRu: 'Базовые эмоции',
    description: 'Identifies happy, sad, angry',
    descriptionRu: 'Различает радость, грусть, злость',
    ageGroup: 3,
    indicators: ['Names 3 emotions', 'Shows emotion on face'],
    indicatorsRu: ['Называет 3 эмоции', 'Изображает эмоцию'],
  },
  {
    id: 'ms-3-big-small',
    skill: 'classification',
    title: 'Big & Small',
    titleRu: 'Большой и Маленький',
    description: 'Compares objects by size',
    descriptionRu: 'Сравнивает предметы по размеру',
    ageGroup: 3,
    indicators: ['Points to bigger/smaller', 'Uses words big/small'],
    indicatorsRu: ['Показывает больший/меньший', 'Использует слова большой/маленький'],
  },
  {
    id: 'ms-3-categories',
    skill: 'classification',
    title: 'Simple Categories',
    titleRu: 'Простые категории',
    description: 'Groups objects into basic categories',
    descriptionRu: 'Группирует предметы по категориям',
    ageGroup: 3,
    indicators: ['Animals vs food', 'Toys vs clothes'],
    indicatorsRu: ['Животные vs еда', 'Игрушки vs одежда'],
  },
  {
    id: 'ms-3-speech-phrases',
    skill: 'expressive_language',
    title: '2-3 Word Phrases',
    titleRu: 'Фразы из 2-3 слов',
    description: 'Uses simple phrases',
    descriptionRu: 'Использует простые фразы',
    ageGroup: 3,
    indicators: ['Says "I want water"', 'Says "big dog"'],
    indicatorsRu: ['Говорит «хочу воды»', 'Говорит «большая собака»'],
  },

  // === AGE 4 ===
  {
    id: 'ms-4-vocab-100',
    skill: 'vocabulary',
    title: 'Expanded Vocabulary',
    titleRu: 'Расширенный словарь',
    description: 'Recognizes and uses 100+ words actively',
    descriptionRu: 'Узнаёт и активно использует 100+ слов',
    ageGroup: 4,
    indicators: ['Names body parts', 'Uses action words', 'Knows opposites'],
    indicatorsRu: ['Называет части тела', 'Использует глаголы', 'Знает противоположности'],
  },
  {
    id: 'ms-4-counting-10',
    skill: 'counting',
    title: 'Count to 10',
    titleRu: 'Счёт до 10',
    description: 'Counts objects up to 10',
    descriptionRu: 'Считает предметы до 10',
    ageGroup: 4,
    indicators: ['Counts to 10', 'Understands "how many"', 'Compares more/less'],
    indicatorsRu: ['Считает до 10', 'Понимает «сколько»', 'Сравнивает больше/меньше'],
  },
  {
    id: 'ms-4-patterns',
    skill: 'logical_thinking',
    title: 'Simple Patterns',
    titleRu: 'Простые паттерны',
    description: 'Recognizes and continues AB patterns',
    descriptionRu: 'Узнаёт и продолжает паттерны АБ',
    ageGroup: 4,
    indicators: ['Continues red-blue-red-?', 'Creates own pattern'],
    indicatorsRu: ['Продолжает красный-синий-красный-?', 'Создаёт свой паттерн'],
  },
  {
    id: 'ms-4-phonics',
    skill: 'phonological_awareness',
    title: 'First Sounds',
    titleRu: 'Первые звуки',
    description: 'Identifies first sound in words',
    descriptionRu: 'Определяет первый звук в слове',
    ageGroup: 4,
    indicators: ['Says first letter sound', 'Groups words by first sound'],
    indicatorsRu: ['Называет первый звук', 'Группирует слова по первому звуку'],
  },
  {
    id: 'ms-4-sentences',
    skill: 'expressive_language',
    title: 'Full Sentences',
    titleRu: 'Полные предложения',
    description: 'Speaks in 4-5 word sentences',
    descriptionRu: 'Говорит предложениями из 4-5 слов',
    ageGroup: 4,
    indicators: ['Tells short stories', 'Asks questions'],
    indicatorsRu: ['Рассказывает короткие истории', 'Задаёт вопросы'],
  },
  {
    id: 'ms-4-emotions-complex',
    skill: 'emotional_intelligence',
    title: 'Complex Emotions',
    titleRu: 'Сложные эмоции',
    description: 'Identifies surprise, fear, calm, excitement',
    descriptionRu: 'Различает удивление, страх, спокойствие, возбуждение',
    ageGroup: 4,
    indicators: ['Names 6+ emotions', 'Explains why someone feels an emotion'],
    indicatorsRu: ['Называет 6+ эмоций', 'Объясняет, почему кто-то чувствует эмоцию'],
  },
  {
    id: 'ms-4-spatial',
    skill: 'spatial_awareness',
    title: 'Spatial Words',
    titleRu: 'Пространственные слова',
    description: 'Understands above, below, inside, between',
    descriptionRu: 'Понимает над, под, внутри, между',
    ageGroup: 4,
    indicators: ['Uses spatial prepositions', 'Follows spatial instructions'],
    indicatorsRu: ['Использует предлоги места', 'Следует пространственным инструкциям'],
  },

  // === AGE 5 ===
  {
    id: 'ms-5-vocab-200',
    skill: 'vocabulary',
    title: 'Rich Vocabulary',
    titleRu: 'Богатый словарь',
    description: 'Uses 200+ words with understanding',
    descriptionRu: 'Использует 200+ слов с пониманием',
    ageGroup: 5,
    indicators: ['Uses descriptive words', 'Knows category words', 'Uses time words'],
    indicatorsRu: ['Использует описательные слова', 'Знает обобщающие слова', 'Использует слова времени'],
  },
  {
    id: 'ms-5-counting-20',
    skill: 'counting',
    title: 'Count to 20',
    titleRu: 'Счёт до 20',
    description: 'Counts and compares quantities to 20',
    descriptionRu: 'Считает и сравнивает количества до 20',
    ageGroup: 5,
    indicators: ['Counts to 20', 'Simple addition', 'Understands zero'],
    indicatorsRu: ['Считает до 20', 'Простое сложение', 'Понимает ноль'],
  },
  {
    id: 'ms-5-logic-sequences',
    skill: 'logical_thinking',
    title: 'Complex Sequences',
    titleRu: 'Сложные последовательности',
    description: 'Understands cause-effect and sequences',
    descriptionRu: 'Понимает причинно-следственные связи',
    ageGroup: 5,
    indicators: ['Orders events', 'Predicts what happens next', 'ABC patterns'],
    indicatorsRu: ['Упорядочивает события', 'Предсказывает продолжение', 'Паттерны АБВ'],
  },
  {
    id: 'ms-5-phonics-syllables',
    skill: 'phonological_awareness',
    title: 'Syllables & Rhymes',
    titleRu: 'Слоги и Рифмы',
    description: 'Claps syllables, identifies rhyming words',
    descriptionRu: 'Хлопает слоги, находит рифмы',
    ageGroup: 5,
    indicators: ['Claps syllables', 'Finds rhyming pairs', 'Blends sounds'],
    indicatorsRu: ['Хлопает по слогам', 'Находит рифмы', 'Сливает звуки'],
  },
  {
    id: 'ms-5-storytelling',
    skill: 'expressive_language',
    title: 'Storytelling',
    titleRu: 'Рассказывание',
    description: 'Retells stories and describes experiences',
    descriptionRu: 'Пересказывает истории и описывает события',
    ageGroup: 5,
    indicators: ['Retells 3-part story', 'Uses past tense', 'Describes events'],
    indicatorsRu: ['Пересказ из 3 частей', 'Использует прошедшее время', 'Описывает события'],
  },
  {
    id: 'ms-5-classification-complex',
    skill: 'classification',
    title: 'Multi-Criteria Sorting',
    titleRu: 'Сортировка по нескольким признакам',
    description: 'Sorts by color AND shape, multiple criteria',
    descriptionRu: 'Сортирует по цвету И форме одновременно',
    ageGroup: 5,
    indicators: ['Sorts by 2 criteria', 'Finds multiple differences', 'Groups by function'],
    indicatorsRu: ['Сортирует по 2 признакам', 'Находит несколько отличий', 'Группирует по функции'],
  },
];

export const getMilestonesForAge = (age: AgeGroup): DevelopmentalMilestone[] =>
  milestones.filter((m) => m.ageGroup === age);

export const getMilestonesBySkill = (skill: SkillDomain): DevelopmentalMilestone[] =>
  milestones.filter((m) => m.skill === skill);

/**
 * Learning objectives that map lessons to skills.
 * Each lesson should target 1-3 skill domains.
 */
export interface LearningObjective {
  lessonId: string;
  primarySkill: SkillDomain;
  secondarySkills: SkillDomain[];
  objectiveRu: string;
  successCriteria: string[];
  successCriteriaRu: string[];
  parentGuidanceRu: string;
}
