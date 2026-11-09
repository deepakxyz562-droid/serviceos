import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Action, Badge, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';
import { detectDeviceCountryAndTimezone } from '../src/lib/country-codes';
import * as WebBrowser from 'expo-web-browser';

interface BgosEntitlement {
  entitled: boolean;
  isTrial: boolean;
  isPaid: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface BillingResponse {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  };
  entitlement?: BgosEntitlement;
  defaultRegion?: 'india' | 'international';
  gateways?: {
    razorpay: boolean;
    creem: boolean;
  };
  usage: {
    contacts: number;
    forms: number;
    usedLeadCredits: number;
    leadCreditLimit: number;
  };
  portalEnabled: boolean;
  plans: {
    code: string;
    name: string;
    priceInr: number;
    priceUsd?: number;
    features: string[];
    checkoutEnabled: boolean;
  }[];
}

const BGOS_DEFAULT_PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    priceInr: 499,
    priceUsd: 9,
    badge: 'Popular for solo shops',
    features: [
      'AI chatbot & shared customer inbox',
      'Unlimited intake & survey forms',
      'Appointment calendar & booking',
      'Up to 1,000 contacts',
    ],
  },
  {
    code: 'growth',
    name: 'Growth',
    priceInr: 1499,
    priceUsd: 29,
    badge: 'Most Popular · Recommended',
    highlight: true,
    features: [
      'Everything in Starter',
      'Google SEO Maps rank boost',
      '1-Tap WhatsApp Google Reviews',
      'Printable Countertop QR Standees',
      'Automated marketing broadcasts',
      'Up to 10,000 contacts',
    ],
  },
  {
    code: 'business',
    name: 'Business',
    priceInr: 3999,
    priceUsd: 79,
    badge: 'Multi-location & enterprise',
    features: [
      'Everything in Growth',
      '2,500 monthly B2B lead search credits',
      'Multi-team permissions & routing',
      'Executive 4-tier growth analytics',
      'Up to 100,000 contacts',
    ],
  },
];

export default function MyPlanScreen() {
  const router = useRouter();
  const billingRes = useResource<BillingResponse>('/api/bgos/billing');
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const [region, setRegion] = useState<'india' | 'international'>(() => {
    try {
      return detectDeviceCountryAndTimezone().country.code === 'IN' ? 'india' : 'international';
    } catch {
      return 'india';
    }
  });
  const regionInitRef = useRef(false);

  useEffect(() => {
    if (!regionInitRef.current && billingRes.data?.defaultRegion) {
      regionInitRef.current = true;
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
  const isTrial = ent ? ent.isTrial : sub?.status === 'trial';
  const trialExpired = ent ? ent.trialExpired : false;
  const isPaid = ent ? ent.isPaid : sub?.status === 'active' && sub?.plan !== 'free';
  const trialDaysLeft = ent
    ? ent.trialDaysLeft
    : sub?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  async function handleActivatePlan(planCode: string) {
    setActivatingPlan(planCode);
    try {
      if (region === 'international') {
        const res = await apiRequest<{ url?: string; error?: string }>(
          '/api/bgos/billing',
          {
            method: 'POST',
            body: { plan: planCode },
          },
        );
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
          // fall through to alert
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
    <Screen
      title="My Plan & Billing"
      subtitle="Manage your BGOS subscription, 7-day trial, and business limits."
      showBack
      onBack={() => router.back()}
      onRefresh={billingRes.refresh}
    >
      {/* 1. Current Plan Status Card */}
      <Card style={{ padding: 18, gap: 12, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 }}>
              CURRENT SUBSCRIPTION
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 2 }}>
              {(sub?.plan || 'Starter').toUpperCase()} PLAN
            </Text>
          </View>
          <Badge
            label={
              isTrial
                ? `Trial · ${trialDaysLeft}d left`
                : isPaid
                  ? 'Active'
                  : trialExpired
                    ? 'Trial Expired'
                    : 'Payment Required'
            }
            success={isPaid}
            accent={isTrial}
            danger={trialExpired && !isPaid}
          />
        </View>

        {isTrial ? (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              borderColor: '#FDE68A',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="timer" size={18} color="#D97706" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                7-Day Free Trial Active ({trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining)
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#B45309', lineHeight: 16 }}>
              Enjoy full unrestricted access during your 7-day trial. Activate a paid plan anytime to continue uninterrupted.
            </Text>
          </View>
        ) : null}

        {trialExpired && !isPaid ? (
          <View
            style={{
              backgroundColor: '#FEE2E2',
              borderColor: '#FECACA',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="lock" size={18} color="#B91C1C" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                7-Day Free Trial Expired — Payment Required
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>
              Your 7-day trial has ended. Choose a plan below to unlock all BGOS features.
            </Text>
          </View>
        ) : null}

        {/* Usage meters */}
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>CONTACTS</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 2 }}>
              {billingRes.data?.usage?.contacts || 0}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>FORMS</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 2 }}>
              {billingRes.data?.usage?.forms || 0}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>LEAD CREDITS</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 2 }}>
              {billingRes.data?.usage?.usedLeadCredits || 0}/{billingRes.data?.usage?.leadCreditLimit || 0}
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Plans Section (currency & pricing automatically matched to installation region) */}
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>
          Upgrade or Activate Your Plan
        </Text>

        {BGOS_DEFAULT_PLANS.map((plan) => {
          const isCurrentPaid = isPaid && (ent?.plan || sub?.plan)?.toLowerCase() === plan.code;
          const isBusy = activatingPlan === plan.code;
          const priceDisplay = region === 'india' ? `₹${plan.priceInr.toLocaleString('en-IN')}` : `$${plan.priceUsd}`;
          const gatewayReady =
            region === 'india'
              ? billingRes.data?.gateways?.razorpay !== false
              : billingRes.data?.gateways?.creem !== false;

          return (
            <Card
              key={plan.code}
              style={{
                padding: 16,
                gap: 12,
                borderColor: plan.highlight ? colors.brand : colors.line,
                borderWidth: plan.highlight ? 2 : 1,
                backgroundColor: plan.highlight ? '#F8FAFC' : colors.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>
                    {plan.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.brand, fontWeight: '700', marginTop: 2 }}>
                    {plan.badge}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.ink }}>
                    {priceDisplay}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>
                    {region === 'india' ? 'per month' : 'USD / month'}
                  </Text>
                </View>
              </View>

              {/* Feature Checklist */}
              <View style={{ gap: 6, paddingVertical: 4 }}>
                {plan.features.map((feature) => (
                  <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={{ fontSize: 12.5, color: colors.ink, flex: 1 }}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Action
                label={
                  isBusy
                    ? 'Opening Secure Checkout…'
                    : isCurrentPaid
                      ? 'Current Active Plan'
                      : !gatewayReady
                        ? 'Checkout Unavailable'
                        : `Subscribe ${priceDisplay}/mo`
                }
                disabled={isBusy || isCurrentPaid || !gatewayReady}
                icon={plan.highlight ? 'flash-on' : 'check'}
                onPress={() => handleActivatePlan(plan.code)}
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
