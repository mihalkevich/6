import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Button, EmojiCircle } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { AgeGroup, DevelopmentGoal, FocusArea } from '../types';

const { width } = Dimensions.get('window');

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

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const store = useAppStore();
  const [step, setStep] = useState(0);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return true; // About
      case 2: return store.onboarding.childAge !== null;
      case 3: return store.onboarding.childName.trim().length > 0;
      case 4: return store.onboarding.goals.length > 0;
      case 5: return true; // Daily minutes always has default
      case 6: return store.onboarding.focusAreas.length > 0;
      case 7: return true; // Generate
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      store.completeOnboarding();
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🌟</Text>
            <Text style={styles.title}>TIMSANICH</Text>
            <Text style={styles.subtitle}>Kids Edu</Text>
            <Text style={styles.description}>
              Ежедневная развивающая программа{'\n'}для вашего ребёнка
            </Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>📖</Text>
            <Text style={styles.title}>Как это работает</Text>
            <View style={styles.featureList}>
              {[
                { emoji: '🎯', text: 'Короткие уроки каждый день' },
                { emoji: '🗺️', text: 'Путь прогресса как в Duolingo' },
                { emoji: '🔄', text: 'Умное повторение материала' },
                { emoji: '⭐', text: 'Мягкая мотивация и награды' },
                { emoji: '👨‍👧', text: 'Задания вместе с родителем' },
              ].map((item, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureEmoji}>{item.emoji}</Text>
                  <Text style={styles.featureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🎂</Text>
            <Text style={styles.title}>Сколько лет ребёнку?</Text>
            <View style={styles.ageRow}>
              {([3, 4, 5] as AgeGroup[]).map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.ageCard,
                    store.onboarding.childAge === age && styles.ageCardSelected,
                  ]}
                  onPress={() => store.setChildAge(age)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ageNumber}>{age}</Text>
                  <Text style={styles.ageLabel}>{age === 3 ? 'три' : age === 4 ? 'четыре' : 'пять'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>{store.onboarding.avatarEmoji}</Text>
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
              {avatarOptions.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.avatarOption,
                    store.onboarding.avatarEmoji === emoji && styles.avatarSelected,
                  ]}
                  onPress={() => store.setAvatarEmoji(emoji)}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🎯</Text>
            <Text style={styles.title}>Цели развития</Text>
            <Text style={styles.description}>Выберите одну или несколько</Text>
            <View style={styles.optionGrid}>
              {goalOptions.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.optionCard,
                    store.onboarding.goals.includes(goal.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => store.toggleGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{goal.emoji}</Text>
                  <Text style={[
                    styles.optionLabel,
                    store.onboarding.goals.includes(goal.id) && styles.optionLabelSelected,
                  ]}>
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>⏰</Text>
            <Text style={styles.title}>Сколько минут в день?</Text>
            <Text style={styles.description}>Мы подберём количество уроков</Text>
            <View style={styles.minuteRow}>
              {([5, 10, 15] as const).map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.minuteCard,
                    store.onboarding.dailyMinutes === min && styles.minuteCardSelected,
                  ]}
                  onPress={() => store.setDailyMinutes(min)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.minuteNumber,
                    store.onboarding.dailyMinutes === min && styles.minuteNumberSelected,
                  ]}>
                    {min}
                  </Text>
                  <Text style={[
                    styles.minuteLabel,
                    store.onboarding.dailyMinutes === min && styles.minuteLabelSelected,
                  ]}>
                    мин
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>📋</Text>
            <Text style={styles.title}>На чём сделать акцент?</Text>
            <Text style={styles.description}>Выберите одну или несколько областей</Text>
            <View style={styles.optionGrid}>
              {focusOptions.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.optionCard,
                    store.onboarding.focusAreas.includes(area.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => store.toggleFocusArea(area.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{area.emoji}</Text>
                  <Text style={[
                    styles.optionLabel,
                    store.onboarding.focusAreas.includes(area.id) && styles.optionLabelSelected,
                  ]}>
                    {area.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>✨</Text>
            <Text style={styles.title}>Всё готово!</Text>
            <Text style={styles.description}>
              Мы создали программу для {store.onboarding.childName || 'вашего ребёнка'}
            </Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryRow}>
                🧒 {store.onboarding.childName}, {store.onboarding.childAge} года
              </Text>
              <Text style={styles.summaryRow}>
                ⏰ {store.onboarding.dailyMinutes} минут в день
              </Text>
              <Text style={styles.summaryRow}>
                🎯 {store.onboarding.goals.length} целей развития
              </Text>
              <Text style={styles.summaryRow}>
                📋 {store.onboarding.focusAreas.length} областей фокуса
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= step ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>Назад</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <Button
          title={step === TOTAL_STEPS - 1 ? 'Начать!' : 'Далее'}
          onPress={handleNext}
          disabled={!canProceed()}
          size="medium"
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.lockedGrayLight,
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
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  featureText: {
    ...Typography.bodyL,
    flex: 1,
  },
  ageRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  ageCard: {
    width: 90,
    height: 100,
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ageCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
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
  },
  sectionLabel: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    maxWidth: 300,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  avatarEmoji: {
    fontSize: 28,
  },
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
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    ...Typography.bodyS,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  minuteCard: {
    width: 90,
    height: 100,
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  minuteCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  minuteNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  minuteNumberSelected: {
    color: Colors.primary,
  },
  minuteLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  minuteLabelSelected: {
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  summaryRow: {
    ...Typography.bodyL,
    fontSize: 16,
  },
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
