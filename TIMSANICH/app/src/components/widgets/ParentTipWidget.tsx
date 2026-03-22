/**
 * ParentTipWidget — Daily parent guidance card
 *
 * Shows:
 * - Today's pedagogical tip
 * - What skills are being developed
 * - Quick action suggestion
 * - Tap to expand/collapse
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { hapticTap } from '../../utils/haptics';

interface ParentTipWidgetProps {
  tipRu: string;
  learningFocusRu?: string;
  todaySkills?: string[];
}

export function ParentTipWidget({
  tipRu,
  learningFocusRu,
  todaySkills,
}: ParentTipWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => { hapticTap(); setExpanded(!expanded); }}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👨‍👧</Text>
          <View style={styles.headerText}>
            <Text style={styles.title}>Совет родителю</Text>
            <Text style={styles.expandHint}>{expanded ? 'Свернуть' : 'Подробнее'}</Text>
          </View>
        </View>

        <Text style={styles.tip} numberOfLines={expanded ? undefined : 2}>
          {tipRu}
        </Text>

        {expanded && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.expandedContent}>
            {learningFocusRu && (
              <View style={styles.focusRow}>
                <Text style={styles.focusEmoji}>🎯</Text>
                <Text style={styles.focusText}>{learningFocusRu}</Text>
              </View>
            )}

            {todaySkills && todaySkills.length > 0 && (
              <View style={styles.skillTags}>
                {todaySkills.map((skill) => (
                  <View key={skill} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionSuggestion}>
              <Text style={styles.actionEmoji}>💡</Text>
              <Text style={styles.actionText}>
                Повторяйте с ребёнком новые слова из уроков в течение дня — это закрепляет знания!
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.rewardGoldLight,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(245,180,97,0.3)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(245,180,97,0.4)',
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.bodyM,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  expandHint: {
    ...Typography.caption,
    color: Colors.warningAmber,
    fontWeight: '600',
  },
  tip: {
    ...Typography.bodyM,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  expandedContent: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,180,97,0.3)',
    paddingTop: Spacing.sm,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  focusEmoji: {
    fontSize: 14,
    marginTop: 2,
  },
  focusText: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    flex: 1,
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
  },
  skillTag: {
    backgroundColor: 'rgba(245,180,97,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warningAmber,
  },
  actionSuggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  actionEmoji: {
    fontSize: 14,
    marginTop: 2,
  },
  actionText: {
    ...Typography.bodyS,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
});
