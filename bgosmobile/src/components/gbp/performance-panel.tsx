import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Action, Card, Empty, Field, colors, ui } from '../ui';
import { apiRequest, ApiError } from '../../lib/api';
import { useResource } from '../../hooks/use-resource';
import { AiActionsFeed } from './ai-actions';
import { SectionHeader, gbpColors } from './bits';
import { GeoGridMap, type GeoGridPointItem } from './geo-grid-map';
import type { AiAction, AnalyticsResult } from './types';

interface CompetitorItem {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  rank?: number;
  mapsRank?: number | null;
  primaryCategoryLabel?: string | null;
  secondaryCategories?: string[];
  attributesList?: string[];
  photoCount?: number;
  isSelf?: boolean;
}

interface KeywordRankItem {
  keyword: string;
  rank: number | null;
  rankChange?: number | null;
}

interface GeoGridData {
  hasScans?: boolean;
  keyword: string;
  lastUpdated: string | null;
  avgRank: number | null;
  top3Pct?: number | null;
  gridSize?: 3 | 5;
  radiusKm?: number;
  centerLat?: number | null;
  centerLng?: number | null;
  points: GeoGridPointItem[];
}

/**
 * 6-Month Line/Spline Chart matching Screenshot 4
 */
function SixMonthTrendLineChart({
  months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  data = [0, 0, 0, 0, 0, 0],
  height = 110,
}: {
  months?: string[];
  data?: number[];
  height?: number;
}) {
  const maxVal = Math.max(...data, 2);

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      <View style={{ height, justifyContent: 'space-between', position: 'relative' }}>
        {/* Subtle grid guidelines */}
        {[maxVal, Math.round(maxVal * 0.5), 0].map((tickVal, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 9.5, color: '#94A3B8', width: 24, textAlign: 'right' }}>
              {tickVal}
            </Text>
            <View style={{ flex: 1, height: 1, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderStyle: 'dashed' }} />
          </View>
        ))}

        {/* Data curve nodes & baseline */}
        <View
          style={{
            position: 'absolute',
            left: 30,
            right: 12,
            bottom: 4,
            top: 4,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {/* Continuous baseline connecting stroke */}
          <View
            style={{
              position: 'absolute',
              left: 4,
              right: 4,
              bottom: 4,
              height: 2,
              backgroundColor: '#3B82F6',
            }}
          />

          {data.map((val, idx) => {
            const h = Math.max(4, (val / maxVal) * (height - 20));
            return (
              <View key={idx} style={{ alignItems: 'center', zIndex: 2, height: '100%', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#2563EB',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    marginBottom: h - 4,
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.3,
                    shadowRadius: 1,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Month Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 30, paddingRight: 12 }}>
        {months.map((m, idx) => (
          <Text key={idx} style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * 8-Week Review Velocity Bar Chart matching Screenshot 1
 */
function ReviewTrendsBarChart({
  weeks = [
    { label: 'W1', count: 0 },
    { label: 'W2', count: 0 },
    { label: 'W3', count: 0 },
    { label: 'W4', count: 0 },
    { label: 'W5', count: 0 },
    { label: 'W6', count: 0 },
    { label: 'W7', count: 0 },
    { label: 'This Week', count: 0 },
  ],
  industryAvg = 12,
  height = 140,
}: {
  weeks?: Array<{ label: string; count: number }>;
  industryAvg?: number;
  height?: number;
}) {
  const maxRaw = Math.max(20, industryAvg + 4, ...weeks.map((w) => w.count));
  const step = Math.max(5, Math.ceil(maxRaw / 4 / 5) * 5);
  const maxVal = step * 4;
  const ticks = [step * 4, step * 3, step * 2, step, 0];

  // Compute position of industry benchmark dotted line
  const benchmarkTopPct = Math.max(5, Math.min(95, 100 - (industryAvg / maxVal) * 100));

  return (
    <View style={{ gap: 6, paddingVertical: 4 }}>
      <View style={{ height, justifyContent: 'space-between', position: 'relative' }}>
        {/* Dynamic Y-axis ticks */}
        {ticks.map((num) => (
          <View key={num} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10, color: '#94A3B8', width: 18, textAlign: 'right' }}>
              {num}
            </Text>
            <View style={{ flex: 1, height: 1, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }} />
          </View>
        ))}

        {/* Dotted Industry Average Line */}
        <View
          style={{
            position: 'absolute',
            left: 28,
            right: 8,
            top: `${benchmarkTopPct}%`,
            zIndex: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                flex: 1,
                borderBottomWidth: 1.5,
                borderBottomColor: '#D97706',
                borderStyle: 'dashed',
              }}
            />
          </View>
          <Text
            style={{
              position: 'absolute',
              top: -16,
              left: 4,
              fontSize: 11,
              fontWeight: '800',
              color: '#B45309',
            }}
          >
            Industry Avg : {industryAvg}
          </Text>
        </View>

        {/* 8 Weekly Bars */}
        <View
          style={{
            position: 'absolute',
            left: 32,
            right: 8,
            bottom: 4,
            top: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            zIndex: 3,
          }}
        >
          {weeks.map((w, idx) => {
            const barH = Math.max(4, Math.round((w.count / maxVal) * (height - 24)));
            return (
              <View key={idx} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: 14,
                    height: barH,
                    backgroundColor: '#2563EB',
                    borderRadius: 4,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 32, paddingRight: 8 }}>
        {weeks.map((w, idx) => (
          <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }} numberOfLines={1}>
              {w.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Main Performance Panel matching Screenshots 1, 2, 3, 4
 */
export function PerformancePanel({
  analytics,
  analyticsLoading,
  isConnected,
  connecting,
  onConnect,
  aiActions,
  onOpenPosts,
  userEmail,
}: {
  analytics?: AnalyticsResult | null;
  analyticsLoading?: boolean;
  isConnected: boolean;
  connecting?: boolean;
  onConnect?: () => void;
  aiActions: AiAction[];
  onOpenPosts?: () => void;
  userEmail?: string;
}) {
  const router = useRouter();
  const metrics = analytics?.metrics;
  const live = Boolean(analytics?.trendsAvailable && analytics?.isLiveGoogleApi);

  // Tab for 6-Month Trends: 'views' | 'calls' | 'directions'
  const [trendTab, setTrendTab] = useState<'views' | 'calls' | 'directions'>('views');

  // Expand toggles + active Geo-Grid scan keyword
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [selectedGridKeyword, setSelectedGridKeyword] = useState<string | null>(null);

  // Fetch competitors and keyword rankings
  const competitorsRes = useResource<{
    competitors: CompetitorItem[];
    selfBusiness?: CompetitorItem;
  }>('/api/gbp/competitors');
  const rankingsRes = useResource<any>('/api/gbp/rankings');

  // Email summary state
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const [summaryEmail, setSummaryEmail] = useState('');
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);

  useEffect(() => {
    setSummaryEmail(userEmail || '');
  }, [userEmail]);

  async function toggleSummary(enabled: boolean) {
    setSummaryNotice(null);
    if (!enabled) {
      setSummaryEnabled(false);
      try {
        await apiRequest('/api/gbp/summary-settings', { method: 'POST', body: { enabled: false, email: summaryEmail } });
      } catch {}
      return;
    }
    Alert.alert(
      'Enable weekly email summary?',
      'Every week we will email your GBP performance summary (views, calls, directions, reviews)' +
        (summaryEmail ? ` to ${summaryEmail}` : '') +
        '.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          style: 'default',
          onPress: async () => {
            setSummaryBusy(true);
            try {
              await apiRequest('/api/gbp/summary-settings', {
                method: 'POST',
                body: { enabled: true, email: summaryEmail },
              });
              setSummaryEnabled(true);
              setSummaryNotice('Weekly GBP email summary enabled.');
            } catch (e: unknown) {
              setSummaryEnabled(false);
              setSummaryNotice(e instanceof Error ? e.message : 'Could not save the weekly summary setting.');
            } finally {
              setSummaryBusy(false);
            }
          },
        },
      ],
    );
  }

  // 6-Month Trends Data
  const sixMonths = analytics?.sixMonthTrends?.months || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const active6MonthData =
    trendTab === 'calls'
      ? analytics?.sixMonthTrends?.calls || [0, 0, 0, 0, 0, metrics?.callClicks || 0]
      : trendTab === 'directions'
      ? analytics?.sixMonthTrends?.directions || [0, 0, 0, 0, 0, metrics?.directionRequests || 0]
      : analytics?.sixMonthTrends?.views || [0, 0, 0, 0, 0, metrics?.totalViews || 0];

  // 8-Week Review Trends
  const reviewTrends = analytics?.reviewTrends || {
    avgReviewsPerWeek: 0.0,
    industryAvg: 12,
    weeks: [
      { label: 'W1', count: 0 },
      { label: 'W2', count: 0 },
      { label: 'W3', count: 0 },
      { label: 'W4', count: 0 },
      { label: 'W5', count: 0 },
      { label: 'W6', count: 0 },
      { label: 'W7', count: 0 },
      { label: 'This Week', count: 0 },
    ],
    deltaPct8Weeks: null as unknown as number,
  };

  // Competitors List (ensure user business row is included and always visible when collapsed)
  const rawCompetitorsList: CompetitorItem[] = competitorsRes.data?.competitors || [];
  const hasSelfInList = rawCompetitorsList.some((c) => c.isSelf);
  const competitorsList: CompetitorItem[] = useMemo(() => {
    if (hasSelfInList || !competitorsRes.data?.selfBusiness) {
      return rawCompetitorsList;
    }
    const merged = [...rawCompetitorsList, { ...competitorsRes.data.selfBusiness, isSelf: true }];
    merged.sort((a, b) => (a.mapsRank ?? a.rank ?? 999) - (b.mapsRank ?? b.rank ?? 999));
    return merged;
  }, [rawCompetitorsList, hasSelfInList, competitorsRes.data?.selfBusiness]);

  const selfCompEntry = useMemo(
    () => competitorsList.find((c) => c.isSelf) || competitorsRes.data?.selfBusiness || null,
    [competitorsList, competitorsRes.data?.selfBusiness],
  );
  const selfCompIndex = competitorsList.findIndex((c) => c.isSelf);

  const displayedCompetitors = useMemo(() => {
    if (showAllCompetitors) return competitorsList;
    const top3 = competitorsList.slice(0, 3);
    if (selfCompIndex >= 3 && competitorsList[selfCompIndex]) {
      return [...top3, competitorsList[selfCompIndex]];
    }
    if (selfCompIndex < 0 && competitorsRes.data?.selfBusiness) {
      return [...top3, { ...competitorsRes.data.selfBusiness, isSelf: true }];
    }
    return top3;
  }, [showAllCompetitors, competitorsList, selfCompIndex, competitorsRes.data?.selfBusiness]);

  // Targeted Keywords List (real API rows only)
  const keywordsList: KeywordRankItem[] = Array.isArray(rankingsRes.data?.rankedKeywords)
    ? rankingsRes.data.rankedKeywords
    : [];
  const displayedKeywords = showAllKeywords ? keywordsList : keywordsList.slice(0, 4);

  // GeoGrid Data (supports switching among scanned keywords)
  const availableGridScans: Array<any> = Array.isArray(rankingsRes.data?.gridScans)
    ? rankingsRes.data.gridScans
    : [];
  const activeGridScan = useMemo(() => {
    if (availableGridScans.length === 0) return null;
    if (selectedGridKeyword) {
      const found = availableGridScans.find((s) => s.keyword === selectedGridKeyword);
      if (found) return found;
    }
    return availableGridScans[0];
  }, [availableGridScans, selectedGridKeyword]);

  const geoGridData: GeoGridData = activeGridScan
    ? {
        keyword: activeGridScan.keyword,
        lastUpdated: activeGridScan.date || rankingsRes.data?.geoGrid?.lastUpdated || '',
        avgRank: activeGridScan.avgRank ?? 0,
        top3Pct: activeGridScan.top3Pct ?? 0,
        gridSize: activeGridScan.gridSize || 5,
        radiusKm: activeGridScan.radiusKm,
        centerLat: activeGridScan.centerLat ?? rankingsRes.data?.autoDefaults?.centerLat ?? null,
        centerLng: activeGridScan.centerLng ?? rankingsRes.data?.autoDefaults?.centerLng ?? null,
        points: Array.isArray(activeGridScan.points) ? activeGridScan.points : [],
      }
    : rankingsRes.data?.geoGrid || {
        keyword: keywordsList[0]?.keyword || '',
        lastUpdated: '',
        avgRank: 0,
        points: [],
      };
  const availableGridKeywords = useMemo(
    () => Array.from(new Set(availableGridScans.map((s) => String(s.keyword || '')).filter(Boolean))),
    [availableGridScans],
  );

  return (
    <View style={{ gap: 20 }}>
      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 1: GBP PERFORMANCE (Screenshot 4)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#2563EB' }}>G</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>GBP Performance</Text>
          <MaterialIcons name="info-outline" size={17} color="#94A3B8" />
        </View>

        {/* 3 Top Stat Tiles (Views, Calls, Directions) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Views</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
              {(metrics?.totalViews ?? 0).toLocaleString()}
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Calls</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
              {(metrics?.callClicks ?? 0).toLocaleString()}
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Directions</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
              {(metrics?.directionRequests ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Last 6 Months Trends Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Last 6 Months Trends</Text>

          {/* Segmented Controls: [Views] [Calls] [Directions] */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['views', 'calls', 'directions'] as const).map((tab) => {
              const isActive = trendTab === tab;
              const label = tab === 'views' ? 'Views' : tab === 'calls' ? 'Calls' : 'Directions';
              return (
                <Pressable
                  key={tab}
                  onPress={() => setTrendTab(tab)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isActive ? '#2563EB' : '#E2E8F0',
                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#2563EB' : '#64748B' }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Line Chart */}
          <SixMonthTrendLineChart months={sixMonths} data={active6MonthData} />
        </View>

        {/* 2 Bottom Rating & Reviews Cards with honest % delta */}
        {(() => {
          const totalRev = metrics?.totalReviews ?? 0;
          const avgRatingVal = typeof metrics?.avgRating === 'number' && metrics.avgRating > 0 && totalRev > 0
            ? metrics.avgRating.toFixed(1)
            : '—';
          const rawRevDelta: number | null =
            typeof (reviewTrends as any)?.deltaPct8Weeks === 'number'
              ? (reviewTrends as any).deltaPct8Weeks
              : typeof (metrics as any)?.reviewsDeltaPct8Wks === 'number'
                ? (metrics as any).reviewsDeltaPct8Wks
                : null;
          const revDeltaBadge =
            rawRevDelta == null
              ? { bg: '#F1F5F9', fg: '#64748B', label: 'No prior 8-wk baseline' }
              : rawRevDelta > 0
                ? { bg: '#DCFCE7', fg: '#16A34A', label: `▲ ${rawRevDelta}% last 8 wks` }
                : rawRevDelta < 0
                  ? { bg: '#FEE2E2', fg: '#DC2626', label: `▼ ${Math.abs(rawRevDelta)}% last 8 wks` }
                  : { bg: '#F1F5F9', fg: '#64748B', label: '0% last 8 wks' };

          return (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Rating</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
                    {avgRatingVal}
                  </Text>
                  <MaterialIcons name="star" size={20} color="#F59E0B" />
                </View>
                <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                    {totalRev > 0 ? `${metrics?.responseRate ?? 0}% reply rate` : 'No reviews yet'}
                  </Text>
                </View>
              </View>

              {/* Reviews count */}
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Reviews</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
                  {totalRev.toLocaleString()}
                </Text>
                <View style={{ backgroundColor: revDeltaBadge.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: revDeltaBadge.fg }}>
                    {revDeltaBadge.label}
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 2: REVIEW TRENDS - LAST 8 WEEKS (Screenshot 1)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
          Review Trends - last 8 weeks
        </Text>

        {/* Avg Reviews Top Card */}
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
            Your Avg. Reviews
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
            {reviewTrends.avgReviewsPerWeek.toFixed(1)} / Week
          </Text>
        </View>

        {/* Bar Chart Container */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <ReviewTrendsBarChart weeks={reviewTrends.weeks} industryAvg={reviewTrends.industryAvg} />
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 3: COMPETITORS AHEAD OF YOU (ALWAYS SHOWS YOUR BUSINESS RANK)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
            Competitors Ahead of You
          </Text>
          {selfCompEntry ? (
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                Your Rank: #{Math.round(Number(selfCompEntry.mapsRank ?? selfCompEntry.rank ?? 1))}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
          {/* Table Header */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#64748B' }}>Business</Text>
            <Text style={{ width: 80, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'center' }}>Reviews</Text>
            <Text style={{ width: 56, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'right' }}>Rank</Text>
          </View>

          {/* Table Rows */}
          {displayedCompetitors.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12.5, color: '#64748B' }}>
                {competitorsRes.loading ? 'Scanning nearby competitors…' : 'No local competitor rows loaded yet.'}
              </Text>
            </View>
          ) : (
            displayedCompetitors.map((comp, idx) => {
              const isSelf = Boolean(comp.isSelf);
              const rankNum = comp.mapsRank ?? comp.rank ?? idx + 1;
              const isPinnedSelfAfterGap = isSelf && !showAllCompetitors && selfCompIndex >= 3;
              return (
                <View
                  key={comp.id || idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: isSelf ? '#EFF6FF' : '#FFFFFF',
                    borderTopWidth: isPinnedSelfAfterGap ? 1.5 : 0,
                    borderTopColor: isPinnedSelfAfterGap ? '#93C5FD' : 'transparent',
                    borderBottomWidth: idx < displayedCompetitors.length - 1 ? 1 : 0,
                    borderBottomColor: isSelf ? '#DBEAFE' : '#F1F5F9',
                  }}
                >
                  {/* Business Name, YOU Badge, Categories & Star Rating */}
                  <View style={{ flex: 1, gap: 3, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isSelf ? '#1E3A8A' : '#0F172A', flexShrink: 1 }} numberOfLines={1}>
                        {comp.name}
                      </Text>
                      {isSelf ? (
                        <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>YOU</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <MaterialIcons name="star" size={13} color="#F59E0B" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                          {comp.rating != null ? comp.rating.toFixed(1) : '—'}
                        </Text>
                      </View>
                      {comp.primaryCategoryLabel ? (
                        <Text style={{ fontSize: 11, color: '#64748B', flex: 1 }} numberOfLines={1}>
                          · {comp.primaryCategoryLabel}
                          {(comp.secondaryCategories?.length || 0) > 0 ? ` (+${comp.secondaryCategories!.length})` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Overall Reviews */}
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isSelf ? '#1D4ED8' : '#059669' }}>
                      {comp.reviewCount ?? 0}
                    </Text>
                  </View>

                  {/* Rank */}
                  <View style={{ width: 56, alignItems: 'flex-end' }}>
                    <View
                      style={{
                        backgroundColor: isSelf ? '#2563EB' : rankNum <= 3 ? '#DCFCE7' : '#F1F5F9',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '800',
                          color: isSelf ? '#FFFFFF' : rankNum <= 3 ? '#15803D' : '#0F172A',
                        }}
                      >
                        #{Math.round(Number(rankNum))}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Expand / Collapse Button */}
          {(competitorsList.length > displayedCompetitors.length || showAllCompetitors) && competitorsList.length > 3 && (
            <Pressable
              onPress={() => setShowAllCompetitors(!showAllCompetitors)}
              style={{
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                flexDirection: 'row',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                {showAllCompetitors ? 'Show less' : 'Show more'}
              </Text>
              <MaterialIcons name={showAllCompetitors ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color="#2563EB" />
            </Pressable>
          )}
        </View>

      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 4: RANK FOR TARGETED KEYWORDS (Screenshots 2 & 3)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
            Rank for Targeted Keywords
          </Text>
          <MaterialIcons name="info-outline" size={17} color="#94A3B8" />
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
          {/* Table Header */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#64748B' }}>Keywords</Text>
            <Text style={{ width: 60, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'center' }}>Rank</Text>
            <Text style={{ width: 70, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'right' }}>(Change)</Text>
          </View>

          {/* Table Rows */}
          {displayedKeywords.length === 0 ? (
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>
                No keyword rankings recorded yet. Run AI Growth Autopilot to track your target search terms.
              </Text>
            </View>
          ) : (
            displayedKeywords.map((kw, idx) => {
              const rankChange = kw.rankChange ?? 0;
              const isNeutral = rankChange === 0;
              const isNegative = rankChange < 0;
              return (
                <View
                  key={kw.keyword + idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < displayedKeywords.length - 1 ? 1 : 0,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  {/* Numbered Keyword */}
                  <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: '#0F172A' }} numberOfLines={1}>
                    {idx + 1} {kw.keyword}
                  </Text>

                  {/* Rank */}
                  <View style={{ width: 60, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {typeof kw.rank === 'number' && kw.rank > 0 ? kw.rank.toFixed(1) : '—'}
                    </Text>
                  </View>

                  {/* Change Pill */}
                  <View style={{ width: 70, alignItems: 'flex-end' }}>
                    {isNeutral ? (
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>~</Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: isNegative ? '#FEE2E2' : '#DCFCE7',
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isNegative ? '#DC2626' : '#16A34A' }}>
                          {isNegative ? '▼' : '▲'} {Math.abs(rankChange).toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Expand / Collapse Button */}
          {keywordsList.length > 4 && (
            <Pressable
              onPress={() => setShowAllKeywords(!showAllKeywords)}
              style={{
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                flexDirection: 'row',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                {showAllKeywords ? 'Show less' : 'Show more'}
              </Text>
              <MaterialIcons name={showAllKeywords ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color="#2563EB" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 5: RANK BY LOCATION (GEO-GRID HEATMAP)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
            Rank by Location
          </Text>
          <Pressable onPress={() => router.push('/seo-growth?tab=grid')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Full Scanner →</Text>
          </Pressable>
        </View>

        <GeoGridMap
          keyword={geoGridData.keyword}
          lastUpdated={geoGridData.lastUpdated}
          avgRank={geoGridData.avgRank}
          top3Pct={geoGridData.top3Pct}
          gridSize={geoGridData.gridSize}
          radiusKm={geoGridData.radiusKm}
          centerLat={geoGridData.centerLat}
          centerLng={geoGridData.centerLng}
          points={geoGridData.points}
          availableKeywords={availableGridKeywords}
          onSelectKeyword={(kw) => setSelectedGridKeyword(kw)}
          compact
          onPressEmpty={() => router.push('/seo-growth?tab=grid')}
        />
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 6: AI ACTIONS FEED & WEEKLY SUMMARY
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 14 }}>
        <SectionHeader title="✨ AI Growth Actions" icon="rocket-launch" iconColor={gbpColors.ai} />
        <AiActionsFeed actions={aiActions} onOpenPosts={onOpenPosts} />

        {/* Weekly Email Summary Switch */}
        <Card style={{ gap: 10 }}>
          <SectionHeader title="Weekly email summary" icon="mail-outline" />
          <Field
            label="Send summaries to"
            placeholder="you@business.com"
            value={summaryEmail}
            onChangeText={setSummaryEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Email me every Monday</Text>
              <Text style={ui.caption}>A weekly digest of views, calls, directions and new reviews.</Text>
            </View>
            <Switch
              accessibilityLabel="Enable weekly email summary"
              value={summaryEnabled}
              onValueChange={(v) => void toggleSummary(v)}
              disabled={summaryBusy}
              trackColor={{ true: colors.brand, false: colors.line }}
              thumbColor="#FFFFFF"
            />
          </View>
          {summaryBusy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={ui.caption}>Saving…</Text>
            </View>
          ) : null}
          {summaryNotice ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand }}>{summaryNotice}</Text> : null}
        </Card>
      </View>
    </View>
  );
}
