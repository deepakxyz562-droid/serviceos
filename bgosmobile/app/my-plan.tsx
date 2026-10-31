import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Action, Badge, Loading, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { WEB_URL } from '../src/lib/constants';

interface BillingResponse {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
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
    features: string[];
    checkoutEnabled: boolean;
  }[];
}

const BGOS_DEFAULT_PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    priceInr: 499,
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

  const sub = billingRes.data?.subscription;
  const isTrial = sub?.status === 'trial';
  const trialDaysLeft = sub?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 7;

  async function handleActivatePlan(planCode: string) {
    setActivatingPlan(planCode);
    try {
      const res = await apiRequest<{ url: string }>('/api/bgos/billing', {
        method: 'POST',
        body: { plan: planCode },
      });
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        await Linking.openURL(`${WEB_URL}/app?view=billing`);
      }
    } catch {
      // Direct fallback to authenticated web billing checkout
      await Linking.openURL(`${WEB_URL}/app?view=billing`);
    } finally {
      setActivatingPlan(null);
    }
  }

  async function handleManageSubscription() {
    try {
      const res = await apiRequest<{ url: string }>('/api/bgos/billing', {
        method: 'POST',
        body: { action: 'portal' },
      });
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        await Linking.openURL(`${WEB_URL}/app?view=billing`);
      }
    } catch {
      await Linking.openURL(`${WEB_URL}/app?view=billing`);
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
            label={isTrial ? `Trial · ${trialDaysLeft}d left` : sub?.status === 'active' ? 'Active' : 'Free Tier'}
            success={sub?.status === 'active'}
            accent={isTrial}
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
                7-Day Free Trial Active ({trialDaysLeft} days remaining)
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: '#B45309', lineHeight: 16 }}>
              Enjoy full unrestricted access to Google SEO tools, 1-Tap WhatsApp Reviews, and AI marketing. Activate a paid plan anytime to keep growing without interruption.
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

        {billingRes.data?.portalEnabled ? (
          <Action
            secondary
            label="Manage Payment & Invoices"
            icon="credit-card"
            onPress={handleManageSubscription}
          />
        ) : null}
      </Card>

      {/* 2. Choose Plan Section */}
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>
          Upgrade or Activate Your Plan
        </Text>

        {BGOS_DEFAULT_PLANS.map((plan) => {
          const isCurrent = sub?.plan?.toLowerCase() === plan.code;
          const isBusy = activatingPlan === plan.code;

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
                    ₹{plan.priceInr.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>
                    per month
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
                    : isCurrent && !isTrial
                    ? 'Current Active Plan'
                    : `Activate ${plan.name} (₹${plan.priceInr}/mo)`
                }
                disabled={isBusy || (isCurrent && !isTrial)}
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
