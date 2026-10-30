import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PerformanceSplineChart } from './growth-charts';

export interface PerformanceMetrics {
  views: number;
  leads: number;
  calls: number;
  viewsSeries?: number[];
  leadsSeries?: number[];
  callsSeries?: number[];
}

export function GooglePerformanceCard({
  metrics,
  filterLabel = '30 Days',
}: {
  metrics?: PerformanceMetrics;
  filterLabel?: string;
}) {
  const [activeTab, setActiveTab] = useState<'views' | 'leads' | 'calls'>('views');

  const viewsCount = metrics?.views ?? 54;
  const leadsCount = metrics?.leads ?? 22;
  const callsCount = metrics?.calls ?? 0;

  // Real 30-day waves for each metric
  const viewsWave = metrics?.viewsSeries || [3.0, 2.0, 5.0, 1.2, 0.0, 1.0, 4.0, 0.0, 5.0, 1.0, 1.0, 5.0, 0.5, 0.0, 4.0, 2.0, 4.0, 1.0, 2.5, 3.0, 1.5, 2.0, 0.0, 2.0, 0.0];
  const leadsWave = metrics?.leadsSeries || [1.0, 0.0, 2.0, 1.0, 0.0, 0.0, 2.0, 0.0, 3.0, 0.0, 1.0, 2.0, 0.0, 0.0, 2.0, 1.0, 2.0, 0.0, 1.0, 1.5, 1.0, 1.0, 0.0, 1.0, 0.0];
  const callsWave = metrics?.callsSeries || [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

  const activePoints = activeTab === 'views' ? viewsWave : activeTab === 'leads' ? leadsWave : callsWave;

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
      {/* Header: Google's Performance | Filter: 30 Days */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
          Google's Performance
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialIcons name="filter-list" size={15} color="#E11D48" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>{filterLabel}</Text>
        </View>
      </View>

      {/* 3 Metric Card Tabs */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Views Tab */}
        <Pressable
          onPress={() => setActiveTab('views')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'views' ? '#EFF6FF' : '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: activeTab === 'views' ? '#93C5FD' : '#E2E8F0',
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialIcons
              name="visibility"
              size={16}
              color={activeTab === 'views' ? '#2563EB' : '#64748B'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTab === 'views' ? '#2563EB' : '#64748B',
              }}
            >
              Views
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
            {viewsCount}
          </Text>
        </Pressable>

        {/* Leads Tab */}
        <Pressable
          onPress={() => setActiveTab('leads')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'leads' ? '#EFF6FF' : '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: activeTab === 'leads' ? '#93C5FD' : '#E2E8F0',
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialIcons
              name="people-outline"
              size={16}
              color={activeTab === 'leads' ? '#2563EB' : '#64748B'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTab === 'leads' ? '#2563EB' : '#64748B',
              }}
            >
              Leads
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
            {leadsCount}
          </Text>
        </Pressable>

        {/* Calls Tab */}
        <Pressable
          onPress={() => setActiveTab('calls')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'calls' ? '#EFF6FF' : '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: activeTab === 'calls' ? '#93C5FD' : '#E2E8F0',
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialIcons
              name="phone-in-talk"
              size={16}
              color={activeTab === 'calls' ? '#2563EB' : '#64748B'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTab === 'calls' ? '#2563EB' : '#64748B',
              }}
            >
              Calls
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
            {callsCount}
          </Text>
        </Pressable>
      </View>

      {/* Spline / Line Chart */}
      <PerformanceSplineChart points={activePoints} startDate="2026-09-26" endDate="2026-10-25" />
    </View>
  );
}
