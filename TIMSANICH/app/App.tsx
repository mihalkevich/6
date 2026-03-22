/**
 * App — Main entry with animated tab bar
 *
 * Features:
 * - Bouncing tab icons on press with haptic
 * - Animated active indicator sliding between tabs
 * - Badge count on progress tab
 * - Smooth transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  OnboardingScreen,
  HomeScreen,
  PathScreen,
  LessonScreen,
  ProgressScreen,
  ProfileScreen,
} from './src/screens';
import { useAppStore } from './src/store/useAppStore';
import { Colors, Spacing, Shadows, Radius } from './src/constants/theme';
import { hapticSelection, hapticTap } from './src/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Tab = 'home' | 'path' | 'progress' | 'profile';

const tabs: { id: Tab; emoji: string; label: string }[] = [
  { id: 'home', emoji: '🏠', label: 'Главная' },
  { id: 'path', emoji: '🗺️', label: 'Путь' },
  { id: 'progress', emoji: '📊', label: 'Прогресс' },
  { id: 'profile', emoji: '👤', label: 'Профиль' },
];

// === Tab Bar Item ===
function TabItem({
  tab,
  isActive,
  onPress,
  badge,
}: {
  tab: { id: Tab; emoji: string; label: string };
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}) {
  const scale = useSharedValue(1);
  const bounce = useSharedValue(0);

  const handlePress = useCallback(() => {
    hapticSelection();
    // Bounce animation
    scale.value = withSequence(
      withTiming(0.85, { duration: 60 }),
      withSpring(1, { damping: 10, stiffness: 400, mass: 0.3 })
    );
    bounce.value = withSequence(
      withTiming(-4, { duration: 80 }),
      withSpring(0, { damping: 10, stiffness: 300 })
    );
    onPress();
  }, [onPress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: bounce.value },
    ],
  }));

  return (
    <AnimatedPressable
      style={[styles.tabItem, animStyle]}
      onPress={handlePress}
    >
      {/* Active background pill */}
      {isActive && <View style={styles.tabActiveBg} />}

      <Text style={[styles.tabEmoji, isActive && styles.tabEmojiActive]}>
        {tab.emoji}
      </Text>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>

      {/* Badge */}
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export default function App() {
  const { child, rewards } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Show onboarding if not completed
  if (!onboardingDone && !child) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      </SafeAreaProvider>
    );
  }

  // Show lesson if active
  if (activeLessonId) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LessonScreen
          lessonId={activeLessonId}
          onComplete={() => setActiveLessonId(null)}
          onExit={() => setActiveLessonId(null)}
        />
      </SafeAreaProvider>
    );
  }

  const handleStartLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onStartLesson={handleStartLesson} />;
      case 'path':
        return <PathScreen onStartLesson={handleStartLesson} />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen />;
    }
  };

  // Badge count for new rewards (simple — show count if > 0)
  const rewardsBadge = rewards.length > 0 ? rewards.length : undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {renderScreen()}

        {/* Animated Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
              badge={tab.id === 'progress' ? rewardsBadge : undefined}
            />
          ))}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingBottom: 24,
    paddingTop: Spacing.xs,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.elevated,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
    paddingVertical: Spacing.xs,
  },
  tabActiveBg: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textLight,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: '25%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
