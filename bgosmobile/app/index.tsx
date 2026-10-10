import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth-store';
import { colors } from '../src/components/ui';

export default function Index() {
  const { isAuthenticated: authenticated, isLoading, onboardingRequired } = useAuthStore();
  const router = useRouter();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator accessibilityLabel="Checking your session" color="#FFFFFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (authenticated) {
    return <Redirect href={onboardingRequired ? '/setup' : '/(tabs)'} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/app-icon.png')}
            style={styles.icon}
            accessibilityLabel="BGOS ribbon logo"
          />
        </View>

        <Text style={styles.name}>BGOS</Text>
        <Text style={styles.subtitle}>Business Growth OS</Text>

        <View style={styles.badgeRow}>
          <View style={styles.channelBadge}>
            <Text style={styles.badgeText}>💬 WhatsApp</Text>
          </View>
          <View style={styles.channelBadge}>
            <Text style={styles.badgeText}>📷 Instagram</Text>
          </View>
          <View style={styles.channelBadge}>
            <Text style={styles.badgeText}>📞 AI Phone</Text>
          </View>
        </View>

        <Text style={styles.title}>
          Get Found. Get Customers.{'\n'}Grow Your Business.
        </Text>
        <Text style={styles.description}>
          AI receptionist, multi-channel inbox, leads CRM and social marketing studio. All in your pocket.
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.secondaryText}>Sign In to Existing Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.hero, // #003E43 Deep Teal
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 174, 0.3)',
  },
  icon: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  name: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent, // #00BFAE Cyan Glow
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  channelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeText: {
    color: '#E6F5F3',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#D1EAE5',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  actionContainer: {
    gap: 10,
    paddingBottom: 8,
  },
  button: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: colors.hero,
    fontSize: 16,
    fontWeight: '800',
  },
  secondary: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#D1EAE5',
    fontSize: 14,
    fontWeight: '600',
  },
});
