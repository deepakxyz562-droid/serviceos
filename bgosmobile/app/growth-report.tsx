import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
  Linking,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';
import { PerformancePanel } from '../src/components/gbp/performance-panel';
import { TutorialVideoModal } from '../src/components/gbp/tutorial-video-modal';

interface MetricDelta {
  value: number;
  prevValue: number;
  deltaPct: number;
  hasBaseline?: boolean;
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
  isConnected?: boolean;
  trendsAvailable?: boolean;
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
  reviewTrends?: {
    avgReviewsPerWeek: number;
    industryAvg: number;
    weeks: Array<{ label: string; count: number }>;
    deltaPct8Weeks: number | null;
  };
  sixMonthTrends?: {
    months: string[];
    views: number[];
    calls: number[];
    directions: number[];
  };
  aiExecutiveSummary: string;
}

export default function GrowthReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [period, setPeriod] = useState<'last_month' | 'this_month'>('last_month');
  const [activeTab, setActiveTab] = useState<'action' | 'performance'>('action');
  const [summaryPage, setSummaryPage] = useState(0);
  const [report, setReport] = useState<ReportData | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const analyticsData = useMemo(() => {
    if (!report) return undefined;
    return {
      isConnected: Boolean(report.isConnected),
      isLiveGoogleApi: Boolean(report.trendsAvailable),
      metrics: {
        totalViews:
          report.performanceReport.totalViews ||
          report.performanceReport.searchImpressions + report.performanceReport.mapsImpressions,
        searchImpressions: report.performanceReport.searchImpressions,
        mapsImpressions: report.performanceReport.mapsImpressions,
        callClicks: report.performanceReport.callClicks,
        directionRequests: report.performanceReport.directionRequests,
        websiteClicks: report.performanceReport.websiteClicks,
        totalReviews: report.reputationSummary.totalReviews,
        avgRating: report.reputationSummary.avgRating,
        responseRate: report.reputationSummary.responseRate,
        reviewsDeltaPct8Wks: report.reviewTrends?.deltaPct8Weeks ?? null,
      },
      reviewTrends: report.reviewTrends,
      sixMonthTrends: report.sixMonthTrends,
      trendsAvailable: Boolean(report.trendsAvailable),
    };
  }, [report]);

  const loadReport = async (p = period, isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg(null);
    try {
      const data = await apiRequest<ReportData>(`/api/bgos/reports/4-tier?period=${p}`);
      setReport(data);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load growth report';
      setErrorMsg(msg);
      if (!report) {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport(period);
  }, [period]);

  const [sendingWa, setSendingWa] = useState(false);

  const handleDownload9PagePdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const token = await getToken();
      const pdfUrl = `${WEB_URL}/api/bgos/reports/monthly-pdf${
        token ? `?auth=${encodeURIComponent(token)}` : ''
      }`;
      await WebBrowser.openBrowserAsync(pdfUrl);
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not open 9-page PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendWhatsAppReport = async () => {
    try {
      setSendingWa(true);
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/cron/monthly-marketing-report', {
        method: 'POST',
      });
      if (res?.success) {
        Alert.alert('Report Sent', 'Your monthly 9-page marketing report was dispatched to your WhatsApp number!');
      } else {
        const token = await getToken();
        const pdfLink = `${WEB_URL}/api/bgos/reports/monthly-pdf${token ? `?auth=${encodeURIComponent(token)}` : ''}`;
        const waMsg = `Hi ${report?.businessName || 'Business Owner'},\n\nYour monthly Google marketing report is ready.\n\n📄 Download PDF: ${pdfLink}`;
        const waUrl = `whatsapp://send?text=${encodeURIComponent(waMsg)}`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
        } else {
          await Share.share({ message: waMsg });
        }
      }
    } catch {
      const token = await getToken();
      const pdfLink = `${WEB_URL}/api/bgos/reports/monthly-pdf${token ? `?auth=${encodeURIComponent(token)}` : ''}`;
      const waMsg = `Hi ${report?.businessName || 'Business Owner'},\n\nYour monthly Google marketing report is ready.\n\n📄 Download PDF: ${pdfLink}`;
      await Share.share({ message: waMsg });
    } finally {
      setSendingWa(false);
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
    const postTarget = Math.max(1, report.actionReport.seoPostPublished.target || 0);
    const postAchievedPct = Math.round((report.actionReport.seoPostPublished.achieved / postTarget) * 100);
    const mediaTarget = Math.max(1, report.actionReport.mediaUploaded.target || 0);
    const mediaAchievedPct = Math.round((report.actionReport.mediaUploaded.achieved / mediaTarget) * 100);

    return [
      { id: 'calls', label: 'Calls', icon: 'phone' as const, ...report.summary.calls },
      {
        id: 'engagement',
        label: 'Engagement',
        icon: 'thumb-up' as const,
        value: `${report.summary.engagementRate.value}%`,
        prevValue: `${report.summary.engagementRate.prevValue}%`,
        deltaPct: report.summary.engagementRate.deltaPct,
        hasBaseline: report.summary.engagementRate.hasBaseline,
      },
      { id: 'website', label: 'Website Visits', icon: 'language' as const, ...report.summary.websiteVisits },
      {
        id: 'search_impr',
        label: 'Search Views',
        icon: 'search' as const,
        value: report.performanceReport.searchImpressions,
        prevValue: 0,
        deltaPct: 0,
        badgeLabel: 'Google Search',
      },
      {
        id: 'post_target',
        label: 'Post Goal Hit',
        icon: 'flag' as const,
        value: `${report.actionReport.seoPostPublished.achieved}/${report.actionReport.seoPostPublished.target}`,
        prevValue: 0,
        deltaPct: 0,
        badgeLabel: `${Math.min(100, postAchievedPct)}%`,
        badgePositive: postAchievedPct >= 75,
      },
      {
        id: 'media_target',
        label: 'Media Goal Hit',
        icon: 'photo-library' as const,
        value: `${report.actionReport.mediaUploaded.achieved}/${report.actionReport.mediaUploaded.target}`,
        prevValue: 0,
        deltaPct: 0,
        badgeLabel: `${Math.min(100, mediaAchievedPct)}%`,
        badgePositive: mediaAchievedPct >= 75,
      },
    ];
  }, [report]);

  const renderMetricTile = (item: any) => {
    const delta = typeof item.deltaPct === 'number' ? item.deltaPct : 0;
    const hasBaseline = item.hasBaseline !== false && (item.prevValue > 0 || delta !== 0);
    const isUp = hasBaseline && delta > 0;
    const isDown = hasBaseline && delta < 0;

    let badgeText = hasBaseline ? `${delta.toFixed(1)}%` : '—';
    let badgeColor = '#64748B';
    let badgeBg = '#F1F5F9';

    if (item.badgeLabel) {
      badgeText = item.badgeLabel;
      badgeColor = item.badgePositive ? '#16A34A' : '#475569';
      badgeBg = item.badgePositive ? '#DCFCE7' : '#F1F5F9';
    } else if (isUp) {
      badgeColor = '#16A34A';
      badgeBg = '#DCFCE7';
    } else if (isDown) {
      badgeColor = '#DC2626';
      badgeBg = '#FEE2E2';
    }

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
            <MaterialIcons name={item.icon} size={16} color="#2563EB" />
          </View>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </View>

        <View style={styles.tileValueRow}>
          <Text style={styles.tileValue}>
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </Text>
          <View style={[styles.tileDeltaPill, { backgroundColor: badgeBg }]}>
            {isDown && !item.badgeLabel ? (
              <MaterialIcons name="arrow-drop-down" size={14} color={badgeColor} style={{ marginLeft: -3, marginRight: -2 }} />
            ) : null}
            {isUp && !item.badgeLabel ? (
              <MaterialIcons name="arrow-drop-up" size={14} color={badgeColor} style={{ marginLeft: -3, marginRight: -2 }} />
            ) : null}
            <Text style={[styles.tileDeltaText, { color: badgeColor }]}>
              {badgeText}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Scale SEO Post Published Y-axis dynamically from real target/achieved values
  const { yAxisTop, yAxisTicks } = useMemo(() => {
    const weeks = report?.actionReport?.seoPostPublished?.weeks || [];
    const vals = weeks.flatMap((w) => [w.target, w.achieved]);
    const rawMax = Math.max(...vals, 4);
    const step = Math.max(1, Math.ceil(rawMax / 4));
    const top = step * 4;
    return {
      yAxisTop: top,
      yAxisTicks: [top, step * 3, step * 2, step, 0],
    };
  }, [report]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

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
          onPress={handleDownload9PagePdf}
          disabled={downloadingPdf}
          style={({ pressed }) => [styles.downloadButton, { opacity: pressed || downloadingPdf ? 0.75 : 1 }]}
        >
          {downloadingPdf ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <MaterialIcons name="picture-as-pdf" size={16} color="#0F172A" />
          )}
          <Text style={styles.downloadButtonText}>{downloadingPdf ? 'Opening...' : 'PDF Report'}</Text>
        </Pressable>
      </View>

      {/* ── Main Scrollable Body ── */}
      {loading && !report ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading performance report...</Text>
        </View>
      ) : errorMsg && !report ? (
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={34} color="#DC2626" />
          <Text style={[styles.loadingText, { color: '#0F172A', textAlign: 'center' }]}>{errorMsg}</Text>
          <Pressable
            onPress={() => loadReport(period)}
            style={{ backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginTop: 6 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReport(period, true)}
              tintColor="#2563EB"
            />
          }
        >
          {/* ── 9-Page Monthly Report Card ── */}
          <View style={{ backgroundColor: '#0A0F1D', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Monthly AI Marketing Audit
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#34D399' }}>9-PAGE PDF</Text>
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
              Full 9-Page Google Marketing Report
            </Text>
            <Text style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 16, marginBottom: 14 }}>
              Complete breakdown of your 5 AI Growth Agents, verified keyword impressions, replied reviews, and 6-month growth trajectory.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={handleDownload9PagePdf}
                disabled={downloadingPdf}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 10,
                  borderRadius: 10,
                  opacity: downloadingPdf ? 0.75 : 1,
                }}
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#0F172A" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                  {downloadingPdf ? 'Opening PDF...' : 'View 9-Page PDF'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSendWhatsAppReport}
                disabled={sendingWa}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#25D366',
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  {sendingWa ? 'Sending...' : 'Send WhatsApp'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Performance Summary Heading + Clean Period Selector ── */}
          <View style={styles.sectionHeadingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeadingMain}>
                {report?.period.label || 'Performance Summary'}
              </Text>
              <Text style={styles.sectionHeadingSub}>
                {report?.period.comparisonLabel || '(vs Previous)'}
              </Text>
            </View>
            <View style={styles.periodPillGroup}>
              {(['last_month', 'this_month'] as const).map((pKey) => {
                const selected = period === pKey;
                return (
                  <Pressable
                    key={pKey}
                    onPress={() => setPeriod(pKey)}
                    style={[styles.periodChip, selected ? styles.periodChipActive : null]}
                  >
                    <Text style={[styles.periodChipText, selected ? styles.periodChipTextActive : null]}>
                      {pKey === 'last_month' ? 'Last Month' : 'This Month'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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

                {/* Weekly Bar Chart Progress (Dynamic Y-Axis) */}
                <View style={styles.chartContainer}>
                  <View style={styles.yAxisContainer}>
                    {yAxisTicks.map((tick) => (
                      <Text key={tick} style={styles.axisLabel}>
                        {tick}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.barsArea}>
                    {(report?.actionReport.seoPostPublished.weeks || []).map((w) => {
                      const targetH = Math.min(104, Math.max(4, Math.round((w.target / Math.max(1, yAxisTop)) * 104)));
                      const achievedH = Math.min(104, Math.max(w.achieved > 0 ? 6 : 3, Math.round((w.achieved / Math.max(1, yAxisTop)) * 104)));

                      return (
                        <View key={w.label} style={styles.weekBarCol}>
                          <View style={styles.barsGroup}>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B' }}>{w.target}</Text>
                              <View style={[styles.singleBar, { height: targetH, backgroundColor: '#93C5FD' }]} />
                            </View>
                            <View style={{ alignItems: 'center', gap: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#2563EB' }}>{w.achieved}</Text>
                              <View style={[styles.singleBar, { height: achievedH, backgroundColor: '#2563EB' }]} />
                            </View>
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
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.round(((report?.actionReport.mediaUploaded.achieved || 0) / Math.max(1, report?.actionReport.mediaUploaded.target || 1)) * 100))}%`,
                          backgroundColor: '#7C3AED',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.actionTargetSub}>
                    {Math.min(
                      100,
                      Math.round(
                        ((report?.actionReport.mediaUploaded.achieved || 0) /
                          Math.max(1, report?.actionReport.mediaUploaded.target || 1)) *
                          100,
                      ),
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
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, report?.reputationSummary.responseRate || 0)}%`,
                          backgroundColor: '#059669',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.actionTargetSub}>
                    {report?.reputationSummary.responseRate ?? 0}% reply rate
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* ── TAB 2: Performance Report ── */
            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              {/* Educational Video Banner (Video 2 Benchmark) */}
              <Pressable
                accessibilityRole="button"
                onPress={() => setTutorialOpen(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#2563EB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF' }}>
                      Is Your Profile Performing?
                    </Text>
                    <Text style={{ fontSize: 11, color: '#3B82F6' }}>
                      Watch 3-minute guide on interpreting Views, Calls &amp; Trends
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#2563EB" />
              </Pressable>

              {/* AI Executive Briefing */}
              <View style={[styles.aiBriefingCard, { marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="auto-awesome" size={18} color="#166534" />
                  <Text style={styles.aiBriefingTitle}>AI Growth Officer Executive Briefing</Text>
                </View>
                <Text style={styles.aiBriefingBody}>{report?.aiExecutiveSummary}</Text>
              </View>

              <PerformancePanel
                analytics={analyticsData}
                isConnected={Boolean(report?.isConnected)}
                aiActions={[]}
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Educational Video Tutorial Player */}
      <TutorialVideoModal
        visible={tutorialOpen}
        videoId="performance_analysis"
        onClose={() => setTutorialOpen(false)}
        businessName={report?.businessName || 'Your Business'}
        onAction={() => setTutorialOpen(false)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionHeadingMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sectionHeadingSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  periodPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  periodChipActive: {
    backgroundColor: '#FFFFFF',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  periodChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tileDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tileDeltaText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
