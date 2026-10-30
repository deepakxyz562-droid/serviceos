import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function SocialCalendarCard({
  pendingApprovalCount = 0,
}: {
  pendingApprovalCount?: number;
}) {
  const router = useRouter();
  const [selectedDayIndex, setSelectedDayIndex] = useState(4); // Fri

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 14,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Social Calendar</Text>

      {/* Gradient pending banner */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/marketing')}
        style={({ pressed }) => ({
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#EA580C',
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
      <View style={{ gap: 10 }}>
        {/* Month Navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Pressable hitSlop={8} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={20} color="#64748B" />
          </Pressable>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>October 2026</Text>
          <Pressable hitSlop={8} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-right" size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Days Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAYS.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDayIndex(idx)}
                style={{
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#2563EB' : '#94A3B8',
                  }}
                >
                  {day}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#2563EB' : '#334155',
                    marginTop: 4,
                  }}
                >
                  {24 + idx}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
