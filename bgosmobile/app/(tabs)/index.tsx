import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, ActivityIndicator, Alert, Easing, Image, Linking, Modal, Pressable, Share, useWindowDimensions, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, MetricCard, ui, colors, Avatar, Loading } from '../../src/components/ui';
import { detectDeviceCountryAndTimezone, getGreetingForLocalTime } from '../../src/lib/country-codes';
import { extractCityOrLocality } from '../../src/lib/address';
import { BGOS_PUBLIC_WEB_URL } from '../../src/lib/constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brandMark = require('../../assets/brand-mark.png');
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { Speedometer, WeekScoreBars, scoreBandColor } from '../../src/components/gbp/speedometer';
import { WeeklyScoreLineChart } from '../../src/components/gbp/growth-charts';
import { MarketingTrackerSlide, type TrackerItem } from '../../src/components/gbp/marketing-tracker';
import { GooglePerformanceCard } from '../../src/components/gbp/google-performance';
import { SidebarDrawer } from '../../src/components/navigation/sidebar-drawer';
import { PushPromptModal } from '../../src/components/notifications/push-prompt';
import { ReviewRequestSheet } from '../../src/components/gbp/review-request';
import { GrowthActionSheet, type AutopilotGrowthActionItem, type RoadmapPhase } from '../../src/components/gbp/growth-action-sheet';
import type { AnalyticsResult, GbpPlaceResult } from '../../src/components/gbp/types';
import type { BgosConversation, BgosWorkspace } from '../../src/types/bgos-contracts';

type Booking = { id: string; title?: string; customerName?: string; scheduledAt?: string; status: string };

type MarketingScoreResponse = {
  isConnected: boolean;
  score: number | null;
  label: string | null; // "Poor" | "Average" | "Good" | "Great"
  components: Record<string, number>;
  reviewRating: number | null;
  reviewCount: number;
  history: { date: string; score: number | null }[];
  weekHistory: { date: string; score: number | null }[];
};

type Competitor = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  address: string | null;
  category: string | null;
  primaryCategoryLabel?: string | null;
  secondaryCategories?: string[];
  attributesList?: string[];
  photoCount?: number;
  recentReviews?: Array<{ author?: string; rating: number | null; text: string; relativeTime?: string }>;
  mapsRank?: number | null;
  rank?: number;
  ordinalRank?: number;
  isSelf?: boolean;
  mapsUrl: string | null;
  websiteUrl?: string | null;
  lastSeoScore?: number | null;
  source: string;
};

type CompetitorsResponse = {
  competitors: Competitor[];
  selfBusiness?: Competitor;
  migrationRequired?: boolean;
  placesUnavailable?: boolean;
};

type GrowthAction = {
  id: string;
  title: string;
  doneCount: number;
  totalCount: number;
  weeklyTarget: number | null;
  doneThisWeek: number;
  cta: string;
  dismissed: boolean;
  completed: boolean;
};

type GrowthActionsResponse = {
  actions: GrowthAction[];
  totalDone: number;
  totalTarget: number;
  leftCount: number;
  pendingApprovalCount: number;
  readinessScore?: number;
  readinessGrade?: string;
  autopilotActions?: AutopilotGrowthActionItem[];
  roadmap?: RoadmapPhase[];
  seoPendingCount?: number;
  targets?: {
    weeklyPosts: number;
    weeklyPhotos: number;
    weeklyReviews: number;
  };
  segments?: {
    reviews: { count: number; items: any[] };
    posts: { count: number; items: any[] };
    audit: { count: number; items: any[] };
    seo?: {
      pendingCount: number;
      pendingFixCount: number;
      score: number;
      grade: string;
      connectedToGoogle: boolean;
      landingUrl: string | null;
      hasRollback: boolean;
      searchTermsUsed: string[];
      items: any[];
      uncoveredSearchTerms: any[];
    };
  };
};

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

/**
 * Secondary operations & billing destinations — primary daily tools live in the
 * 4x2 Quick Actions grid near the top of Home and Profile Utilities in the GBP Card.
 */
const MORE_TOOLS: {
  label: string;
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { label: 'Inbox', route: '/inbox', icon: 'chat-bubble-outline' },
  { label: 'Leads Pipeline', route: '/leads', icon: 'people-outline' },
  { label: 'Keyword Planner', route: '/keyword-planner', icon: 'travel-explore' },
  { label: 'Outreach', route: '/outreach', icon: 'send' },
  { label: 'Submissions', route: '/submissions', icon: 'assignment' },
  { label: 'GBP Hub', route: '/growth', icon: 'hub' },
  { label: 'Page Settings', route: '/booking-page', icon: 'tune' },
  { label: 'Train AI Chatbot', route: '/agents', icon: 'smart-toy' },
  { label: 'Integrations', route: '/integrations', icon: 'extension' },
  { label: 'My Plan', route: '/my-plan', icon: 'credit-card' },
  { label: 'Help & FAQ', route: '/help', icon: 'help-outline' },
];

function MoreToolsGrid() {
  const router = useRouter();
  return (
    <Card style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More Operations and Billing, See All"
        onPress={() => router.push('/(tabs)/tools')}
        style={({ pressed }) => [
          ui.row,
          {
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 4,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={ui.heading}>More Operations &amp; Billing</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>See All</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.brand} />
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {MORE_TOOLS.map((tool) => (
          <Pressable
            key={tool.label}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tool.label}`}
            onPress={() => router.push(tool.route as any)}
            style={({ pressed }) => ({
              width: '30.3%',
              flexGrow: 1,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 14,
              paddingHorizontal: 4,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={[ui.iconTile, { width: 38, height: 38, borderRadius: 11 }]}>
              <MaterialIcons name={tool.icon} size={20} color={colors.brand} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

/** Marketing Score card — 3-slide carousel: Gauge + Weekly Growth + Marketing Tracker (Screenshot 08.55.29 (1)) */
function MarketingScoreCard({
  res,
  trackerItems,
  onImproveScore,
}: {
  res: {
    data: MarketingScoreResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<unknown>;
  };
  trackerItems?: TrackerItem[];
  onImproveScore?: () => void;
}) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [slideW, setSlideW] = useState(300);
  const score = res.data;
  const connected = Boolean(score?.isConnected) && score?.score != null;

  return (
    <Card style={{ gap: 14 }}>
      {/* Dynamic Header according to active slide */}
      {slide === 0 ? (
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!connected) return;
              Alert.alert(
                'Marketing Score (0–100%)',
                `Your composite score is ${Math.round(score!.score ?? 0)}%.\n\nIt measures 4 weighted pillars:\n• Profile Setup (40% weight)\n• Review Reply Rate (20% weight)\n• 30-Day Posts & Photos (20% weight)\n• Google Customer Engagement (20% weight)\n\nTip: Profile setup may be 88% complete, but regular posts and review replies are needed to boost your overall Marketing Score to 80%+.`
              );
            }}
            style={[ui.row, { gap: 6 }]}
          >
            <Text style={ui.heading}>Marketing Score</Text>
            {connected ? (
              <View style={{ backgroundColor: `${scoreBandColor(score!.score)}22`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: scoreBandColor(score!.score), fontSize: 10, fontWeight: '800' }}>
                  {score!.label ?? 'Score'} ⓘ
                </Text>
              </View>
            ) : null}
          </Pressable>
          {connected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Improve Marketing Score with Growth Actions"
              onPress={() => (onImproveScore ? onImproveScore() : router.push('/growth'))}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Improve Score →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : slide === 1 ? (
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Growth in Marketing Score</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="filter-list" size={15} color="#E11D48" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>This Week</Text>
          </View>
        </View>
      ) : (
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Marketing Tracker</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="filter-list" size={15} color="#E11D48" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>This Week</Text>
          </View>
        </View>
      )}

      {res.loading && !score ? (
        <Loading />
      ) : res.error && !score ? (
        <View style={{ gap: 8 }}>
          <Text style={ui.body}>Failed to load your Marketing Score.</Text>
          <Action label="Tap to retry" secondary onPress={() => void res.refresh()} />
        </View>
      ) : !connected ? (
        /* Honest not-connected state — no fabricated number. */
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 44, fontWeight: '900', color: colors.muted, letterSpacing: -1 }}>—</Text>
          <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>Not available</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/growth')}
            style={[ui.row, { gap: 4, marginTop: 2 }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>NOT_CONNECTED</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>· How to fix →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* 3-Slide Carousel: Slide 0 Speedometer · Slide 1 Weekly Growth · Slide 2 Marketing Tracker */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => setSlideW(e.nativeEvent.layout.width || 300)}
            onScroll={(e) =>
              setSlide(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, e.nativeEvent.layoutMeasurement.width)))
            }
            scrollEventThrottle={16}
          >
            {/* Slide 0: Speedometer & Goal Reach Slider */}
            <View style={{ width: slideW, minHeight: 220, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <View style={{ position: 'relative', alignItems: 'center' }}>
                <Speedometer score={score!.score ?? 0} size={210} />
                <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }} pointerEvents="none">
                  <Text style={{ fontSize: 32, fontWeight: '900', color: scoreBandColor(score!.score), letterSpacing: -0.8 }}>
                    {Math.round(score!.score ?? 0)}%
                  </Text>
                </View>
              </View>

              {/* Goal Reach Milestone Slider */}
              <View
                style={{
                  width: '92%',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialIcons name="flag" size={15} color={colors.brand} />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.ink }}>
                      Goal: 80% Local 3-Pack Target
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: (score?.score ?? 0) >= 80 ? colors.brand : '#D97706',
                    }}
                  >
                    {(score?.score ?? 0) >= 80
                      ? 'Goal Reached! 🏆'
                      : `${Math.max(0, 80 - Math.round(score?.score ?? 0))}% to reach`}
                  </Text>
                </View>

                {/* Progress Track */}
                <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(5, score?.score ?? 0))}%`,
                      height: '100%',
                      backgroundColor: scoreBandColor(score!.score),
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Slide 1: Growth Line Chart (hideHeader prevents duplicate title) */}
            <View style={{ width: slideW, minHeight: 220, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 }}>
              <WeeklyScoreLineChart history={score!.weekHistory || []} filterLabel="This Week" hideHeader />
            </View>

            {/* Slide 2: Marketing Tracker Table */}
            <View style={{ width: slideW, minHeight: 220, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 }}>
              <MarketingTrackerSlide width={slideW - 8} items={trackerItems} />
            </View>
          </ScrollView>

          {/* Page dots matching 3 slides */}
          <View style={[ui.row, { justifyContent: 'center', gap: 6, marginTop: -4 }]}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: slide === i ? '#EF4444' : colors.line,
                }}
              />
            ))}
          </View>

          <Action
            label={slide === 2 ? 'View All Growth Tasks →' : 'Improve Marketing Score →'}
            icon="trending-up"
            onPress={() => router.push('/growth')}
          />
        </>
      )}
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalTab, setReviewModalTab] = useState<'single' | 'bulk'>('single');
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const compactActions = width < 375 || fontScale > 1.2;
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const dayStart = new Date();
  dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23,59,59,999);
  const bookings = useResource<{ bookings: Booking[] }>(`/api/bookings?dateFrom=${dayStart.toISOString()}&dateTo=${dayEnd.toISOString()}&limit=100`);
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const submissions = useResource<{ responses: unknown[] }>('/api/forms/responses?limit=100');
  const reviews = useResource<{ reviews: Array<{ id?: string; rating?: number; createdAt?: string; createTime?: string; publishedAt?: string }> }>('/api/reviews?limit=30');
  const marketingScore = useResource<MarketingScoreResponse>('/api/gbp/marketing-score');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const gbpAnalytics = useResource<AnalyticsResult>('/api/gbp/analytics');
  const competitors = useResource<CompetitorsResponse>('/api/gbp/competitors');
  const growthActions = useResource<GrowthActionsResponse>('/api/gbp/growth-actions');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');
  const socialPosts = useResource<{ data?: Array<{ id?: string; status?: string }> }>(
    '/api/social/posts?platform=googlebusiness&limit=20',
  );
  const reviewQueue = useResource<{ queue?: { pending: number; sent: number; failed: number } }>(
    '/api/reviews/request',
  );

  const today = new Date().toDateString();
  const appointments = bookings.data?.bookings.filter(
    (b) => b.scheduledAt && new Date(b.scheduledAt).toDateString() === today && !['cancelled', 'completed'].includes(b.status)
  );
  const agency = workspace.data?.mode === 'agency';

  const refresh = async () => {
    await Promise.all([
      workspace.refresh(),
      inbox.refresh(),
      bookings.refresh(),
      leads.refresh(),
      submissions.refresh(),
      reviews.refresh(),
      marketingScore.refresh(),
      gbpPlace.refresh(),
      gbpAnalytics.refresh(),
      competitors.refresh(),
      growthActions.refresh(),
      discover.refresh(),
      socialPosts.refresh(),
      reviewQueue.refresh(),
    ].map((p) => Promise.resolve(p).catch(() => {})));
  };



  // ── Google's Performance (Last 30 Days) — REAL metrics from /api/gbp/place ──
  const perf = gbpPlace.data?.metrics;
  const perfConnected = Boolean(gbpPlace.data?.isConnected);

  const unreadCount = inbox.data ? inbox.data.reduce((s, c) => s + c.unreadCount, 0) : '—';
  const leadTotal = leads.data?.pagination?.total ?? '—';
  const submissionCount = submissions.data?.responses?.length ?? '—';
  const rawCompetitorList = competitors.data?.competitors || [];
  const competitorList = useMemo(() => {
    const hasSelf = rawCompetitorList.some((c) => c.isSelf);
    if (hasSelf || !competitors.data?.selfBusiness) return rawCompetitorList;
    const merged = [...rawCompetitorList, { ...competitors.data.selfBusiness, isSelf: true }];
    merged.sort((a, b) => (a.mapsRank ?? a.rank ?? 999) - (b.mapsRank ?? b.rank ?? 999));
    return merged;
  }, [rawCompetitorList, competitors.data?.selfBusiness]);
  const selfCompetitor = useMemo(
    () => competitorList.find((c) => c.isSelf) || competitors.data?.selfBusiness || null,
    [competitorList, competitors.data?.selfBusiness],
  );
  const displayedHomeCompetitors = useMemo(() => {
    const top8 = competitorList.slice(0, 8);
    if (!selfCompetitor) return top8;
    if (top8.some((c) => c.isSelf || c.id === selfCompetitor.id)) return top8;
    return [...competitorList.slice(0, 7), { ...selfCompetitor, isSelf: true }];
  }, [competitorList, selfCompetitor]);
  const actions = (growthActions.data?.actions || []).filter((a) => !a.dismissed);
  const totalDone = growthActions.data?.totalDone ?? 0;
  const totalTarget = growthActions.data?.totalTarget ?? 10;
  const leftCount = growthActions.data?.leftCount ?? Math.max(0, totalTarget - totalDone);

  const [growthButtonWidth, setGrowthButtonWidth] = useState(320);
  const nudge = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const hasGrowthActions = Boolean(growthActions.data && leftCount > 0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(nudge, {
          toValue: 1,
          duration: 1100,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(nudge, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      if (reduced) {
        loopAnim.stop();
        nudge.setValue(0);
      }
    });

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      loopAnim.start();
    }).catch(() => {});

    return () => {
      active = false;
      subscription.remove();
      loopAnim.stop();
      nudge.setValue(0);
    };
  }, [nudge]));

  async function dismissGrowthAction(id: string) {
    if (dismissingId) return;
    setDismissingId(id);
    try {
      await apiRequest('/api/gbp/growth-actions', { method: 'POST', body: { id, action: 'dismiss' } });
      await growthActions.refresh();
    } catch (e) {
      Alert.alert('Could not dismiss action', (e as Error).message || 'Please try again.');
    } finally {
      setDismissingId(null);
    }
  }

  const activeProfile = discover.data?.activeProfile;
  const profileName =
    activeProfile?.name ||
    gbpPlace.data?.place?.title ||
    gbpPlace.data?.tenantFallback?.name ||
    workspace.data?.name ||
    'My Business';
  const greetingText = getGreetingForLocalTime(workspace.data?.locale?.timeZone);
  const firstGreetingName = (user?.name || profileName || 'there').trim().split(/\s+/)[0];

  const place = gbpPlace.data?.place || gbpPlace.data?.tenantFallback;
  const address = place?.address || '';
  const city = extractCityOrLocality(address, (place as any)?.city || (workspace.data as any)?.tenant?.city);
  const category = place?.category || 'Local Business';
  const completionScore = place?.completionScore ?? 76;

  const businessLogoUrl = workspace.data?.bookingPageConfig?.logoUrl || null;
  useEffect(() => {
    setLogoLoadError(false);
  }, [businessLogoUrl]);
  const businessAccent = workspace.data?.bookingPageConfig?.accentColor || '#0B9042';
  const publicProfilePath = workspace.data?.links?.profile || '';
  const publicProfileUrl = publicProfilePath
    ? publicProfilePath.startsWith('http')
      ? publicProfilePath
      : `${BGOS_PUBLIC_WEB_URL}${publicProfilePath}`
    : '';

  // Circular Google Business action dock (Performance first + highlighted, 7 visible + More/Less toggle)
  const actionIcons = useMemo(
    () => [
      { id: 'performance', label: 'Performance', icon: 'insights' as const, onPress: () => router.push('/growth-report') },
      { id: 'edit_profile', label: 'Edit profile', icon: 'edit' as const, onPress: () => router.push('/manage-profile') },
      { id: 'edit_services', label: 'Services', icon: 'miscellaneous-services' as const, onPress: () => router.push('/services-management') },
      { id: 'products', label: 'Products', icon: 'shopping-bag' as const, onPress: () => router.push('/products-management') },
      { id: 'reviews', label: 'Reviews', icon: 'star-outline' as const, onPress: () => router.push('/(tabs)/reviews') },
      { id: 'add_photo', label: 'Add photo', icon: 'add-a-photo' as const, onPress: () => router.push('/(tabs)/photos') },
      { id: 'qr_standee', label: 'QR Standee', icon: 'qr-code-2' as const, onPress: () => router.push('/qr-standee') },
      { id: 'page_settings', label: 'Page Setup', icon: 'tune' as const, onPress: () => router.push('/booking-page') },
      { id: 'bookings', label: 'Bookings', icon: 'event-available' as const, onPress: () => router.push('/appointments') },
      { id: 'pickup_delivery', label: 'Ordering', icon: 'local-shipping' as const, onPress: () => router.push('/products-management?tab=fulfillment') },
      { id: 'advertise', label: 'Advertise', icon: 'campaign' as const, onPress: () => router.push('/products-management?tab=social') },
      { id: 'add_update', label: 'Add update', icon: 'post-add' as const, onPress: () => router.push('/(tabs)/marketing?generate=1') },
      {
        id: 'ask_reviews',
        label: 'Ask reviews',
        icon: 'rate-review' as const,
        onPress: () => {
          setReviewModalTab('single');
          setReviewModalOpen(true);
        },
      },
      { id: 'ai_chatbot', label: 'AI Chatbot', icon: 'smart-toy' as const, onPress: () => router.push('/agents') },
    ],
    [router],
  );
  const visibleActionIcons = actionsExpanded ? actionIcons : actionIcons.slice(0, 7);

  // Unified 4x2 Quick Actions grid — daily high-frequency workflows in one clean place
  const quickActions = useMemo(
    () => [
      {
        id: 'add_media',
        label: 'Add Media',
        icon: 'add-a-photo' as const,
        iconBg: '#DCFCE7',
        iconColor: '#009F50',
        onPress: () => router.push('/(tabs)/photos'),
      },
      {
        id: 'create_post',
        label: 'Create Post',
        icon: 'auto-awesome' as const,
        iconBg: '#DBEAFE',
        iconColor: '#2563EB',
        onPress: () => router.push('/(tabs)/marketing?generate=1'),
      },
      {
        id: 'request_review',
        label: 'Ask Review',
        icon: 'rate-review' as const,
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        onPress: () => {
          setReviewModalTab('single');
          setReviewModalOpen(true);
        },
      },
      {
        id: 'reply_reviews',
        label: 'Reviews',
        icon: 'star-half' as const,
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        onPress: () => router.push('/(tabs)/reviews'),
      },
      {
        id: 'add_lead',
        label: 'Add Lead',
        icon: 'person-add' as const,
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5',
        onPress: () => router.push('/leads?create=1'),
      },
      {
        id: 'book_appt',
        label: 'Book Appt',
        icon: 'event' as const,
        iconBg: '#CCFBF1',
        iconColor: '#0F766E',
        onPress: () => router.push('/appointments'),
      },
      {
        id: 'brand_brain',
        label: 'Brand Brain',
        icon: 'psychology' as const,
        iconBg: '#F3E8FF',
        iconColor: '#7C3AED',
        onPress: () => router.push('/preferences'),
      },
      {
        id: 'ai_seo_grid',
        label: 'AI SEO & Grid',
        icon: 'radar' as const,
        iconBg: '#E0F2FE',
        iconColor: '#0284C7',
        onPress: () => router.push('/seo-growth'),
      },
    ],
    [router],
  );

  const homeTopBar = (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      {/* Left: Menu + Brand + Compact Profile Switcher */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Operations Menu"
          onPress={() => setDrawerOpen(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? '#F1F5F9' : 'transparent',
          })}
        >
          <MaterialIcons name="menu" size={24} color="#0F172A" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch business profile"
          onPress={() => router.push('/select-profile')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 12,
            paddingLeft: 8,
            paddingRight: 8,
            paddingVertical: 5,
            flex: 1,
            maxWidth: 220,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#E0F2FE',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1' }}>
              {(profileName || 'B').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{ color: '#0F172A', fontSize: 13.5, fontWeight: '800', flexShrink: 1 }}
          >
            {profileName}
          </Text>
          <MaterialIcons name="expand-more" size={17} color="#64748B" />
        </Pressable>
      </View>

      {/* Right: Clean Help + Notifications */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Help and Support"
          onPress={() => router.push('/help')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#F0FDF4',
            borderWidth: 1,
            borderColor: '#BBF7D0',
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 16,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <MaterialIcons name="help-outline" size={14} color="#0B9042" />
          <Text style={{ color: '#0B9042', fontSize: 11.5, fontWeight: '700' }}>Help</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push('/inbox')}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <MaterialIcons name="notifications-none" size={20} color="#0F172A" />
        </Pressable>
      </View>
    </View>
  );

  // Floating Growth Action Dock (Always visible sticky full-width bar above bottom tabs)
  const growthActionFloatingDock = (
    <View style={{ width: '100%' }}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Pressable
          onLayout={(event) => setGrowthButtonWidth(event.nativeEvent.layout.width)}
          accessibilityRole="button"
          accessibilityLabel={`Growth Action: ${totalDone} of ${totalTarget} done, ${leftCount} left`}
          onPress={() => setGrowthModalOpen(true)}
          onPressIn={() => Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start()}
          style={({ pressed }) => ({
            width: '100%',
            minHeight: 52,
            borderRadius: 26,
            overflow: 'hidden',
            shadowColor: '#9333EA',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          })}
        >
          {/* Vibrant dual-gradient background */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: '#9333EA' }} />
            <View style={{ flex: 1, backgroundColor: '#EA580C' }} />
          </View>

          {/* Sweeping Shimmer Beam 1: Wide ambient glow */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 100,
              backgroundColor: 'rgba(255,255,255,0.18)',
              transform: [
                { translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [-120, growthButtonWidth + 120] }) },
                { skewX: '-20deg' },
              ],
            }}
          />

          {/* Sweeping Shimmer Beam 2: Bright center streak */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 45,
              backgroundColor: 'rgba(255,255,255,0.38)',
              transform: [
                { translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [-90, growthButtonWidth + 150] }) },
                { skewX: '-20deg' },
              ],
            }}
          />

          <View
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.4)',
                  transform: [{ scale: nudge.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [1, 1.28, 1.05, 1] }) }],
                }}
              >
                <Text style={{ fontSize: 16 }}>⚡</Text>
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '900', letterSpacing: -0.2 }}>
                  Google Growth Autopilot
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
                  {growthActions.loading && !growthActions.data
                    ? 'Loading next steps…'
                    : `${growthActions.data?.readinessScore ?? 78}% Ready • ${growthActions.data?.pendingApprovalCount ?? leftCount} pending approvals`}
                </Text>
              </View>
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );

  return (
    <>
      <Screen
        stickyHeader={homeTopBar}
        onRefresh={refresh}
        floatingAction={growthActionFloatingDock}
      >
      {/* Sleek Trial Promotional Banner — only shown when workspace is on trial */}
      {workspace.data?.plan?.status === 'trial' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="7 Days Free Trial Active. Tap to upgrade."
          onPress={() => router.push('/my-plan')}
          style={({ pressed }) => ({
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="local-offer" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '800' }}>
                7 Days Free Trial Active
              </Text>
              <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '500', marginTop: 1 }}>
                Full access to Google Growth &amp; AI · Upgrade anytime
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>Upgrade →</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Dynamic local time greeting hero matching UI kit */}
      <View style={{ paddingTop: 2, paddingBottom: 2 }}>
        <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink, letterSpacing: -0.45 }}>
          {greetingText}, {firstGreetingName} 👋
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
          Here&apos;s what&apos;s happening with {profileName}.
        </Text>
      </View>

      {/* ── Google Business Profile Verified Card & Circular Action Dock ── */}
      <Card
        style={{
          padding: 15,
          gap: 14,
          borderRadius: 18,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Manage ${profileName}`}
            onPress={() => router.push('/manage-profile')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              flex: 1,
              minWidth: 0,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: businessLogoUrl && !logoLoadError ? '#F8FAFC' : businessAccent,
                borderWidth: businessLogoUrl && !logoLoadError ? 1 : 0,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {businessLogoUrl && !logoLoadError ? (
                <Image
                  source={{ uri: businessLogoUrl }}
                  style={{ width: 42, height: 42 }}
                  resizeMode="contain"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                  {profileName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 }}
                >
                  {profileName}
                </Text>
                <MaterialIcons name="verified" size={16} color="#2563EB" />
              </View>
              <Text numberOfLines={1} style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {address || (city && city !== 'your area' ? `${category} • ${city}` : category)}
              </Text>
            </View>
          </Pressable>

          {/* Profile Strength Badge */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Profile strength: ${completionScore}%. Complete info.`}
            onPress={() => router.push('/manage-profile')}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: '#BBF7D0',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0B9042' }}>
              {completionScore}%
            </Text>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#15803D' }}>
              Complete
            </Text>
          </Pressable>
        </View>

        {/* ── Circular Action Icons Grid with More/Less Toggle ── */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            rowGap: 12,
            columnGap: 4,
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          {visibleActionIcons.map((act) => {
            const isPerformance = act.id === 'performance';
            return (
              <Pressable
                key={act.id}
                accessibilityRole="button"
                accessibilityLabel={act.label}
                onPress={act.onPress}
                style={({ pressed }) => ({
                  width: '23%',
                  alignItems: 'center',
                  gap: 5,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isPerformance ? '#EFF6FF' : '#F8FAFC',
                    borderWidth: isPerformance ? 1.5 : 1,
                    borderColor: isPerformance ? '#3B82F6' : '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isPerformance ? '#2563EB' : '#0F172A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isPerformance ? 0.18 : 0.05,
                    shadowRadius: isPerformance ? 3 : 2,
                    elevation: isPerformance ? 3 : 1,
                    position: 'relative',
                  }}
                >
                  <MaterialIcons
                    name={act.icon}
                    size={22}
                    color={isPerformance ? '#2563EB' : '#1E293B'}
                  />
                  {isPerformance ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 9,
                        height: 9,
                        borderRadius: 4.5,
                        backgroundColor: '#2563EB',
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                      }}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 10.5,
                    fontWeight: isPerformance ? '800' : '600',
                    color: isPerformance ? '#1D4ED8' : '#334155',
                    textAlign: 'center',
                    lineHeight: 13,
                    minHeight: 26,
                  }}
                >
                  {act.label}
                </Text>
              </Pressable>
            );
          })}

          {/* More / Less Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionsExpanded ? 'Show fewer actions' : 'Show more actions'}
            onPress={() => setActionsExpanded((v) => !v)}
            style={({ pressed }) => ({
              width: '23%',
              alignItems: 'center',
              gap: 5,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons
                name={actionsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color="#475569"
              />
            </View>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: '#475569',
                textAlign: 'center',
                lineHeight: 13,
                minHeight: 26,
              }}
            >
              {actionsExpanded ? 'Less' : 'More'}
            </Text>
          </Pressable>
        </View>

        {/* Clean Public Business Page Bar */}
        {!!publicProfileUrl && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your business page"
              onPress={() => void Linking.openURL(publicProfileUrl)}
              style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialIcons name="language" size={16} color="#0B9042" />
              <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A', flexShrink: 1 }}>
                {publicProfileUrl.replace(/^https?:\/\//, '')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share business page on WhatsApp"
              onPress={() => {
                const msg = encodeURIComponent(
                  `${profileName} — View services, hours, directions & book online: ${publicProfileUrl}`,
                );
                void Linking.openURL(`https://wa.me/?text=${msg}`);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#16A34A',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <MaterialIcons name="chat" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                WhatsApp
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share business page"
              onPress={() => {
                void Share.share({
                  title: profileName,
                  message: `${profileName}: ${publicProfileUrl}`,
                  url: publicProfileUrl,
                });
              }}
              style={({ pressed }) => ({
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: '#ECFDF5',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <MaterialIcons name="share" size={15} color="#059669" />
            </Pressable>
          </View>
        )}
      </Card>

      {/* Unified 4x2 Quick Actions Card — directly above analytics for instant access */}
      <Card style={{ padding: 14, gap: 12, borderRadius: 16 }}>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={ui.heading}>Quick Actions</Text>
          <Pressable onPress={() => router.push('/(tabs)/tools')} hitSlop={8}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>All Tools</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, justifyContent: 'space-between' }}>
          {quickActions.map((act) => (
            <Pressable
              key={act.id}
              accessibilityRole="button"
              accessibilityLabel={act.label}
              onPress={act.onPress}
              style={({ pressed }) => ({
                width: compactActions ? '48.5%' : '23.5%',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderRadius: 12,
                backgroundColor: pressed ? '#F1F5F9' : '#F8FAFC',
                borderWidth: 1,
                borderColor: '#EEF2F6',
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: act.iconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name={act.icon} size={20} color={act.iconColor} />
              </View>
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center' }}
              >
                {act.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <ErrorNotice
        message={workspace.error || inbox.error || bookings.error || leads.error || submissions.error}
        retry={refresh}
      />

      {/* Marketing Score — unified 3-slide carousel (Gauge, Growth line chart, Marketing tracker) */}
      <MarketingScoreCard
        res={marketingScore}
        onImproveScore={() => setGrowthModalOpen(true)}
        trackerItems={[
          {
            id: '1',
            name: 'AI Post Approved',
            target: 5,
            achieved: growthActions.data?.actions?.find((a) => a.id === 'approve_post')?.doneCount || 0,
            route: '/(tabs)/marketing',
          },
          {
            id: '2',
            name: 'AI Post Published',
            target: 5,
            achieved: (socialPosts.data?.data || []).filter((p) => p.status === 'published').length,
            route: '/(tabs)/marketing?mode=posts',
          },
          {
            id: '3',
            name: 'Media Uploaded',
            target: 5,
            achieved: growthActions.data?.actions?.find((a) => a.id === 'upload_media')?.doneCount || 0,
            route: '/(tabs)/photos',
          },
        ]}
      />

      {/* ── Google Business Growth Action Center (AI Autopilot Hub) ── */}
      <Card
        style={{
          padding: 16,
          borderRadius: 18,
          gap: 14,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>⚡</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                  Growth Action Center
                </Text>
                <View
                  style={{
                    backgroundColor: '#DCFCE7',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#16A34A' }}>AUTOPILOT</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 1 }}>
                {growthActions.data?.readinessScore ?? 78}/100 Readiness · {growthActions.data?.pendingApprovalCount || 0} Approvals Waiting
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Growth Autopilot Studio"
            onPress={() => setGrowthModalOpen(true)}
            style={{
              backgroundColor: '#F1F5F9',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brand }}>
              View All →
            </Text>
          </Pressable>
        </View>

        {/* Top 3 Prioritized Actions from Connected GBP Data */}
        <View style={{ gap: 10 }}>
          {(growthActions.data?.autopilotActions || []).slice(0, 3).map((act) => {
            const isP0 = act.priorityLevel === 'P0';
            return (
              <Pressable
                key={act.id}
                accessibilityRole="button"
                accessibilityLabel={act.title}
                onPress={() => setGrowthModalOpen(true)}
                style={({ pressed }) => ({
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isP0 ? '#FECACA' : '#E2E8F0',
                  padding: 12,
                  gap: 6,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: isP0 ? '#FEE2E2' : '#FEF3C7',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '900', color: isP0 ? '#DC2626' : '#D97706' }}>
                        {isP0 ? '🔥 P0 CRITICAL' : '⚡ P1 HIGH'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>
                      {act.phaseDays}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor:
                        act.status === 'awaiting_approval'
                          ? '#FFEDD5'
                          : act.status === 'ready_for_review'
                            ? '#E0E7FF'
                            : '#F1F5F9',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: '800',
                        color:
                          act.status === 'awaiting_approval'
                            ? '#EA580C'
                            : act.status === 'ready_for_review'
                              ? '#4338CA'
                              : '#475569',
                      }}
                    >
                      {act.status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                  {act.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                  {act.finding}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                  <View
                    style={{
                      backgroundColor: isP0 ? colors.brand : '#0F172A',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <MaterialIcons name="bolt" size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                      {act.cta}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 90-Day Roadmap Quick Preview */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open 90-Day Growth Roadmap"
          onPress={() => setGrowthModalOpen(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F0F9FF',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#BAE6FD',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🗺️</Text>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>
                90-Day Growth Roadmap Active
              </Text>
              <Text style={{ fontSize: 10.5, color: '#0284C7' }}>
                Fix Foundation (Days 1–7) • Build Trust • Expand Visibility
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={18} color="#0369A1" />
        </Pressable>
      </Card>

      {/* Google's Performance & Search Preview (100% Real GBP & Analytics Data) */}
      <GooglePerformanceCard
        metrics={{
          views: perf?.totalViews ?? gbpAnalytics.data?.metrics?.totalViews ?? ((perf?.searchImpressions || 0) + (perf?.mapsImpressions || 0)),
          searchImpressions: perf?.searchImpressions ?? gbpAnalytics.data?.metrics?.searchImpressions ?? 0,
          mapsImpressions: perf?.mapsImpressions ?? gbpAnalytics.data?.metrics?.mapsImpressions ?? 0,
          calls: perf?.callClicks ?? gbpAnalytics.data?.metrics?.callClicks ?? 0,
          directions: perf?.directionRequests ?? gbpAnalytics.data?.metrics?.directionRequests ?? 0,
          websiteClicks: perf?.websiteClicks ?? gbpAnalytics.data?.metrics?.websiteClicks ?? 0,
          bookings: perf?.bookings ?? gbpAnalytics.data?.metrics?.bookings ?? 0,
          interactions:
            (perf?.callClicks ?? gbpAnalytics.data?.metrics?.callClicks ?? 0) +
            (perf?.directionRequests ?? gbpAnalytics.data?.metrics?.directionRequests ?? 0) +
            (perf?.websiteClicks ?? gbpAnalytics.data?.metrics?.websiteClicks ?? 0) +
            (perf?.bookings ?? gbpAnalytics.data?.metrics?.bookings ?? 0),
          businessName: profileName,
          category,
          locality: city,
          address,
          phone: place?.phone || '',
          website: place?.website || '',
          mapsUrl: (place as any)?.mapsUrl || '',
          reviewUrl: (place as any)?.reviewUrl || '',
          rating: perf?.avgRating || gbpAnalytics.data?.metrics?.avgRating || 0,
          reviewCount: perf?.totalReviews || gbpAnalytics.data?.metrics?.totalReviews || 0,
          isConnected: Boolean(gbpPlace.data?.isConnected),
          isVerified: Boolean(
            gbpPlace.data?.isConnected &&
              !gbpPlace.data?.isPendingApproval &&
              gbpPlace.data?.place?.isVerified !== false,
          ),
          isPendingApproval: Boolean(
            gbpPlace.data?.isPendingApproval ?? gbpPlace.data?.place?.isPendingApproval,
          ),
          connectionState: gbpPlace.data?.connectionState,
          regularHours: place?.regularHours || null,
          specialHours: place?.specialHours || null,
          openNow: (place as any)?.openNow ?? null,
          timeZone: workspace.data?.locale?.timeZone || null,
          lastUpdated: gbpAnalytics.data?.lastUpdated,
          last30Days: perf?.last30Days
            ? {
                views: perf.last30Days.totalViews,
                searchImpressions: perf.last30Days.searchImpressions,
                mapsImpressions: perf.last30Days.mapsImpressions,
                calls: perf.last30Days.callClicks,
                directions: perf.last30Days.directionRequests,
                websiteClicks: perf.last30Days.websiteClicks,
                bookings: perf.last30Days.bookings,
              }
            : null,
          monthlyTrends: gbpAnalytics.data?.sixMonthTrends || null,
        }}
        onBoostPost={() => router.push('/(tabs)/marketing?generate=1')}
        onEditProfile={() => router.push('/manage-profile')}
        onConnectGoogle={() =>
          router.push(
            gbpPlace.data?.connectionState === 'select_profile'
              ? '/select-profile'
              : '/integrations',
          )
        }
      />

      <Text style={ui.heading}>Today</Text>
      {/* 2x2 Metric Tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard
          value={leadTotal}
          label="Total Leads"
          trendPositive={true}
          icon="people-outline"
        />
        <MetricCard
          value={submissionCount}
          label="Inquiries"
          trendPositive={true}
          icon="assignment"
        />
        <MetricCard
          value={unreadCount}
          label="Unread Messages"
          trendPositive={true}
          icon="chat-bubble-outline"
        />
        <MetricCard
          value={appointments?.length ?? '—'}
          label="Today's Schedule"
          trendPositive={true}
          icon="event"
        />
      </View>

      {/* Today's Appointments or Next Conversations */}
      <Card>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>{agency ? 'Next Conversations' : "Today's Appointments"}</Text>
          <Badge label={agency ? 'Pipeline' : `${appointments?.length || 0} scheduled`} accent />
        </View>

        {agency ? (
          <>
            <Text style={ui.body}>Review your leads and outreach before the next follow-up call.</Text>
            <MenuRow
              title="Lead Pipeline"
              detail="Review contacts and follow-ups"
              icon="people-outline"
              onPress={() => router.push('/leads')}
            />
            <MenuRow
              title="Campaign Approvals"
              detail="Review email & WhatsApp broadcasts"
              icon="send"
              onPress={() => router.push('/outreach')}
            />
          </>
        ) : bookings.error ? (
          <Text style={ui.body}>Appointments are currently unavailable. Retry above.</Text>
        ) : appointments?.length ? (
          appointments.slice(0, 4).map((b) => (
            <View
              key={b.id}
              style={[
                ui.row,
                {
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>{b.customerName || b.title || 'Client Appointment'}</Text>
                <Text style={ui.caption}>
                  {b.title || 'Service'} · {new Date(b.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Badge label={b.status} success={b.status === 'confirmed'} />
            </View>
          ))
        ) : (
          <Text style={ui.body}>
            {bookings.loading ? 'Loading your schedule…' : 'No appointments scheduled for today.'}
          </Text>
        )}

        <Action
          secondary
          label="View Full Calendar"
          icon="event"
          onPress={() => router.push('/appointments')}
        />
      </Card>

      {/* Competitor Analysis — real /api/gbp/competitors from Google Places (New) */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>🎯 Competitor Analysis</Text>
          <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
            <Badge label="Local Maps" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh competitors from Google Maps"
              onPress={async () => {
                try {
                  const updated = await apiRequest<CompetitorsResponse>('/api/gbp/competitors?refresh=1');
                  competitors.setData(updated);
                } catch {
                  await competitors.refresh();
                }
              }}
              style={({ pressed }) => ({
                padding: 4,
                borderRadius: 6,
                backgroundColor: pressed ? colors.line : 'transparent',
              })}
            >
              <MaterialIcons name="refresh" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
        <View style={[ui.row, { justifyContent: 'space-between', marginTop: -4 }]}>
          <Text style={[ui.caption, { fontWeight: '700', letterSpacing: 0.4 }]}>
            LOCAL COMPETITORS • WITHIN 5 KM
          </Text>
          {selfCompetitor ? (
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#1D4ED8' }}>
                Your Rank: #{Math.round(Number(selfCompetitor.mapsRank ?? selfCompetitor.rank ?? 1))}
              </Text>
            </View>
          ) : null}
        </View>

        {competitors.loading && !competitors.data ? (
          <Loading />
        ) : competitors.data?.migrationRequired ? (
          <Text style={ui.body}>
            Competitor tracking isn't set up on the server yet (migration pending) — this table will
            fill in automatically once it's applied.
          </Text>
        ) : competitorList.length === 0 ? (
          <Text style={ui.body}>
            {competitors.error
              ? 'Failed to load competitors — pull down to retry.'
              : competitors.data?.placesUnavailable
              ? 'Google Places is unavailable right now, so no competitors could be fetched. Pull down to retry.'
              : 'Nothing here yet — nearby competitors will appear once Google Places data is fetched for your area.'}
          </Text>
        ) : (
          <>
            <View style={[ui.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6, width: 42 }}>
                RANK
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6, flex: 1 }}>
                BUSINESS
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 }}>
                RATING
              </Text>
              <View style={{ width: 20 }} />
            </View>
            {displayedHomeCompetitors.map((comp, idx) => {
              const expanded = expandedCompetitor === comp.id;
              const isSelf = Boolean(comp.isSelf);
              const rawRank = comp.mapsRank ?? comp.rank ?? idx + 1;
              const rankVal = Math.max(1, Math.round(Number(rawRank)));
              const rankStyle = isSelf
                ? { bg: '#2563EB', fg: '#FFFFFF' }
                : rankVal <= 3
                  ? { bg: '#DCFCE7', fg: '#15803D' }
                  : rankVal <= 10
                    ? { bg: '#FEF3C7', fg: '#B45309' }
                    : { bg: '#F1F5F9', fg: '#475569' };
              return (
                <View
                  key={comp.id}
                  style={{
                    borderBottomWidth: idx < displayedHomeCompetitors.length - 1 ? 1 : 0,
                    borderBottomColor: isSelf ? '#BFDBFE' : colors.line,
                    backgroundColor: isSelf ? '#EFF6FF' : 'transparent',
                    borderRadius: isSelf ? 10 : 0,
                    paddingHorizontal: isSelf ? 6 : 0,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${isSelf ? 'Your business' : 'Competitor'} ${comp.name}, rank ${rankVal}${expanded ? ', hide details' : ', show details'}`}
                    onPress={() => setExpandedCompetitor(expanded ? null : comp.id)}
                    style={[ui.row, { justifyContent: 'space-between', paddingVertical: 9 }]}
                  >
                    <View style={{ width: 42, alignItems: 'flex-start' }}>
                      <View style={{ backgroundColor: rankStyle.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: rankStyle.fg }}>
                          #{rankVal}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSelf ? '#1E3A8A' : colors.ink, flexShrink: 1 }} numberOfLines={1}>
                          {comp.name}
                        </Text>
                        {isSelf ? (
                          <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>YOU</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 10, color: colors.muted }}>
                        {isSelf ? 'Your Google Business Profile' : comp.distanceKm != null ? `${comp.distanceKm} km away` : 'Nearby'}
                        {comp.reviewCount != null ? ` · ${comp.reviewCount} reviews` : ''}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#B45309' }}>
                        {comp.rating != null ? `★ ${comp.rating.toFixed(1)}` : '★ —'}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={expanded ? 'expand-less' : 'expand-more'}
                      size={18}
                      color={colors.muted}
                      style={{ marginLeft: 6 }}
                    />
                  </Pressable>
                  {expanded ? (
                    <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, marginBottom: 8, gap: 4 }}>
                      {comp.category ? <Text style={ui.caption}>Category: {comp.category}</Text> : null}
                      {comp.address ? <Text style={ui.caption}>{comp.address}</Text> : null}
                      {comp.websiteUrl ? (
                        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(comp.websiteUrl!)}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                            Visit Competitor Website ↗
                          </Text>
                        </Pressable>
                      ) : null}
                      {comp.mapsUrl ? (
                        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(comp.mapsUrl!)}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>
                            View on Google Maps ↗
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/seo-growth')}
              style={({ pressed }) => ({
                marginTop: 6,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: colors.brandSoft,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <MaterialIcons name="auto-awesome" size={16} color={colors.brandDark} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brandDark }}>
                AI Growth Autopilot (Auto-Apply Opportunities) →
              </Text>
            </Pressable>
          </>
        )}
      </Card>

      {/* More Tools — everything that left the bottom bar stays one tap away */}
      <MoreToolsGrid />

      {/* Growth Action Bottom Sheet Modal (Segmented Approvals Engine) */}
      <GrowthActionSheet
        visible={growthModalOpen}
        onClose={() => setGrowthModalOpen(false)}
        growthData={growthActions.data}
        onRefresh={growthActions.refresh}
      />

      {/* 1-Tap WhatsApp & Bulk 5/Day Google Review Request Sheet */}
      <ReviewRequestSheet
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        businessName={profileName || workspace.data?.name || user?.name || 'My Business'}
        initialTab={reviewModalTab}
        onQueueUpdated={() => reviewQueue.refresh()}
        reviewUrl={
          gbpPlace.data?.place?.reviewUrl ||
          (gbpPlace.data?.place?.placeId
            ? `https://search.google.com/local/writereview?placeid=${gbpPlace.data.place.placeId}`
            : gbpPlace.data?.place?.mapsUrl ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                profileName || workspace.data?.name || 'Google Business'
              )}`)
        }
        apiRequest={apiRequest}
      />

      </Screen>

      {/* Half-Screen Slide-Over Sidebar Drawer (Screenshot 08.55 benchmark, no Growth & Marketing) */}
      <SidebarDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Push Notification First-Launch Prompt */}
      <PushPromptModal />
    </>
  );
}
