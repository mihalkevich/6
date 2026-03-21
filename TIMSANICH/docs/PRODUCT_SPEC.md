# TIMSANICH Kids Edu — Product Specification

## 1. Product Vision

**One-liner:** Duolingo-style daily learning app for kids aged 3–5, helping parents build a consistent educational routine through short, beautiful, game-like lessons.

**Core Value Proposition:**
- For **parents**: A structured daily development program that removes guesswork — open the app, and your child's lesson is ready.
- For **kids**: Fun, short, rewarding micro-lessons that feel like play, not school.

**JTBD (Jobs To Be Done):**
1. "I want my child to learn new words and concepts every day without me having to plan activities."
2. "I want a safe, beautiful app that doesn't overstimulate my child."
3. "I want to see what my child is learning and track their progress."
4. "I want my child to build a daily learning habit early."

**Why This Works:**
- Parents are desperate for structured screen time that's actually educational
- Duolingo proved that short daily habits + progression = massive retention
- The 3–5 age gap is underserved by premium edtech — most apps are either too gamey or too boring
- Subscription model proven in this category (Lingokids, Khan Academy Kids, Homer)

---

## 2. Product Spec — MVP

### Functional Blocks

| Block | Description |
|-------|-------------|
| Onboarding | Parent creates child profile, selects age/goals/intensity |
| Home | Daily lessons, streak, progress summary, CTA |
| Learning Path | Duolingo-style node map showing progression |
| Lessons | 6+ lesson types, 1–3 min each |
| Daily Engine | Generates daily plan based on age, progress, repetition |
| Progress | Stats, streaks, weekly overview |
| Profile | Child info, goals, settings |
| Rewards | Stars, badges, gentle achievements |

### Key User Scenarios

1. **First Launch**: Parent onboards → creates child → selects goals → sees personalized home
2. **Daily Session**: Open app → see today's lessons → child completes 3–5 tasks → celebration → done
3. **Progress Check**: Parent opens progress → sees weekly stats → understands what child learned
4. **Repeat Visit**: App shows streak → motivates continuation → daily habit forms

### Lesson Types (MVP)

| Type | Description | Example |
|------|-------------|---------|
| `image_choice` | Pick correct image from 4 options | "Where is the cat?" |
| `word_repeat` | Show word + image, child taps to confirm | "This is an apple" |
| `match_pair` | Connect word to image | Draw line from "dog" to 🐕 |
| `find_odd` | Find the item that doesn't belong | 3 fruits + 1 car |
| `emotion_pick` | Identify the emotion | "Who is happy?" |
| `sequence` | Put items in order | small → medium → large |
| `memory_cards` | Flip and match pairs | Classic memory game |
| `parent_task` | Activity to do together offline | "Ask your child to name 3 animals" |

### Retention Loop

```
Day 1: Fresh content → small wins → streak starts
Day 2: Streak reminder → new + review → streak grows
Day 3+: Habit forming → unlock new path nodes → social proof for parent
Day 7: Weekly summary → badge → parent sees value
```

### Post-MVP Roadmap
- Audio/speech recognition lessons
- Multiple children per account
- Backend + real content engine
- Push notifications
- Parent analytics dashboard
- Additional age tracks (2+, 6+)
- Multilingual support
- Premium subscription paywall

---

## 3. UX Architecture

### Screen Map

```
App Launch
├── Onboarding (8 steps)
│   ├── Welcome
│   ├── App Description
│   ├── Child Age Selection (3/4/5)
│   ├── Child Name Input
│   ├── Development Goals Selection
│   ├── Daily Time Commitment
│   ├── Focus Areas Selection
│   └── Program Generation (animated)
│
├── Main App (Tab Navigation)
│   ├── Home Tab
│   │   ├── Greeting + Child Name
│   │   ├── Daily Goal Progress
│   │   ├── Today's Lessons List
│   │   ├── Start CTA Button
│   │   └── Parent Tip Card
│   │
│   ├── Path Tab
│   │   └── Duolingo-style Node Map
│   │       ├── Completed Nodes (filled)
│   │       ├── Current Node (pulsing)
│   │       ├── Locked Nodes (greyed)
│   │       └── Theme Section Headers
│   │
│   ├── Progress Tab
│   │   ├── Streak Counter
│   │   ├── Weekly Overview
│   │   ├── Skills Breakdown
│   │   ├── Lessons Completed
│   │   └── Areas to Review
│   │
│   └── Profile Tab
│       ├── Child Info
│       ├── Goals
│       ├── Achievements/Badges
│       ├── Settings
│       └── Subscription Status
│
├── Lesson Flow (Modal/Stack)
│   ├── Lesson Intro Screen
│   ├── Exercise Screens (1–5 steps)
│   ├── Lesson Complete Screen
│   │   ├── Stars Earned
│   │   ├── What We Learned
│   │   ├── Continue / Exit
│   │   └── Daily Progress Update
│   └── Daily Goal Complete Screen
│
└── Reward Moments
    ├── Star Animation
    ├── Badge Unlock
    ├── Streak Milestone
    └── Level Up
```

### States

| State | Visual |
|-------|--------|
| Loading | Soft pulsing skeleton |
| Empty | Friendly illustration + message |
| Completed | Checkmark + green accent |
| Locked | Greyed out + lock icon |
| In Progress | Blue accent + progress ring |
| Error | Warm amber + retry |

---

## 4. UI System

### Colors

```
Primary Blue:     #4A9FE5 (main actions, path nodes, headers)
Primary Light:    #E8F3FC (backgrounds, cards)
White:            #FFFFFF (base)
Cream:            #FBF9F6 (warm backgrounds)
Warm Gray:        #F5F2EF (secondary backgrounds)
Text Primary:     #2D3142 (headings)
Text Secondary:   #6B7280 (body text)
Success Green:    #6BCB77 (completed states)
Success Light:    #E8F8EA
Warning Amber:    #F5B461 (needs review)
Warning Light:    #FFF4E3
Locked Gray:      #D1D5DB
Reward Gold:      #FFD700
```

### Typography

```
Heading XL:  32px / Bold / -0.5 tracking
Heading L:   26px / Bold
Heading M:   22px / SemiBold
Body L:      18px / Regular
Body M:      16px / Regular
Body S:      14px / Regular
Caption:     12px / Medium
Button:      18px / SemiBold
```

### Spacing Scale
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Component Principles
- Border radius: 16–24px (cards), 12px (buttons), full (avatars)
- Shadows: `0 2px 8px rgba(0,0,0,0.06)` (cards), `0 4px 16px rgba(0,0,0,0.08)` (elevated)
- Touch targets: minimum 48x48px, preferred 56x56px
- Cards: white background, 20px radius, subtle shadow, 20px padding
- Buttons: 56px height, full-width primary, 16px radius

### Motion Principles
- Micro-interactions: 200ms ease-out
- Screen transitions: 300ms ease-in-out
- Celebrations: 600ms with spring physics
- Progress fills: 400ms ease-out

---

## 5. Data Model

```
Parent
├── id: string
├── email: string
├── children: Child[]
└── subscription: SubscriptionStatus

Child
├── id: string
├── name: string
├── age: 3 | 4 | 5
├── avatarId: string
├── goals: DevelopmentGoal[]
├── dailyMinutes: 5 | 10 | 15
├── focusAreas: FocusArea[]
├── createdAt: Date
├── streak: Streak
├── progress: Progress
├── rewards: Reward[]
└── dailyPlans: DailyPlan[]

DevelopmentGoal (enum)
├── speech
├── vocabulary
├── logic
├── attention
├── memory
└── parent_activities

FocusArea (enum)
├── words
├── speech
├── logic
├── attention
└── parent_tasks

Category
├── id: string
├── name: string
├── icon: string
├── color: string
├── ageRange: [3,4,5]
└── lessons: Lesson[]

Lesson
├── id: string
├── categoryId: string
├── title: string
├── description: string
├── ageMin: number
├── ageMax: number
├── difficulty: 1-5
├── durationMinutes: number
├── type: LessonType
├── units: LessonUnit[]
├── requiredLessonIds: string[]
└── xpReward: number

LessonUnit (single exercise step)
├── id: string
├── type: ExerciseType
├── question: string
├── image?: string
├── options: Option[]
├── correctAnswer: string | string[]
├── hint?: string
└── parentNote?: string

DailyPlan
├── id: string
├── childId: string
├── date: string (YYYY-MM-DD)
├── lessons: PlannedLesson[]
├── reviewItems: ReviewItem[]
├── completed: boolean
├── parentTip: string
└── summary: string

PlannedLesson
├── lessonId: string
├── status: 'pending' | 'in_progress' | 'completed'
├── score: number
└── completedAt?: Date

Progress
├── totalLessons: number
├── totalXP: number
├── skillLevels: Map<Category, number>
├── completedLessonIds: string[]
├── currentPathPosition: number
└── weeklyStats: WeeklyStats[]

Streak
├── currentDays: number
├── longestDays: number
├── lastActiveDate: string
└── milestones: number[]

Reward
├── id: string
├── type: 'star' | 'badge' | 'milestone'
├── name: string
├── icon: string
├── earnedAt: Date
└── description: string

ReviewQueue
├── childId: string
├── items: ReviewItem[]
└── nextReviewDate: string

ReviewItem
├── lessonUnitId: string
├── lastReviewed: Date
├── correctCount: number
├── nextReview: Date
└── interval: number (days, spaced repetition)
```

---

## 6. Content Structure

### Categories & Lessons (50+ lessons)

**Category 1: Animals (Животные)** — 8 lessons
**Category 2: Food (Еда)** — 6 lessons
**Category 3: Home Objects (Предметы дома)** — 6 lessons
**Category 4: Colors (Цвета)** — 6 lessons
**Category 5: Shapes (Формы)** — 4 lessons
**Category 6: Emotions (Эмоции)** — 5 lessons
**Category 7: Big & Small (Сравнения)** — 5 lessons
**Category 8: Logic (Логика)** — 5 lessons
**Category 9: Memory (Память)** — 4 lessons
**Category 10: Speech (Речь)** — 5 lessons
**Category 11: Transport (Транспорт)** — 4 lessons

**Total: 58 lessons across 11 categories, 3 age levels**

### Daily Plan Template
- 1 main lesson (new content, 2–3 min)
- 2 mini-tasks (review, 1 min each)
- 1 review block (spaced repetition)
- 1 parent activity suggestion

### Repetition Logic (Simplified Spaced Repetition)
- New word → review next day → review day 3 → review day 7 → review day 14
- If incorrect → reset interval to 1 day
- Mix 70% known + 30% new in daily plans

---

## 7. Monetization — Freemium Model

| Feature | Free | Premium |
|---------|------|---------|
| Daily lessons | 2/day | Unlimited |
| Learning path | First section | Full path |
| Categories | 4 basic | All 11+ |
| Progress tracking | Basic | Detailed analytics |
| Age tracks | Current age | All ages |
| Parent insights | Summary | Full weekly reports |
| Review system | Basic | Smart spaced repetition |
| Rewards | Stars only | Stars + badges + collections |

**Pricing direction:** $4.99/month or $29.99/year

---

## 8. Tech Stack

**React Native + Expo + TypeScript**

- **Expo SDK 52+** — managed workflow for fast iteration
- **Expo Router** — file-based navigation
- **React Native Reanimated** — premium animations
- **AsyncStorage** — local data persistence (MVP)
- **Zustand** — lightweight state management
- **date-fns** — date utilities
- **expo-haptics** — tactile feedback

No backend for MVP — all data local + mock content engine.
