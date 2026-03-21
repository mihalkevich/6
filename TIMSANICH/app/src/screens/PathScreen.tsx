import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { lessons } from '../data/lessons';
import { categories } from '../data/categories';
import type { LessonStatus } from '../types';

const { width } = Dimensions.get('window');
const NODE_SIZE = 64;
const PATH_WIDTH = width - Spacing.lg * 2;

interface PathScreenProps {
  onStartLesson: (lessonId: string) => void;
}

export function PathScreen({ onStartLesson }: PathScreenProps) {
  const { child, progress } = useAppStore();

  if (!child) return null;

  const ageLessons = lessons.filter(
    (l) => child.age >= l.ageMin && child.age <= l.ageMax
  );

  // Group by category
  const grouped = categories
    .map((cat) => ({
      category: cat,
      lessons: ageLessons.filter((l) => l.categoryId === cat.id),
    }))
    .filter((g) => g.lessons.length > 0);

  const getStatus = (lessonId: string, requiredIds: string[]): LessonStatus => {
    if (progress.completedLessonIds.includes(lessonId)) return 'completed';
    const allDepsMet = requiredIds.every((id) =>
      progress.completedLessonIds.includes(id)
    );
    return allDepsMet ? 'available' : 'locked';
  };

  // Zigzag pattern for node positions
  const getNodeX = (index: number): number => {
    const positions = [0.25, 0.5, 0.75, 0.5];
    return PATH_WIDTH * positions[index % positions.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Путь знаний</Text>
        <Text style={styles.subtitle}>
          {progress.completedLessonIds.length} из {ageLessons.length} уроков
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {grouped.map((group, groupIndex) => (
          <View key={group.category.id} style={styles.section}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{group.category.emoji}</Text>
              <Text style={styles.sectionTitle}>{group.category.nameRu}</Text>
            </View>

            {/* Lesson Nodes */}
            <View style={styles.nodesContainer}>
              {/* Connecting Lines */}
              {group.lessons.map((lesson, i) => {
                if (i === 0) return null;
                const status = getStatus(lesson.id, lesson.requiredLessonIds);
                const prevStatus = getStatus(
                  group.lessons[i - 1].id,
                  group.lessons[i - 1].requiredLessonIds
                );
                const lineColor =
                  prevStatus === 'completed'
                    ? Colors.successGreen
                    : Colors.lockedGrayLight;

                return (
                  <View
                    key={`line-${lesson.id}`}
                    style={[
                      styles.line,
                      {
                        top: (i - 1) * 100 + NODE_SIZE / 2 + 16,
                        height: 100,
                        left: PATH_WIDTH * 0.5 - 2,
                        backgroundColor: lineColor,
                      },
                    ]}
                  />
                );
              })}

              {group.lessons.map((lesson, i) => {
                const status = getStatus(lesson.id, lesson.requiredLessonIds);
                const nodeX = getNodeX(i);

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[
                      styles.node,
                      {
                        left: nodeX - NODE_SIZE / 2,
                        top: i * 100,
                      },
                      status === 'completed' && styles.nodeCompleted,
                      status === 'available' && styles.nodeAvailable,
                      status === 'locked' && styles.nodeLocked,
                    ]}
                    onPress={() =>
                      status !== 'locked' && onStartLesson(lesson.id)
                    }
                    disabled={status === 'locked'}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nodeEmoji}>
                      {status === 'completed'
                        ? '✅'
                        : status === 'locked'
                        ? '🔒'
                        : lesson.emoji}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Spacer */}
              <View style={{ height: group.lessons.length * 100 + 20 }} />
            </View>

            {/* Lesson Labels */}
            {group.lessons.map((lesson, i) => {
              const status = getStatus(lesson.id, lesson.requiredLessonIds);
              const nodeX = getNodeX(i);

              return (
                <View
                  key={`label-${lesson.id}`}
                  style={[
                    styles.labelContainer,
                    {
                      top: i * 100 + NODE_SIZE + 4 + 60, // offset for section header
                      left: nodeX - 60,
                      width: 120,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.nodeLabel,
                      status === 'locked' && styles.nodeLabelLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {lesson.titleRu}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.headingL,
  },
  subtitle: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Spacing.xxl,
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
  sectionEmoji: {
    fontSize: 24,
  },
  sectionTitle: {
    ...Typography.headingS,
  },
  nodesContainer: {
    position: 'relative',
    width: '100%',
  },
  line: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  nodeCompleted: {
    backgroundColor: Colors.successLight,
    borderWidth: 3,
    borderColor: Colors.successGreen,
  },
  nodeAvailable: {
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  nodeLocked: {
    backgroundColor: Colors.lockedGrayLight,
    borderWidth: 3,
    borderColor: Colors.lockedGray,
  },
  nodeEmoji: {
    fontSize: 28,
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeLabel: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  nodeLabelLocked: {
    color: Colors.lockedGray,
  },
});
