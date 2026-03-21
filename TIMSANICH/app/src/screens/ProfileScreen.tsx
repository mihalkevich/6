import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { Card, EmojiCircle } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

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

export function ProfileScreen() {
  const { child, streak, progress, rewards } = useAppStore();

  if (!child) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <EmojiCircle
            emoji={child.avatarEmoji}
            size={96}
            backgroundColor={Colors.primaryLight}
          />
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childAge}>{child.age} года</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
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
        </View>

        {/* Goals */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Цели развития</Text>
          <View style={styles.tagList}>
            {child.goals.map((goal) => (
              <View key={goal} style={styles.tag}>
                <Text style={styles.tagText}>{goalLabels[goal] || goal}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Focus Areas */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Фокус обучения</Text>
          <View style={styles.tagList}>
            {child.focusAreas.map((area) => (
              <View key={area} style={styles.tag}>
                <Text style={styles.tagText}>{focusLabels[area] || area}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Settings */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Занятий в день</Text>
            <Text style={styles.settingValue}>{child.dailyMinutes} минут</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Возрастная группа</Text>
            <Text style={styles.settingValue}>{child.age}+</Text>
          </View>
        </Card>

        {/* Achievements */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Достижения</Text>
          {rewards.length === 0 ? (
            <Text style={styles.emptyText}>
              Завершите первый урок, чтобы получить награду! ⭐
            </Text>
          ) : (
            <View style={styles.achievementGrid}>
              {rewards.slice(0, 8).map((reward) => (
                <View key={reward.id} style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>{reward.emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>TIMSANICH Kids Edu</Text>
          <Text style={styles.appVersion}>Версия 1.0.0</Text>
        </View>

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
    ...Shadows.card,
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
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionCard: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
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
  },
  tagText: {
    ...Typography.bodyS,
    color: Colors.primary,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  settingLabel: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
  },
  settingValue: {
    ...Typography.bodyM,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    gap: Spacing.sm,
  },
  achievementItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.rewardGoldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementEmoji: {
    fontSize: 28,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.xxs,
  },
  appName: {
    ...Typography.bodyS,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  appVersion: {
    ...Typography.caption,
    color: Colors.textLight,
  },
});
