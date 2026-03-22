/**
 * SkillsWidget — Compact skill overview card
 *
 * Shows top skills being developed with animated bars.
 * Tappable for quick-access to progress screen.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap } from '../../utils/haptics';

interface SkillItem {
  name: string;
  emoji: string;
  level: number;
  maxLevel: number;
}

interface SkillsWidgetProps {
  skills: SkillItem[];
  totalWordsLearned: number;
  onPress?: () => void;
}

export function SkillsWidget({
  skills,
  totalWordsLearned,
  onPress,
}: SkillsWidgetProps) {
  const top4 = skills.slice(0, 4);

  return (
    <Pressable onPress={() => { hapticTap(); onPress?.(); }}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Навыки</Text>
          <View style={styles.wordsBadge}>
            <Text style={styles.wordsText}>📝 {totalWordsLearned} слов</Text>
          </View>
        </View>

        <View style={styles.skillsList}>
          {top4.map((skill, i) => {
            const barWidth = useSharedValue(0);

            useEffect(() => {
              barWidth.value = withDelay(
                i * 100 + 200,
                withTiming(skill.level / skill.maxLevel, {
                  duration: 600,
                  easing: Easing.out(Easing.cubic),
                })
              );
            }, [skill.level]);

            const fillStyle = useAnimatedStyle(() => ({
              width: `${barWidth.value * 100}%`,
            }));

            return (
              <View key={skill.name} style={styles.skillRow}>
                <Text style={styles.skillEmoji}>{skill.emoji}</Text>
                <View style={styles.skillBarContainer}>
                  <View style={styles.skillTrack}>
                    <Animated.View
                      style={[
                        styles.skillFill,
                        {
                          backgroundColor: skill.level >= skill.maxLevel
                            ? Colors.successGreen
                            : Colors.primary,
                        },
                        fillStyle,
                      ]}
                    />
                  </View>
                  <Text style={styles.skillLabel}>{skill.name}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.headingS,
    fontSize: 16,
  },
  wordsBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  wordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  skillsList: {
    gap: Spacing.xs,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skillEmoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  skillBarContainer: {
    flex: 1,
    gap: 1,
  },
  skillTrack: {
    height: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
