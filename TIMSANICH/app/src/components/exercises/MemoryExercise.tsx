/**
 * MemoryExercise — Flip & match card pairs
 *
 * Classic memory game adapted for kids:
 * - Cards flip with animation
 * - Haptic on flip, match, and mismatch
 * - Matched pairs stay revealed with celebration
 * - Small grid (2x3 or 2x4 depending on age)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { hapticTap, hapticSuccess, hapticError } from '../../utils/haptics';

const { width } = Dimensions.get('window');

interface MemoryCard {
  id: string;
  emoji: string;
  pairId: string;
}

interface MemoryExerciseProps {
  cards: MemoryCard[];
  onComplete: (moves: number) => void;
}

export function MemoryExercise({ cards, onComplete }: MemoryExerciseProps) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [firstCard, setFirstCard] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);

  const cardFlips = cards.reduce((acc, card) => {
    acc[card.id] = useSharedValue(0);
    return acc;
  }, {} as Record<string, Animated.SharedValue<number>>);

  const cardScales = cards.reduce((acc, card) => {
    acc[card.id] = useSharedValue(1);
    return acc;
  }, {} as Record<string, Animated.SharedValue<number>>);

  const handleFlip = useCallback((cardId: string) => {
    if (locked || flipped.has(cardId) || matched.has(cardId)) return;

    hapticTap();
    const card = cards.find((c) => c.id === cardId)!;

    // Flip animation
    cardFlips[cardId].value = withTiming(1, { duration: 300 });
    setFlipped((prev) => new Set(prev).add(cardId));

    if (!firstCard) {
      // First card of pair
      setFirstCard(cardId);
    } else {
      // Second card — check for match
      setMoves((m) => m + 1);
      setLocked(true);

      const firstCardObj = cards.find((c) => c.id === firstCard)!;

      if (firstCardObj.pairId === card.pairId) {
        // Match!
        hapticSuccess();
        // Bounce both cards
        cardScales[firstCard].value = withSequence(
          withTiming(1.15, { duration: 100 }),
          withSpring(1, { damping: 10 })
        );
        cardScales[cardId].value = withSequence(
          withTiming(1.15, { duration: 100 }),
          withSpring(1, { damping: 10 })
        );

        const newMatched = new Set(matched);
        newMatched.add(firstCard);
        newMatched.add(cardId);
        setMatched(newMatched);
        setFirstCard(null);
        setLocked(false);

        // Check if all matched
        if (newMatched.size === cards.length) {
          setTimeout(() => onComplete(moves + 1), 500);
        }
      } else {
        // No match — flip back
        hapticError();
        setTimeout(() => {
          cardFlips[firstCard].value = withTiming(0, { duration: 300 });
          cardFlips[cardId].value = withTiming(0, { duration: 300 });
          setFlipped((prev) => {
            const next = new Set(prev);
            next.delete(firstCard);
            next.delete(cardId);
            return next;
          });
          setFirstCard(null);
          setLocked(false);
        }, 800);
      }
    }
  }, [firstCard, locked, flipped, matched, moves]);

  const cardWidth = (width - Spacing.lg * 2 - Spacing.sm * 2) / 3 - 4;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Найди пары!</Text>
      <Text style={styles.moves}>Ходов: {moves}</Text>

      <View style={styles.grid}>
        {cards.map((card) => {
          const isFlipped = flipped.has(card.id) || matched.has(card.id);
          const isMatched = matched.has(card.id);

          const frontStyle = useAnimatedStyle(() => ({
            transform: [
              { scale: cardScales[card.id].value },
              {
                rotateY: `${interpolate(
                  cardFlips[card.id].value,
                  [0, 1],
                  [0, 180],
                  Extrapolation.CLAMP
                )}deg`,
              },
            ],
            opacity: interpolate(
              cardFlips[card.id].value,
              [0, 0.5, 0.5, 1],
              [1, 1, 0, 0],
              Extrapolation.CLAMP
            ),
          }));

          const backStyle = useAnimatedStyle(() => ({
            transform: [
              { scale: cardScales[card.id].value },
              {
                rotateY: `${interpolate(
                  cardFlips[card.id].value,
                  [0, 1],
                  [180, 360],
                  Extrapolation.CLAMP
                )}deg`,
              },
            ],
            opacity: interpolate(
              cardFlips[card.id].value,
              [0, 0.5, 0.5, 1],
              [0, 0, 1, 1],
              Extrapolation.CLAMP
            ),
          }));

          return (
            <Pressable
              key={card.id}
              onPress={() => handleFlip(card.id)}
              disabled={locked || isFlipped}
            >
              <View style={[styles.cardContainer, { width: cardWidth, height: cardWidth }]}>
                {/* Front (hidden) */}
                <Animated.View style={[
                  styles.card,
                  styles.cardFront,
                  { width: cardWidth, height: cardWidth },
                  frontStyle,
                ]}>
                  <Text style={styles.questionMark}>?</Text>
                </Animated.View>

                {/* Back (emoji) */}
                <Animated.View style={[
                  styles.card,
                  styles.cardBack,
                  isMatched && styles.cardMatched,
                  { width: cardWidth, height: cardWidth },
                  backStyle,
                ]}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                </Animated.View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    ...Typography.headingM,
  },
  moves: {
    ...Typography.bodyS,
    color: Colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cardContainer: {
    position: 'relative',
  },
  card: {
    position: 'absolute',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 3,
    borderBottomWidth: 5,
  },
  cardFront: {
    backgroundColor: Colors.primary,
    borderColor: '#3D8BCB',
    borderBottomColor: '#2D6FA3',
  },
  cardBack: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderBottomColor: '#D1D5DB',
  },
  cardMatched: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successGreen,
    borderBottomColor: '#4DAF5C',
  },
  questionMark: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    opacity: 0.7,
  },
  cardEmoji: {
    fontSize: 36,
  },
});
