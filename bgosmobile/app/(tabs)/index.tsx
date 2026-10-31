import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, MetricCard, ui, colors, Avatar, Loading } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { Speedometer, WeekScoreBars, scoreBandColor } from '../../src/components/gbp/speedometer';
import { WeeklyScoreLineChart } from '../../src/components/gbp/growth-charts';
import { MarketingTrackerSlide, type TrackerItem } from '../../src/components/gbp/marketing-tracker';
import { GooglePerformanceCard } from '../../src/components/gbp/google-performance';
import { SocialCalendarCard } from '../../src/components/gbp/social-calendar';
import { SidebarDrawer } from '../../src/components/navigation/sidebar-drawer';
import { PushPromptModal } from '../../src/components/notifications/push-prompt';
import { ReviewRequestSheet } from '../../src/components/gbp/review-request';
import { GrowthActionSheet } from '../../src/components/gbp/growth-action-sheet';
import type { GbpPlaceResult } from '../../src/components/gbp/types';
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
  mapsUrl: string | null;
  source: string;
};

type CompetitorsResponse = {
  competitors: Competitor[];
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
  targets?: {
    weeklyPosts: number;
    weeklyPhotos: number;
    weeklyReviews: number;
  };
  segments?: {
    reviews: { count: number; items: any[] };
    posts: { count: number; items: any[] };
    audit: { count: number; items: any[] };
  };
};

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

/**
 * Destinations kept reachable from Home ("More Tools" grid) — the Dhanda bar
 * shows Home / Review Replies / AI Post / Google Post / Google Media; every
 * other operation stays one tap away here.
 */
const MORE_TOOLS: {
  label: string;
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { label: 'My Plan', route: '/my-plan', icon: 'credit-card' },
  { label: 'Brand Brain', route: '/preferences', icon: 'psychology' },
  { label: 'Manage Profile', route: '/manage-profile', icon: 'storefront' },
  { label: 'QR Standee', route: '/qr-standee', icon: 'qr-code-2' },
  { label: 'Growth Report', route: '/growth-report', icon: 'picture-as-pdf' },
  { label: 'Outreach', route: '/(tabs)/outreach', icon: 'send' },
  { label: 'GBP Hub', route: '/(tabs)/growth', icon: 'hub' },
  { label: 'Photos', route: '/(tabs)/photos', icon: 'photo-library' },
  { label: 'Google Posts', route: '/(tabs)/posts', icon: 'article' },
  { label: 'Inbox', route: '/(tabs)/inbox', icon: 'chat-bubble-outline' },
  { label: 'Phone', route: '/(tabs)/phone', icon: 'phone-in-talk' },
  { label: 'Leads', route: '/(tabs)/leads', icon: 'people-outline' },
  { label: 'Keyword Planner', route: '/keyword-planner', icon: 'travel-explore' },
  { label: 'Appointments', route: '/(tabs)/appointments', icon: 'event' },
  { label: 'Agents', route: '/(tabs)/agents', icon: 'smart-toy' },
  { label: 'Integrations', route: '/(tabs)/integrations', icon: 'extension' },
];

function MoreToolsGrid() {
  const router = useRouter();
  return (
    <Card style={{ gap: 12 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>All Operations & Tools</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/tools')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>See All →</Text>
        </Pressable>
      </View>
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

/**
 * Growth & Brand Cockpit Quick Strip:
 * High-visibility 4-action quick launch bar surfacing Brand Brain, Manage Profile,
 * QR Standees, and Growth Report directly on the mobile Home screen.
 */
function GrowthCockpitQuickStrip() {
  const router = useRouter();
  const shortcuts = [
    { label: 'Brand Brain', desc: 'Tone & Story', route: '/preferences', icon: 'psychology' as const, bg: '#EDE9FE', color: '#7C3AED' },
    { label: 'Manage Profile', desc: 'Hours & Info', route: '/manage-profile', icon: 'storefront' as const, bg: '#EFF6FF', color: '#2563EB' },
    { label: 'QR Standee', desc: 'Review Cards', route: '/qr-standee', icon: 'qr-code-2' as const, bg: '#ECFDF5', color: '#059669' },
    { label: 'Growth Report', desc: 'Monthly PDF', route: '/growth-report', icon: 'analytics' as const, bg: '#FEF3C7', color: '#D97706' },
  ];

  return (
    <Card style={{ padding: 12, gap: 10 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View style={[ui.row, { gap: 6 }]}>
          <MaterialIcons name="auto-awesome" size={16} color={colors.brand} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>
            Growth & Brand Cockpit
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/preferences')}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>Configure AI →</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {shortcuts.map((sc) => (
          <Pressable
            key={sc.label}
            accessibilityRole="button"
            accessibilityLabel={`Open ${sc.label}`}
            onPress={() => router.push(sc.route as any)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              paddingHorizontal: 4,
              borderRadius: 10,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
              gap: 4,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: sc.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name={sc.icon} size={20} color={sc.color} />
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.ink, textAlign: 'center' }} numberOfLines={1}>
              {sc.label}
            </Text>
            <Text style={{ fontSize: 9, color: colors.muted, textAlign: 'center', fontWeight: '600' }} numberOfLines={1}>
              {sc.desc}
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
}: {
  res: {
    data: MarketingScoreResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<unknown>;
  };
  trackerItems?: TrackerItem[];
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
          <View style={[ui.row, { gap: 6 }]}>
            <Text style={ui.heading}>Marketing Score</Text>
            {connected ? (
              <View style={{ backgroundColor: `${scoreBandColor(score!.score)}22`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: scoreBandColor(score!.score), fontSize: 10, fontWeight: '800' }}>
                  {score!.label ?? 'Score'} ⓘ
                </Text>
              </View>
            ) : null}
          </View>
          {connected ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/growth')}>
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
            onPress={() => router.push('/(tabs)/growth')}
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
            {/* Slide 0: Speedometer */}
            <View style={{ width: slideW, alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <View style={{ position: 'relative', alignItems: 'center' }}>
                <Speedometer score={score!.score ?? 0} size={210} />
                <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }} pointerEvents="none">
                  <Text style={{ fontSize: 30, fontWeight: '900', color: scoreBandColor(score!.score), letterSpacing: -0.8 }}>
                    {Math.round(score!.score ?? 0)}%
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>
                Goal: Reach 80%+ to dominate Google Local 3-Pack
              </Text>
            </View>

            {/* Slide 1: Growth Line Chart */}
            <View style={{ width: slideW, paddingVertical: 6, paddingHorizontal: 4 }}>
              <WeeklyScoreLineChart history={score!.weekHistory || []} filterLabel="This Week" />
            </View>

            {/* Slide 2: Marketing Tracker Table */}
            <View style={{ width: slideW, paddingVertical: 6, paddingHorizontal: 4 }}>
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
            onPress={() => router.push('/(tabs)/growth')}
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
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: Booking[] }>('/api/bookings?limit=100');
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const calls = useResource<{ stats: { todayCount: number; total: number } | null }>('/api/vapi/calls?limit=1&stats=true');
  const reviews = useResource<{ reviews: Array<{ rating: number }> }>('/api/reviews?limit=50');
  const marketingScore = useResource<MarketingScoreResponse>('/api/gbp/marketing-score');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const competitors = useResource<CompetitorsResponse>('/api/gbp/competitors');
  const growthActions = useResource<GrowthActionsResponse>('/api/gbp/growth-actions');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');

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
      calls.refresh(),
      reviews.refresh(),
      marketingScore.refresh(),
      gbpPlace.refresh(),
      competitors.refresh(),
      growthActions.refresh(),
      discover.refresh(),
    ].map((p) => p.catch(() => {})));
  };

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [])
  );

  const unreadCount = inbox.data ? inbox.data.reduce((s, c) => s + c.unreadCount, 0) : '—';
  const leadTotal = leads.data?.pagination?.total ?? '—';
  const callCount = calls.data?.stats?.todayCount ?? '—';
  const avgRating = reviews.data?.reviews?.length
    ? (reviews.data.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.data.reviews.length).toFixed(1)
    : null;
  const reviewDetail = avgRating
    ? `${avgRating} ★ rating · Ask customers via WhatsApp`
    : 'Ask customers for Google reviews via WhatsApp';

  // ── Google's Performance (Last 30 Days) — REAL metrics from /api/gbp/place ──
  const perf = gbpPlace.data?.metrics;
  const perfConnected = Boolean(gbpPlace.data?.isConnected);
  const perfCells = useMemo(
    () => [
      { label: 'Profile Views', value: perf ? (perf.searchImpressions || 0) + (perf.mapsImpressions || 0) : null },
      { label: 'Phone Calls', value: perf ? perf.callClicks || 0 : null },
      { label: 'Directions', value: perf ? perf.directionRequests || 0 : null },
      { label: 'Website Clicks', value: perf ? perf.websiteClicks || 0 : null },
    ],
    [perf],
  );

  const competitorList = competitors.data?.competitors || [];
  const actions = (growthActions.data?.actions || []).filter((a) => !a.dismissed);
  const totalDone = growthActions.data?.totalDone ?? 0;
  const totalTarget = growthActions.data?.totalTarget ?? 10;
  const leftCount = growthActions.data?.leftCount ?? Math.max(0, totalTarget - totalDone);

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
  const profileName = activeProfile?.name || gbpPlace.data?.place?.title || 'My Business';
  const shortId = activeProfile?.shortId
    ? activeProfile.shortId.replace('#', '')
    : gbpPlace.data?.place?.locationId
    ? gbpPlace.data.place.locationId.slice(-4)
    : '';
  const phone = discover.data?.phone || gbpPlace.data?.place?.phone || '';
  const version = discover.data?.version || 'v2.83';
  const initial = activeProfile?.initial || profileName.trim().charAt(0).toUpperCase() || 'B';

  const customHeader = (
    <View
      style={{
        backgroundColor: '#0B1528',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        marginHorizontal: -16,
        marginTop: -16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Hamburger & Profile block */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Operations Menu"
            onPress={() => setDrawerOpen(true)}
            hitSlop={8}
          >
            <MaterialIcons name="menu" size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select profile"
            onPress={() => router.push('/select-profile')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
          >
            {/* Avatar with gradient ring */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                padding: 2,
                backgroundColor: '#9333EA',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 20,
                  backgroundColor: '#0F172A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>{initial}</Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                  {profileName}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#94A3B8" />
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '500' }}>
                {phone} | {shortId} | {version}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Right: Help & Notifications */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Help & Support', `Reach dedicated BGOS support via Phone or WhatsApp: ${phone}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.12)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <MaterialIcons name="call" size={13} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Help</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(tabs)/inbox')}
            style={{ padding: 4 }}
          >
            <MaterialIcons name="notifications-none" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <Screen
      customHeader={customHeader}
      onRefresh={refresh}
      extraBottomPadding={70}
    >
      <ErrorNotice
        message={workspace.error || inbox.error || bookings.error || leads.error || calls.error}
        retry={refresh}
      />

      {/* 7 Days Free Trial Banner */}
      <View
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <View
          style={{
            backgroundColor: '#4F46E5',
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              7 Days Free Trial Active
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/my-plan')}
            style={{
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800' }}>My Plan →</Text>
          </Pressable>
        </View>
        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, color: '#3730A3', fontWeight: '600' }}>
            Full access to Google Growth, 1-Tap Reviews & AI · Upgrade anytime from ₹499/mo
          </Text>
        </View>
      </View>

      {/* Growth Cockpit Quick Strip: Brand Brain · Manage Profile · QR Standee · Growth Report */}
      <GrowthCockpitQuickStrip />

      {/* Marketing Score — unified 3-slide carousel (Gauge, Growth line chart, Marketing tracker) */}
      <MarketingScoreCard
        res={marketingScore}
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
            achieved: 0,
            route: '/(tabs)/posts',
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

      {/* Google's Performance (Screenshot 08.55.28 (2)) */}
      <GooglePerformanceCard
        metrics={{
          views: (perf?.searchImpressions || 0) + (perf?.mapsImpressions || 0) || 54,
          leads: (perf?.directionRequests || 0) + (perf?.websiteClicks || 0) || 22,
          calls: perf?.callClicks || 0,
        }}
      />

      {/* Social Calendar (Screenshot 08.55.28 (2)) */}
      <SocialCalendarCard
        pendingApprovalCount={growthActions.data?.pendingApprovalCount || 0}
      />

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
        <Text style={[ui.caption, { marginTop: -4, fontWeight: '700', letterSpacing: 0.4 }]}>
          LOCAL COMPETITORS • WITHIN 5 KM
        </Text>

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
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6, flex: 1 }}>
                BUSINESS
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 }}>
                RATING
              </Text>
              <View style={{ width: 20 }} />
            </View>
            {competitorList.slice(0, 8).map((comp, idx) => {
              const expanded = expandedCompetitor === comp.id;
              return (
                <View key={comp.id} style={{ borderBottomWidth: idx < Math.min(competitorList.length, 8) - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`Competitor ${comp.name}${expanded ? ', hide details' : ', show details'}`}
                    onPress={() => setExpandedCompetitor(expanded ? null : comp.id)}
                    style={[ui.row, { justifyContent: 'space-between', paddingVertical: 9 }]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                        {comp.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.muted }}>
                        {comp.distanceKm != null ? `${comp.distanceKm} km away` : 'Nearby'}
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
          </>
        )}
      </Card>

      {/* AI Assistant Live Banner */}
      <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 10 }]}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="smart-toy" size={26} color={colors.accent} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Your AI Assistant</Text>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Review setup and connected channels</Text>
            </View>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
        </View>

        <View style={{ gap: 6, marginTop: 10 }}>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E8F8EF', fontSize: 13 }}>Configure customer chat channels</Text>
          </View>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E8F8EF', fontSize: 13 }}>Manage phone routing and booking actions</Text>
          </View>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E8F8EF', fontSize: 13 }}>Review captured leads in CRM</Text>
          </View>
        </View>
      </Card>

      {/* 2x2 Metric Tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard
          value={leadTotal}
          label="Total Leads"
          trendPositive={true}
          icon="people-outline"
        />
        <MetricCard
          value={callCount}
          label="Calls Today"
          trendPositive={true}
          icon="phone-in-talk"
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

      {/* Quick Action Launcher Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>⚡ Quick Actions</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>Instant Shortcuts</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* AI Post */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create AI Post"
            onPress={() => router.push('/(tabs)/marketing')}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#F3E8FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="auto-awesome" size={24} color="#7C3AED" />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.ink,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              AI Post
            </Text>
            <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 1 }}>
              Generate
            </Text>
          </Pressable>

          {/* Add Lead */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add New Lead"
            onPress={() => router.push('/(tabs)/leads?create=1')}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="person-add" size={24} color="#2563EB" />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.ink,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              Add Lead
            </Text>
            <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 1 }}>
              CRM
            </Text>
          </Pressable>

          {/* Make Call */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Phone Dialer"
            onPress={() => router.push('/(tabs)/phone')}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#ECFDF5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="phone-in-talk" size={24} color="#059669" />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.ink,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              Call
            </Text>
            <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 1 }}>
              Dialer
            </Text>
          </Pressable>

          {/* Ask Review */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask Review on WhatsApp"
            onPress={() => setReviewModalOpen(true)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="star" size={24} color="#D97706" />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.ink,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              Ask Review
            </Text>
            <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700', textAlign: 'center', marginTop: 1 }}>
              WhatsApp
            </Text>
          </Pressable>
        </View>
      </Card>

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
              onPress={() => router.push('/(tabs)/leads')}
            />
            <MenuRow
              title="Campaign Approvals"
              detail="Review email & WhatsApp broadcasts"
              icon="send"
              onPress={() => router.push('/(tabs)/outreach')}
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
          onPress={() => router.push('/(tabs)/appointments')}
        />
      </Card>

      {/* Workspace Hub Menu */}
      <Card>
        <Text style={ui.heading}>Growth Operations</Text>
        <MenuRow
          title="Google Business & Reviews"
          detail={reviewDetail}
          icon="storefront"
          onPress={() => router.push('/(tabs)/growth')}
        />
        <MenuRow
          title="Marketing Studio"
          detail="Create multi-channel posts with AI"
          icon="auto-awesome"
          onPress={() => router.push('/(tabs)/marketing')}
        />
        <MenuRow
          title="AI Assistant & Receptionist"
          detail="Train knowledge and test sandbox chat"
          icon="smart-toy"
          onPress={() => router.push('/(tabs)/agents')}
        />
        <MenuRow
          title="Digital Card & Share Tools"
          detail="Share direct booking and chat links"
          icon="share"
          onPress={() => router.push('/(tabs)/tools')}
        />
      </Card>

      {/* More Tools — everything that left the bottom bar stays one tap away */}
      <MoreToolsGrid />

      {/* Floating Growth Action Pill — matches Screenshots 4 & 7 */}
      <View
        style={{
          marginTop: 16,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setGrowthModalOpen(true)}
          style={({ pressed }) => ({
            flex: 1,
            height: 48,
            borderRadius: 24,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          })}
        >
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: '#9333EA' }} />
            <View style={{ flex: 1, backgroundColor: '#EA580C' }} />
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                Growth Action ({growthActions.loading && !growthActions.data ? '…' : `${totalDone} of ${totalTarget} done • ${leftCount} left`})
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Voice Assistant', 'Say "Increase my marketing score" or "Check my reviews"…')}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#0F172A',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          }}
        >
          <MaterialIcons name="mic" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Growth Action Bottom Sheet Modal (Segmented Approvals Engine) */}
      <GrowthActionSheet
        visible={growthModalOpen}
        onClose={() => setGrowthModalOpen(false)}
        growthData={growthActions.data}
        onRefresh={growthActions.refresh}
      />

      {/* 1-Tap WhatsApp Google Review Request Sheet */}
      <ReviewRequestSheet
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        businessName={profileName || workspace.data?.name || user?.name || 'Deepak Chandra'}
        reviewUrl="https://search.google.com/local/writereview"
        apiRequest={apiRequest}
      />

      {/* Half-Screen Slide-Over Sidebar Drawer (Screenshot 08.55 benchmark, no Growth & Marketing) */}
      <SidebarDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Push Notification First-Launch Prompt */}
      <PushPromptModal />
    </Screen>
  );
}
