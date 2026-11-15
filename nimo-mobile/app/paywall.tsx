import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { useAppStore } from '../src/store/useAppStore';

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { subscribePlan } = useAppStore();
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [selectedPlan, setSelectedPlan] = useState<'Pro' | 'Premium'>('Pro');

  const handleSubscribe = () => {
    subscribePlan(selectedPlan);
    router.push('/subscription/success');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card: Go Premium */}
        <View style={styles.heroCard}>
          <View style={styles.crownCircle}>
            <Ionicons name="sparkles" size={28} color="#FBBF24" />
          </View>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock unlimited creativity!</Text>
        </View>

        {/* Monthly vs Yearly Switcher */}
        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[styles.switchOption, billingCycle === 'Monthly' && styles.switchOptionActive]}
            onPress={() => setBillingCycle('Monthly')}
          >
            <Text style={[styles.switchText, billingCycle === 'Monthly' && styles.switchTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchOption, billingCycle === 'Yearly' && styles.switchOptionActive]}
            onPress={() => setBillingCycle('Yearly')}
          >
            <Text style={[styles.switchText, billingCycle === 'Yearly' && styles.switchTextActive]}>
              Yearly (Save 50%)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pro Plan Card */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'Pro' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('Pro')}
          activeOpacity={0.9}
        >
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Pro Plan</Text>
              <Text style={styles.planPrice}>
                {billingCycle === 'Monthly' ? '$9.99' : '$4.99'}
                <Text style={styles.planPeriod}> / month</Text>
              </Text>
            </View>

            {/* Radio Toggle */}
            <View style={[styles.radioCircle, selectedPlan === 'Pro' && styles.radioCircleSelected]}>
              {selectedPlan === 'Pro' && <View style={styles.radioInnerDot} />}
            </View>
          </View>

          {/* Features Checklist */}
          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>1,000 credits/month</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>HD quality</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>No watermark</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Premium Plan Card */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'Premium' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('Premium')}
          activeOpacity={0.9}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Premium Plan</Text>
              <Text style={styles.planPrice}>
                {billingCycle === 'Monthly' ? '$14.99' : '$7.99'}
                <Text style={styles.planPeriod}> / month</Text>
              </Text>
            </View>

            {/* Radio Toggle */}
            <View style={[styles.radioCircle, selectedPlan === 'Premium' && styles.radioCircleSelected]}>
              {selectedPlan === 'Premium' && <View style={styles.radioInnerDot} />}
            </View>
          </View>

          {/* Features Checklist */}
          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>2,000 credits/month</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>4K quality</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>Priority support</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Subscribe Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.subscribeBtn}
          onPress={handleSubscribe}
          activeOpacity={0.88}
        >
          <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
        </TouchableOpacity>

        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={13} color={THEME.colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.securityText}>Secure & Encrypted Payment</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  heroCard: {
    backgroundColor: '#1E103E',
    borderRadius: THEME.radii.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    marginBottom: 20,
  },
  crownCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    marginTop: 4,
    fontWeight: '600',
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchOption: {
    flex: 1,
    height: 40,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchOptionActive: {
    backgroundColor: THEME.colors.accentViolet,
  },
  switchText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  switchTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  planCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginBottom: 16,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: THEME.colors.accentViolet,
    backgroundColor: '#1E103E',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 4,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: THEME.colors.accentViolet,
  },
  radioInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.accentViolet,
  },
  featuresList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    color: THEME.colors.accentViolet,
    fontSize: 16,
    marginRight: 8,
    fontWeight: '700',
  },
  featureText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    alignItems: 'center',
  },
  subscribeBtn: {
    width: '100%',
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
    marginBottom: 8,
  },
  subscribeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
