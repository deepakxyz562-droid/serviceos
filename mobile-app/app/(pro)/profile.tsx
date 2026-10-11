/**
 * Fieseros Pro — Business Profile, Earnings & Operations Screen
 * Covers:
 *   - Screen 15: Earnings Dashboard & Revenue Breakdown
 *   - Screen 16: Invoices & Bank Payouts
 *   - Screen 24: Team Members & Crew Dispatch
 *   - Screen 25: Services & Pricing Catalog
 *   - Screen 26: Reviews & Reputation
 *   - Screen 27: Trust Vault & License Verification
 *   - Screen 28: Pro Plan & Settings + Switch to Customer Mode
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Store,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Star,
  Users,
  Settings,
  CreditCard,
  FileText,
  ChevronRight,
  Sparkles,
  Repeat,
  CheckCircle2,
  Building,
  ArrowUpRight,
} from 'lucide-react-native';

export default function ProProfileScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'trust'>('overview');

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
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Business & Payouts</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Apex Plumbing & HVAC Enterprises
            </Text>
          </View>

          {/* Switch to Customer App */}
          <Pressable
            onPress={() => router.push('/(customer)/home')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Repeat size={14} color="#475569" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginLeft: 4 }}>
              Customer Mode
            </Text>
          </Pressable>
        </View>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginTop: 12 }}>
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === 'overview' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'overview' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'overview' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: activeTab === 'overview' ? '700' : '500',
                color: activeTab === 'overview' ? '#059669' : '#64748B',
              }}
            >
              Business Hub
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('earnings')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === 'earnings' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'earnings' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'earnings' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: activeTab === 'earnings' ? '700' : '500',
                color: activeTab === 'earnings' ? '#059669' : '#64748B',
              }}
            >
              Earnings & Payouts
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('trust')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === 'trust' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'trust' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'trust' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: activeTab === 'trust' ? '700' : '500',
                color: activeTab === 'trust' ? '#059669' : '#64748B',
              }}
            >
              Trust Vault
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            {/* Pro Profile Card */}
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: '#059669',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>AP</Text>
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                    Apex Plumbing & HVAC
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    Owned by Rajesh Sharma · Established 2019
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <ShieldCheck size={14} color="#059669" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669', marginLeft: 4 }}>
                      Verified Fieseros Pro Contractor
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Menu Sections (Screen 24, 25, 26, 28) */}
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {[
                {
                  icon: Users,
                  title: 'Crew & Technicians (Screen 24)',
                  subtitle: '3 Technicians active · Manage dispatch & assignments',
                  onPress: () => Alert.alert('Crew Management', '3 technicians: Ramesh (En route), Suresh (Available), Amit (Available).'),
                },
                {
                  icon: FileText,
                  title: 'Services & Pricing Catalog (Screen 25)',
                  subtitle: '8 Services configured · Standard diagnostic ₹199',
                  onPress: () => Alert.alert('Services Catalog', 'Standard Plumbing (₹450/hr), AC Gas Refill (₹1,500), Emergency Drain (₹850).'),
                },
                {
                  icon: Star,
                  title: 'Reputation & Reviews (Screen 26)',
                  subtitle: '4.9★ Average · 142 Reviews · AI review reply active',
                  onPress: () => Alert.alert('Reputation Manager', '142 reviews fetched. AI has auto-acknowledged all 5-star ratings.'),
                },
                {
                  icon: Settings,
                  title: 'Account & Plan Tier (Screen 28)',
                  subtitle: 'Fieseros Pro Marketplace · 8% take-rate plan',
                  onPress: () => Alert.alert('Plan Tier', 'Active Tier: Fieseros Pro Marketplace (0 fixed monthly fee, 8% take rate on completed bookings).'),
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={idx}
                    onPress={item.onPress}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: idx < 3 ? 1 : 0,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: '#ECFDF5',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} color="#059669" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{item.title}</Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.subtitle}</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {activeTab === 'earnings' && (
          <>
            {/* Screen 15: Earnings Dashboard */}
            <View
              style={{
                backgroundColor: '#064E3B',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 12, color: '#A7F3D0', fontWeight: '600' }}>TOTAL OCTOBER EARNINGS</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 }}>₹28,450</Text>
              <Text style={{ fontSize: 12, color: '#ECFDF5', marginTop: 2 }}>
                Across 24 completed jobs · 96% customer satisfaction
              </Text>

              <View
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.15)',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, color: '#A7F3D0' }}>Available for Payout</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 }}>₹4,200</Text>
                </View>
                <Pressable
                  onPress={() => Alert.alert('Payout Triggered', '₹4,200 transferred to HDFC Bank (A/C ending in 4012). Arriving via IMPS instantly.')}
                  style={{
                    backgroundColor: '#10B981',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignSelf: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Withdraw Now</Text>
                </Pressable>
              </View>
            </View>

            {/* Screen 16: Payout History */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
              Recent Bank Transfers (Stripe / Bank Connect)
            </Text>
            {[
              { id: 'tx-1', date: 'Yesterday, 6:00 PM', amount: 3250, status: 'Completed', bank: 'HDFC Bank •••• 4012' },
              { id: 'tx-2', date: 'Oct 8, 2026', amount: 5800, status: 'Completed', bank: 'HDFC Bank •••• 4012' },
              { id: 'tx-3', date: 'Oct 4, 2026', amount: 4100, status: 'Completed', bank: 'HDFC Bank •••• 4012' },
            ].map((tx) => (
              <View
                key={tx.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>₹{tx.amount}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {tx.bank} · {tx.date}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>{tx.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'trust' && (
          <>
            {/* Screen 27: Document Verification & Trust Vault */}
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Verified Credentials</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Verified badges are shown to customers on quotes to establish trust.
              </Text>

              {[
                { title: 'Government ID & PAN', status: 'VERIFIED', expires: 'Permanent' },
                { title: 'Master Plumbing License', status: 'VERIFIED', expires: 'Valid till 2028' },
                { title: 'Commercial General Liability Insurance', status: 'VERIFIED', expires: '₹50L coverage · Valid till Dec 2027' },
                { title: 'Background Check Clear', status: 'VERIFIED', expires: 'Police verified Sep 2026' },
              ].map((doc, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: idx < 3 ? 1 : 0,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{doc.title}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{doc.expires}</Text>
                  </View>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>{doc.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
