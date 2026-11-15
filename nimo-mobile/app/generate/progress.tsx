import React, { useEffect, useRef, useState } from 'react';
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

const PHASES = [
  { id: 1, name: 'Facial Landmark Analysis', desc: 'Preserving natural bone structure & eyes', threshold: 25 },
  { id: 2, name: 'Neural Style Synthesis', desc: 'Blends aesthetic lighting & wardrobe', threshold: 60 },
  { id: 3, name: 'Skin & Hair Micro-Details', desc: 'Refines realistic texture and gaze', threshold: 85 },
  { id: 4, name: '4K Studio Upscaling', desc: 'Final color grading and portrait finish', threshold: 100 },
];

const DID_YOU_KNOW_TIPS = [
  'NIMO analyzes 128 biometric facial landmarks to keep your authentic look.',
  'Studio lighting is dynamically adapted to match your skin undertones.',
  'Couple portraits synthesize both partners into a harmonious cinematic lighting frame.',
  'Zero Risk: In the rare event of an AI inference glitch, coins refund automatically.',
];

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
    setBackgroundGenerating,
  } = useAppStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [tipIndex, setTipIndex] = useState(0);

  // Pulse & Rotation animation for visual studio aura effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Tip rotation timer
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DID_YOU_KNOW_TIPS.length);
    }, 5000);
    return () => clearInterval(tipTimer);
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
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [jobStatus]);

  const handleRetry = () => {
    resetGeneration();
    router.replace('/(tabs)');
  };

  const handleRunInBackground = () => {
    setBackgroundGenerating(true);
    router.replace('/(tabs)/explore');
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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.contentContainer}>
        {/* Pulsing Aura Circle */}
        <View style={styles.auraWrapper}>
          <Animated.View
            style={[
              styles.auraCircleOuter,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbitRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.orbitDot} />
          </Animated.View>
          <View style={styles.innerAuraCircle}>
            <Ionicons name="sparkles" size={42} color={THEME.colors.accentViolet} />
          </View>
        </View>

        {/* Dynamic Progress Text & Bar */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Creating Your AI Portrait</Text>
          <Text style={styles.stageText}>
            {jobStage || 'Applying AI studio neural synthesis...'}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.max(15, jobProgress)}%` }]} />
          </View>
          <Text style={styles.percentText}>{Math.round(jobProgress)}% completed</Text>
        </View>

        {/* 4 Phases Flow Tracker */}
        <View style={styles.phasesCard}>
          {PHASES.map((phase) => {
            const isCompleted = jobProgress >= phase.threshold;
            const isCurrent =
              jobProgress < phase.threshold &&
              (phase.id === 1 || jobProgress >= PHASES[phase.id - 2].threshold);

            return (
              <View key={`phase-${phase.id}`} style={styles.phaseRow}>
                <View
                  style={[
                    styles.phaseIconBox,
                    isCompleted && styles.phaseIconCompleted,
                    isCurrent && styles.phaseIconCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color={THEME.colors.accentViolet} />
                  ) : (
                    <Text style={styles.phaseNum}>{phase.id}</Text>
                  )}
                </View>
                <View style={styles.phaseTextCol}>
                  <Text
                    style={[
                      styles.phaseName,
                      isCompleted && styles.phaseNameCompleted,
                      isCurrent && styles.phaseNameCurrent,
                    ]}
                  >
                    {phase.name}
                  </Text>
                  <Text style={styles.phaseDesc}>{phase.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tip Box */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={18} color={THEME.colors.coinGold} />
          <Text style={styles.tipText}>{DID_YOU_KNOW_TIPS[tipIndex]}</Text>
        </View>

        {/* Action: Run in Background button */}
        <TouchableOpacity
          style={styles.backgroundBtn}
          onPress={handleRunInBackground}
          activeOpacity={0.8}
        >
          <Ionicons name="albums-outline" size={16} color="#FFF" />
          <Text style={styles.backgroundBtnText}>Explore More Styles (Run in Background)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  auraWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  auraCircleOuter: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  orbitRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.accentViolet,
    top: -4,
  },
  innerAuraCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.accentViolet,
  },
  statusBox: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  stageText: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 7,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    overflow: 'hidden',
    marginTop: 6,
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
  phasesCard: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phaseIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.bgCardLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIconCompleted: {
    backgroundColor: THEME.colors.success,
  },
  phaseIconCurrent: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: THEME.colors.accentViolet,
  },
  phaseNum: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  phaseTextCol: {
    flex: 1,
  },
  phaseName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  phaseNameCompleted: {
    color: THEME.colors.textPrimary,
  },
  phaseNameCurrent: {
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
  phaseDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    width: '100%',
  },
  tipText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  backgroundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.bgCard,
    paddingVertical: 14,
    borderRadius: THEME.radii.xl,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderLight,
    width: '100%',
  },
  backgroundBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
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
