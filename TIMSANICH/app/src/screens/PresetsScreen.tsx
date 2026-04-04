/**
 * PresetsScreen — NanaBanana image presets browser
 *
 * Displays a filterable grid of photo session presets.
 * Each card shows the preset emoji, name, photo count,
 * premium status, and a favorite toggle.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, Shadows, Radius, Typography } from '../constants/theme';
import { usePresetsStore } from '../store/usePresetsStore';
import { IMAGE_PRESETS, getPresetsByCategory, getFreePresets } from '../data/imagePresets';
import { hapticSelection } from '../utils/haptics';
import type { ImagePreset, PresetCategory } from '../types/imagePresets';

// ─── Category filter data ────────────────────────────────────────────

interface CategoryOption {
  key: string;
  label: string;
  category: PresetCategory | null;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: 'Все', category: null },
  { key: 'princess', label: 'Принцессы', category: 'princess' },
  { key: 'nature', label: 'Природа', category: 'nature' },
  { key: 'fairy_tale', label: 'Сказки', category: 'fairy_tale' },
  { key: 'fashion', label: 'Мода', category: 'fashion' },
  { key: 'space', label: 'Космос', category: 'space' },
  { key: 'underwater', label: 'Подводный мир', category: 'underwater' },
];

// ─── Animated preset card ────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PresetCard({
  preset,
  isFavorite,
  onPress,
  onToggleFavorite,
  index,
}: {
  preset: ImagePreset;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }, []);

  return (
    <Animated.View
      entering={FadeIn.delay(80 + index * 50).springify()}
      style={styles.cardWrapper}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: preset.accentColor + '40',
              borderBottomColor: preset.accentColor + '70',
            },
          ]}
        >
          {/* Premium lock */}
          {preset.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumIcon}>🔒</Text>
            </View>
          )}

          {/* Favorite toggle */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
            hitSlop={8}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </Pressable>

          {/* Emoji */}
          <View
            style={[
              styles.emojiContainer,
              { backgroundColor: preset.accentColor + '18' },
            ]}
          >
            <Text style={styles.emoji}>{preset.emoji}</Text>
          </View>

          {/* Name */}
          <Text style={styles.cardName} numberOfLines={2}>
            {preset.nameRu}
          </Text>

          {/* Photo count badge */}
          <View
            style={[
              styles.photoBadge,
              { backgroundColor: preset.accentColor + '20' },
            ]}
          >
            <Text
              style={[styles.photoBadgeText, { color: preset.accentColor }]}
            >
              📷 {preset.photoCount} фото
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────

export function PresetsScreen({
  onSelectPreset,
}: {
  onSelectPreset: (presetId: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { favoritePresetIds, toggleFavorite } = usePresetsStore();

  const filteredPresets = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.key === selectedCategory);
    if (!cat || cat.category === null) return IMAGE_PRESETS;
    return getPresetsByCategory(cat.category);
  }, [selectedCategory]);

  const handleCategoryPress = useCallback((key: string) => {
    hapticSelection();
    setSelectedCategory(key);
  }, []);

  const handleToggleFavorite = useCallback(
    (presetId: string) => {
      hapticSelection();
      toggleFavorite(presetId);
    },
    [toggleFavorite],
  );

  const renderPreset = useCallback(
    ({ item, index }: { item: ImagePreset; index: number }) => (
      <PresetCard
        preset={item}
        isFavorite={favoritePresetIds.includes(item.id)}
        onPress={() => onSelectPreset(item.id)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        index={index}
      />
    ),
    [favoritePresetIds, onSelectPreset, handleToggleFavorite],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.title}>📸 NanaBanana</Text>
        <Text style={styles.subtitle}>Фотосессии для девочек</Text>
      </Animated.View>

      {/* Category filter */}
      <Animated.View entering={FadeIn.delay(100).duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          style={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Presets grid */}
      <FlatList
        data={filteredPresets}
        renderItem={renderPreset}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>Пресеты не найдены</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.headingXL,
  },
  subtitle: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Categories
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryPillText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  categoryPillTextActive: {
    color: Colors.white,
  },

  // Grid
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
  },
  gridRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // Card
  cardWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: 'center',
    ...Shadows.card,
  },
  premiumBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    zIndex: 1,
  },
  premiumIcon: {
    fontSize: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 18,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emoji: {
    fontSize: 32,
  },
  cardName: {
    ...Typography.headingS,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  photoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  photoBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.massive,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.bodyM,
    color: Colors.textSecondary,
  },
});
