import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Brand, colors } from '../ui';
import { useResource } from '../../hooks/use-resource';
import { getToken } from '../../lib/auth';
import { useAuthStore } from '../../stores/auth-store';
import { WEB_URL } from '../../lib/constants';

interface BillingResponse {
  subscription?: {
    plan?: string;
    status?: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  };
}

const PLANS = [
  {
    code: 'starter',
    name: 'Starter Plan',
    priceInr: 499,
    badge: 'Solo Business',
    highlight: false,
    features: [
      'Unlimited intake & booking forms',
      'AI chatbot & shared customer inbox',
      'Appointment calendar & booking',
      'Up to 1,000 active contacts',
    ],
  },
  {
    code: 'growth',
    name: 'Growth Plan',
    priceInr: 1499,
    badge: '⭐ Most Popular',
    highlight: true,
    features: [
      'Everything in Starter',
      'Google SEO Maps rank boost & local audit',
      '1-Tap WhatsApp Google Review requests',
      'Printable Countertop QR Standees',
      'AI Marketing Studio & Autopilot',
      'Up to 10,000 active contacts',
    ],
  },
  {
    code: 'business',
    name: 'Business Plan',
    priceInr: 3999,
    badge: 'Multi-Location',
    highlight: false,
    features: [
      'Everything in Growth',
      '2,500 monthly B2B lead search credits',
      'Multi-team staff permissions & routing',
      'Executive 4-tier growth analytics',
      'Up to 100,000 contacts',
    ],
  },
];

interface PaywallGateProps {
  children: React.ReactNode;
}

export function PaywallGate({ children }: PaywallGateProps) {
  const billingRes = useResource<BillingResponse>('/api/bgos/billing');
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const { logout } = useAuthStore();

  const sub = billingRes.data?.subscription;

  // If billing is still loading on first mount, or no data yet, let children render
  if (billingRes.loading && !billingRes.data) {
    return <>{children}</>;
  }

  // Active paid subscription allows access
  if (sub?.status === 'active') {
    return <>{children}</>;
  }

  const isTrial = sub?.status === 'trial';
  const trialDaysLeft = sub?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 7;

  // Active trial with days remaining allows access
  if (isTrial && trialDaysLeft > 0) {
    return <>{children}</>;
  }

  // If status is not active and trial days are 0 (or expired/cancelled), gate access completely
  const isExpired = (isTrial && trialDaysLeft <= 0) || sub?.status === 'expired' || sub?.status === 'cancelled';

  if (!isExpired) {
    return <>{children}</>;
  }

  async function handlePayWithRazorpay(planCode: string) {
    setActivatingPlan(planCode);
    try {
      const token = await getToken();
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const checkoutUrl = `${WEB_URL}/checkout/razorpay?plan=${planCode}&product=bgos${tokenParam}`;

      await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.brand,
      });

      await billingRes.refresh();
    } catch {
      try {
        await Linking.openURL(`${WEB_URL}/checkout/razorpay?plan=${planCode}&product=bgos`);
      } catch {
        Alert.alert(
          'Checkout Notice',
          'Could not launch payment screen. Please check your internet connection.'
        );
      }
    } finally {
      setActivatingPlan(null);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand & Badge */}
        <View style={styles.header}>
          <Brand large />
          <View style={styles.badgeRow}>
            <View style={styles.expiredBadge}>
              <MaterialIcons name="lock" size={14} color="#BA3547" />
              <Text style={styles.expiredBadgeText}>7-Day Free Trial Expired</Text>
            </View>
          </View>
          <Text style={styles.title}>Unlock BGOS Growth Engine</Text>
          <Text style={styles.subtitle}>
            Your 7-day trial period has ended. Subscribe to an active plan to continue using AI Marketing Studio, Google Review Automation, Autopilot, and Lead Generation.
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {PLANS.map((plan) => {
            const isBusy = activatingPlan === plan.code;
            return (
              <View
                key={plan.code}
                style={[
                  styles.planCard,
                  plan.highlight && styles.planCardHighlight,
                ]}
              >
                {plan.highlight && (
                  <View style={styles.highlightBanner}>
                    <Text style={styles.highlightBannerText}>RECOMMENDED FOR GROWTH</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planBadge}>{plan.badge}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>₹{plan.priceInr.toLocaleString('en-IN')}</Text>
                    <Text style={styles.periodText}>/ month</Text>
                  </View>
                </View>

                {/* Features */}
                <View style={styles.featuresList}>
                  {plan.features.map((feat) => (
                    <View key={feat} style={styles.featureItem}>
                      <MaterialIcons name="check-circle" size={16} color={colors.brand} />
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>

                {/* Direct Razorpay Checkout Action */}
                <Pressable
                  style={[
                    styles.payButton,
                    plan.highlight && styles.payButtonHighlight,
                    isBusy && styles.payButtonDisabled,
                  ]}
                  disabled={isBusy}
                  onPress={() => handlePayWithRazorpay(plan.code)}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <MaterialIcons name="payment" size={18} color="#FFFFFF" />
                      <Text style={styles.payButtonText}>
                        Pay ₹{plan.priceInr.toLocaleString('en-IN')} with Razorpay
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Security & Sign Out Footer */}
        <View style={styles.footer}>
          <View style={styles.trustBadge}>
            <MaterialIcons name="security" size={16} color={colors.muted} />
            <Text style={styles.trustText}>
              Secured by Razorpay · UPI, QR, Netbanking & Cards
            </Text>
          </View>
          <Pressable
            style={styles.signOutButton}
            onPress={() => void logout()}
          >
            <Text style={styles.signOutText}>Sign Out / Switch Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  badgeRow: {
    marginTop: 8,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  expiredBadgeText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
  },
  cardsContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  planCardHighlight: {
    borderColor: '#009F50',
    borderWidth: 2,
    backgroundColor: '#FAFDFB',
  },
  highlightBanner: {
    alignSelf: 'flex-start',
    backgroundColor: '#009F50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: -4,
  },
  highlightBannerText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  planBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  periodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  featuresList: {
    gap: 8,
    paddingVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12.5,
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },
  payButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  payButtonHighlight: {
    backgroundColor: '#009F50',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 28,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 13,
    color: '#BA3547',
    fontWeight: '700',
  },
});
