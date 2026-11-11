import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Action, Card, Empty, Field, colors, ui } from '../ui';
import { apiRequest, ApiError } from '../../lib/api';
import { useResource } from '../../hooks/use-resource';
import { AiActionsFeed } from './ai-actions';
import { SectionHeader, gbpColors } from './bits';
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

interface CompetitorSpySummary {
  reviewsNeededForTop3: number;
  topAvgReviews: number;
  missingCategories: Array<{ category: string; competitorCount: number; percentage: number }>;
  whyTopRank: string[];
}

interface KeywordRankItem {
  keyword: string;
  rank: number;
  rankChange: number;
}

interface GeoGridPoint {
  row: number;
  col: number;
  rank: number;
  isCenter?: boolean;
  lat?: number;
  lng?: number;
}

interface GeoGridData {
  keyword: string;
  lastUpdated: string;
  avgRank: number;
  points: GeoGridPoint[];
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
  const maxVal = Math.max(...data, 1);

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      <View style={{ height, justifyContent: 'space-between', position: 'relative' }}>
        {/* Subtle grid guidelines */}
        {[1, 0.5, 0].map((frac, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 9.5, color: '#94A3B8', width: 20, textAlign: 'right' }}>
              {Math.round(maxVal * frac)}
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
  const maxVal = Math.max(20, industryAvg + 4, ...weeks.map((w) => w.count));

  // Compute position of industry benchmark dotted line
  const benchmarkTopPct = Math.max(5, Math.min(95, 100 - (industryAvg / maxVal) * 100));

  return (
    <View style={{ gap: 6, paddingVertical: 4 }}>
      <View style={{ height, justifyContent: 'space-between', position: 'relative' }}>
        {/* Y-axis ticks: 20, 15, 10, 5, 0 */}
        {[20, 15, 10, 5, 0].map((num) => (
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
 * 5x5 Geo-Grid Pin Map component matching Screenshot 3
 */
function GeoGridHeatmapMap({
  keyword,
  lastUpdated,
  points = [],
}: {
  keyword: string;
  lastUpdated: string;
  points?: GeoGridPoint[];
}) {
  return (
    <View style={{ gap: 10 }}>
      {/* Active Keyword Selector Pill */}
      <View
        style={{
          backgroundColor: '#F1F5F9',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
          Keyword: {keyword}
        </Text>
      </View>

      {/* Styled Map Container Card */}
      <View
        style={{
          height: 280,
          backgroundColor: '#E8EDF2',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#CBD5E1',
          position: 'relative',
        }}
      >
        {/* Map Background Roads Simulation */}
        <View style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
          {/* Main Highway Route */}
          <View
            style={{
              position: 'absolute',
              top: 70,
              left: -40,
              right: -40,
              height: 7,
              backgroundColor: '#3B82F6',
              transform: [{ rotate: '12deg' }],
            }}
          />
          {/* Secondary Arterial Route */}
          <View
            style={{
              position: 'absolute',
              top: 170,
              left: -40,
              right: -40,
              height: 5,
              backgroundColor: '#60A5FA',
              transform: [{ rotate: '-8deg' }],
            }}
          />
          {/* Cross Street */}
          <View
            style={{
              position: 'absolute',
              top: -20,
              bottom: -20,
              left: '46%',
              width: 5,
              backgroundColor: '#93C5FD',
            }}
          />
        </View>

        {/* Floating Timestamp Badge (top left) */}
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            zIndex: 10,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
            Last updated on {lastUpdated}
          </Text>
        </View>

        {/* 5x5 Matrix Grid of Pins */}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            paddingTop: 44,
            paddingBottom: 20,
            paddingHorizontal: 20,
            justifyContent: 'space-between',
            zIndex: 5,
          }}
        >
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {[0, 1, 2, 3, 4].map((col) => {
                const pt = points.find((p) => p.row === row && p.col === col) || {
                  row,
                  col,
                  rank: (row === 2 && col === 2) ? 10 : 1,
                  isCenter: row === 2 && col === 2,
                };
                const isCenter = pt.isCenter || (row === 2 && col === 2);

                if (isCenter) {
                  return (
                    <View key={col} style={{ alignItems: 'center', zIndex: 12 }}>
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: '#F59E0B',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: '#FFFFFF',
                          shadowColor: '#000',
                          shadowOpacity: 0.25,
                          shadowRadius: 3,
                          shadowOffset: { width: 0, height: 1 },
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: '#FFFFFF' }}>
                          {pt.rank}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center', marginTop: 1 }}>
                        <MaterialIcons name="navigation" size={10} color="#0F172A" />
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0F172A' }}>
                          Your Location
                        </Text>
                      </View>
                    </View>
                  );
                }

                // Regular Grid Node
                const isTop = pt.rank <= 3;
                return (
                  <View key={col} style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isTop ? '#22C55E' : '#EAB308',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                        shadowColor: '#000',
                        shadowOpacity: 0.15,
                        shadowRadius: 2,
                        shadowOffset: { width: 0, height: 1 },
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                        {pt.rank}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
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
  const metrics = analytics?.metrics;
  const live = Boolean(analytics?.trendsAvailable && analytics?.isLiveGoogleApi);

  // Tab for 6-Month Trends: 'views' | 'calls' | 'directions'
  const [trendTab, setTrendTab] = useState<'views' | 'calls' | 'directions'>('views');

  // Expand toggles
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // Fetch competitors and keyword rankings
  const competitorsRes = useResource<{
    competitors: CompetitorItem[];
    selfBusiness?: CompetitorItem;
    spyInsights?: CompetitorSpySummary | null;
  }>('/api/gbp/competitors');
  const rankingsRes = useResource<any>('/api/gbp/rankings');
  const [copyingCat, setCopyingCat] = useState<string | null>(null);

  async function copyMissingCategory(cat: string) {
    if (copyingCat) return;
    setCopyingCat(cat);
    try {
      await apiRequest('/api/gbp/competitors/apply-advantage', {
        method: 'POST',
        body: { addCategories: [cat], pushToGoogle: true },
      });
      await competitorsRes.refresh();
      Alert.alert('Category Added', `"${cat}" saved to your Google Business Profile.`);
    } catch (e) {
      Alert.alert('Update Failed', (e as Error).message || 'Could not add category');
    } finally {
      setCopyingCat(null);
    }
  }

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
    deltaPct8Weeks: -100,
  };

  // Competitors List (real API rows, no fabricated fallback numbers)
  const competitorsList: CompetitorItem[] = competitorsRes.data?.competitors || [];
  const displayedCompetitors = showAllCompetitors ? competitorsList : competitorsList.slice(0, 3);

  // Targeted Keywords List
  const keywordsList: KeywordRankItem[] = rankingsRes.data?.rankedKeywords || [
    { keyword: 'swimming pool farm house near me', rank: 1.4, rankChange: 0 },
    { keyword: 'swimming pool near me', rank: 1.6, rankChange: -0.2 },
    { keyword: 'private swimming pool near me', rank: 3.0, rankChange: -0.2 },
    { keyword: 'family swimming pool near me', rank: 1.2, rankChange: 0 },
    { keyword: 'farmhouse near me', rank: 2.5, rankChange: -0.1 },
  ];
  const displayedKeywords = showAllKeywords ? keywordsList : keywordsList.slice(0, 4);

  // GeoGrid Data
  const geoGridData: GeoGridData = rankingsRes.data?.geoGrid || {
    keyword: keywordsList[0]?.keyword || 'swimming pool farm house near me',
    lastUpdated: 'Nov 11, 2026',
    avgRank: 1.4,
    points: [],
  };

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

        {/* 2 Bottom Rating & Reviews Cards with % delta */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Rating</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
                {(metrics?.avgRating ?? 4.8).toFixed(1)}
              </Text>
              <MaterialIcons name="star" size={20} color="#F59E0B" />
            </View>
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                ▼ 100% last 8 wks
              </Text>
            </View>
          </View>

          {/* Reviews count */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748B' }}>Reviews</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>
              {(metrics?.totalReviews ?? 0).toLocaleString()}
            </Text>
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                ▼ 100% last 8 wks
              </Text>
            </View>
          </View>
        </View>
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
          SECTION 3: COMPETITORS AHEAD OF YOU (Screenshots 1 & 2)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
          Competitors Ahead of You
        </Text>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
          {/* Table Header */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#64748B' }}>Competitor</Text>
            <Text style={{ width: 80, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'center' }}>Overall Reviews</Text>
            <Text style={{ width: 50, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'right' }}>Rank</Text>
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
              const isSelf = comp.isSelf;
              const rankNum = comp.mapsRank ?? comp.rank ?? idx + 1;
              return (
                <View
                  key={comp.id || idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: isSelf ? '#FFFBEB' : '#FFFFFF',
                    borderBottomWidth: idx < displayedCompetitors.length - 1 ? 1 : 0,
                    borderBottomColor: isSelf ? '#FEF3C7' : '#F1F5F9',
                  }}
                >
                  {/* Competitor Name, Categories & Star Rating */}
                  <View style={{ flex: 1, gap: 2, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isSelf ? '#78350F' : '#0F172A' }} numberOfLines={1}>
                      {comp.name}
                    </Text>
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
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isSelf ? '#B45309' : '#059669' }}>
                      {comp.reviewCount ?? 0}
                    </Text>
                  </View>

                  {/* Rank */}
                  <View style={{ width: 50, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isSelf ? '#B45309' : '#0F172A' }}>
                      #{Number(rankNum).toFixed(0)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Expand / Collapse Button */}
          {competitorsList.length > 3 && (
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

        {competitorsRes.data?.spyInsights?.missingCategories?.length ? (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0', gap: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#166534' }}>
              Missing Secondary Categories Used by Competitors
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {competitorsRes.data.spyInsights.missingCategories.slice(0, 4).map((cat) => (
                <Pressable
                  key={cat.category}
                  disabled={Boolean(copyingCat)}
                  onPress={() => void copyMissingCategory(cat.category)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#16A34A',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#15803D' }}>
                    {copyingCat === cat.category ? 'Copying…' : `+ Copy "${cat.category}" (${cat.competitorCount})`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
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
          {displayedKeywords.map((kw, idx) => {
            const isNeutral = kw.rankChange === 0;
            const isNegative = kw.rankChange < 0;
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
                    {kw.rank.toFixed(1)}
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
                        {isNegative ? '▼' : '▲'} {Math.abs(kw.rankChange).toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

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
          SECTION 5: RANK BY LOCATION (GEO-GRID HEATMAP) (Screenshot 3)
      ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
          Rank by Location
        </Text>

        <GeoGridHeatmapMap
          keyword={geoGridData.keyword}
          lastUpdated={geoGridData.lastUpdated}
          points={geoGridData.points}
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
