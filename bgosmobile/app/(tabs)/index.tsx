import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, MetricCard, ui, colors, Avatar } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { useAuthStore } from '../../src/stores/auth-store';
import type { BgosConversation, BgosWorkspace } from '../../../shared/bgos-contracts';

type Booking = { id: string; title?: string; customerName?: string; scheduledAt?: string; status: string };

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: Booking[] }>('/api/bookings?limit=100');
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const calls = useResource<{ stats: { todayCount: number; total: number } | null }>('/api/vapi/calls?limit=1');

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
    ]);
  };

  const unreadCount = inbox.data ? inbox.data.reduce((s, c) => s + c.unreadCount, 0) : 0;
  const leadTotal = leads.data?.pagination?.total ?? 0;
  const callCount = calls.data?.stats?.todayCount ?? 0;

  return (
    <Screen
      title={`Good morning, ${user?.name?.split(' ')[0] || 'there'}! 👋`}
      subtitle={`${workspace.data?.name || 'Your Business'} · ${agency ? 'Sales Workspace' : 'Your Day at a Glance'}`}
      onRefresh={refresh}
      rightAction={
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/tools')}>
          <Avatar name={user?.name || 'BGOS User'} size={38} />
        </Pressable>
      }
    >
      <ErrorNotice
        message={workspace.error || inbox.error || bookings.error || leads.error}
        retry={refresh}
      />

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
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>AI is working for you</Text>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>Active 24/7 · Handling calls & chats</Text>
            </View>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
        </View>

        <View style={{ gap: 6, marginTop: 10 }}>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E6F5F3', fontSize: 13 }}>Handling customer chats on WhatsApp & Web</Text>
          </View>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E6F5F3', fontSize: 13 }}>Answering incoming phone calls & booking slots</Text>
          </View>
          <View style={[ui.row, { gap: 8 }]}>
            <MaterialIcons name="check-circle" size={16} color={colors.accent} />
            <Text style={{ color: '#E6F5F3', fontSize: 13 }}>Capturing qualified leads into CRM</Text>
          </View>
        </View>
      </Card>

      {/* 2x2 Metric Tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard
          value={leadTotal}
          label="New Leads"
          trend="+28%"
          trendPositive={true}
          icon="people-outline"
        />
        <MetricCard
          value={callCount}
          label="Calls Today"
          trend="Saved"
          trendPositive={true}
          icon="phone-in-talk"
        />
        <MetricCard
          value={unreadCount}
          label="Messages"
          trend="+40%"
          trendPositive={true}
          icon="chat-bubble-outline"
        />
        <MetricCard
          value={appointments?.length ?? 4}
          label={agency ? 'Active Deals' : "Today's Schedule"}
          trend="Ready"
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
              detail="24 qualified contacts"
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
          title="Marketing Studio"
          detail="Create multi-channel posts with AI"
          icon="auto-awesome"
          onPress={() => router.push('/(tabs)/marketing')}
        />
        <MenuRow
          title="Google Business & Reviews"
          detail="4.1 ★ rating · Ask customers via WhatsApp"
          icon="star-outline"
          onPress={() => router.push('/(tabs)/growth')}
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
    </Screen>
  );
}
