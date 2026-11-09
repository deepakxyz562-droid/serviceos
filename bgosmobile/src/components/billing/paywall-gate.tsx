import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
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
import { apiRequest } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { useAuthStore } from '../../stores/auth-store';
import { WEB_URL } from '../../lib/constants';
import { detectDeviceCountryAndTimezone } from '../../lib/country-codes';

interface BillingResponse {
  subscription?: {
    plan?: string;
    status?: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  };
  entitlement?: {
    entitled: boolean;
    isTrial: boolean;
    isPaid: boolean;
    trialExpired: boolean;
    trialDaysLeft: number;
    status: string;
    plan: string;
  };
  defaultRegion?: 'india' | 'international';
  gateways?: {
    razorpay: boolean;
    creem: boolean;
  };
}

const PLANS = [
  {
    code: 'starter',
    name: 'Starter Plan',
    priceInr: 499,
    priceUsd: 9,
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
    priceUsd: 29,
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
    priceUsd: 79,
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
  const billingRes = useResource<BillingResponse>('/api/bgos/billing', 0, true, 15000);
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const [region, setRegion] = useState<'india' | 'international'>(() => {
    try {
      return detectDeviceCountryAndTimezone().country.code === 'IN' ? 'india' : 'international';
    } catch {
      return 'india';
    }
  });
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (billingRes.data?.defaultRegion) {
      setRegion(billingRes.data.defaultRegion);
    }
  }, [billingRes.data?.defaultRegion]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void billingRes.refresh();
      }
    });
    return () => sub.remove();
  }, [billingRes.refresh]);

  const sub = billingRes.data?.subscription;
  const ent = billingRes.data?.entitlement;

  // If billing is still loading on first mount, let children render briefly until check completes
  if (billingRes.loading && !billingRes.data) {
    return <>{children}</>;
  }

  // Never show "Complete Payment to Continue" when billing could not be fetched/verified
  if (!billingRes.data) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Brand large />
            <View style={styles.badgeRow}>
              <View style={styles.errorBadge}>
                <MaterialIcons name="wifi-off" size={14} color="#92400E" />
                <Text style={styles.errorBadgeText}>Subscription Check Failed</Text>
              </View>
            </View>
            <Text style={styles.title}>Could not verify subscription</Text>
            <Text style={styles.subtitle}>
              {billingRes.error || 'Unable to verify your subscription status right now. Please try again.'}
            </Text>
            {user?.email ? (
              <Text style={styles.accountBadge}>Signed in as: {user.email}</Text>
            ) : null}
          </View>

          <View style={styles.errorActions}>
            <Pressable
              style={[styles.payButton, styles.payButtonHighlight]}
              onPress={() => void billingRes.refresh()}
            >
              <View style={styles.buttonInner}>
                <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Retry Verification</Text>
              </View>
            </Pressable>

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

  // Strictly obey backend entitlement when present
  if (ent) {
    if (ent.entitled) {
      return <>{children}</>;
    }
  } else {
    // Fallback strict check: active non-free subscription OR active trial with valid future trialEndsAt
    const status = String(sub?.status || '').toLowerCase();
    const plan = String(sub?.plan || '').toLowerCase();
    const isActivePaid = status === 'active' && plan !== 'free';
    const trialEndsMs = sub?.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0;
    const isValidTrial = status === 'trial' && Number.isFinite(trialEndsMs) && trialEndsMs > Date.now();
    if (isActivePaid || isValidTrial) {
      return <>{children}</>;
    }
  }

  async function handleCheckout(planCode: string) {
    setActivatingPlan(planCode);
    try {
      if (region === 'international') {
        const res = await apiRequest<{ url?: string; error?: string }>('/api/bgos/billing', {
          method: 'POST',
          body: { plan: planCode },
        });
        if (!res?.url) {
          throw new Error(res?.error || 'Could not start online checkout. Please try again.');
        }
        await WebBrowser.openBrowserAsync(res.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: colors.brand,
        });
        await billingRes.refresh();
        return;
      }

      const token = await getToken();
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const checkoutUrl = `${WEB_URL}/checkout/razorpay?plan=${planCode}&product=bgos${tokenParam}`;

      await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.brand,
      });

      await billingRes.refresh();
    } catch (err: any) {
      if (region === 'india') {
        try {
          await Linking.openURL(`${WEB_URL}/checkout/razorpay?plan=${planCode}&product=bgos`);
          return;
        } catch {
          // fall through
        }
      }
      Alert.alert(
        'Checkout Notice',
        err?.message || 'Could not launch payment screen. Please check your internet connection.',
      );
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
              <Text style={styles.expiredBadgeText}>7-Day Free Trial Ended</Text>
            </View>
          </View>
          <Text style={styles.title}>Complete Payment to Continue</Text>
          <Text style={styles.subtitle}>
            Your 7-day full-access trial has ended. Choose a plan below to unlock all BGOS features.
          </Text>
          {user?.email ? (
            <Text style={styles.accountBadge}>Signed in as: {user.email}</Text>
          ) : null}
        </View>

        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {PLANS.map((plan) => {
            const isBusy = activatingPlan === plan.code;
            const priceText =
              region === 'india' ? `₹${plan.priceInr.toLocaleString('en-IN')}` : `$${plan.priceUsd}`;
            const gatewayReady =
              region === 'india'
                ? billingRes.data?.gateways?.razorpay !== false
                : billingRes.data?.gateways?.creem !== false;

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
                    <Text style={styles.priceText}>{priceText}</Text>
                    <Text style={styles.periodText}>
                      {region === 'india' ? '/ month' : 'USD / month'}
                    </Text>
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

                <Pressable
                  style={[
                    styles.payButton,
                    plan.highlight && styles.payButtonHighlight,
                    (isBusy || !gatewayReady) && styles.payButtonDisabled,
                  ]}
                  disabled={isBusy || !gatewayReady}
                  onPress={() => void handleCheckout(plan.code)}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <MaterialIcons name="payment" size={18} color="#FFFFFF" />
                      <Text style={styles.payButtonText}>
                        {gatewayReady
                          ? `Subscribe for ${priceText}/mo`
                          : 'Checkout Unavailable'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Security & Actions Footer */}
        <View style={styles.footer}>
          <Pressable
            style={styles.refreshButton}
            onPress={() => void billingRes.refresh()}
          >
            <Text style={styles.refreshText}>Already paid? Refresh subscription status</Text>
          </Pressable>
          <View style={styles.trustBadge}>
            <MaterialIcons name="security" size={16} color={colors.muted} />
            <Text style={styles.trustText}>
              {region === 'india'
                ? 'Secured 256-bit encrypted checkout · UPI, QR, Netbanking & Cards'
                : 'Secured 256-bit encrypted checkout · Global Cards, Apple Pay & Google Pay'}
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
    marginBottom: 18,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  refreshText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
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
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  errorBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  accountBadge: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorActions: {
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
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
