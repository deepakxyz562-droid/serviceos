import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Star,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Phone,
  MessageSquare,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

interface ProposalQuote {
  id: string;
  providerName: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  arrivalWindow: string;
  warranty: string;
  includesParts: boolean;
  price: number;
  badge?: string;
  bio: string;
}

export default function CustomerQuotesScreen() {
  const [isSearching, setIsSearching] = useState(true);
  const [activeTab, setActiveTab] = useState<'recommended' | 'lowest' | 'earliest'>('recommended');
  const [selectedPro, setSelectedPro] = useState<ProposalQuote | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Radar animation timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const proposals: ProposalQuote[] = [
    {
      id: 'prop-1',
      providerName: 'Ravi Plumbing Services',
      avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=150&q=80',
      rating: 4.8,
      reviewCount: 120,
      verified: true,
      arrivalWindow: 'Tomorrow, 10 AM - 12 PM',
      warranty: '1 year warranty',
      includesParts: true,
      price: 1200,
      badge: 'Recommended',
      bio: 'Experienced plumber specializing in residential pipe replacement, drain cleaning, and water heater repair. 5+ years experience, 1,200+ completed jobs.',
    },
    {
      id: 'prop-2',
      providerName: 'QuickFix Home Services',
      avatar: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=150&q=80',
      rating: 4.6,
      reviewCount: 85,
      verified: true,
      arrivalWindow: 'Tomorrow, 9 AM - 11 AM',
      warranty: '6 months warranty',
      includesParts: true,
      price: 1600,
      badge: 'Earliest',
      bio: 'Fast-response home repair fleet with emergency equipment on van. Specializes in rapid leak stoppage and sanitary fittings.',
    },
    {
      id: 'prop-3',
      providerName: 'Prime Plumbing Co.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 4.7,
      reviewCount: 76,
      verified: true,
      arrivalWindow: 'Tomorrow, 11 AM - 1 PM',
      warranty: '3 months warranty',
      includesParts: false,
      price: 1350,
      bio: 'Affordable licensed plumbers across Bengaluru South. Reliable diagnostic testing and transparent parts pricing.',
    },
  ];

  const handleSelectBook = (pro: ProposalQuote) => {
    setDetailModalVisible(false);
    // Navigate to booking tracking / confirmation
    router.push('/(customer)/bookings');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>
          3 Quotes for Your Request
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* SCREEN 11: FINDING PROFESSIONALS RADAR STATE */}
      {isSearching ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: '#ECFDF5',
              borderWidth: 2,
              borderColor: '#10B981',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <ActivityIndicator size="large" color="#059669" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' }}>
            Finding the best professionals for you
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 260 }}>
            We've sent your request to verified local pros. 3–5 pros are reviewing your photos and details.
          </Text>

          <View style={{ marginTop: 24, gap: 8, width: '100%', maxWidth: 280 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={{ fontSize: 12, color: '#334155' }}>Matching with verified pros</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={{ fontSize: 12, color: '#334155' }}>Checking availability</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={{ fontSize: 12, color: '#059669', fontWeight: 'bold' }}>Collecting upfront quotes</Text>
            </View>
          </View>
        </View>
      ) : (
        /* SCREEN 12: 3 QUOTES LIST */
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
          {/* Subheader info & filters */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Compare and choose the best option:</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 2 }}>
              {(['recommended', 'lowest', 'earliest'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setActiveTab(t)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: activeTab === t ? '#FFFFFF' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: activeTab === t ? 'bold' : '500',
                      color: activeTab === t ? '#059669' : '#64748B',
                    }}
                  >
                    {t === 'recommended' ? 'Best' : t === 'lowest' ? 'Lowest' : 'Fast'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3 Proposal Cards */}
          {proposals.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                borderWidth: item.badge === 'Recommended' ? 2 : 1,
                borderColor: item.badge === 'Recommended' ? '#10B981' : '#E2E8F0',
                padding: 14,
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {item.badge && (
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#047857' }}>{item.badge}</Text>
                </View>
              )}

              {/* Provider Info Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={{ uri: item.avatar }}
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                  />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A' }}>
                        {item.providerName}
                      </Text>
                      {item.verified && <ShieldCheck size={14} color="#059669" />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0F172A' }}>{item.rating}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>({item.reviewCount} reviews)</Text>
                    </View>
                  </View>
                </View>

                {/* Price */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>₹{item.price}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B' }}>Upfront Total</Text>
                </View>
              </View>

              {/* Details & Inclusions */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, gap: 4 }}>
                <Text style={{ fontSize: 11, color: '#334155' }}>⏱️ Arrival: {item.arrivalWindow}</Text>
                <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>✓ {item.warranty}</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {item.includesParts ? '✓ Parts & labor included' : '• Labor & inspection only'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPro(item);
                    setDetailModalVisible(true);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectBook(item)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: '#059669',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' }}>Select & Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* SCREEN 13: PROVIDER DETAILED PROFILE MODAL */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedPro && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>Provider Profile</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Image
                  source={{ uri: selectedPro.avatar }}
                  style={{ width: 80, height: 80, borderRadius: 24 }}
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>
                  {selectedPro.providerName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={16} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669' }}>
                    Verified Fieseros Pro Partner
                  </Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: 12,
                  justifyContent: 'space-around',
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Experience</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 2 }}>5+ Years</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Completed</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 2 }}>1,200+ Jobs</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Response</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 2 }}>&lt; 30 mins</Text>
                </View>
              </View>

              {/* Bio */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 }}>About</Text>
                <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>{selectedPro.bio}</Text>
              </View>

              {/* Bottom Sticky Action */}
              <View style={{ marginTop: 24, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Arrival: {selectedPro.arrivalWindow}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>₹{selectedPro.price}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleSelectBook(selectedPro)}
                  style={{
                    backgroundColor: '#059669',
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Confirm & Book Pro</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}
