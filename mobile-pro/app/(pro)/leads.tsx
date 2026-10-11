/**
 * Fieseros Pro — Lead Radar & Job Requests Screen
 * Covers:
 *   - Screen 08: New Job Requests Feed
 *   - Screen 09: Job Request Details Sheet
 *   - Screen 19: Lead Filters & Radius Settings
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Radio,
  Filter,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronRight,
  Send,
  X,
  Sparkles,
  Camera,
  CheckCircle2,
  DollarSign,
  Shield,
  SlidersHorizontal,
} from 'lucide-react-native';

interface Lead {
  id: string;
  category: string;
  title: string;
  description: string;
  customerName: string;
  neighborhood: string;
  distanceKm: number;
  urgency: 'urgent' | 'normal' | 'flexible';
  budgetEstimate: string;
  preferredTime: string;
  propertyType: string;
  hasPhoto: boolean;
  receivedMinutesAgo: number;
}

const INITIAL_LEADS: Lead[] = [
  {
    id: 'req-101',
    category: 'Plumbing',
    title: 'Main Kitchen Drain Clog & Leaking P-Trap',
    description: 'Water is backing up into both sink bowls when dishwasher drains. P-trap underneath appears to have a hairline crack dripping into cabinet.',
    customerName: 'Ananya S.',
    neighborhood: 'Indiranagar 12th Main',
    distanceKm: 2.1,
    urgency: 'urgent',
    budgetEstimate: '₹1,000 - ₹1,400',
    preferredTime: 'Today, within 2 hours',
    propertyType: '3 BHK Apartment',
    hasPhoto: true,
    receivedMinutesAgo: 6,
  },
  {
    id: 'req-102',
    category: 'AC & HVAC',
    title: 'Daikin Inverter AC Not Cooling + Ice on Copper Pipe',
    description: 'Indoor blower works but outdoor compressor is making buzzing noise. Copper pipe has visible frost. Need urgent gas recharge & leak check.',
    customerName: 'Karthik V.',
    neighborhood: 'Domlur Stage 2',
    distanceKm: 3.8,
    urgency: 'urgent',
    budgetEstimate: '₹1,500 - ₹2,200',
    preferredTime: 'Today, afternoon',
    propertyType: 'Independent House',
    hasPhoto: true,
    receivedMinutesAgo: 14,
  },
  {
    id: 'req-103',
    category: 'Electrical',
    title: 'Main MCB Tripping Repeatedly when Geyser Turned On',
    description: 'Geyser causes 32A MCB to trip instantly. Suspected heating element short circuit or wiring fault in distribution board.',
    customerName: 'Meera Rao',
    neighborhood: 'Koramangala 4th Block',
    distanceKm: 4.5,
    urgency: 'urgent',
    budgetEstimate: '₹800 - ₹1,200',
    preferredTime: 'Today, 4:00 PM',
    propertyType: 'Villa',
    hasPhoto: false,
    receivedMinutesAgo: 28,
  },
  {
    id: 'req-104',
    category: 'Plumbing',
    title: 'Overhead Sump Float Valve Replacement',
    description: 'Overhead tank overflowing constantly as mechanical float valve is jammed. Need new brass ball valve installed with safety overflow pipe test.',
    customerName: 'Suresh Kumar',
    neighborhood: 'HAL 3rd Stage',
    distanceKm: 5.2,
    urgency: 'normal',
    budgetEstimate: '₹1,200 - ₹1,800',
    preferredTime: 'Tomorrow morning',
    propertyType: 'Standalone Building',
    hasPhoto: true,
    receivedMinutesAgo: 45,
  },
];

export default function ProLeadsScreen() {
  const [filterType, setFilterType] = useState<'all' | 'nearby' | 'high_budget' | 'urgent'>('all');
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [maxRadius, setMaxRadius] = useState<number>(15);

  const filteredLeads = leads.filter((lead) => {
    if (filterType === 'nearby') return lead.distanceKm <= 3.5;
    if (filterType === 'urgent') return lead.urgency === 'urgent';
    if (filterType === 'high_budget') return lead.budgetEstimate.includes('2,') || lead.budgetEstimate.includes('1,8');
    return true;
  });

  const handleDismissLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleOpenQuoteComposer = (lead: Lead) => {
    setSelectedLead(null);
    router.push({
      pathname: '/(pro)/quote-composer',
      params: {
        leadId: lead.id,
        category: lead.category,
        title: lead.title,
        customerName: lead.customerName,
        neighborhood: lead.neighborhood,
      },
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
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Lead Radar</Text>
              <View
                style={{
                  backgroundColor: '#ECFDF5',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginLeft: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                  {filteredLeads.length} NEW
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Targeting: Indiranagar + {maxRadius} km radius
            </Text>
          </View>

          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <SlidersHorizontal size={14} color="#334155" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginLeft: 4 }}>Filter</Text>
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {[
            { id: 'all', label: 'All Leads' },
            { id: 'urgent', label: '⚡ Urgent & Today' },
            { id: 'nearby', label: '📍 Nearby (<3.5 km)' },
            { id: 'high_budget', label: '💎 High Budget' },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilterType(tab.id as any)}
                style={{
                  backgroundColor: isActive ? '#059669' : '#F1F5F9',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#fff' : '#334155',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filteredLeads.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Radio size={48} color="#94A3B8" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
              Scanning your service radius...
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 }}>
              No open requests in this filter right now. New customer requests will notify you immediately.
            </Text>
          </View>
        ) : (
          filteredLeads.map((lead) => (
            <View
              key={lead.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: lead.urgency === 'urgent' ? '#FED7AA' : '#E2E8F0',
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Header Badges */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {lead.urgency === 'urgent' && (
                    <View
                      style={{
                        backgroundColor: '#FEF2F2',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <AlertTriangle size={11} color="#DC2626" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626', marginLeft: 3 }}>URGENT</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{lead.category}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{lead.receivedMinutesAgo}m ago</Text>
              </View>

              {/* Title & Customer */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 8 }}>
                {lead.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                {lead.description}
              </Text>

              {/* Location & Time */}
              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MapPin size={13} color="#64748B" />
                  <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
                    {lead.neighborhood} ({lead.distanceKm} km)
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={13} color="#64748B" />
                  <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>{lead.preferredTime}</Text>
                </View>
              </View>

              {/* Budget & Photo Attachment pill */}
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Customer Budget</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#059669', marginTop: 1 }}>
                    {lead.budgetEstimate}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => handleDismissLead(lead.id)}
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>Pass</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedLead(lead)}
                    style={{
                      backgroundColor: '#059669',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Send size={13} color="#fff" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', marginLeft: 5 }}>Review & Quote</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Screen 09: Lead Detail Modal */}
      {selectedLead && (
        <Modal visible animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                maxHeight: '85%',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                    {selectedLead.category.toUpperCase()} LEAD
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedLead(null)} hitSlop={10}>
                  <X size={20} color="#64748B" />
                </Pressable>
              </View>

              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{selectedLead.title}</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                Customer: {selectedLead.customerName} · {selectedLead.propertyType}
              </Text>

              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginVertical: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>PROBLEM DESCRIPTION</Text>
                <Text style={{ fontSize: 13, color: '#1E293B', lineHeight: 20 }}>{selectedLead.description}</Text>

                {selectedLead.hasPhoto && (
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
                    <Camera size={14} color="#059669" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669', marginLeft: 6 }}>
                      1 Photo attached by customer (Hairline pipe crack)
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Distance</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                    {selectedLead.distanceKm} km away
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Preferred Arrival</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                    {selectedLead.preferredTime}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Budget</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#059669', marginTop: 2 }}>
                    {selectedLead.budgetEstimate}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => handleOpenQuoteComposer(selectedLead)}
                style={{
                  backgroundColor: '#059669',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} color="#fff" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 }}>
                  Draft & Send Quote
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Screen 19: Radius Settings Filter Modal */}
      <Modal visible={showFilterModal} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
              Service Radius & Lead Rules
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
              Set how far you are willing to travel for new dispatches.
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 }}>
              Maximum Radius ({maxRadius} km)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[5, 10, 15, 25].map((km) => (
                <Pressable
                  key={km}
                  onPress={() => setMaxRadius(km)}
                  style={{
                    flex: 1,
                    backgroundColor: maxRadius === km ? '#059669' : '#F1F5F9',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: maxRadius === km ? '#fff' : '#475569' }}>
                    {km} km
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setShowFilterModal(false)}
              style={{
                backgroundColor: '#059669',
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Apply Radius</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
