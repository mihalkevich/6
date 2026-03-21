import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { Colors, Spacing, Shadows } from './src/constants/theme';

type Tab = 'home' | 'path' | 'progress' | 'profile';

const tabs: { id: Tab; emoji: string; label: string }[] = [
  { id: 'home', emoji: '🏠', label: 'Главная' },
  { id: 'path', emoji: '🗺️', label: 'Путь' },
  { id: 'progress', emoji: '📊', label: 'Прогресс' },
  { id: 'profile', emoji: '👤', label: 'Профиль' },
];

export default function App() {
  const { child } = useAppStore();
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

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {renderScreen()}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabEmoji, isActive && styles.tabEmojiActive]}>
                  {tab.emoji}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
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
    paddingTop: Spacing.sm,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.elevated,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
    paddingVertical: Spacing.xxs,
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
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    top: -Spacing.sm,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },
});
