import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Easing,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BosMark } from './bos-mark';

interface BosSplashProps {
  statusMessage?: string;
  onPressLogo?: () => void;
}

export function BosSplash({
  statusMessage = 'Loading Business Operating System...',
  onPressLogo,
}: BosSplashProps) {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.85), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const glowRingAnim = useMemo(() => new Animated.Value(0.4), []);
  const progressBarAnim = useMemo(() => new Animated.Value(0.1), []);
  const tapBounceAnim = useRef(new Animated.Value(1)).current;
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    // 1. Entrance animation: Fade in and spring scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous ambient breathing / glowing ring animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowRingAnim, {
          toValue: 0.85,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowRingAnim, {
          toValue: 0.35,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // 3. Status dot pulsing animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 4. Loading progress bar progression
    Animated.timing(progressBarAnim, {
      toValue: 0.9,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    return () => {
      glowLoop.stop();
      pulseLoop.stop();
    };
  }, [fadeAnim, scaleAnim, glowRingAnim, pulseAnim, progressBarAnim]);

  // Interactive tap on logo
  const handleLogoPress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setTapCount((prev) => prev + 1);

    // Spring bounce effect
    Animated.sequence([
      Animated.timing(tapBounceAnim, {
        toValue: 0.9,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(tapBounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    onPressLogo?.();
  };

  const progressWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Interactive Logo with Ambient Glow Aura */}
        <Pressable
          onPress={handleLogoPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel="BOS logo. Tap to interact."
        >
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: tapBounceAnim }],
              },
            ]}
          >
            {/* Emerald glow aura ring */}
            <Animated.View
              style={[
                styles.glowAura,
                {
                  opacity: glowRingAnim,
                  transform: [
                    {
                      scale: glowRingAnim.interpolate({
                        inputRange: [0.35, 0.85],
                        outputRange: [1, 1.18],
                      }),
                    },
                  ],
                },
              ]}
            />
            <BosMark
              size={96}
              showText
              subtitle="Business Operating System"
              variant="dark"
            />
          </Animated.View>
        </Pressable>

        {/* Dynamic Tagline Pill */}
        <View style={styles.pillBadge}>
          <Text style={styles.pillText}>
            Adaptive POS · Orders · Khata Ledger · GST
          </Text>
        </View>

        {/* Loading Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
        </View>

        {/* Live Loading Status Message */}
        <Animated.View style={[styles.statusRow, { opacity: pulseAnim }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </Animated.View>

        {tapCount > 0 && (
          <Text style={styles.tapEasterEgg}>
            ⚡ BOS Engine Active {tapCount > 1 ? `(${tapCount})` : ''}
          </Text>
        )}
      </Animated.View>

      {/* Production Security Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          BOS Merchant Edition · 256-bit Encrypted
        </Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  glowAura: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#10B981',
    top: 6,
    filter: 'blur(24px)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 12,
  },
  pillBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: Math.min(width * 0.58, 220),
    marginTop: 28,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tapEasterEgg: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
