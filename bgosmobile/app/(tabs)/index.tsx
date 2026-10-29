import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, MetricCard, ui, colors, Avatar, Loading } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { Speedometer, WeekScoreBars, scoreBandColor } from '../../src/components/gbp/speedometer';
import type { BgosConversation, BgosWorkspace } from '../../../shared/bgos-contracts';

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
};

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
  { label: 'GBP Hub', route: '/(tabs)/growth', icon: 'storefront' },
  { label: 'Photos', route: '/(tabs)/photos', icon: 'photo-library' },
  { label: 'Google Posts', route: '/(tabs)/posts', icon: 'article' },
  { label: 'Inbox', route: '/(tabs)/inbox', icon: 'chat-bubble-outline' },
  { label: 'Phone', route: '/(tabs)/phone', icon: 'phone-in-talk' },
  { label: 'Leads', route: '/(tabs)/leads', icon: 'people-outline' },
  { label: 'Keyword Planner', route: '/keyword-planner', icon: 'travel-explore' },
  { label: 'Appointments', route: '/(tabs)/appointments', icon: 'event' },
  { label: 'Outreach', route: '/(tabs)/outreach', icon: 'send' },
  { label: 'Agents', route: '/(tabs)/agents', icon: 'smart-toy' },
  { label: 'Automations', route: '/(tabs)/automations', icon: 'bolt' },
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
            onPress={() => router.push(tool.route)}
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

/** Marketing Score card — swipeable: gauge slide + weekly growth chart slide. */
function MarketingScoreCard({
  res,
}: {
  res: {
    data: MarketingScoreResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<unknown>;
  };
}) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [slideW, setSlideW] = useState(300);
  const score = res.data;
  const connected = Boolean(score?.isConnected) && score?.score != null;

  return (
    <Card style={{ gap: 14 }}>
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
          {/* Slide 1: speedometer · Slide 2: weekly growth */}
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
            <View style={{ width: slideW, paddingVertical: 6, paddingHorizontal: 4 }}>
              <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 12, gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
                  📈 Growth in Marketing Score
                </Text>
                <WeekScoreBars history={score!.weekHistory || []} />
              </View>
            </View>
          </ScrollView>

          {/* Page dots */}
          <View style={[ui.row, { justifyContent: 'center', gap: 6, marginTop: -6 }]}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: slide === i ? colors.brand : colors.line,
                }}
              />
            ))}
          </View>

          <Action
            label="Improve Marketing Score →"
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
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: Booking[] }>('/api/bookings?limit=100');
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const calls = useResource<{ stats: { todayCount: number; total: number } | null }>('/api/vapi/calls?limit=1&stats=true');
  const reviews = useResource<{ reviews: Array<{ rating: number }> }>('/api/reviews?limit=50');
  const marketingScore = useResource<MarketingScoreResponse>('/api/gbp/marketing-score');
  const gbpPlace = useResource<{ isConnected: boolean; metrics?: { searchImpressions: number; mapsImpressions: number; callClicks: number; directionRequests: number; websiteClicks: number } | null }>('/api/gbp/place');
  const competitors = useResource<CompetitorsResponse>('/api/gbp/competitors');
  const growthActions = useResource<GrowthActionsResponse>('/api/gbp/growth-actions');

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
    ].map((p) => p.catch(() => {})));
  };

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

  return (
    <Screen
      title={`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, ${user?.name?.split(' ')[0] || 'there'}! 👋`}
      subtitle={`${workspace.data?.name || 'Your Business'} · ${agency ? 'Sales Workspace' : 'Your Day at a Glance'}`}
      onRefresh={refresh}
      rightAction={
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/settings')}>
          <Avatar name={user?.name || 'BGOS User'} size={38} />
        </Pressable>
      }
    >
      <ErrorNotice
        message={workspace.error || inbox.error || bookings.error || leads.error || calls.error}
        retry={refresh}
      />

      {/* 30 Days Marketing Trial Banner (Dhanda AI Benchmark) */}
      <View
        style={{
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          borderWidth: 1,
          borderRadius: 14,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 16 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
              30 Days Marketing Trial (5 days left)
            </Text>
            <Text style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
              Your trial is active. Automate Google posts and review collection.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/growth')}
          style={{
            backgroundColor: '#F59E0B',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Upgrade</Text>
        </Pressable>
      </View>

      {/* Marketing Score — real /api/gbp/marketing-score (speedometer + growth slide) */}
      <MarketingScoreCard res={marketingScore} />

      {/* Google's Performance (30 Days) — real /api/gbp/place metrics */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Google's Performance</Text>
          <Badge label="Last 30 Days" accent />
        </View>

        {!perfConnected && !gbpPlace.loading ? (
          <Text style={ui.body}>
            Connect your Google Business Profile to see real views, calls, directions and website clicks.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {perfCells.map((cell) => (
              <View key={cell.label} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>
                  {gbpPlace.loading && !perf ? '…' : cell.value == null ? '—' : cell.value.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{cell.label}</Text>
              </View>
            ))}
          </View>
        )}
        {gbpPlace.error ? (
          <Text style={{ fontSize: 11, color: colors.noteText }}>
            Performance data unavailable — pull down to retry.
          </Text>
        ) : null}
      </Card>

      {/* Competitor Analysis — real /api/gbp/competitors */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>🎯 Competitor Analysis</Text>
          <Badge label="Local Maps" />
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

      {/* Quick Action Pills */}
      <Text style={ui.heading}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: '22%' }}>
          <Action
            label="AI Post"
            icon="auto-awesome"
            secondary
            onPress={() => router.push('/(tabs)/marketing')}
          />
        </View>
        <View style={{ flex: 1, minWidth: '22%' }}>
          <Action
            label="Add Lead"
            icon="person-add"
            onPress={() => router.push('/(tabs)/leads?create=1')}
          />
        </View>
        <View style={{ flex: 1, minWidth: '22%' }}>
          <Action
            label="Call"
            icon="call"
            secondary
            onPress={() => router.push('/(tabs)/phone')}
          />
        </View>
        <View style={{ flex: 1, minWidth: '22%' }}>
          <Action
            label="Ask Review"
            icon="star-outline"
            secondary
            onPress={() => router.push('/(tabs)/growth')}
          />
        </View>
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

      {/* Floating Growth Action Pill — real /api/gbp/growth-actions */}
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
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F59E0B',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              Growth Action ({growthActions.loading && !growthActions.data ? '…' : `${totalDone} of ${totalTarget} done • ${leftCount} left`})
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Voice Assistant', 'Speak your marketing request in Hindi or English...')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.brand,
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

      {/* Growth Action Bottom Sheet Modal */}
      <Modal visible={growthModalOpen} animationType="slide" transparent={true} onRequestClose={() => setGrowthModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 16,
              maxHeight: '80%',
            }}
          >
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <Text style={{ fontSize: 20 }}>⚡</Text>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Daily Growth Actions</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Follow daily steps to boost your Google rank</Text>
                </View>
              </View>
              <Pressable onPress={() => setGrowthModalOpen(false)} accessibilityRole="button" accessibilityLabel="Close growth actions">
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {/* Progress — real counters from the API */}
            <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, gap: 6 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>Daily Marketing Progress</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                  {growthActions.loading && !growthActions.data ? '…' : `${totalDone} of ${totalTarget} done`}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#FDE68A', borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    backgroundColor: '#F59E0B',
                    width: `${Math.max(4, Math.min(100, (totalDone / (totalTarget || 10)) * 100))}%`,
                  }}
                />
              </View>
            </View>

            <ErrorNotice message={growthActions.error} retry={growthActions.refresh} />

            {/* Real action cards */}
            {growthActions.loading && !growthActions.data ? (
              <Loading />
            ) : actions.length === 0 && !growthActions.error ? (
              <Text style={[ui.body, { textAlign: 'center', paddingVertical: 10 }]}>
                {growthActions.data
                  ? "All growth actions are complete or dismissed — nothing left today. 🎉"
                  : 'Growth actions unavailable.'}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {actions.map((action) => (
                  <View
                    key={action.id}
                    style={[ui.row, { justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'flex-start' }]}
                  >
                    <View style={{ flex: 1, marginRight: 8, gap: 3 }}>
                      <View style={[ui.row, { gap: 6 }]}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{action.title}</Text>
                        {action.completed ? <Badge label="Done ✓" success /> : null}
                      </View>
                      <Text style={{ fontSize: 10.5, color: colors.muted }}>
                        {action.doneCount}/{action.totalCount} done
                        {action.weeklyTarget ? ` · ${action.doneThisWeek} this week (target ${action.weeklyTarget})` : ''}
                      </Text>
                      <View style={{ height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden', marginTop: 3 }}>
                        <View
                          style={{
                            height: '100%',
                            backgroundColor: action.completed ? colors.success : colors.brand,
                            width: `${Math.max(4, Math.min(100, (action.doneCount / (action.totalCount || 1)) * 100))}%`,
                          }}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Dismiss ${action.title}`}
                        disabled={dismissingId === action.id}
                        onPress={() => void dismissGrowthAction(action.id)}
                        hitSlop={8}
                        style={{ padding: 2 }}
                      >
                        {dismissingId === action.id ? (
                          <ActivityIndicator size="small" color={colors.muted} />
                        ) : (
                          <MaterialIcons name="close" size={16} color={colors.muted} />
                        )}
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          const route =
                            action.id === 'upload_media'
                              ? '/(tabs)/photos'
                              : action.id === 'approve_post'
                              ? '/(tabs)/marketing'
                              : '/(tabs)/growth';
                          setGrowthModalOpen(false);
                          router.push(route as any);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: action.completed ? colors.soft : colors.brand,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: action.completed ? colors.brand : '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                          {action.completed ? 'Done ✓' : action.cta}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
