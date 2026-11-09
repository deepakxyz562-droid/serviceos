import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth-store';
import { colors } from '../src/components/ui';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const squircleIcon = require('../assets/icon-squircle.png');

const SLIDES = [
  {
    key: 'automated',
    title: 'Your business.\nAutomated.',
    description:
      'All-in-one platform to manage conversations, bookings, reviews, marketing and growth.',
  },
  {
    key: 'google',
    title: 'Grow on Google\nAutomatically.',
    description:
      'Publish AI-tagged photos, answer customer reviews, and schedule local posts in your timezone.',
  },
  {
    key: 'customers',
    title: 'Never Miss a\nCustomer Call.',
    description:
      'Turn missed calls, WhatsApp chats, and inquiries into loyal reviews and booked appointments.',
  },
] as const;

export default function Index() {
  const { isAuthenticated: authenticated, isLoading, onboardingRequired } = useAuthStore();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const pageWidth = Math.min(Dimensions.get('window').width - 48, 420);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.loadingWrap}>
          <Image source={squircleIcon} style={styles.icon} alt="BGOS icon" />
          <Text style={styles.wordmark}>bgos</Text>
          <ActivityIndicator accessibilityLabel="Checking your session" color="#0B9042" style={{ marginTop: 18 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (authenticated) {
    return <Redirect href={onboardingRequired ? '/setup' : '/(tabs)'} />;
  }

  function handlePagerScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    if (pageWidth > 0) {
      const idx = Math.round(x / pageWidth);
      if (idx >= 0 && idx < SLIDES.length && idx !== activeSlide) {
        setActiveSlide(idx);
      }
    }
  }

  function goToSlide(idx: number) {
    setActiveSlide(idx);
    pagerRef.current?.scrollTo({ x: idx * pageWidth, animated: true });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      {/* Subtle mint ambient accent circles matching UI kit */}
      <View pointerEvents="none" style={styles.mintOrbTop} />
      <View pointerEvents="none" style={styles.mintOrbBottom} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={squircleIcon}
            style={styles.icon}
            alt="BGOS icon"
          />
        </View>

        <Text style={styles.wordmark}>bgos</Text>

        <View style={{ width: pageWidth, marginTop: 18 }}>
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePagerScroll}
            onScrollEndDrag={handlePagerScroll}
            scrollEventThrottle={16}
          >
            {SLIDES.map((slide) => (
              <View key={slide.key} style={{ width: pageWidth, alignItems: 'center', paddingHorizontal: 8 }}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, idx) => {
            const active = idx === activeSlide;
            return (
              <Pressable
                key={slide.key}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Slide ${idx + 1}`}
                onPress={() => goToSlide(idx)}
                style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.buttonText}>Get Started  →</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Text style={styles.secondaryText}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FBF8',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  mintOrbTop: {
    position: 'absolute',
    top: -110,
    right: -70,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(11, 144, 66, 0.06)',
  },
  mintOrbBottom: {
    position: 'absolute',
    bottom: -130,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(52, 211, 153, 0.09)',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 102,
    height: 102,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0B9042',
    letterSpacing: -1.3,
    lineHeight: 46,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#60758A',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 310,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 26,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#0B9042',
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  actionContainer: {
    gap: 6,
    paddingBottom: 6,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  button: {
    minHeight: 54,
    backgroundColor: '#0B9042',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B9042',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  secondary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#0B9042',
    fontSize: 14,
    fontWeight: '700',
  },
});
