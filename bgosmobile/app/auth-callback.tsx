import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../src/stores/auth-store';
import { Action, Brand, Screen, colors } from '../src/components/ui';

export default function AuthCallback() {
  const router = useRouter();
  const { isAuthenticated, onboardingRequired, isLoading, checkAuth } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated) {
      router.replace(onboardingRequired ? '/setup' : '/(tabs)');
      return;
    }

    // Attempt to verify session
    checkAuth().catch(() => {});

    // Polling interval to catch session completion from openAuthSessionAsync
    const timer = setInterval(() => {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        clearInterval(timer);
        router.replace(state.onboardingRequired ? '/setup' : '/(tabs)');
      }
    }, 400);

    // Timeout fallback after 4 seconds
    const timeout = setTimeout(() => {
      clearInterval(timer);
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        router.replace(state.onboardingRequired ? '/setup' : '/(tabs)');
      } else {
        setTimedOut(true);
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [isAuthenticated, onboardingRequired, checkAuth, router]);

  return (
    <Screen title="Welcome to BGOS">
      <View style={styles.container}>
        <Brand large />

        {!timedOut ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={styles.title}>Completing Secure Sign-In…</Text>
            <Text style={styles.subtitle}>Connecting to your BGOS workspace</Text>
          </View>
        ) : (
          <View style={styles.fallbackBox}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="info-outline" size={32} color={colors.muted} />
            </View>
            <Text style={styles.title}>Sign-In Interrupted</Text>
            <Text style={styles.subtitle}>
              Your sign-in could not be completed automatically. Please start again from the sign-in screen.
            </Text>
            <Action
              label="Return to Sign In"
              icon="arrow-back"
              onPress={() => router.replace('/login')}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 24,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  fallbackBox: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
