import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const router = useRouter();
  const {
    currentJobId,
    jobStatus,
    jobProgress,
    jobStage,
    generationError,
    pollActiveJob,
    resetGeneration,
  } = useAppStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for visual studio aura effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Polling loop
  useEffect(() => {
    if (!currentJobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted) return;
      const isTerminal = await pollActiveJob(currentJobId);
      if (isTerminal) {
        clearInterval(interval);
      }
    }, 2200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentJobId]);

  // Navigate when completed
  useEffect(() => {
    if (jobStatus === 'completed') {
      const timer = setTimeout(() => {
        router.replace('/generate/result');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [jobStatus]);

  const handleRetry = () => {
    resetGeneration();
    router.replace('/(tabs)');
  };

  if (jobStatus === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle" size={56} color={THEME.colors.error} />
          </View>
          <Text style={styles.errorTitle}>Generation Failed</Text>
          <Text style={styles.errorSubtitle}>
            {generationError || 'We could not process this image with the AI provider.'}
          </Text>
          <Text style={styles.refundNotice}>
            🪙 Your coins have been automatically refunded to your wallet.
          </Text>

          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerContainer}>
        {/* Pulsing Aura Circle */}
        <Animated.View
          style={[
            styles.auraCircle,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.innerAuraCircle}>
            <Ionicons name="sparkles" size={48} color={THEME.colors.accentViolet} />
          </View>
        </Animated.View>

        {/* Dynamic Progress Text */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Creating Your Portrait</Text>
          <Text style={styles.stageText}>
            {jobStage || 'Applying AI studio magic...'}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.max(15, jobProgress)}%` }]} />
          </View>

          <Text style={styles.percentText}>{Math.round(jobProgress)}%</Text>
        </View>

        <Text style={styles.tipText}>
          ✨ Tip: NIMO preserves your facial features while generating high-fashion lighting and backgrounds.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  auraCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(138, 43, 226, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerAuraCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.accentViolet,
  },
  statusBox: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  stageText: {
    fontSize: 14,
    color: THEME.colors.accentViolet,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.accentElectric,
    borderRadius: THEME.radii.pill,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tipText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  errorIconBox: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  errorSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  refundNotice: {
    fontSize: 13,
    color: THEME.colors.coinGold,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radii.md,
  },
  retryBtn: {
    backgroundColor: THEME.colors.accentElectric,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: THEME.radii.pill,
    marginTop: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
