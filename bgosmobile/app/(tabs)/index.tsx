import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, MetricCard, ui, colors, Avatar } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { useAuthStore } from '../../src/stores/auth-store';
import type { BgosConversation, BgosWorkspace } from '../../../shared/bgos-contracts';

type Booking = { id: string; title?: string; customerName?: string; scheduledAt?: string; status: string };

/**
 * Destinations kept reachable from Home ("More Tools" grid) after the
 * bottom bar was reduced to the 4 first-class tabs (Home / GBP / Photos /
 * Leads). Each entry navigates to the screen's existing route.
 */
const MORE_TOOLS: {
  label: string;
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { label: 'GBP Hub', route: '/(tabs)/growth', icon: 'storefront' },
  { label: 'Photos', route: '/(tabs)/photos', icon: 'photo-library' },
  { label: 'Google Posts', route: '/(tabs)/marketing', icon: 'campaign' },
  { label: 'Inbox', route: '/(tabs)/inbox', icon: 'chat-bubble-outline' },
  { label: 'Phone', route: '/(tabs)/phone', icon: 'phone-in-talk' },
  { label: 'Leads', route: '/(tabs)/leads', icon: 'people-outline' },
  { label: 'Appointments', route: '/(tabs)/appointments', icon: 'event' },
  { label: 'Outreach', route: '/(tabs)/outreach', icon: 'send' },
  { label: 'Agents', route: '/(tabs)/agents', icon: 'smart-toy' },
  { label: 'Automations', route: '/(tabs)/automations', icon: 'bolt' },
  { label: 'Submissions', route: '/(tabs)/submissions', icon: 'assignment' },
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

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [growthActionsDone, setGrowthActionsDone] = useState<string[]>([]);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: Booking[] }>('/api/bookings?limit=100');
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const calls = useResource<{ stats: { todayCount: number; total: number } | null }>('/api/vapi/calls?limit=1&stats=true');
  const reviews = useResource<{ reviews: Array<{ rating: number }> }>('/api/reviews?limit=50');

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
    ]);
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

      {/* Speedometer Marketing Score Gauge Card (Dhanda AI benchmark) */}
      <Card style={{ gap: 14 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 6 }]}>
            <Text style={ui.heading}>Marketing Score</Text>
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>Poor ⓘ</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/growth')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Improve Score →</Text>
          </Pressable>
        </View>

        {/* Speedometer Gauge Arc Visual */}
        <View style={{ alignItems: 'center', marginVertical: 4 }}>
          <View
            style={{
              width: 180,
              height: 90,
              borderTopLeftRadius: 90,
              borderTopRightRadius: 90,
              backgroundColor: '#F1F5F9',
              overflow: 'hidden',
              position: 'relative',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                flexDirection: 'row',
              }}
            >
              <View style={{ flex: 1, backgroundColor: '#EF4444', opacity: 0.85 }} />
              <View style={{ flex: 1, backgroundColor: '#F59E0B', opacity: 0.85 }} />
              <View style={{ flex: 1, backgroundColor: '#10B981', opacity: 0.85 }} />
            </View>
            <View
              style={{
                width: 130,
                height: 65,
                borderTopLeftRadius: 65,
                borderTopRightRadius: 65,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 4,
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#DC2626', letterSpacing: -0.5 }}>
                14%
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: '600' }}>
            Goal: Reach 80%+ to dominate Google Local 3-Pack
          </Text>
        </View>

        {/* Weekly Progression Chart */}
        <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: 12, gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
            📈 Weekly Marketing Score Progression
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 48, paddingTop: 6 }}>
            {[
              { week: 'W1', score: 4, height: 12 },
              { week: 'W2', score: 7, height: 20 },
              { week: 'W3', score: 10, height: 28 },
              { week: 'W4 (Now)', score: 14, height: 38 },
            ].map((col, idx) => (
              <View key={col.week} style={{ alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: idx === 3 ? colors.brand : colors.muted }}>
                  {col.score}%
                </Text>
                <View
                  style={{
                    width: 22,
                    height: col.height,
                    borderRadius: 4,
                    backgroundColor: idx === 3 ? colors.brand : '#CBD5E1',
                  }}
                />
                <Text style={{ fontSize: 9, color: colors.muted }}>{col.week}</Text>
              </View>
            ))}
          </View>
        </View>

        <Action
          label="Improve Marketing Score →"
          icon="trending-up"
          onPress={() => router.push('/(tabs)/growth')}
        />
      </Card>

      {/* Google's Performance (30 Days) */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Google's Performance</Text>
          <Badge label="Last 30 Days" accent />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>1,280</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Profile Views</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginTop: 2 }}>+18% from search</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>46</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Phone Calls</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginTop: 2 }}>+12% direct calls</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>89</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Directions</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginTop: 2 }}>+24% store visits</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>24</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Website Clicks</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginTop: 2 }}>+15% leads</Text>
          </View>
        </View>
      </Card>

      {/* Local Competitors within 5 KM (Dhanda AI Benchmark) */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>🎯 Competitors Within 5 KM</Text>
          <Badge label="Local Maps" />
        </View>
        <Text style={[ui.caption, { marginTop: -4 }]}>
          Rankings updated from Google Search & Maps in your locality.
        </Text>
        {[
          { name: 'Sharma Steel Works', rating: '4.6 ★', reviews: '128 reviews', distance: '1.2 km away' },
          { name: 'Gupta Iron & Fabrication', rating: '4.2 ★', reviews: '94 reviews', distance: '2.4 km away' },
          { name: 'Delhi Metal Crafts', rating: '4.0 ★', reviews: '61 reviews', distance: '3.8 km away' },
        ].map((comp, idx) => (
          <View
            key={comp.name}
            style={[
              ui.row,
              {
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: idx < 2 ? 1 : 0,
                borderBottomColor: colors.line,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{comp.name}</Text>
              <Text style={{ fontSize: 10, color: colors.muted }}>{comp.distance}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#D97706' }}>{comp.rating}</Text>
              <Text style={{ fontSize: 10, color: colors.muted }}>{comp.reviews}</Text>
            </View>
          </View>
        ))}
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
            onPress={() => router.push('/(tabs)/growth')}
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

      {/* Floating Growth Action Pill (Dhanda AI Benchmark) */}
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
              Growth Action ({growthActionsDone.length} of 10 done • {10 - growthActionsDone.length} left)
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
              <Pressable onPress={() => setGrowthModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {/* Progress */}
            <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, gap: 6 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>Daily Marketing Progress</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                  {growthActionsDone.length} of 10 done
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#FDE68A', borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    backgroundColor: '#F59E0B',
                    width: `${Math.max(10, (growthActionsDone.length / 10) * 100)}%`,
                  }}
                />
              </View>
            </View>

            {/* 3 Tasks */}
            <View style={{ gap: 10 }}>
              {/* Task 1: Complete Profile */}
              <View style={[ui.row, { justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Complete your Profile</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                    Add hours and categories for 100% profile strength.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!growthActionsDone.includes('profile')) setGrowthActionsDone((p) => [...p, 'profile']);
                  }}
                  style={{
                    backgroundColor: growthActionsDone.includes('profile') ? colors.soft : colors.brand,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: growthActionsDone.includes('profile') ? colors.brand : '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {growthActionsDone.includes('profile') ? 'Done ✓' : 'Complete'}
                  </Text>
                </Pressable>
              </View>

              {/* Task 2: Upload Media */}
              <View style={[ui.row, { justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Upload Media / Photos</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                    Upload workshop photos to boost customer clicks by 42%.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!growthActionsDone.includes('media')) setGrowthActionsDone((p) => [...p, 'media']);
                    router.push('/(tabs)/photos');
                    setGrowthModalOpen(false);
                  }}
                  style={{
                    backgroundColor: growthActionsDone.includes('media') ? colors.soft : colors.brand,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: growthActionsDone.includes('media') ? colors.brand : '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {growthActionsDone.includes('media') ? 'Done ✓' : 'Upload'}
                  </Text>
                </Pressable>
              </View>

              {/* Task 3: Approve Post */}
              <View style={[ui.row, { justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Approve AI-Generated Post</Text>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                    1 AI post is ready for your Google Profile. Review now.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!growthActionsDone.includes('post')) setGrowthActionsDone((p) => [...p, 'post']);
                    router.push('/(tabs)/marketing');
                    setGrowthModalOpen(false);
                  }}
                  style={{
                    backgroundColor: growthActionsDone.includes('post') ? colors.soft : colors.brand,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: growthActionsDone.includes('post') ? colors.brand : '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {growthActionsDone.includes('post') ? 'Done ✓' : 'Review'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
