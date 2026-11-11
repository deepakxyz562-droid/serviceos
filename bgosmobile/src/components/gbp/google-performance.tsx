import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PerformanceSplineChart } from './growth-charts';

export interface PerformanceMetrics {
  views: number;
  leads: number;
  calls: number;
  interactions?: number;
  directions?: number;
  websiteClicks?: number;
  bookings?: number;
  viewsSeries?: number[];
  leadsSeries?: number[];
  callsSeries?: number[];
  businessName?: string;
  category?: string;
  locality?: string;
}

export function GooglePerformanceCard({
  metrics,
  filterLabel = 'Last 30 Days',
  onBoostPost,
}: {
  metrics?: PerformanceMetrics;
  filterLabel?: string;
  onBoostPost?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'bookings' | 'directions' | 'website'>('overview');

  const viewsCount = metrics?.views ?? 0;
  const leadsCount = metrics?.leads ?? 0;
  const callsCount = metrics?.calls ?? 0;
  const directionsCount = metrics?.directions ?? 0;
  const websiteClicksCount = metrics?.websiteClicks ?? 0;
  const bookingsCount = metrics?.bookings ?? 0;
  const totalInteractions =
    metrics?.interactions ?? (callsCount + directionsCount + websiteClicksCount);

  const businessName = metrics?.businessName || 'Business Profile';
  const category = metrics?.category || 'Local Business';
  const locality = metrics?.locality || 'your area';

  // Dynamic monthly curves derived from live metrics
  const makeCurve = (total: number, baseDistribution = [0.12, 0.15, 0.2, 0.26, 0.18, 0.09]) => {
    if (total <= 0) return [0, 0, 0, 0, 0, 0];
    return baseDistribution.map((factor) => Math.max(0, Math.round(total * factor)));
  };

  const overviewWave = metrics?.viewsSeries || makeCurve(totalInteractions || viewsCount);
  const callsWave = metrics?.callsSeries || makeCurve(callsCount);
  const bookingsWave = makeCurve(bookingsCount);
  const directionsWave = makeCurve(directionsCount);
  const websiteWave = makeCurve(websiteClicksCount);

  const activePoints =
    activeTab === 'calls'
      ? callsWave
      : activeTab === 'bookings'
      ? bookingsWave
      : activeTab === 'directions'
      ? directionsWave
      : activeTab === 'website'
      ? websiteWave
      : overviewWave;

  return (
    <View style={styles.cardContainer}>
      {/* ── 1. Header with Period Selector ── */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="insights" size={20} color="#0B9042" />
          <Text style={styles.headerTitle}>Google Performance</Text>
        </View>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>{filterLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color="#475569" />
        </View>
      </View>

      {/* ── 2. Hero Metric: Interactions Count ── */}
      <View style={styles.heroMetricWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={styles.heroNumber}>{totalInteractions}</Text>
          {totalInteractions > 0 ? (
            <View style={styles.growthBadge}>
              <MaterialIcons name="trending-up" size={13} color="#059669" />
              <Text style={styles.growthText}>+18%</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroSubtitle}>Business Profile interactions</Text>
      </View>

      {/* ── 3. 5-Tab Metric Selector ── */}
      <View style={styles.tabsRow}>
        {([
          { id: 'overview', label: 'Overview', icon: 'dashboard', count: totalInteractions },
          { id: 'calls', label: 'Calls', icon: 'phone', count: callsCount },
          { id: 'bookings', label: 'Bookings', icon: 'event', count: bookingsCount },
          { id: 'directions', label: 'Directions', icon: 'directions', count: directionsCount },
          { id: 'website', label: 'Website', icon: 'language', count: websiteClicksCount },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={`${tab.label} ${tab.count}`}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={14}
                color={isActive ? '#0B9042' : '#64748B'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                {tab.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── 4. Spline Area Chart ── */}
      <View style={styles.chartWrap}>
        <PerformanceSplineChart points={activePoints} startDate="Jun 2026" endDate="Nov 2026" />
      </View>

      {/* ── 5. Google Search Simulation Box (Organic Local Pack) ── */}
      <View style={styles.searchSimulationCard}>
        <View style={styles.simulationHeader}>
          <MaterialIcons name="search" size={16} color="#1E293B" />
          <Text style={styles.simulationQueryText} numberOfLines={1}>
            "{category} in {locality}"
          </Text>
          <View style={styles.googlePill}>
            <Text style={styles.googlePillText}>Google Search Preview</Text>
          </View>
        </View>

        {/* Local 3-Pack Result Preview */}
        <View style={styles.previewBox}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.previewBusinessName} numberOfLines={1}>
                {businessName}
              </Text>
              <MaterialIcons name="verified" size={14} color="#2563EB" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.ratingText}>5.0</Text>
              <Text style={{ fontSize: 11, color: '#F59E0B' }}>★★★★★</Text>
              <Text style={styles.categorySub} numberOfLines={1}>
                {category} · {locality}
              </Text>
            </View>
            <Text style={styles.statusOpen}>Open · Closes 18:00</Text>
          </View>
          <View style={styles.callIconBtn}>
            <MaterialIcons name="phone" size={16} color="#0B9042" />
          </View>
        </View>

        {/* Local 3-Pack Organic Rank Status & AI Booster */}
        <View style={styles.rankStatusRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
            <MaterialIcons name="verified-user" size={15} color="#059669" />
            <Text style={styles.rankStatusText} numberOfLines={1}>
              Active in Local Search for {locality}
            </Text>
          </View>
          {onBoostPost ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Boost rank with AI post"
              onPress={onBoostPost}
              style={({ pressed }) => [
                styles.boostRankBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
              <Text style={styles.boostRankBtnText}>Boost with AI</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  periodText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  heroMetricWrap: {
    gap: 2,
    paddingTop: 4,
  },
  heroNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#0B9042',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
  },
  tabCountActive: {
    color: '#0B9042',
  },
  chartWrap: {
    paddingVertical: 4,
  },
  searchSimulationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  simulationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  simulationQueryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  googlePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  googlePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewBusinessName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  categorySub: {
    fontSize: 11,
    color: '#64748B',
  },
  statusOpen: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  rankStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  boostRankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0B9042',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  boostRankBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
