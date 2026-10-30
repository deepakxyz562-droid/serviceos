import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const DAYS = [
  { day: 'MON', date: 26, posts: 1 },
  { day: 'TUE', date: 27, posts: 0 },
  { day: 'WED', date: 28, posts: 1 },
  { day: 'THU', date: 29, posts: 0 },
  { day: 'FRI', date: 30, posts: 2 },
  { day: 'SAT', date: 31, posts: 1 },
  { day: 'SUN', date: 1, posts: 0 },
];

export function SocialCalendarCard({
  pendingApprovalCount = 0,
}: {
  pendingApprovalCount?: number;
}) {
  const router = useRouter();
  const [selectedDayIndex, setSelectedDayIndex] = useState(4); // Friday by default

  const selectedDay = DAYS[selectedDayIndex];

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
        marginBottom: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Social Calendar</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/marketing')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Manage Posts →</Text>
        </Pressable>
      </View>

      {/* Gradient pending approval banner (Screenshot 08.55.28 (2)) */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/marketing')}
        style={({ pressed }) => ({
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#9333EA',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <MaterialIcons name="schedule" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
            {pendingApprovalCount} posters pending for approval
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
      </Pressable>

      {/* Calendar Week Carousel */}
      <View style={{ gap: 12 }}>
        {/* Month Navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Pressable hitSlop={8} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={20} color="#64748B" />
          </Pressable>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>October 2026</Text>
          <Pressable hitSlop={8} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-right" size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Days Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAYS.map((d, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <Pressable
                key={`${d.day}-${d.date}`}
                onPress={() => setSelectedDayIndex(idx)}
                style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 7,
                  borderRadius: 12,
                  backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isSelected ? '#BFDBFE' : '#F1F5F9',
                  minWidth: 40,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#2563EB' : '#94A3B8',
                  }}
                >
                  {d.day}
                </Text>
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#2563EB' : '#334155',
                    marginTop: 4,
                  }}
                >
                  {d.date}
                </Text>
                {d.posts > 0 ? (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: isSelected ? '#2563EB' : '#EA580C',
                      marginTop: 4,
                    }}
                  />
                ) : (
                  <View style={{ width: 5, height: 5, marginTop: 4 }} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Selected Day Schedule Preview */}
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 8,
          }}
        >
          {selectedDay.posts > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#1D4ED8' }}>Google Business</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>10:30 AM</Text>
                </View>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>Scheduled</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                Weekend Special Offer · Quality Services in Local Area
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                No posts scheduled for {selectedDay.day}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/marketing')}
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>＋ Add Post</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
