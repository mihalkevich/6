/**
 * OnboardingScreen — Animated 8-step onboarding
 *
 * Features:
 * - Animated transitions between steps (slide + fade)
 * - 3D DuoButton cards for selections with haptic
 * - Bouncing emoji on welcome
 * - Staggered entrance for options
 * - Animated progress bar (not just dots)
 * - Confetti on final step
 * - Haptic on every selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { DuoButton, AnimatedProgressBar, CelebrationOverlay } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { hapticTap, hapticPress, hapticSelection, hapticHeavy, hapticCelebration } from '../utils/haptics';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import type { AgeGroup, DevelopmentGoal, FocusArea } from '../types';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TOTAL_STEPS = 8;

const avatarOptions = ['🧒', '👦', '👧', '🧒🏻', '👦🏽', '👧🏼', '🐻', '🦊', '🐰', '🦁', '🐼', '🦄'];

const goalOptions: { id: DevelopmentGoal; emoji: string; label: string }[] = [
  { id: 'speech', emoji: '🗣️', label: 'Речь' },
  { id: 'vocabulary', emoji: '📚', label: 'Словарный запас' },
  { id: 'logic', emoji: '🧩', label: 'Логика' },
  { id: 'attention', emoji: '👀', label: 'Внимание' },
  { id: 'memory', emoji: '🧠', label: 'Память' },
  { id: 'parent_activities', emoji: '👨‍👧', label: 'Вместе с родителем' },
];

const focusOptions: { id: FocusArea; emoji: string; label: string }[] = [
  { id: 'words', emoji: '💬', label: 'Слова' },
  { id: 'speech', emoji: '🗣️', label: 'Речь' },
  { id: 'logic', emoji: '🧩', label: 'Логика' },
  { id: 'attention', emoji: '👁️', label: 'Внимание' },
  { id: 'parent_tasks', emoji: '👨‍👧', label: 'Задания с родителем' },
];

// === 3D Option Card ===
function OptionCard3D({
  emoji,
  label,
  selected,
  onPress,
  index,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(0);
  const DEPTH = 4;

  useEffect(() => {
    scale.value = withDelay(
      index * 60,
      withSpring(1, { damping: 12, stiffness: 250, mass: 0.5 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, DEPTH - 1]) },
    ],
    borderBottomWidth: interpolate(pressed.value, [0, 1], [DEPTH, 1]),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = withTiming(1, { duration: 60 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 400 }); }}
      onPress={() => { hapticTap(); onPress(); }}
      style={[
        styles.optionCard,
        selected ? styles.optionCardSelected : styles.optionCardDefault,
        style,
      ]}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={[
        styles.optionLabel,
        selected && styles.optionLabelSelected,
      ]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// === Age Card ===
function AgeCard3D({
  age,
  label,
  selected,
  onPress,
  index,
}: {
  age: number;
  label: string;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(0);
  const DEPTH = 5;

  useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 10, stiffness: 200, mass: 0.5 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(pressed.value, [0, 1], [0, DEPTH - 1]) },
    ],
    borderBottomWidth: interpolate(pressed.value, [0, 1], [DEPTH, 1]),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = withTiming(1, { duration: 60 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 400 }); }}
      onPress={() => { hapticPress(); onPress(); }}
      style={[
        styles.ageCard,
        selected ? styles.ageCardSelected : styles.ageCardDefault,
        style,
      ]}
    >
      <Text style={[styles.ageNumber, selected && { color: Colors.primary }]}>{age}</Text>
      <Text style={[styles.ageLabel, selected && { color: Colors.primary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

// === Avatar Option ===
function AvatarOption({
  emoji,
  selected,
  onPress,
  index,
}: {
  emoji: string;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 40,
      withSpring(1, { damping: 10, stiffness: 300 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={() => { hapticSelection(); onPress(); }}>
      <Animated.View
        style={[
          styles.avatarOption,
          selected && styles.avatarSelected,
          style,
        ]}
      >
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

// === Main Screen ===
export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const store = useAppStore();
  const [step, setStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Welcome emoji bounce
  const welcomeBounce = useSharedValue(0);

  useEffect(() => {
    welcomeBounce.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const welcomeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: welcomeBounce.value }],
  }));

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return true;
      case 2: return store.onboarding.childAge !== null;
      case 3: return store.onboarding.childName.trim().length > 0;
      case 4: return store.onboarding.goals.length > 0;
      case 5: return true;
      case 6: return store.onboarding.focusAreas.length > 0;
      case 7: return true;
      default: return true;
    }
  };

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS - 1) {
      hapticTap();
      setStep(step + 1);
    } else {
      // Final step — celebrate!
      hapticCelebration();
      setShowCelebration(true);

      // Request notification permissions
      const granted = await requestNotificationPermissions();
      if (granted) {
        scheduleDailyReminder(18, 0, store.onboarding.childName || 'малыш');
      }

      setTimeout(() => {
        store.completeOnboarding();
        onComplete();
      }, 2200);
    }
  }, [step, store, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      hapticTap();
      setStep(step - 1);
    }
  }, [step]);

  if (showCelebration) {
    return (
      <SafeAreaView style={styles.container}>
        <CelebrationOverlay
          type="lesson_complete"
          emoji="🚀"
          title={`Поехали, ${store.onboarding.childName}!`}
          subtitle="Твоя программа готова"
        />
      </SafeAreaView>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.centerContent}
          >
            <Animated.Text style={[styles.bigEmoji, welcomeStyle]}>🌟</Animated.Text>
            <Animated.Text entering={FadeIn.delay(200)} style={styles.title}>
              TIMSANICH
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(400)} style={styles.subtitle}>
              Kids Edu
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(600)} style={styles.description}>
              Ежедневная развивающая программа{'\n'}для вашего ребёнка
            </Animated.Text>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Text style={styles.bigEmoji}>📖</Text>
            <Text style={styles.title}>Как это работает</Text>
            <View style={styles.featureList}>
              {[
                { emoji: '🎯', text: 'Короткие уроки каждый день' },
                { emoji: '🗺️', text: 'Путь прогресса как в Duolingo' },
                { emoji: '🔄', text: 'Умное повторение материала' },
                { emoji: '⭐', text: 'Мягкая мотивация и награды' },
                { emoji: '📳', text: 'Тактильная обратная связь' },
                { emoji: '👨‍👧', text: 'Задания вместе с родителем' },
              ].map((item, i) => (
                <Animated.View
                  key={i}
                  entering={SlideInRight.delay(i * 80).springify()}
                  style={styles.featureRow}
                >
                  <View style={styles.featureEmojiCircle}>
                    <Text style={styles.featureEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={styles.featureText}>{item.text}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Text style={styles.bigEmoji}>🎂</Text>
            <Text style={styles.title}>Сколько лет ребёнку?</Text>
            <View style={styles.ageRow}>
              {([3, 4, 5] as AgeGroup[]).map((age, i) => (
                <AgeCard3D
                  key={age}
                  age={age}
                  label={age === 3 ? 'три' : age === 4 ? 'четыре' : 'пять'}
                  selected={store.onboarding.childAge === age}
                  onPress={() => store.setChildAge(age)}
                  index={i}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Animated.Text
              entering={FadeIn.delay(100).springify()}
              style={styles.bigEmoji}
            >
              {store.onboarding.avatarEmoji}
            </Animated.Text>
            <Text style={styles.title}>Как зовут ребёнка?</Text>
            <TextInput
              style={styles.nameInput}
              value={store.onboarding.childName}
              onChangeText={store.setChildName}
              placeholder="Имя"
              placeholderTextColor={Colors.textLight}
              autoFocus
              maxLength={20}
            />
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Выберите аватар</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.map((emoji, i) => (
                <AvatarOption
                  key={emoji}
                  emoji={emoji}
                  selected={store.onboarding.avatarEmoji === emoji}
                  onPress={() => store.setAvatarEmoji(emoji)}
                  index={i}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Text style={styles.bigEmoji}>🎯</Text>
            <Text style={styles.title}>Цели развития</Text>
            <Text style={styles.description}>Выберите одну или несколько</Text>
            <View style={styles.optionGrid}>
              {goalOptions.map((goal, i) => (
                <OptionCard3D
                  key={goal.id}
                  emoji={goal.emoji}
                  label={goal.label}
                  selected={store.onboarding.goals.includes(goal.id)}
                  onPress={() => store.toggleGoal(goal.id)}
                  index={i}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Text style={styles.bigEmoji}>⏰</Text>
            <Text style={styles.title}>Сколько минут в день?</Text>
            <Text style={styles.description}>Мы подберём количество уроков</Text>
            <View style={styles.minuteRow}>
              {([5, 10, 15] as const).map((min, i) => (
                <AgeCard3D
                  key={min}
                  age={min}
                  label="мин"
                  selected={store.onboarding.dailyMinutes === min}
                  onPress={() => store.setDailyMinutes(min)}
                  index={i}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 6:
        return (
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={styles.centerContent}
          >
            <Text style={styles.bigEmoji}>📋</Text>
            <Text style={styles.title}>На чём сделать акцент?</Text>
            <Text style={styles.description}>Выберите одну или несколько областей</Text>
            <View style={styles.optionGrid}>
              {focusOptions.map((area, i) => (
                <OptionCard3D
                  key={area.id}
                  emoji={area.emoji}
                  label={area.label}
                  selected={store.onboarding.focusAreas.includes(area.id)}
                  onPress={() => store.toggleFocusArea(area.id)}
                  index={i}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 7:
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.centerContent}
          >
            <Animated.Text
              entering={FadeIn.delay(100).springify()}
              style={styles.bigEmoji}
            >
              ✨
            </Animated.Text>
            <Text style={styles.title}>Всё готово!</Text>
            <Text style={styles.description}>
              Мы создали программу для {store.onboarding.childName || 'вашего ребёнка'}
            </Text>
            <Animated.View
              entering={FadeIn.delay(300).springify()}
              style={styles.summaryCard}
            >
              {[
                `🧒 ${store.onboarding.childName}, ${store.onboarding.childAge} года`,
                `⏰ ${store.onboarding.dailyMinutes} минут в день`,
                `🎯 ${store.onboarding.goals.length} целей развития`,
                `📋 ${store.onboarding.focusAreas.length} областей фокуса`,
                `📳 Тактильная обратная связь`,
                `🔔 Ежедневные напоминания`,
              ].map((text, i) => (
                <Animated.Text
                  key={i}
                  entering={SlideInRight.delay(400 + i * 80).springify()}
                  style={styles.summaryRow}
                >
                  {text}
                </Animated.Text>
              ))}
            </Animated.View>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated progress bar */}
      <View style={styles.progressContainer}>
        <AnimatedProgressBar
          progress={(step + 1) / TOTAL_STEPS}
          height={6}
          color={Colors.primary}
          backgroundColor={Colors.primaryLight}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Назад</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
        <View style={{ flex: 1 }} />
        <DuoButton
          title={step === TOTAL_STEPS - 1 ? 'Начать!' : 'Далее'}
          onPress={handleNext}
          disabled={!canProceed()}
          size="medium"
          variant="primary"
          heavy={step === TOTAL_STEPS - 1}
          emoji={step === TOTAL_STEPS - 1 ? '🚀' : undefined}
          style={{ minWidth: 140 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headingXL,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.headingM,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.bodyM,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  // Features
  featureList: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureEmojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    ...Typography.bodyL,
    flex: 1,
  },
  // Age cards
  ageRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  ageCard: {
    width: 96,
    height: 106,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  ageCardDefault: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderBottomColor: '#D1D5DB',
  },
  ageCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderBottomColor: '#3D8BCB',
  },
  ageNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ageLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  // Name input
  nameInput: {
    width: '100%',
    maxWidth: 300,
    height: 56,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    ...Typography.headingM,
    textAlign: 'center',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  sectionLabel: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  // Avatar
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    maxWidth: 300,
  },
  avatarOption: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  avatarSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderBottomColor: '#3D8BCB',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  // Options
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  optionCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  optionCardDefault: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderBottomColor: '#D1D5DB',
  },
  optionCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderBottomColor: '#3D8BCB',
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    ...Typography.bodyS,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  // Minutes (reuses ageRow/ageCard)
  minuteRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  // Summary
  summaryCard: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 320,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  summaryRow: {
    ...Typography.bodyL,
    fontSize: 16,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  backText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
});
