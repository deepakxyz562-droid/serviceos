/**
 * Fieseros Pro — Quote Composer & 3-Tier Package Builder
 * Covers:
 *   - Screen 10: Send Quote Composer
 *   - Screen 20: Good / Better / Best Multi-Tier Package Builder
 *   - Screen 23: Pro AI Assistant & Quote Copilot
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Sparkles,
  Layers,
  Send,
  ShieldCheck,
  Clock,
  Plus,
  Check,
  ChevronRight,
  Info,
  DollarSign,
  ArrowLeft,
} from 'lucide-react-native';

interface PackageTier {
  id: 'good' | 'better' | 'best';
  name: string;
  badge: string;
  price: number;
  scope: string;
  warranty: string;
  materials: string;
}

export default function ProQuoteComposerScreen() {
  const params = useLocalSearchParams();
  const leadTitle = typeof params.title === 'string' ? params.title : 'Kitchen Pipe & Drain Repair';
  const customerName = typeof params.customerName === 'string' ? params.customerName : 'Ananya S.';
  const category = typeof params.category === 'string' ? params.category : 'Plumbing';

  const [quoteMode, setQuoteMode] = useState<'single' | 'tiered'>('tiered');
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  // Single Quote inputs
  const [singlePrice, setSinglePrice] = useState('1200');
  const [singleScope, setSingleScope] = useState('Inspect leaking trap, clear hairline obstruction, replace PVC joint seal with 30-day warranty.');
  const [arrivalWindow, setArrivalWindow] = useState('Today, 2:30 PM - 3:30 PM');
  const [warrantyPeriod, setWarrantyPeriod] = useState('30 Days Guarantee');

  // Tiered Packages (Screen 20: Good / Better / Best)
  const [tiers, setTiers] = useState<PackageTier[]>([
    {
      id: 'good',
      name: 'Standard Fix',
      badge: 'ESSENTIAL',
      price: 950,
      scope: 'Chemical drain clearing + joint resealing with Teflon tape.',
      warranty: '15 Days Warranty',
      materials: 'Consumables included',
    },
    {
      id: 'better',
      name: 'Full Replacement',
      badge: 'RECOMMENDED',
      price: 1350,
      scope: 'New heavy-duty PVC P-Trap + high-grade rubber gaskets + full pressurized drain test.',
      warranty: '60 Days Warranty',
      materials: 'Standard PVC fittings',
    },
    {
      id: 'best',
      name: 'Heavy Duty Premium',
      badge: 'BEST VALUE',
      price: 1950,
      scope: 'Reinforced brass trap + motorized drain snake deep cleaning + preventive biological enzyme treatment.',
      warranty: '180 Days Extended Warranty',
      materials: 'Commercial brass fittings',
    },
  ]);

  const handleAiAutoDraft = () => {
    setIsAiDrafting(true);
    setTimeout(() => {
      setIsAiDrafting(false);
      setSinglePrice('1250');
      setSingleScope('Certified inspection, motorized drain cleaning, and gasket replacement with leak-proof pressure testing.');
      Alert.alert(
        'AI Quote Generated',
        'Fieseros AI analyzed past local jobs in Indiranagar and populated competitive pricing and warranties.'
      );
    }, 800);
  };

  const handleSendQuote = () => {
    Alert.alert(
      'Quote Sent to Customer',
      `Your proposal for "${leadTitle}" has been dispatched to ${customerName}. You will be alerted as soon as the customer confirms.`,
      [
        {
          text: 'Go to Jobs Pipeline',
          onPress: () => router.push('/(pro)/jobs'),
        },
      ]
    );
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
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Quote Composer</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Customer: {customerName} · {category}
            </Text>
          </View>

          {/* AI Trigger */}
          <Pressable
            onPress={handleAiAutoDraft}
            disabled={isAiDrafting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ECFDF5',
              borderColor: '#A7F3D0',
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Sparkles size={14} color="#059669" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginLeft: 4 }}>
              {isAiDrafting ? 'Drafting...' : 'AI Copilot'}
            </Text>
          </Pressable>
        </View>

        {/* Mode Switcher: Single vs Tiered */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginTop: 12 }}>
          <Pressable
            onPress={() => setQuoteMode('tiered')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: quoteMode === 'tiered' ? '#fff' : 'transparent',
              shadowColor: quoteMode === 'tiered' ? '#000' : 'transparent',
              shadowOpacity: quoteMode === 'tiered' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: quoteMode === 'tiered' ? '700' : '500',
                color: quoteMode === 'tiered' ? '#059669' : '#64748B',
              }}
            >
              Good / Better / Best (3 Tiers)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setQuoteMode('single')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: quoteMode === 'single' ? '#fff' : 'transparent',
              shadowColor: quoteMode === 'single' ? '#000' : 'transparent',
              shadowOpacity: quoteMode === 'single' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: quoteMode === 'single' ? '700' : '500',
                color: quoteMode === 'single' ? '#059669' : '#64748B',
              }}
            >
              Single Custom Price
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Request Brief Card */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
            Job Request Context
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 4 }}>
            {leadTitle}
          </Text>
          <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Customer is requesting diagnosis and repair today with warranty.
          </Text>
        </View>

        {quoteMode === 'tiered' ? (
          <>
            {/* Screen 20: 3-Tier Builder */}
            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Info size={18} color="#059669" />
              <Text style={{ fontSize: 12, color: '#065F46', marginLeft: 8, flex: 1, lineHeight: 18 }}>
                Pros offering 3 tiers convert 38% more bookings. Customers love having control over their budget.
              </Text>
            </View>

            {tiers.map((tier, idx) => (
              <View
                key={tier.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: tier.id === 'better' ? '#059669' : '#E2E8F0',
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{tier.name}</Text>
                    <View
                      style={{
                        backgroundColor: tier.id === 'better' ? '#ECFDF5' : '#F1F5F9',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: tier.id === 'better' ? '#059669' : '#475569',
                        }}
                      >
                        {tier.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#059669' }}>₹{tier.price}</Text>
                </View>

                <Text style={{ fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 18 }}>
                  {tier.scope}
                </Text>

                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ShieldCheck size={13} color="#059669" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155', marginLeft: 4 }}>
                      {tier.warranty}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>{tier.materials}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* Screen 10: Single Quote Composer */}
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
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                Quote Total Price (₹)
              </Text>
              <TextInput
                value={singlePrice}
                onChangeText={setSinglePrice}
                keyboardType="numeric"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#059669',
                  marginBottom: 14,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                Scope of Work & Diagnostics Included
              </Text>
              <TextInput
                value={singleScope}
                onChangeText={setSingleScope}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  color: '#1E293B',
                  lineHeight: 18,
                  minHeight: 80,
                  marginBottom: 14,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                Estimated Arrival Time
              </Text>
              <TextInput
                value={arrivalWindow}
                onChangeText={setArrivalWindow}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  color: '#1E293B',
                  marginBottom: 14,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
                Warranty & Guarantee Term
              </Text>
              <TextInput
                value={warrantyPeriod}
                onChangeText={setWarrantyPeriod}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  color: '#1E293B',
                }}
              />
            </View>
          </>
        )}

        {/* Submit Quote Button */}
        <Pressable
          onPress={handleSendQuote}
          style={{
            backgroundColor: '#059669',
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            shadowColor: '#059669',
            shadowOpacity: 0.25,
            shadowRadius: 5,
            marginTop: 8,
          }}
        >
          <Send size={18} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 }}>
            Send Proposal to Customer
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
