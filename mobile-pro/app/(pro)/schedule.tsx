/**
 * Fieseros Pro — Schedule & Working Hours Screen
 * Covers:
 *   - Screen 13: Calendar Timeline Grid
 *   - Screen 14: Availability & Working Hours Settings
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  CheckCircle2,
} from 'lucide-react-native';

const SCHEDULED_BLOCKS = [
  {
    id: 'block-1',
    time: '09:30 AM - 11:00 AM',
    title: 'Water Heater Anode Rod Service',
    customer: 'Nikhil Mathur',
    location: 'Indiranagar 100ft Rd',
    status: 'completed',
  },
  {
    id: 'block-2',
    time: '12:30 PM - 01:30 PM',
    title: 'Travel & Lunch Buffer',
    customer: 'System Buffer',
    location: 'En route to Domlur',
    status: 'buffer',
  },
  {
    id: 'block-3',
    time: '03:30 PM - 05:00 PM',
    title: 'Kitchen Pipe Burst & Sink Trap Fix',
    customer: 'Vikram Roy',
    location: 'Prestige Tower, Indiranagar',
    status: 'active',
  },
  {
    id: 'block-4',
    time: '05:30 PM - 07:00 PM',
    title: 'Daikin 1.5T AC Deep Cleaning',
    customer: 'Meenakshi Iyer',
    location: 'Domlur Layout',
    status: 'upcoming',
  },
];

export default function ProScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState('Today');
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(true);
  const [emergencySurcharge, setEmergencySurcharge] = useState(true);

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
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Schedule & Dispatch</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Timeline calendar & working hours
            </Text>
          </View>
        </View>

        {/* Date Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          {['Yesterday', 'Today', 'Tomorrow', 'Thu', 'Fri', 'Sat'].map((d) => {
            const isSel = selectedDay === d;
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                style={{
                  backgroundColor: isSel ? '#059669' : '#F1F5F9',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSel ? '700' : '500',
                    color: isSel ? '#fff' : '#475569',
                  }}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Availability Settings Card (Screen 14) */}
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
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
            Dispatch Rules & Working Hours
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>Instant Auto-Accept</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                Auto-confirm appointments if you have a free 2-hour window.
              </Text>
            </View>
            <Switch
              value={autoAcceptEnabled}
              onValueChange={setAutoAcceptEnabled}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={autoAcceptEnabled ? '#059669' : '#94A3B8'}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>Emergency After-Hours Surcharge (+50%)</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                Automatically apply emergency multiplier for 8:00 PM – 7:00 AM bookings.
              </Text>
            </View>
            <Switch
              value={emergencySurcharge}
              onValueChange={setEmergencySurcharge}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={emergencySurcharge ? '#059669' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Timeline blocks (Screen 13) */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
          Today's Timeline Grid
        </Text>

        {SCHEDULED_BLOCKS.map((block) => {
          const isBuffer = block.status === 'buffer';
          const isActive = block.status === 'active';
          return (
            <View
              key={block.id}
              style={{
                flexDirection: 'row',
                marginBottom: 12,
              }}
            >
              {/* Left Time Column */}
              <View style={{ width: 80, paddingTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                  {block.time.split(' - ')[0]}
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{block.time.split(' - ')[1]}</Text>
              </View>

              {/* Right Content Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: isBuffer ? '#F8FAFC' : '#fff',
                  borderLeftWidth: 4,
                  borderLeftColor: isActive ? '#059669' : isBuffer ? '#CBD5E1' : '#3B82F6',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isBuffer ? '#64748B' : '#0F172A',
                    }}
                  >
                    {block.title}
                  </Text>
                  {isActive && (
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>NOW</Text>
                    </View>
                  )}
                </View>

                {!isBuffer && (
                  <>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{block.customer}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <MapPin size={11} color="#64748B" />
                      <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 4 }}>{block.location}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
