/**
 * ProfileScreen — Enhanced with animations, haptics, notification settings
 *
 * Features:
 * - Animated profile header with bouncing avatar
 * - 3D stat cards with haptic press
 * - Notification toggle with haptic
 * - Animated achievement badges
 * - Settings with 3D touch feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Switch,
  Alert,
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
  SlideInRight,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { EmojiCircle, DuoButton } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { hapticTap, hapticPress, hapticSelection, hapticCelebration, hapticReward } from '../utils/haptics';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminders,
  getScheduledCount,
} from '../utils/notifications';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const goalLabels: Record<string, string> = {
  speech: '🗣️ Речь',
  vocabulary: '📚 Словарный запас',
  logic: '🧩 Логика',
  attention: '👀 Внимание',
  memory: '🧠 Память',
  parent_activities: '👨‍👧 Вместе с родителем',
};

const focusLabels: Record<string, string> = {
  words: '💬 Слова',
  speech: '🗣️ Речь',
  logic: '🧩 Логика',
  attention: '👁️ Внимание',
  parent_tasks: '👨‍👧 Задания с родителем',
};

// === 3D Setting Row ===
function SettingRow3D({
  label,
  value,
  onPress,
  index,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  index: number;
}) {
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pressed.value, [0, 1], [0, 2]) },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { if (onPress) pressed.value = withTiming(1, { duration: 60 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 400 }); }}
      onPress={() => { if (onPress) { hapticTap(); onPress(); } }}
      style={[styles.settingRow, style]}
    >
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </AnimatedPressable>
  );
}

// === Achievement Badge ===
function AchievementBadge({
  emoji,
  name,
  description,
  index,
}: {
  emoji: string;
  name: string;
  description: string;
  index: number;
}) {
  const scale = useSharedValue(0);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withSpring(1, { damping: 8, stiffness: 250, mass: 0.5 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        setShowDetail(!showDetail);
      }}
    >
      <Animated.View style={[styles.achievementItem, style]}>
        <View style={styles.achievementCircle}>
          <Text style={styles.achievementEmoji}>{emoji}</Text>
        </View>
        {showDetail && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.achievementTooltip}
          >
            <Text style={styles.achievementTooltipTitle}>{name}</Text>
            <Text style={styles.achievementTooltipDesc}>{description}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { child, streak, progress, rewards, resetProgress, resetAll } = useAppStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Animated avatar
  const avatarScale = useSharedValue(0);
  const avatarPulse = useSharedValue(1);

  useEffect(() => {
    avatarScale.value = withSpring(1, { damping: 10, stiffness: 200, mass: 0.5 });

    // Check notification status
    getScheduledCount().then((count) => setNotificationsEnabled(count > 0));
  }, []);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    hapticSelection();
    setNotificationsEnabled(value);

    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted && child) {
        await scheduleDailyReminder(18, 0, child.name);
      } else if (!granted) {
        setNotificationsEnabled(false);
        Alert.alert(
          'Уведомления отключены',
          'Включите уведомления в настройках устройства',
        );
      }
    } else {
      await cancelDailyReminders();
    }
  }, [child]);

  const handleAvatarPress = useCallback(() => {
    hapticReward();
    avatarScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
  }, []);

  if (!child) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable onPress={handleAvatarPress}>
            <Animated.View style={avatarStyle}>
              <EmojiCircle
                emoji={child.avatarEmoji}
                size={100}
                backgroundColor={Colors.primaryLight}
              />
            </Animated.View>
          </Pressable>
          <Animated.Text
            entering={FadeIn.delay(200)}
            style={styles.childName}
          >
            {child.name}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(300)}
            style={styles.childAge}
          >
            {child.age} года
          </Animated.Text>
        </View>

        {/* Quick Stats — 3D */}
        <Animated.View
          entering={FadeIn.delay(300).springify()}
          style={styles.quickStats}
        >
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{progress.totalXP}</Text>
            <Text style={styles.quickStatLabel}>XP</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{streak.currentDays}</Text>
            <Text style={styles.quickStatLabel}>Дней подряд</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{progress.totalLessons}</Text>
            <Text style={styles.quickStatLabel}>Уроков</Text>
          </View>
        </Animated.View>

        {/* Goals */}
        <Animated.View
          entering={SlideInRight.delay(400).springify()}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Цели развития</Text>
          <View style={styles.tagList}>
            {child.goals.map((goal, i) => (
              <Animated.View
                key={goal}
                entering={FadeIn.delay(500 + i * 60)}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{goalLabels[goal] || goal}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Focus Areas */}
        <Animated.View
          entering={SlideInRight.delay(500).springify()}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Фокус обучения</Text>
          <View style={styles.tagList}>
            {child.focusAreas.map((area, i) => (
              <Animated.View
                key={area}
                entering={FadeIn.delay(600 + i * 60)}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{focusLabels[area] || area}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View
          entering={SlideInRight.delay(600).springify()}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Настройки</Text>
          <SettingRow3D
            label="Занятий в день"
            value={`${child.dailyMinutes} мин`}
            index={0}
          />
          <SettingRow3D
            label="Возрастная группа"
            value={`${child.age}+`}
            index={1}
          />
          <View style={styles.settingRowSwitch}>
            <Text style={styles.settingLabel}>🔔 Напоминания</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: Colors.lockedGrayLight, true: Colors.primaryLight }}
              thumbColor={notificationsEnabled ? Colors.primary : Colors.lockedGray}
            />
          </View>
          {notificationsEnabled && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={styles.settingHint}
            >
              Ежедневное напоминание в 18:00
            </Animated.Text>
          )}
          <View style={styles.settingRowSwitch}>
            <Text style={styles.settingLabel}>📳 Тактильная обратная связь</Text>
            <Switch
              value={hapticEnabled}
              onValueChange={(v) => {
                hapticSelection();
                setHapticEnabled(v);
              }}
              trackColor={{ false: Colors.lockedGrayLight, true: Colors.primaryLight }}
              thumbColor={hapticEnabled ? Colors.primary : Colors.lockedGray}
            />
          </View>
        </Animated.View>

        {/* Achievements */}
        <Animated.View
          entering={SlideInRight.delay(700).springify()}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Достижения 🏆</Text>
          {rewards.length === 0 ? (
            <Text style={styles.emptyText}>
              Завершите первый урок, чтобы получить награду! ⭐
            </Text>
          ) : (
            <View style={styles.achievementGrid}>
              {rewards.map((reward, i) => (
                <AchievementBadge
                  key={reward.id}
                  emoji={reward.emoji}
                  name={reward.name}
                  description={reward.description}
                  index={i}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Reset Actions */}
        <Animated.View
          entering={FadeIn.delay(800)}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Управление</Text>
          <Pressable
            onPress={() => {
              hapticPress();
              Alert.alert(
                'Сбросить прогресс?',
                'Все уроки, XP, серия и награды будут обнулены. Профиль ребёнка сохранится.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Сбросить',
                    style: 'destructive',
                    onPress: () => resetProgress(),
                  },
                ]
              );
            }}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>🔄 Сбросить прогресс</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticPress();
              Alert.alert(
                'Начать заново?',
                'ВСЕ данные будут удалены, включая профиль ребёнка. Вы вернётесь к онбордингу.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить всё',
                    style: 'destructive',
                    onPress: () => resetAll(),
                  },
                ]
              );
            }}
            style={[styles.resetButton, styles.resetButtonDanger]}
          >
            <Text style={[styles.resetButtonText, styles.resetButtonTextDanger]}>
              🗑️ Начать заново
            </Text>
          </Pressable>
        </Animated.View>

        {/* App Info */}
        <Animated.View
          entering={FadeIn.delay(900)}
          style={styles.appInfo}
        >
          <Text style={styles.appName}>TIMSANICH Kids Edu</Text>
          <Text style={styles.appVersion}>Версия 1.1.0</Text>
          <Text style={styles.appFeatures}>
            Haptic Feedback • Adaptive Learning • Duolingo-style UI
          </Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  childName: {
    ...Typography.headingL,
    marginTop: Spacing.md,
  },
  childAge: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    ...Typography.headingM,
    color: Colors.primary,
  },
  quickStatLabel: {
    ...Typography.caption,
    marginTop: 2,
    color: Colors.textSecondary,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  sectionTitle: {
    ...Typography.headingS,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  tagText: {
    ...Typography.bodyS,
    color: Colors.primary,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingRowSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settingLabel: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
  },
  settingValue: {
    ...Typography.bodyM,
    fontWeight: '700',
    color: Colors.primary,
  },
  settingHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -Spacing.xxs,
    marginLeft: Spacing.xxl,
  },
  emptyText: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  achievementItem: {
    alignItems: 'center',
    width: 72,
  },
  achievementCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.rewardGoldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.rewardGold,
    borderBottomWidth: 4,
    borderBottomColor: '#DAB800',
  },
  achievementEmoji: {
    fontSize: 28,
  },
  achievementTooltip: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginTop: Spacing.xxs,
    alignItems: 'center',
    maxWidth: 120,
  },
  achievementTooltipTitle: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  achievementTooltipDesc: {
    color: Colors.white,
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
  },
  resetButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetButtonDanger: {
    borderColor: Colors.errorRed + '40',
    backgroundColor: Colors.errorLight,
  },
  resetButtonText: {
    ...Typography.bodyM,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  resetButtonTextDanger: {
    color: Colors.errorRed,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.xxs,
  },
  appName: {
    ...Typography.bodyS,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  appVersion: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  appFeatures: {
    ...Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
});
