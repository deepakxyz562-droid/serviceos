import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';

interface MetricDelta {
  value: number;
  prevValue: number;
  deltaPct: number;
}

interface KeywordUsedItem {
  keyword: string;
  volume: number;
  usedCount: number;
}

interface PostWeekItem {
  label: string;
  target: number;
  achieved: number;
}

interface ReportData {
  businessName: string;
  businessPhone: string;
  storeId?: string;
  appVersion: string;
  period: {
    key: string;
    label: string;
    comparisonLabel: string;
    currentLabel: string;
    previousLabel: string;
  };
  summary: {
    profileViews: MetricDelta;
    leads: MetricDelta;
    directionRequests: MetricDelta;
    mediaUploaded: MetricDelta;
    reviewReplies: MetricDelta;
    googlePosts: MetricDelta;
    calls: MetricDelta;
    engagementRate: MetricDelta;
    websiteVisits: MetricDelta;
  };
  actionReport: {
    keywordsUsed: KeywordUsedItem[];
    seoPostPublished: {
      target: number;
      achieved: number;
      weeks: PostWeekItem[];
    };
    mediaUploaded: {
      target: number;
      achieved: number;
    };
    reviewReplies: {
      target: number;
      achieved: number;
    };
  };
  performanceReport: {
    searchImpressions: number;
    mapsImpressions: number;
    directionRequests: number;
    callClicks: number;
    websiteClicks: number;
    totalViews: number;
  };
  reputationSummary: {
    avgRating: number;
    totalReviews: number;
    responseRate: number;
  };
  aiExecutiveSummary: string;
}

export default function GrowthReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'last_month' | 'this_month'>('last_month');
  const [activeTab, setActiveTab] = useState<'action' | 'performance'>('action');
  const [summaryPage, setSummaryPage] = useState(0);
  const [report, setReport] = useState<ReportData | null>(null);

  const loadReport = async (p = period) => {
    setLoading(true);
    try {
      const data = await apiRequest<ReportData>(`/api/bgos/reports/4-tier?period=${p}`);
      setReport(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load growth report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(period);
  }, [period]);

  const handleDownload = async () => {
    try {
      const token = await getToken();
      const printUrl = `${WEB_URL}/api/bgos/reports/4-tier?format=print&period=${period}${
        token ? `&auth=${encodeURIComponent(token)}` : ''
      }`;
      await WebBrowser.openBrowserAsync(printUrl);
    } catch {
      // Fallback to Share if browser fails
      if (!report) return;
      await Share.share({
        title: `${report.businessName} - Growth Report`,
        message: `📊 ${report.period.label} ${report.period.comparisonLabel}\n\n• Leads: ${report.summary.leads.value} (${report.summary.leads.deltaPct}%)\n• Profile Views: ${report.summary.profileViews.value} (${report.summary.profileViews.deltaPct}%)\n• Google Posts: ${report.summary.googlePosts.value}\n• Review Replies: ${report.summary.reviewReplies.value}\n\nReputation: ${report.reputationSummary.avgRating}★ (${report.reputationSummary.totalReviews} reviews)`,
      });
    }
  };

  const businessInitial = useMemo(() => {
    const name = report?.businessName || 'Business';
    return name.trim().charAt(0).toUpperCase() || 'B';
  }, [report?.businessName]);

  const cardWidth = Math.floor((screenWidth - 32 - 10) / 2);

  // Group summary metrics into 2 pages of 6 items each
  const page1Items = useMemo(() => {
    if (!report) return [];
    return [
      { id: 'views', label: 'Profile Views', icon: 'visibility' as const, ...report.summary.profileViews },
      { id: 'leads', label: 'Leads', icon: 'people' as const, ...report.summary.leads },
      { id: 'directions', label: 'Direction Req.', icon: 'navigation' as const, ...report.summary.directionRequests },
      { id: 'media', label: 'Media Uploaded', icon: 'image' as const, ...report.summary.mediaUploaded },
      { id: 'replies', label: 'Review Replies', icon: 'chat-bubble' as const, ...report.summary.reviewReplies },
      { id: 'posts', label: 'Google Posts', icon: 'article' as const, ...report.summary.googlePosts },
    ];
  }, [report]);

  const page2Items = useMemo(() => {
    if (!report) return [];
    return [
      { id: 'calls', label: 'Calls', icon: 'phone' as const, ...report.summary.calls },
      { id: 'engagement', label: 'Engagement', icon: 'thumb-up' as const, value: `${report.summary.engagementRate.value}%`, prevValue: `${report.summary.engagementRate.prevValue}%`, deltaPct: report.summary.engagementRate.deltaPct },
      { id: 'website', label: 'Website Visits', icon: 'language' as const, ...report.summary.websiteVisits },
      { id: 'total_views', label: 'Total Impressions', icon: 'remove-red-eye' as const, value: report.performanceReport.totalViews, prevValue: 0, deltaPct: 0 },
      { id: 'post_target', label: 'Posts Target', icon: 'flag' as const, value: report.actionReport.seoPostPublished.target, prevValue: 0, deltaPct: 0 },
      { id: 'media_target', label: 'Media Target', icon: 'photo-library' as const, value: report.actionReport.mediaUploaded.target, prevValue: 0, deltaPct: 0 },
    ];
  }, [report]);

  const renderMetricTile = (item: any) => {
    const delta = item.deltaPct || 0;
    const isUp = delta > 0;
    const isDown = delta < 0;
    const deltaColor = isDown ? '#DC2626' : isUp ? '#16A34A' : '#94A3B8';
    const arrow = isDown ? '▼ ' : isUp ? '▲ ' : '';

    return (
      <View
        key={item.id}
        style={[
          styles.summaryTile,
          { width: cardWidth },
        ]}
      >
        <View style={styles.tileHeader}>
          <View style={styles.tileIconCircle}>
            <MaterialIcons name={item.icon} size={16} color="#3B82F6" />
          </View>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </View>

        <View style={styles.tileValueRow}>
          <Text style={styles.tileValue}>
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </Text>
          <View style={styles.tileDeltaRow}>
            {isDown && <MaterialIcons name="arrow-drop-down" size={16} color="#DC2626" style={{ marginRight: -3 }} />}
            {isUp && <MaterialIcons name="arrow-drop-up" size={16} color="#16A34A" style={{ marginRight: -3 }} />}
            <Text style={[styles.tileDeltaText, { color: deltaColor }]}>
              {delta >= 0 && !isUp ? '' : ''}
              {delta.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Find max value in SEO post published weeks for scaling bar chart
  const maxWeekPosts = useMemo(() => {
    if (!report?.actionReport?.seoPostPublished?.weeks) return 10;
    const vals = report.actionReport.seoPostPublished.weeks.flatMap((w) => [w.target, w.achieved]);
    return Math.max(...vals, 8);
  }, [report]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Light Header Matching BGOS Design System ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="chevron-left" size={30} color="#0F172A" />
          </Pressable>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{businessInitial}</Text>
          </View>

          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Report</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {[report?.businessPhone, report?.storeId, report?.appVersion || 'BGOS v2.0']
                .filter(Boolean)
                .join(' | ')}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download Report"
          onPress={handleDownload}
          style={({ pressed }) => [styles.downloadButton, { opacity: pressed ? 0.75 : 1 }]}
        >
          <MaterialIcons name="file-download" size={16} color="#0F172A" />
          <Text style={styles.downloadButtonText}>Download</Text>
        </Pressable>
      </View>

      {/* ── Main Scrollable Body ── */}
      {loading && !report ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading performance report...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Performance Summary Heading ── */}
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeadingMain}>
              {report?.period.label || 'Performance Summary'}{' '}
              <Text style={styles.sectionHeadingSub}>
                {report?.period.comparisonLabel || '(vs Previous)'}
              </Text>
            </Text>
          </View>

          {/* ── Swipeable 2-Row Grid ── */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const w = e.nativeEvent.layoutMeasurement.width || screenWidth;
              setSummaryPage(Math.round(x / w));
            }}
            scrollEventThrottle={16}
          >
            {/* Page 1 */}
            <View style={{ width: screenWidth - 32, marginHorizontal: 16 }}>
              <View style={styles.gridContainer}>
                {page1Items.map(renderMetricTile)}
              </View>
            </View>

            {/* Page 2 */}
            <View style={{ width: screenWidth - 32, marginHorizontal: 16 }}>
              <View style={styles.gridContainer}>
                {page2Items.map(renderMetricTile)}
              </View>
            </View>
          </ScrollView>

          {/* Page Scrollbar Indicator */}
          <View style={styles.pageIndicatorContainer}>
            <View style={[styles.pageDot, summaryPage === 0 ? styles.pageDotActive : styles.pageDotInactive]} />
            <View style={[styles.pageDot, summaryPage === 1 ? styles.pageDotActive : styles.pageDotInactive]} />
          </View>

          {/* ── Segmented Control Bar ── */}
          <View style={styles.segmentedContainer}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'action' }}
              onPress={() => setActiveTab('action')}
              style={[
                styles.segmentTab,
                activeTab === 'action' ? styles.segmentTabActive : styles.segmentTabInactive,
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'action' ? styles.segmentTabTextActive : styles.segmentTabTextInactive,
                ]}
              >
                Growth Action Report
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'performance' }}
              onPress={() => setActiveTab('performance')}
              style={[
                styles.segmentTab,
                activeTab === 'performance' ? styles.segmentTabActive : styles.segmentTabInactive,
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'performance' ? styles.segmentTabTextActive : styles.segmentTabTextInactive,
                ]}
              >
                Performance Report
              </Text>
            </Pressable>
          </View>

          {/* ── TAB 1: Growth Action Report ── */}
          {activeTab === 'action' ? (
            <View style={{ paddingHorizontal: 16, gap: 18, marginTop: 14 }}>
              {/* Keywords Used Section */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Keywords Used</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPeriod(period === 'last_month' ? 'this_month' : 'last_month')}
                    style={styles.filterPill}
                  >
                    <MaterialIcons name="filter-list" size={14} color="#E11D48" />
                    <Text style={styles.filterPillText}>
                      {period === 'last_month' ? 'Last Month' : 'This Month'}
                    </Text>
                  </Pressable>
                </View>

                {/* Keywords Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableColHeader, { flex: 1 }]}>Keywords</Text>
                  <Text style={[styles.tableColHeader, { width: 70, textAlign: 'center' }]}>Volume</Text>
                  <Text style={[styles.tableColHeader, { width: 50, textAlign: 'right' }]}>Used</Text>
                </View>

                {/* Keywords Table Body */}
                {(report?.actionReport.keywordsUsed || []).length === 0 ? (
                  <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                      No tracked keywords configured. Add keywords in Keyword Planner.
                    </Text>
                  </View>
                ) : (
                  (report?.actionReport.keywordsUsed || []).slice(0, 10).map((k, idx) => (
                    <View
                      key={k.keyword + idx}
                      style={[
                        styles.tableRow,
                        idx === (report?.actionReport.keywordsUsed || []).length - 1 ? { borderBottomWidth: 0 } : null,
                      ]}
                    >
                      <Text style={styles.keywordNameText} numberOfLines={2}>
                        {k.keyword}
                      </Text>
                      <View style={{ width: 70, alignItems: 'center' }}>
                        <Text style={styles.keywordVolumeText}>
                          {k.volume > 0 ? k.volume.toLocaleString() : '—'}
                        </Text>
                      </View>
                      <View style={{ width: 50, alignItems: 'flex-end' }}>
                        <Text style={styles.keywordUsedText}>{k.usedCount}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* SEO Post Published Section */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>SEO Post Published</Text>
                  <View style={styles.filterPill}>
                    <MaterialIcons name="filter-list" size={14} color="#E11D48" />
                    <Text style={styles.filterPillText}>
                      {period === 'last_month' ? 'Last Month' : 'This Month'}
                    </Text>
                  </View>
                </View>

                {/* Legend Row */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#93C5FD' }]} />
                    <Text style={styles.legendText}>Target</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={styles.legendText}>Achieved</Text>
                  </View>
                </View>

                {/* Weekly Bar Chart Progress */}
                <View style={styles.chartContainer}>
                  {/* Y-Axis Guidelines */}
                  <View style={styles.yAxisContainer}>
                    <Text style={styles.axisLabel}>14</Text>
                    <Text style={styles.axisLabel}>12</Text>
                    <Text style={styles.axisLabel}>8</Text>
                    <Text style={styles.axisLabel}>4</Text>
                    <Text style={styles.axisLabel}>0</Text>
                  </View>

                  {/* Bars per Week */}
                  <View style={styles.barsArea}>
                    {(report?.actionReport.seoPostPublished.weeks || []).map((w) => {
                      const targetH = Math.min(100, Math.round((w.target / maxWeekPosts) * 110));
                      const achievedH = Math.min(100, Math.round((w.achieved / maxWeekPosts) * 110));

                      return (
                        <View key={w.label} style={styles.weekBarCol}>
                          <View style={styles.barsGroup}>
                            {/* Target Bar */}
                            <View style={[styles.singleBar, { height: targetH, backgroundColor: '#93C5FD' }]} />
                            {/* Achieved Bar */}
                            <View style={[styles.singleBar, { height: achievedH, backgroundColor: '#2563EB' }]} />
                          </View>
                          <Text style={styles.weekColLabel}>{w.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Targets Status Strip */}
                <View style={styles.targetsSummaryStrip}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                      Monthly Post Target: {report?.actionReport.seoPostPublished.target}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color:
                          (report?.actionReport.seoPostPublished.achieved || 0) >=
                          (report?.actionReport.seoPostPublished.target || 1)
                            ? '#16A34A'
                            : '#2563EB',
                      }}
                    >
                      Achieved: {report?.actionReport.seoPostPublished.achieved}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Targets Quick Row (Media & Review Replies) */}
              <View style={styles.actionTargetsGrid}>
                <View style={styles.actionTargetCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="photo-camera" size={16} color="#7C3AED" />
                    <Text style={styles.actionTargetLabel}>Media Uploads</Text>
                  </View>
                  <Text style={styles.actionTargetVal}>
                    {report?.actionReport.mediaUploaded.achieved} / {report?.actionReport.mediaUploaded.target}
                  </Text>
                  <Text style={styles.actionTargetSub}>
                    {Math.round(
                      ((report?.actionReport.mediaUploaded.achieved || 0) /
                        Math.max(1, report?.actionReport.mediaUploaded.target || 1)) *
                        100,
                    )}
                    % goal reached
                  </Text>
                </View>

                <View style={styles.actionTargetCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="rate-review" size={16} color="#059669" />
                    <Text style={styles.actionTargetLabel}>Review Replies</Text>
                  </View>
                  <Text style={styles.actionTargetVal}>
                    {report?.actionReport.reviewReplies.achieved} / {report?.actionReport.reviewReplies.target}
                  </Text>
                  <Text style={styles.actionTargetSub}>
                    {report?.reputationSummary.responseRate}% total rate
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* ── TAB 2: Performance Report ── */
            <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 14 }}>
              {/* AI Executive Briefing */}
              <View style={styles.aiBriefingCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>🤖</Text>
                  <Text style={styles.aiBriefingTitle}>AI Growth Officer Executive Briefing</Text>
                </View>
                <Text style={styles.aiBriefingBody}>{report?.aiExecutiveSummary}</Text>
              </View>

              {/* Google Business Profile Telemetry */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeaderTitle}>Google Business Breakdown</Text>
                <View style={{ gap: 10, marginTop: 12 }}>
                  <View style={styles.perfRow}>
                    <Text style={styles.perfLabel}>Search Impressions</Text>
                    <Text style={styles.perfVal}>
                      {report?.performanceReport.searchImpressions.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.perfRow}>
                    <Text style={styles.perfLabel}>Maps Impressions</Text>
                    <Text style={styles.perfVal}>
                      {report?.performanceReport.mapsImpressions.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.perfRow}>
                    <Text style={styles.perfLabel}>Phone Call Clicks</Text>
                    <Text style={styles.perfVal}>
                      {report?.performanceReport.callClicks.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.perfRow}>
                    <Text style={styles.perfLabel}>Direction Requests</Text>
                    <Text style={styles.perfVal}>
                      {report?.performanceReport.directionRequests.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.perfRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.perfLabel}>Website Clicks</Text>
                    <Text style={styles.perfVal}>
                      {report?.performanceReport.websiteClicks.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Reputation & Ratings */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeaderTitle}>Reputation &amp; Trust</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingNumber}>
                      {report?.reputationSummary.avgRating.toFixed(1)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 1, marginTop: 2 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <MaterialIcons key={i} name="star" size={13} color="#F59E0B" />
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                      {report?.reputationSummary.totalReviews} Customer Reviews
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {report?.reputationSummary.responseRate}% owner reply rate on Google Maps.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '900',
  },
  headerTextGroup: {
    gap: 1.5,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  downloadButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollBody: {
    flex: 1,
  },
  sectionHeadingRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionHeadingMain: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sectionHeadingSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tileIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingLeft: 36,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tileDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileDeltaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 10,
  },
  pageDot: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  pageDotActive: {
    backgroundColor: '#3B82F6',
  },
  pageDotInactive: {
    backgroundColor: '#CBD5E1',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  segmentTabInactive: {
    backgroundColor: 'transparent',
  },
  segmentTabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  segmentTabTextActive: {
    color: '#3730A3',
    fontWeight: '800',
  },
  segmentTabTextInactive: {
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  keywordNameText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 17,
  },
  keywordVolumeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  keywordUsedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  yAxisContainer: {
    width: 24,
    height: '100%',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  axisLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  barsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  weekBarCol: {
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  singleBar: {
    width: 14,
    borderRadius: 3,
    minHeight: 4,
  },
  weekColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  targetsSummaryStrip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  actionTargetsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionTargetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  actionTargetLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionTargetVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  actionTargetSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  aiBriefingCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 14,
    gap: 6,
  },
  aiBriefingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  aiBriefingBody: {
    fontSize: 12.5,
    color: '#14532D',
    lineHeight: 18,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  perfLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  perfVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
  },
});
