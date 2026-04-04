import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  SlideInDown,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { usePresetsStore } from '../store/usePresetsStore';
import { getPresetById } from '../data/imagePresets';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  presetId: string;
  onComplete: () => void;
  onExit: () => void;
}

export function PhotoSessionScreen({ presetId, onComplete, onExit }: Props) {
  const {
    activeSession,
    startSession,
    nextPrompt,
    previousPrompt,
    markPromptComplete,
    completeSession,
  } = usePresetsStore();

  const preset = getPresetById(presetId);

  // Animation shared values
  const cardOpacity = useSharedValue(1);
  const cardTranslateX = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Start session on mount if no active session
  useEffect(() => {
    if (!activeSession) {
      startSession(presetId);
    }
  }, []);

  // Animate progress bar when index changes
  useEffect(() => {
    if (!activeSession || !preset) return;
    const progress = (activeSession.completedPromptIds.length) / preset.prompts.length;
    progressWidth.value = withTiming(progress, {
      duration: 400,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [activeSession?.completedPromptIds.length, preset?.prompts.length]);

  const animateCardTransition = useCallback((direction: 'next' | 'prev') => {
    const exitX = direction === 'next' ? -SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.3;
    const enterX = direction === 'next' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3;

    cardOpacity.value = withTiming(0, { duration: 150 });
    cardTranslateX.value = withTiming(exitX, { duration: 150 }, () => {
      cardTranslateX.value = enterX;
      cardOpacity.value = withTiming(1, { duration: 200 });
      cardTranslateX.value = withSpring(0, { damping: 18, stiffness: 200 });
    });
  }, []);

  const handleNext = useCallback(() => {
    if (!activeSession || !preset) return;
    const currentPrompt = preset.prompts[activeSession.currentPromptIndex];
    if (!currentPrompt) return;

    hapticTap();
    markPromptComplete(currentPrompt.id);
    animateCardTransition('next');
    nextPrompt();
  }, [activeSession, preset]);

  const handlePrevious = useCallback(() => {
    if (!activeSession || activeSession.currentPromptIndex <= 0) return;
    hapticTap();
    animateCardTransition('prev');
    previousPrompt();
  }, [activeSession]);

  const handleFinish = useCallback(() => {
    if (!activeSession || !preset) return;
    const currentPrompt = preset.prompts[activeSession.currentPromptIndex];
    if (currentPrompt) {
      markPromptComplete(currentPrompt.id);
    }
    hapticSuccess();
    completeSession();
  }, [activeSession, preset]);

  const handleExit = useCallback(() => {
    hapticTap();
    onExit();
  }, [onExit]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  if (!preset) return null;

  const accentColor = preset.accentColor;

  // Completion state: session was just completed (activeSession is null after completeSession)
  if (!activeSession) {
    const completedCount = preset.prompts.length;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Animated.Text
            entering={FadeIn.delay(200).springify()}
            style={styles.completionEmoji}
          >
            {'\u2705'}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(400)}
            style={styles.completionTitle}
          >
            {'Сессия завершена!'}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(600)}
            style={styles.completionSubtitle}
          >
            {`Создано ${completedCount} фото`}
          </Animated.Text>

          <Animated.View
            entering={SlideInDown.delay(800).springify()}
            style={styles.completionButtonWrapper}
          >
            <TouchableOpacity
              onPress={() => { hapticTap(); onComplete(); }}
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{'Готово'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = activeSession.currentPromptIndex;
  const currentPrompt = preset.prompts[currentIndex];
  const totalPrompts = preset.prompts.length;
  const isLastPrompt = currentIndex === totalPrompts - 1;
  const isFirstPrompt = currentIndex === 0;

  if (!currentPrompt) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleExit}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.closeIcon}>{'\u2715'}</Text>
        </TouchableOpacity>

        <Text style={styles.presetName} numberOfLines={1}>
          {preset.nameRu}
        </Text>

        <Text style={styles.progressIndicator}>
          {`${currentIndex + 1}/${totalPrompts} фото`}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { backgroundColor: accentColor },
            progressAnimatedStyle,
          ]}
        />
      </View>

      {/* Main Card Area */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[styles.promptCard, cardAnimatedStyle]}
        >
          {/* Accent top border */}
          <View style={[styles.cardAccentBorder, { backgroundColor: accentColor }]} />

          <View style={styles.cardContent}>
            {/* Prompt text */}
            <Text style={styles.promptText}>
              {currentPrompt.promptRu}
            </Text>

            {/* Pose hint */}
            {currentPrompt.poseHintRu ? (
              <Text style={styles.poseHintText}>
                {currentPrompt.poseHintRu}
              </Text>
            ) : null}

            {/* Style tags */}
            {currentPrompt.styleTags.length > 0 && (
              <View style={styles.tagsContainer}>
                {currentPrompt.styleTags.map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tagPill, { backgroundColor: accentColor + '18' }]}
                  >
                    <Text style={[styles.tagText, { color: accentColor }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {!isFirstPrompt ? (
          <TouchableOpacity
            onPress={handlePrevious}
            style={styles.navButtonSecondary}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonSecondaryText}>
              {'\u2190 Назад'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}

        {isLastPrompt ? (
          <TouchableOpacity
            onPress={handleFinish}
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {'Готово \u2713'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {'Далее \u2192'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  presetName: {
    ...Typography.headingS,
    flex: 1,
    textAlign: 'center',
  },
  progressIndicator: {
    ...Typography.bodyS,
    color: Colors.textLight,
    minWidth: 64,
    textAlign: 'right',
  },

  // Progress Bar
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.warmGray,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // Card Area
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  promptCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  cardAccentBorder: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  promptText: {
    ...Typography.headingM,
    lineHeight: 32,
    textAlign: 'center',
  },
  poseHintText: {
    ...Typography.bodyM,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tagPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  navButtonSecondary: {
    height: 56,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonSecondaryText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  navButtonPlaceholder: {
    height: 56,
    width: 100,
  },
  primaryButton: {
    height: 56,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 200,
    ...Shadows.button,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.white,
  },

  // Completion State
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  completionEmoji: {
    fontSize: 80,
    marginBottom: Spacing.xl,
  },
  completionTitle: {
    ...Typography.headingXL,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  completionSubtitle: {
    ...Typography.bodyL,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  completionButtonWrapper: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
});
