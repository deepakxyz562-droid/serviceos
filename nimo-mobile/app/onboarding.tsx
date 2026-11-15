import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { NimoLogo } from '../src/components/NimoLogo';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/auth/login');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Navigation */}
      <View style={styles.topBar}>
        {currentStep > 0 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <NimoLogo size="small" showText />

        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Screen 1: Your AI Creative Studio */}
      {currentStep === 0 && (
        <View style={styles.slideContainer}>
          {/* 4-Card Floating Portrait Mosaic */}
          <View style={styles.mosaicGrid}>
            <View style={styles.mosaicCol}>
              <View style={[styles.mosaicCard, styles.mosaicCardLeftTop]}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' }}
                  style={styles.cardImg}
                />
              </View>
              <View style={[styles.mosaicCard, styles.mosaicCardLeftBottom]}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' }}
                  style={styles.cardImg}
                />
              </View>
            </View>

            <View style={styles.mosaicCol}>
              <View style={[styles.mosaicCard, styles.mosaicCardRightTop]}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' }}
                  style={styles.cardImg}
                />
              </View>
              <View style={[styles.mosaicCard, styles.mosaicCardRightBottom]}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' }}
                  style={styles.cardImg}
                />
              </View>
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>Your AI Creative Studio</Text>
            <Text style={styles.subtitle}>
              Turn your photos into stunning portraits, videos and more – with AI.
            </Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Screen 2: Create Like Never Before */}
      {currentStep === 1 && (
        <View style={styles.slideContainer}>
          {/* Fantasy Castle Artwork */}
          <View style={styles.castleContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' }}
              style={styles.castleImg}
              resizeMode="cover"
            />
            <View style={styles.castleGlow} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>Create Like Never Before</Text>
            <Text style={styles.subtitle}>
              AI Photos, AI Videos, Creative Templates & More.
            </Text>

            {/* 3 Feature Bullets */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="camera" size={16} color={THEME.colors.accentViolet} />
                </View>
                <Text style={styles.featureLabel}>AI Portraits</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="videocam" size={16} color={THEME.colors.accentViolet} />
                </View>
                <Text style={styles.featureLabel}>AI Videos</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="sparkles" size={16} color={THEME.colors.accentViolet} />
                </View>
                <Text style={styles.featureLabel}>Trending Templates</Text>
              </View>
            </View>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Screen 3: Stay Inspired */}
      {currentStep === 2 && (
        <View style={styles.slideContainer}>
          {/* 3D Purple Notification Bell */}
          <View style={styles.bellContainer}>
            <View style={styles.bellBackdrop}>
              <Ionicons name="notifications" size={84} color="#A855F7" />
              <Ionicons name="heart" size={24} color="#EC4899" style={styles.floatingHeart1} />
              <Ionicons name="heart" size={20} color="#C084FC" style={styles.floatingHeart2} />
              <Ionicons name="sparkles" size={26} color="#38BDF8" style={styles.floatingSparkle} />
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>Stay Inspired</Text>
            <Text style={styles.subtitle}>
              Get the latest trends, tips and exclusive offers.
            </Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>

          {/* Buttons Stack */}
          <View style={styles.buttonsStack}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Allow Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.maybeLaterBtn} onPress={handleFinish}>
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  mosaicGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    height: 310,
  },
  mosaicCol: {
    gap: 12,
  },
  mosaicCard: {
    width: (width - 72) / 2,
    borderRadius: THEME.radii.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: THEME.colors.bgCard,
  },
  mosaicCardLeftTop: {
    height: 160,
  },
  mosaicCardLeftBottom: {
    height: 130,
  },
  mosaicCardRightTop: {
    height: 130,
  },
  mosaicCardRightBottom: {
    height: 160,
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  castleContainer: {
    width: '100%',
    height: 290,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    marginTop: 16,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  castleImg: {
    width: '100%',
    height: '100%',
  },
  castleGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  bellContainer: {
    width: '100%',
    height: 290,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  bellBackdrop: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1E103E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  floatingHeart1: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  floatingHeart2: {
    position: 'absolute',
    bottom: 25,
    left: 15,
  },
  floatingSparkle: {
    position: 'absolute',
    top: 30,
    left: 20,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  featuresList: {
    marginTop: 18,
    gap: 10,
    width: '100%',
    paddingHorizontal: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgCardLighter,
  },
  dotActive: {
    width: 24,
    backgroundColor: THEME.colors.accentViolet,
  },
  buttonsStack: {
    gap: 10,
    width: '100%',
  },
  primaryBtn: {
    height: 54,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  maybeLaterBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maybeLaterText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
