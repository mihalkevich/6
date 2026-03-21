/**
 * AnimatedProgressBar — smooth progress with haptic on completion
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '../../constants/theme';
import { hapticProgressComplete } from '../../utils/haptics';

interface AnimatedProgressBarProps {
  progress: number; // 0-1
  color?: string;
  height?: number;
  backgroundColor?: string;
  animated?: boolean;
}

export function AnimatedProgressBar({
  progress,
  color = Colors.primary,
  height = 10,
  backgroundColor = Colors.primaryLight,
  animated = true,
}: AnimatedProgressBarProps) {
  const widthValue = useSharedValue(0);
  const prevProgress = useSharedValue(0);

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(1, progress));

    if (animated) {
      widthValue.value = withTiming(clampedProgress * 100, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      widthValue.value = clampedProgress * 100;
    }

    // Haptic when reaching 100%
    if (clampedProgress >= 1 && prevProgress.value < 1) {
      setTimeout(() => hapticProgressComplete(), 500);
    }
    prevProgress.value = clampedProgress;
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthValue.value}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: progress >= 1 ? Colors.successGreen : color,
            height,
            borderRadius: height / 2,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
