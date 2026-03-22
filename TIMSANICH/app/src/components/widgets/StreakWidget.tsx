/**
 * StreakWidget — Duolingo-style streak card
 *
 * Compact widget showing:
 * - Animated fire emoji
 * - Current streak days with large number
 * - Week progress dots (Mon-Sun)
 * - Freeze token indicator
 * - Haptic celebration on milestone streaks
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap, hapticStreak } from '../../utils/haptics';

interface StreakWidgetProps {
  currentDays: number;
  longestDays: number;
  todayDone: boolean;
  onPress?: () => void;
}

export function StreakWidget({
  currentDays,
  longestDays,
  todayDone,
  onPress,
}: StreakWidgetProps) {
  const fireScale = useSharedValue(0);
  const fireY = useSharedValue(0);
  const numberScale = useSharedValue(0);

  useEffect(() => {
    // Fire entrance
    fireScale.value = withDelay(
      100,
      withSpring(1, { damping: 8, stiffness: 200, mass: 0.5 })
    );

    // Fire flickering
    fireY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Number entrance
    numberScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 250 })
    );

    // Haptic on milestone
    if (currentDays > 0 && currentDays % 7 === 0) {
      hapticStreak();
    }
  }, [currentDays]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fireScale.value },
      { translateY: fireY.value },
    ],
  }));

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));

  // Week dots
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0
  const weekDays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

  const isMilestone = currentDays > 0 && currentDays % 7 === 0;
  const isNewRecord = currentDays > 0 && currentDays >= longestDays;

  const bgColor = currentDays === 0
    ? Colors.lockedGrayLight
    : isMilestone
    ? '#FFF4E3'
    : todayDone
    ? '#FFF8F0'
    : '#FFFAF5';

  const accentColor = currentDays === 0
    ? Colors.lockedGray
    : '#FF9600';

  return (
    <Pressable onPress={() => { hapticTap(); onPress?.(); }}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        {/* Left — fire + number */}
        <View style={styles.streakSection}>
          <Animated.Text style={[styles.fireEmoji, fireStyle]}>
            {currentDays === 0 ? '❄️' : '🔥'}
          </Animated.Text>
          <Animated.View style={numberStyle}>
            <Text style={[styles.streakNumber, { color: accentColor }]}>
              {currentDays}
            </Text>
            <Text style={styles.streakLabel}>
              {currentDays === 1 ? 'день' : currentDays < 5 ? 'дня' : 'дней'}
            </Text>
          </Animated.View>
        </View>

        {/* Right — week dots + status */}
        <View style={styles.rightSection}>
          {/* Week progress */}
          <View style={styles.weekRow}>
            {weekDays.map((day, i) => {
              const isActive = i < todayIndex || (i === todayIndex && todayDone);
              const isToday = i === todayIndex;
              const dotScale = useSharedValue(0);

              useEffect(() => {
                dotScale.value = withDelay(
                  i * 40 + 300,
                  withSpring(1, { damping: 10, stiffness: 300 })
                );
              }, []);

              const dotStyle = useAnimatedStyle(() => ({
                transform: [{ scale: dotScale.value }],
              }));

              return (
                <Animated.View key={i} style={[styles.weekDotCol, dotStyle]}>
                  <View style={[
                    styles.weekDot,
                    isActive && styles.weekDotActive,
                    isToday && !todayDone && styles.weekDotToday,
                  ]}>
                    {isActive && <Text style={styles.weekCheck}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.weekDayLabel,
                    isToday && styles.weekDayLabelToday,
                  ]}>
                    {day}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* Status label */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: accentColor + '20' },
          ]}>
            <Text style={[styles.statusText, { color: accentColor }]}>
              {currentDays === 0
                ? 'Начни серию!'
                : isNewRecord
                ? '🏆 Новый рекорд!'
                : isMilestone
                ? '🎉 Milestone!'
                : todayDone
                ? '✅ Сегодня сделано'
                : '⏳ Продолжи сегодня'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,150,0,0.15)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(255,150,0,0.2)',
    gap: Spacing.md,
    alignItems: 'center',
  },
  streakSection: {
    alignItems: 'center',
    gap: 2,
  },
  fireEmoji: {
    fontSize: 36,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  streakLabel: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  rightSection: {
    flex: 1,
    gap: Spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDotCol: {
    alignItems: 'center',
    gap: 2,
  },
  weekDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  weekDotActive: {
    backgroundColor: '#FF9600',
    borderColor: '#FF9600',
  },
  weekDotToday: {
    borderColor: '#FF9600',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  weekCheck: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textLight,
  },
  weekDayLabelToday: {
    color: '#FF9600',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
