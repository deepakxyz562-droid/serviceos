import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PerformanceSplineChart } from './growth-charts';
import { formatBusinessOpenStatus, type BusinessWeekHours, type SpecialDayHours } from '../../lib/business-hours';
import type { GbpConnectionState } from './types';

export interface PerformancePeriodMetrics {
  views?: number;
  searchImpressions?: number;
  mapsImpressions?: number;
  calls?: number;
  directions?: number;
  websiteClicks?: number;
  bookings?: number;
}

export interface PerformanceMonthlyTrends {
  months: string[];
  views: number[];
  calls: number[];
  directions: number[];
  website?: number[];
  bookings?: number[];
  interactions?: number[];
}

export interface PerformanceMetrics {
  views?: number;
  searchImpressions?: number;
  mapsImpressions?: number;
  leads?: number;
  calls?: number;
  directions?: number;
  websiteClicks?: number;
  bookings?: number;
  interactions?: number;
  businessName?: string;
  category?: string;
  locality?: string;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  reviewUrl?: string;
  rating?: number;
  reviewCount?: number;
  isConnected?: boolean;
  isVerified?: boolean;
  isPendingApproval?: boolean;
  connectionState?: GbpConnectionState;
  regularHours?: BusinessWeekHours | null;
  specialHours?: SpecialDayHours[] | null;
  openNow?: boolean | null;
  timeZone?: string | null;
  lastUpdated?: string;
  last30Days?: PerformancePeriodMetrics | null;
  monthlyTrends?: PerformanceMonthlyTrends | null;
}

type MetricTabId = 'overview' | 'views' | 'calls' | 'bookings' | 'directions' | 'website';
type PeriodId = '6m' | '30d';

const METRIC_TABS: Array<{
  id: MetricTabId;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
}> = [
  { id: 'overview', label: 'Overview', icon: 'insights', accent: '#1A73E8' },
  { id: 'views', label: 'Views', icon: 'visibility', accent: '#2563EB' },
  { id: 'calls', label: 'Calls', icon: 'call', accent: '#059669' },
  { id: 'bookings', label: 'Bookings', icon: 'event-available', accent: '#7C3AED' },
  { id: 'directions', label: 'Directions', icon: 'directions', accent: '#0284C7' },
  { id: 'website', label: 'Website', icon: 'language', accent: '#4F46E5' },
];

function formatNumber(n?: number): string {
  const val = typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  return val.toLocaleString('en-US');
}

function normalizeUrl(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function computeSeriesDeltaPct(series: number[]): number | null {
  if (!Array.isArray(series) || series.length < 2) return null;
  // Find the most recent non-trailing-empty comparison if last month is zero during partial start
  const lastIdx = series.length - 1;
  const curr = series[lastIdx] || 0;
  const prev = series[lastIdx - 1] || 0;
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function buildRatingStars(rating: number): Array<'star' | 'star-half' | 'star-border'> {
  const clamped = Math.max(0, Math.min(5, rating));
  return [1, 2, 3, 4, 5].map((index) => {
    if (clamped >= index - 0.25) return 'star';
    if (clamped >= index - 0.75) return 'star-half';
    return 'star-border';
  });
}

export function GooglePerformanceCard({
  metrics,
  onBoostPost,
  onEditProfile,
  onConnectGoogle,
}: {
  metrics?: PerformanceMetrics;
  onBoostPost?: () => void;
  onEditProfile?: () => void;
  onConnectGoogle?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<MetricTabId>('overview');
  const [period, setPeriod] = useState<PeriodId>('6m');

  const has30DayData = Boolean(metrics?.last30Days);
  const use30d = period === '30d' && has30DayData && metrics?.last30Days;

  const searchImpressions = use30d
    ? use30d.searchImpressions || 0
    : metrics?.searchImpressions || 0;
  const mapsImpressions = use30d
    ? use30d.mapsImpressions || 0
    : metrics?.mapsImpressions || 0;
  const viewsCount = use30d
    ? use30d.views ?? searchImpressions + mapsImpressions
    : metrics?.views ?? searchImpressions + mapsImpressions;
  const callsCount = use30d ? use30d.calls || 0 : metrics?.calls || 0;
  const directionsCount = use30d ? use30d.directions || 0 : metrics?.directions || 0;
  const websiteCount = use30d ? use30d.websiteClicks || 0 : metrics?.websiteClicks || 0;
  const bookingsCount = use30d ? use30d.bookings || 0 : metrics?.bookings || 0;
  const interactionsCount = callsCount + directionsCount + websiteCount + bookingsCount;

  const trends = metrics?.monthlyTrends;
  const monthLabels = trends?.months || [];

  const activeSeries = useMemo(() => {
    const len = monthLabels.length;
    const zeros = Array.from({ length: len }, () => 0);
    if (!trends || len === 0) return [];

    const interactionsSeries =
      trends.interactions && trends.interactions.length === len
        ? trends.interactions
        : monthLabels.map(
            (_, idx) =>
              (trends.calls?.[idx] || 0) +
              (trends.directions?.[idx] || 0) +
              (trends.website?.[idx] || 0) +
              (trends.bookings?.[idx] || 0),
          );

    switch (activeTab) {
      case 'overview':
        return interactionsSeries;
      case 'views':
        return trends.views?.length === len ? trends.views : zeros;
      case 'calls':
        return trends.calls?.length === len ? trends.calls : zeros;
      case 'directions':
        return trends.directions?.length === len ? trends.directions : zeros;
      case 'website':
        return trends.website?.length === len ? trends.website : zeros;
      case 'bookings':
        return trends.bookings?.length === len ? trends.bookings : zeros;
      default:
        return interactionsSeries;
    }
  }, [activeTab, monthLabels, trends]);

  const activeTabMeta = METRIC_TABS.find((t) => t.id === activeTab) || METRIC_TABS[0];

  const heroValue = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return interactionsCount;
      case 'views':
        return viewsCount;
      case 'calls':
        return callsCount;
      case 'directions':
        return directionsCount;
      case 'website':
        return websiteCount;
      case 'bookings':
        return bookingsCount;
      default:
        return interactionsCount;
    }
  }, [
    activeTab,
    bookingsCount,
    callsCount,
    directionsCount,
    interactionsCount,
    viewsCount,
    websiteCount,
  ]);

  const heroTitle = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return 'Customer Interactions';
      case 'views':
        return 'Search & Maps Views';
      case 'calls':
        return 'Phone Call Clicks';
      case 'directions':
        return 'Direction Requests';
      case 'website':
        return 'Website Visits';
      case 'bookings':
        return 'Google Bookings';
      default:
        return 'Customer Interactions';
    }
  }, [activeTab]);

  const seriesDelta = useMemo(() => computeSeriesDeltaPct(activeSeries), [activeSeries]);

  // Business Profile Preview Fields (100% Real Props - Zero Fake Defaults)
  const displayName = metrics?.businessName?.trim() || 'Your Business Profile';
  const displayCategory = metrics?.category?.trim() || 'Local Business';
  const displayLocality = metrics?.locality?.trim() || '';
  const displayAddress = metrics?.address?.trim() || '';
  const displayPhone = metrics?.phone?.trim() || '';
  const normalizedWebsite = normalizeUrl(metrics?.website);

  const isConnected = Boolean(metrics?.isConnected);
  const isPendingApproval = Boolean(metrics?.isPendingApproval);
  const isVerifiedLive = Boolean(isConnected && !isPendingApproval && metrics?.isVerified !== false);

  const ratingVal =
    typeof metrics?.rating === 'number' && Number.isFinite(metrics.rating) && metrics.rating > 0
      ? Number(metrics.rating.toFixed(1))
      : 0;
  const reviewCountVal =
    typeof metrics?.reviewCount === 'number' && Number.isFinite(metrics.reviewCount)
      ? Math.max(0, Math.round(metrics.reviewCount))
      : 0;
  const hasReviews = reviewCountVal > 0 && ratingVal > 0;
  const starIcons = useMemo(() => buildRatingStars(ratingVal), [ratingVal]);

  const hoursStatus = useMemo(
    () =>
      formatBusinessOpenStatus({
        regularHours: metrics?.regularHours,
        specialHours: metrics?.specialHours,
        openNowOverride: metrics?.openNow,
        timeZone: metrics?.timeZone,
      }),
    [metrics?.openNow, metrics?.regularHours, metrics?.specialHours, metrics?.timeZone],
  );

  const searchQueryText = useMemo(() => {
    if (displayLocality) {
      return `${displayName} · ${displayLocality}`;
    }
    return displayName;
  }, [displayLocality, displayName]);

  const resolvedMapsUrl =
    normalizeUrl(metrics?.mapsUrl) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${displayName} ${displayAddress || displayLocality}`.trim(),
    )}`;

  const previewBadge = isVerifiedLive
    ? { label: 'Verified', bg: '#ECFDF5', color: '#059669', icon: 'verified' as const }
    : isConnected && isPendingApproval
      ? { label: 'Pending API', bg: '#FFFBEB', color: '#D97706', icon: 'schedule' as const }
      : isConnected
        ? { label: 'Connected', bg: '#EFF6FF', color: '#1A73E8', icon: 'link' as const }
        : { label: 'Preview only', bg: '#F1F5F9', color: '#64748B', icon: 'visibility' as const };

  const hoursColor =
    hoursStatus.isOpen === true
      ? '#059669'
      : hoursStatus.isOpen === false
        ? '#DC2626'
        : '#64748B';

  const openExternal = (url: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const chartEmptyState = !isConnected
    ? {
        title: 'Connect Google Business Profile',
        subtitle: 'Live Search views, calls, and customer actions will appear here once synced.',
      }
    : isPendingApproval
      ? {
          title: 'Google Business API pending approval',
          subtitle: 'Profile telemetry unlocks automatically once Google approves location access.',
        }
      : {
          title: `No ${activeTabMeta.label.toLowerCase()} recorded yet`,
          subtitle:
            activeTab === 'overview' && viewsCount > 0
              ? 'Customers viewed your profile cleanly — tap the Views tab to inspect impressions.'
              : 'Monthly bars update automatically as customers find and engage with your listing.',
        };

  return (
    <View style={styles.card}>
      {/* Top Performance Header + Period Selector */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <MaterialIcons name="insights" size={18} color="#1A73E8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText}>Google Performance</Text>
            <Text style={styles.subtitleText}>
              {use30d
                ? 'Last 30 days · Live GBP telemetry'
                : monthLabels.length > 0
                  ? `${monthLabels[0]}–${monthLabels[monthLabels.length - 1]} · Google Business Profile`
                  : 'Google Business Profile telemetry'}
            </Text>
          </View>
        </View>

        {has30DayData ? (
          <View style={styles.periodSegmented}>
            <Pressable
              onPress={() => setPeriod('6m')}
              style={[styles.periodBtn, period === '6m' && styles.periodBtnActive]}
            >
              <Text style={[styles.periodText, period === '6m' && styles.periodTextActive]}>6M</Text>
            </Pressable>
            <Pressable
              onPress={() => setPeriod('30d')}
              style={[styles.periodBtn, period === '30d' && styles.periodBtnActive]}
            >
              <Text style={[styles.periodText, period === '30d' && styles.periodTextActive]}>30D</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.periodPillStatic}>
            <Text style={styles.periodPillStaticText}>6M</Text>
          </View>
        )}
      </View>

      {/* Primary KPI Strip: Active Tab Metric + Profile Views */}
      <View style={styles.heroRow}>
        <View style={styles.heroPrimary}>
          <Text style={styles.heroLabel}>{heroTitle}</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroBigNum}>{formatNumber(heroValue)}</Text>
            {seriesDelta !== null ? (
              <View
                style={[
                  styles.deltaPill,
                  { backgroundColor: seriesDelta >= 0 ? '#ECFDF5' : '#FEF2F2' },
                ]}
              >
                <MaterialIcons
                  name={seriesDelta >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={seriesDelta >= 0 ? '#059669' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.deltaText,
                    { color: seriesDelta >= 0 ? '#059669' : '#DC2626' },
                  ]}
                >
                  {seriesDelta > 0 ? `+${seriesDelta}%` : `${seriesDelta}%`} vs prev mo
                </Text>
              </View>
            ) : (
              <View style={styles.baselinePill}>
                <Text style={styles.baselineText}>
                  {isConnected ? 'Live total' : 'Not synced'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.viewsMiniCard}>
          <Text style={styles.viewsMiniLabel}>Profile Views</Text>
          <Text style={styles.viewsMiniValue}>{formatNumber(viewsCount)}</Text>
          <Text style={styles.viewsMiniSub} numberOfLines={1}>
            Search {formatNumber(searchImpressions)} · Maps {formatNumber(mapsImpressions)}
          </Text>
        </View>
      </View>

      {/* Balanced Scrollable Metric Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {METRIC_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabChip,
                isActive && {
                  backgroundColor: '#EFF6FF',
                  borderColor: tab.accent,
                },
              ]}
            >
              <MaterialIcons
                name={tab.icon}
                size={14}
                color={isActive ? tab.accent : '#64748B'}
              />
              <Text
                style={[
                  styles.tabChipText,
                  isActive && { color: tab.accent, fontWeight: '700' },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Dynamic Chart Area */}
      <View style={styles.chartSection}>
        <PerformanceSplineChart
          points={activeSeries}
          labels={monthLabels}
          accentColor={activeTabMeta.accent}
          emptyTitle={chartEmptyState.title}
          emptySubtitle={chartEmptyState.subtitle}
        />
      </View>

      {/* Action Breakdown Tiles */}
      <View style={styles.actionGrid}>
        <View style={styles.actionTile}>
          <Text style={styles.actionTileVal}>{formatNumber(callsCount)}</Text>
          <Text style={styles.actionTileLabel}>Calls</Text>
        </View>
        <View style={styles.actionTile}>
          <Text style={styles.actionTileVal}>{formatNumber(bookingsCount)}</Text>
          <Text style={styles.actionTileLabel}>Bookings</Text>
        </View>
        <View style={styles.actionTile}>
          <Text style={styles.actionTileVal}>{formatNumber(directionsCount)}</Text>
          <Text style={styles.actionTileLabel}>Directions</Text>
        </View>
        <View style={styles.actionTile}>
          <Text style={styles.actionTileVal}>{formatNumber(websiteCount)}</Text>
          <Text style={styles.actionTileLabel}>Website</Text>
        </View>
      </View>

      {/* Google Search Preview Module */}
      <View style={styles.previewOuter}>
        {/* Header Row */}
        <View style={styles.previewTopBar}>
          <View style={styles.previewBrandLeft}>
            <View style={styles.googleGMark}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <Text style={styles.previewSectionTitle}>Google Search Preview</Text>
          </View>

          <View style={[styles.previewBadge, { backgroundColor: previewBadge.bg }]}>
            <MaterialIcons name={previewBadge.icon} size={12} color={previewBadge.color} />
            <Text style={[styles.previewBadgeText, { color: previewBadge.color }]}>
              {previewBadge.label}
            </Text>
          </View>
        </View>

        {/* Full-width Realistic Search Bar */}
        <View style={styles.searchInputBar}>
          <MaterialIcons name="search" size={16} color="#5F6368" />
          <Text style={styles.searchInputQuery} numberOfLines={1}>
            {searchQueryText}
          </Text>
        </View>

        {/* Google Business Listing Preview Card */}
        <View style={styles.listingCard}>
          {/* Business Title + Verified Tick (only when truly verified) */}
          <View style={styles.listingTitleRow}>
            <Text style={styles.listingName} numberOfLines={2}>
              {displayName}
            </Text>
            {isVerifiedLive ? (
              <MaterialIcons name="verified" size={16} color="#1A73E8" style={{ marginTop: 2 }} />
            ) : null}
          </View>

          {/* Rating & Reviews Row (Honest empty state if 0 reviews) */}
          {hasReviews ? (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingNum}>{ratingVal.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {starIcons.map((starName, idx) => (
                  <MaterialIcons key={idx} name={starName} size={14} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.reviewCountText}>
                ({formatNumber(reviewCountVal)} {reviewCountVal === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          ) : (
            <View style={styles.ratingRow}>
              <MaterialIcons name="star-border" size={14} color="#94A3B8" />
              <Text style={styles.noReviewsText}>No Google reviews yet</Text>
            </View>
          )}

          {/* Category · Locality */}
          <Text style={styles.categoryLine} numberOfLines={1}>
            {displayLocality ? `${displayCategory} · ${displayLocality}` : displayCategory}
          </Text>

          {/* Storefront Address */}
          {displayAddress ? (
            <View style={styles.infoLine}>
              <MaterialIcons name="place" size={13} color="#64748B" />
              <Text style={styles.addressText} numberOfLines={2}>
                {displayAddress}
              </Text>
            </View>
          ) : null}

          {/* Genuine Local-Timezone Open/Closed Status */}
          <View style={styles.infoLine}>
            <View style={[styles.statusDot, { backgroundColor: hoursColor }]} />
            <Text style={[styles.hoursText, { color: hoursColor }]} numberOfLines={1}>
              {hoursStatus.label}
            </Text>
          </View>

          {/* Interactive Google Action Pills */}
          <View style={styles.quickActionPills}>
            <Pressable
              onPress={() => openExternal(resolvedMapsUrl)}
              style={({ pressed }) => [styles.actionPillBtn, pressed && styles.actionPillPressed]}
            >
              <MaterialIcons name="directions" size={14} color="#1A73E8" />
              <Text style={styles.actionPillText}>Maps</Text>
            </Pressable>

            {normalizedWebsite ? (
              <Pressable
                onPress={() => openExternal(normalizedWebsite)}
                style={({ pressed }) => [styles.actionPillBtn, pressed && styles.actionPillPressed]}
              >
                <MaterialIcons name="language" size={14} color="#1A73E8" />
                <Text style={styles.actionPillText}>Website</Text>
              </Pressable>
            ) : null}

            {displayPhone ? (
              <Pressable
                onPress={() => openExternal(`tel:${displayPhone.replace(/\s+/g, '')}`)}
                style={({ pressed }) => [styles.actionPillBtn, pressed && styles.actionPillPressed]}
              >
                <MaterialIcons name="call" size={14} color="#1A73E8" />
                <Text style={styles.actionPillText}>Call</Text>
              </Pressable>
            ) : null}

            {onEditProfile ? (
              <Pressable
                onPress={onEditProfile}
                style={({ pressed }) => [
                  styles.actionPillBtn,
                  styles.actionPillNeutral,
                  pressed && styles.actionPillPressed,
                ]}
              >
                <MaterialIcons name="edit" size={14} color="#475569" />
                <Text style={styles.actionPillNeutralText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Honest Search Visibility Footer + Contextual CTA */}
        <View style={styles.previewFooter}>
          <View style={styles.footerStatusLeft}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isVerifiedLive
                    ? '#10B981'
                    : isConnected
                      ? '#F59E0B'
                      : '#94A3B8',
                },
              ]}
            />
            <Text style={styles.footerStatusText} numberOfLines={1}>
              {isVerifiedLive
                ? 'Synced with Google Business'
                : isConnected && isPendingApproval
                  ? 'Google API access pending'
                  : isConnected
                    ? 'Connected profile'
                    : 'Not connected to Google'}
            </Text>
          </View>

          {!isConnected && onConnectGoogle ? (
            <Pressable
              onPress={onConnectGoogle}
              style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
            >
              <MaterialIcons name="link" size={14} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>Connect</Text>
            </Pressable>
          ) : onBoostPost ? (
            <Pressable
              onPress={onBoostPost}
              style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
            >
              <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>Boost with AI</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  periodSegmented: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  periodBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  periodPillStatic: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  periodPillStaticText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  heroPrimary: {
    flex: 1.15,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    gap: 6,
  },
  heroLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroBigNum: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  deltaText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  baselinePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: '#E2E8F0',
  },
  baselineText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  viewsMiniCard: {
    flex: 0.9,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'space-between',
    gap: 4,
  },
  viewsMiniLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E40AF',
  },
  viewsMiniValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: -0.4,
  },
  viewsMiniSub: {
    fontSize: 10.5,
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chartSection: {
    paddingTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 2,
  },
  actionTileVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionTileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  previewOuter: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  googleGMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A73E8',
  },
  previewSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  previewBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  searchInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DFE3E8',
  },
  searchInputQuery: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#202124',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  listingName: {
    flex: 1,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1F2937',
    lineHeight: 22,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  reviewCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  noReviewsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryLine: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
  },
  hoursText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#E8F0FE',
  },
  actionPillNeutral: {
    backgroundColor: '#F1F5F9',
  },
  actionPillPressed: {
    opacity: 0.72,
  },
  actionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A73E8',
  },
  actionPillNeutralText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  footerStatusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatusText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  ctaBtnPressed: {
    opacity: 0.85,
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
