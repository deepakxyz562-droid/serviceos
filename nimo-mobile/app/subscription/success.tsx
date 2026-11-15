import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const { subscriptionPlan } = useAppStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* Glowing Green Checkmark Circle with Confetti Accents */}
        <View style={styles.checkmarkOuter}>
          <View style={styles.sparkle1}>
            <Ionicons name="sparkles" size={18} color="#C084FC" />
          </View>
          <View style={styles.sparkle2}>
            <Ionicons name="sparkles" size={14} color="#38BDF8" />
          </View>
          <View style={styles.checkmarkCircle}>
            <Ionicons name="checkmark" size={54} color="#FFF" />
          </View>
        </View>

        <Text style={styles.headline}>Subscription Active!</Text>
        <Text style={styles.subheadline}>
          You're now on the {subscriptionPlan || 'Pro'} Plan
        </Text>

        {/* Next Billing Date Card */}
        <View style={styles.billingCard}>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar-outline" size={24} color="#C084FC" />
          </View>
          <View>
            <Text style={styles.billingLabel}>Next Billing Date</Text>
            <Text style={styles.billingDate}>Nov 24, 2026</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsStack}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.88}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.85}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkOuter: {
    position: 'relative',
    marginBottom: 28,
  },
  checkmarkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  sparkle1: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -6,
    left: -10,
  },
  headline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 6,
  },
  billingCard: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginVertical: 32,
  },
  calendarIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  billingLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  billingDate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  actionsStack: {
    width: '100%',
    gap: 12,
  },
  doneBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manageBtn: {
    height: 50,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  manageBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
