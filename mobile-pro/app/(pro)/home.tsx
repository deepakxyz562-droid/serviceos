/**
 * Fieseros Pro — Home Dashboard (Screen 07 + Onboarding Setup S01-S06)
 *
 * Primary command center for contractors and service professionals.
 * Features:
 *   - Pro identity, verified badge, rating & acceptance stats
 *   - Online / Offline dispatch status toggle
 *   - Today's earnings counter (₹2,900) & Weekly performance
 *   - Next scheduled job card with 1-tap route & customer call
 *   - Verification setup checklist tracker
 *   - Quick navigation into Lead Radar, Quotes & Active Jobs
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ShieldCheck,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  Phone,
  Navigation,
  Sparkles,
  Radio,
  FileText,
  Briefcase,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Repeat,
  Zap,
} from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

export default function ProHomeScreen() {
  const { user, tenant, isAuthenticated } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [verificationDismissed, setVerificationDismissed] = useState(false);
  const [nearbyLeadsCount, setNearbyLeadsCount] = useState(5);
  const [activeJobsCount, setActiveJobsCount] = useState(2);

  const businessName = tenant?.name || user?.name || 'Apex Plumbing & HVAC';
  const initials = businessName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'AP';

  React.useEffect(() => {
    let mounted = true;
    api
      .get<{ opportunities?: unknown[]; total?: number }>(API_PATHS.providerOpportunities)
      .then((res) => {
        if (mounted && Array.isArray(res?.opportunities) && res.opportunities.length > 0) {
          setNearbyLeadsCount(res.opportunities.length);
        }
      })
      .catch(() => {});
    api
      .get<{ jobs?: unknown[] }>(API_PATHS.jobs)
      .then((res) => {
        if (mounted && Array.isArray(res?.jobs) && res.jobs.length > 0) {
          setActiveJobsCount(res.jobs.length);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      Alert.alert(
        next ? 'You are Online' : 'You are Offline',
        next
          ? 'You will now receive incoming instant leads within your 15 km radius.'
          : 'Lead radar paused. You will not receive push notifications for new requests.'
      );
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.push(isAuthenticated ? '/(pro)/profile' : '/(auth)/login')}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#059669',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{initials}</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  {businessName}
                </Text>
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    borderColor: '#A7F3D0',
                    borderWidth: 1,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 12,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>PRO</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginLeft: 3 }}>4.9</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 2 }}>(142 reviews)</Text>
                <Text style={{ fontSize: 12, color: '#CBD5E1', marginHorizontal: 6 }}>•</Text>
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                  {isAuthenticated ? '96% response' : 'Tap to Sign In'}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Online Toggle */}
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 12, fontWeight: '700', color: isOnline ? '#059669' : '#64748B' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={isOnline ? '#059669' : '#94A3B8'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginTop: 2 }}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Verification Progress Banner (Screens P04-P06) */}
        {!verificationDismissed && (
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderColor: '#BFDBFE',
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck size={20} color="#2563EB" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF', marginLeft: 8 }}>
                  Complete Business Verification (2/4 Done)
                </Text>
              </View>
              <Pressable onPress={() => setVerificationDismissed(true)}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Dismiss</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 4 }}>
              Upload your trade contractor license & bank account to receive automated daily payouts.
            </Text>
            <Pressable
              onPress={() => router.push('/(pro)/profile')}
              style={{
                marginTop: 10,
                backgroundColor: '#2563EB',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Upload Trade License →</Text>
            </Pressable>
          </View>
        )}

        {/* Daily Stats KPI Cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Today's Earnings</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#059669', marginTop: 4 }}>₹2,900</Text>
            <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>+₹1,200 yesterday</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Active Pipeline</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
              {activeJobsCount} Jobs
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>1 in progress</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Leads Nearby</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706', marginTop: 4 }}>
              {nearbyLeadsCount} New
            </Text>
            <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>Within 12 km</Text>
          </View>
        </View>

        {/* Lead Radar Banner (Tap to Leads) */}
        <Pressable
          onPress={() => router.push('/(pro)/leads')}
          style={{
            backgroundColor: '#064E3B',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Radio size={20} color="#fff" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {nearbyLeadsCount} High-Intent Leads Waiting
                </Text>
                <Text style={{ fontSize: 12, color: '#A7F3D0', marginTop: 2 }}>
                  Customers ready for quotes · Plumbing & AC
                </Text>
              </View>
            </View>
            <ArrowRight size={20} color="#A7F3D0" />
          </View>
        </Pressable>

        {/* Next Scheduled Job (Screen P11 / P12) */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Next Job Today</Text>
            <Pressable onPress={() => router.push('/(pro)/jobs')}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>View All Jobs</Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>EN ROUTE · ARRIVING IN 20M</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  Kitchen Pipe Burst & Sink Trap Leak
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Customer: Vikram Roy</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669' }}>₹1,200</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <MapPin size={14} color="#64748B" />
              <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
                Flat 402, Prestige Tower, Indiranagar (3.2 km away)
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Clock size={14} color="#64748B" />
              <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>Scheduled: Today at 3:30 PM</Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => router.push('/(pro)/jobs')}
                style={{
                  flex: 1,
                  backgroundColor: '#059669',
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Navigation size={15} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginLeft: 6 }}>Start Navigation</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(pro)/quote-composer')}
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Details</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Pro Quick Actions Grid */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <Pressable
            onPress={() => router.push('/(pro)/quote-composer')}
            style={{
              width: '48%',
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#ECFDF5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#059669" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 10 }}>AI Quote Drafter</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Auto-calculate packages</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(pro)/schedule')}
            style={{
              width: '48%',
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 10 }}>Calendar & Hours</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Set working availability</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(pro)/profile')}
            style={{
              width: '48%',
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} color="#D97706" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 10 }}>Payouts & Bank</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>₹4,200 pending payout</Text>
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL('https://fieseros.com').catch(() => {})}
            style={{
              width: '48%',
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Repeat size={18} color="#475569" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 10 }}>Customer Portal</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Open fieseros.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
